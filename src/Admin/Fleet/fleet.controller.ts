import {
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  Body,
  Put,
  Patch,
  Param,
  ParseIntPipe,
  Req,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { JwtBlacklistGuard } from '../Auth/guards/jwt.guard';
import { FleetService } from './fleet.service';
import { AddFleetDto } from './dto/add_fleet.dto';
import { AddFleetUserDto } from './dto/add_fleet_user.dto';
import { AddFleetWithUserDto } from './dto/add_fleet_with_admin.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { uploadToCloudinary } from 'src/Cloudinary/cloudinary.helper';
import { UploadedFiles } from '@nestjs/common';
import { UploadDocumentsDto } from './dto/upload_documents.dto';
import { EditFleetDto } from './dto/edit_fleet_.dto';
import { ResolveVehicleRequestDto } from './dto/resolve_vehicle_request.dto';
import { VehicleService } from 'src/FleetManager/Vehicle/vehicle.service';
import { VehicleRequestService } from 'src/FleetManager/Vehicle_Request/vehicle_request.service';
import { Multer } from 'multer';
import { SubmitApplicationDto } from './dto/submit-application.dto';

@Controller('admin/fleet')
export class FleetController {
  constructor(
    private fleetService: FleetService,
    private vehicleService: VehicleService,
    private vehicleRequestService: VehicleRequestService,
  ) {}

  @UseGuards(JwtBlacklistGuard)
  @Post('add')
  async AddFleetWithUser(@Body() dto: AddFleetWithUserDto) {
    const created = await this.fleetService.addFleetWithUser(dto);
    try {
      await this.fleetService.generateJwtTokenAndResetLink(
        dto.user.Email,
        dto.fleet.fleet_name,
      );
    } catch {
      /* Fleet + FM user are already saved; SMTP may be unset in local dev */
    }
    return {
      message: 'Fleet created successfully',
      ...created,
    };
  }

  @UseGuards(JwtBlacklistGuard)
  @Post('uploadDocuments/:fleetManagerId')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadDocuments(
    @Param('fleetManagerId') fleetManagerId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadDocumentsDto,
  ) {
    if (!files || !files.length) {
      throw new BadRequestException('At least one file is required');
    }

    if (body.documentTypes.length !== files.length) {
      throw new BadRequestException(
        'documentTypes length must match files length',
      );
    }

    return this.fleetService.uploadDocuments(
      files,
      body.documentTypes,
      fleetManagerId,
    );
  }

  @UseGuards(JwtBlacklistGuard)
  @Get('vehicle-requests')
  async getAdminVehicleRequests(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.vehicleRequestService.getAllVehicleRequestsForAdmin(
      status,
      type,
      search,
      fromDate,
      toDate,
      +page,
      +limit,
    );
  }

  @UseGuards(JwtBlacklistGuard)
  @Patch('vehicle-requests/:id')
  async resolveVehicleRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveVehicleRequestDto,
    @Req() req: { user?: { admin_id?: number } },
  ) {
    const adminId = req.user?.admin_id;
    if (adminId == null || Number.isNaN(Number(adminId))) {
      throw new ForbiddenException('Admin context missing');
    }
    return this.vehicleRequestService.resolveRequestForAdmin(
      id,
      Number(adminId),
      dto.decision,
      dto.adminNotes,
    );
  }

  @UseGuards(JwtBlacklistGuard)
  @Get('getAllFleet')
  async getAllFleet(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'inactive',
    @Query('plan') plan?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ) {
    return this.fleetService.getFilteredFleet(
      +page,
      +limit,
      search,
      status,
      plan,
      startDate,
      endDate,
      paymentStatus,
    );
  }

  @UseGuards(JwtBlacklistGuard)
  @Patch('editFleet/:id')
  async editFleetById(@Param('id') id: number, @Body() dto: EditFleetDto) {
    const updated = await this.fleetService.editFleet(id, dto);
    return {
      message: 'Fleet updated successfully',
      company: updated,
    };
  }

  @UseGuards(JwtBlacklistGuard)
  @Get('getUsersByFleet/:id')
  async getAllFleetUsers(
    @Param('id') id: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'inactive',
    @Query('role') role?: string,
  ) {
    return this.fleetService.getAllFleetUsers(
      id,
      +page,
      +limit,
      search,
      status,
      role,
    );
  }

  @UseGuards(JwtBlacklistGuard)
  @Get('getDocsByFleet/:id')
  async getAllFleetDocuments(
    @Param('id') id: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    return this.fleetService.getAllFleetDocuments(id, +page, +limit, search);
  }

  @UseGuards(JwtBlacklistGuard)
  @Get('getVehiclesByFleet/:id')
  async getAllVehiclesByFM(
    @Param('id') id: number,
    @Query('page') page: 1,
    @Query('limit') limit: 10,
    @Query('make') make?: string,
    @Query('status') status?: string,
    @Query('isApprovedByAdmin') isApprovedByAdmin?: boolean,
    @Query('driverOption') driverServiceOption?: string,
    @Query('search') search?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.vehicleService.getAllVehiclesByFM(
      id,
      page,
      limit,
      make,
      status,
      isApprovedByAdmin,
      driverServiceOption,
      search,
      sortOrder,
    );
  }

  @UseGuards(JwtBlacklistGuard)
  @Get('getAlldocuments/:FMId/:vehicleId')
  async getAllDocsByVehicleId(
    @Param('FMId') fmId: number,
    @Param('vehicleId') vehicleId: number,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('verificationStatus') verificationStatus: string,
    @Query('search') search: string,
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC',
  ) {
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

  @Post('apply')
  async apply(@Body() dto: SubmitApplicationDto) {
    return this.fleetService.submitApplication(dto);
  }

  @Post('public/uploadDocuments/:applicationId')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadApplicationDocuments(
    @Param('applicationId') applicationId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadDocumentsDto,
  ) {
    if (!files || !files.length)
      throw new BadRequestException('At least one file is required');
    if (body.documentTypes.length !== files.length)
      throw new BadRequestException(
        'documentTypes length must match files length',
      );

    const fileMap: Record<string, Express.Multer.File> = {};
    files.forEach((file, index) => {
      fileMap[body.documentTypes[index]] = file;
    });

    if (
      fileMap['cnic_front'] &&
      fileMap['cnic_back'] &&
      fileMap['shop_paper']
    ) {
      const application =
        await this.fleetService.getApplicationById(applicationId);

      await this.fleetService.verifyFleetDocuments(
        fileMap['cnic_front'],
        fileMap['cnic_back'],
        fileMap['shop_paper'],
        application.regNumber,
        application.cnic,
      );
    } else {
      throw new BadRequestException(
        'CNIC Front, Back and Shop Paper are mandatory for verification',
      );
    }

    return this.fleetService.uploadDocuments(
      files,
      body.documentTypes,
      undefined,
      applicationId,
    );
  }

  @Get('subscriptions')
  async getSubscriptions() {
    return this.fleetService.getActiveSubscriptions();
  }

  @Get(':id/status')
  async status(@Param('id', ParseIntPipe) id: number) {
    return this.fleetService.getApplicationStatus(id);
  }

  @Patch(':id/subscription')
  async selectSubscription(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { subscription_id: number },
  ) {
    if (!body.subscription_id) {
      throw new BadRequestException('subscription_id is required');
    }
    return this.fleetService.selectSubscription(id, body.subscription_id);
  }

  @UseGuards(JwtBlacklistGuard)
  @Get('applications')
  async getAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.fleetService.getAllApplications({
      page: Number(page),
      limit: Number(limit),
      status,
      search,
    });
  }

  @UseGuards(JwtBlacklistGuard)
  @Get('applications/:id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.fleetService.getApplicationById(id);
  }
}
