import { db } from '../db.ts';
import { haversineKm } from './fare.ts';

export interface MatchCriteria {
  pickupLat: number;
  pickupLng: number;
  numBags: number;
  luggageWeightKg: number;
  mobilityAssistance: boolean;
  wheelchairAssistance: boolean;
  preferredLanguage: string;
  excludeHelperIds?: number[];
  passengerUserId?: number;
}

export interface HelperCandidate {
  helperId: number;
  userId: number;
  fullName: string;
  phone: string;
  avatarUrl: string;
  languagesKnown: string;
  experienceYears: number;
  assistanceCategories: string;
  currentLocation: string;
  lat: number;
  lng: number;
  maxBags: number;
  maxWeightKg: number;
  isAvailable: boolean;
  rating: number;
  totalReviews: number;
  completedJobs: number;
  distanceKm: number;
  etaMinutes: number;
  matchScore: number;
  capacityOk: boolean;
  skillMatch: boolean;
}

interface RawHelperRow {
  helper_id: number;
  user_id: number;
  full_name: string;
  phone: string;
  avatar_url: string;
  languages_known: string;
  experience_years: number;
  assistance_categories: string;
  current_location: string;
  lat: number;
  lng: number;
  max_bags: number;
  max_weight_kg: number;
  is_available: number;
  rating: number;
  total_reviews: number;
  completed_jobs: number;
  verified_status: string;
}

const LANGUAGE_MAP: Record<string, string> = {
  en: 'english',
  kn: 'kannada',
  hi: 'hindi',
};

export function findMatchingHelpers(criteria: MatchCriteria): HelperCandidate[] {
  const rows = db
    .prepare(
      `
      SELECT
        h.id as helper_id,
        h.user_id,
        u.full_name,
        u.phone,
        h.avatar_url,
        h.languages_known,
        h.experience_years,
        h.assistance_categories,
        h.current_location,
        h.lat,
        h.lng,
        h.max_bags,
        h.max_weight_kg,
        h.is_available,
        h.rating,
        h.total_reviews,
        h.completed_jobs,
        h.verified_status
      FROM helpers h
      JOIN users u ON u.id = h.user_id
      WHERE h.verified_status = 'ACTIVE'
        AND COALESCE(u.account_status, 'ACTIVE') = 'ACTIVE'
        AND h.is_available = 1
    `
    )
    .all() as RawHelperRow[];

  const excluded = new Set(criteria.excludeHelperIds || []);
  const blockedUserIds = new Set<number>();
  if (criteria.passengerUserId) {
    const blocks = db
      .prepare(
        `SELECT blocker_user_id, blocked_user_id FROM user_blocks WHERE blocker_user_id = ? OR blocked_user_id = ?`
      )
      .all(criteria.passengerUserId, criteria.passengerUserId) as {
      blocker_user_id: number;
      blocked_user_id: number;
    }[];
    for (const blk of blocks) {
      blockedUserIds.add(
        blk.blocker_user_id === criteria.passengerUserId
          ? blk.blocked_user_id
          : blk.blocker_user_id
      );
    }
  }
  const targetLang = LANGUAGE_MAP[criteria.preferredLanguage] || criteria.preferredLanguage.toLowerCase();

  const candidates: HelperCandidate[] = rows
    .filter((row) => !excluded.has(row.helper_id) && !blockedUserIds.has(row.user_id))
    .map((row) => {
      const distanceKm = haversineKm(criteria.pickupLat, criteria.pickupLng, row.lat, row.lng);
      const etaMinutes = Math.max(2, Math.min(45, Math.round(distanceKm * 2.5 + 2)));

      // 1. Proximity score (0-40)
      const proximityScore = Math.max(0, 40 - Math.min(distanceKm, 25) * 1.5);

      // 2. Rating score (0-25)
      const ratingScore = (Math.min(5, Math.max(0, row.rating)) / 5) * 25;

      // 3. Assistance category match (0-20)
      const cats = row.assistance_categories.toLowerCase();
      let skillPoints = 10;
      let skillMatch = true;
      if (criteria.wheelchairAssistance) {
        if (cats.includes('wheelchair')) {
          skillPoints += 6;
        } else {
          skillMatch = false;
        }
      } else {
        skillPoints += 5;
      }
      if (criteria.mobilityAssistance) {
        if (cats.includes('mobility') || cats.includes('senior') || cats.includes('wheelchair')) {
          skillPoints += 4;
        } else {
          skillMatch = false;
        }
      } else {
        skillPoints += 5;
      }

      // 4. Luggage capacity check (0-10)
      const capacityOk =
        row.max_bags >= criteria.numBags && row.max_weight_kg >= criteria.luggageWeightKg;
      const capacityScore = capacityOk ? 10 : 2;

      // 5. Language match (0-5)
      const langScore = row.languages_known.toLowerCase().includes(targetLang) ? 5 : 1;

      const matchScore = Number(
        Math.min(99.9, proximityScore + ratingScore + Math.min(20, skillPoints) + capacityScore + langScore).toFixed(1)
      );

      return {
        helperId: row.helper_id,
        userId: row.user_id,
        fullName: row.full_name,
        phone: row.phone,
        avatarUrl: row.avatar_url || '/src/assets/images/helper_avatar_arjun_1794979398701.jpg',
        languagesKnown: row.languages_known,
        experienceYears: row.experience_years,
        assistanceCategories: row.assistance_categories,
        currentLocation: row.current_location,
        lat: row.lat,
        lng: row.lng,
        maxBags: row.max_bags,
        maxWeightKg: row.max_weight_kg,
        isAvailable: row.is_available === 1,
        rating: Number(row.rating.toFixed(2)),
        totalReviews: row.total_reviews,
        completedJobs: row.completed_jobs,
        distanceKm,
        etaMinutes,
        matchScore,
        capacityOk,
        skillMatch,
      };
    });

  candidates.sort((a, b) => {
    if (a.capacityOk !== b.capacityOk) return a.capacityOk ? -1 : 1;
    return b.matchScore - a.matchScore;
  });

  return candidates;
}
