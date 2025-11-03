import {
  IsEmail,
  IsString,
  IsOptional,
  isBoolean,
  IsBoolean,
} from 'class-validator';

export class EditInternalUserDto {
  @IsOptional()
  @IsString()
  FirstName?: string;

  @IsOptional()
  @IsString()
  LastName?: string;

  @IsOptional()
  @IsString()
  Contact?: string;

  @IsOptional()
  @IsString()
  Role?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
