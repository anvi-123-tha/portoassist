export type TravelType = 'Airport' | 'Railway Station' | 'Bus Station';

export interface FareInput {
  travelType: TravelType;
  distanceKm: number;
  numBags: number;
  luggageWeightKg: number;
  estimatedDurationMin: number;
  mobilityAssistance: boolean;
  wheelchairAssistance: boolean;
}

export interface FareBreakdown {
  baseFare: number;
  distanceCharge: number;
  luggageCharge: number;
  mobilityCharge: number;
  durationCharge: number;
  totalFare: number;
  distanceKm: number;
  estimatedDurationMin: number;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(0.4, Number((R * c).toFixed(2)));
}

export function calculateFare(input: FareInput): FareBreakdown {
  const baseByType: Record<TravelType, number> = {
    Airport: 149,
    'Railway Station': 99,
    'Bus Station': 79,
  };

  const baseFare = baseByType[input.travelType] ?? 99;
  const distanceKm = Math.max(0.4, Number((input.distanceKm || 0.8).toFixed(2)));
  const distanceCharge = Math.round(distanceKm * 18);

  const bagCharge = Math.max(1, input.numBags) * 25;
  const heavyWeightKg = Math.max(0, (input.luggageWeightKg || 0) - 15);
  const weightCharge = Math.round(heavyWeightKg * 4);
  const luggageCharge = bagCharge + weightCharge;

  const mobilityCharge =
    (input.mobilityAssistance ? 80 : 0) + (input.wheelchairAssistance ? 100 : 0);

  const durationMin = Math.max(20, input.estimatedDurationMin || 30);
  const extraBlocks = Math.max(0, Math.ceil((durationMin - 30) / 30));
  const durationCharge = extraBlocks * 40;

  const totalFare = baseFare + distanceCharge + luggageCharge + mobilityCharge + durationCharge;

  return {
    baseFare,
    distanceCharge,
    luggageCharge,
    mobilityCharge,
    durationCharge,
    totalFare,
    distanceKm,
    estimatedDurationMin: durationMin,
  };
}
