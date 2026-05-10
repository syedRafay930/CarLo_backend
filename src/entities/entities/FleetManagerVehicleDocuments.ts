import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { FleetManagerVehicles } from "./FleetManagerVehicles";
import { Admin } from "./Admin";

@Index("fm_vehicle_documents_pkey", ["id"], { unique: true })
@Entity("fleet_manager_vehicle_documents", { schema: "public" })
export class FleetManagerVehicleDocuments {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("enum", {
    name: "doc_type",
    enum: [
      "image_coverimg",
      "image_exterior_front",
      "image_exterior_back",
      "image_interior",
      "registration_paper",
      "insurance_paper",
      "fitness_certificate",
      "other_document",
      "image_exterior_left",
      "image_exterior_right",
    ],
  })
  docType:
    | "image_coverimg"
    | "image_exterior_front"
    | "image_exterior_back"
    | "image_interior"
    | "registration_paper"
    | "insurance_paper"
    | "fitness_certificate"
    | "other_document"
    | "image_exterior_left"
    | "image_exterior_right";

  @Column("character varying", { name: "document_url", length: 500 })
  documentUrl: string;

  @Column("text", { name: "extracted_data", nullable: true })
  extractedData: string | null;

  @Column("character varying", {
    name: "extracted_plate_number",
    nullable: true,
    length: 20,
  })
  extractedPlateNumber: string | null;

  @Column("character varying", {
    name: "extracted_chassis_number",
    nullable: true,
    length: 50,
  })
  extractedChassisNumber: string | null;

  @Column("boolean", {
    name: "is_metadata_clean",
    nullable: true,
    default: () => "true",
  })
  isMetadataClean: boolean | null;

  @Column("enum", {
    name: "verification_status",
    enum: [
      "pending",
      "comparison_failed",
      "verified",
      "rejected",
      "ocr_passed",
      "ocr_flagged",
    ],
    default: () => "'pending'",
  })
  verificationStatus:
    | "pending"
    | "comparison_failed"
    | "verified"
    | "rejected"
    | "ocr_passed"
    | "ocr_flagged";

  @Column("text", { name: "verification_result", nullable: true })
  verificationResult: string | null;

  @Column("timestamp without time zone", {
    name: "verified_at",
    nullable: true,
  })
  verifiedAt: Date | null;

  @Column("timestamp without time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @ManyToOne(
    () => FleetManagerVehicles,
    (fleetManagerVehicles) => fleetManagerVehicles.fleetManagerVehicleDocuments,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "vehicle_id", referencedColumnName: "id" }])
  vehicle: FleetManagerVehicles;

  @ManyToOne(() => Admin, (admin) => admin.fleetManagerVehicleDocuments)
  @JoinColumn([{ name: "verified_by", referencedColumnName: "id" }])
  verifiedBy: Admin;
}
