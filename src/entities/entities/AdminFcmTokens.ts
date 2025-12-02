import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Admin } from "./Admin";

@Index("admin_fcm_tokens_pkey", ["id"], { unique: true })
@Index("admin_fcm_tokens_token_key", ["token"], { unique: true })
@Entity("admin_fcm_tokens", { schema: "public" })
export class AdminFcmTokens {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("text", { name: "token", unique: true })
  token: string;

  @Column("character varying", { name: "platform", nullable: true, length: 20 })
  platform: string | null;

  @Column("boolean", { name: "is_active", default: () => "true" })
  isActive: boolean;

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

  @ManyToOne(() => Admin, (admin) => admin.adminFcmTokens, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "admin_id", referencedColumnName: "id" }])
  admin: Admin;
}
