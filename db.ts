import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'portoassist.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    return bcrypt.compareSync(password, storedHash);
  }
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('PASSENGER', 'HELPER')),
      preferred_language TEXT NOT NULL DEFAULT 'en',
      account_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'BLOCKED')),
      reset_code TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS passengers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      age INTEGER,
      accessibility_requirements TEXT,
      emergency_contact TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS helpers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      avatar_url TEXT,
      languages_known TEXT NOT NULL,
      experience_years INTEGER NOT NULL DEFAULT 1,
      assistance_categories TEXT NOT NULL,
      current_location TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      max_bags INTEGER NOT NULL DEFAULT 6,
      max_weight_kg INTEGER NOT NULL DEFAULT 80,
      is_available INTEGER NOT NULL DEFAULT 1,
      rating REAL NOT NULL DEFAULT 5.0,
      total_reviews INTEGER NOT NULL DEFAULT 0,
      completed_jobs INTEGER NOT NULL DEFAULT 0,
      verified_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (verified_status IN ('ACTIVE', 'BLOCKED')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_code TEXT NOT NULL UNIQUE,
      passenger_id INTEGER NOT NULL,
      passenger_name TEXT NOT NULL,
      passenger_phone TEXT NOT NULL,
      passenger_email TEXT NOT NULL,
      travel_type TEXT NOT NULL CHECK (travel_type IN ('Airport', 'Railway Station', 'Bus Station')),
      pickup_location TEXT NOT NULL,
      pickup_lat REAL NOT NULL,
      pickup_lng REAL NOT NULL,
      pickup_place_id TEXT,
      dropoff_location TEXT NOT NULL,
      dropoff_lat REAL NOT NULL,
      dropoff_lng REAL NOT NULL,
      dropoff_place_id TEXT,
      travel_date TEXT NOT NULL,
      travel_time TEXT NOT NULL,
      num_bags INTEGER NOT NULL DEFAULT 1,
      luggage_weight_kg REAL NOT NULL DEFAULT 10,
      num_passengers INTEGER NOT NULL DEFAULT 1,
      mobility_assistance INTEGER NOT NULL DEFAULT 0,
      wheelchair_assistance INTEGER NOT NULL DEFAULT 0,
      assistance_category TEXT,
      special_requirements TEXT,
      preferred_language TEXT NOT NULL DEFAULT 'en',
      distance_km REAL NOT NULL DEFAULT 1.5,
      estimated_duration_min INTEGER NOT NULL DEFAULT 30,
      base_fare REAL NOT NULL,
      distance_fare REAL NOT NULL,
      luggage_fare REAL NOT NULL,
      mobility_fare REAL NOT NULL,
      extra_fare REAL NOT NULL,
      estimated_fare REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK (payment_method IN ('UPI', 'CASH')),
      status TEXT NOT NULL DEFAULT 'Booking Requested' CHECK (status IN (
        'Booking Requested',
        'Searching for Helper',
        'Helper Assigned',
        'Helper Accepted',
        'Helper On the Way',
        'Assistance Started',
        'Assistance Completed',
        'Booking Cancelled'
      )),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (passenger_id) REFERENCES passengers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS helper_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      helper_id INTEGER NOT NULL,
      assignment_type TEXT NOT NULL DEFAULT 'AUTO' CHECK (assignment_type IN ('AUTO', 'MANUAL')),
      match_score REAL NOT NULL DEFAULT 0,
      eta_minutes INTEGER NOT NULL DEFAULT 5,
      distance_km REAL NOT NULL DEFAULT 0.5,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'TIMEOUT', 'COMPLETED', 'CANCELLED')),
      assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
      responded_at TEXT,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (helper_id) REFERENCES helpers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL UNIQUE,
      amount REAL NOT NULL,
      method TEXT NOT NULL CHECK (method IN ('UPI', 'CASH')),
      upi_id TEXT,
      transaction_ref TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID_SIMULATED', 'CASH_DUE', 'REFUNDED')),
      paid_at TEXT,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL UNIQUE,
      passenger_id INTEGER NOT NULL,
      helper_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (passenger_id) REFERENCES passengers(id) ON DELETE CASCADE,
      FOREIGN KEY (helper_id) REFERENCES helpers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      booking_id INTEGER,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS otp_verification (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL UNIQUE,
      otp_code TEXT NOT NULL,
      qr_token TEXT NOT NULL,
      is_verified INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      verified_at TEXT,
      verified_by_helper_id INTEGER,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (verified_by_helper_id) REFERENCES helpers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS support_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      booking_id INTEGER,
      category TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
      admin_response TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS account_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_user_id INTEGER NOT NULL,
      reported_user_id INTEGER NOT NULL,
      booking_id INTEGER,
      reason TEXT NOT NULL,
      details TEXT,
      action_taken TEXT NOT NULL DEFAULT 'LOGGED',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS user_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blocker_user_id INTEGER NOT NULL,
      blocked_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(blocker_user_id, blocked_user_id),
      FOREIGN KEY (blocker_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (blocked_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Drop legacy admin table and migrate legacy schema constraints cleanly if an existing DB file is loaded
  db.exec(`DROP TABLE IF EXISTS admin;`);

  const userCols = db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[];
  if (!userCols.some((c) => c.name === 'account_status')) {
    db.exec(`ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'ACTIVE'`);
  }

  const usersMeta = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`).get() as { sql: string } | undefined;
  const helpersMeta = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='helpers'`).get() as { sql: string } | undefined;
  const bookingsMeta = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='bookings'`).get() as { sql: string } | undefined;
  const assignMeta = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='helper_assignments'`).get() as { sql: string } | undefined;

  const needsSchemaMigration =
    (usersMeta?.sql && usersMeta.sql.includes("'ADMIN'")) ||
    (helpersMeta?.sql && helpersMeta.sql.includes("'PENDING'")) ||
    (bookingsMeta?.sql && !bookingsMeta.sql.includes("'Searching for Helper'")) ||
    (assignMeta?.sql && !assignMeta.sql.includes("'TIMEOUT'"));

  if (needsSchemaMigration) {
    db.pragma('foreign_keys = OFF');
    db.transaction(() => {
      db.exec(`DELETE FROM users WHERE role NOT IN ('PASSENGER', 'HELPER');`);

      if (usersMeta?.sql && usersMeta.sql.includes("'ADMIN'")) {
        db.exec(`
          CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('PASSENGER', 'HELPER')),
            preferred_language TEXT NOT NULL DEFAULT 'en',
            account_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'BLOCKED')),
            reset_code TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          INSERT INTO users_new (id, full_name, email, phone, password_hash, role, preferred_language, account_status, reset_code, created_at)
          SELECT id, full_name, email, phone, password_hash, role, preferred_language,
            COALESCE(account_status, 'ACTIVE'), reset_code, created_at
          FROM users;
          DROP TABLE users;
          ALTER TABLE users_new RENAME TO users;
        `);
      }

      if (helpersMeta?.sql && helpersMeta.sql.includes("'PENDING'")) {
        db.exec(`
          CREATE TABLE helpers_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            avatar_url TEXT,
            languages_known TEXT NOT NULL,
            experience_years INTEGER NOT NULL DEFAULT 1,
            assistance_categories TEXT NOT NULL,
            current_location TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            max_bags INTEGER NOT NULL DEFAULT 6,
            max_weight_kg INTEGER NOT NULL DEFAULT 80,
            is_available INTEGER NOT NULL DEFAULT 1,
            rating REAL NOT NULL DEFAULT 5.0,
            total_reviews INTEGER NOT NULL DEFAULT 0,
            completed_jobs INTEGER NOT NULL DEFAULT 0,
            verified_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (verified_status IN ('ACTIVE', 'BLOCKED')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );
          INSERT INTO helpers_new (
            id, user_id, avatar_url, languages_known, experience_years, assistance_categories,
            current_location, lat, lng, max_bags, max_weight_kg, is_available, rating, total_reviews, completed_jobs, verified_status
          )
          SELECT id, user_id, avatar_url, languages_known, experience_years, assistance_categories,
            current_location, lat, lng, max_bags, max_weight_kg, is_available, rating, total_reviews, completed_jobs,
            CASE WHEN verified_status = 'SUSPENDED' THEN 'BLOCKED' ELSE 'ACTIVE' END
          FROM helpers;
          DROP TABLE helpers;
          ALTER TABLE helpers_new RENAME TO helpers;
        `);
      }

      if (bookingsMeta?.sql && !bookingsMeta.sql.includes("'Searching for Helper'")) {
        db.exec(`
          CREATE TABLE bookings_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_code TEXT NOT NULL UNIQUE,
            passenger_id INTEGER NOT NULL,
            passenger_name TEXT NOT NULL,
            passenger_phone TEXT NOT NULL,
            passenger_email TEXT NOT NULL,
            travel_type TEXT NOT NULL CHECK (travel_type IN ('Airport', 'Railway Station', 'Bus Station')),
            pickup_location TEXT NOT NULL,
            pickup_lat REAL NOT NULL,
            pickup_lng REAL NOT NULL,
            pickup_place_id TEXT,
            dropoff_location TEXT NOT NULL,
            dropoff_lat REAL NOT NULL,
            dropoff_lng REAL NOT NULL,
            dropoff_place_id TEXT,
            travel_date TEXT NOT NULL,
            travel_time TEXT NOT NULL,
            num_bags INTEGER NOT NULL DEFAULT 1,
            luggage_weight_kg REAL NOT NULL DEFAULT 10,
            num_passengers INTEGER NOT NULL DEFAULT 1,
            mobility_assistance INTEGER NOT NULL DEFAULT 0,
            wheelchair_assistance INTEGER NOT NULL DEFAULT 0,
            assistance_category TEXT,
            special_requirements TEXT,
            preferred_language TEXT NOT NULL DEFAULT 'en',
            distance_km REAL NOT NULL DEFAULT 1.5,
            estimated_duration_min INTEGER NOT NULL DEFAULT 30,
            base_fare REAL NOT NULL,
            distance_fare REAL NOT NULL,
            luggage_fare REAL NOT NULL,
            mobility_fare REAL NOT NULL,
            extra_fare REAL NOT NULL,
            estimated_fare REAL NOT NULL,
            payment_method TEXT NOT NULL CHECK (payment_method IN ('UPI', 'CASH')),
            status TEXT NOT NULL DEFAULT 'Booking Requested' CHECK (status IN (
              'Booking Requested',
              'Searching for Helper',
              'Helper Assigned',
              'Helper Accepted',
              'Helper On the Way',
              'Assistance Started',
              'Assistance Completed',
              'Booking Cancelled'
            )),
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (passenger_id) REFERENCES passengers(id) ON DELETE CASCADE
          );
          INSERT INTO bookings_new (
            id, booking_code, passenger_id, passenger_name, passenger_phone, passenger_email,
            travel_type, pickup_location, pickup_lat, pickup_lng, pickup_place_id,
            dropoff_location, dropoff_lat, dropoff_lng, dropoff_place_id,
            travel_date, travel_time, num_bags, luggage_weight_kg, num_passengers,
            mobility_assistance, wheelchair_assistance, assistance_category, special_requirements, preferred_language,
            distance_km, estimated_duration_min, base_fare, distance_fare, luggage_fare, mobility_fare, extra_fare, estimated_fare,
            payment_method, status, created_at, updated_at
          )
          SELECT
            id, booking_code, passenger_id, passenger_name, passenger_phone, passenger_email,
            travel_type, pickup_location, pickup_lat, pickup_lng, pickup_place_id,
            dropoff_location, dropoff_lat, dropoff_lng, dropoff_place_id,
            travel_date, travel_time, num_bags, luggage_weight_kg, num_passengers,
            mobility_assistance, wheelchair_assistance, assistance_category, special_requirements, preferred_language,
            distance_km, estimated_duration_min, base_fare, distance_fare, luggage_fare, mobility_fare, extra_fare, estimated_fare,
            payment_method, status, created_at, updated_at
          FROM bookings;
          DROP TABLE bookings;
          ALTER TABLE bookings_new RENAME TO bookings;
        `);
      }

      if (assignMeta?.sql && !assignMeta.sql.includes("'TIMEOUT'")) {
        db.exec(`
          CREATE TABLE helper_assignments_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER NOT NULL,
            helper_id INTEGER NOT NULL,
            assignment_type TEXT NOT NULL DEFAULT 'AUTO' CHECK (assignment_type IN ('AUTO', 'MANUAL')),
            match_score REAL NOT NULL DEFAULT 0,
            eta_minutes INTEGER NOT NULL DEFAULT 5,
            distance_km REAL NOT NULL DEFAULT 0.5,
            status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'TIMEOUT', 'COMPLETED', 'CANCELLED')),
            assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
            responded_at TEXT,
            FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
            FOREIGN KEY (helper_id) REFERENCES helpers(id) ON DELETE CASCADE
          );
          INSERT INTO helper_assignments_new (
            id, booking_id, helper_id, assignment_type, match_score, eta_minutes, distance_km, status, assigned_at, responded_at
          )
          SELECT id, booking_id, helper_id, assignment_type, match_score, eta_minutes, distance_km, status, assigned_at, responded_at
          FROM helper_assignments;
          DROP TABLE helper_assignments;
          ALTER TABLE helper_assignments_new RENAME TO helper_assignments;
        `);
      }
    })();
    db.pragma('foreign_keys = ON');
  }

  // Ensure new Google Place ID columns exist on pre-existing databases
  const bookingCols = db.prepare(`PRAGMA table_info(bookings)`).all() as { name: string }[];
  const colNames = new Set(bookingCols.map((c) => c.name));
  if (!colNames.has('pickup_place_id')) {
    db.exec(`ALTER TABLE bookings ADD COLUMN pickup_place_id TEXT`);
  }
  if (!colNames.has('dropoff_place_id')) {
    db.exec(`ALTER TABLE bookings ADD COLUMN dropoff_place_id TEXT`);
  }
  if (!colNames.has('assistance_category')) {
    db.exec(`ALTER TABLE bookings ADD COLUMN assistance_category TEXT`);
  }

  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (countRow.cnt === 0) {
    seedInitialData();
  }
}

function seedInitialData() {
  const insertUser = db.prepare(`
    INSERT INTO users (full_name, email, phone, password_hash, role, preferred_language)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertPassenger = db.prepare(`
    INSERT INTO passengers (user_id, age, accessibility_requirements, emergency_contact)
    VALUES (?, ?, ?, ?)
  `);
  const insertHelper = db.prepare(`
    INSERT INTO helpers (
      user_id, avatar_url, languages_known, experience_years, assistance_categories,
      current_location, lat, lng, max_bags, max_weight_kg, is_available, rating, total_reviews, completed_jobs, verified_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 1. Seed Passengers
  const pass1 = insertUser.run('Ananya Rao', 'ananya.rao@example.com', '+91 98450 11223', hashPassword('Pass@123'), 'PASSENGER', 'en');
  const p1Id = Number(insertPassenger.run(pass1.lastInsertRowid, 34, 'Traveling with senior parent; prefers elevator route', '+91 98450 99881').lastInsertRowid);

  const pass2 = insertUser.run('Mohan Sharma', 'mohan.sharma@example.com', '+91 98111 44556', hashPassword('Pass@123'), 'PASSENGER', 'hi');
  const p2Id = Number(insertPassenger.run(pass2.lastInsertRowid, 68, 'Wheelchair support and slow-paced platform transfer', '+91 98111 77665').lastInsertRowid);

  // 2. Seed Active Helpers with generated portrait URLs
  const hUser1 = insertUser.run('Arjun Nair', 'arjun.helper@portoassist.in', '+91 99001 22334', hashPassword('Helper@123'), 'HELPER', 'en');
  const h1Id = Number(insertHelper.run(
    hUser1.lastInsertRowid,
    '/src/assets/images/helper_avatar_arjun_1794979398701.jpg',
    'English, Kannada, Hindi',
    6,
    'Luggage Porter, Wheelchair Support, Airport Concierge, Senior Care',
    'Kempegowda International Airport — Terminal 1 Arrivals',
    13.1986,
    77.7066,
    8,
    120,
    1,
    4.92,
    48,
    142,
    'ACTIVE'
  ).lastInsertRowid);

  const hUser2 = insertUser.run('Lakshmi Devi', 'lakshmi.helper@portoassist.in', '+91 99002 33445', hashPassword('Helper@123'), 'HELPER', 'kn');
  const h2Id = Number(insertHelper.run(
    hUser2.lastInsertRowid,
    '/src/assets/images/helper_avatar_lakshmi_1794979399874.jpg',
    'English, Kannada',
    5,
    'Wheelchair Support, Mobility Escort, Medical Assistance, Railway Station',
    'KSR Bengaluru City Railway Station — Main Entrance',
    12.9784,
    77.5715,
    6,
    85,
    1,
    4.86,
    36,
    98,
    'ACTIVE'
  ).lastInsertRowid);

  const hUser3 = insertUser.run('Rohan Verma', 'rohan.helper@portoassist.in', '+91 99003 44556', hashPassword('Helper@123'), 'HELPER', 'hi');
  const h3Id = Number(insertHelper.run(
    hUser3.lastInsertRowid,
    '/src/assets/images/helper_avatar_rohan_1794979399928.jpg',
    'English, Hindi, Kannada',
    8,
    'Luggage Porter, Heavy Baggage, Bus Terminal, Group Assistance',
    'Kempegowda Bus Station (Majestic) — Platform Bay 2',
    12.9767,
    77.5713,
    10,
    140,
    1,
    4.78,
    29,
    76,
    'ACTIVE'
  ).lastInsertRowid);

  // 3. Seed Sample Bookings (1 Active in progress, 1 Completed with review, 1 Assigned)
  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      booking_code, passenger_id, passenger_name, passenger_phone, passenger_email,
      travel_type, pickup_location, pickup_lat, pickup_lng, dropoff_location, dropoff_lat, dropoff_lng,
      travel_date, travel_time, num_bags, luggage_weight_kg, num_passengers,
      mobility_assistance, wheelchair_assistance, special_requirements, preferred_language,
      distance_km, estimated_duration_min, base_fare, distance_fare, luggage_fare, mobility_fare, extra_fare, estimated_fare,
      payment_method, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const today = new Date().toISOString().slice(0, 10);

  // Active booking for Ananya Rao assigned to Lakshmi Devi at KSR Bengaluru
  const b1 = Number(insertBooking.run(
    'PA-2026-1041', p1Id, 'Ananya Rao', '+91 98450 11223', 'ananya.rao@example.com',
    'Railway Station', 'KSR Bengaluru City — Gate 1 Pickup', 12.9781, 77.5702,
    'KSR Bengaluru City — Platform 6 Lift', 12.9794, 77.5731,
    today, '14:30', 3, 42, 2, 1, 1, 'Need wheelchair near Gate 1 ramp', 'en',
    0.8, 35, 99, 18, 183, 180, 40, 520, 'UPI', 'Helper On the Way'
  ).lastInsertRowid);

  db.prepare(`
    INSERT INTO helper_assignments (booking_id, helper_id, assignment_type, match_score, eta_minutes, distance_km, status, responded_at)
    VALUES (?, ?, 'AUTO', 94.5, 4, 0.35, 'ACCEPTED', datetime('now'))
  `).run(b1, h2Id);

  db.prepare(`
    INSERT INTO payments (booking_id, amount, method, upi_id, transaction_ref, status, paid_at)
    VALUES (?, 520, 'UPI', 'ananya@okicici', 'UPI-SIM-849201', 'PAID_SIMULATED', datetime('now'))
  `).run(b1);

  db.prepare(`
    INSERT INTO otp_verification (booking_id, otp_code, qr_token, is_verified)
    VALUES (?, '482915', 'PA-QR-1041-482915', 0)
  `).run(b1);

  db.prepare(`
    INSERT INTO notifications (user_id, booking_id, type, title, message)
    VALUES
      (?, ?, 'HELPER_ASSIGNED', 'Helper Assigned: Lakshmi Devi', 'Lakshmi Devi (4.86★) is on the way to KSR Bengaluru City — Gate 1 Pickup. Share OTP 482915 on arrival.'),
      (?, ?, 'NEW_ASSIGNMENT', 'Active Job: PA-2026-1041', 'Passenger Ananya Rao needs wheelchair and 3-bag assistance at KSR Bengaluru City Gate 1.')
  `).run(pass1.lastInsertRowid, b1, hUser2.lastInsertRowid, b1);

  // Completed booking for Mohan Sharma with Arjun Nair at Airport
  const b2 = Number(insertBooking.run(
    'PA-2026-1038', p2Id, 'Mohan Sharma', '+91 98111 44556', 'mohan.sharma@example.com',
    'Airport', 'Kempegowda Airport T1 — Curbside Lane 4', 13.1981, 77.7052,
    'Kempegowda Airport T1 — Priority Security Gate', 13.1995, 77.7078,
    today, '09:15', 2, 30, 1, 1, 1, 'Senior traveler Hindi speaking helper preferred', 'hi',
    0.9, 40, 149, 20, 110, 180, 40, 499, 'CASH', 'Assistance Completed'
  ).lastInsertRowid);

  db.prepare(`
    INSERT INTO helper_assignments (booking_id, helper_id, assignment_type, match_score, eta_minutes, distance_km, status, responded_at)
    VALUES (?, ?, 'AUTO', 96.2, 3, 0.28, 'COMPLETED', datetime('now'))
  `).run(b2, h1Id);

  db.prepare(`
    INSERT INTO payments (booking_id, amount, method, transaction_ref, status, paid_at)
    VALUES (?, 499, 'CASH', 'CASH-REC-1038', 'PAID_SIMULATED', datetime('now'))
  `).run(b2);

  db.prepare(`
    INSERT INTO otp_verification (booking_id, otp_code, qr_token, is_verified, verified_at, verified_by_helper_id)
    VALUES (?, '739204', 'PA-QR-1038-739204', 1, datetime('now'), ?)
  `).run(b2, h1Id);

  db.prepare(`
    INSERT INTO reviews (booking_id, passenger_id, helper_id, rating, comment)
    VALUES (?, ?, ?, 5, 'Arjun met us right at Lane 4 with a wheelchair and spoke Hindi fluently with my father. Smooth handover at security.')
  `).run(b2, p2Id, h1Id);

  // Pending booking at Majestic Bus Station for Rohan Verma
  const b3 = Number(insertBooking.run(
    'PA-2026-1042', p1Id, 'Ananya Rao', '+91 98450 11223', 'ananya.rao@example.com',
    'Bus Station', 'Majestic Bus Terminal — Bay 14 Arrival', 12.9762, 77.5708,
    'Majestic Metro Interchange — East Gate', 12.9772, 77.5724,
    today, '18:00', 4, 58, 2, 0, 0, 'Heavy suitcases, lift access preferred', 'en',
    0.6, 25, 79, 15, 272, 0, 0, 366, 'UPI', 'Helper Assigned'
  ).lastInsertRowid);

  db.prepare(`
    INSERT INTO helper_assignments (booking_id, helper_id, assignment_type, match_score, eta_minutes, distance_km, status)
    VALUES (?, ?, 'AUTO', 91.0, 5, 0.42, 'PENDING')
  `).run(b3, h3Id);

  db.prepare(`
    INSERT INTO payments (booking_id, amount, method, transaction_ref, status)
    VALUES (?, 366, 'UPI', 'UPI-PEND-1042', 'PENDING')
  `).run(b3);

  db.prepare(`
    INSERT INTO otp_verification (booking_id, otp_code, qr_token, is_verified)
    VALUES (?, '615830', 'PA-QR-1042-615830', 0)
  `).run(b3);

  db.prepare(`
    INSERT INTO notifications (user_id, booking_id, type, title, message)
    VALUES (?, ?, 'NEW_ASSIGNMENT', 'New Assistance Request PA-2026-1042', 'Pickup at Majestic Bus Terminal Bay 14 (4 bags, 58 kg). Please accept or reject.')
  `).run(hUser3.lastInsertRowid, b3);

  db.prepare(`
    INSERT INTO support_requests (user_id, booking_id, category, subject, description, status, admin_response)
    VALUES (?, ?, 'Accessibility Feedback', 'Wheelchair ramp signage at KSR Gate 1', 'Appreciate the quick help; adding a reflective sign near Gate 1 would help evening arrivals.', 'RESOLVED', 'Shared with station operations team and added to our Gate 1 arrival instructions.')
  `).run(pass1.lastInsertRowid, b1);
}
