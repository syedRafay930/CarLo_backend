-- =============================================================================
-- CarLo — comprehensive incremental seed (safe to re-run)
-- Run after scripts/seed.sql. Uses exact PostgreSQL column names from TypeORM
-- entities under src/entities/entities/.
-- =============================================================================
-- Idempotency: ON CONFLICT / NOT EXISTS / WHERE NOT EXISTS patterns.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0) Favorites: allow multiple rows per user (composite uniqueness)
--    Entity incorrectly marked user_id/vehicle_id as globally unique.
-- -----------------------------------------------------------------------------
ALTER TABLE user_favorite_vehicles DROP CONSTRAINT IF EXISTS "user_favorite_vehicles_user_id_key";
ALTER TABLE user_favorite_vehicles DROP CONSTRAINT IF EXISTS "user_favorite_vehicles_vehicle_id_key";
DROP INDEX IF EXISTS "user_favorite_vehicles_user_id_key";
DROP INDEX IF EXISTS "user_favorite_vehicles_vehicle_id_key";
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_favorite_user_vehicle
  ON user_favorite_vehicles (user_id, vehicle_id);

-- -----------------------------------------------------------------------------
-- 1) Subscriptions (subscriptions)
--    Columns: name, monthly_price, description, max_users, max_vehicles,
--    is_priority_support, allows_ai_verification, is_active, created_at, updated_at
-- -----------------------------------------------------------------------------
INSERT INTO subscriptions (
  name, monthly_price, description, max_users, max_vehicles,
  is_priority_support, allows_ai_verification, is_active
) VALUES
  ('Starter', 2999.00, 'Small fleets — up to 5 vehicles', 2, 5, false, false, true),
  ('Professional', 7999.00, 'Growing dealers — up to 20 vehicles', 5, 20, true, true, true),
  ('Enterprise', 19999.00, 'Large operators — up to 100 vehicles', 20, 100, true, true, true),
  ('Individual', 999.00, 'Single owner host — up to 3 vehicles', 1, 3, false, false, true)
ON CONFLICT (name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2) FleetManagerSubscriptions
--    fleet_manager_id, subscription_id, start_date, end_date, month, amount_paid,
--    payment_status, payment_reference_id, is_active
-- -----------------------------------------------------------------------------
INSERT INTO fleet_manager_subscriptions (
  fleet_manager_id, subscription_id, start_date, end_date, month, amount_paid,
  payment_status, payment_reference_id, is_active
)
SELECT f.id, s.id,
  (CURRENT_DATE - INTERVAL '3 months')::date,
  (CURRENT_DATE + INTERVAL '9 months')::date,
  to_char(CURRENT_DATE, 'YYYY-MM'),
  s.monthly_price::numeric * 3,
  'paid',
  'SEED-FMSUB-' || f.id::text,
  true
FROM fleet_managers f
JOIN subscriptions s ON s.name = (
  CASE f.id
    WHEN 1 THEN 'Professional'
    WHEN 2 THEN 'Professional'
    WHEN 3 THEN 'Starter'
    WHEN 4 THEN 'Individual'
    WHEN 5 THEN 'Starter'
    WHEN 6 THEN 'Starter'
    ELSE 'Starter'
  END
)
WHERE f.id BETWEEN 1 AND 6
  AND NOT EXISTS (
    SELECT 1 FROM fleet_manager_subscriptions x WHERE x.fleet_manager_id = f.id
  );

-- -----------------------------------------------------------------------------
-- 3) Vehicles 9–12 (fleet_manager_vehicles) + cover docs
-- -----------------------------------------------------------------------------
INSERT INTO fleet_manager_vehicles (
  fleet_manager_id, vehicle_type, make, model, year, license_plate, chassis_number, color,
  seating_capacity, transmission_type, fuel_type, mileage_km,
  driver_service_option, self_drive_base_rate, pricing_model,
  vehicle_status, is_approved_by_admin, is_deleted, approved_by, created_by, updated_by,
  approval_status
)
SELECT 5, 'sedan', 'Honda', 'City', 2021, 'LHR-EEG-501', 'CHS00000000000009', 'Blue', 5, 'automatic', 'petrol', 50000.00, 'self_drive_only', 3500.00, 'per_day', 'available', true, false, 1, 5, 5, 'approved'
WHERE NOT EXISTS (SELECT 1 FROM fleet_manager_vehicles e WHERE e.license_plate = 'LHR-EEG-501');
INSERT INTO fleet_manager_vehicles (
  fleet_manager_id, vehicle_type, make, model, year, license_plate, chassis_number, color,
  seating_capacity, transmission_type, fuel_type, mileage_km,
  driver_service_option, self_drive_base_rate, pricing_model,
  vehicle_status, is_approved_by_admin, is_deleted, approved_by, created_by, updated_by,
  approval_status
)
SELECT 5, 'sedan', 'Toyota', 'Yaris', 2022, 'LHR-EEG-502', 'CHS00000000000010', 'White', 5, 'automatic', 'petrol', 22000.00, 'self_drive_only', 4000.00, 'per_day', 'available', true, false, 1, 5, 5, 'approved'
WHERE NOT EXISTS (SELECT 1 FROM fleet_manager_vehicles e WHERE e.license_plate = 'LHR-EEG-502');
INSERT INTO fleet_manager_vehicles (
  fleet_manager_id, vehicle_type, make, model, year, license_plate, chassis_number, color,
  seating_capacity, transmission_type, fuel_type, mileage_km,
  driver_service_option, self_drive_base_rate, pricing_model,
  vehicle_status, is_approved_by_admin, is_deleted, approved_by, created_by, updated_by,
  approval_status
)
SELECT 6, 'hatchback', 'Suzuki', 'Swift', 2020, 'RWP-FFH-601', 'CHS00000000000011', 'Red', 5, 'manual', 'petrol', 62000.00, 'self_drive_only', 2500.00, 'per_day', 'available', true, false, 1, 6, 6, 'approved'
WHERE NOT EXISTS (SELECT 1 FROM fleet_manager_vehicles e WHERE e.license_plate = 'RWP-FFH-601');
INSERT INTO fleet_manager_vehicles (
  fleet_manager_id, vehicle_type, make, model, year, license_plate, chassis_number, color,
  seating_capacity, transmission_type, fuel_type, mileage_km,
  driver_service_option, self_drive_base_rate, pricing_model,
  vehicle_status, is_approved_by_admin, is_deleted, approved_by, created_by, updated_by,
  approval_status
)
SELECT 6, 'sedan', 'Toyota', 'Corolla', 2019, 'RWP-FFH-602', 'CHS00000000000012', 'Silver', 5, 'automatic', 'petrol', 78000.00, 'self_drive_only', 4200.00, 'per_day', 'available', true, false, 1, 6, 6, 'approved'
WHERE NOT EXISTS (SELECT 1 FROM fleet_manager_vehicles e WHERE e.license_plate = 'RWP-FFH-602');

INSERT INTO fleet_manager_vehicle_documents (vehicle_id, doc_type, document_url, verification_status, verified_by, verified_at)
SELECT v.id, 'image_coverimg', u.url, 'verified', 1, now()
FROM fleet_manager_vehicles v
JOIN (VALUES
  ('LHR-EEG-501', 'https://source.unsplash.com/800x500/?honda,city,car'),
  ('LHR-EEG-502', 'https://source.unsplash.com/800x500/?toyota,yaris,car'),
  ('RWP-FFH-601', 'https://source.unsplash.com/800x500/?suzuki,swift,car'),
  ('RWP-FFH-602', 'https://source.unsplash.com/800x500/?toyota,corolla,car')
) AS u(plate, url) ON u.plate = v.license_plate
WHERE NOT EXISTS (
  SELECT 1 FROM fleet_manager_vehicle_documents d
  WHERE d.vehicle_id = v.id AND d.doc_type = 'image_coverimg'
);

-- -----------------------------------------------------------------------------
-- 4) Bookings (8 new rows → total 12). Status uses in_progress (no "active" enum).
-- -----------------------------------------------------------------------------
INSERT INTO bookings (
  booking_code, pickup_date, return_date, pickup_location, return_location,
  service_type, price_model, payment_status, total_days, total_hours,
  base_rate_per_day_or_hour, driver_rate_per_hour, driver_hours_per_day,
  initial_total_charge, extra_charges_applied, final_amount_settled,
  status, fleet_manager_id, user_id, vehicle_id
) VALUES
  ('BK-20260411-KHI02', '2026-04-11 08:00:00', '2026-04-14 18:00:00',
   'Karachi Airport T2', 'Dolmen Mall Clifton',
   'self_drive', 'per_day', 'advance_paid', 3, 0,
   6000.00, 0.00, 0, 18000.00, 0.00, NULL,
   'in_progress', 1, 2, 2),
  ('BK-20260325-ISB02', '2026-03-25 07:00:00', '2026-03-27 22:00:00',
   'Blue Area Islamabad', 'NUST gate H-12',
   'self_drive', 'per_day', 'full_paid', 2, 0,
   9000.00, 0.00, 0, 18000.00, 1500.00, 19500.00,
   'completed', 3, 1, 6),
  ('BK-20260420-LHR03', '2026-04-20 09:00:00', '2026-04-23 09:00:00',
   'Lahore Airport', 'DHA Phase 6',
   'self_drive', 'per_day', 'full_paid', 3, 0,
   3000.00, 0.00, 0, 9000.00, 0.00, 9000.00,
   'confirmed', 2, 3, 3),
  ('BK-20260301-KHI03', '2026-03-01 10:00:00', '2026-03-03 10:00:00',
   'Saddar Karachi', 'Gulshan-e-Iqbal',
   'self_drive', 'per_day', 'advance_paid', 2, 0,
   2800.00, 0.00, 0, 5600.00, 0.00, NULL,
   'cancelled', 4, 5, 7),
  ('BK-20260405-LHR04', '2026-04-05 08:00:00', '2026-04-08 20:00:00',
   'Johar Town Lahore', 'Wagah Border viewpoint',
   'self_drive', 'per_day', 'full_paid', 3, 0,
   10000.00, 0.00, 0, 30000.00, 0.00, 30000.00,
   'completed', 5, 4, 8),
  ('BK-20260425-ISB03', '2026-04-25 06:00:00', '2026-04-27 20:00:00',
   'Rawalpindi Saddar', 'Murree Cecil Hotel',
   'self_drive', 'per_day', 'full_paid', 2, 0,
   7500.00, 0.00, 0, 15000.00, 0.00, 15000.00,
   'confirmed', 3, 2, 5),
  ('BK-20260412-RWP01', '2026-04-12 09:00:00', '2026-04-15 18:00:00',
   'Rawalpindi Railway Station', 'Pir Wadhai',
   'self_drive', 'per_day', 'advance_paid', 3, 0,
   4200.00, 0.00, 0, 12600.00, 0.00, NULL,
   'in_progress', 6, 3, 12),
  ('BK-20260330-LHR05', '2026-03-30 07:00:00', '2026-04-01 19:00:00',
   'Ichra Lahore', 'Bahria Town Gate 2',
   'self_drive', 'per_day', 'full_paid', 2, 0,
   4000.00, 0.00, 0, 8000.00, 0.00, 8000.00,
   'completed', 5, 5, 10)
ON CONFLICT (booking_code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5) Transactions (transaction_code UNIQUE). user_id required FK → users.
-- -----------------------------------------------------------------------------
INSERT INTO transactions (booking_id, transaction_code, method, status, amount, processed_at, user_id)
SELECT b.id, v.code, 'cash', 'simulated_cash', v.amt::numeric, v.proc::timestamp without time zone, b.user_id
FROM (VALUES
  ('BK-20260310-KHI01', 'TXN-20260310-001', 13500.00, '2026-03-10 08:45:00'),
  ('BK-20260315-LHR01', 'TXN-20260315-001', 36000.00, '2026-03-15 07:30:00'),
  ('BK-20260320-ISB01', 'TXN-20260320-001', 7500.00, '2026-03-20 06:30:00'),
  ('BK-20260228-LHR02', 'TXN-20260228-001', 20500.00, '2026-02-28 09:30:00'),
  ('BK-20260411-KHI02', 'TXN-20260411-001', 9000.00, '2026-04-11 07:45:00'),
  ('BK-20260325-ISB02', 'TXN-20260325-001', 19500.00, '2026-03-25 06:45:00'),
  ('BK-20260420-LHR03', 'TXN-20260420-001', 9000.00, '2026-04-19 22:00:00'),
  ('BK-20260405-LHR04', 'TXN-20260405-001', 30000.00, '2026-04-05 07:30:00'),
  ('BK-20260425-ISB03', 'TXN-20260425-001', 15000.00, '2026-04-24 20:00:00'),
  ('BK-20260412-RWP01', 'TXN-20260412-001', 8000.00, '2026-04-12 08:15:00'),
  ('BK-20260330-LHR05', 'TXN-20260330-001', 8000.00, '2026-03-30 06:45:00')
) AS v(bc, code, amt, proc)
JOIN bookings b ON b.booking_code = v.bc
ON CONFLICT (transaction_code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6) VehicleDynamicPricing — one “today” row per vehicle 1..12 if missing
-- -----------------------------------------------------------------------------
INSERT INTO vehicle_dynamic_pricing (
  vehicle_id, start_date_time, end_date_time, new_daily_rate, reason,
  engine_breakdown_json, created_by_service
)
SELECT v.id,
  date_trunc('day', now())::timestamp without time zone,
  (date_trunc('day', now()) + interval '23 hours 59 minutes 59 seconds')::timestamp without time zone,
  (CASE v.id
    WHEN 1 THEN 4050 WHEN 2 THEN 5400 WHEN 3 THEN 2700 WHEN 4 THEN 10800
    WHEN 5 THEN 6750 WHEN 6 THEN 8100 WHEN 7 THEN 2520 WHEN 8 THEN 9000
    WHEN 9 THEN 3150 WHEN 10 THEN 3600 WHEN 11 THEN 2250 WHEN 12 THEN 3780
  END)::numeric,
  'discount_promotion',
  '{"baseRate":0,"multiplierPercent":-10,"breakdown":{"dayOfWeek":0,"season":-10,"demand":-5,"utilization":0,"competition":5},"reasoning":["Low season -10%","Weekday","Low demand -5%"]}'::text,
  'PricingCronService'
FROM fleet_manager_vehicles v
WHERE v.id BETWEEN 1 AND 12
  AND NOT EXISTS (
    SELECT 1 FROM vehicle_dynamic_pricing p
    WHERE p.vehicle_id = v.id
      AND p.start_date_time::date = CURRENT_DATE
  );

-- -----------------------------------------------------------------------------
-- 7) UserFavoriteVehicles
-- -----------------------------------------------------------------------------
INSERT INTO user_favorite_vehicles (user_id, vehicle_id, is_active, added_at)
VALUES
  (1, 2, true, '2026-03-15 10:00:00'),
  (1, 4, true, '2026-03-20 14:00:00'),
  (2, 1, true, '2026-03-12 09:00:00'),
  (2, 8, true, '2026-04-01 11:00:00'),
  (3, 5, true, '2026-03-22 16:00:00'),
  (4, 7, true, '2026-02-28 08:00:00'),
  (5, 4, true, '2026-04-03 13:00:00'),
  (5, 8, true, '2026-04-03 13:30:00')
ON CONFLICT (user_id, vehicle_id) DO NOTHING;

-- If DB still has old single-column unique, ON CONFLICT above targets new index —
-- use DO NOTHING on exception: composite must exist (section 0).

-- -----------------------------------------------------------------------------
-- 8) Requests (vehicle_approval) — deterministic hashes for idempotency
-- -----------------------------------------------------------------------------
INSERT INTO requests (
  request_type, request_status, title, description, request_hash,
  fleet_id, fleet_user_id, vehicle_id, created_at, admin_responded_by, responeded_at, updated_at
)
SELECT 'vehicle_approval',
  'approved',
  'New vehicle listing: Honda City',
  'Requesting approval for 2021 Honda City for Lahore fleet',
  'seed_req_fm5_vehicle9_v1',
  5, 5, v.id, now(), 1, now(), now()
FROM fleet_manager_vehicles v WHERE v.license_plate = 'LHR-EEG-501'
ON CONFLICT (request_hash) DO NOTHING;

INSERT INTO requests (
  request_type, request_status, title, description, request_hash,
  fleet_id, fleet_user_id, vehicle_id, created_at, admin_responded_by, responeded_at, updated_at
)
SELECT 'vehicle_approval',
  'approved',
  'New vehicle listing: Toyota Yaris',
  'Requesting approval for 2022 Toyota Yaris',
  'seed_req_fm5_vehicle10_v1',
  5, 5, v.id, now(), 1, now(), now()
FROM fleet_manager_vehicles v WHERE v.license_plate = 'LHR-EEG-502'
ON CONFLICT (request_hash) DO NOTHING;

INSERT INTO requests (
  request_type, request_status, title, description, request_hash,
  fleet_id, fleet_user_id, vehicle_id, created_at
)
SELECT 'vehicle_approval',
  'pending',
  'New vehicle listing: Suzuki Swift',
  'Requesting admin approval for Rawalpindi Suzuki Swift',
  'seed_req_fm6_vehicle11_v1',
  6, 6, v.id, now()
FROM fleet_manager_vehicles v WHERE v.license_plate = 'RWP-FFH-601'
ON CONFLICT (request_hash) DO NOTHING;

INSERT INTO requests (
  request_type, request_status, title, description, request_hash,
  fleet_id, fleet_user_id, vehicle_id, created_at
)
SELECT 'vehicle_approval',
  'pending',
  'New vehicle listing: Toyota Corolla RWP',
  'Classic Corolla for Rawalpindi city commutes',
  'seed_req_fm6_vehicle12_v1',
  6, 6, v.id, now()
FROM fleet_manager_vehicles v WHERE v.license_plate = 'RWP-FFH-602'
ON CONFLICT (request_hash) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 9) FleetManagersDocuments (verified_by required → admin 1)
-- -----------------------------------------------------------------------------
INSERT INTO fleet_managers_documents (
  fleet_manager_id, document_type, document_url, verification_status, verified_by, verified_at
)
SELECT f.id, 'business_registration',
  'https://res.cloudinary.com/dks3aw1fu/image/upload/v1/carlo/fleet-docs/fleet' || f.id::text || '-reg.pdf',
  'verified', 1, now()
FROM fleet_managers f
WHERE f.id IN (1, 2, 3)
  AND NOT EXISTS (
    SELECT 1 FROM fleet_managers_documents d
    WHERE d.fleet_manager_id = f.id AND d.document_type = 'business_registration'
  );

INSERT INTO fleet_managers_documents (
  fleet_manager_id, document_type, document_url, verification_status, verified_by, verified_at
)
SELECT 4, 'owner_cnic',
  'https://res.cloudinary.com/dks3aw1fu/image/upload/v1/carlo/fleet-docs/fleet4-cnic.jpg',
  'verified', 1, now()
WHERE NOT EXISTS (
  SELECT 1 FROM fleet_managers_documents d WHERE d.fleet_manager_id = 4 AND d.document_type = 'owner_cnic'
);

INSERT INTO fleet_managers_documents (
  fleet_manager_id, document_type, document_url, verification_status, verified_by, verified_at
)
SELECT f.id, 'business_registration',
  'https://res.cloudinary.com/dks3aw1fu/image/upload/v1/carlo/fleet-docs/fleet' || f.id::text || '-reg.pdf',
  'pending', 1, now()
FROM fleet_managers f
WHERE f.id IN (5, 6)
  AND NOT EXISTS (
    SELECT 1 FROM fleet_managers_documents d
    WHERE d.fleet_manager_id = f.id AND d.document_type = 'business_registration'
  );

-- -----------------------------------------------------------------------------
-- 10) Admin notifications (noti_type). request_id / sender_id nullable in DB.
-- -----------------------------------------------------------------------------
INSERT INTO admin_notifications (title, body, is_read, noti_type, receiver_id, request_id, sender_id)
SELECT 'New Fleet Registration',
  'Rozefs Motors Rawalpindi has registered on the platform',
  false, 'fleet_registration', 1, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM admin_notifications an
  WHERE an.noti_type = 'fleet_registration' AND an.title = 'New Fleet Registration'
);

INSERT INTO admin_notifications (title, body, is_read, noti_type, receiver_id, request_id, sender_id)
SELECT 'Vehicle Approval Pending',
  'Suzuki Swift from Rozefs Motors awaiting your review',
  false, 'vehicle_approval', 1, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM admin_notifications WHERE title = 'Vehicle Approval Pending' AND body LIKE '%Suzuki Swift%'
);

INSERT INTO admin_notifications (title, body, is_read, noti_type, receiver_id, request_id, sender_id)
SELECT 'Vehicle Approval Pending',
  'Toyota Corolla from Rozefs Motors awaiting your review',
  false, 'vehicle_approval', 1, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM admin_notifications WHERE title = 'Vehicle Approval Pending' AND body LIKE '%Toyota Corolla from Rozefs%'
);

INSERT INTO admin_notifications (title, body, is_read, noti_type, receiver_id, request_id, sender_id)
SELECT 'Booking Completed',
  'Booking BK-20260228-LHR02 has been completed successfully',
  true, 'booking_update', 1, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM admin_notifications WHERE noti_type = 'booking_update' AND body LIKE '%BK-20260228-LHR02%'
);

-- -----------------------------------------------------------------------------
-- 11) Fleet notifications — column name is "type", not noti_type
-- -----------------------------------------------------------------------------
INSERT INTO fleet_notifications (title, body, is_read, type, receiver_id, sender_id, request_id)
SELECT 'New Booking Received',
  'Ali Hassan booked your Honda Civic for Apr 11-14',
  false, 'booking_new', 1, 1, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM fleet_notifications WHERE type = 'booking_new' AND receiver_id = 1 AND title = 'New Booking Received'
);

INSERT INTO fleet_notifications (title, body, is_read, type, receiver_id, sender_id, request_id)
SELECT 'Booking Completed',
  'Booking BK-20260405-LHR04 completed. Revenue: PKR 30,000',
  true, 'booking_completed', 5, 1, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM fleet_notifications WHERE receiver_id = 5 AND body LIKE '%BK-20260405-LHR04%'
);

INSERT INTO fleet_notifications (title, body, is_read, type, receiver_id, sender_id, request_id)
SELECT 'Vehicle Approval Request',
  'Your Suzuki Swift listing is under admin review',
  false, 'vehicle_pending', 6, 1, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM fleet_notifications WHERE receiver_id = 6 AND type = 'vehicle_pending'
);

-- -----------------------------------------------------------------------------
-- 12) Admin RBAC — modules.module_name, relation_module parent/child edges
-- -----------------------------------------------------------------------------
INSERT INTO modules (module_name) SELECT 'Admin Root' WHERE NOT EXISTS (SELECT 1 FROM modules WHERE module_name = 'Admin Root');
INSERT INTO modules (module_name) SELECT v FROM (VALUES
  ('Dashboard'), ('Fleets'), ('Approvals'), ('Users'), ('Analytics'), ('Verification'), ('Notifications')
) AS t(v)
WHERE NOT EXISTS (SELECT 1 FROM modules m WHERE m.module_name = t.v);

INSERT INTO relation_module (parent_module_id, child_module_id)
SELECT p.id, c.id
FROM modules p
CROSS JOIN modules c
WHERE p.module_name = 'Admin Root'
  AND c.module_name IN ('Dashboard','Fleets','Approvals','Users','Analytics','Verification','Notifications')
  AND NOT EXISTS (
    SELECT 1 FROM relation_module r
    WHERE r.parent_module_id = p.id AND r.child_module_id = c.id
  );

INSERT INTO role_permissions (relation_id, role_id, is_enable)
SELECT rm.id, ar.id, true
FROM relation_module rm
JOIN modules p ON p.id = rm.parent_module_id AND p.module_name = 'Admin Root'
JOIN modules ch ON ch.id = rm.child_module_id
JOIN admin_role ar ON ar.name = 'SuperAdmin'
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions x WHERE x.relation_id = rm.id AND x.role_id = ar.id
);

INSERT INTO role_permissions (relation_id, role_id, is_enable)
SELECT rm.id, ar.id, true
FROM relation_module rm
JOIN modules p ON p.id = rm.parent_module_id AND p.module_name = 'Admin Root'
JOIN modules ch ON ch.id = rm.child_module_id AND ch.module_name IN ('Dashboard','Fleets','Notifications')
JOIN admin_role ar ON ar.name = 'Support'
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions x WHERE x.relation_id = rm.id AND x.role_id = ar.id
);

-- -----------------------------------------------------------------------------
-- 13) FM RBAC — fm_modules (module_name only), fm_relation_module, fm_role_permissions
-- -----------------------------------------------------------------------------
INSERT INTO fm_modules (module_name) SELECT 'FM Root' WHERE NOT EXISTS (SELECT 1 FROM fm_modules WHERE module_name = 'FM Root');
INSERT INTO fm_modules (module_name) SELECT v FROM (VALUES
  ('Dashboard'), ('Vehicles'), ('Bookings'), ('Requests'), ('Staff'), ('Analytics'), ('Profile')
) AS t(v)
WHERE NOT EXISTS (SELECT 1 FROM fm_modules m WHERE m.module_name = t.v);

INSERT INTO fm_relation_module (parent_module_id, child_module_id)
SELECT p.id, c.id
FROM fm_modules p
CROSS JOIN fm_modules c
WHERE p.module_name = 'FM Root'
  AND c.module_name IN ('Dashboard','Vehicles','Bookings','Requests','Staff','Analytics','Profile')
  AND NOT EXISTS (
    SELECT 1 FROM fm_relation_module r
    WHERE r.parent_module_id = p.id AND r.child_module_id = c.id
  );

INSERT INTO fm_role_permissions (relation_id, role_id, is_enable, fleet_id)
SELECT frm.id, fmr.id, true, fmr.fleet_manager_id
FROM fm_relation_module frm
JOIN fm_modules p ON p.id = frm.parent_module_id AND p.module_name = 'FM Root'
CROSS JOIN fleet_manager_users_role fmr
WHERE fmr.id BETWEEN 1 AND 6
  AND NOT EXISTS (
  SELECT 1 FROM fm_role_permissions x
  WHERE x.relation_id = frm.id AND x.role_id = fmr.id AND x.fleet_id = fmr.fleet_manager_id
);

COMMIT;
