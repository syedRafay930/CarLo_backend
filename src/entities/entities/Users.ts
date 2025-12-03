import {
  Column,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Bookings } from "./Bookings";
import { UserFavoriteVehicles } from "./UserFavoriteVehicles";
import { VehicleRatings } from "./VehicleRatings";

@Index("users_pkey", ["id"], { unique: true })
@Entity("users", { schema: "public" })
export class Users {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", {
    name: "first_name",
    nullable: true,
    length: 255,
  })
  firstName: string | null;

  @Column("character varying", {
    name: "last_name",
    nullable: true,
    length: 255,
  })
  lastName: string | null;

  @Column("character varying", { name: "contact", nullable: true, length: 20 })
  contact: string | null;

  @Column("character varying", { name: "email", nullable: true, length: 255 })
  email: string | null;

  @Column("character varying", {
    name: "password",
    nullable: true,
    length: 255,
  })
  password: string | null;

  @Column("boolean", { name: "is_delete", default: () => "false" })
  isDelete: boolean;

  @Column("boolean", { name: "is_active", default: () => "false" })
  isActive: boolean;

  @Column("timestamp without time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @Column("character varying", {
    name: "profile_pic",
    nullable: true,
    length: 255,
  })
  profilePic: string | null;

  @OneToMany(() => Bookings, (bookings) => bookings.user)
  bookings: Bookings[];

  @OneToOne(
    () => UserFavoriteVehicles,
    (userFavoriteVehicles) => userFavoriteVehicles.user
  )
  userFavoriteVehicles: UserFavoriteVehicles;

  @OneToMany(() => VehicleRatings, (vehicleRatings) => vehicleRatings.user)
  vehicleRatings: VehicleRatings[];
}
