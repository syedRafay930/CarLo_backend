import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FleetManagerUsers } from './FleetManagerUsers';
import { Requests } from './Requests';
import { Admin } from './Admin';

@Index('fleet_notifications_pkey', ['id'], { unique: true })
@Entity('fleet_notifications', { schema: 'public' })
export class FleetNotifications {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('text', { name: 'title', nullable: true })
  title: string | null;

  @Column('text', { name: 'body', nullable: true })
  body: string | null;

  @Column('boolean', { name: 'is_read', default: () => 'false' })
  isRead: boolean;

  @Column('timestamp without time zone', { name: 'read_at', nullable: true })
  readAt: Date | null;

  @Column('timestamp without time zone', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @Column('character varying', {
    name: 'redirect_url',
    nullable: true,
    length: 255,
  })
  redirectUrl: string | null;

  @Column('text', { name: 'type', nullable: true })
  type: string | null;

  @ManyToOne(
    () => FleetManagerUsers,
    (fleetManagerUsers) => fleetManagerUsers.fleetNotifications,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn([{ name: 'receiver_id', referencedColumnName: 'id' }])
  receiver: FleetManagerUsers;

  @ManyToOne(() => Requests, (requests) => requests.fleetNotifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'request_id', referencedColumnName: 'id' }])
  request: Requests;

  @ManyToOne(() => Admin, (admin) => admin.fleetNotifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'sender_id', referencedColumnName: 'id' }])
  sender: Admin;
}
