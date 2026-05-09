import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FleetManagersDocuments } from './FleetManagersDocuments';
import { Admin } from './Admin';
import { Subscriptions } from './Subscriptions';
export enum ApplicationStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum FleetManagerType {
  INDIVIDUAL = 'individual',
  SHOP = 'shop',
}

@Index('fleet_registration_applications_email_key', ['email'], { unique: true })
@Index('fleet_registration_applications_pkey', ['id'], { unique: true })
@Entity('fleet_registration_applications', { schema: 'public' })
export class FleetRegistrationApplications {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'business_name', length: 255 })
  businessName: string;

  @Column('character varying', { name: 'owner_first_name', length: 255 })
  ownerFirstName: string;

  @Column('character varying', { name: 'owner_last_name', length: 255 })
  ownerLastName: string;

  @Column('character varying', { name: 'email', unique: true, length: 255 })
  email: string;

  @Column('character varying', { name: 'contact', length: 20 })
  contact: string;

  @Column('character varying', { name: 'city', nullable: true, length: 50 })
  city: string | null;

  @Column('character varying', { name: 'state', nullable: true, length: 50 })
  state: string | null;

  @Column('character varying', {
    name: 'country',
    nullable: true,
    length: 50,
    default: () => "'Pakistan'",
  })
  country: string | null;

  @Column('character varying', { name: 'address', nullable: true, length: 255 })
  address: string | null;

  @Column('enum', {
    name: 'fleet_type',
    enum: ['individual', 'shop'],
    default: () => "'shop'",
  })
  fleetType: 'individual' | 'shop';

  @Column('character varying', { name: 'cnic', nullable: true, length: 255 })
  cnic: string | null;

  @Column('character varying', {
    name: 'reg_number',
    nullable: true,
    length: 255,
  })
  regNumber: string | null;

  @Column('character varying', {
    name: 'status',
    length: 20,
    default: () => "'pending'",
  })
  status: string;

  @Column('text', { name: 'rejection_reason', nullable: true })
  rejectionReason: string | null;

  @Column('timestamp without time zone', {
    name: 'reviewed_at',
    nullable: true,
  })
  reviewedAt: Date | null;

  @Column('timestamp without time zone', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @Column('timestamp without time zone', {
    name: 'updated_at',
    nullable: true,
    default: () => 'now()',
  })
  updatedAt: Date | null;

  @OneToMany(
    () => FleetManagersDocuments,
    (fleetManagersDocuments) => fleetManagersDocuments.application,
  )
  fleetManagersDocuments: FleetManagersDocuments[];

  @ManyToOne(() => Admin, (admin) => admin.fleetRegistrationApplications)
  @JoinColumn([{ name: 'reviewed_by', referencedColumnName: 'id' }])
  reviewedBy: Admin | null;

  @ManyToOne(
    () => Subscriptions,
    (subscriptions) => subscriptions.fleetRegistrationApplications,
  )
  @JoinColumn([{ name: 'subscription_id', referencedColumnName: 'id' }])
  subscriptions: Subscriptions | null;
}
