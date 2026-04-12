import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FMJwtBlacklistGuard } from 'src/FleetManager/Auth/guards/jwt.guard';
import { JwtBlacklistGuard } from 'src/Admin/Auth/guards/jwt.guard';
import { DynamicPricingService } from './dynamic-pricing.service';
import { UpdatePricingConfigDto } from './dto/update-pricing-config.dto';

@Controller('fm/pricing')
export class DynamicPricingController {
  constructor(private pricingService: DynamicPricingService) {}

  @Get('fleet-summary')
  @UseGuards(FMJwtBlacklistGuard)
  fleetSummary(@Req() req: { user?: { fleet_id: number } }) {
    const fleetManagerId = req.user?.fleet_id as number;
    return this.pricingService.getFleetPricingSummary(fleetManagerId);
  }

  @Get('vehicle/:vehicleId')
  @UseGuards(FMJwtBlacklistGuard)
  getCurrentPrice(@Param('vehicleId') vehicleId: string) {
    return this.pricingService.getCurrentPriceForVehicle(+vehicleId);
  }

  @Get('vehicle/:vehicleId/history')
  @UseGuards(FMJwtBlacklistGuard)
  getPricingHistory(@Param('vehicleId') vehicleId: string) {
    return this.pricingService.getPricingHistory(+vehicleId);
  }

  @Patch('vehicle/:vehicleId/config')
  @UseGuards(FMJwtBlacklistGuard)
  async updateConfig(
    @Param('vehicleId') vehicleId: string,
    @Body() dto: UpdatePricingConfigDto,
    @Req() req: { user?: { fleet_id: number } },
  ) {
    const fleetManagerId = req.user?.fleet_id as number;
    await this.pricingService.updateVehiclePricingConfig(
      +vehicleId,
      dto,
      fleetManagerId,
    );
    return { success: true };
  }

  @Get('admin/overview')
  @UseGuards(JwtBlacklistGuard)
  getAdminOverview() {
    return this.pricingService.getAdminPricingOverview();
  }

  @Post('admin/run-cycle')
  @UseGuards(JwtBlacklistGuard)
  async runCycleNow() {
    const result = await this.pricingService.runPricingCycle();
    return { message: 'Pricing cycle completed', ...result };
  }
}
