import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FleetManagerVehicleDocuments } from 'src/entities/entities/FleetManagerVehicleDocuments';
import { FleetManagersDocuments } from 'src/entities/entities/FleetManagersDocuments';
import { AuthModule } from 'src/Admin/Auth/auth.module';
import { FMAuthModule } from 'src/FleetManager/Auth/auth.module';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';
import { DocumentParserService } from './document-parser.service';
import { DocumentValidatorService } from './document-validator.service';
import { OcrWorkflowService } from './ocr-workflow.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FleetManagerVehicleDocuments,
      FleetManagersDocuments,
    ]),
    FMAuthModule,
    AuthModule,
  ],
  controllers: [OcrController],
  providers: [
    OcrService,
    DocumentParserService,
    DocumentValidatorService,
    OcrWorkflowService,
  ],
  exports: [
    OcrService,
    DocumentParserService,
    DocumentValidatorService,
    OcrWorkflowService,
  ],
})
export class OcrModule {}
