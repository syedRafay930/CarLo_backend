import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FleetManagers } from './FleetManagers';
import { FmRelationModule } from './FmRelationModule';
import { FleetManagerUsersRole } from './FleetManagerUsersRole';

@Index('fm_role_permissions_pkey', ['id'], { unique: true })
@Index('uq_relation_roles', ['relationId', 'roleId'], { unique: true })
@Entity('fm_role_permissions', { schema: 'public' })
export class FmRolePermissions {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('integer', { name: 'relation_id', nullable: true, unique: true })
  relationId: number | null;

  @Column('integer', { name: 'role_id', nullable: true, unique: true })
  roleId: number | null;

  @Column('boolean', { name: 'is_enable', default: () => 'false' })
  isEnable: boolean;

  @ManyToOne(
    () => FleetManagers,
    (fleetManagers) => fleetManagers.fmRolePermissions,
  )
  @JoinColumn([{ name: 'fleet_id', referencedColumnName: 'id' }])
  fleet: FleetManagers;

  @ManyToOne(
    () => FmRelationModule,
    (fmRelationModule) => fmRelationModule.fmRolePermissions,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn([{ name: 'relation_id', referencedColumnName: 'id' }])
  relation: FmRelationModule;

  @ManyToOne(
    () => FleetManagerUsersRole,
    (fleetManagerUsersRole) => fleetManagerUsersRole.fmRolePermissions,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn([{ name: 'role_id', referencedColumnName: 'id' }])
  role: FleetManagerUsersRole;
}
