import {
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Patch,
  Param,
  Request,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { AdminNotificationService } from './notification.service';
import { JwtBlacklistGuard } from '../Auth/guards/jwt.guard';


@Controller('admin/notifications')
export class AdminNotificationController {
  constructor(private readonly notificationService: AdminNotificationService) {}

  @UseGuards(JwtBlacklistGuard)
  @Get()
  async getAll(@Request() req: any) {
    return this.notificationService.getAllNotifications(req.user.admin_id);
  }

  @UseGuards(JwtBlacklistGuard)
  @Get(':id')
  async getById(@Param('id') id: number, @Request() req: any) {
    return this.notificationService.getNotificationById(id, req.user.admin_id);
  }

  @UseGuards(JwtBlacklistGuard)
  @Patch(':id/read')
  async markRead(@Param('id') id: number, @Request() req: any) {
    return this.notificationService.markAsRead(id, req.user.admin_id);
  }

  @UseGuards(JwtBlacklistGuard)
  @Patch('read-all')
  async markAllRead(@Request() req: any) {
    return this.notificationService.markAllAsRead(req.user.admin_id);
  }

  @UseGuards(JwtBlacklistGuard)
  @Post('applications/:id/approve')
  async approve(@Param('id') id: number, @Request() req: any) {
    return this.notificationService.approveApplication(id, req.user.admin_id);
  }

  @UseGuards(JwtBlacklistGuard)
  @Post('applications/:id/reject')
  async reject(
    @Param('id') id: number,
    @Body() body: { rejection_reason: string },
    @Request() req: any,
  ) {
    if (!body.rejection_reason?.trim()) {
      throw new BadRequestException('rejection_reason is required');
    }
    return this.notificationService.rejectApplication(
      id,
      req.user.admin_id,
      body.rejection_reason,
    );
  }

  @UseGuards(JwtBlacklistGuard)
  @Patch('applications/:id/under-review')
  async underReview(@Param('id') id: number, @Request() req: any) {
    return this.notificationService.markUnderReview(id, req.user.admin_id);
  }
}
