import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AllocationRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  vehicleType: string;

  @IsString()
  @IsNotEmpty()
  pickupDate: string;

  @IsString()
  @IsNotEmpty()
  returnDate: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetPerDay?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  transmissionPreference?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minSeats?: number;
}
