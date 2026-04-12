-- Run once on Postgres (Neon). TypeORM synchronize=false.
-- psql "$DATABASE_URL" -f scripts/add_ocr_enum_and_column.sql

-- Vehicle documents (DB type name: doc_verification_status_enum)
ALTER TYPE doc_verification_status_enum ADD VALUE IF NOT EXISTS 'ocr_passed';
ALTER TYPE doc_verification_status_enum ADD VALUE IF NOT EXISTS 'ocr_flagged';

-- Fleet documents (DB type name: verification_status_enum)
ALTER TYPE verification_status_enum ADD VALUE IF NOT EXISTS 'ocr_passed';
ALTER TYPE verification_status_enum ADD VALUE IF NOT EXISTS 'ocr_flagged';

ALTER TABLE fleet_managers_documents
  ADD COLUMN IF NOT EXISTS ocr_result_json text;
