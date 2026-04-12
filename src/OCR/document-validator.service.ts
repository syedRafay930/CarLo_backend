import { Injectable } from '@nestjs/common';
import type {
  CrossValidationResult,
  ExtractedCnicFront,
  ExtractedDrivingLicenseFront,
  ValidationResult,
} from './ocr.types';

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

@Injectable()
export class DocumentValidatorService {
  /** Parses DL-style dates e.g. 08-Jan-2029 */
  parseDlDateString(s: string | null | undefined): Date | null {
    if (!s) return null;
    const m = s.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
    if (!m) return null;
    const monKey = m[2].slice(0, 3).toLowerCase();
    const mi = MONTHS[monKey];
    if (mi === undefined) return null;
    const d = new Date(Number(m[3]), mi, Number(m[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  validateCnicFront(fields: ExtractedCnicFront): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const checks: ValidationResult['checks'] = [];

    const cnicValid =
      fields.cnicNumber && /^\d{5}-\d{7}-\d$/.test(fields.cnicNumber);
    checks.push({
      name: 'CNIC Number Format',
      passed: !!cnicValid,
      message: cnicValid
        ? `Valid CNIC: ${fields.cnicNumber}`
        : `Invalid or missing CNIC number (found: ${fields.cnicNumber})`,
    });
    if (!cnicValid) errors.push('CNIC number format invalid');

    let notExpired = false;
    if (fields.dateOfExpiry) {
      const parts = fields.dateOfExpiry.split('.').map(Number);
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const expiry = new Date(year, month - 1, day);
        notExpired = expiry > new Date();
      }
    }
    checks.push({
      name: 'CNIC Not Expired',
      passed: notExpired,
      message: notExpired
        ? `Valid until ${fields.dateOfExpiry}`
        : `CNIC expired on ${fields.dateOfExpiry || 'unknown date'}`,
    });
    if (!notExpired) errors.push('CNIC is expired or expiry date not found');

    let ageEligible = false;
    if (fields.dateOfBirth) {
      const parts = fields.dateOfBirth.split('.').map(Number);
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const dob = new Date(year, month - 1, day);
        const age = Math.floor(
          (new Date().getTime() - dob.getTime()) /
            (365.25 * 24 * 60 * 60 * 1000),
        );
        ageEligible = age >= 18;
        checks.push({
          name: 'Age Eligibility (18+)',
          passed: ageEligible,
          message: ageEligible
            ? `Age ${age} — eligible`
            : `Age ${age} — must be 18 or older`,
        });
        if (!ageEligible) errors.push('Holder is under 18');
      }
    } else {
      checks.push({
        name: 'Age Eligibility (18+)',
        passed: false,
        message: 'Date of birth not extracted — cannot verify age',
      });
      warnings.push('Could not verify age — date of birth missing');
    }

    const hasName = !!(fields.holderName && fields.holderName.length > 2);
    checks.push({
      name: 'Holder Name',
      passed: hasName,
      message: hasName
        ? `Name: ${fields.holderName}`
        : 'Holder name not extracted',
    });
    if (!hasName) warnings.push('Holder name not extracted');

    const errorCount = errors.length;
    const confidence: ValidationResult['confidence'] =
      errorCount === 0 ? 'high' : errorCount === 1 ? 'medium' : 'low';

    return {
      isValid: errors.length === 0,
      confidence,
      errors,
      warnings,
      checks,
    };
  }

  validateDrivingLicenseFront(
    fields: ExtractedDrivingLicenseFront,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const checks: ValidationResult['checks'] = [];

    const licenseValid =
      fields.licenseNumber && fields.licenseNumber.includes('#');
    checks.push({
      name: 'License Number Format',
      passed: !!licenseValid,
      message: licenseValid
        ? `License: ${fields.licenseNumber}`
        : `Invalid license number (found: ${fields.licenseNumber})`,
    });
    if (!licenseValid) errors.push('License number invalid or missing');

    let notExpired = false;
    const expiryDate = this.parseDlDateString(fields.validUpto);
    if (expiryDate) {
      notExpired = expiryDate > new Date();
    }
    checks.push({
      name: 'License Not Expired',
      passed: notExpired,
      message: notExpired
        ? `Valid until ${fields.validUpto}`
        : `License expired on ${fields.validUpto || 'unknown'}`,
    });
    if (!notExpired) errors.push('Driving license is expired');

    const categoryEligible = !!(
      fields.category &&
      (fields.category.toUpperCase().includes('CAR') ||
        fields.category.toUpperCase().includes('LTV'))
    );
    checks.push({
      name: 'Car Rental Category',
      passed: categoryEligible,
      message: categoryEligible
        ? `Category OK: ${fields.category}`
        : `Category "${fields.category}" may not cover car rental`,
    });
    if (!categoryEligible) {
      warnings.push(
        `License category "${fields.category}" — verify car rental eligibility`,
      );
    }

    const hasName = !!(fields.holderName && fields.holderName.length > 2);
    checks.push({
      name: 'Holder Name',
      passed: hasName,
      message: hasName ? `Name: ${fields.holderName}` : 'Name not extracted',
    });
    if (!hasName) warnings.push('Holder name not extracted');

    const errorCount = errors.length;
    const confidence: ValidationResult['confidence'] =
      errorCount === 0 ? 'high' : errorCount === 1 ? 'medium' : 'low';

    return {
      isValid: errors.length === 0,
      confidence,
      errors,
      warnings,
      checks,
    };
  }

  crossValidate(params: {
    cnicFront?: ExtractedCnicFront;
    cnicBack?: import('./ocr.types').ExtractedCnicBack;
    dlFront?: ExtractedDrivingLicenseFront;
    dlBack?: import('./ocr.types').ExtractedDrivingLicenseBack;
  }): CrossValidationResult {
    const issues: string[] = [];

    let cnicFrontBackMatch: boolean | null = null;
    if (params.cnicFront?.cnicNumber && params.cnicBack?.cnicNumber) {
      cnicFrontBackMatch =
        params.cnicFront.cnicNumber === params.cnicBack.cnicNumber;
      if (!cnicFrontBackMatch) {
        issues.push(
          `CNIC mismatch: front=${params.cnicFront.cnicNumber}, back=${params.cnicBack.cnicNumber}`,
        );
      }
    }

    let dlCnicMatchesFmCnic: boolean | null = null;
    if (params.dlBack?.cnicNumber && params.cnicFront?.cnicNumber) {
      dlCnicMatchesFmCnic =
        params.dlBack.cnicNumber === params.cnicFront.cnicNumber;
      if (!dlCnicMatchesFmCnic) {
        issues.push(
          `DL CNIC (${params.dlBack.cnicNumber}) does not match CNIC card (${params.cnicFront.cnicNumber})`,
        );
      }
    }

    let licenseNotExpired: boolean | null = null;
    if (params.dlFront?.validUpto) {
      const expiry = this.parseDlDateString(params.dlFront.validUpto);
      licenseNotExpired =
        expiry != null && !Number.isNaN(expiry.getTime()) && expiry > new Date();
      if (!licenseNotExpired) issues.push('Driving license is expired');
    }

    let cnicNotExpired: boolean | null = null;
    if (params.cnicFront?.dateOfExpiry) {
      const p = params.cnicFront.dateOfExpiry.split('.').map(Number);
      if (p.length === 3) {
        const expiry = new Date(p[2], p[1] - 1, p[0]);
        cnicNotExpired = expiry > new Date();
        if (!cnicNotExpired) issues.push('CNIC is expired');
      }
    }

    let ageEligible: boolean | null = null;
    if (params.cnicFront?.dateOfBirth) {
      const p = params.cnicFront.dateOfBirth.split('.').map(Number);
      if (p.length === 3) {
        const dob = new Date(p[2], p[1] - 1, p[0]);
        const age = Math.floor(
          (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
        );
        ageEligible = age >= 18;
        if (!ageEligible) issues.push(`Holder age ${age} is under 18`);
      }
    }

    let dlCategoryEligible: boolean | null = null;
    if (params.dlFront?.category) {
      const cat = params.dlFront.category.toUpperCase();
      dlCategoryEligible = cat.includes('CAR') || cat.includes('LTV');
    }

    const criticalFail =
      cnicNotExpired === false ||
      licenseNotExpired === false ||
      ageEligible === false ||
      cnicFrontBackMatch === false;

    const overallVerdict: CrossValidationResult['overallVerdict'] =
      issues.length === 0 ? 'pass' : criticalFail ? 'fail' : 'flag';

    return {
      cnicFrontBackMatch,
      dlCnicMatchesFmCnic,
      licenseNotExpired,
      cnicNotExpired,
      ageEligible,
      dlCategoryEligible,
      overallVerdict,
      verdictReason:
        issues.length === 0 ? 'All checks passed' : issues.join('; '),
    };
  }
}
