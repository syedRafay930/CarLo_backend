import {
  IsEmail,
  IsString,
  IsOptional,
  isBoolean,
  IsBoolean,
} from 'class-validator';

export class FM_EditInternalUserDto {
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

  @IsOptional()
  @IsBoolean()
  isdelete?: boolean;

  @IsOptional()
  @IsString()
  cnic?: string;

  @IsOptional()
  @IsString()
  dob?: string;
}
