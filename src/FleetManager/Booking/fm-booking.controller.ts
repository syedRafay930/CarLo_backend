import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { FMJwtBlacklistGuard } from '../Auth/guards/jwt.guard';
import { FmBookingService } from './fm-booking.service';

@Controller('fm/bookings')
export class FmBookingController {
  constructor(private fmBookingService: FmBookingService) {}

  @Get('stats/summary')
  @UseGuards(FMJwtBlacklistGuard)
  getBookingStats(@Req() req: { user?: { fleet_id: number } }) {
    const fleetManagerId = req.user?.fleet_id as number;
    return this.fmBookingService.getFleetBookingStats(fleetManagerId);
  }

  @Get()
  @UseGuards(FMJwtBlacklistGuard)
  getFleetBookings(
    @Req() req: { user?: { fleet_id: number } },
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const fleetManagerId = req.user?.fleet_id as number;
    return this.fmBookingService.getFleetBookings({
      fleetManagerId,
      status,
      page: page ? parseInt(page, 10) || 1 : 1,
      limit: limit ? parseInt(limit, 10) || 20 : 20,
    });
  }

  @Get(':bookingId')
  @UseGuards(FMJwtBlacklistGuard)
  getBookingDetail(
    @Param('bookingId') bookingId: string,
    @Req() req: { user?: { fleet_id: number } },
  ) {
    const fleetManagerId = req.user?.fleet_id as number;
    return this.fmBookingService.getBookingDetail(+bookingId, fleetManagerId);
  }
}
