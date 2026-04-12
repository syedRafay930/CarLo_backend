-- Run against your Neon/Postgres database (synchronize=false).
-- psql "$DATABASE_URL" -f scripts/add_dynamic_pricing_columns.sql

ALTER TABLE fleet_manager_vehicles
  ADD COLUMN IF NOT EXISTS max_adjustment_percent integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS dynamic_pricing_enabled boolean DEFAULT true;

ALTER TABLE vehicle_dynamic_pricing
  ADD COLUMN IF NOT EXISTS engine_breakdown_json text;
