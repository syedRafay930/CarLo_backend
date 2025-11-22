import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { RelationModule } from "./RelationModule";

@Index("modules_pkey", ["id"], { unique: true })
@Entity("modules", { schema: "public" })
export class Modules {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", { name: "module_name", length: 100 })
  moduleName: string;

  @Column("timestamp without time zone", { name: "created_at", nullable: true })
  createdAt: Date | null;

  @OneToMany(
    () => RelationModule,
    (relationModule) => relationModule.childModule
  )
  relationModules: RelationModule[];

  @OneToMany(
    () => RelationModule,
    (relationModule) => relationModule.parentModule
  )
  relationModules2: RelationModule[];
}
