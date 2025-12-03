import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { FleetManagers } from "./FleetManagers";
import { Users } from "./Users";
import { FleetManagerVehicles } from "./FleetManagerVehicles";

@Index("bookings_booking_code_key", ["bookingCode"], { unique: true })
@Index("bookings_pkey", ["id"], { unique: true })
@Entity("bookings", { schema: "public" })
export class Bookings {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", {
    name: "booking_code",
    unique: true,
    length: 20,
  })
  bookingCode: string;

  @Column("timestamp without time zone", { name: "pickup_date" })
  pickupDate: Date;

  @Column("timestamp without time zone", { name: "return_date" })
  returnDate: Date;

  @Column("character varying", { name: "pickup_location", length: 255 })
  pickupLocation: string;

  @Column("character varying", { name: "return_location", length: 255 })
  returnLocation: string;

  @Column("enum", { name: "service_type", enum: ["self_drive", "with_driver"] })
  serviceType: "self_drive" | "with_driver";

  @Column("enum", {
    name: "price_model",
    enum: ["per_day", "per_km", "per_hr"],
  })
  priceModel: "per_day" | "per_km" | "per_hr";

  @Column("integer", { name: "total_days", nullable: true, default: () => "0" })
  totalDays: number | null;

  @Column("integer", {
    name: "total_hours",
    nullable: true,
    default: () => "0",
  })
  totalHours: number | null;

  @Column("numeric", {
    name: "base_rate_per_day_or_hour",
    precision: 10,
    scale: 2,
  })
  baseRatePerDayOrHour: number | null;

  @Column("numeric", {
    name: "driver_rate_per_hour",
    nullable: true,
    precision: 10,
    scale: 2,
    default: () => "0.00",
  })
  driverRatePerHour: number | null;

  @Column("integer", {
    name: "driver_hours_per_day",
    nullable: true,
    default: () => "0",
  })
  driverHoursPerDay: number | null;

  @Column("numeric", { name: "initial_total_charge", precision: 10, scale: 2 })
  initialTotalCharge: string;

  @Column("numeric", {
    name: "extra_charges_applied",
    nullable: true,
    precision: 10,
    scale: 2,
    default: () => "0.00",
  })
  extraChargesApplied: string | null;

  @Column("numeric", {
    name: "final_amount_settled",
    nullable: true,
    precision: 10,
    scale: 2,
    default: () => "0.00",
  })
  finalAmountSettled: string | null;

  @Column("enum", {
    name: "status",
    enum: [
      "pending",
      "confirmed",
      "rejected",
      "cancelled",
      "in_progress",
      "completed",
      "overdue",
    ],
    default: () => "'pending'",
  })
  status:
    | "pending"
    | "confirmed"
    | "rejected"
    | "cancelled"
    | "in_progress"
    | "completed"
    | "overdue";

  @Column("timestamp without time zone", {
    name: "actual_return_date",
    nullable: true,
  })
  actualReturnDate: Date | null;

  @Column("integer", { name: "total_km_travelled", nullable: true })
  totalKmTravelled: number | null;

  @Column("timestamp without time zone", {
    name: "fm_response_at",
    nullable: true,
  })
  fmResponseAt: Date | null;

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

  @ManyToOne(() => FleetManagers, (fleetManagers) => fleetManagers.bookings)
  @JoinColumn([{ name: "fleet_manager_id", referencedColumnName: "id" }])
  fleetManager: FleetManagers;

  @ManyToOne(() => Users, (users) => users.bookings)
  @JoinColumn([{ name: "user_id", referencedColumnName: "id" }])
  user: Users;

  @ManyToOne(
    () => FleetManagerVehicles,
    (fleetManagerVehicles) => fleetManagerVehicles.bookings
  )
  @JoinColumn([{ name: "vehicle_id", referencedColumnName: "id" }])
  vehicle: FleetManagerVehicles;
}
