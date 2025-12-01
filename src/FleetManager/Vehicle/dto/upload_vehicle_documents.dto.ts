import { IsNotEmpty, IsArray, ArrayMinSize, IsEnum } from 'class-validator';

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
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(VehicleDocumentType, { each: true })
  @IsNotEmpty()
  documentTypes: VehicleDocumentType[];
}
