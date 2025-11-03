import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Role } from "./Role";

@Index("UQ_386657905f0fdeabc53555beba3", ["email"], { unique: true })
@Index("admin_pkey", ["id"], { unique: true })
@Entity("admin", { schema: "public" })
export class Admin {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", { name: "first_name", length: 255 })
  firstName: string;

  @Column("character varying", { name: "last_name", length: 255 })
  lastName: string;

  @Column("bigint", { name: "contact", nullable: true })
  contact: string | null;

  @Column("character varying", { name: "email", unique: true, length: 255 })
  email: string;

  @Column("character varying", { name: "hashed_password", length: 255 })
  hashedPassword: string;

  @Column("boolean", { name: "is_deactive", default: () => "false" })
  isDeactive: boolean;

  @Column("boolean", { name: "is_delete", default: () => "false" })
  isDelete: boolean;

  @Column("boolean", { name: "is_firstlogin", default: () => "true" })
  isFirstlogin: boolean;

  @Column("timestamp without time zone", { name: "invited_at", nullable: true })
  invitedAt: Date | null;

  @Column("timestamp without time zone", { name: "deleted_at", nullable: true })
  deletedAt: Date | null;

  @Column("timestamp without time zone", { name: "created_at", nullable: true })
  createdAt: Date | null;

  @ManyToOne(() => Role, (role) => role.admins, { onDelete: "CASCADE" })
  @JoinColumn([{ name: "role_id", referencedColumnName: "id" }])
  role: Role;
}
