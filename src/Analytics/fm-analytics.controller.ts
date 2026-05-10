import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { FMJwtBlacklistGuard } from 'src/FleetManager/Auth/guards/jwt.guard';
import { AnalyticsService } from './analytics.service';

@Controller('fm/analytics')
export class FmAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('fleet')
  @UseGuards(FMJwtBlacklistGuard)
  getFleetAnalytics(
    @Req() req: { user?: { fleet_id?: number } },
    @Query('period') period: '7d' | '30d' | '90d' = '30d',
  ) {
    const fleetId = req.user?.fleet_id as number;
    const validPeriods = ['7d', '30d', '90d'];
    const safePeriod = validPeriods.includes(period) ? period : '30d';
    return this.analyticsService.getFleetAnalytics(fleetId, safePeriod);
  }
}
