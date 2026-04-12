import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { FleetManagerVehicleDocuments } from "./FleetManagerVehicleDocuments";
import { UserFavoriteVehicles } from "./UserFavoriteVehicles";
import { Admin } from "./Admin";
import { FleetManagers } from "./FleetManagers";
import { VehicleDynamicPricing } from "./VehicleDynamicPricing";
import { FleetManagerUsers } from "./FleetManagerUsers";
import { Requests } from "./Requests";
import { VehicleRatings } from "./VehicleRatings";
import { Bookings } from "./Bookings";

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
  mileageKm: number | null;

  @Column("enum", {
    name: "driver_service_option",
    enum: ["self_drive_only", "driver_included", "both"],
    default: () => "'self_drive_only'",
  })
  driverServiceOption: "self_drive_only" | "driver_included" | "both";

  @Column("numeric", {
    name: "self_drive_base_rate",
    nullable: true,
    precision: 10,
    scale: 2,
  })
  selfDriveBaseRate: number | null;

  @Column("numeric", {
    name: "driver_included_rate",
    nullable: true,
    precision: 10,
    scale: 2,
  })
  driverIncludedRate: number | null;

  @Column("integer", {
    name: "driver_hours_included",
    nullable: true,
    default: () => "10",
  })
  driverHoursIncluded: number | null;

  @Column("enum", {
    name: "pricing_model",
    enum: ["per_day", "per_km", "per_hr"],
    default: () => "'per_day'",
  })
  pricingModel: "per_day" | "per_km" | "per_hr";

  @Column("numeric", {
    name: "late_return_charge_per_hour",
    precision: 10,
    scale: 2,
    default: () => "250.00",
  })
  lateReturnChargePerHour: number;

  @Column("numeric", {
    name: "fuel_charge_per_km_if_empty",
    nullable: true,
    precision: 10,
    scale: 2,
  })
  fuelChargePerKmIfEmpty: number | null;

  @Column("numeric", {
    name: "latenight_offer_flat_fee",
    nullable: true,
    precision: 10,
    scale: 2,
  })
  latenightOfferFlatFee: number | null;

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

  @Column("integer", {
    name: "max_adjustment_percent",
    nullable: true,
    default: () => "30",
  })
  maxAdjustmentPercent: number | null;

  @Column("boolean", {
    name: "dynamic_pricing_enabled",
    nullable: true,
    default: () => "true",
  })
  dynamicPricingEnabled: boolean | null;

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

  @Column("character varying", { name: "approval_status", length: 255 })
  approvalStatus: string | null;

  @OneToMany(
    () => FleetManagerVehicleDocuments,
    (fleetManagerVehicleDocuments) => fleetManagerVehicleDocuments.vehicle
  )
  fleetManagerVehicleDocuments: FleetManagerVehicleDocuments[];

  @ManyToOne(() => Admin, (admin) => admin.fleetManagerVehicles)
  @JoinColumn([{ name: "approved_by", referencedColumnName: "id" }])
  approvedBy: Admin;

 
  @ManyToOne(() => FleetManagerUsers, (fleetManagers) => fleetManagers.fleetManagerVehicles)
  @JoinColumn([{ name: "created_by", referencedColumnName: "id" }])
  createdBy: FleetManagerUsers;

  @ManyToOne(
    () => FleetManagers,
    (fleetManagers) => fleetManagers.fleetManagerVehicles,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "fleet_manager_id", referencedColumnName: "id" }])
  fleetManager: FleetManagers;

  @ManyToOne(() => FleetManagerUsers, (fleetManager) => fleetManager.fleetManagerVehicles2)
  @JoinColumn([{ name: "updated_by", referencedColumnName: "id" }])
  updatedBy: FleetManagerUsers;

  @OneToMany(() => Requests, (requests) => requests.vehicle)
  requests: Requests[];

  @OneToOne(
    () => UserFavoriteVehicles,
    (userFavoriteVehicles) => userFavoriteVehicles.vehicle
  )
  userFavoriteVehicles: UserFavoriteVehicles;

  @OneToMany(
    () => VehicleDynamicPricing,
    (vehicleDynamicPricing) => vehicleDynamicPricing.vehicle
  )
  vehicleDynamicPricings: VehicleDynamicPricing[];

  @OneToMany(() => VehicleRatings, (vehicleRatings) => vehicleRatings.vehicle)
  vehicleRatings: VehicleRatings[];

  @OneToMany(() => Bookings, (bookings) => bookings.vehicle)
  bookings: Bookings[];
}
