import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Users } from "./Users";
import { FleetManagerVehicles } from "./FleetManagerVehicles";

@Index("user_favorite_vehicles_pkey", ["id"], { unique: true })
@Index("user_favorite_vehicles_user_id_key", ["userId"], { unique: true })
@Index("user_favorite_vehicles_vehicle_id_key", ["vehicleId"], { unique: true })
@Entity("user_favorite_vehicles", { schema: "public" })
export class UserFavoriteVehicles {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("integer", { name: "user_id", unique: true })
  userId: number;

  @Column("integer", { name: "vehicle_id", unique: true })
  vehicleId: number;

  @Column("boolean", { name: "is_active", default: () => "true" })
  isActive: boolean;

  @Column("timestamp without time zone", {
    name: "added_at",
    default: () => "now()",
  })
  addedAt: Date;

  @OneToOne(() => Users, (users) => users.userFavoriteVehicles, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "user_id", referencedColumnName: "id" }])
  user: Users;

  @OneToOne(
    () => FleetManagerVehicles,
    (fleetManagerVehicles) => fleetManagerVehicles.userFavoriteVehicles,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "vehicle_id", referencedColumnName: "id" }])
  vehicle: FleetManagerVehicles;
}
