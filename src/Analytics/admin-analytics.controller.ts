import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtBlacklistGuard } from 'src/Admin/Auth/guards/jwt.guard';
import { AnalyticsService } from './analytics.service';

@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('platform')
  @UseGuards(JwtBlacklistGuard)
  getPlatformAnalytics(
    @Query('period') period: '7d' | '30d' | '90d' = '30d',
  ) {
    const validPeriods = ['7d', '30d', '90d'];
    const safePeriod = validPeriods.includes(period) ? period : '30d';
    return this.analyticsService.getPlatformAnalytics(
      safePeriod as '7d' | '30d' | '90d',
    );
  }
}
