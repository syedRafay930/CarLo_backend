import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { RelationModule } from "./RelationModule";
import { AdminRole } from "./AdminRole";

@Index("role_permissions_pkey", ["id"], { unique: true })
@Index("uq_relation_role", ["relationId", "roleId"], { unique: true })
@Entity("role_permissions", { schema: "public" })
export class RolePermissions {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("integer", { name: "relation_id", nullable: true, unique: true })
  relationId: number | null;

  @Column("integer", { name: "role_id", nullable: true, unique: true })
  roleId: number | null;

  @Column("boolean", { name: "is_enable", default: () => "false" })
  isEnable: boolean;

  @ManyToOne(
    () => RelationModule,
    (relationModule) => relationModule.rolePermissions,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "relation_id", referencedColumnName: "id" }])
  relation: RelationModule;

  @ManyToOne(() => AdminRole, (adminRole) => adminRole.rolePermissions, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "role_id", referencedColumnName: "id" }])
  role: AdminRole;
}
