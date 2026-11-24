import crypto from 'node:crypto';
import { Router, type Response } from 'express';
import QRCode from 'qrcode';
import { db, hashPassword, verifyPassword } from './db.ts';
import {
  requireAuth,
  requireRole,
  signToken,
  verifyToken,
  type AuthenticatedRequest,
  type UserRole,
} from './auth.ts';
import { calculateFare, haversineKm, type TravelType } from './services/fare.ts';
import { findMatchingHelpers } from './services/matching.ts';
import { parseVoiceUtteranceWithGemini } from './services/voiceNlu.ts';
import { broadcastEvent } from './ws.ts';

export const apiRouter = Router();

function createNotification(
  userId: number,
  bookingId: number | null,
  type: string,
  title: string,
  message: string
) {
  const res = db
    .prepare(
      `INSERT INTO notifications (user_id, booking_id, type, title, message) VALUES (?, ?, ?, ?, ?)`
    )
    .run(userId, bookingId, type, title, message);

  const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(res.lastInsertRowid);
  broadcastEvent('notification:new', notif, [userId]);
  return notif;
}

function getFullBooking(bookingId: number) {
  const booking = db
    .prepare(
      `
      SELECT
        b.*,
        p.user_id as passenger_user_id,
        p.age as passenger_age,
        p.accessibility_requirements as passenger_accessibility
      FROM bookings b
      JOIN passengers p ON p.id = b.passenger_id
      WHERE b.id = ?
    `
    )
    .get(bookingId) as Record<string, unknown> | undefined;

  if (!booking) return null;

  const assignment = db
    .prepare(
      `
      SELECT
        ha.*,
        u.full_name as helper_name,
        u.phone as helper_phone,
        u.id as helper_user_id,
        h.avatar_url as helper_avatar,
        h.rating as helper_rating,
        h.languages_known as helper_languages,
        h.current_location as helper_location,
        h.lat as helper_lat,
        h.lng as helper_lng,
        h.is_available as helper_available,
        h.experience_years as helper_experience
      FROM helper_assignments ha
      JOIN helpers h ON h.id = ha.helper_id
      JOIN users u ON u.id = h.user_id
      WHERE ha.booking_id = ? AND ha.status NOT IN ('REJECTED', 'TIMEOUT', 'CANCELLED')
      ORDER BY ha.id DESC
      LIMIT 1
    `
    )
    .get(bookingId) as Record<string, unknown> | undefined;

  const payment = db.prepare('SELECT * FROM payments WHERE booking_id = ?').get(bookingId);
  const otp = db
    .prepare(
      'SELECT id, booking_id, otp_code, qr_token, is_verified, attempts, verified_at FROM otp_verification WHERE booking_id = ?'
    )
    .get(bookingId);
  const review = db.prepare('SELECT * FROM reviews WHERE booking_id = ?').get(bookingId);

  return {
    ...booking,
    assignment: assignment || null,
    payment: payment || null,
    otp: otp || null,
    review: review || null,
  };
}

function getUserProfile(userId: number) {
  const user = db
    .prepare(
      'SELECT id, full_name, email, phone, role, preferred_language, account_status, created_at FROM users WHERE id = ?'
    )
    .get(userId) as Record<string, unknown> | undefined;
  if (!user) return null;

  if (user.role === 'PASSENGER') {
    const passenger = db.prepare('SELECT * FROM passengers WHERE user_id = ?').get(userId);
    return { ...user, passenger };
  }
  if (user.role === 'HELPER') {
    const helper = db.prepare('SELECT * FROM helpers WHERE user_id = ?').get(userId);
    return { ...user, helper };
  }
  return user;
}

// ---------- AUTHENTICATION ----------

function normalizePhoneDigits(raw: string): string {
  return String(raw || '').replace(/\D/g, '');
}

function findUserByIdentifier(identifier: string) {
  const trimmed = String(identifier || '').trim();
  const normalizedEmail = trimmed.toLowerCase();
  const digits = normalizePhoneDigits(trimmed);
  const last10 = digits.length >= 10 ? digits.slice(-10) : '';

  if (trimmed.includes('@')) {
    return db
      .prepare('SELECT * FROM users WHERE LOWER(email) = ?')
      .get(normalizedEmail) as
      | { id: number; email: string; phone: string; password_hash: string; role: UserRole; reset_code?: string | null }
      | undefined;
  }

  if (last10) {
    return db
      .prepare(
        "SELECT * FROM users WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), '(', '') LIKE ?"
      )
      .get(`%${last10}`) as
      | { id: number; email: string; phone: string; password_hash: string; role: UserRole; reset_code?: string | null }
      | undefined;
  }

  return db
    .prepare('SELECT * FROM users WHERE LOWER(email) = ?')
    .get(normalizedEmail) as
    | { id: number; email: string; phone: string; password_hash: string; role: UserRole; reset_code?: string | null }
    | undefined;
}

apiRouter.post('/auth/register/passenger', (req, res) => {
  const {
    fullName,
    email,
    phone,
    password,
    age,
    preferredLanguage = 'en',
    accessibilityRequirements = '',
    emergencyContact = '',
  } = req.body;

  const trimmedName = String(fullName || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const phoneDigits = normalizePhoneDigits(phone);

  if (trimmedName.length < 2) {
    res.status(400).json({ error: 'Please enter a valid full name.' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  if (phoneDigits.length < 10 || phoneDigits.length > 13) {
    res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    return;
  }
  if (!password || String(password).length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }

  const last10 = phoneDigits.slice(-10);
  const existingEmail = db
    .prepare('SELECT id FROM users WHERE LOWER(email) = ?')
    .get(normalizedEmail);
  if (existingEmail) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const existingPhone = db
    .prepare(
      "SELECT id FROM users WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE ?"
    )
    .get(`%${last10}`);
  if (existingPhone) {
    res.status(409).json({ error: 'An account with this mobile number already exists.' });
    return;
  }

  const tx = db.transaction(() => {
    const uRes = db
      .prepare(
        `INSERT INTO users (full_name, email, phone, password_hash, role, preferred_language) VALUES (?, ?, ?, ?, 'PASSENGER', ?)`
      )
      .run(
        trimmedName,
        normalizedEmail,
        String(phone).trim(),
        hashPassword(password),
        preferredLanguage
      );
    const userId = Number(uRes.lastInsertRowid);

    db.prepare(
      `INSERT INTO passengers (user_id, age, accessibility_requirements, emergency_contact) VALUES (?, ?, ?, ?)`
    ).run(userId, age ? Number(age) : null, accessibilityRequirements, emergencyContact);

    return userId;
  });

  const userId = tx();
  const token = signToken({ userId, email: normalizedEmail, role: 'PASSENGER' });
  createNotification(
    userId,
    null,
    'WELCOME',
    'Welcome to PortoAssist',
    'Your passenger profile is ready. You can book luggage or mobility assistance anytime.'
  );

  res.status(201).json({ token, user: getUserProfile(userId) });
});

apiRouter.post('/auth/register/helper', (req, res) => {
  const {
    fullName,
    email,
    phone,
    password,
    languagesKnown = 'English, Hindi',
    experienceYears = 2,
    assistanceCategories = 'Luggage Porter, Wheelchair Support',
    currentLocation = 'KSR Bengaluru City Railway Station',
    lat = 12.9784,
    lng = 77.5715,
    maxBags = 6,
    maxWeightKg = 80,
  } = req.body;

  const trimmedName = String(fullName || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const phoneDigits = normalizePhoneDigits(phone);

  if (trimmedName.length < 2) {
    res.status(400).json({ error: 'Please enter a valid full name.' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  if (phoneDigits.length < 10 || phoneDigits.length > 13) {
    res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    return;
  }
  if (!password || String(password).length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }

  const last10 = phoneDigits.slice(-10);
  const existing = db
    .prepare(
      "SELECT id FROM users WHERE LOWER(email) = ? OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE ?"
    )
    .get(normalizedEmail, `%${last10}`);
  if (existing) {
    res.status(409).json({ error: 'An account with this email or mobile number already exists.' });
    return;
  }

  const tx = db.transaction(() => {
    const uRes = db
      .prepare(
        `INSERT INTO users (full_name, email, phone, password_hash, role, preferred_language) VALUES (?, ?, ?, ?, 'HELPER', 'en')`
      )
      .run(trimmedName, normalizedEmail, String(phone).trim(), hashPassword(password));
    const userId = Number(uRes.lastInsertRowid);

    db.prepare(
      `INSERT INTO helpers (
        user_id, avatar_url, languages_known, experience_years, assistance_categories,
        current_location, lat, lng, max_bags, max_weight_kg, is_available, verified_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'ACTIVE')`
    ).run(
      userId,
      '/src/assets/images/helper_avatar_arjun_1794979398701.jpg',
      languagesKnown,
      Number(experienceYears) || 1,
      assistanceCategories,
      currentLocation,
      Number(lat) || 12.9784,
      Number(lng) || 77.5715,
      Number(maxBags) || 6,
      Number(maxWeightKg) || 80
    );

    return userId;
  });

  const userId = tx();
  const token = signToken({ userId, email: normalizedEmail, role: 'HELPER' });
  createNotification(
    userId,
    null,
    'WELCOME',
    'Helper Account Active',
    'Your helper account is active! Toggle your availability anytime to receive nearby assistance requests.'
  );

  res.status(201).json({ token, user: getUserProfile(userId) });
});

apiRouter.post('/auth/login', (req, res) => {
  const { identifier, email, password, expectedRole } = req.body as {
    identifier?: string;
    email?: string;
    password?: string;
    expectedRole?: UserRole;
  };

  const loginId = (identifier || email || '').trim();
  if (!loginId || !password) {
    res.status(400).json({ error: 'Email or mobile number and password are required.' });
    return;
  }

  const user = findUserByIdentifier(loginId);

  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid login credentials. Please check your details and try again.' });
    return;
  }

  if (expectedRole && user.role !== expectedRole) {
    res.status(403).json({ error: `This account is registered as ${user.role}, not ${expectedRole}.` });
    return;
  }

  const profile = getUserProfile(user.id) as Record<string, any>;
  if (
    profile?.account_status === 'BLOCKED' ||
    (user.role === 'HELPER' && profile?.helper?.verified_status === 'BLOCKED')
  ) {
    res.status(403).json({ error: 'This account has been blocked due to automated safety reports.' });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  res.json({
    token,
    user: profile,
  });
});

apiRouter.post('/auth/forgot-password', (req, res) => {
  const { identifier, email } = req.body as { identifier?: string; email?: string };
  const lookup = (identifier || email || '').trim();
  if (!lookup) {
    res.status(400).json({ error: 'Registered email address or mobile number is required.' });
    return;
  }
  const user = findUserByIdentifier(lookup);
  if (!user) {
    res.status(404).json({ error: 'No account found with that email address or mobile number.' });
    return;
  }
  const resetCode = String(crypto.randomInt(100000, 999999));
  db.prepare('UPDATE users SET reset_code = ? WHERE id = ?').run(resetCode, user.id);
  res.json({
    message: 'A 6-digit OTP verification code has been generated for password reset.',
    email: user.email,
    demoResetCode: resetCode,
  });
});

apiRouter.post('/auth/reset-password', (req, res) => {
  const { identifier, email, resetCode, newPassword } = req.body as {
    identifier?: string;
    email?: string;
    resetCode?: string;
    newPassword?: string;
  };
  const lookup = (identifier || email || '').trim();
  if (!lookup || !resetCode || !newPassword || String(newPassword).length < 6) {
    res.status(400).json({ error: 'Valid account, 6-digit OTP code, and new password (min 6 chars) are required.' });
    return;
  }
  const user = findUserByIdentifier(lookup);

  if (!user || !user.reset_code || user.reset_code !== String(resetCode).trim()) {
    res.status(400).json({ error: 'Invalid or expired OTP verification code.' });
    return;
  }

  db.prepare('UPDATE users SET password_hash = ?, reset_code = NULL WHERE id = ?').run(
    hashPassword(newPassword),
    user.id
  );
  res.json({ message: 'Password updated successfully. You can now sign in.' });
});

// Hands-free OTP sign-in for visually impaired passengers (no password spoken)
apiRouter.post('/auth/voice-otp/request', (req, res) => {
  const { identifier, email } = req.body as { identifier?: string; email?: string };
  const lookup = (identifier || email || '').trim();
  if (!lookup) {
    res.status(400).json({ error: 'Registered email address or mobile number is required.' });
    return;
  }
  const user = findUserByIdentifier(lookup);
  if (!user) {
    res.status(404).json({ error: 'No passenger account found with that email or mobile number.' });
    return;
  }
  if (user.role !== 'PASSENGER') {
    res.status(403).json({ error: 'Voice OTP login is restricted to passenger accounts.' });
    return;
  }
  const profile = getUserProfile(user.id) as Record<string, any> | null;
  if (profile?.account_status === 'BLOCKED') {
    res.status(403).json({ error: 'This account has been blocked due to automated safety reports.' });
    return;
  }

  const otpCode = String(crypto.randomInt(100000, 999999));
  const expiresAt = Date.now() + 10 * 60 * 1000;
  db.prepare('UPDATE users SET reset_code = ? WHERE id = ?').run(`V:${otpCode}:${expiresAt}`, user.id);

  res.json({
    message: 'A 6-digit voice login OTP has been generated.',
    email: user.email,
    demoOtpCode: otpCode,
  });
});

apiRouter.post('/auth/voice-otp/verify', (req, res) => {
  const { identifier, email, otpCode } = req.body as {
    identifier?: string;
    email?: string;
    otpCode?: string;
  };
  const lookup = (identifier || email || '').trim();
  const cleanOtp = String(otpCode || '').replace(/\D/g, '');
  if (!lookup || cleanOtp.length !== 6) {
    res.status(400).json({ error: 'Registered account and 6-digit OTP code are required.' });
    return;
  }

  const user = findUserByIdentifier(lookup);
  if (!user || user.role !== 'PASSENGER' || !user.reset_code || !user.reset_code.startsWith('V:')) {
    res.status(401).json({ error: 'Invalid or expired voice login OTP.' });
    return;
  }

  const [, expectedOtp, expStr] = user.reset_code.split(':');
  const expMs = Number(expStr || 0);
  if (expectedOtp !== cleanOtp || (expMs > 0 && Date.now() > expMs)) {
    res.status(401).json({ error: 'Incorrect or expired OTP code. Please try again.' });
    return;
  }

  const profile = getUserProfile(user.id) as Record<string, any> | null;
  if (!profile || profile.account_status === 'BLOCKED') {
    res.status(403).json({ error: 'This account has been blocked due to automated safety reports.' });
    return;
  }

  db.prepare('UPDATE users SET reset_code = NULL WHERE id = ?').run(user.id);
  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  res.json({ token, user: profile });
});

apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const profile = getUserProfile(req.auth!.userId);
  if (!profile) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  res.json({ user: profile });
});

apiRouter.patch('/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { fullName, phone, preferredLanguage, age, accessibilityRequirements, emergencyContact, languagesKnown, experienceYears, assistanceCategories, currentLocation } = req.body;
  const userId = req.auth!.userId;

  db.prepare(
    `UPDATE users SET
      full_name = COALESCE(?, full_name),
      phone = COALESCE(?, phone),
      preferred_language = COALESCE(?, preferred_language)
     WHERE id = ?`
  ).run(fullName || null, phone || null, preferredLanguage || null, userId);

  if (req.auth!.role === 'PASSENGER') {
    db.prepare(
      `UPDATE passengers SET
        age = COALESCE(?, age),
        accessibility_requirements = COALESCE(?, accessibility_requirements),
        emergency_contact = COALESCE(?, emergency_contact)
       WHERE user_id = ?`
    ).run(age !== undefined ? Number(age) : null, accessibilityRequirements ?? null, emergencyContact ?? null, userId);
  }

  if (req.auth!.role === 'HELPER') {
    db.prepare(
      `UPDATE helpers SET
        languages_known = COALESCE(?, languages_known),
        experience_years = COALESCE(?, experience_years),
        assistance_categories = COALESCE(?, assistance_categories),
        current_location = COALESCE(?, current_location)
       WHERE user_id = ?`
    ).run(languagesKnown ?? null, experienceYears ? Number(experienceYears) : null, assistanceCategories ?? null, currentLocation ?? null, userId);
  }

  res.json({ user: getUserProfile(userId) });
});

// ---------- FARE ESTIMATION & HELPER MATCHING ----------

apiRouter.post('/fare/estimate', (req, res) => {
  const {
    travelType = 'Airport',
    pickupLat = 13.1981,
    pickupLng = 77.7052,
    dropoffLat = 13.1995,
    dropoffLng = 77.7078,
    distanceKm,
    numBags = 2,
    luggageWeightKg = 20,
    estimatedDurationMin = 30,
    mobilityAssistance = false,
    wheelchairAssistance = false,
  } = req.body;

  const computedDistance =
    typeof distanceKm === 'number' && distanceKm > 0
      ? distanceKm
      : haversineKm(Number(pickupLat), Number(pickupLng), Number(dropoffLat), Number(dropoffLng));

  const breakdown = calculateFare({
    travelType: travelType as TravelType,
    distanceKm: computedDistance,
    numBags: Number(numBags),
    luggageWeightKg: Number(luggageWeightKg),
    estimatedDurationMin: Number(estimatedDurationMin),
    mobilityAssistance: Boolean(mobilityAssistance),
    wheelchairAssistance: Boolean(wheelchairAssistance),
  });

  res.json(breakdown);
});

apiRouter.post('/helpers/match', (req, res) => {
  const {
    pickupLat = 12.9781,
    pickupLng = 77.5702,
    numBags = 2,
    luggageWeightKg = 20,
    mobilityAssistance = false,
    wheelchairAssistance = false,
    preferredLanguage = 'en',
  } = req.body;

  const candidates = findMatchingHelpers({
    pickupLat: Number(pickupLat),
    pickupLng: Number(pickupLng),
    numBags: Number(numBags),
    luggageWeightKg: Number(luggageWeightKg),
    mobilityAssistance: Boolean(mobilityAssistance),
    wheelchairAssistance: Boolean(wheelchairAssistance),
    preferredLanguage: String(preferredLanguage),
  });

  res.json({ helpers: candidates });
});

// ---------- GOOGLE MAPS CONFIG & GEOCODING PROXY ----------

function getMapsApiKey(): string {
  return (
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();
}

apiRouter.get('/maps/config', (_req, res) => {
  const apiKey = getMapsApiKey();
  res.json({
    configured: Boolean(apiKey && !apiKey.startsWith('MY_')),
    apiKey: apiKey && !apiKey.startsWith('MY_') ? apiKey : '',
  });
});

apiRouter.post('/maps/reverse-geocode', async (req, res) => {
  const { lat, lng, languageCode = 'en' } = req.body as {
    lat?: number;
    lng?: number;
    languageCode?: string;
  };
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: 'Valid numeric latitude and longitude are required.' });
    return;
  }

  const apiKey = getMapsApiKey();
  if (!apiKey || apiKey.startsWith('MY_')) {
    res.status(503).json({ error: 'GOOGLE_MAPS_NOT_CONFIGURED' });
    return;
  }

  try {
    const v4Url = new URL('https://geocode.googleapis.com/v4/geocode/location');
    v4Url.searchParams.set('location.latitude', String(lat));
    v4Url.searchParams.set('location.longitude', String(lng));
    v4Url.searchParams.set('languageCode', String(languageCode));

    const v4Res = await fetch(v4Url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'results.placeId,results.formattedAddress,results.location',
        'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
      },
    });

    if (v4Res.status === 429) {
      res.status(429).json({ error: 'RESOURCE_EXHAUSTED', quotaExceeded: true });
      return;
    }

    if (v4Res.ok) {
      const v4Data = (await v4Res.json()) as {
        results?: Array<{ placeId?: string; formattedAddress?: string; location?: { latitude?: number; longitude?: number } }>;
      };
      const first = v4Data.results?.[0];
      if (first?.formattedAddress) {
        res.json({
          formattedAddress: first.formattedAddress,
          placeId: first.placeId || '',
          lat: first.location?.latitude ?? lat,
          lng: first.location?.longitude ?? lng,
        });
        return;
      }
    }

    // Standard Geocoding REST fallback
    const legacyUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=${encodeURIComponent(
      languageCode
    )}&key=${encodeURIComponent(apiKey)}`;
    const legacyRes = await fetch(legacyUrl);
    if (legacyRes.status === 429) {
      res.status(429).json({ error: 'RESOURCE_EXHAUSTED', quotaExceeded: true });
      return;
    }
    const legacyData = (await legacyRes.json()) as {
      status?: string;
      results?: Array<{ place_id?: string; formatted_address?: string; geometry?: { location?: { lat: number; lng: number } } }>;
    };

    if (legacyData.status === 'OVER_QUERY_LIMIT') {
      res.status(429).json({ error: 'RESOURCE_EXHAUSTED', quotaExceeded: true });
      return;
    }

    const hit = legacyData.results?.[0];
    if (!hit?.formatted_address) {
      res.status(404).json({ error: 'No address found for these coordinates.' });
      return;
    }

    res.json({
      formattedAddress: hit.formatted_address,
      placeId: hit.place_id || '',
      lat: hit.geometry?.location?.lat ?? lat,
      lng: hit.geometry?.location?.lng ?? lng,
    });
  } catch (err: any) {
    res.status(502).json({ error: err?.message || 'Reverse geocoding request failed.' });
  }
});

apiRouter.post('/maps/geocode', async (req, res) => {
  const { address, languageCode = 'en' } = req.body as {
    address?: string;
    languageCode?: string;
  };
  if (!address || !address.trim()) {
    res.status(400).json({ error: 'Address query is required.' });
    return;
  }

  const apiKey = getMapsApiKey();
  if (!apiKey || apiKey.startsWith('MY_')) {
    res.status(503).json({ error: 'GOOGLE_MAPS_NOT_CONFIGURED' });
    return;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address.trim()
    )}&language=${encodeURIComponent(languageCode)}&key=${encodeURIComponent(apiKey)}`;
    const gRes = await fetch(url);
    if (gRes.status === 429) {
      res.status(429).json({ error: 'RESOURCE_EXHAUSTED', quotaExceeded: true });
      return;
    }
    const data = (await gRes.json()) as {
      status?: string;
      results?: Array<{ place_id?: string; formatted_address?: string; geometry?: { location?: { lat: number; lng: number } } }>;
    };
    if (data.status === 'OVER_QUERY_LIMIT') {
      res.status(429).json({ error: 'RESOURCE_EXHAUSTED', quotaExceeded: true });
      return;
    }
    const hit = data.results?.[0];
    if (!hit?.geometry?.location) {
      res.status(404).json({ error: 'Location not found. Please refine your search.' });
      return;
    }
    res.json({
      formattedAddress: hit.formatted_address || address.trim(),
      placeId: hit.place_id || '',
      lat: hit.geometry.location.lat,
      lng: hit.geometry.location.lng,
    });
  } catch (err: any) {
    res.status(502).json({ error: err?.message || 'Geocoding request failed.' });
  }
});

// In-memory short-TTL caches for fast Places & Route lookups during voice calls
const MAPS_CACHE_TTL_MS = 10 * 60 * 1000;
const placesSearchCache = new Map<string, { expiresAt: number; candidates: any[] }>();
const routeComputeCache = new Map<
  string,
  { expiresAt: number; distanceKm: number; durationMin: number; source: string }
>();

// Places API (New) text search proxy for conversational destination & pickup disambiguation
apiRouter.post('/maps/places-search', async (req, res) => {
  const { query, languageCode = 'en', biasLat, biasLng } = req.body as {
    query?: string;
    languageCode?: string;
    biasLat?: number;
    biasLng?: number;
  };
  if (!query || !query.trim()) {
    res.status(400).json({ error: 'Search query is required.' });
    return;
  }

  const apiKey = getMapsApiKey();
  if (!apiKey || apiKey.startsWith('MY_')) {
    res.status(503).json({ error: 'GOOGLE_MAPS_NOT_CONFIGURED' });
    return;
  }

  const biasKey =
    typeof biasLat === 'number' && typeof biasLng === 'number'
      ? `${biasLat.toFixed(2)},${biasLng.toFixed(2)}`
      : 'none';
  const cacheKey = `${query.trim().toLowerCase()}|${languageCode}|${biasKey}`;
  const cached = placesSearchCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    res.json({ candidates: cached.candidates, cached: true });
    return;
  }

  try {
    const payload: Record<string, unknown> = {
      textQuery: query.trim(),
      languageCode,
      maxResultCount: 5,
    };
    if (
      typeof biasLat === 'number' &&
      typeof biasLng === 'number' &&
      Number.isFinite(biasLat) &&
      Number.isFinite(biasLng)
    ) {
      payload.locationBias = {
        circle: {
          center: { latitude: biasLat, longitude: biasLng },
          radius: 50000.0,
        },
      };
    }

    const placesRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      signal: AbortSignal.timeout(4000),
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.types',
        'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
      },
      body: JSON.stringify(payload),
    });

    if (placesRes.status === 429) {
      res.status(429).json({ error: 'RESOURCE_EXHAUSTED', quotaExceeded: true });
      return;
    }

    if (placesRes.ok) {
      const data = (await placesRes.json()) as {
        places?: Array<{
          id?: string;
          displayName?: { text?: string };
          formattedAddress?: string;
          location?: { latitude?: number; longitude?: number };
          types?: string[];
        }>;
      };
      const candidates = (data.places || [])
        .filter((p) => p.location && typeof p.location.latitude === 'number')
        .map((p) => ({
          placeId: p.id || '',
          displayName: p.displayName?.text || p.formattedAddress || query.trim(),
          formattedAddress: p.formattedAddress || p.displayName?.text || query.trim(),
          lat: Number(p.location!.latitude!.toFixed(6)),
          lng: Number(p.location!.longitude!.toFixed(6)),
          types: p.types || [],
        }));

      if (candidates.length > 0) {
        if (placesSearchCache.size >= 300) {
          const oldest = placesSearchCache.keys().next().value;
          if (oldest) placesSearchCache.delete(oldest);
        }
        placesSearchCache.set(cacheKey, { expiresAt: Date.now() + MAPS_CACHE_TTL_MS, candidates });
        res.json({ candidates });
        return;
      }
    }

    // Geocoding REST fallback if Places (New) returns empty or is restricted
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      query.trim()
    )}&language=${encodeURIComponent(languageCode)}&key=${encodeURIComponent(apiKey)}`;
    const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(4000) });
    if (geoRes.status === 429) {
      res.status(429).json({ error: 'RESOURCE_EXHAUSTED', quotaExceeded: true });
      return;
    }
    const geoData = (await geoRes.json()) as {
      status?: string;
      results?: Array<{
        place_id?: string;
        formatted_address?: string;
        types?: string[];
        geometry?: { location?: { lat: number; lng: number } };
      }>;
    };
    if (geoData.status === 'OVER_QUERY_LIMIT') {
      res.status(429).json({ error: 'RESOURCE_EXHAUSTED', quotaExceeded: true });
      return;
    }
    const candidates = (geoData.results || [])
      .slice(0, 5)
      .filter((r) => r.geometry?.location)
      .map((r) => ({
        placeId: r.place_id || '',
        displayName: (r.formatted_address || '').split(',')[0] || query.trim(),
        formattedAddress: r.formatted_address || query.trim(),
        lat: Number(r.geometry!.location!.lat.toFixed(6)),
        lng: Number(r.geometry!.location!.lng.toFixed(6)),
        types: r.types || [],
      }));

    if (candidates.length === 0) {
      res.status(404).json({ error: 'No matching places found for your query.' });
      return;
    }
    placesSearchCache.set(cacheKey, { expiresAt: Date.now() + MAPS_CACHE_TTL_MS, candidates });
    res.json({ candidates });
  } catch (err: any) {
    res.status(502).json({ error: err?.message || 'Places search request failed.' });
  }
});

// Routes API proxy for distance & travel duration in voice booking
apiRouter.post('/maps/compute-route', async (req, res) => {
  const { originLat, originLng, destLat, destLng } = req.body as {
    originLat?: number;
    originLng?: number;
    destLat?: number;
    destLng?: number;
  };
  if (
    typeof originLat !== 'number' ||
    typeof originLng !== 'number' ||
    typeof destLat !== 'number' ||
    typeof destLng !== 'number'
  ) {
    res.status(400).json({ error: 'Origin and destination coordinates are required.' });
    return;
  }

  const routeKey = `${originLat.toFixed(3)},${originLng.toFixed(3)}->${destLat.toFixed(3)},${destLng.toFixed(3)}`;
  const cached = routeComputeCache.get(routeKey);
  if (cached && Date.now() < cached.expiresAt) {
    res.json({
      distanceKm: cached.distanceKm,
      durationMin: cached.durationMin,
      source: cached.source,
      cached: true,
    });
    return;
  }

  const fallbackKm = haversineKm(originLat, originLng, destLat, destLng);
  const fallbackDurationMin = Math.max(20, Math.round(fallbackKm * 2.5 + 10));

  const apiKey = getMapsApiKey();
  if (!apiKey || apiKey.startsWith('MY_')) {
    res.json({ distanceKm: fallbackKm, durationMin: fallbackDurationMin, source: 'haversine' });
    return;
  }

  try {
    const routeRes = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      signal: AbortSignal.timeout(3500),
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
        'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
        destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
        travelMode: 'DRIVE',
      }),
    });

    if (routeRes.status === 429) {
      res.status(429).json({ error: 'RESOURCE_EXHAUSTED', quotaExceeded: true });
      return;
    }

    if (routeRes.ok) {
      const data = (await routeRes.json()) as {
        routes?: Array<{ distanceMeters?: number; duration?: string }>;
      };
      const first = data.routes?.[0];
      if (first) {
        const distKm =
          typeof first.distanceMeters === 'number' && first.distanceMeters > 0
            ? Number((first.distanceMeters / 1000).toFixed(2))
            : fallbackKm;
        const durationSeconds = first.duration ? Number(first.duration.replace('s', '')) : 0;
        const durationMin =
          Number.isFinite(durationSeconds) && durationSeconds > 0
            ? Math.max(20, Math.round(durationSeconds / 60))
            : fallbackDurationMin;
        routeComputeCache.set(routeKey, {
          expiresAt: Date.now() + MAPS_CACHE_TTL_MS,
          distanceKm: distKm,
          durationMin,
          source: 'google_routes',
        });
        res.json({ distanceKm: distKm, durationMin, source: 'google_routes' });
        return;
      }
    }

    res.json({ distanceKm: fallbackKm, durationMin: fallbackDurationMin, source: 'haversine' });
  } catch {
    res.json({ distanceKm: fallbackKm, durationMin: fallbackDurationMin, source: 'haversine' });
  }
});

// Public directory of active helpers for homepage "Find a Helper"
apiRouter.get('/helpers/public', (_req, res) => {
  const rows = db
    .prepare(
      `
      SELECT
        h.id as helperId, u.full_name as fullName, h.avatar_url as avatarUrl,
        h.languages_known as languagesKnown, h.experience_years as experienceYears,
        h.assistance_categories as assistanceCategories, h.current_location as currentLocation,
        h.lat, h.lng, h.is_available as isAvailable, h.rating, h.total_reviews as totalReviews,
        h.completed_jobs as completedJobs, h.max_bags as maxBags, h.max_weight_kg as maxWeightKg
      FROM helpers h
      JOIN users u ON u.id = h.user_id
      WHERE h.verified_status = 'ACTIVE' AND COALESCE(u.account_status, 'ACTIVE') = 'ACTIVE'
      ORDER BY h.rating DESC
    `
    )
    .all();
  res.json({ helpers: rows });
});

// Shared automatic reassignment or searching fallback
function autoReassignOrSearchBooking(bookingId: number, reason: 'REJECTED' | 'TIMEOUT' = 'REJECTED') {
  const booking = getFullBooking(bookingId) as Record<string, any> | null;
  if (!booking || booking.status === 'Booking Cancelled' || booking.status === 'Assistance Completed') {
    return { booking, reassigned: false };
  }

  const excludedIds = (
    db
      .prepare(`SELECT helper_id FROM helper_assignments WHERE booking_id = ? AND status IN ('REJECTED', 'TIMEOUT')`)
      .all(bookingId) as { helper_id: number }[]
  ).map((r) => r.helper_id);

  const nextCandidates = findMatchingHelpers({
    pickupLat: booking.pickup_lat,
    pickupLng: booking.pickup_lng,
    numBags: booking.num_bags,
    luggageWeightKg: booking.luggage_weight_kg,
    mobilityAssistance: Boolean(booking.mobility_assistance),
    wheelchairAssistance: Boolean(booking.wheelchair_assistance),
    preferredLanguage: booking.preferred_language,
    excludeHelperIds: excludedIds,
    passengerUserId: booking.passenger_user_id,
  });

  if (nextCandidates.length > 0) {
    const nextHelper = nextCandidates[0];
    db.prepare(
      `INSERT INTO helper_assignments (booking_id, helper_id, assignment_type, match_score, eta_minutes, distance_km, status)
       VALUES (?, ?, 'AUTO', ?, ?, ?, 'PENDING')`
    ).run(booking.id, nextHelper.helperId, nextHelper.matchScore, nextHelper.etaMinutes, nextHelper.distanceKm);
    db.prepare(`UPDATE bookings SET status = 'Helper Assigned', updated_at = datetime('now') WHERE id = ?`).run(booking.id);

    createNotification(
      booking.passenger_user_id,
      booking.id,
      'HELPER_REASSIGNED',
      `New Helper Assigned: ${nextHelper.fullName}`,
      `${reason === 'TIMEOUT' ? 'Previous helper did not respond in time. ' : ''}We automatically matched ${nextHelper.fullName} (${nextHelper.rating}★) to ${booking.booking_code}.`
    );
    createNotification(
      nextHelper.userId,
      booking.id,
      'NEW_ASSIGNMENT',
      `New Assistance Request: ${booking.booking_code}`,
      `Pickup at ${booking.pickup_location} for ${booking.passenger_name}.`
    );
  } else {
    db.prepare(`UPDATE bookings SET status = 'Searching for Helper', updated_at = datetime('now') WHERE id = ?`).run(booking.id);
    createNotification(
      booking.passenger_user_id,
      booking.id,
      'SEARCHING_HELPER',
      `Searching for Available Helper`,
      `No helpers responded yet for ${booking.booking_code}. You can tap Retry Helper Search anytime.`
    );
  }

  const updated = getFullBooking(bookingId);
  const targets = [booking.passenger_user_id];
  if (updated && (updated as any).assignment?.helper_user_id) {
    targets.push((updated as any).assignment.helper_user_id);
  }
  broadcastEvent('booking:updated', updated, targets);
  return { booking: updated, reassigned: nextCandidates.length > 0 };
}

// Background automatic timeout check: reassigns unresponded helper requests after 60s
const autoDispatchInterval = setInterval(() => {
  try {
    const stale = db
      .prepare(
        `SELECT ha.id as assignment_id, ha.booking_id
         FROM helper_assignments ha
         JOIN bookings b ON b.id = ha.booking_id
         WHERE ha.status = 'PENDING'
           AND b.status = 'Helper Assigned'
           AND ha.assigned_at <= datetime('now', '-60 seconds')`
      )
      .all() as { assignment_id: number; booking_id: number }[];

    for (const row of stale) {
      db.prepare(
        `UPDATE helper_assignments SET status = 'TIMEOUT', responded_at = datetime('now') WHERE id = ? AND status = 'PENDING'`
      ).run(row.assignment_id);
      autoReassignOrSearchBooking(row.booking_id, 'TIMEOUT');
    }
  } catch {
    // ignore transient db locks during shutdown
  }
}, 15000);
autoDispatchInterval.unref?.();

// ---------- BOOKINGS ----------

apiRouter.post('/bookings', requireAuth, requireRole('PASSENGER'), (req: AuthenticatedRequest, res: Response) => {
  const {
    passengerName,
    passengerPhone,
    passengerEmail,
    travelType,
    pickupLocation,
    pickupLat,
    pickupLng,
    pickupPlaceId = null,
    dropoffLocation,
    dropoffLat,
    dropoffLng,
    dropoffPlaceId = null,
    travelDate,
    travelTime,
    numBags = 1,
    luggageWeightKg = 10,
    numPassengers = 1,
    mobilityAssistance = false,
    wheelchairAssistance = false,
    assistanceCategory = '',
    specialRequirements = '',
    preferredLanguage = 'en',
    distanceKm,
    estimatedDurationMin = 35,
    paymentMethod = 'UPI',
    upiId = '',
    autoAssign = true,
    selectedHelperId = null,
  } = req.body;

  if (!passengerName || !passengerPhone || !travelType || !pickupLocation || !dropoffLocation || !travelDate || !travelTime) {
    res.status(400).json({ error: 'All required passenger and journey fields must be filled.' });
    return;
  }

  const pLat = Number(pickupLat);
  const pLng = Number(pickupLng);
  const dLat = Number(dropoffLat);
  const dLng = Number(dropoffLng);
  if (
    !Number.isFinite(pLat) ||
    !Number.isFinite(pLng) ||
    !Number.isFinite(dLat) ||
    !Number.isFinite(dLng)
  ) {
    res.status(400).json({ error: 'Valid geographic coordinates are required for pickup and destination.' });
    return;
  }

  const coordDelta = Math.abs(pLat - dLat) + Math.abs(pLng - dLng);
  if (coordDelta < 0.0001 && String(pickupLocation).trim().toLowerCase() === String(dropoffLocation).trim().toLowerCase()) {
    res.status(400).json({ error: 'Pickup and destination cannot be the exact same location.' });
    return;
  }

  const passenger = db
    .prepare('SELECT id, user_id FROM passengers WHERE user_id = ?')
    .get(req.auth!.userId) as { id: number; user_id: number } | undefined;

  if (!passenger) {
    res.status(400).json({ error: 'Passenger profile not found.' });
    return;
  }

  const distKm =
    typeof distanceKm === 'number' && Number.isFinite(distanceKm) && distanceKm > 0
      ? Number(distanceKm.toFixed(2))
      : haversineKm(pLat, pLng, dLat, dLng);

  const fare = calculateFare({
    travelType: travelType as TravelType,
    distanceKm: distKm,
    numBags: Number(numBags),
    luggageWeightKg: Number(luggageWeightKg),
    estimatedDurationMin: Number(estimatedDurationMin),
    mobilityAssistance: Boolean(mobilityAssistance),
    wheelchairAssistance: Boolean(wheelchairAssistance),
  });

  const bookingCode = `PA-${new Date().getFullYear()}-${crypto.randomInt(1000, 9999)}`;
  const otpCode = String(crypto.randomInt(100000, 999999));
  const qrToken = `PA-QR-${bookingCode.slice(-4)}-${otpCode}`;

  const candidates = findMatchingHelpers({
    pickupLat: pLat,
    pickupLng: pLng,
    numBags: Number(numBags),
    luggageWeightKg: Number(luggageWeightKg),
    mobilityAssistance: Boolean(mobilityAssistance),
    wheelchairAssistance: Boolean(wheelchairAssistance),
    preferredLanguage,
    passengerUserId: passenger.user_id,
  });

  const chosenHelper = selectedHelperId
    ? candidates.find((c) => c.helperId === Number(selectedHelperId)) || null
    : autoAssign
    ? candidates[0] || null
    : null;

  const initialStatus = chosenHelper ? 'Helper Assigned' : 'Searching for Helper';
  const resolvedCategory =
    assistanceCategory ||
    (wheelchairAssistance
      ? 'Wheelchair Assistance'
      : mobilityAssistance
      ? 'Mobility Escort Assistance'
      : 'Luggage Assistance');

  const tx = db.transaction(() => {
    const bRes = db
      .prepare(
        `
        INSERT INTO bookings (
          booking_code, passenger_id, passenger_name, passenger_phone, passenger_email,
          travel_type, pickup_location, pickup_lat, pickup_lng, pickup_place_id,
          dropoff_location, dropoff_lat, dropoff_lng, dropoff_place_id,
          travel_date, travel_time, num_bags, luggage_weight_kg, num_passengers,
          mobility_assistance, wheelchair_assistance, assistance_category, special_requirements, preferred_language,
          distance_km, estimated_duration_min, base_fare, distance_fare, luggage_fare, mobility_fare, extra_fare, estimated_fare,
          payment_method, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        bookingCode,
        passenger!.id,
        passengerName,
        passengerPhone,
        passengerEmail || req.auth!.email,
        travelType,
        pickupLocation,
        pLat,
        pLng,
        pickupPlaceId,
        dropoffLocation,
        dLat,
        dLng,
        dropoffPlaceId,
        travelDate,
        travelTime,
        Number(numBags),
        Number(luggageWeightKg),
        Number(numPassengers),
        mobilityAssistance ? 1 : 0,
        wheelchairAssistance ? 1 : 0,
        resolvedCategory,
        specialRequirements,
        preferredLanguage,
        fare.distanceKm,
        fare.estimatedDurationMin,
        fare.baseFare,
        fare.distanceCharge,
        fare.luggageCharge,
        fare.mobilityCharge,
        fare.durationCharge,
        fare.totalFare,
        paymentMethod,
        initialStatus
      );

    const bookingId = Number(bRes.lastInsertRowid);

    const payStatus = paymentMethod === 'UPI' && upiId ? 'PAID_SIMULATED' : paymentMethod === 'CASH' ? 'CASH_DUE' : 'PENDING';
    const txRef = `${paymentMethod}-SIM-${crypto.randomInt(100000, 999999)}`;
    db.prepare(
      `INSERT INTO payments (booking_id, amount, method, upi_id, transaction_ref, status, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(bookingId, fare.totalFare, paymentMethod, upiId || null, txRef, payStatus, payStatus === 'PAID_SIMULATED' ? new Date().toISOString() : null);

    db.prepare(
      `INSERT INTO otp_verification (booking_id, otp_code, qr_token, is_verified) VALUES (?, ?, ?, 0)`
    ).run(bookingId, otpCode, qrToken);

    if (chosenHelper) {
      db.prepare(
        `INSERT INTO helper_assignments (booking_id, helper_id, assignment_type, match_score, eta_minutes, distance_km, status)
         VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`
      ).run(
        bookingId,
        chosenHelper.helperId,
        selectedHelperId ? 'MANUAL' : 'AUTO',
        chosenHelper.matchScore,
        chosenHelper.etaMinutes,
        chosenHelper.distanceKm
      );
    }

    return bookingId;
  });

  const bookingId = tx();
  const fullBooking = getFullBooking(bookingId);

  createNotification(
    passenger.user_id,
    bookingId,
    'BOOKING_CONFIRMED',
    `Booking Confirmed: ${bookingCode}`,
    chosenHelper
      ? `Matched with ${chosenHelper.fullName} (ETA ${chosenHelper.etaMinutes} min). Your handover OTP is ${otpCode}.`
      : `Your request ${bookingCode} is confirmed. Matching nearest available helper.`
  );

  if (chosenHelper) {
    createNotification(
      chosenHelper.userId,
      bookingId,
      'NEW_ASSIGNMENT',
      `New Assistance Request: ${bookingCode}`,
      `Pickup at ${pickupLocation} for ${passengerName} (${numBags} bags, ${luggageWeightKg} kg).`
    );
  }

  broadcastEvent('booking:created', fullBooking);
  res.status(201).json({ booking: fullBooking });
});

// ---------- VOICE ASSISTANT NLU & END-TO-END VOICE BOOKING ----------

apiRouter.post('/voice/understand', async (req, res) => {
  const {
    transcript,
    currentStep,
    language = 'en',
    currentLocalDate,
    optionsList,
    conversationContext,
  } = req.body as {
    transcript?: string;
    currentStep?: string;
    language?: string;
    currentLocalDate?: string;
    optionsList?: string[];
    conversationContext?: Record<string, unknown>;
  };

  if (!transcript || !transcript.trim() || !currentStep) {
    res.status(400).json({ error: 'Transcript and currentStep are required.' });
    return;
  }

  try {
    const parsed = await parseVoiceUtteranceWithGemini({
      transcript: transcript.trim(),
      currentStep,
      language,
      currentLocalDate: currentLocalDate || new Date().toISOString().slice(0, 10),
      optionsList,
      conversationContext,
    });
    res.json({ parsed });
  } catch (err: any) {
    const msg = err?.message || 'Voice AI NLU failed.';
    const status = msg.includes('GEMINI_API_KEY_NOT_CONFIGURED') ? 503 : 502;
    res.status(status).json({ error: msg });
  }
});

// Voice-initiated booking strictly requires authenticated PASSENGER session
apiRouter.post('/voice/bookings', requireAuth, requireRole('PASSENGER'), (req: AuthenticatedRequest, res: Response) => {
  const {
    passengerName,
    passengerPhone,
    passengerEmail,
    travelType = 'Railway Station',
    pickupLocation,
    pickupLat,
    pickupLng,
    pickupPlaceId = null,
    dropoffLocation,
    dropoffLat,
    dropoffLng,
    dropoffPlaceId = null,
    travelDate,
    travelTime,
    numBags = 1,
    luggageWeightKg,
    numPassengers = 1,
    mobilityAssistance = true,
    wheelchairAssistance = false,
    assistanceCategory = 'Visually Impaired Passenger Assistance',
    specialRequirements = '',
    preferredLanguage = 'en',
    distanceKm,
    estimatedDurationMin = 35,
    paymentMethod = 'CASH',
    upiId = '',
  } = req.body;

  if (!pickupLocation || !dropoffLocation || !travelDate || !travelTime) {
    res.status(400).json({ error: 'All voice booking fields are required before confirmation.' });
    return;
  }

  const pLat = Number(pickupLat);
  const pLng = Number(pickupLng);
  const dLat = Number(dropoffLat);
  const dLng = Number(dropoffLng);
  if (
    !Number.isFinite(pLat) ||
    !Number.isFinite(pLng) ||
    !Number.isFinite(dLat) ||
    !Number.isFinite(dLng)
  ) {
    res.status(400).json({ error: 'Valid GPS/Google Maps coordinates are required.' });
    return;
  }

  const coordDelta = Math.abs(pLat - dLat) + Math.abs(pLng - dLng);
  if (
    coordDelta < 0.0001 &&
    String(pickupLocation).trim().toLowerCase() === String(dropoffLocation).trim().toLowerCase()
  ) {
    res.status(400).json({ error: 'Pickup and destination cannot be the exact same location.' });
    return;
  }

  const accountUser = db
    .prepare('SELECT id, full_name, email, phone FROM users WHERE id = ?')
    .get(req.auth!.userId) as
    | { id: number; full_name: string; email: string; phone: string }
    | undefined;

  const passenger = db
    .prepare('SELECT id, user_id FROM passengers WHERE user_id = ?')
    .get(req.auth!.userId) as { id: number; user_id: number } | undefined;

  if (!passenger || !accountUser) {
    res.status(400).json({ error: 'Authenticated passenger profile not found.' });
    return;
  }

  const resolvedName = String(passengerName || accountUser.full_name).trim();
  const resolvedPhone = String(passengerPhone || accountUser.phone).trim();
  const resolvedEmail = String(passengerEmail || accountUser.email).trim();

  const bagsCount = Math.max(0, Number(numBags) || 0);
  const resolvedWeight =
    typeof luggageWeightKg === 'number' && luggageWeightKg > 0
      ? luggageWeightKg
      : Math.max(5, bagsCount * 12);

  const distKm =
    typeof distanceKm === 'number' && Number.isFinite(distanceKm) && distanceKm > 0
      ? Number(distanceKm.toFixed(2))
      : haversineKm(pLat, pLng, dLat, dLng);

  const validTravelType: TravelType =
    travelType === 'Airport' || travelType === 'Bus Station' ? travelType : 'Railway Station';

  const normalizedPayMethod: 'UPI' | 'CASH' =
    String(paymentMethod).toUpperCase() === 'UPI' ? 'UPI' : 'CASH';

  const fare = calculateFare({
    travelType: validTravelType,
    distanceKm: distKm,
    numBags: bagsCount,
    luggageWeightKg: resolvedWeight,
    estimatedDurationMin: Number(estimatedDurationMin) || 35,
    mobilityAssistance: Boolean(mobilityAssistance),
    wheelchairAssistance: Boolean(wheelchairAssistance),
  });

  const bookingCode = `PA-${new Date().getFullYear()}-${crypto.randomInt(1000, 9999)}`;
  const otpCode = String(crypto.randomInt(100000, 999999));
  const qrToken = `PA-QR-${bookingCode.slice(-4)}-${otpCode}`;

  const candidates = findMatchingHelpers({
    pickupLat: pLat,
    pickupLng: pLng,
    numBags: Math.max(1, bagsCount),
    luggageWeightKg: resolvedWeight,
    mobilityAssistance: Boolean(mobilityAssistance),
    wheelchairAssistance: Boolean(wheelchairAssistance),
    preferredLanguage,
    passengerUserId: passenger.user_id,
  });

  const chosenHelper = candidates[0] || null;
  const initialStatus = chosenHelper ? 'Helper Assigned' : 'Searching for Helper';

  const bookingId = db.transaction(() => {
    const bRes = db
      .prepare(
        `
        INSERT INTO bookings (
          booking_code, passenger_id, passenger_name, passenger_phone, passenger_email,
          travel_type, pickup_location, pickup_lat, pickup_lng, pickup_place_id,
          dropoff_location, dropoff_lat, dropoff_lng, dropoff_place_id,
          travel_date, travel_time, num_bags, luggage_weight_kg, num_passengers,
          mobility_assistance, wheelchair_assistance, assistance_category, special_requirements, preferred_language,
          distance_km, estimated_duration_min, base_fare, distance_fare, luggage_fare, mobility_fare, extra_fare, estimated_fare,
          payment_method, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        bookingCode,
        passenger!.id,
        resolvedName,
        resolvedPhone,
        resolvedEmail,
        validTravelType,
        String(pickupLocation).trim(),
        pLat,
        pLng,
        pickupPlaceId,
        String(dropoffLocation).trim(),
        dLat,
        dLng,
        dropoffPlaceId,
        travelDate,
        travelTime,
        bagsCount,
        resolvedWeight,
        Math.max(1, Number(numPassengers) || 1),
        mobilityAssistance ? 1 : 0,
        wheelchairAssistance ? 1 : 0,
        assistanceCategory,
        specialRequirements || '',
        preferredLanguage,
        fare.distanceKm,
        fare.estimatedDurationMin,
        fare.baseFare,
        fare.distanceCharge,
        fare.luggageCharge,
        fare.mobilityCharge,
        fare.durationCharge,
        fare.totalFare,
        normalizedPayMethod,
        initialStatus
      );

    const newBookingId = Number(bRes.lastInsertRowid);
    const payStatus =
      normalizedPayMethod === 'UPI' ? (upiId ? 'PAID_SIMULATED' : 'PENDING') : 'CASH_DUE';
    const txRef = `VOICE-${normalizedPayMethod}-${crypto.randomInt(100000, 999999)}`;
    db.prepare(
      `INSERT INTO payments (booking_id, amount, method, upi_id, transaction_ref, status, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      newBookingId,
      fare.totalFare,
      normalizedPayMethod,
      upiId || null,
      txRef,
      payStatus,
      payStatus === 'PAID_SIMULATED' ? new Date().toISOString() : null
    );

    db.prepare(
      `INSERT INTO otp_verification (booking_id, otp_code, qr_token, is_verified) VALUES (?, ?, ?, 0)`
    ).run(newBookingId, otpCode, qrToken);

    if (chosenHelper) {
      db.prepare(
        `INSERT INTO helper_assignments (booking_id, helper_id, assignment_type, match_score, eta_minutes, distance_km, status)
         VALUES (?, ?, 'AUTO', ?, ?, ?, 'PENDING')`
      ).run(
        newBookingId,
        chosenHelper.helperId,
        chosenHelper.matchScore,
        chosenHelper.etaMinutes,
        chosenHelper.distanceKm
      );
    }

    return newBookingId;
  })();

  const fullBooking = getFullBooking(bookingId);
  createNotification(
    passenger.user_id,
    bookingId,
    'VOICE_BOOKING_CONFIRMED',
    `Voice Booking Confirmed: ${bookingCode}`,
    chosenHelper
      ? `Matched with ${chosenHelper.fullName} (ETA ${chosenHelper.etaMinutes} min). Handover OTP: ${otpCode}.`
      : `Your voice booking ${bookingCode} is confirmed. Handover OTP: ${otpCode}.`
  );

  if (chosenHelper) {
    createNotification(
      chosenHelper.userId,
      bookingId,
      'NEW_ASSIGNMENT',
      `New Accessible Voice Request: ${bookingCode}`,
      `Assistance (${assistanceCategory}) at ${pickupLocation} for ${resolvedName}.`
    );
  }

  broadcastEvent('booking:created', fullBooking);
  res.status(201).json({ booking: fullBooking });
});

apiRouter.get('/voice/bookings', requireAuth, requireRole('PASSENGER'), (req: AuthenticatedRequest, res: Response) => {
  const codeQuery = String(req.query.bookingCode || '').trim().toUpperCase();
  const ids = db
    .prepare(
      `SELECT b.id FROM bookings b JOIN passengers p ON p.id = b.passenger_id
       WHERE p.user_id = ? ${codeQuery ? 'AND UPPER(b.booking_code) = ?' : ''}
       ORDER BY b.id DESC LIMIT 10`
    )
    .all(...(codeQuery ? [req.auth!.userId, codeQuery] : [req.auth!.userId])) as { id: number }[];

  const bookings = ids.map((r) => getFullBooking(r.id)).filter(Boolean);
  res.json({ bookings });
});

apiRouter.patch('/voice/bookings/:code/cancel', requireAuth, requireRole('PASSENGER'), (req: AuthenticatedRequest, res: Response) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const bookingRow = db
    .prepare('SELECT id FROM bookings WHERE UPPER(booking_code) = ? OR id = ?')
    .get(code, Number(code) || -1) as { id: number } | undefined;

  if (!bookingRow) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }

  const booking = getFullBooking(bookingRow.id) as Record<string, any>;
  if (booking.passenger_user_id !== req.auth!.userId) {
    res.status(403).json({ error: 'You can only cancel your own bookings.' });
    return;
  }

  db.prepare(`UPDATE bookings SET status = 'Booking Cancelled', updated_at = datetime('now') WHERE id = ?`).run(bookingRow.id);
  db.prepare(`UPDATE helper_assignments SET status = 'CANCELLED' WHERE booking_id = ? AND status IN ('PENDING', 'ACCEPTED')`).run(bookingRow.id);
  db.prepare(`UPDATE payments SET status = CASE WHEN status = 'PAID_SIMULATED' THEN 'REFUNDED' ELSE status END WHERE booking_id = ?`).run(bookingRow.id);

  createNotification(
    booking.passenger_user_id,
    bookingRow.id,
    'BOOKING_CANCELLED',
    `Voice Booking Cancelled: ${booking.booking_code}`,
    'Your booking was cancelled through the voice assistant.'
  );

  const updated = getFullBooking(bookingRow.id);
  const targets = [booking.passenger_user_id];
  if (booking.assignment?.helper_user_id) targets.push(booking.assignment.helper_user_id);
  broadcastEvent('booking:updated', updated, targets);
  res.json({ booking: updated });
});

apiRouter.get('/bookings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { role, userId } = req.auth!;
  let bookingIds: { id: number }[] = [];

  if (role === 'PASSENGER') {
    bookingIds = db
      .prepare(
        `SELECT b.id FROM bookings b
         JOIN passengers p ON p.id = b.passenger_id
         WHERE p.user_id = ?
         ORDER BY b.id DESC`
      )
      .all(userId) as { id: number }[];
  } else {
    bookingIds = db
      .prepare(
        `SELECT DISTINCT b.id FROM bookings b
         JOIN helper_assignments ha ON ha.booking_id = b.id
         JOIN helpers h ON h.id = ha.helper_id
         WHERE h.user_id = ? AND ha.status NOT IN ('REJECTED', 'TIMEOUT', 'CANCELLED')
         ORDER BY b.id DESC`
      )
      .all(userId) as { id: number }[];
  }

  const bookings = bookingIds.map((r) => getFullBooking(r.id)).filter(Boolean);
  res.json({ bookings });
});

apiRouter.get('/bookings/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const booking = getFullBooking(Number(req.params.id)) as Record<string, any> | null;
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }
  const { role, userId } = req.auth!;
  if (
    (role === 'PASSENGER' && booking.passenger_user_id !== userId) ||
    (role === 'HELPER' && booking.assignment?.helper_user_id !== userId)
  ) {
    res.status(403).json({ error: 'You are not authorized to access this booking.' });
    return;
  }
  res.json({ booking });
});

apiRouter.post('/bookings/:id/retry-match', requireAuth, requireRole('PASSENGER'), (req: AuthenticatedRequest, res: Response) => {
  const bookingId = Number(req.params.id);
  const booking = getFullBooking(bookingId) as Record<string, any> | null;
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }
  if (booking.passenger_user_id !== req.auth!.userId) {
    res.status(403).json({ error: 'You can only retry matching for your own bookings.' });
    return;
  }
  if (
    booking.status === 'Booking Cancelled' ||
    booking.status === 'Assistance Completed' ||
    booking.assignment?.status === 'ACCEPTED'
  ) {
    res.status(400).json({ error: 'Booking already has an accepted helper or is finalized.' });
    return;
  }

  let candidates = findMatchingHelpers({
    pickupLat: booking.pickup_lat,
    pickupLng: booking.pickup_lng,
    numBags: booking.num_bags,
    luggageWeightKg: booking.luggage_weight_kg,
    mobilityAssistance: Boolean(booking.mobility_assistance),
    wheelchairAssistance: Boolean(booking.wheelchair_assistance),
    preferredLanguage: booking.preferred_language,
    passengerUserId: booking.passenger_user_id,
  });

  if (candidates.length === 0) {
    db.prepare(`UPDATE bookings SET status = 'Searching for Helper', updated_at = datetime('now') WHERE id = ?`).run(bookingId);
    const updated = getFullBooking(bookingId);
    res.json({ booking: updated, matched: false, message: 'No active helpers are currently online near this location. Please retry shortly.' });
    return;
  }

  const nextHelper = candidates[0];
  db.transaction(() => {
    db.prepare(`UPDATE helper_assignments SET status = 'CANCELLED' WHERE booking_id = ? AND status = 'PENDING'`).run(bookingId);
    db.prepare(
      `INSERT INTO helper_assignments (booking_id, helper_id, assignment_type, match_score, eta_minutes, distance_km, status)
       VALUES (?, ?, 'AUTO', ?, ?, ?, 'PENDING')`
    ).run(bookingId, nextHelper.helperId, nextHelper.matchScore, nextHelper.etaMinutes, nextHelper.distanceKm);
    db.prepare(`UPDATE bookings SET status = 'Helper Assigned', updated_at = datetime('now') WHERE id = ?`).run(bookingId);
  })();

  createNotification(
    booking.passenger_user_id,
    bookingId,
    'HELPER_ASSIGNED',
    `Helper Matched: ${nextHelper.fullName}`,
    `${nextHelper.fullName} (${nextHelper.rating}★) has been matched to ${booking.booking_code}.`
  );
  createNotification(
    nextHelper.userId,
    bookingId,
    'NEW_ASSIGNMENT',
    `New Assistance Request: ${booking.booking_code}`,
    `Pickup at ${booking.pickup_location} for ${booking.passenger_name}.`
  );

  const updated = getFullBooking(bookingId);
  broadcastEvent('booking:updated', updated, [booking.passenger_user_id, nextHelper.userId]);
  res.json({ booking: updated, matched: true });
});

apiRouter.patch('/bookings/:id/cancel', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const bookingId = Number(req.params.id);
  const booking = getFullBooking(bookingId) as Record<string, any> | null;
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }

  if (booking.passenger_user_id !== req.auth!.userId) {
    res.status(403).json({ error: 'Only the booking passenger can cancel this booking.' });
    return;
  }

  db.prepare(`UPDATE bookings SET status = 'Booking Cancelled', updated_at = datetime('now') WHERE id = ?`).run(bookingId);
  db.prepare(`UPDATE helper_assignments SET status = 'CANCELLED' WHERE booking_id = ? AND status IN ('PENDING', 'ACCEPTED')`).run(bookingId);
  db.prepare(`UPDATE payments SET status = CASE WHEN status = 'PAID_SIMULATED' THEN 'REFUNDED' ELSE status END WHERE booking_id = ?`).run(bookingId);

  createNotification(
    booking.passenger_user_id,
    bookingId,
    'BOOKING_CANCELLED',
    `Booking Cancelled: ${booking.booking_code}`,
    'Your booking has been cancelled and any simulated UPI payment has been marked refunded.'
  );

  const targets = [booking.passenger_user_id];
  if (booking.assignment?.helper_user_id) {
    targets.push(booking.assignment.helper_user_id);
    createNotification(
      booking.assignment.helper_user_id,
      bookingId,
      'BOOKING_CANCELLED',
      `Cancelled: ${booking.booking_code}`,
      `Passenger cancelled assistance request ${booking.booking_code}.`
    );
  }

  const updated = getFullBooking(bookingId);
  broadcastEvent('booking:updated', updated, targets);
  res.json({ booking: updated });
});

apiRouter.patch('/bookings/:id/status', requireAuth, requireRole('HELPER'), (req: AuthenticatedRequest, res: Response) => {
  const bookingId = Number(req.params.id);
  const { status } = req.body as { status: string };
  const validStatuses = [
    'Helper Accepted',
    'Helper On the Way',
    'Assistance Started',
    'Assistance Completed',
  ];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid booking status transition.' });
    return;
  }

  const booking = getFullBooking(bookingId) as Record<string, any> | null;
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }
  if (!booking.assignment || booking.assignment.helper_user_id !== req.auth!.userId) {
    res.status(403).json({ error: 'Only the assigned helper can update this booking status.' });
    return;
  }

  if (status === 'Assistance Completed') {
    const otpRow = db.prepare('SELECT is_verified FROM otp_verification WHERE booking_id = ?').get(bookingId) as { is_verified: number } | undefined;
    if (!otpRow || otpRow.is_verified === 0) {
      res.status(400).json({ error: 'Verify passenger OTP or QR code before marking assistance completed.' });
      return;
    }
  }

  db.prepare(`UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, bookingId);
  if (status === 'Assistance Completed' && booking.assignment) {
    db.prepare(`UPDATE helper_assignments SET status = 'COMPLETED' WHERE id = ?`).run(booking.assignment.id);
    db.prepare(`UPDATE helpers SET completed_jobs = completed_jobs + 1 WHERE id = ?`).run(booking.assignment.helper_id);
  }

  createNotification(
    booking.passenger_user_id,
    bookingId,
    'STATUS_UPDATE',
    `${booking.booking_code}: ${status}`,
    `Your booking status is now "${status}".`
  );

  const updated = getFullBooking(bookingId);
  broadcastEvent('booking:updated', updated, [booking.passenger_user_id, req.auth!.userId]);
  res.json({ booking: updated });
});

// Helper updates real-time GPS location
apiRouter.patch('/bookings/:id/location', requireAuth, requireRole('HELPER'), (req: AuthenticatedRequest, res: Response) => {
  const bookingId = Number(req.params.id);
  const { lat, lng, locationLabel } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    res.status(400).json({ error: 'Valid latitude and longitude numbers are required.' });
    return;
  }

  const booking = getFullBooking(bookingId) as Record<string, any> | null;
  if (!booking || !booking.assignment) {
    res.status(404).json({ error: 'Assigned booking not found.' });
    return;
  }
  if (booking.assignment.helper_user_id !== req.auth!.userId) {
    res.status(403).json({ error: 'Only the assigned helper can broadcast location for this booking.' });
    return;
  }

  const helperId = booking.assignment.helper_id;
  db.prepare(
    `UPDATE helpers SET lat = ?, lng = ?, current_location = COALESCE(?, current_location) WHERE id = ?`
  ).run(lat, lng, locationLabel || null, helperId);

  const distKm = haversineKm(lat, lng, booking.pickup_lat, booking.pickup_lng);
  const etaMinutes = Math.max(1, Math.round(distKm * 2.5 + 1));
  db.prepare(`UPDATE helper_assignments SET distance_km = ?, eta_minutes = ? WHERE id = ?`).run(
    distKm,
    etaMinutes,
    booking.assignment.id
  );

  const updated = getFullBooking(bookingId);
  const targets = [booking.passenger_user_id, req.auth!.userId];
  broadcastEvent('helper:location', {
    bookingId,
    helperId,
    lat,
    lng,
    distanceKm: distKm,
    etaMinutes,
    locationLabel: locationLabel || booking.assignment.helper_location,
  }, targets);
  broadcastEvent('booking:updated', updated, targets);
  res.json({ booking: updated });
});

// ---------- HELPER DASHBOARD ACTIONS ----------

apiRouter.patch('/helper/availability', requireAuth, requireRole('HELPER'), (req: AuthenticatedRequest, res: Response) => {
  const { isAvailable } = req.body;
  db.prepare('UPDATE helpers SET is_available = ? WHERE user_id = ?').run(isAvailable ? 1 : 0, req.auth!.userId);
  res.json({ user: getUserProfile(req.auth!.userId) });
});

apiRouter.post('/helper/assignments/:assignmentId/respond', requireAuth, requireRole('HELPER'), (req: AuthenticatedRequest, res: Response) => {
  const assignmentId = Number(req.params.assignmentId);
  const { action } = req.body as { action: 'ACCEPT' | 'REJECT' };

  const helper = db.prepare('SELECT id, user_id FROM helpers WHERE user_id = ?').get(req.auth!.userId) as
    | { id: number; user_id: number }
    | undefined;
  const assignment = db.prepare('SELECT * FROM helper_assignments WHERE id = ?').get(assignmentId) as
    | { id: number; booking_id: number; helper_id: number }
    | undefined;

  if (!helper || !assignment || assignment.helper_id !== helper.id) {
    res.status(404).json({ error: 'Assignment not found for this helper.' });
    return;
  }

  const booking = getFullBooking(assignment.booking_id) as Record<string, any>;

  if (action === 'ACCEPT') {
    db.prepare(`UPDATE helper_assignments SET status = 'ACCEPTED', responded_at = datetime('now') WHERE id = ?`).run(assignmentId);
    db.prepare(`UPDATE bookings SET status = 'Helper Accepted', updated_at = datetime('now') WHERE id = ?`).run(assignment.booking_id);

    createNotification(
      booking.passenger_user_id,
      booking.id,
      'HELPER_ACCEPTED',
      `Helper Accepted: ${booking.assignment.helper_name}`,
      `${booking.assignment.helper_name} accepted ${booking.booking_code} and will head to ${booking.pickup_location}.`
    );

    const updated = getFullBooking(assignment.booking_id);
    broadcastEvent('booking:updated', updated, [booking.passenger_user_id, req.auth!.userId]);
    res.json({ booking: updated });
    return;
  }

  // REJECT -> automatic reassignment to next best helper
  db.prepare(`UPDATE helper_assignments SET status = 'REJECTED', responded_at = datetime('now') WHERE id = ?`).run(assignmentId);
  const result = autoReassignOrSearchBooking(assignment.booking_id, 'REJECTED');
  res.json(result);
});

// ---------- OTP & QR HANDOVER VERIFICATION ----------

apiRouter.get('/bookings/:id/qr', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const bookingId = Number(req.params.id);
  const full = getFullBooking(bookingId) as Record<string, any> | null;
  if (!full) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }
  if (
    (req.auth!.role === 'PASSENGER' && full.passenger_user_id !== req.auth!.userId) ||
    (req.auth!.role === 'HELPER' && full.assignment?.helper_user_id !== req.auth!.userId)
  ) {
    res.status(403).json({ error: 'Not authorized to access this booking QR code.' });
    return;
  }

  const otpRow = db.prepare('SELECT otp_code, qr_token, is_verified FROM otp_verification WHERE booking_id = ?').get(bookingId) as
    | { otp_code: string; qr_token: string; is_verified: number }
    | undefined;

  if (!otpRow) {
    res.status(404).json({ error: 'OTP record not found.' });
    return;
  }

  const qrDataUrl = await QRCode.toDataURL(
    JSON.stringify({ bookingId, qrToken: otpRow.qr_token, otpCode: otpRow.otp_code }),
    { width: 220, margin: 1, color: { dark: '#123B67', light: '#FFFFFF' } }
  );

  res.json({ qrDataUrl, qrToken: otpRow.qr_token, otpCode: otpRow.otp_code, isVerified: otpRow.is_verified === 1 });
});

apiRouter.post('/bookings/:id/verify-handover', requireAuth, requireRole('HELPER'), (req: AuthenticatedRequest, res: Response) => {
  const bookingId = Number(req.params.id);
  const { otpCode, qrToken } = req.body as { otpCode?: string; qrToken?: string };

  const booking = getFullBooking(bookingId) as Record<string, any> | null;
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }
  if (!booking.assignment || booking.assignment.helper_user_id !== req.auth!.userId) {
    res.status(403).json({ error: 'Only the assigned helper can verify handover and complete this booking.' });
    return;
  }

  const otpRow = db.prepare('SELECT * FROM otp_verification WHERE booking_id = ?').get(bookingId) as
    | { id: number; otp_code: string; qr_token: string; is_verified: number; attempts: number }
    | undefined;

  if (!otpRow) {
    res.status(404).json({ error: 'Handover verification record missing.' });
    return;
  }

  if (otpRow.is_verified === 1) {
    res.status(409).json({ error: 'Handover OTP/QR has already been verified for this booking.' });
    return;
  }

  // Parse QR JSON if user pasted raw JSON payload from scanner
  let normalizedQr = (qrToken || '').trim();
  if (normalizedQr.startsWith('{')) {
    try {
      const parsed = JSON.parse(normalizedQr) as { qrToken?: string };
      if (parsed.qrToken) normalizedQr = parsed.qrToken;
    } catch {
      // keep raw
    }
  }

  const matchesOtp = Boolean(otpCode && otpCode.trim() === otpRow.otp_code);
  const matchesQr = Boolean(normalizedQr && normalizedQr === otpRow.qr_token);

  if (!matchesOtp && !matchesQr) {
    db.prepare('UPDATE otp_verification SET attempts = attempts + 1 WHERE id = ?').run(otpRow.id);
    res.status(400).json({ error: 'Invalid OTP or QR token. Verification failed.' });
    return;
  }

  const helper = db.prepare('SELECT id FROM helpers WHERE user_id = ?').get(req.auth!.userId) as { id: number } | undefined;

  db.transaction(() => {
    db.prepare(
      `UPDATE otp_verification SET is_verified = 1, verified_at = datetime('now'), verified_by_helper_id = ? WHERE id = ?`
    ).run(helper?.id || booking.assignment?.helper_id || null, otpRow.id);

    db.prepare(`UPDATE bookings SET status = 'Assistance Completed', updated_at = datetime('now') WHERE id = ?`).run(bookingId);

    if (booking.assignment) {
      db.prepare(`UPDATE helper_assignments SET status = 'COMPLETED' WHERE id = ?`).run(booking.assignment.id);
      db.prepare(`UPDATE helpers SET completed_jobs = completed_jobs + 1 WHERE id = ?`).run(booking.assignment.helper_id);
    }

    db.prepare(
      `UPDATE payments SET status = 'PAID_SIMULATED', paid_at = COALESCE(paid_at, datetime('now')) WHERE booking_id = ?`
    ).run(bookingId);
  })();

  createNotification(
    booking.passenger_user_id,
    bookingId,
    'OTP_VERIFIED',
    `Handover Verified: ${booking.booking_code}`,
    'Secure OTP/QR handover confirmed. Assistance marked completed.'
  );

  const updated = getFullBooking(bookingId);
  broadcastEvent('booking:updated', updated);
  res.json({ booking: updated, message: 'Secure handover verified and booking completed.' });
});

// ---------- PAYMENTS & REVIEWS ----------

apiRouter.post('/bookings/:id/pay', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const bookingId = Number(req.params.id);
  const { method = 'UPI', upiId = 'passenger@upi' } = req.body;
  const booking = getFullBooking(bookingId) as Record<string, any> | null;
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }

  const txRef = `${method}-SIM-${crypto.randomInt(100000, 999999)}`;
  db.prepare(
    `UPDATE payments SET method = ?, upi_id = ?, transaction_ref = ?, status = 'PAID_SIMULATED', paid_at = datetime('now') WHERE booking_id = ?`
  ).run(method, upiId, txRef, bookingId);

  createNotification(
    booking.passenger_user_id,
    bookingId,
    'PAYMENT_CONFIRMED',
    `Payment Recorded: ₹${booking.estimated_fare}`,
    `Simulated ${method} transaction ${txRef} confirmed for ${booking.booking_code}.`
  );

  const updated = getFullBooking(bookingId);
  broadcastEvent('booking:updated', updated);
  res.json({ booking: updated });
});

apiRouter.post('/bookings/:id/review', requireAuth, requireRole('PASSENGER'), (req: AuthenticatedRequest, res: Response) => {
  const bookingId = Number(req.params.id);
  const { rating, comment = '' } = req.body;
  const numericRating = Number(rating);
  if (!numericRating || numericRating < 1 || numericRating > 5) {
    res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    return;
  }

  const booking = getFullBooking(bookingId) as Record<string, any> | null;
  if (!booking || !booking.assignment) {
    res.status(404).json({ error: 'Completed booking with assigned helper not found.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM reviews WHERE booking_id = ?').get(bookingId);
  if (existing) {
    res.status(409).json({ error: 'You have already submitted a review for this booking.' });
    return;
  }

  db.transaction(() => {
    db.prepare(
      `INSERT INTO reviews (booking_id, passenger_id, helper_id, rating, comment) VALUES (?, ?, ?, ?, ?)`
    ).run(bookingId, booking.passenger_id, booking.assignment.helper_id, numericRating, comment);

    const stats = db
      .prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as cnt FROM reviews WHERE helper_id = ?')
      .get(booking.assignment.helper_id) as { avg_rating: number; cnt: number };

    db.prepare('UPDATE helpers SET rating = ?, total_reviews = ? WHERE id = ?').run(
      Number((stats.avg_rating || numericRating).toFixed(2)),
      stats.cnt,
      booking.assignment.helper_id
    );
  })();

  const updated = getFullBooking(bookingId);
  broadcastEvent('booking:updated', updated);
  res.status(201).json({ booking: updated });
});

apiRouter.get('/helper/reviews', requireAuth, requireRole('HELPER'), (req: AuthenticatedRequest, res: Response) => {
  const reviews = db
    .prepare(
      `SELECT r.*, b.booking_code, b.passenger_name, b.travel_type
       FROM reviews r
       JOIN helpers h ON h.id = r.helper_id
       JOIN bookings b ON b.id = r.booking_id
       WHERE h.user_id = ?
       ORDER BY r.id DESC`
    )
    .all(req.auth!.userId);
  res.json({ reviews });
});

// ---------- NOTIFICATIONS & SUPPORT ----------

apiRouter.get('/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const notifications = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 40')
    .all(req.auth!.userId);
  res.json({ notifications });
});

apiRouter.patch('/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.auth!.userId);
  res.json({ ok: true });
});

apiRouter.post('/support', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { bookingId = null, category = 'General Assistance', subject, description } = req.body;
  if (!subject || !description) {
    res.status(400).json({ error: 'Subject and description are required.' });
    return;
  }
  const result = db
    .prepare(
      `INSERT INTO support_requests (user_id, booking_id, category, subject, description) VALUES (?, ?, ?, ?, ?)`
    )
    .run(req.auth!.userId, bookingId ? Number(bookingId) : null, category, subject, description);

  const ticket = db.prepare('SELECT * FROM support_requests WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ticket });
});

apiRouter.post('/contact/public', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    res.status(400).json({ error: 'Name, email, and message are required.' });
    return;
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS public_contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.prepare(
    `INSERT INTO public_contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)`
  ).run(String(name).trim(), String(email).trim(), subject ? String(subject).trim() : null, String(message).trim());
  res.status(201).json({ message: 'Thank you! Our automated support desk received your message.' });
});

apiRouter.get('/support', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const tickets = db
    .prepare('SELECT * FROM support_requests WHERE user_id = ? ORDER BY id DESC')
    .all(req.auth!.userId);
  res.json({ tickets });
});

// ---------- AUTOMATED SAFETY REPORTING & BLOCKING ----------

apiRouter.post('/reports', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { bookingId, reason, details = '', blockUser = true } = req.body as {
    bookingId?: number;
    reason?: string;
    details?: string;
    blockUser?: boolean;
  };

  if (!bookingId || !reason || !String(reason).trim()) {
    res.status(400).json({ error: 'Booking ID and report reason are required.' });
    return;
  }

  const booking = getFullBooking(Number(bookingId)) as Record<string, any> | null;
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }

  const reporterId = req.auth!.userId;
  let reportedUserId: number | null = null;
  if (req.auth!.role === 'PASSENGER' && booking.passenger_user_id === reporterId) {
    reportedUserId = booking.assignment?.helper_user_id || null;
  } else if (req.auth!.role === 'HELPER' && booking.assignment?.helper_user_id === reporterId) {
    reportedUserId = booking.passenger_user_id || null;
  }

  if (!reportedUserId) {
    res.status(403).json({ error: 'You can only report a participant from your own assigned booking.' });
    return;
  }

  let autoBlocked = false;
  db.transaction(() => {
    db.prepare(
      `INSERT INTO account_reports (reporter_user_id, reported_user_id, booking_id, reason, details, action_taken)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(reporterId, reportedUserId, Number(bookingId), String(reason).trim(), String(details || '').trim(), blockUser ? 'BLOCKED_FOR_REPORTER' : 'LOGGED');

    if (blockUser) {
      db.prepare(
        `INSERT OR IGNORE INTO user_blocks (blocker_user_id, blocked_user_id) VALUES (?, ?)`
      ).run(reporterId, reportedUserId);
    }

    const reportCount = (
      db
        .prepare(`SELECT COUNT(DISTINCT reporter_user_id) as cnt FROM account_reports WHERE reported_user_id = ?`)
        .get(reportedUserId) as { cnt: number }
    ).cnt;

    if (reportCount >= 3) {
      autoBlocked = true;
      db.prepare(`UPDATE users SET account_status = 'BLOCKED' WHERE id = ?`).run(reportedUserId);
      db.prepare(`UPDATE helpers SET verified_status = 'BLOCKED', is_available = 0 WHERE user_id = ?`).run(reportedUserId);
    }
  })();

  res.status(201).json({
    ok: true,
    blocked: Boolean(blockUser),
    autoBlocked,
    message: blockUser
      ? 'Report recorded and this user has been blocked from matching with your account.'
      : 'Safety report recorded.',
  });
});
