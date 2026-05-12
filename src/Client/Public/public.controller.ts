import {
  Get,
  Post,
  Controller,
  Query,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
  HttpCode,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { VehicleService } from 'src/FleetManager/Vehicle/vehicle.service';
import { ClientJwtBlacklistGuard } from '../Auth/guards/jwt.guard';
import { CreateVehicleReviewDto } from './dto/create_vehicle_review.dto';
import { FleetService } from 'src/Admin/Fleet/fleet.service';
import { PublicService } from './public.service';

@Controller('public')
export class PublicVehicleController {
  constructor(
    private readonly vehicleService: VehicleService,
    private readonly fleetService: FleetService,
    private readonly publicService: PublicService,
  ) {}

  @Get('makes')
  async getPublicVehicleMakes() {
    return this.vehicleService.getPublicCatalogMakes();
  }

  @Get('models')
  async getPublicVehicleModels(@Query('make') make?: string) {
    return this.vehicleService.getPublicCatalogModels(make);
  }

  @Get('colors')
  async getPublicVehicleColors() {
    return this.vehicleService.getPublicCatalogColors();
  }

  @Get('vehicles/list')
  async getPublicVehicles(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('make') make: string,
    @Query('driverServiceOption') driverServiceOption: string,
    @Query('search') search: string,
    @Query('sortOrder') sortOrder: 'DESC',
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('vehicleType') vehicleType?: string,
    @Query('color') color?: string,
    @Query('seatingCapacity') seatingCapacity?: number,
    @Query('fuelType') fuelType?: string,
    @Query('pricingModel') pricingModel?: string,
    @Query('city') city?: string,
    @Query('transmissionType') transmissionType?: string,
  ) {
    return this.vehicleService.getPublicCatalogVehicles(
      page,
      limit,
      make,
      driverServiceOption,
      search,
      sortOrder,
      minPrice,
      maxPrice,
      vehicleType,
      color,
      seatingCapacity,
      fuelType,
      pricingModel,
      city,
      transmissionType,
    );
  }

  @Get('vehicles/details/:vehicleId')
  async getVehicleDetails(@Param('vehicleId') vehicleId: number) {
    return this.vehicleService.getVehicleById(vehicleId);
  }

  @Get('vehicles/reviews/:vehicleId')
  async getVehicleReviews(@Param('vehicleId') vehicleId: number) {
    return this.vehicleService.getReviewsByVehicleId(vehicleId);
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @HttpCode(201)
  @Post('vehicles/reviews/:vehicleId')
  async createVehicleReview(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @Body() dto: CreateVehicleReviewDto,
    @Req() req: { user?: { client_id?: number } },
  ) {
    const userId = req.user?.client_id;
    if (userId == null || Number.isNaN(Number(userId))) {
      throw new UnauthorizedException();
    }
    return this.vehicleService.createVehicleReview(vehicleId, userId, {
      rating: dto.rating,
      review: dto.review,
    });
  }

  @Get('fleets')
  async getFleets(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('city') city?: string,
    @Query('type') type?: 'individual' | 'shop',
  ) {
    return this.publicService.getPublicFleets({
      page: Number(page),
      limit: Number(limit),
      search,
      city,
      type,
    });
  }

  @Get('fleets/:fleetId')
  async getFleetDetail(@Param('fleetId', ParseIntPipe) fleetId: number) {
    return this.publicService.getPublicFleetDetail(fleetId);
  }
}
