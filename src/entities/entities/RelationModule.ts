import {
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Modules } from "./Modules";
import { RolePermissions } from "./RolePermissions";

@Index("relation_module_pkey", ["id"], { unique: true })
@Entity("relation_module", { schema: "public" })
export class RelationModule {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @ManyToOne(() => Modules, (modules) => modules.relationModules, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "child_module_id", referencedColumnName: "id" }])
  childModule: Modules;

  @ManyToOne(() => Modules, (modules) => modules.relationModules2, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "parent_module_id", referencedColumnName: "id" }])
  parentModule: Modules;

  @OneToMany(
    () => RolePermissions,
    (rolePermissions) => rolePermissions.relation
  )
  rolePermissions: RolePermissions[];
}
