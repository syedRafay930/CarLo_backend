import {
  IsEmail, IsEnum, IsInt, IsNotEmpty,
  IsOptional, IsString, Min
} from 'class-validator'
import { Type } from 'class-transformer'
import { FleetManagerType } from 'src/entities/entities/FleetRegistrationApplications'

export class SubmitApplicationDto {
  // Business info
  @IsNotEmpty()
  @IsString()
  business_name: string

  @IsNotEmpty()
  @IsString()
  owner_first_name: string

  @IsNotEmpty()
  @IsString()
  owner_last_name: string

  @IsNotEmpty()
  @IsEmail()
  email: string

  @IsNotEmpty()
  @IsString()
  contact: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  state?: string

  @IsOptional()
  @IsString()
  country?: string

  @IsOptional()
  @IsString()
  address?: string

  // Fleet info
  @IsNotEmpty()
  @IsEnum(FleetManagerType)
  fleet_type: FleetManagerType

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  estimated_vehicles?: number
}