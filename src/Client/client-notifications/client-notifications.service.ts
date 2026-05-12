import { Injectable } from '@nestjs/common';
import { ClientNotifications } from 'src/entities/entities/ClientNotifications';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class ClientNotificationsService {
  constructor(
    @InjectRepository(ClientNotifications)
    private readonly notifRepo: Repository<ClientNotifications>,
  ) {}

  async getClientNotifications(clientId: number, page: number, limit: number) {
    const [data, total] = await this.notifRepo.findAndCount({
      where: { receiver: { id: clientId } },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: [
        'id',
        'title',
        'body',
        'notiType',
        'redirectUrl',
        'isRead',
        'readAt',
        'createdAt',
      ],
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(notifId: number, clientId: number) {
    const notif = await this.notifRepo.findOne({
      where: { id: notifId, receiver: { id: clientId } },
    });

    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.isRead) return { message: 'Already read' };

    notif.isRead = true;
    notif.readAt = new Date();
    await this.notifRepo.save(notif);

    return { message: 'Marked as read' };
  }

  async markAllAsRead(clientId: number) {
    await this.notifRepo.update(
      { receiver: { id: clientId }, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(clientId: number) {
    const count = await this.notifRepo.count({
      where: { receiver: { id: clientId }, isRead: false },
    });

    return { unreadCount: count };
  }
}
