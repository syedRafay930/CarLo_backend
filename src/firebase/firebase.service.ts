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
import { FleetManagerNotifications } from 'src/entities/entities/FleetManagerNotifications';
import { ClientFcmTokens } from 'src/entities/entities/ClientFcmTokens';
import { ClientNotifications } from 'src/entities/entities/ClientNotifications';

@Injectable()
export class FirebaseService {
  constructor(
    @InjectRepository(AdminFcmTokens)
    private readonly adminfcmRepo: Repository<AdminFcmTokens>,

    @InjectRepository(FleetFcmTokens)
    private readonly fleetfcmRepo: Repository<FleetFcmTokens>,

    @InjectRepository(AdminNotifications)
    private readonly adminnotificationRepo: Repository<AdminNotifications>,

    @InjectRepository(FleetManagerNotifications)
    private readonly fmNotifRepo: Repository<FleetManagerNotifications>,

    @InjectRepository(ClientFcmTokens)
    private readonly clientFcmRepo: Repository<ClientFcmTokens>,

    @InjectRepository(ClientNotifications)
    private readonly clientNotifRepo: Repository<ClientNotifications>,

    private readonly userService: UsersService,
  ) {}

  async saveAdminFcmToken(dto: SaveFcmTokenDto) {
    const existing = await this.adminfcmRepo.findOne({
      where: { token: dto.token },
      relations: ['admin'],
    });

    if (existing) {
      existing.admin = { id: dto.user_id } as any;
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
      relations: ['fleetUser'],
    });

    if (existing) {
      existing.fleetUser = { id: dto.user_id } as any;
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

  async saveClientFcmToken(dto: SaveFcmTokenDto) {
    const existing = await this.clientFcmRepo.findOne({
      where: { token: dto.token },
      relations: ['clientUser'],
    });

    if (existing) {
      existing.clientUser = { id: dto.user_id } as any;
      existing.platform = dto.platform as 'web' | 'android' | 'ios';
      existing.isActive = true;
      existing.updatedAt = new Date();
      return await this.clientFcmRepo.save(existing);
    }

    const saved = this.clientFcmRepo.create({
      clientUser: { id: dto.user_id },
      token: dto.token,
      platform: dto.platform as 'web' | 'android' | 'ios',
      isActive: true,
      createdAt: new Date(),
    });

    return await this.clientFcmRepo.save(saved);
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

  async getTokensOfFleetAdmin(): Promise<
    { token: string; fleet_user_id: number }[]
  > {
    const tokens = await this.fleetfcmRepo
      .createQueryBuilder('token')
      .innerJoin('token.fleetUser', 'fleetUser')
      .where('fleetUser.fmUsersRole.id = :roleId', { roleId: 10 })
      .select(['token.token', 'token.fleet_user_id'])
      .getRawMany();

    console.log('Fleet Admin Tokens:', tokens); // Debug log

    return tokens.map((t) => ({
      token: t.token_token,
      fleet_user_id: t.token_fleet_user_id,
    }));
  }

  async saveAndSendNotificationToAdmins(dto: {
    title: string;
    body: string;
    request_id?: number;
    application_id?: number;
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
        application: dto.application_id ? { id: dto.application_id } : null,
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

  async saveAndSendNotificationToFM(dto: {
    title: string;
    body: string;
    receiver_id: number;
    request_id?: number;
    vehicle_id?: number;
    booking_id?: number;
    sender_admin_id?: number;
    sender_client_id?: number;
    type?: string;
    redirect_url?: string;
  }) {
    // 1. Notification save karo
    const notif = this.fmNotifRepo.create({
      title: dto.title,
      body: dto.body,
      notiType: dto.type || 'system',
      redirectUrl: dto.redirect_url || null,
      isRead: false,
      receiver: { id: dto.receiver_id },
      senderAdmin: dto.sender_admin_id ? { id: dto.sender_admin_id } : null,
      senderClient: dto.sender_client_id ? { id: dto.sender_client_id } : null,
      request: dto.request_id ? { id: dto.request_id } : null,
      vehicle: dto.vehicle_id ? { id: dto.vehicle_id } : null,
      booking: dto.booking_id ? { id: dto.booking_id } : null,
      createdAt: new Date(),
    } as FleetManagerNotifications);

    const saved = await this.fmNotifRepo.save(notif);

    // 2. FCM initialized check
    if (admin.apps.length === 0) {
      console.warn('[Firebase] FCM skipped — Firebase Admin not initialized');
      return { success: true, message: 'FCM disabled (no service account)' };
    }

    // 3. FM user k tokens fetch karo
    const tokens = await this.fleetfcmRepo.find({
      where: { fleetUser: { id: dto.receiver_id }, isActive: true },
    });

    if (!tokens.length) {
      console.log('No FCM tokens for FM user:', dto.receiver_id);
      return { success: true, message: 'Notification saved, no FCM tokens' };
    }

    // 4. Push bhejo
    let successCount = 0;
    let failureCount = 0;

    const dataPayload: Record<string, string> = {
      id: saved.id?.toString() || '',
      title: dto.title,
      body: dto.body,
      type: dto.type || 'system',
      request_id: dto.request_id?.toString() || '',
      vehicle_id: dto.vehicle_id?.toString() || '',
      booking_id: dto.booking_id?.toString() || '',
      redirect_url: dto.redirect_url || '',
    };

    for (const t of tokens) {
      try {
        await admin.messaging().send({
          token: t.token,
          notification: { title: dto.title, body: dto.body },
          data: dataPayload,
        });
        successCount++;
      } catch (error) {
        console.error('FCM Error for FM token', t.token, error);
        failureCount++;
      }
    }

    return {
      success: true,
      successCount,
      failureCount,
      totalNotified: tokens.length,
    };
  }

  async saveAndSendNotificationToClient(dto: {
    title: string;
    body: string;
    receiver_id: number;
    booking_id?: number;
    sender_fm_id?: number;
    sender_admin_id?: number;
    type?: string;
    redirect_url?: string;
  }) {
    // 1. Notification save karo
    const notif = this.clientNotifRepo.create({
      title: dto.title,
      body: dto.body,
      notiType: dto.type || 'system',
      redirectUrl: dto.redirect_url || null,
      isRead: false,
      receiver: { id: dto.receiver_id },
      booking: dto.booking_id ? { id: dto.booking_id } : null,
      senderFleetManager: dto.sender_fm_id ? { id: dto.sender_fm_id } : null,
      senderAdmin: dto.sender_admin_id ? { id: dto.sender_admin_id } : null,
      createdAt: new Date(),
    } as ClientNotifications);

    const saved = await this.clientNotifRepo.save(notif);

    // 2. FCM initialized check
    if (admin.apps.length === 0) {
      console.warn('[Firebase] FCM skipped — Firebase Admin not initialized');
      return { success: true, message: 'FCM disabled (no service account)' };
    }

    // 3. Client k tokens fetch karo
    const tokens = await this.clientFcmRepo.find({
      where: { clientUser: { id: dto.receiver_id }, isActive: true },
    });

    if (!tokens.length) {
      console.log('No FCM tokens for client:', dto.receiver_id);
      return { success: true, message: 'Notification saved, no FCM tokens' };
    }

    // 4. Push bhejo
    let successCount = 0;
    let failureCount = 0;

    const dataPayload: Record<string, string> = {
      id: saved.id?.toString() || '',
      title: dto.title,
      body: dto.body,
      type: dto.type || 'system',
      booking_id: dto.booking_id?.toString() || '',
      redirect_url: dto.redirect_url || '',
    };

    for (const t of tokens) {
      try {
        await admin.messaging().send({
          token: t.token,
          notification: { title: dto.title, body: dto.body },
          data: dataPayload,
        });
        successCount++;
      } catch (error) {
        console.error('FCM Error for client token', t.token, error);
        failureCount++;
      }
    }

    return {
      success: true,
      successCount,
      failureCount,
      totalNotified: tokens.length,
    };
  }
}
