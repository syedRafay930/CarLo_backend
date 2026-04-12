import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Users } from "./Users";
import { FleetManagerVehicles } from "./FleetManagerVehicles";

@Unique("uq_user_vehicle_rating", ["user", "vehicle"])
@Index("vehicle_ratings_pkey", ["id"], { unique: true })
@Entity("vehicle_ratings", { schema: "public" })
export class VehicleRatings {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("integer", { name: "rating", nullable: true })
  rating: number | null;

  @Column("text", { name: "comment", nullable: true })
  comment: string | null;

  @Column("timestamp without time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @ManyToOne(() => Users, (users) => users.vehicleRatings)
  @JoinColumn([{ name: "user_id", referencedColumnName: "id" }])
  user: Users;

  @ManyToOne(
    () => FleetManagerVehicles,
    (fleetManagerVehicles) => fleetManagerVehicles.vehicleRatings,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "vehicle_id", referencedColumnName: "id" }])
  vehicle: FleetManagerVehicles;
}
