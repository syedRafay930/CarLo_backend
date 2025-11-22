import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { FleetManagerSubscriptions } from "./FleetManagerSubscriptions";

@Index("subscriptions_pkey", ["id"], { unique: true })
@Index("subscriptions_name_key", ["name"], { unique: true })
@Entity("subscriptions", { schema: "public" })
export class Subscriptions {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", { name: "name", unique: true, length: 100 })
  name: string;

  @Column("numeric", { name: "monthly_price", precision: 10, scale: 2 })
  monthlyPrice: string;

  @Column("text", { name: "description", nullable: true })
  description: string | null;

  @Column("integer", { name: "max_users", default: () => "1" })
  maxUsers: number;

  @Column("integer", { name: "max_vehicles", default: () => "1" })
  maxVehicles: number;

  @Column("boolean", { name: "is_priority_support", default: () => "false" })
  isPrioritySupport: boolean;

  @Column("boolean", { name: "allows_ai_verification", default: () => "false" })
  allowsAiVerification: boolean;

  @Column("boolean", { name: "is_active", default: () => "true" })
  isActive: boolean;

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
    (fleetManagerSubscriptions) => fleetManagerSubscriptions.subscription
  )
  fleetManagerSubscriptions: FleetManagerSubscriptions[];
}
