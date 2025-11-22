import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Patch,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot_password.dto';
import { ResetPasswordDto } from './dto/reset_password.dto';
import { JwtBlacklistGuard } from './guards/jwt.guard';
import { RBACService } from '../RBAC/rbac.service';
//import { FirebaseService } from 'src/firebase/firebase.service';

@Controller('admin/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly rbacService: RBACService,
    //private readonly firebaseService: FirebaseService,
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
    const token = await this.authService.generateJwtToken(user);
    //const sidebar = await this.rbacService.getModulesByRole(user.role.id);
    return {
      message: 'Login successful',
      access_token: token,
      user,
      //sidebar,
    };
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

  @UseGuards(JwtBlacklistGuard)
  @Post('logout')
  async logout(@Request() req) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('No token provided');
    }

    await this.authService.logout(token);
    return { message: 'Logout successful' };
  }
}
