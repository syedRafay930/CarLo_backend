import { Controller } from '@nestjs/common';
import { ClientNotificationsService } from './client-notifications.service';
import {
  Get,
  Patch,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ClientJwtBlacklistGuard } from '../Auth/guards/jwt.guard';

@Controller('client/notifications')
@UseGuards(ClientJwtBlacklistGuard)
export class ClientNotificationsController {
  constructor(private readonly notifService: ClientNotificationsService) {}

  @Get()
  async getNotifications(
    @Req() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.notifService.getClientNotifications(
      req.user.client_id,
      +page,
      +limit,
    );
  }

  @Patch(':id/read')
  async markAsRead(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.notifService.markAsRead(id, req.user.client_id);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req) {
    return this.notifService.markAllAsRead(req.user.client_id);
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req) {
    return this.notifService.getUnreadCount(req.user.client_id);
  }
}
