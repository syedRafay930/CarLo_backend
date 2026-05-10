import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { FleetRegistrationApplications } from "./FleetRegistrationApplications";
import { Admin } from "./Admin";
import { Requests } from "./Requests";
import { FleetManagerUsers } from "./FleetManagerUsers";

@Index("admin_notifications_pkey", ["id"], { unique: true })
@Entity("admin_notifications", { schema: "public" })
export class AdminNotifications {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("text", { name: "title", nullable: true })
  title: string | null;

  @Column("text", { name: "body", nullable: true })
  body: string | null;

  @Column("boolean", { name: "is_read", default: () => "false" })
  isRead: boolean;

  @Column("timestamp without time zone", { name: "read_at", nullable: true })
  readAt: Date | null;

  @Column("timestamp without time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @Column("text", { name: "noti_type", nullable: true })
  notiType: string | null;

  @Column("character varying", {
    name: "redirect_url",
    nullable: true,
    length: 255,
  })
  redirectUrl: string | null;

  @ManyToOne(
    () => FleetRegistrationApplications,
    (fleetRegistrationApplications) =>
      fleetRegistrationApplications.adminNotifications,
    { onDelete: "SET NULL" }
  )
  @JoinColumn([{ name: "application_id", referencedColumnName: "id" }])
  application: FleetRegistrationApplications;

  @ManyToOne(() => Admin, (admin) => admin.adminNotifications, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "receiver_id", referencedColumnName: "id" }])
  receiver: Admin;

  @ManyToOne(() => Requests, (requests) => requests.adminNotifications, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "request_id", referencedColumnName: "id" }])
  request: Requests;

  @ManyToOne(
    () => FleetManagerUsers,
    (fleetManagerUsers) => fleetManagerUsers.adminNotifications,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "sender_id", referencedColumnName: "id" }])
  sender: FleetManagerUsers;
}
