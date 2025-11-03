import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Admin } from "./Admin";

@Index("role_pkey", ["id"], { unique: true })
@Index("role_name_key", ["name"], { unique: true })
@Entity("role", { schema: "public" })
export class Role {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", { name: "name", unique: true, length: 50 })
  name: string;

  @Column("timestamp without time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @OneToMany(() => Admin, (admin) => admin.role)
  admins: Admin[];
}
