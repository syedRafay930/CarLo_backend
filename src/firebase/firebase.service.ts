import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as admin from 'firebase-admin';
import { AdminFcmTokens } from 'src/entities/entities/AdminFcmTokens';
import { FleetFcmTokens } from 'src/entities/entities/FleetFcmTokens';
import { AdminNotifications } from 'src/entities/entities/AdminNotifications';

import { SaveFcmTokenDto } from './dto/save-fcm-token.dto';

import { UsersService } from 'src/Admin/User/user.service';
@Injectable()
export class FirebaseService {
  constructor(
    @InjectRepository(AdminFcmTokens)
    private readonly adminfcmRepo: Repository<AdminFcmTokens>,

    @InjectRepository(FleetFcmTokens)
    private readonly fleetfcmRepo: Repository<FleetFcmTokens>,

    @InjectRepository(AdminNotifications)
    private readonly adminnotificationRepo: Repository<AdminNotifications>,

    private readonly userService: UsersService,
  ) {}

  async saveAdminFcmToken(dto: SaveFcmTokenDto) {
    const existing = await this.adminfcmRepo.findOne({
      where: { token: dto.token },
    });

    if (existing) {
      existing.admin.id = dto.user_id;
      existing.platform = dto.platform as 'web' | 'android' | 'ios';
      existing.isActive = true;
      existing.updatedAt = new Date();
      return await this.adminfcmRepo.save(existing);
    }

    const saved = this.adminfcmRepo.create({
      admin: { id: dto.user_id },
      token: dto.token,
      platform: dto.platform as 'web' | 'android' | 'ios',
      isActive: true,
      createdAt: new Date(),
    });

    return await this.adminfcmRepo.save(saved);
  }

  async saveFleetFcmToken(dto: SaveFcmTokenDto) {
    const existing = await this.fleetfcmRepo.findOne({
      where: { token: dto.token },
    });

    if (existing) {
      existing.fleetUser.id = dto.user_id;
      existing.platform = dto.platform as 'web' | 'android' | 'ios';
      existing.isActive = true;
      existing.updatedAt = new Date();
      return await this.fleetfcmRepo.save(existing);
    }

    const saved = this.fleetfcmRepo.create({
      fleetUser: { id: dto.user_id },
      token: dto.token,
      platform: dto.platform as 'web' | 'android' | 'ios',
      isActive: true,
      createdAt: new Date(),
    });

    return await this.fleetfcmRepo.save(saved);
  }

  async deleteAdminFcmToken(
    admin_id: number,
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.adminfcmRepo.findOne({
      where: { admin: { id: admin_id } },
    });
    if (!existing) {
      return { success: false, message: 'Token not found' };
    }
    await this.adminfcmRepo.remove(existing);
    return { success: true, message: 'Token deleted successfully' };
  }

  async deleteFleetFcmToken(
    admin_id: number,
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.fleetfcmRepo.findOne({
      where: { fleetUser: { id: admin_id } },
    });
    if (!existing) {
      return { success: false, message: 'Token not found' };
    }
    await this.fleetfcmRepo.remove(existing);
    return { success: true, message: 'Token deleted successfully' };
  }

  async getTokensOfAdmin(): Promise<{ token: string; admin_id: number }[]> {
    const tokens = await this.adminfcmRepo
      .createQueryBuilder('token')
      .innerJoin('token.admin', 'admin')
      .where('admin.role.id = :roleId', { roleId: 1 })
      .select(['token.token', 'token.admin_id'])
      .getRawMany();

    return tokens.map((t) => ({
      token: t.token_token,
      admin_id: t.token_admin_id,
    }));
  }

  async saveAndSendNotificationToAdmins(dto: {
    title: string;
    body: string;
    request_id?: number;
    sender_id?: number;
    type?: string;
    redirect_url?: string;
  }) {
    const allAdmins: number[] = await this.userService.getAdminIds();

    // 1. Notification Entities Create
    const notificationEntities = allAdmins.map((adminId) => {
      return this.adminnotificationRepo.create({
        title: dto.title,
        body: dto.body,
        notiType: dto.type || 'system',
        redirectUrl: dto.redirect_url || null,
        isRead: false,
        receiver: { id: adminId },
        sender: dto.sender_id ? { id: dto.sender_id } : null,
        request: dto.request_id ? { id: dto.request_id } : null,
        createdAt: new Date(),
      } as AdminNotifications);
    });
    const savedNotifications =
      await this.adminnotificationRepo.save(notificationEntities);

    // 2. Mapping: Saved Notification IDs
    const notificationMap = new Map<number, number>();
    for (const noti of savedNotifications) {
      const adminId = (noti.receiver as any)?.id;

      if (adminId && noti.id) {
        notificationMap.set(adminId, noti.id);
      }
    }
    const loggedInAdminsWithTokens = await this.getTokensOfAdmin();

    if (loggedInAdminsWithTokens.length === 0) {
      console.log('No logged-in admins to notify');
      return { success: true, message: 'No tokens to send' };
    }

    if (admin.apps.length === 0) {
      console.warn('[Firebase] FCM skipped — Firebase Admin not initialized');
      return { success: true, message: 'FCM disabled (no service account)' };
    }

    // 3. Push Notification
    let successCount = 0;
    let failureCount = 0;

    for (const t of loggedInAdminsWithTokens) {
      const notification_id = notificationMap.get(t.admin_id);

      const dataPayload: Record<string, string> = {
        id: notification_id?.toString() || '',
        title: dto.title,
        body: dto.body,
        request_id: dto.request_id?.toString() || '',
        type: dto.type || 'system',
        redirect_url: dto.redirect_url || '',
      };

      try {
        await admin.messaging().send({
          token: t.token,
          notification: { title: dto.title, body: dto.body },
          data: dataPayload,
        });
        successCount++;
      } catch (error) {
        console.error('FCM Error for token', t.token, error);
        failureCount++;
      }
    }

    return {
      success: true,
      successCount,
      failureCount,
      totalNotified: loggedInAdminsWithTokens.length,
    };
  }
}
