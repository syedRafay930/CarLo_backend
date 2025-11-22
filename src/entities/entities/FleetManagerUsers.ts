import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { FleetManagers } from "./FleetManagers";
import { FleetManagerUsersRole } from "./FleetManagerUsersRole";

@Index("fleet_manager_users_pkey", ["id"], { unique: true })
@Entity("fleet_manager_users", { schema: "public" })
export class FleetManagerUsers {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", {
    name: "first_name",
    nullable: true,
    length: 255,
  })
  firstName: string | null;

  @Column("character varying", {
    name: "last_name",
    nullable: true,
    length: 255,
  })
  lastName: string | null;

  @Column("character varying", { name: "contact", nullable: true, length: 20 })
  contact: string | null;

  @Column("character varying", { name: "cnic", nullable: true, length: 20 })
  cnic: string | null;

  @Column("date", { name: "dob", nullable: true })
  dob: string | null;

  @Column("character varying", { name: "email", nullable: true, length: 255 })
  email: string | null;

  @Column("character varying", {
    name: "password",
    nullable: true,
    length: 255,
  })
  password: string | null;

  @Column("boolean", { name: "is_delete", default: () => "false" })
  isDelete: boolean;

  @Column("boolean", { name: "is_active", default: () => "false" })
  isActive: boolean;

  @Column("timestamp without time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @Column("timestamp without time zone", { name: "invited_at", nullable: true })
  invitedAt: Date | null;

  @Column("boolean", {
    name: "is_firstlogin",
    nullable: true,
    default: () => "true",
  })
  isFirstlogin: boolean | null;

  @ManyToOne(
    () => FleetManagers,
    (fleetManagers) => fleetManagers.fleetManagerUsers,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "fleet_manager_id", referencedColumnName: "id" }])
  fleetManager: FleetManagers;

  @ManyToOne(
    () => FleetManagerUsersRole,
    (fleetManagerUsersRole) => fleetManagerUsersRole.fleetManagerUsers,
    { onDelete: "RESTRICT" }
  )
  @JoinColumn([{ name: "fm_users_role_id", referencedColumnName: "id" }])
  fmUsersRole: FleetManagerUsersRole;
}
