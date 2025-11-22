import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { FleetManagerUsers } from "./FleetManagerUsers";
import { FleetManagers } from "./FleetManagers";

@Index("fleet_manager_users_role_pkey", ["id"], { unique: true })
@Entity("fleet_manager_users_role", { schema: "public" })
export class FleetManagerUsersRole {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", {
    name: "role_name",
    nullable: true,
    length: 100,
  })
  roleName: string | null;

  @Column("timestamp without time zone", { name: "created_at", nullable: true })
  createdAt: Date | null;

  @OneToMany(
    () => FleetManagerUsers,
    (fleetManagerUsers) => fleetManagerUsers.fmUsersRole
  )
  fleetManagerUsers: FleetManagerUsers[];

  @ManyToOne(
    () => FleetManagers,
    (fleetManagers) => fleetManagers.fleetManagerUsersRoles
  )
  @JoinColumn([{ name: "fleet_manager_id", referencedColumnName: "id" }])
  fleetManager: FleetManagers;
}
