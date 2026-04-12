export type DocumentType =
  | 'cnic_front'
  | 'cnic_back'
  | 'driving_license_front'
  | 'driving_license_back';

export interface ExtractedCnicFront {
  holderName: string | null;
  holderNameUrdu: string | null;
  fatherName: string | null;
  fatherNameUrdu: string | null;
  gender: string | null;
  cnicNumber: string | null;
  dateOfBirth: string | null;
  dateOfIssue: string | null;
  dateOfExpiry: string | null;
  countryOfStay: string | null;
}

export interface ExtractedCnicBack {
  cnicNumber: string | null;
  presentAddress: string | null;
  permanentAddress: string | null;
}

export interface ExtractedDrivingLicenseFront {
  licenseNumber: string | null;
  holderName: string | null;
  fatherHusbandName: string | null;
  dateOfBirth: string | null;
  category: string | null;
  issueDate: string | null;
  validUpto: string | null;
}

export interface ExtractedDrivingLicenseBack {
  cnicNumber: string | null;
  address: string | null;
  bloodGroup: string | null;
  laserNo: string | null;
}

export interface ValidationResult {
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  errors: string[];
  warnings: string[];
  checks: {
    name: string;
    passed: boolean;
    message: string;
  }[];
}

export interface OcrResult {
  documentType: DocumentType;
  rawText: string;
  extractedFields:
    | ExtractedCnicFront
    | ExtractedCnicBack
    | ExtractedDrivingLicenseFront
    | ExtractedDrivingLicenseBack;
  validation: ValidationResult;
  processingTimeMs: number;
  apiConfidence: number;
}

export interface CrossValidationResult {
  cnicFrontBackMatch: boolean | null;
  dlCnicMatchesFmCnic: boolean | null;
  licenseNotExpired: boolean | null;
  cnicNotExpired: boolean | null;
  ageEligible: boolean | null;
  dlCategoryEligible: boolean | null;
  overallVerdict: 'pass' | 'flag' | 'fail';
  verdictReason: string;
}

export interface StoredOcrPayload {
  documentType: DocumentType;
  extractedFields: unknown;
  validation: ValidationResult;
  rawTextPreview: string;
  apiConfidence: number;
  processedAt: string;
}
