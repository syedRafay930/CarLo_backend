import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsDateString,
  IsEnum,
  Min,
} from 'class-validator';

enum ServiceType {
  self_drive = 'self_drive',
  with_driver = 'with_driver',
}

enum PriceModel {
  per_day = 'per_day',
  per_hr = 'per_hr',
}

export class CreateBookingDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  vehicleId: number;

  @IsString()
  Name: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  cnic: string;

  @IsDateString()
  @IsNotEmpty()
  pickupDate: string;

  @IsDateString()
  @IsNotEmpty()
  returnDate: string;

  @IsString()
  @IsNotEmpty()
  pickupLocation: string;

  @IsString()
  @IsNotEmpty()
  returnLocation: string;

  @IsEnum(ServiceType)
  @IsNotEmpty()
  serviceType: ServiceType;

  @IsEnum(PriceModel)
  @IsNotEmpty()
  priceModel: PriceModel;
}
