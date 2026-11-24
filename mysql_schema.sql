-- PortoAssist Relational Database Schema (MySQL 8.0+)
-- Compatible with MySQL Workbench for standalone Spring Boot deployment

CREATE DATABASE IF NOT EXISTS portoassist_db;
USE portoassist_db;

CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  phone VARCHAR(24) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('PASSENGER', 'HELPER', 'ADMIN') NOT NULL,
  preferred_language VARCHAR(16) NOT NULL DEFAULT 'en',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE passengers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  age INT NULL,
  accessibility_requirements TEXT NULL,
  emergency_contact VARCHAR(60) NULL,
  CONSTRAINT fk_passenger_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE helpers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  avatar_url VARCHAR(255) NULL,
  languages_known VARCHAR(255) NOT NULL,
  experience_years INT NOT NULL DEFAULT 1,
  assistance_categories VARCHAR(255) NOT NULL,
  current_location VARCHAR(255) NOT NULL,
  lat DOUBLE NOT NULL,
  lng DOUBLE NOT NULL,
  max_bags INT NOT NULL DEFAULT 6,
  max_weight_kg INT NOT NULL DEFAULT 80,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  rating DECIMAL(3,2) NOT NULL DEFAULT 5.00,
  total_reviews INT NOT NULL DEFAULT 0,
  completed_jobs INT NOT NULL DEFAULT 0,
  verified_status ENUM('VERIFIED', 'PENDING', 'SUSPENDED') NOT NULL DEFAULT 'VERIFIED',
  CONSTRAINT fk_helper_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE admin (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  department VARCHAR(100) NOT NULL DEFAULT 'Operations',
  privilege_level VARCHAR(50) NOT NULL DEFAULT 'SUPER_ADMIN',
  CONSTRAINT fk_admin_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE bookings (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_code VARCHAR(32) NOT NULL UNIQUE,
  passenger_id BIGINT NOT NULL,
  passenger_name VARCHAR(120) NOT NULL,
  passenger_phone VARCHAR(24) NOT NULL,
  passenger_email VARCHAR(160) NOT NULL,
  travel_type ENUM('Airport', 'Railway Station', 'Bus Station') NOT NULL,
  pickup_location VARCHAR(255) NOT NULL,
  pickup_lat DOUBLE NOT NULL,
  pickup_lng DOUBLE NOT NULL,
  pickup_place_id VARCHAR(128) NULL,
  dropoff_location VARCHAR(255) NOT NULL,
  dropoff_lat DOUBLE NOT NULL,
  dropoff_lng DOUBLE NOT NULL,
  dropoff_place_id VARCHAR(128) NULL,
  travel_date DATE NOT NULL,
  travel_time VARCHAR(16) NOT NULL,
  num_bags INT NOT NULL DEFAULT 1,
  luggage_weight_kg DOUBLE NOT NULL DEFAULT 10,
  num_passengers INT NOT NULL DEFAULT 1,
  mobility_assistance BOOLEAN NOT NULL DEFAULT FALSE,
  wheelchair_assistance BOOLEAN NOT NULL DEFAULT FALSE,
  assistance_category VARCHAR(120) NULL,
  special_requirements TEXT NULL,
  preferred_language VARCHAR(16) NOT NULL DEFAULT 'en',
  distance_km DOUBLE NOT NULL DEFAULT 1.5,
  estimated_duration_min INT NOT NULL DEFAULT 30,
  base_fare DECIMAL(10,2) NOT NULL,
  distance_fare DECIMAL(10,2) NOT NULL,
  luggage_fare DECIMAL(10,2) NOT NULL,
  mobility_fare DECIMAL(10,2) NOT NULL,
  extra_fare DECIMAL(10,2) NOT NULL,
  estimated_fare DECIMAL(10,2) NOT NULL,
  payment_method ENUM('UPI', 'CASH') NOT NULL DEFAULT 'UPI',
  status ENUM(
    'Booking Requested',
    'Helper Assigned',
    'Helper On the Way',
    'Assistance Started',
    'Assistance Completed',
    'Booking Cancelled'
  ) NOT NULL DEFAULT 'Booking Requested',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_passenger FOREIGN KEY (passenger_id) REFERENCES passengers(id) ON DELETE CASCADE
);

CREATE TABLE helper_assignments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT NOT NULL,
  helper_id BIGINT NOT NULL,
  assignment_type ENUM('AUTO', 'MANUAL') NOT NULL DEFAULT 'AUTO',
  match_score DOUBLE NOT NULL DEFAULT 0,
  eta_minutes INT NOT NULL DEFAULT 5,
  distance_km DOUBLE NOT NULL DEFAULT 0.5,
  status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  CONSTRAINT fk_assignment_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignment_helper FOREIGN KEY (helper_id) REFERENCES helpers(id) ON DELETE CASCADE
);

CREATE TABLE payments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  method ENUM('UPI', 'CASH') NOT NULL,
  upi_id VARCHAR(120) NULL,
  transaction_ref VARCHAR(80) NOT NULL,
  status ENUM('PENDING', 'PAID_SIMULATED', 'CASH_DUE', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
  paid_at TIMESTAMP NULL,
  CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE TABLE reviews (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT NOT NULL UNIQUE,
  passenger_id BIGINT NOT NULL,
  helper_id BIGINT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_review_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_passenger FOREIGN KEY (passenger_id) REFERENCES passengers(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_helper FOREIGN KEY (helper_id) REFERENCES helpers(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  booking_id BIGINT NULL,
  type VARCHAR(48) NOT NULL,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

CREATE TABLE otp_verification (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT NOT NULL UNIQUE,
  otp_code VARCHAR(12) NOT NULL,
  qr_token VARCHAR(128) NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INT NOT NULL DEFAULT 0,
  verified_at TIMESTAMP NULL,
  verified_by_helper_id BIGINT NULL,
  CONSTRAINT fk_otp_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_otp_helper FOREIGN KEY (verified_by_helper_id) REFERENCES helpers(id) ON DELETE SET NULL
);

CREATE TABLE support_requests (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  booking_id BIGINT NULL,
  category VARCHAR(64) NOT NULL,
  subject VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
  admin_response TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_support_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_support_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);
