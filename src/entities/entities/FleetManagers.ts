import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { FleetManagerSubscriptions } from "./FleetManagerSubscriptions";
import { FleetManagerUsers } from "./FleetManagerUsers";
import { FleetManagerUsersRole } from "./FleetManagerUsersRole";
import { FleetManagerVehicles } from "./FleetManagerVehicles";
import { Admin } from "./Admin";
import { FleetManagersDocuments } from "./FleetManagersDocuments";

@Index("fleet_managers_pkey", ["id"], { unique: true })
@Entity("fleet_managers", { schema: "public" })
export class FleetManagers {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", { name: "name", length: 255 })
  name: string;

  @Column("enum", {
    name: "type",
    enum: ["individual", "shop"],
    default: () => "'shop'",
  })
  type: "individual" | "shop";

  @Column("character varying", { name: "contact", nullable: true, length: 20 })
  contact: string | null;

  @Column("character varying", { name: "email", nullable: true, length: 50 })
  email: string | null;

  @Column("character varying", { name: "address", nullable: true, length: 255 })
  address: string | null;

  @Column("character varying", { name: "state", nullable: true, length: 50 })
  state: string | null;

  @Column("character varying", { name: "city", nullable: true, length: 50 })
  city: string | null;

  @Column("character varying", { name: "country", nullable: true, length: 50 })
  country: string | null;

  @Column("boolean", { name: "is_active", nullable: true })
  isActive: boolean | null;

  @Column("boolean", { name: "is_delete", nullable: true })
  isDelete: boolean | null;

  @Column("character varying", {
    name: "reg_number",
    nullable: true,
    length: 50,
  })
  regNumber: string | null;

  @Column("integer", { name: "subscription_id", nullable: true })
  subscriptionId: number | null;

  @Column("timestamp without time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @Column("timestamp without time zone", {
    name: "updated_at",
    default: () => "now()",
  })
  updatedAt: Date;

  @OneToMany(
    () => FleetManagerSubscriptions,
    (fleetManagerSubscriptions) => fleetManagerSubscriptions.fleetManager
  )
  fleetManagerSubscriptions: FleetManagerSubscriptions[];

  @OneToMany(
    () => FleetManagerUsers,
    (fleetManagerUsers) => fleetManagerUsers.fleetManager
  )
  fleetManagerUsers: FleetManagerUsers[];

  @OneToMany(
    () => FleetManagerUsersRole,
    (fleetManagerUsersRole) => fleetManagerUsersRole.fleetManager
  )
  fleetManagerUsersRoles: FleetManagerUsersRole[];

  @OneToMany(
    () => FleetManagerVehicles,
    (fleetManagerVehicles) => fleetManagerVehicles.fleetManager
  )
  fleetManagerVehicles: FleetManagerVehicles[];

  @ManyToOne(() => Admin, (admin) => admin.fleetManagers)
  @JoinColumn([{ name: "created_by", referencedColumnName: "id" }])
  createdBy: Admin;

  @ManyToOne(() => Admin, (admin) => admin.fleetManagers2)
  @JoinColumn([{ name: "updated_by", referencedColumnName: "id" }])
  updatedBy: Admin;

  @OneToMany(
    () => FleetManagersDocuments,
    (fleetManagersDocuments) => fleetManagersDocuments.fleetManager
  )
  fleetManagersDocuments: FleetManagersDocuments[];
}
