import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FleetManagerNotifications } from 'src/entities/entities/FleetManagerNotifications';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class FmNotificationService {
  constructor(
    @InjectRepository(FleetManagerNotifications)
    private readonly notifRepo: Repository<FleetManagerNotifications>,
    private readonly firebaseService: FirebaseService,
  ) {}

  async getAllNotifications(fmUserId: number) {
    const notifications = await this.notifRepo.find({
      where: { receiver: { id: fmUserId } },
      relations: ['senderAdmin', 'senderClient', 'request', 'vehicle', 'booking'],
      select: {
        id: true,
        title: true,
        body: true,
        isRead: true,
        createdAt: true,
        notiType: true,
        redirectUrl: true,
        senderAdmin: { id: true, firstName: true, lastName: true },
        senderClient: { id: true, firstName: true, lastName: true, email: true },
        request: { id: true, requestType: true, requestStatus: true },
        vehicle: { id: true, make: true, model: true, year: true, licensePlate: true },
        booking: { id: true },
      },
      order: { createdAt: 'DESC' },
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;
    return { notifications, unreadCount };
  }

  async getNotificationById(notifId: number, fmUserId: number) {
    const notif = await this.notifRepo.findOne({
      where: { id: notifId, receiver: { id: fmUserId } },
      relations: ['senderAdmin', 'senderClient', 'request', 'vehicle', 'booking'],
    });

    if (!notif) throw new NotFoundException('Notification not found');

    if (!notif.isRead) {
      await this.notifRepo.update(notifId, {
        isRead: true,
        readAt: new Date(),
      });
      notif.isRead = true;
      notif.readAt = new Date();
    }

    return notif;
  }

  async markAsRead(notifId: number, fmUserId: number) {
    const notif = await this.notifRepo.findOne({
      where: { id: notifId, receiver: { id: fmUserId } },
    });
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.isRead) return { message: 'Already read' };

    await this.notifRepo.update(notifId, { isRead: true, readAt: new Date() });
    return { message: 'Marked as read' };
  }

  async markAllAsRead(fmUserId: number) {
    await this.notifRepo.update(
      { receiver: { id: fmUserId }, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return { message: 'All notifications marked as read' };
  }

  // Ye method firebase service ya koi bhi service call karegi notification bhejne k liye
  async createNotification(dto: {
    title: string;
    body: string;
    notiType: string;
    receiverId: number;
    redirectUrl?: string;
    senderAdminId?: number;
    senderClientId?: number;
    requestId?: number;
    vehicleId?: number;
    bookingId?: number;
  }) {
    const notif = this.notifRepo.create({
      title: dto.title,
      body: dto.body,
      notiType: dto.notiType,
      redirectUrl: dto.redirectUrl ?? null,
      receiver: { id: dto.receiverId },
      senderAdmin: dto.senderAdminId ? { id: dto.senderAdminId } : undefined,
      senderClient: dto.senderClientId ? { id: dto.senderClientId } : undefined,
      request: dto.requestId ? { id: dto.requestId } : undefined,
      vehicle: dto.vehicleId ? { id: dto.vehicleId } : undefined,
      booking: dto.bookingId ? { id: dto.bookingId } : undefined,
    });

    return await this.notifRepo.save(notif);
  }
}