import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class CrossValidateDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cnicFrontDocId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cnicBackDocId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dlFrontDocId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dlBackDocId?: number;
}
