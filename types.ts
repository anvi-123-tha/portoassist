export type Language = 'en' | 'kn' | 'hi';
export type UserRole = 'PASSENGER' | 'HELPER';

export type AppRoute =
  | 'home'
  | 'login'
  | 'register'
  | 'book'
  | 'track'
  | 'passenger-dashboard'
  | 'helper-dashboard';

export type BookingStatus =
  | 'Booking Requested'
  | 'Searching for Helper'
  | 'Helper Assigned'
  | 'Helper Accepted'
  | 'Helper On the Way'
  | 'Assistance Started'
  | 'Assistance Completed'
  | 'Booking Cancelled';

export interface UserProfile {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  preferred_language: Language;
  account_status?: 'ACTIVE' | 'BLOCKED';
  created_at: string;
  passenger?: {
    id: number;
    user_id: number;
    age: number | null;
    accessibility_requirements: string;
    emergency_contact: string;
  };
  helper?: {
    id: number;
    user_id: number;
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
    verified_status: 'ACTIVE' | 'BLOCKED';
  };
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

export interface SelectedLocation {
  formattedAddress: string;
  lat: number;
  lng: number;
  placeId: string;
  verified: boolean;
}

export interface BookingRecord {
  id: number;
  booking_code: string;
  passenger_id: number;
  passenger_user_id: number;
  passenger_name: string;
  passenger_phone: string;
  passenger_email: string;
  travel_type: 'Airport' | 'Railway Station' | 'Bus Station';
  pickup_location: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_place_id?: string | null;
  dropoff_location: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_place_id?: string | null;
  travel_date: string;
  travel_time: string;
  num_bags: number;
  luggage_weight_kg: number;
  num_passengers: number;
  mobility_assistance: number;
  wheelchair_assistance: number;
  assistance_category?: string | null;
  special_requirements: string;
  preferred_language: string;
  distance_km: number;
  estimated_duration_min: number;
  base_fare: number;
  distance_fare: number;
  luggage_fare: number;
  mobility_fare: number;
  extra_fare: number;
  estimated_fare: number;
  payment_method: 'UPI' | 'CASH';
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  assignment: {
    id: number;
    booking_id: number;
    helper_id: number;
    helper_user_id: number;
    helper_name: string;
    helper_phone: string;
    helper_avatar: string;
    helper_rating: number;
    helper_languages: string;
    helper_location: string;
    helper_lat: number;
    helper_lng: number;
    helper_available: number;
    helper_experience: number;
    assignment_type: 'AUTO' | 'MANUAL';
    match_score: number;
    eta_minutes: number;
    distance_km: number;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'TIMEOUT' | 'COMPLETED' | 'CANCELLED';
  } | null;
  payment: {
    id: number;
    booking_id: number;
    amount: number;
    method: 'UPI' | 'CASH';
    upi_id: string | null;
    transaction_ref: string;
    status: 'PENDING' | 'PAID_SIMULATED' | 'CASH_DUE' | 'REFUNDED';
    paid_at: string | null;
  } | null;
  otp: {
    id: number;
    booking_id: number;
    otp_code: string;
    qr_token: string;
    is_verified: number;
    attempts: number;
    verified_at: string | null;
  } | null;
  review: {
    id: number;
    rating: number;
    comment: string;
    created_at: string;
  } | null;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  booking_id: number | null;
  type: string;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
}

export interface SupportTicket {
  id: number;
  user_id: number;
  booking_id: number | null;
  category: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
}
