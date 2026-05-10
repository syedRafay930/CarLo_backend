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
      vehicle: vehicle,
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
    if (!files || !files.length)
      throw new BadRequestException('At least one file is required.');
    if (body.documentTypes.length !== files.length)
      throw new BadRequestException(
        'documentTypes length must match files length',
      );

    // Files ko type se map karo
    const fileMap: Record<string, Express.Multer.File> = {};
    files.forEach((file, index) => {
      fileMap[body.documentTypes[index]] = file;
    });

    // Zaruri files check
    const requiredForVerification = [
      'image_exterior_front',
      'image_exterior_back',
      'image_exterior_left',
      'image_exterior_right',
      'registration_paper',
    ];

    const hasAllRequired = requiredForVerification.every(
      (type) => fileMap[type],
    );

    if (hasAllRequired) {
      const vehicle = await this.vehicleService.getVehicleById(vehicleId);

      const aiFileMap: Record<string, Express.Multer.File> = {
        image_exterior_front: fileMap['image_exterior_front'],
        image_exterior_back: fileMap['image_exterior_back'],
        image_exterior_left: fileMap['image_exterior_left'],
        image_exterior_right: fileMap['image_exterior_right'],
        registration_paper: fileMap['registration_paper'],
      };

      const aiResult = await this.vehicleService.verifyVehicleDocuments(
        aiFileMap,
        vehicle.licensePlate,
        vehicle.chassisNumber || '',
      );

      return this.vehicleService.uploadVehicleDocuments(
        vehicleId,
        files,
        body.documentTypes,
        aiResult, // ← ye add kiya
      );
    }
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
    @Query('make') make?: string,
    @Query('status') status?: string,
    @Query('isApprovedByAdmin') isApprovedByAdmin?: boolean,
    @Query('approvalStatus') approvalStatus?: string,
    @Query('driverOption') driverServiceOption?: string,
    @Query('search') search?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.vehicleService.getAllVehiclesByFM(
      req.user.fleet_id,
      page,
      limit,
      make,
      status,
      isApprovedByAdmin,
      approvalStatus,
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
