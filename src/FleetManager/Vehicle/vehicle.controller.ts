import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Patch,
  Get,
  Query,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dto/create_vehicle.dto';
import { FMJwtBlacklistGuard } from '../Auth/guards/jwt.guard';
import { UploadVehicleDocumentsDto } from './dto/upload_vehicle_documents.dto';
import { EditVehicleDto } from './dto/edit_vehicle.dto';

@Controller('fm/vehicles')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @UseGuards(FMJwtBlacklistGuard)
  @Post()
  async addVehicle(
    @Body() createVehicleDto: CreateVehicleDto,
    @Req() req: any,
  ) {
    const userId = req.user.fleet_user_id;
    const fmId = req.user.fleet_id;
    const vehicle = await this.vehicleService.createVehicle(
      userId,
      fmId,
      createVehicleDto,
    );

    return {
      message: 'Vehicle added successfully',
      vehicleId: vehicle.id,
    };
  }

  @UseGuards(FMJwtBlacklistGuard)
  @Post('uploadDocuments/:vehicleId')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadVehicleDocuments(
    @Param('vehicleId') vehicleId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadVehicleDocumentsDto,
  ) {
    if (!files || !files.length) {
      throw new BadRequestException(
        'At least one file is required to upload documents.',
      );
    }

    if (body.documentTypes.length !== files.length) {
      throw new BadRequestException(
        'documentTypes length must match files length',
      );
    }

    const results = await this.vehicleService.uploadVehicleDocuments(
      vehicleId,
      files,
      body.documentTypes,
    );

    return {
      message: 'Documents uploaded successfully',
      details: results,
    };
  }

  @UseGuards(FMJwtBlacklistGuard)
  @Patch('editVehicle/:vehicleId')
  async updateVehicle(
    @Req() req,
    @Param('vehicleId') vehicleId: number,
    @Body() dto: EditVehicleDto,
  ) {
    const updatedVehicle = await this.vehicleService.updateVehicle(
      req.user.fleet_user_id,
      vehicleId,
      dto,
    );
    return {
      message: 'Vehicle updated successfully',
      updatedVehicle,
    };
  }

  @UseGuards(FMJwtBlacklistGuard)
  @Get('getAllVehicles')
  async getAllVehicles(
    @Req() req,
    @Query('page') page: 1,
    @Query('limit') limit: 10,
    @Query('status') status?: string,
    @Query('isApprovedByAdmin') isApprovedByAdmin?: boolean,
    @Query('driverOption') driverServiceOption?: string,
    @Query('search') search?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.vehicleService.getAllVehiclesByFM(
      req.user.fleet_id,
      page,
      limit,
      status,
      isApprovedByAdmin,
      driverServiceOption,
      search,
      sortOrder,
    );
  }

  @UseGuards(FMJwtBlacklistGuard)
  @Get('getAlldocuments/:vehicleId')
  async getAllDocsByVehicleId(
    @Req() req: any,
    @Param('vehicleId') vehicleId: number,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('verificationStatus') verificationStatus: string,
    @Query('search') search: string,
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC',
  ) {
    const fmId = req.user.fleet_id;
    return this.vehicleService.getAllDocsByVehicleId(
      fmId,
      vehicleId,
      page,
      limit,
      verificationStatus,
      search,
      sortOrder,
    );
  }
}
