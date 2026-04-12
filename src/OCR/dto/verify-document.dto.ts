import { IsIn, IsString } from 'class-validator';
import type { DocumentType } from '../ocr.types';

export class VerifyDocumentDto {
  @IsString()
  @IsIn([
    'cnic_front',
    'cnic_back',
    'driving_license_front',
    'driving_license_back',
  ])
  documentType: DocumentType;
}
