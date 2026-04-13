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
  UnauthorizedException,
} from '@nestjs/common';
import { VehicleService } from 'src/FleetManager/Vehicle/vehicle.service';
import { ClientJwtBlacklistGuard } from '../Auth/guards/jwt.guard';
import { CreateVehicleReviewDto } from './dto/create_vehicle_review.dto';

@Controller('public/vehicles')
export class PublicVehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Get('list')
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

  @Get('details/:vehicleId')
  async getVehicleDetails(@Param('vehicleId') vehicleId: number) {
    return this.vehicleService.getVehicleById(vehicleId);
  }

  @Get('reviews/:vehicleId')
  async getVehicleReviews(@Param('vehicleId') vehicleId: number) {
    return this.vehicleService.getReviewsByVehicleId(vehicleId);
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @HttpCode(201)
  @Post('reviews/:vehicleId')
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
}
