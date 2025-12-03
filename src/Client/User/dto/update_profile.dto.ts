import { IsOptional, IsString, IsEmail, MaxLength, MinLength, IsBoolean } from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    @MaxLength(255)
    firstName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    lastName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    contact?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsBoolean()
    isDelete?: boolean;
}