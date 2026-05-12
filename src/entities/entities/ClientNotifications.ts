import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Bookings } from "./Bookings";
import { FleetManagerUsers } from "./FleetManagerUsers";
import { Admin } from "./Admin";
import { Users } from "./Users";
@Index('client_notifications_pkey', ['id'], { unique: true })
@Entity('client_notifications', { schema: 'public' })
export class ClientNotifications {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('text', { name: 'title', nullable: true })
  title: string | null;

  @Column('text', { name: 'body', nullable: true })
  body: string | null;

  @Column('text', { name: 'noti_type', nullable: true })
  notiType: string | null;

  @Column('character varying', {
    name: 'redirect_url',
    nullable: true,
    length: 255,
  })
  redirectUrl: string | null;

  @Column('boolean', { name: 'is_read', default: () => 'false' })
  isRead: boolean;

  @Column('timestamp without time zone', { name: 'read_at', nullable: true })
  readAt: Date | null;

  @Column('timestamp without time zone', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @ManyToOne(() => Users, (user) => user.clientNotifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'receiver_id', referencedColumnName: 'id' }])
  receiver: Users;

  // Booking se link (e.g. booking approved/rejected)
  @ManyToOne(() => Bookings, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn([{ name: 'booking_id', referencedColumnName: 'id' }])
  booking: Bookings;

  // Fleet manager ne bheja (e.g. booking status update)
  @ManyToOne(() => FleetManagerUsers, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn([{ name: 'sender_fm_id', referencedColumnName: 'id' }])
  senderFleetManager: FleetManagerUsers;

  // Admin ne bheja (e.g. promo, announcement)
  @ManyToOne(() => Admin, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn([{ name: 'sender_admin_id', referencedColumnName: 'id' }])
  senderAdmin: Admin;
}