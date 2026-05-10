import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateVehicleRequestDto {
  @IsOptional()
  @IsString()
  message?: string;

  @IsNotEmpty()
  @IsNumber()
  vehicleId: number;

  @IsNotEmpty()
  @IsString()
  requestType: string;
}
