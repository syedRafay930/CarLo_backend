import {
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddFleetUserDto {
  @IsNotEmpty()
  @IsString()
  first_name: string;

  @IsNotEmpty()
  @IsString()
  last_name: string;

  @IsNotEmpty()
  @IsString()
  Contact: string;

  @IsNotEmpty()
  @IsString()
  Cnic: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  Dob?: Date;

  @IsNotEmpty()
  @IsEmail()
  Email: string;

  @IsNotEmpty()
  @IsString()
  Role: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  Password?: string;
}
