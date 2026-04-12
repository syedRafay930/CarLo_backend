-- Run once on Neon/Postgres (synchronize=false).
-- psql "$DATABASE_URL" -f CarLo_backend/scripts/add_review_unique_and_client_owner.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_vehicle_rating'
  ) THEN
    ALTER TABLE vehicle_ratings
      ADD CONSTRAINT uq_user_vehicle_rating UNIQUE (user_id, vehicle_id);
  END IF;
END $$;

ALTER TABLE fleet_managers
  ADD COLUMN IF NOT EXISTS client_owner_id integer REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_fleet_managers_client_owner_id
  ON fleet_managers (client_owner_id)
  WHERE client_owner_id IS NOT NULL;
