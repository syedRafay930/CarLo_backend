import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import { FleetType } from './add_fleet.dto';

export class EditFleetDto {
  @IsOptional()
  @IsString()
  fleet_name?: string;

  @IsOptional()
  @IsString()
  fleet_contact?: string;

  @IsOptional()
  @IsEmail()
  fleet_email?: string;

  @IsOptional()
  fleet_address?: string;

  @IsOptional()
  @IsString()
  fleet_registration_number?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsBoolean()
  is_delete?: boolean;

  @IsOptional()
  @IsString()
  fleet_city?: string;

  @IsOptional()
  @IsString()
  fleet_state?: string;

  @IsOptional()
  @IsString()
  fleet_country?: string;
}
