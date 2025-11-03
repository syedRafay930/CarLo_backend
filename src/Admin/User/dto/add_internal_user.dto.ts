import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export class AddInternalUserDto {
  @IsNotEmpty()
  @IsString()
  FirstName: string;

  @IsNotEmpty()
  @IsString()
  LastName: string;

  @IsOptional()
  @IsString()
  Contact: string;

  @IsNotEmpty()
  @IsEmail()
  Email: string;

  @IsNotEmpty()
  @IsString()
  Role: string; // e.g. finance , marketing etc
}
