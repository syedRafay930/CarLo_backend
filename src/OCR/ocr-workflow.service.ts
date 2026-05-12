import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FleetManagerVehicleDocuments } from 'src/entities/entities/FleetManagerVehicleDocuments';
import { FleetManagersDocuments } from 'src/entities/entities/FleetManagersDocuments';
import { DocumentParserService } from './document-parser.service';
import { DocumentValidatorService } from './document-validator.service';
import { OcrService } from './ocr.service';
import type {
  DocumentType,
  ExtractedCnicFront,
  ExtractedDrivingLicenseFront,
  StoredOcrPayload,
  ValidationResult,
} from './ocr.types';

const VEHICLE_REVIEW_STATUSES: FleetManagerVehicleDocuments['verificationStatus'][] =
  ['pending', 'ocr_passed', 'ocr_flagged', 'comparison_failed'];

const FLEET_REVIEW_STATUSES: FleetManagersDocuments['verificationStatus'][] = [
  'pending',
  'in_review',
  'ocr_passed',
  'ocr_flagged',
];

const VEHICLE_DONE_STATUSES: FleetManagerVehicleDocuments['verificationStatus'][] =
  ['verified', 'rejected'];

const FLEET_DONE_STATUSES: FleetManagersDocuments['verificationStatus'][] = [
  'verified',
  'rejected',
];

@Injectable()
export class OcrWorkflowService {
  constructor(
    private ocrService: OcrService,
    private parserService: DocumentParserService,
    private validatorService: DocumentValidatorService,
    @InjectRepository(FleetManagerVehicleDocuments)
    private docsRepo: Repository<FleetManagerVehicleDocuments>,
    @InjectRepository(FleetManagersDocuments)
    private fleetDocsRepo: Repository<FleetManagersDocuments>,
  ) {}

  async listDocumentQueue(page = 1, limit = 40) {
    const skip = (page - 1) * limit;
    const [vehicleRows, vehicleTotal] = await this.docsRepo.findAndCount({
      where: { verificationStatus: In(VEHICLE_REVIEW_STATUSES) },
      relations: ['vehicle', 'vehicle.fleetManager'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const vehicleDocs = vehicleRows.map((d) => ({
      source: 'vehicle' as const,
      id: d.id,
      docType: d.docType,
      documentUrl: d.documentUrl,
      verificationStatus: d.verificationStatus,
      extractedData: d.extractedData,
      verificationResult: d.verificationResult,
      createdAt: d.createdAt,
      fleetId: d.vehicle?.fleetManager?.id,
      fleetName: d.vehicle?.fleetManager?.name ?? '—',
      vehicleId: d.vehicle?.id,
      vehicleLabel: d.vehicle
        ? `${d.vehicle.make ?? ''} ${d.vehicle.model ?? ''}`.trim()
        : '—',
    }));

    const [fleetRows, fleetTotal] = await this.fleetDocsRepo.findAndCount({
      where: {
        verificationStatus: In(FLEET_REVIEW_STATUSES),
        isDeleted: false,
      },
      relations: ['fleetManager'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const fleetDocs = fleetRows.map((d) => ({
      source: 'fleet' as const,
      id: d.id,
      docType: d.documentType,
      documentUrl: d.documentUrl,
      verificationStatus: d.verificationStatus,
      aiResultJson: d.aiResultJson,
      rejectionReason: d.rejectionReason,
      createdAt: d.createdAt,
      fleetId: d.fleetManager?.id,
      fleetName: d.fleetManager?.name ?? '—',
      vehicleId: null as number | null,
      vehicleLabel: null as string | null,
    }));

    return {
      vehicleDocs,
      fleetDocs,
      totals: { vehicleTotal, fleetTotal, combined: vehicleTotal + fleetTotal },
    };
  }

  async listDocumentHistory(page = 1, limit = 40) {
    const skip = (page - 1) * limit;
    const [vehicleRows, vehicleTotal] = await this.docsRepo.findAndCount({
      where: { verificationStatus: In(VEHICLE_DONE_STATUSES) },
      relations: ['vehicle', 'vehicle.fleetManager'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const vehicleDocs = vehicleRows.map((d) => ({
      source: 'vehicle' as const,
      id: d.id,
      docType: d.docType,
      documentUrl: d.documentUrl,
      verificationStatus: d.verificationStatus,
      extractedData: d.extractedData,
      verificationResult: d.verificationResult,
      createdAt: d.createdAt,
      fleetId: d.vehicle?.fleetManager?.id,
      fleetName: d.vehicle?.fleetManager?.name ?? '—',
      vehicleId: d.vehicle?.id,
      vehicleLabel: d.vehicle
        ? `${d.vehicle.make ?? ''} ${d.vehicle.model ?? ''}`.trim()
        : '—',
    }));

    const [fleetRows, fleetTotal] = await this.fleetDocsRepo.findAndCount({
      where: {
        verificationStatus: In(FLEET_DONE_STATUSES),
        isDeleted: false,
      },
      relations: ['fleetManager'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const fleetDocs = fleetRows.map((d) => ({
      source: 'fleet' as const,
      id: d.id,
      docType: d.documentType,
      documentUrl: d.documentUrl,
      verificationStatus: d.verificationStatus,
      aiResultJson: d.aiResultJson,
      rejectionReason: d.rejectionReason,
      createdAt: d.createdAt,
      fleetId: d.fleetManager?.id,
      fleetName: d.fleetManager?.name ?? '—',
      vehicleId: null as number | null,
      vehicleLabel: null as string | null,
    }));

    return {
      vehicleDocs,
      fleetDocs,
      totals: { vehicleTotal, fleetTotal, combined: vehicleTotal + fleetTotal },
    };
  }

  async countPendingAdminReview(): Promise<{
    vehicleDocs: number;
    fleetDocs: number;
    total: number;
  }> {
    const vehicleDocs = await this.docsRepo.count({
      where: { verificationStatus: In(VEHICLE_REVIEW_STATUSES) },
    });
    const fleetDocs = await this.fleetDocsRepo.count({
      where: {
        verificationStatus: In(FLEET_REVIEW_STATUSES),
        isDeleted: false,
      },
    });
    return { vehicleDocs, fleetDocs, total: vehicleDocs + fleetDocs };
  }

  async processDocument(
    documentId: number,
    documentType: DocumentType,
    options?: { fleetManagerId?: number },
  ) {
    const start = Date.now();

    const vehicleDoc = await this.docsRepo.findOne({
      where: { id: documentId },
      relations: ['vehicle', 'vehicle.fleetManager'],
    });

    let documentUrl: string;
    let isVehicleDoc = true;
    let fleetDoc: FleetManagersDocuments | null = null;

    if (vehicleDoc) {
      if (options?.fleetManagerId != null) {
        const fmId = vehicleDoc.vehicle?.fleetManager?.id;
        if (fmId !== options.fleetManagerId) {
          throw new ForbiddenException('Document not found in your fleet');
        }
      }
      documentUrl = vehicleDoc.documentUrl;
    } else {
      fleetDoc = await this.fleetDocsRepo.findOne({
        where: { id: documentId, isDeleted: false },
        relations: ['fleetManager'],
      });
      if (!fleetDoc) {
        throw new NotFoundException('Document not found');
      }
      if (options?.fleetManagerId != null) {
        if (fleetDoc.fleetManager?.id !== options.fleetManagerId) {
          throw new ForbiddenException('Document not found in your fleet');
        }
      }
      documentUrl = fleetDoc.documentUrl;
      isVehicleDoc = false;
    }

    const { fullText, confidence } =
      await this.ocrService.extractTextFromImageUrl(documentUrl);

    let extractedFields: unknown;
    let validation: ValidationResult;

    switch (documentType) {
      case 'cnic_front':
        extractedFields = this.parserService.parseCnicFront(fullText);
        validation = this.validatorService.validateCnicFront(
          extractedFields as ExtractedCnicFront,
        );
        break;
      case 'cnic_back':
        extractedFields = this.parserService.parseCnicBack(fullText);
        validation = {
          isValid: true,
          confidence: 'medium',
          errors: [],
          warnings: [],
          checks: [],
        };
        break;
      case 'driving_license_front':
        extractedFields = this.parserService.parseDrivingLicenseFront(fullText);
        validation = this.validatorService.validateDrivingLicenseFront(
          extractedFields as ExtractedDrivingLicenseFront,
        );
        break;
      case 'driving_license_back':
        extractedFields = this.parserService.parseDrivingLicenseBack(fullText);
        validation = {
          isValid: true,
          confidence: 'medium',
          errors: [],
          warnings: [],
          checks: [],
        };
        break;
      default:
        throw new BadRequestException('Invalid document type');
    }

    const nextStatus: FleetManagerVehicleDocuments['verificationStatus'] =
      validation.isValid ? 'ocr_passed' : 'ocr_flagged';

    const ocrPayload: StoredOcrPayload = {
      documentType,
      extractedFields,
      validation,
      rawTextPreview: fullText.slice(0, 2000),
      apiConfidence: confidence,
      processedAt: new Date().toISOString(),
    };

    if (isVehicleDoc && vehicleDoc) {
      let prev: Record<string, unknown> = {};
      try {
        if (vehicleDoc.extractedData) {
          prev = JSON.parse(vehicleDoc.extractedData) as Record<
            string,
            unknown
          >;
        }
      } catch {
        prev = {};
      }
      await this.docsRepo.update(documentId, {
        verificationStatus: nextStatus,
        extractedData: JSON.stringify({ ...prev, ocr: ocrPayload }),
      });
    } else if (fleetDoc) {
      await this.fleetDocsRepo.update(documentId, {
        verificationStatus: nextStatus,
        aiResultJson: JSON.stringify({ ocr: ocrPayload }),
      });
    }

    const processingTimeMs = Date.now() - start;

    return {
      documentId,
      documentType,
      rawText: fullText.substring(0, 500),
      extractedFields,
      validation,
      apiConfidence: confidence,
      processingTimeMs,
      savedToDb: true,
    };
  }

  async approveDocument(documentId: number, notes?: string, adminId?: number) {
    const v = await this.docsRepo.findOne({ where: { id: documentId } });
    if (v) {
      await this.docsRepo.update(documentId, {
        verificationStatus: 'verified',
        verifiedBy: adminId ? { id: adminId } as any : undefined,
        verificationResult: notes ?? v.verificationResult,
        verifiedAt: new Date(),
      });
      return { success: true, message: 'Document approved', scope: 'vehicle' };
    }
    const f = await this.fleetDocsRepo.findOne({
      where: { id: documentId, isDeleted: false },
    });
    if (f) {
      await this.fleetDocsRepo.update(documentId, {
        verificationStatus: 'verified',
        verifiedBy: adminId ? { id: adminId } as any : undefined,
        verifiedAt: new Date(),
      });
      return { success: true, message: 'Document approved', scope: 'fleet' };
    }
    throw new NotFoundException('Document not found');
  }

  async rejectDocument(documentId: number, reason: string, adminId?: number) {
    const v = await this.docsRepo.findOne({ where: { id: documentId } });
    if (v) {
      await this.docsRepo.update(documentId, {
        verificationStatus: 'rejected',
        verificationResult: reason,
        verifiedBy: adminId ? { id: adminId } as any : undefined,
      });
      return { success: true, message: 'Document rejected', scope: 'vehicle' };
    }
    const f = await this.fleetDocsRepo.findOne({
      where: { id: documentId, isDeleted: false },
    });
    if (f) {
      await this.fleetDocsRepo.update(documentId, {
        verificationStatus: 'rejected',
        rejectionReason: reason,
        verifiedBy: adminId ? { id: adminId } as any : undefined,
      });
      return { success: true, message: 'Document rejected', scope: 'fleet' };
    }
    throw new NotFoundException('Document not found');
  }

  async crossValidateForFleet(
    dto: {
      cnicFrontDocId?: number;
      cnicBackDocId?: number;
      dlFrontDocId?: number;
      dlBackDocId?: number;
    },
    fleetManagerId: number,
  ) {
    const loadOcr = async (
      id: number | undefined,
      expectType: DocumentType,
    ): Promise<unknown | null> => {
      if (id == null) return null;
      const doc = await this.docsRepo.findOne({
        where: { id },
        relations: ['vehicle', 'vehicle.fleetManager'],
      });
      if (!doc || doc.vehicle?.fleetManager?.id !== fleetManagerId) {
        throw new ForbiddenException(`Document ${id} not in your fleet`);
      }
      if (!doc.extractedData) return null;
      try {
        const j = JSON.parse(doc.extractedData) as {
          ocr?: StoredOcrPayload;
        };
        if (!j.ocr || j.ocr.documentType !== expectType) return null;
        return j.ocr.extractedFields;
      } catch {
        return null;
      }
    };

    const cnicFront = (await loadOcr(dto.cnicFrontDocId, 'cnic_front')) as
      | import('./ocr.types').ExtractedCnicFront
      | null;
    const cnicBack = (await loadOcr(dto.cnicBackDocId, 'cnic_back')) as
      | import('./ocr.types').ExtractedCnicBack
      | null;
    const dlFront = (await loadOcr(
      dto.dlFrontDocId,
      'driving_license_front',
    )) as import('./ocr.types').ExtractedDrivingLicenseFront | null;
    const dlBack = (await loadOcr(dto.dlBackDocId, 'driving_license_back')) as
      | import('./ocr.types').ExtractedDrivingLicenseBack
      | null;

    const result = this.validatorService.crossValidate({
      cnicFront: cnicFront ?? undefined,
      cnicBack: cnicBack ?? undefined,
      dlFront: dlFront ?? undefined,
      dlBack: dlBack ?? undefined,
    });

    return {
      ...result,
      hadData: {
        cnicFront: !!cnicFront,
        cnicBack: !!cnicBack,
        dlFront: !!dlFront,
        dlBack: !!dlBack,
      },
    };
  }
}
