import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum FleetType {
  INDIVIDUAL = 'individual',
  SHOP = 'shop',
}

export class AddFleetDto {
  @IsNotEmpty()
  @IsString()
  fleet_name: string;

  @IsNotEmpty()
  @IsEnum(FleetType)
  fleet_type: FleetType;

  @IsNotEmpty()
  @IsString()
  fleet_contact: string;

  @IsNotEmpty()
  @IsEmail()
  fleet_email: string;

  @IsOptional()
  @IsString()
  fleet_address?: string;

  @IsOptional()
  @IsString()
  fleet_city?: string;

  @IsOptional()
  @IsString()
  fleet_state?: string;

  @IsOptional()
  @IsString()
  fleet_country?: string;

  @IsNotEmpty()
  @IsString()
  fleet_registration_number: string;

}
