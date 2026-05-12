import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Users } from './Users';

@Index('client_fcm_tokens_pkey', ['id'], { unique: true })
@Index('user_fcm_tokens_token_key', ['token'], { unique: true })
@Entity('client_fcm_tokens', { schema: 'public' })
export class ClientFcmTokens {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('integer', { name: 'client_user_id' })
  clientUserId: number;

  @Column('text', { name: 'token', unique: true })
  token: string;

  @Column('character varying', {
    name: 'platform',
    nullable: true,
    length: 20,
  })
  platform: 'web' | 'android' | 'ios' | null;

  @Column('boolean', { name: 'is_active', default: () => 'true' })
  isActive: boolean;

  @Column('timestamp without time zone', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @Column('timestamp without time zone', {
    name: 'updated_at',
    default: () => 'now()',
  })
  updatedAt: Date;

  @ManyToOne(() => Users, (user) => user.clientFcmTokens, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'client_user_id', referencedColumnName: 'id' }])
  clientUser: Users;
}