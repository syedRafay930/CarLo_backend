import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class FlutterLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class FlutterSignUpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  contact: string;
}

export class FlutterRefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class FlutterForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class FlutterResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
