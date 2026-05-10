import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AdminNotifications } from './AdminNotifications';
import { FleetNotifications } from './FleetNotifications';
import { Admin } from './Admin';
import { FleetManagers } from './FleetManagers';
import { FleetManagerUsers } from './FleetManagerUsers';
import { Subscriptions } from './Subscriptions';
import { FleetManagerVehicles } from './FleetManagerVehicles';

@Index('requests_pkey', ['id'], { unique: true })
@Index('requests_request_hash_key', ['requestHash'], { unique: true })
@Entity('requests', { schema: 'public' })
export class Requests {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('enum', {
    name: 'request_type',
    enum: [
      'vehicle_approval',
      'shop_registration',
      'subscription_change',
      'general_inquiry',
      'delete_vehicle',
      'change_vehicle',
      'other',
    ],
  })
  requestType:
    | 'vehicle_approval'
    | 'shop_registration'
    | 'subscription_change'
    | 'general_inquiry'
    | 'delete_vehicle'
    | 'change_vehicle'
    | 'other';

  @Column('enum', {
    name: 'request_status',
    enum: ['pending', 'approved', 'rejected', 'in_progress'],
    default: () => "'pending'",
  })
  requestStatus: 'pending' | 'approved' | 'rejected' | 'in_progress';

  @Column('character varying', { name: 'title', length: 255 })
  title: string;

  @Column('text', { name: 'description', nullable: true })
  description: string | null;

  @Column('text', { name: 'admin_notes', nullable: true })
  adminNotes: string | null;

  @Column('text', { name: 'request_hash', nullable: true, unique: true })
  requestHash: string | null;

  @Column('timestamp without time zone', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @Column('timestamp without time zone', { name: 'updated_at', nullable: true })
  updatedAt: Date | null;

  @Column('timestamp without time zone', {
    name: 'responeded_at',
    nullable: true,
  })
  responededAt: Date | null;

  @OneToMany(
    () => AdminNotifications,
    (adminNotifications) => adminNotifications.request,
  )
  adminNotifications: AdminNotifications[];

  @OneToMany(
    () => FleetNotifications,
    (fleetNotifications) => fleetNotifications.request,
  )
  fleetNotifications: FleetNotifications[];

  @ManyToOne(() => Admin, (admin) => admin.requests)
  @JoinColumn([{ name: 'admin_responded_by', referencedColumnName: 'id' }])
  adminRespondedBy: Admin;

  @ManyToOne(() => FleetManagers, (fleetManagers) => fleetManagers.requests)
  @JoinColumn([{ name: 'fleet_id', referencedColumnName: 'id' }])
  fleet: FleetManagers;

  @ManyToOne(
    () => FleetManagerUsers,
    (fleetManagerUsers) => fleetManagerUsers.requests,
  )
  @JoinColumn([{ name: 'fleet_user_id', referencedColumnName: 'id' }])
  fleetUser: FleetManagerUsers;

  @ManyToOne(() => Subscriptions, (subscriptions) => subscriptions.requests)
  @JoinColumn([{ name: 'subscription_id', referencedColumnName: 'id' }])
  subscription: Subscriptions;

  @ManyToOne(
    () => FleetManagerVehicles,
    (fleetManagerVehicles) => fleetManagerVehicles.requests,
  )
  @JoinColumn([{ name: 'vehicle_id', referencedColumnName: 'id' }])
  vehicle: FleetManagerVehicles;
}
