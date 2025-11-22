import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { FleetManagers } from "./FleetManagers";
import { Subscriptions } from "./Subscriptions";

@Index("fleet_manager_subscriptions_pkey", ["id"], { unique: true })
@Entity("fleet_manager_subscriptions", { schema: "public" })
export class FleetManagerSubscriptions {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("date", { name: "start_date" })
  startDate: string;

  @Column("date", { name: "end_date" })
  endDate: string;

  @Column("character varying", { name: "month", nullable: true, length: 20 })
  month: string | null;

  @Column("numeric", { name: "amount_paid", precision: 10, scale: 2 })
  amountPaid: string;

  @Column("enum", {
    name: "payment_status",
    enum: ["pending", "paid", "failed", "refunded"],
    default: () => "'pending'",
  })
  paymentStatus: "pending" | "paid" | "failed" | "refunded";

  @Column("character varying", {
    name: "payment_reference_id",
    nullable: true,
    length: 255,
  })
  paymentReferenceId: string | null;

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

  @ManyToOne(
    () => FleetManagers,
    (fleetManagers) => fleetManagers.fleetManagerSubscriptions,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "fleet_manager_id", referencedColumnName: "id" }])
  fleetManager: FleetManagers;

  @ManyToOne(
    () => Subscriptions,
    (subscriptions) => subscriptions.fleetManagerSubscriptions,
    { onDelete: "RESTRICT" }
  )
  @JoinColumn([{ name: "subscription_id", referencedColumnName: "id" }])
  subscription: Subscriptions;
}
