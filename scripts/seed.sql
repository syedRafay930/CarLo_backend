-- CarLo Pakistan-focused seed (run after migrations). Truncate data first if re-seeding.
-- Passwords: Admin@12345 (admin), FleetMgr@123 (FM users), Client@12345 (clients)

BEGIN;

INSERT INTO admin_role (name) VALUES
  ('SuperAdmin'),
  ('Support')
ON CONFLICT (name) DO NOTHING;

INSERT INTO admin (
  first_name, last_name, email, hashed_password,
  is_deactive, is_delete, is_firstlogin, role_id, created_at
)
SELECT
  'Carlo', 'Admin', 'admin@carlo.com',
  '$2b$10$mS92YNtbPi9ltup9NQxRGuIjtnUeue63LMQQ8fddDxlwCicpYjgi2',
  false, false, false, r.id, now()
FROM admin_role r WHERE r.name = 'SuperAdmin'
ON CONFLICT (email) DO NOTHING;

-- Six Pakistani-style fleets (names inspired by Carlay, Rently, RentCars247, etc.)
INSERT INTO fleet_managers (
  name, type, contact, email, address, state, city, country,
  is_active, is_delete, created_by, updated_by
) VALUES
  ('Carlay Car Rental Karachi', 'shop', '021-35101234', 'bookings@carlay-khi.pk', 'Clifton Block 8', 'Sindh', 'Karachi', 'Pakistan', true, false, 1, 1),
  ('Rently Lahore', 'shop', '042-37123456', 'lahore@rently.pk', 'Gulberg III', 'Punjab', 'Lahore', 'Pakistan', true, false, 1, 1),
  ('RentCars247 Islamabad', 'shop', '051-6123456', 'isb@rentcars247.pk', 'F-7 Markaz', 'ICT', 'Islamabad', 'Pakistan', true, false, 1, 1),
  ('Karim''s Rent A Car Karachi', 'individual', '0300-5566778', 'karim.rentacar@gmail.com', 'DHA Phase 5', 'Sindh', 'Karachi', 'Pakistan', true, false, 1, 1),
  ('CarRentPK Lahore Hub', 'shop', '0321-8899001', 'hub@carrentpk.pk', 'Johar Town', 'Punjab', 'Lahore', 'Pakistan', true, false, 1, 1),
  ('Rozefs Motors Rawalpindi', 'shop', '051-5234567', 'fleet@rozefsmotors.pk', 'Satellite Town', 'Punjab', 'Rawalpindi', 'Pakistan', true, false, 1, 1);

INSERT INTO fleet_manager_users_role (role_name, fleet_manager_id, created_at) VALUES
  ('Admin', 1, now()),
  ('Admin', 2, now()),
  ('Admin', 3, now()),
  ('Admin', 4, now()),
  ('Admin', 5, now()),
  ('Admin', 6, now());

INSERT INTO fleet_manager_users (
  fleet_manager_id, first_name, last_name, contact, email, password,
  fm_users_role_id, is_delete, is_active, is_firstlogin
) VALUES
  (1, 'Ahmed', 'Raza', '03001112233', 'fm.carlay.khi@carlo.seed', '$2b$10$ZrB4vbGNveY76sv9RWFA6uRbOXcWytJi8ftpPghcdARqa8wtQKBA.', 1, false, true, false),
  (2, 'Sana', 'Malik', '03112223344', 'fm.rently.lhr@carlo.seed', '$2b$10$ZrB4vbGNveY76sv9RWFA6uRbOXcWytJi8ftpPghcdARqa8wtQKBA.', 2, false, true, false),
  (3, 'Hassan', 'Iqbal', '03223334455', 'fm.rentcars247.isb@carlo.seed', '$2b$10$ZrB4vbGNveY76sv9RWFA6uRbOXcWytJi8ftpPghcdARqa8wtQKBA.', 3, false, true, false),
  (4, 'Karim', 'Hussain', '03334445566', 'fm.karim.khi@carlo.seed', '$2b$10$ZrB4vbGNveY76sv9RWFA6uRbOXcWytJi8ftpPghcdARqa8wtQKBA.', 4, false, true, false),
  (5, 'Nida', 'Farooq', '03445556677', 'fm.carrentpk.lhr@carlo.seed', '$2b$10$ZrB4vbGNveY76sv9RWFA6uRbOXcWytJi8ftpPghcdARqa8wtQKBA.', 5, false, true, false),
  (6, 'Omar', 'Siddiqui', '03556667788', 'fm.rozefs.rwp@carlo.seed', '$2b$10$ZrB4vbGNveY76sv9RWFA6uRbOXcWytJi8ftpPghcdARqa8wtQKBA.', 6, false, true, false);

INSERT INTO fleet_manager_vehicles (
  fleet_manager_id, vehicle_type, make, model, year, license_plate, chassis_number, color,
  seating_capacity, transmission_type, fuel_type, mileage_km,
  driver_service_option, self_drive_base_rate, pricing_model,
  vehicle_status, is_approved_by_admin, is_deleted, approved_by, created_by, updated_by,
  approval_status
) VALUES
  (1, 'sedan', 'Toyota', 'Corolla', 2022, 'KHI-AAB-001', 'CHS00000000000001', 'White', 5, 'automatic', 'petrol', 42000.00, 'self_drive_only', 4500.00, 'per_day', 'available', true, false, 1, 1, 1, 'approved'),
  (1, 'sedan', 'Honda', 'Civic', 2023, 'KHI-AAB-002', 'CHS00000000000002', 'Silver', 5, 'automatic', 'petrol', 18000.00, 'self_drive_only', 6000.00, 'per_day', 'available', true, false, 1, 1, 1, 'approved'),
  (2, 'hatchback', 'Suzuki', 'Cultus', 2021, 'LHR-BBC-101', 'CHS00000000000003', 'Grey', 5, 'manual', 'petrol', 55000.00, 'self_drive_only', 3000.00, 'per_day', 'available', true, false, 1, 2, 2, 'approved'),
  (2, 'suv', 'Toyota', 'Fortuner', 2022, 'LHR-BBC-102', 'CHS00000000000004', 'Black', 7, 'automatic', 'diesel', 32000.00, 'self_drive_only', 12000.00, 'per_day', 'available', true, false, 1, 2, 2, 'approved'),
  (3, 'suv', 'Honda', 'BR-V', 2022, 'ISB-CCD-201', 'CHS00000000000005', 'Pearl White', 7, 'automatic', 'petrol', 28000.00, 'self_drive_only', 7500.00, 'per_day', 'available', true, false, 1, 3, 3, 'approved'),
  (3, 'van', 'Toyota', 'Hiace', 2020, 'ISB-CCD-202', 'CHS00000000000006', 'White', 13, 'manual', 'diesel', 88000.00, 'self_drive_only', 9000.00, 'per_day', 'available', true, false, 1, 3, 3, 'approved'),
  (4, 'hatchback', 'Suzuki', 'Alto', 2023, 'KHI-DDE-301', 'CHS00000000000007', 'Red', 5, 'manual', 'petrol', 12000.00, 'self_drive_only', 2800.00, 'per_day', 'available', true, false, 1, 4, 4, 'approved'),
  (5, 'suv', 'Kia', 'Sportage', 2023, 'LHR-EEF-401', 'CHS00000000000008', 'Blue', 5, 'automatic', 'petrol', 15000.00, 'self_drive_only', 10000.00, 'per_day', 'available', true, false, 1, 5, 5, 'approved');

INSERT INTO fleet_manager_vehicle_documents (vehicle_id, doc_type, document_url, verification_status, verified_by, verified_at)
VALUES
  (1, 'image_coverimg', 'https://res.cloudinary.com/dks3aw1fu/image/upload/v1776021972/carlo/vehicles/seed-toyota-corolla.jpg', 'verified', 1, now()),
  (2, 'image_coverimg', 'https://res.cloudinary.com/dks3aw1fu/image/upload/v1776021973/carlo/vehicles/seed-honda-civic.jpg', 'verified', 1, now()),
  (3, 'image_coverimg', 'https://res.cloudinary.com/dks3aw1fu/image/upload/v1776021974/carlo/vehicles/seed-suzuki-cultus.jpg', 'verified', 1, now()),
  (4, 'image_coverimg', 'https://res.cloudinary.com/dks3aw1fu/image/upload/v1776021975/carlo/vehicles/seed-toyota-fortuner.jpg', 'verified', 1, now()),
  (5, 'image_coverimg', 'https://res.cloudinary.com/dks3aw1fu/image/upload/v1776021976/carlo/vehicles/seed-honda-brv.jpg', 'verified', 1, now()),
  (6, 'image_coverimg', 'https://res.cloudinary.com/dks3aw1fu/image/upload/v1776021978/carlo/vehicles/seed-toyota-hiace.jpg', 'verified', 1, now()),
  (7, 'image_coverimg', 'https://res.cloudinary.com/dks3aw1fu/image/upload/v1776021979/carlo/vehicles/seed-suzuki-alto.jpg', 'verified', 1, now()),
  (8, 'image_coverimg', 'https://res.cloudinary.com/dks3aw1fu/image/upload/v1776021979/carlo/vehicles/seed-kia-sportage.jpg', 'verified', 1, now());

INSERT INTO users (first_name, last_name, contact, email, password, is_delete, is_active)
VALUES
  ('Ali', 'Hassan', '03001234567', 'ali.hassan@gmail.com', '$2b$10$nVqZSHINgOXOmev19Oi6F.dMvTVHgJH7qq1l8KGxOLzGsnsLdVsFa', false, true),
  ('Fatima', 'Khan', '03111234567', 'fatima.khan@gmail.com', '$2b$10$nVqZSHINgOXOmev19Oi6F.dMvTVHgJH7qq1l8KGxOLzGsnsLdVsFa', false, true),
  ('Omar', 'Sheikh', '03211234567', 'omar.sheikh@gmail.com', '$2b$10$nVqZSHINgOXOmev19Oi6F.dMvTVHgJH7qq1l8KGxOLzGsnsLdVsFa', false, true),
  ('Zara', 'Malik', '03321234567', 'zara.malik@gmail.com', '$2b$10$nVqZSHINgOXOmev19Oi6F.dMvTVHgJH7qq1l8KGxOLzGsnsLdVsFa', false, true),
  ('Bilal', 'Ahmed', '03451234567', 'bilal.ahmed@gmail.com', '$2b$10$nVqZSHINgOXOmev19Oi6F.dMvTVHgJH7qq1l8KGxOLzGsnsLdVsFa', false, true);

INSERT INTO bookings (
  booking_code, pickup_date, return_date, pickup_location, return_location,
  service_type, price_model, payment_status, total_days, total_hours,
  base_rate_per_day_or_hour, driver_rate_per_hour, driver_hours_per_day,
  initial_total_charge, extra_charges_applied, final_amount_settled,
  status, fleet_manager_id, user_id, vehicle_id
) VALUES
  ('BK-20260310-KHI01', '2026-03-10 09:00:00', '2026-03-13 18:00:00', 'Jinnah International Airport T1', 'Clifton Beach parking', 'self_drive', 'per_day', 'full_paid', 3, 0, 4500.00, 0.00, 0, 13500.00, 0.00, 13500.00, 'confirmed', 1, 1, 1),
  ('BK-20260315-LHR01', '2026-03-15 08:00:00', '2026-03-18 20:00:00', 'Lahore Ring Road exit', 'Packages Mall', 'self_drive', 'per_day', 'full_paid', 3, 0, 12000.00, 0.00, 0, 36000.00, 0.00, 36000.00, 'confirmed', 2, 2, 4),
  ('BK-20260320-ISB01', '2026-03-20 07:00:00', '2026-03-22 19:00:00', 'Islamabad Serena Hotel', 'Faisal Mosque visitor lot', 'self_drive', 'per_day', 'advance_paid', 2, 0, 7500.00, 0.00, 0, 15000.00, 0.00, NULL, 'confirmed', 3, 3, 5),
  ('BK-20260228-LHR02', '2026-02-28 10:00:00', '2026-03-02 10:00:00', 'Johar Town Block R', 'Allama Iqbal Airport drop', 'self_drive', 'per_day', 'full_paid', 2, 0, 10000.00, 0.00, 0, 20000.00, 500.00, 20500.00, 'completed', 5, 4, 8);

INSERT INTO vehicle_ratings (rating, comment, user_id, vehicle_id) VALUES
  (5, 'Smooth pickup near Clifton — AC was excellent for Karachi heat.', 1, 1),
  (4, 'Good fuel economy for city driving.', 2, 1),
  (5, 'Civic felt solid on Motorway M2; would rent again.', 3, 2),
  (4, 'Clean interior, minor scratch on bumper noted at handover.', 1, 2),
  (5, 'Budget-friendly Cultus for Gulberg errands.', 4, 3),
  (5, 'Fortuner handled northern route comfortably — great for family trip.', 5, 4),
  (4, 'Powerful SUV; deposit process was straightforward.', 1, 4),
  (5, 'BR-V perfect for 6 people + luggage to Murree.', 2, 5),
  (4, 'Hiace was on time for office shuttle — driver hours clear in contract.', 3, 6),
  (5, 'Alto ideal for short Saddar runs; very economical.', 4, 7),
  (4, 'Sportage tech package was a nice touch.', 5, 8),
  (5, 'Lahore weekend rental — pickup from hub was quick.', 1, 8);

COMMIT;
