import { IsBoolean, IsNumber, Max, Min } from 'class-validator';

export class UpdatePricingConfigDto {
  @IsNumber()
  @Min(0)
  @Max(50)
  maxAdjustmentPercent: number;

  @IsBoolean()
  dynamicPricingEnabled: boolean;
}
