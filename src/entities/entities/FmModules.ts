import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { FmRelationModule } from "./FmRelationModule";

@Index("fm_modules_pkey", ["id"], { unique: true })
@Entity("fm_modules", { schema: "public" })
export class FmModules {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", { name: "module_name", length: 100 })
  moduleName: string;

  @Column("timestamp without time zone", { name: "created_at", nullable: true })
  createdAt: Date | null;

  @OneToMany(
    () => FmRelationModule,
    (fmRelationModule) => fmRelationModule.childModule
  )
  fmRelationModules: FmRelationModule[];

  @OneToMany(
    () => FmRelationModule,
    (fmRelationModule) => fmRelationModule.parentModule
  )
  fmRelationModules2: FmRelationModule[];
}
