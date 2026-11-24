import { apiRequest } from '../api';

export interface GoogleMapsConfig {
  configured: boolean;
  apiKey: string;
}

let cachedConfig: GoogleMapsConfig | null = null;

export async function resolveGoogleMapsConfig(): Promise<GoogleMapsConfig> {
  const clientEnvKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  if (clientEnvKey && !clientEnvKey.startsWith('MY_')) {
    cachedConfig = { configured: true, apiKey: clientEnvKey };
    return cachedConfig;
  }

  if (cachedConfig) return cachedConfig;

  try {
    const res = await apiRequest<GoogleMapsConfig>('/api/maps/config');
    cachedConfig = res;
    return res;
  } catch {
    return { configured: false, apiKey: '' };
  }
}

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export function areLocationsIdentical(
  aLat: number,
  aLng: number,
  aAddress: string,
  bLat: number,
  bLng: number,
  bAddress: string
): boolean {
  const coordDelta = Math.abs(aLat - bLat) + Math.abs(aLng - bLng);
  const sameText =
    aAddress.trim().toLowerCase() === bAddress.trim().toLowerCase() &&
    aAddress.trim().length > 0;
  return coordDelta < 0.00015 || (sameText && coordDelta < 0.001);
}
