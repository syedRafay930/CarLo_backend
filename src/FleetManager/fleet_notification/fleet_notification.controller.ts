import { Controller, Get, Patch, Param, Request, UseGuards } from '@nestjs/common';
import { FmNotificationService } from './fleet_notification.service';
import { FMJwtBlacklistGuard } from '../Auth/guards/jwt.guard';

@Controller('fm/notifications')
export class FmNotificationController {
  constructor(private readonly notifService: FmNotificationService) {}

  @UseGuards(FMJwtBlacklistGuard)
  @Get()
  async getAll(@Request() req: any) {
    return this.notifService.getAllNotifications(req.user.fm_user_id);
  }

  @UseGuards(FMJwtBlacklistGuard)
  @Get(':id')
  async getById(@Param('id') id: number, @Request() req: any) {
    return this.notifService.getNotificationById(id, req.user.fm_user_id);
  }

  @UseGuards(FMJwtBlacklistGuard)
  @Patch(':id/read')
  async markRead(@Param('id') id: number, @Request() req: any) {
    return this.notifService.markAsRead(id, req.user.fm_user_id);
  }

  @UseGuards(FMJwtBlacklistGuard)
  @Patch('read-all')
  async markAllRead(@Request() req: any) {
    return this.notifService.markAllAsRead(req.user.fm_user_id);
  }
}