import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtBlacklistGuard } from 'src/Admin/Auth/guards/jwt.guard';
import { FMJwtBlacklistGuard } from 'src/FleetManager/Auth/guards/jwt.guard';
import { OcrService } from './ocr.service';
import { OcrWorkflowService } from './ocr-workflow.service';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { CrossValidateDto } from './dto/cross-validate.dto';

@Controller('fm/ocr')
export class OcrController {
  constructor(
    private ocrService: OcrService,
    private workflow: OcrWorkflowService,
  ) {}

  @Get('admin/pending-count')
  @UseGuards(JwtBlacklistGuard)
  pendingCount() {
    return this.workflow.countPendingAdminReview();
  }

  @Get('admin/document-queue')
  @UseGuards(JwtBlacklistGuard)
  documentQueue(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workflow.listDocumentQueue(
      page ? parseInt(page, 10) || 1 : 1,
      limit ? parseInt(limit, 10) || 40 : 40,
    );
  }

  @Get('admin/document-history')
  @UseGuards(JwtBlacklistGuard)
  documentHistory(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workflow.listDocumentHistory(
      page ? parseInt(page, 10) || 1 : 1,
      limit ? parseInt(limit, 10) || 40 : 40,
    );
  }

  @Post('process/:documentId')
  @UseGuards(FMJwtBlacklistGuard)
  async processDocument(
    @Param('documentId') documentId: string,
    @Body() dto: VerifyDocumentDto,
    @Req() req: { user?: { fleet_id: number } },
  ) {
    const fleetManagerId = req.user?.fleet_id;
    return this.workflow.processDocument(+documentId, dto.documentType, {
      fleetManagerId,
    });
  }

  @Post('admin/process/:documentId')
  @UseGuards(JwtBlacklistGuard)
  adminProcessDocument(
    @Param('documentId') documentId: string,
    @Body() dto: VerifyDocumentDto,
  ) {
    return this.workflow.processDocument(+documentId, dto.documentType);
  }

  @Patch('admin/approve/:documentId')
  @UseGuards(JwtBlacklistGuard)
  approveDocument(
    @Param('documentId') documentId: string,
    @Body() body: { notes?: string },
  ) {
    return this.workflow.approveDocument(+documentId, body.notes);
  }

  @Patch('admin/reject/:documentId')
  @UseGuards(JwtBlacklistGuard)
  rejectDocument(
    @Param('documentId') documentId: string,
    @Body() body: { reason: string },
  ) {
    return this.workflow.rejectDocument(+documentId, body.reason);
  }

  @Post('cross-validate')
  @UseGuards(FMJwtBlacklistGuard)
  crossValidate(
    @Body() dto: CrossValidateDto,
    @Req() req: { user?: { fleet_id: number } },
  ) {
    const fleetManagerId = req.user?.fleet_id;
    if (fleetManagerId == null) {
      return { message: 'Missing fleet context' };
    }
    return this.workflow.crossValidateForFleet(dto, fleetManagerId);
  }

  @Get('health')
  health() {
    return {
      ocrEnabled: this.ocrService.isEnabled(),
      vision: 'Google Cloud Vision via GOOGLE_APPLICATION_CREDENTIALS',
    };
  }
}
