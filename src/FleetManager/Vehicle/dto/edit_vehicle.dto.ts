import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsEnum,
  IsOptional,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { VehicleType } from './create_vehicle.dto';
import { FuelType } from './create_vehicle.dto';
import { DriverServiceOption } from './create_vehicle.dto';
import { PricingModel } from './create_vehicle.dto';
import { VehicleStatus } from './create_vehicle.dto';

export class EditVehicleDto {
  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;

  @IsString()
  @IsOptional()
  make?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsNumber()
  @IsOptional()
  @Min(1980)
  @Max(new Date().getFullYear() + 1)
  year?: number;

  @IsString()
  @IsOptional()
  licensePlate?: string;

  @IsString()
  @IsOptional()
  chassisNumber?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  seatingCapacity?: number;

  @IsString()
  @IsOptional()
  transmissionType?: string;

  @IsEnum(FuelType)
  @IsOptional()
  fuelType?: FuelType;

  @IsNumber()
  @IsOptional()
  @Min(0)
  mileageKm?: number;

  @IsEnum(DriverServiceOption)
  @IsOptional()
  driverServiceOption?: DriverServiceOption;

  @IsNumber()
  @IsOptional()
  @Min(0)
  selfDriveBaseRate?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  driverIncludedRate?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  driverHoursIncluded?: number;

  @IsEnum(PricingModel)
  @IsOptional()
  pricingModel?: PricingModel;

  @IsNumber()
  @IsOptional()
  @Min(0)
  lateReturnChargePerHour?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  fuelChargePerKmIfEmpty?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  latenightOfferFlatFee?: number;

  @IsBoolean()
  @IsOptional()
  isInsured?: boolean;

  @IsEnum(VehicleStatus)
  @IsOptional()
  vehicleStatus?: VehicleStatus;

  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;
}
