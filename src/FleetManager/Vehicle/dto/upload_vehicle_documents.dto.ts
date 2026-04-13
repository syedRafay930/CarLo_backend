import { IsNotEmpty, IsArray, ArrayMinSize, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export enum VehicleDocumentType {
  image_coverimg = 'image_coverimg',
  image_exterior_front = 'image_exterior_front',
  image_exterior_back = 'image_exterior_back',
  registration_paper = 'registration_paper',
  insurance_paper = 'insurance_paper',
  fitness_certificate = 'fitness_certificate',
  other_document = 'other_document',
}

export class UploadVehicleDocumentsDto {
  /** Multer sends a single field as a string, not `string[]`. */
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return [];
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(VehicleDocumentType, { each: true })
  @IsNotEmpty()
  documentTypes: VehicleDocumentType[];
}
