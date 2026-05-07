import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Users } from "./Users";
import { FleetManagerVehicles } from "./FleetManagerVehicles";

@Index("user_favorite_vehicles_pkey", ["id"], { unique: true })
@Index("uq_user_favorite_user_vehicle", ["userId", "vehicleId"], {
  unique: true,
})
@Entity("user_favorite_vehicles", { schema: "public" })
export class UserFavoriteVehicles {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("integer", { name: "user_id" })
  userId: number;

  @Column("integer", { name: "vehicle_id" })
  vehicleId: number;

  @Column("boolean", { name: "is_active", default: () => "true" })
  isActive: boolean;

  @Column("timestamp without time zone", {
    name: "added_at",
    default: () => "now()",
  })
  addedAt: Date;

  @ManyToOne(() => Users, (users) => users.userFavoriteVehicles, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "user_id", referencedColumnName: "id" }])
  user: Users;

  @ManyToOne(
    () => FleetManagerVehicles,
    (fleetManagerVehicles) => fleetManagerVehicles.userFavoriteVehicles,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "vehicle_id", referencedColumnName: "id" }])
  vehicle: FleetManagerVehicles;
}
