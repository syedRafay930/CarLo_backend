import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { FleetManagerVehicles } from "./FleetManagerVehicles";

@Index("vehicle_dynamic_pricing_pkey", ["id"], { unique: true })
@Entity("vehicle_dynamic_pricing", { schema: "public" })
export class VehicleDynamicPricing {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("timestamp without time zone", { name: "start_date_time" })
  startDateTime: Date;

  @Column("timestamp without time zone", { name: "end_date_time" })
  endDateTime: Date;

  @Column("numeric", { name: "new_daily_rate", precision: 10, scale: 2 })
  newDailyRate: string;

  @Column("enum", {
    name: "reason",
    enum: [
      "demand_surge",
      "discount_promotion",
      "seasonal_peak",
      "manual_override",
    ],
  })
  reason:
    | "demand_surge"
    | "discount_promotion"
    | "seasonal_peak"
    | "manual_override";

  @Column("character varying", {
    name: "created_by_service",
    length: 50,
    default: () => "'AI_MODEL'",
  })
  createdByService: string;

  @Column("timestamp without time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @ManyToOne(
    () => FleetManagerVehicles,
    (fleetManagerVehicles) => fleetManagerVehicles.vehicleDynamicPricings,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "vehicle_id", referencedColumnName: "id" }])
  vehicle: FleetManagerVehicles;
}
