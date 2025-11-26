import {
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { FmModules } from "./FmModules";
import { FmRolePermissions } from "./FmRolePermissions";

@Index("fm_relation_module_pkey", ["id"], { unique: true })
@Entity("fm_relation_module", { schema: "public" })
export class FmRelationModule {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @ManyToOne(() => FmModules, (fmModules) => fmModules.fmRelationModules, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "child_module_id", referencedColumnName: "id" }])
  childModule: FmModules;

  @ManyToOne(() => FmModules, (fmModules) => fmModules.fmRelationModules2, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "parent_module_id", referencedColumnName: "id" }])
  parentModule: FmModules;

  @OneToMany(
    () => FmRolePermissions,
    (fmRolePermissions) => fmRolePermissions.relation
  )
  fmRolePermissions: FmRolePermissions[];
}
