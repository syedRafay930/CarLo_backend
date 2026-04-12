import {
  Controller,
  Post,
  Body,
  UseGuards,
  Patch,
  Request,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientAuthService } from './auth.service';
import { LoginDto } from 'src/Admin/Auth/dto/login.dto';
import { ForgotPasswordDto } from 'src/Admin/Auth/dto/forgot_password.dto';
import { ResetPasswordDto } from 'src/Admin/Auth/dto/reset_password.dto';
import { ClientJwtBlacklistGuard } from './guards/jwt.guard';
import { FirebaseService } from 'src/firebase/firebase.service';
import { SignUpDto } from './dto/sign_up.dto';

@Controller('client/auth')
export class ClientAuthController {
  constructor(
    private readonly authService: ClientAuthService,
    private readonly firebaseService: FirebaseService,
  ) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const { email, password } = loginDto;

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const user = await this.authService.validateUserByEmail(email, password);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    const access_token = await this.authService.generateJwtToken(user);
    const refresh_token = await this.authService.generateRefreshToken(user);
    return {
      message: 'Login successful',
      access_token,
      refresh_token,
      user,
    };
  }

  @Post('refresh-token')
  async refreshToken(@Headers('authorization') authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer refresh token required');
    }
    const refreshToken = authorization.slice(7).trim();
    return this.authService.refreshAccessToken(refreshToken);
  }

  @Post('sign-up')
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    return this.authService.forgotPassword(email);
  }

  @Patch('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;
    return this.authService.resetPassword(token, newPassword);
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Post('logout')
  async logout(@Request() req) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('No token provided');
    }

    await this.authService.logout(token);
    //await this.firebaseService.deleteFleetFcmToken(req.user.fleet_user_id);
    return { message: 'Logout successful' };
  }
}
