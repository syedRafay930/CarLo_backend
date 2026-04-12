import { Get, Controller, Query, Param } from '@nestjs/common';
import { VehicleService } from 'src/FleetManager/Vehicle/vehicle.service';

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
}
