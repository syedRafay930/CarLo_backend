import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveVehicleRequestDto {
  @IsEnum(['approved', 'rejected'])
  decision: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;
}
