import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ClientUsersService } from '../User/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/Admin/Auth/redis.service';
import { MailService } from 'src/Nodemailer/mailer.service';

@Injectable()
export class ClientAuthService {
  constructor(
    private readonly usersService: ClientUsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  async validateUserByEmail(email: string, login_password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Incorrect email');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('User is Blocked');
    }

    if (user.isDelete) {
      throw new UnauthorizedException('User is Deleted');
    }

    await this.checkLoginCooldown(email);

    if (!user.password) {
      throw new UnauthorizedException('Password not set for user');
    }
    const isPasswordMatch = await bcrypt.compare(login_password, user.password);

    if (!isPasswordMatch) {
      await this.handleFailedLogin(email);
      throw new UnauthorizedException('Invalid password');
    }

    await this.resetLoginFailures(email);

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async generateJwtToken(user: any): Promise<string> {
    const payload = {
      sub: user.email,
      name:
        (user.firstName || 'DefaultFirstName') +
        ' ' +
        (user.lastName || 'DefaultLastName'),
      client_id: user.id,
      tokenUse: 'access',
    };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '7d',
    });
  }

  /** Long-lived token; validated only by `refreshAccessToken`, not by `ClientJwtStrategy`. */
  async generateRefreshToken(user: any): Promise<string> {
    const payload = {
      sub: user.email,
      name:
        (user.firstName || 'DefaultFirstName') +
        ' ' +
        (user.lastName || 'DefaultLastName'),
      client_id: user.id,
      tokenUse: 'refresh',
    };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '30d',
    });
  }

  async refreshAccessToken(refreshToken: string): Promise<{ access_token: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const isBlacklisted = await this.redisService.getValue(
      `blacklist:${refreshToken}`,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException('Token is blacklisted');
    }

    let payload: {
      sub: string;
      tokenUse?: string;
      client_id?: number;
    };

    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      }) as typeof payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.tokenUse !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findByEmail(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (user.isActive === false) {
      throw new UnauthorizedException('User is Blocked');
    }
    if (user.isDelete) {
      throw new UnauthorizedException('User is Deleted');
    }

    const { password, ...userWithoutPassword } = user;
    const access_token = await this.generateJwtToken(userWithoutPassword);
    return { access_token };
  }

  async signUp(signUpDto: any) {
    const existingUser = await this.usersService.findByEmail(signUpDto.email);
    if (existingUser) {
      throw new UnauthorizedException('Email already in use');
    }
    const newUser = await this.usersService.createUser(signUpDto);
    return { message: 'User registered successfully', user: newUser };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.firstName)
      throw new UnauthorizedException('User first name not found');

    const token = this.jwtService.sign(
      { sub: user.email },
      {
        secret: this.configService.get<string>('RESET_SECRET'),
        expiresIn: '5m',
      },
    );

    await this.redisService.setValue(`forgot:${token}`, user.email, 300); // 5 mins

    const resetLink = `http://localhost:5173/reset-password?token=${token}&createNewPassword=false`;

    await this.mailService.sendTemplatedMail(
      email,
      'Password Reset Request',
      'reset_password',
      {
        username: user.firstName,
        resetLink: resetLink,
      },
    );

    return { message: 'Reset link sent to email' };
  }

  async resetPassword(token: string, newPassword: string) {
    let payload: { sub: string };

    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('RESET_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }

    const userEmail = await this.redisService.getValue(`forgot:${token}`);
    if (!userEmail || userEmail !== payload.sub) {
      throw new UnauthorizedException('expired token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.usersService.updatePassword(userEmail, hashedPassword);
    await this.redisService.deleteValue(`forgot:${token}`);

    return { message: 'Password has been reset successfully' };
  }

  //Cooldown Logic
  async checkLoginCooldown(email: string) {
    const cooldownKey = `cooldown:${email}`;
    const cooldownUntil = await this.redisService.getValue(cooldownKey);

    if (cooldownUntil && +cooldownUntil > Date.now()) {
      const remaining = Math.ceil((+cooldownUntil - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Too many attempts. Try again in ${remaining} minutes.`,
      );
    }
  }

  async handleFailedLogin(email: string) {
    const attemptsKey = `login:fail:${email}`;
    const cooldownKey = `cooldown:${email}`;
    const durationKey = `cooldown:duration:${email}`;

    const current = await this.redisService.getValue(attemptsKey);
    let attempts = current ? parseInt(current) : 0;

    attempts++;
    await this.redisService.setValue(attemptsKey, attempts.toString(), 600); // 10 min expiry

    if (attempts >= 4) {
      const prevCooldown = await this.redisService.getValue(durationKey);
      let cooldownTime = prevCooldown ? +prevCooldown * 2 : 30 * 60 * 1000; // 30 mins in ms

      const until = Date.now() + cooldownTime;

      await this.redisService.setValue(
        cooldownKey,
        until.toString(),
        cooldownTime / 1000,
      );
      await this.redisService.setValue(durationKey, cooldownTime.toString());

      throw new UnauthorizedException('Too many attempts. Try again later.');
    }
  }

  async resetLoginFailures(email: string) {
    await this.redisService.deleteValue(`login:fail:${email}`);
    await this.redisService.deleteValue(`cooldown:${email}`);
    await this.redisService.deleteValue(`cooldown:duration:${email}`);
  }

  async logout(token: string): Promise<void> {
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const payload = this.jwtService.decode(token) as { sub: string };
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    await this.redisService.setValue(`blacklist:${token}`, payload.sub, 3600); // 1 hour
  }
}
