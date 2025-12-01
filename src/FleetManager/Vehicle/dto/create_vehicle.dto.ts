import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsEnum,
  IsOptional,
  Min,
  Max,
  IsBoolean,
  IsNumberString,
} from 'class-validator';

export enum VehicleType {
  hatchback = 'hatchback',
  sedan = 'sedan',
  suv = 'suv',
  van = 'van',
  bus = 'bus',
  coaster = 'coaster',
  sports_car = 'sports_car',
  other = 'other',
}

export enum FuelType {
  petrol = 'petrol',
  diesel = 'diesel',
  electric = 'electric',
  hybrid = 'hybrid',
  cng = 'cng',
}

export enum DriverServiceOption {
  self_drive_only = 'self_drive_only',
  driver_included = 'driver_included',
}

export enum PricingModel {
  per_day = 'per_day',
  per_km = 'per_km',
}

export enum VehicleStatus {
    available = 'available',
    on_rent = 'on_rent',
    maintenance = 'maintenance',
    decommissioned = 'decommissioned',
}

export class CreateVehicleDto {

  @IsEnum(VehicleType)
  @IsNotEmpty()
  vehicleType: VehicleType;

  @IsString()
  @IsNotEmpty()
  make: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1980)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @IsString()
  @IsNotEmpty()
  licensePlate: string;

  @IsString()
  @IsOptional()
  chassisNumber?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  seatingCapacity: number;

  @IsString()
  @IsNotEmpty()
  transmissionType: string;

  @IsEnum(FuelType)
  @IsNotEmpty()
  fuelType: FuelType;

  @IsNumber()
  @IsOptional()
  @Min(0)
  mileageKm?: number;

  @IsEnum(DriverServiceOption)
  @IsNotEmpty()
  driverServiceOption: DriverServiceOption;

  @IsNumber()
  @IsNotEmpty()
  selfDriveBaseRate: number; // Rate if driver is not included

  @IsNumber()
  @IsOptional()
  driverIncludedRate?: number; // Rate if driver is included

  @IsNumber()
  @IsOptional()
  @Min(0)
  driverHoursIncluded?: number; // Default 10 hours

  @IsEnum(PricingModel)
  @IsNotEmpty()
  pricingModel: PricingModel;

  
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  lateReturnChargePerHour: number;

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
  @IsNotEmpty()
  vehicleStatus: VehicleStatus;
}
