export interface TransitPoint {
  id: string;
  travelType: 'Airport' | 'Railway Station' | 'Bus Station';
  label: string;
  lat: number;
  lng: number;
}

export const TRANSIT_PICKUP_PRESETS: TransitPoint[] = [
  {
    id: 'kia-t1-arr',
    travelType: 'Airport',
    label: 'Kempegowda International Airport — Terminal 1 Arrivals',
    lat: 13.1981,
    lng: 77.7052,
  },
  {
    id: 'kia-t2-curb',
    travelType: 'Airport',
    label: 'Kempegowda International Airport — Terminal 2 Departure Curb',
    lat: 13.2008,
    lng: 77.7091,
  },
  {
    id: 'ksr-gate1',
    travelType: 'Railway Station',
    label: 'KSR Bengaluru City Railway Station — Gate 1 Pickup',
    lat: 12.9781,
    lng: 77.5702,
  },
  {
    id: 'ypr-main',
    travelType: 'Railway Station',
    label: 'Yesvantpur Junction — Main Concourse Entrance',
    lat: 13.0235,
    lng: 77.5504,
  },
  {
    id: 'majestic-bay14',
    travelType: 'Bus Station',
    label: 'Kempegowda Bus Station (Majestic) — Bay 14 Arrival',
    lat: 12.9762,
    lng: 77.5708,
  },
  {
    id: 'shantinagar-ttmc',
    travelType: 'Bus Station',
    label: 'Shantinagar Bus Terminal (TTMC) — Departure Gate',
    lat: 12.9554,
    lng: 77.5934,
  },
];

export const TRANSIT_DROPOFF_PRESETS: TransitPoint[] = [
  {
    id: 'kia-t1-gate',
    travelType: 'Airport',
    label: 'Kempegowda Airport T1 — Priority Security & Check-in Counter',
    lat: 13.1995,
    lng: 77.7078,
  },
  {
    id: 'kia-taxi-bay',
    travelType: 'Airport',
    label: 'Kempegowda Airport — Accessible Cab & Shuttle Bay',
    lat: 13.1972,
    lng: 77.7044,
  },
  {
    id: 'ksr-plat6',
    travelType: 'Railway Station',
    label: 'KSR Bengaluru City — Platform 6 Elevator Access',
    lat: 12.9794,
    lng: 77.5731,
  },
  {
    id: 'ypr-plat1',
    travelType: 'Railway Station',
    label: 'Yesvantpur Junction — Platform 1 Coach Boarding Zone',
    lat: 13.0247,
    lng: 77.5522,
  },
  {
    id: 'majestic-metro',
    travelType: 'Bus Station',
    label: 'Majestic Metro Interchange — East Accessible Lift',
    lat: 12.9772,
    lng: 77.5724,
  },
  {
    id: 'shantinagar-cab',
    travelType: 'Bus Station',
    label: 'Shantinagar Terminal — Accessible Drop-off & Cab Stand',
    lat: 12.9562,
    lng: 77.5948,
  },
];
