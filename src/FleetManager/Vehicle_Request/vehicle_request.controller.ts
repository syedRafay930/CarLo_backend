import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { CreateVehicleRequestDto } from './dto/vehicle_request.dto';
import { VehicleRequestService } from './vehicle_request.service';
import { FMJwtBlacklistGuard } from '../Auth/guards/jwt.guard';
import { FirebaseService } from 'src/firebase/firebase.service';
import { FleetService } from 'src/Admin/Fleet/fleet.service';

@Controller('vehicle-requests')
export class VehicleRequestController {
  constructor(
    private readonly vehicleRequestService: VehicleRequestService,
    private readonly firebaseService: FirebaseService,
    private readonly fleetService: FleetService,
  ) {}

  @UseGuards(FMJwtBlacklistGuard)
  @Post('approval')
  async createVehicleApprovalRequest(
    @Body() dto: CreateVehicleRequestDto,
    @Req() req,
  ) {
    const fleet_user_id = req.user.fleet_user_id;
    const fleet_id = req.user.fleet_id;

    const fleet = await this.fleetService.getFleetById(fleet_id);
    if (!fleet) {
      throw new Error('Fleet not found');
    }

    const result = await this.vehicleRequestService.createRequest(
      dto,
      fleet_user_id,
      fleet_id,
    );

    if (!result) {
      throw new Error('Error in creating request');
    }

    await this.firebaseService.saveAndSendNotificationToAdmins({
      title: 'Request for Vehicle Approval',
      body: `New vehicle request from ${fleet.name} for approval.`,
      sender_id: fleet_user_id,
      request_id: result.request_id,
      type: dto.requestType,
      redirect_url: `/fleet/VehicleRequestDetail/${result.request_id}`,
    });

    return result;
  }

  @UseGuards(FMJwtBlacklistGuard)
  @Post('removal')
  async createVehicleRemovalRequest(
    @Body() dto: CreateVehicleRequestDto,
    @Req() req,
  ) {
    const fleet_user_id = req.user.fleet_user_id;
    const fleet_id = req.user.fleet_id;

    const fleet = await this.fleetService.getFleetById(fleet_id);
    if (!fleet) {
      throw new Error('Fleet not found');
    }
    const result = await this.vehicleRequestService.createRequest(
      dto,
      fleet_user_id,
      fleet_id,
    );

    if (!result) {
      throw new Error('Error in creating request');
    }
    await this.firebaseService.saveAndSendNotificationToAdmins({
      title: 'Request for Vehicle Removal',
      body: `New vehicle request from ${fleet.name} for removal.`,
      sender_id: fleet_user_id,
      request_id: result.request_id,
      type: dto.requestType,
      redirect_url: `/fleet/VehicleRequestDetail/${result.request_id}`,
    });

    return result;
  }

  @UseGuards(FMJwtBlacklistGuard)
  @Get()
  async getVehicleRequests(
    @Req() req,
    @Query('status') status: string,
    @Query('type') type: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const fleet_id = req.user.fleet_id;
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.vehicleRequestService.getVehicleRequests(
      fleet_id,
      status,
      type,
      search,
      fromDate,
      toDate,
      page,
      limit,
    );
  }
}
