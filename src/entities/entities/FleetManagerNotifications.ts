import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Bookings } from "./Bookings";
import { FleetManagerUsers } from "./FleetManagerUsers";
import { Requests } from "./Requests";
import { Admin } from "./Admin";
import { Users } from "./Users";
import { FleetManagerVehicles } from "./FleetManagerVehicles";

@Index("fleet_manager_notifications_pkey", ["id"], { unique: true })
@Entity("fleet_manager_notifications", { schema: "public" })
export class FleetManagerNotifications {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("text", { name: "title", nullable: true })
  title: string | null;

  @Column("text", { name: "body", nullable: true })
  body: string | null;

  @Column("text", { name: "noti_type", nullable: true })
  notiType: string | null;

  @Column("character varying", {
    name: "redirect_url",
    nullable: true,
    length: 255,
  })
  redirectUrl: string | null;

  @Column("boolean", { name: "is_read", default: () => "false" })
  isRead: boolean;

  @Column("timestamp without time zone", { name: "read_at", nullable: true })
  readAt: Date | null;

  @Column("timestamp without time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @ManyToOne(() => Bookings, (bookings) => bookings.fleetManagerNotifications, {
    onDelete: "SET NULL",
  })
  @JoinColumn([{ name: "booking_id", referencedColumnName: "id" }])
  booking: Bookings;

  @ManyToOne(
    () => FleetManagerUsers,
    (fleetManagerUsers) => fleetManagerUsers.fleetManagerNotifications,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "receiver_id", referencedColumnName: "id" }])
  receiver: FleetManagerUsers;

  @ManyToOne(() => Requests, (requests) => requests.fleetManagerNotifications, {
    onDelete: "SET NULL",
  })
  @JoinColumn([{ name: "request_id", referencedColumnName: "id" }])
  request: Requests;

  @ManyToOne(() => Admin, (admin) => admin.fleetManagerNotifications, {
    onDelete: "SET NULL",
  })
  @JoinColumn([{ name: "sender_admin_id", referencedColumnName: "id" }])
  senderAdmin: Admin;

  @ManyToOne(() => Users, (users) => users.fleetManagerNotifications, {
    onDelete: "SET NULL",
  })
  @JoinColumn([{ name: "sender_client_id", referencedColumnName: "id" }])
  senderClient: Users;

  @ManyToOne(
    () => FleetManagerVehicles,
    (fleetManagerVehicles) => fleetManagerVehicles.fleetManagerNotifications,
    { onDelete: "SET NULL" }
  )
  @JoinColumn([{ name: "vehicle_id", referencedColumnName: "id" }])
  vehicle: FleetManagerVehicles;
}
