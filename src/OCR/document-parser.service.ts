import { Injectable } from '@nestjs/common';
import type {
  ExtractedCnicBack,
  ExtractedCnicFront,
  ExtractedDrivingLicenseBack,
  ExtractedDrivingLicenseFront,
} from './ocr.types';

@Injectable()
export class DocumentParserService {
  parseCnicFront(rawText: string): ExtractedCnicFront {
    const text = rawText;
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    return {
      holderName: this.extractCnicHolderName(text, lines),
      holderNameUrdu: this.extractUrduName(text),
      fatherName: this.extractFatherName(text, lines),
      fatherNameUrdu: this.extractUrduFatherName(text),
      gender: this.extractGender(text),
      countryOfStay: this.extractCountryOfStay(text),
      cnicNumber: this.extractCnicNumber(text),
      dateOfBirth: this.extractDateByLabel(text, 'Date of Birth'),
      dateOfIssue: this.extractDateByLabel(text, 'Date of Issue'),
      dateOfExpiry: this.extractDateByLabel(text, 'Date of Expiry'),
    };
  }

  parseCnicBack(rawText: string): ExtractedCnicBack {
    return {
      cnicNumber: this.extractCnicNumber(rawText),
      presentAddress: this.extractAddress(rawText, 'present'),
      permanentAddress: this.extractAddress(rawText, 'permanent'),
    };
  }

  parseDrivingLicenseFront(rawText: string): ExtractedDrivingLicenseFront {
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    return {
      licenseNumber: this.extractLicenseNumber(rawText),
      holderName: this.extractDLHolderName(rawText, lines),
      fatherHusbandName: this.extractDLFatherName(rawText, lines),
      dateOfBirth: this.extractDLDate(rawText, 'Date of Birth'),
      category: this.extractCategory(rawText),
      issueDate: this.extractDLDate(rawText, 'Issue Date'),
      validUpto: this.extractDLDate(rawText, 'Valid Upto'),
    };
  }

  parseDrivingLicenseBack(rawText: string): ExtractedDrivingLicenseBack {
    return {
      cnicNumber: this.extractCnicNumber(rawText),
      address: this.extractDLAddress(rawText),
      bloodGroup: this.extractBloodGroup(rawText),
      laserNo: this.extractLaserNo(rawText),
    };
  }

  private extractCnicNumber(text: string): string | null {
    const match = text.match(/\d{5}-\d{7}-\d/);
    return match ? match[0] : null;
  }

  private extractLicenseNumber(text: string): string | null {
    const match = text.match(/\d{5}-\d{7}-\d#\d+/);
    return match ? match[0] : null;
  }

  private extractCnicHolderName(text: string, lines: string[]): string | null {
    const nameSection = text.match(/Name\s*\n([A-Za-z\s]+)\n/);
    if (nameSection) return nameSection[1].trim();

    const nameIdx = lines.findIndex(
      (l) => l.toLowerCase() === 'name' || l.toLowerCase() === 'name:',
    );
    if (nameIdx >= 0 && lines[nameIdx + 1]) {
      const candidate = lines[nameIdx + 1];
      if (/^[A-Za-z\s]+$/.test(candidate)) return candidate.trim();
    }
    return null;
  }

  private extractFatherName(text: string, lines: string[]): string | null {
    const match = text.match(/Father Name\s*\n([A-Za-z\s]+)\n/);
    if (match) return match[1].trim();

    const idx = lines.findIndex((l) =>
      l.toLowerCase().includes('father name'),
    );
    if (idx >= 0 && lines[idx + 1]) {
      const candidate = lines[idx + 1];
      if (/^[A-Za-z\s]+$/.test(candidate)) return candidate.trim();
    }
    return null;
  }

  private extractUrduName(text: string): string | null {
    const urduMatches = text.match(/[\u0600-\u06FF\s]{3,}/g);
    if (urduMatches && urduMatches.length > 0) {
      return urduMatches[0].trim();
    }
    return null;
  }

  private extractUrduFatherName(text: string): string | null {
    const urduMatches = text.match(/[\u0600-\u06FF\s]{3,}/g);
    if (urduMatches && urduMatches.length > 1) {
      return urduMatches[1].trim();
    }
    return null;
  }

  private extractGender(text: string): string | null {
    const match = text.match(/Gender\s*[\|\:\n]\s*Country[^M]*([MF])\s/);
    if (match) return match[1];
    const genderLine = text.match(/Gender\s*\|?\s*([MF])\b/);
    return genderLine ? genderLine[1] : null;
  }

  private extractCountryOfStay(text: string): string | null {
    const match = text.match(/Country of Stay\s*\n?\s*([A-Za-z]+)/);
    return match ? match[1].trim() : null;
  }

  private extractDateByLabel(text: string, label: string): string | null {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
      escaped + '[\\s\\S]{0,40}?(\\d{2}\\.\\d{2}\\.\\d{4})',
    );
    const match = text.match(pattern);
    return match ? match[1] : null;
  }

  private extractDLDate(text: string, label: string): string | null {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
      escaped + '[\\s\\S]{0,40}?(\\d{2}-[A-Za-z]{3}-\\d{4})',
    );
    const match = text.match(pattern);
    return match ? match[1] : null;
  }

  private extractDLHolderName(text: string, lines: string[]): string | null {
    const match = text.match(/Name:\s*([A-Z\s]+?)(?:\n|Father)/);
    if (match) return match[1].trim();

    const idx = lines.findIndex(
      (l) => l.match(/^Name[:\s]/i) && !l.toLowerCase().includes('father'),
    );
    if (idx >= 0) {
      const candidate = lines[idx].replace(/^Name[:\s]/i, '').trim();
      if (candidate.length > 2) return candidate;
      if (lines[idx + 1] && /^[A-Z\s]+$/.test(lines[idx + 1])) {
        return lines[idx + 1].trim();
      }
    }
    return null;
  }

  private extractDLFatherName(text: string, lines: string[]): string | null {
    const match = text.match(/Father\/Husband:\s*([A-Z\s]+?)(?:\n|Date)/);
    if (match) return match[1].trim();

    const idx = lines.findIndex(
      (l) =>
        l.toLowerCase().includes('father') ||
        l.toLowerCase().includes('husband'),
    );
    if (idx >= 0) {
      const val = lines[idx].replace(/Father\/Husband[:\s]*/i, '').trim();
      if (val.length > 2) return val;
      if (lines[idx + 1]) return lines[idx + 1].trim();
    }
    return null;
  }

  private extractCategory(text: string): string | null {
    const match = text.match(/Category[:\s]*([A-Z\s,]+?)(?:\n|Issue)/i);
    if (match) return match[1].trim();
    const catMatch = text.match(/M CYCLE[,\s]*M CAR|LTV|HTV|PSV/);
    return catMatch ? catMatch[0] : null;
  }

  private extractDLAddress(text: string): string | null {
    const match = text.match(
      /Address[:\s]*\n?([A-Z0-9#,.\s\-]+?)(?:\n[A-Z]{2,}|Blood)/i,
    );
    if (match) return match[1].trim();
    const addrMatch = text.match(
      /(FLAT|PLOT|HOUSE|BLOCK)[#\s\d]+[A-Z0-9,.\s\-]+KARACHI/i,
    );
    return addrMatch ? addrMatch[0].trim() : null;
  }

  private extractAddress(
    text: string,
    type: 'present' | 'permanent',
  ): string | null {
    const urduBlocks = text.match(/[\u0600-\u06FF\s,\-\d\/]+/g);
    if (type === 'present' && urduBlocks?.[0]) return urduBlocks[0].trim();
    if (type === 'permanent' && urduBlocks?.[1]) return urduBlocks[1].trim();
    return null;
  }

  private extractBloodGroup(text: string): string | null {
    const match = text.match(/Blood Group[:\s]*([ABO]{1,2}[+-]?|N\/A)/i);
    return match ? match[1].trim() : null;
  }

  private extractLaserNo(text: string): string | null {
    const match = text.match(/LASER NO[:\s#]*(\d{7,})/i);
    return match ? match[1] : null;
  }
}
