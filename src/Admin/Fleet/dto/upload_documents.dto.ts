import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadDocumentsDto {
  @IsString({ each: true }) 
  @IsNotEmpty()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value])) 
  documentTypes: string[]; 
}