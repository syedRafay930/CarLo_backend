import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { FleetManagers } from "./FleetManagers";
import { Admin } from "./Admin";

@Index("fleet_managers_documents_pkey", ["id"], { unique: true })
@Entity("fleet_managers_documents", { schema: "public" })
export class FleetManagersDocuments {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", { name: "document_type", length: 100 })
  documentType: string;

  @Column("character varying", { name: "document_url", length: 500 })
  documentUrl: string;

  @Column("timestamp without time zone", {
    name: "upload_date",
    default: () => "now()",
  })
  uploadDate: Date;

  @Column("enum", {
    name: "verification_status",
    enum: ["pending", "in_review", "verified", "rejected"],
    default: () => "'pending'",
  })
  verificationStatus: "pending" | "in_review" | "verified" | "rejected";

  @Column("timestamp without time zone", {
    name: "verified_at",
    nullable: true,
  })
  verifiedAt: Date | null;

  @Column("text", { name: "rejection_reason", nullable: true })
  rejectionReason: string | null;

  @Column("boolean", { name: "is_deleted", default: () => "false" })
  isDeleted: boolean;

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

  @ManyToOne(
    () => FleetManagers,
    (fleetManagers) => fleetManagers.fleetManagersDocuments,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "fleet_manager_id", referencedColumnName: "id" }])
  fleetManager: FleetManagers;

  @ManyToOne(() => Admin, (admin) => admin.fleetManagersDocuments)
  @JoinColumn([{ name: "verified_by", referencedColumnName: "id" }])
  verifiedBy: Admin;
}
