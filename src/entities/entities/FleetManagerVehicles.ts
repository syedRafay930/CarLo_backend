import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { FleetManagerVehicleDocuments } from "./FleetManagerVehicleDocuments";
import { Admin } from "./Admin";
import { FleetManagers } from "./FleetManagers";
import { VehicleDynamicPricing } from "./VehicleDynamicPricing";

@Index("fm_vehicles_chassis_number_key", ["chassisNumber"], { unique: true })
@Index("fm_vehicles_pkey", ["id"], { unique: true })
@Index("fm_vehicles_license_plate_key", ["licensePlate"], { unique: true })
@Entity("fleet_manager_vehicles", { schema: "public" })
export class FleetManagerVehicles {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("enum", {
    name: "vehicle_type",
    enum: [
      "hatchback",
      "sedan",
      "suv",
      "van",
      "bus",
      "coaster",
      "sports_car",
      "other",
    ],
  })
  vehicleType:
    | "hatchback"
    | "sedan"
    | "suv"
    | "van"
    | "bus"
    | "coaster"
    | "sports_car"
    | "other";

  @Column("character varying", { name: "make", length: 50 })
  make: string;

  @Column("character varying", { name: "model", length: 50 })
  model: string;

  @Column("integer", { name: "year" })
  year: number;

  @Column("character varying", {
    name: "license_plate",
    unique: true,
    length: 20,
  })
  licensePlate: string;

  @Column("character varying", {
    name: "chassis_number",
    nullable: true,
    unique: true,
    length: 50,
  })
  chassisNumber: string | null;

  @Column("character varying", { name: "color", nullable: true, length: 30 })
  color: string | null;

  @Column("integer", { name: "seating_capacity", default: () => "4" })
  seatingCapacity: number;

  @Column("character varying", { name: "transmission_type", length: 20 })
  transmissionType: string;

  @Column("enum", {
    name: "fuel_type",
    enum: ["petrol", "diesel", "electric", "hybrid", "cng"],
  })
  fuelType: "petrol" | "diesel" | "electric" | "hybrid" | "cng";

  @Column("numeric", {
    name: "mileage_km",
    nullable: true,
    precision: 10,
    scale: 2,
  })
  mileageKm: string | null;

  @Column("enum", {
    name: "driver_service_option",
    enum: ["self_drive_only", "driver_included"],
    default: () => "'self_drive_only'",
  })
  driverServiceOption: "self_drive_only" | "driver_included";

  @Column("numeric", {
    name: "self_drive_base_rate",
    nullable: true,
    precision: 10,
    scale: 2,
  })
  selfDriveBaseRate: string | null;

  @Column("numeric", {
    name: "driver_included_rate",
    nullable: true,
    precision: 10,
    scale: 2,
  })
  driverIncludedRate: string | null;

  @Column("integer", {
    name: "driver_hours_included",
    nullable: true,
    default: () => "10",
  })
  driverHoursIncluded: number | null;

  @Column("enum", {
    name: "pricing_model",
    enum: ["per_day", "per_km"],
    default: () => "'per_day'",
  })
  pricingModel: "per_day" | "per_km";

  @Column("numeric", {
    name: "late_return_charge_per_hour",
    precision: 10,
    scale: 2,
    default: () => "250.00",
  })
  lateReturnChargePerHour: string;

  @Column("numeric", {
    name: "fuel_charge_per_km_if_empty",
    nullable: true,
    precision: 10,
    scale: 2,
  })
  fuelChargePerKmIfEmpty: string | null;

  @Column("numeric", {
    name: "latenight_offer_flat_fee",
    nullable: true,
    precision: 10,
    scale: 2,
  })
  latenightOfferFlatFee: string | null;

  @Column("boolean", { name: "is_insured", default: () => "false" })
  isInsured: boolean;

  @Column("enum", {
    name: "vehicle_status",
    enum: ["available", "on_rent", "maintenance", "decommissioned"],
    default: () => "'available'",
  })
  vehicleStatus: "available" | "on_rent" | "maintenance" | "decommissioned";

  @Column("boolean", { name: "is_approved_by_admin", default: () => "false" })
  isApprovedByAdmin: boolean;

  @Column("boolean", { name: "is_deleted", default: () => "false" })
  isDeleted: boolean;

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
    () => FleetManagerVehicleDocuments,
    (fleetManagerVehicleDocuments) => fleetManagerVehicleDocuments.vehicle
  )
  fleetManagerVehicleDocuments: FleetManagerVehicleDocuments[];

  @ManyToOne(() => Admin, (admin) => admin.fleetManagerVehicles)
  @JoinColumn([{ name: "approved_by", referencedColumnName: "id" }])
  approvedBy: Admin;

  @ManyToOne(() => Admin, (admin) => admin.fleetManagerVehicles2)
  @JoinColumn([{ name: "created_by", referencedColumnName: "id" }])
  createdBy: Admin;

  @ManyToOne(
    () => FleetManagers,
    (fleetManagers) => fleetManagers.fleetManagerVehicles,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "fleet_manager_id", referencedColumnName: "id" }])
  fleetManager: FleetManagers;

  @ManyToOne(() => Admin, (admin) => admin.fleetManagerVehicles3)
  @JoinColumn([{ name: "updated_by", referencedColumnName: "id" }])
  updatedBy: Admin;

  @OneToMany(
    () => VehicleDynamicPricing,
    (vehicleDynamicPricing) => vehicleDynamicPricing.vehicle
  )
  vehicleDynamicPricings: VehicleDynamicPricing[];
}
