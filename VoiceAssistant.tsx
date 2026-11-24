import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioLines,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LocateFixed,
  Lock,
  Mic,
  MicOff,
  Pause,
  PhoneCall,
  PhoneOff,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  Volume2,
  X,
} from 'lucide-react';
import { apiRequest, getStoredToken, setStoredToken } from '../api';
import { areLocationsIdentical, haversineDistanceKm } from '../config/googleMaps';
import { SPEECH_LANG_CODES } from '../i18n';
import { VOICE_I18N } from '../voiceI18n';
import { LiveVoiceConversation } from './LiveVoiceConversation';
import type { BookingRecord, FareBreakdown, Language, UserProfile } from '../types';

export type VoiceAction =
  | 'BOOK_HELPER'
  | 'SHOW_BOOKINGS'
  | 'TRACK_HELPER'
  | 'CANCEL_BOOKING'
  | 'SHOW_FARE'
  | 'CONTACT_SUPPORT';

interface PlaceCandidate {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  types?: string[];
}

type VoiceStep =
  | 'LANG_SELECT'
  | 'WELCOME_INTENT'
  | 'AUTH_CHECK_REGISTERED'
  | 'REG_NAME'
  | 'REG_PHONE'
  | 'REG_EMAIL'
  | 'REG_PASSWORD'
  | 'REG_CONFIRM_PASSWORD'
  | 'REG_AGE'
  | 'REG_PREF_LANG'
  | 'REG_ACCESSIBILITY'
  | 'REG_SUMMARY_CONFIRM'
  | 'REG_CHOOSE_CHANGE'
  | 'LOGIN_IDENTIFIER'
  | 'LOGIN_AUTH_METHOD'
  | 'LOGIN_OTP'
  | 'LOGIN_PASSWORD'
  | 'FORGOT_IDENTIFIER'
  | 'FORGOT_OTP'
  | 'FORGOT_NEW_PASSWORD'
  | 'AUTH_MAIN_MENU'
  | 'BOOK_PICKUP'
  | 'BOOK_PICKUP_DISAMBIGUATE'
  | 'BOOK_PICKUP_CONFIRM'
  | 'BOOK_DESTINATION'
  | 'BOOK_DEST_DISAMBIGUATE'
  | 'BOOK_DEST_CONFIRM'
  | 'BOOK_DATE'
  | 'BOOK_DATE_CONFIRM'
  | 'BOOK_TIME'
  | 'BOOK_TIME_CONFIRM'
  | 'BOOK_BAGS'
  | 'BOOK_MOBILITY'
  | 'BOOK_PAYMENT'
  | 'BOOK_SUMMARY_CONFIRM'
  | 'BOOK_CHOOSE_CHANGE'
  | 'CONFIRM_CANCEL_EXISTING'
  | 'BOOKING_COMPLETE';

type PendingIntent = 'NONE' | 'BOOK_HELPER' | 'TRACK_BOOKING' | 'BOOKING_HISTORY' | 'CANCEL_BOOKING';

interface VoiceRegDraft {
  fullName: string;
  phone: string;
  email: string;
  age: number | null;
  preferredLanguage: Language;
  accessibilityRequirements: string;
}

interface VoiceBookingDraft {
  pickup: PlaceCandidate | null;
  destination: PlaceCandidate | null;
  travelType: 'Airport' | 'Railway Station' | 'Bus Station';
  distanceKm: number;
  durationMin: number;
  travelDateISO: string;
  travelTime24: string;
  numBags: number;
  mobilityAssistance: boolean;
  wheelchairAssistance: boolean;
  assistanceCategory: string;
  paymentMethod: 'UPI' | 'CASH';
  estimatedFare: number | null;
}

interface VoiceParseResult {
  detectedLanguage?: 'en' | 'kn' | 'hi' | 'UNCLEAR';
  globalCommand: string;
  isCorrection: boolean;
  correctionValue: string;
  selectedLanguage: 'NONE' | 'en' | 'kn' | 'hi';
  useCurrentLocation: boolean;
  choiceIndex: number;
  extractedLocationQuery: string;
  needsLocationConfirmation?: boolean;
  extractedDateISO: string;
  extractedTime24: string;
  assistanceCategory: string;
  accessibilityLabel: string;
  paymentMethod: 'NONE' | 'UPI' | 'CASH';
  fullName: string;
  mobileNumber: string;
  emailAddress: string;
  age: number;
  luggageCount: number;
  wantsMobilitySupport: 'UNKNOWN' | 'YES' | 'NO';
  editTarget: string;
  friendlyClarification: string;
}

interface VoiceAssistantProps {
  open: boolean;
  initialMode?: 'guided' | 'live';
  onClose: () => void;
  onReturnHome: () => void;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  user: UserProfile | null;
  bookings: BookingRecord[];
  onVoiceAuthSuccess: (user: UserProfile) => void;
  onVoiceLogout: () => void;
  onExecuteAction: (action: VoiceAction) => Promise<string> | string;
  onVoiceBookingCompleted: (booking: BookingRecord) => void;
  onBookingCancelled: () => void;
}

const INITIAL_REG_DRAFT: VoiceRegDraft = {
  fullName: '',
  phone: '',
  email: '',
  age: null,
  preferredLanguage: 'en',
  accessibilityRequirements: 'Visually impaired passenger assistance',
};

const INITIAL_BOOKING_DRAFT: VoiceBookingDraft = {
  pickup: null,
  destination: null,
  travelType: 'Railway Station',
  distanceKm: 2,
  durationMin: 35,
  travelDateISO: '',
  travelTime24: '',
  numBags: 1,
  mobilityAssistance: false,
  wheelchairAssistance: false,
  assistanceCategory: 'Luggage & Travel Assistance',
  paymentMethod: 'CASH',
  estimatedFare: null,
};

const WORD_DIGITS: Record<string, string> = {
  zero: '0',
  oh: '0',
  sonne: '0',
  shunya: '0',
  one: '1',
  ondu: '1',
  ek: '1',
  two: '2',
  eradu: '2',
  do: '2',
  three: '3',
  mooru: '3',
  teen: '3',
  four: '4',
  naalku: '4',
  chaar: '4',
  five: '5',
  aidu: '5',
  paanch: '5',
  panch: '5',
  six: '6',
  aaru: '6',
  chhah: '6',
  che: '6',
  seven: '7',
  elu: '7',
  yelu: '7',
  saat: '7',
  eight: '8',
  entu: '8',
  aath: '8',
  nine: '9',
  ombattu: '9',
  nau: '9',
  ten: '10',
};

function isPasswordStep(s: VoiceStep): boolean {
  return (
    s === 'REG_PASSWORD' ||
    s === 'REG_CONFIRM_PASSWORD' ||
    s === 'LOGIN_PASSWORD' ||
    s === 'FORGOT_NEW_PASSWORD'
  );
}

function playSoftCue(kind: 'ready' | 'chime') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const now = ctx.currentTime;
    if (kind === 'ready') {
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.09);
    } else {
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.11);
    }
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 250);
  } catch {
    // Ignore browser audio restriction
  }
}

function formatReadableDate(iso: string, lang: Language): string {
  if (!iso) return '';
  const dt = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString(SPEECH_LANG_CODES[lang] || 'en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatReadableTime(hhmm: string): string {
  if (!hhmm || !hhmm.includes(':')) return hhmm;
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}:00 ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function inferTravelType(place: PlaceCandidate | null): 'Airport' | 'Railway Station' | 'Bus Station' {
  if (!place) return 'Railway Station';
  const haystack = `${place.displayName} ${place.formattedAddress} ${(place.types || []).join(' ')}`.toLowerCase();
  if (haystack.includes('airport') || haystack.includes('terminal')) return 'Airport';
  if (haystack.includes('bus')) return 'Bus Station';
  return 'Railway Station';
}

const CLEAN_SINGLE_ENGLISH_OR_PLACE_TOKENS = new Set([
  'bengaluru',
  'bangalore',
  'airport',
  'station',
  'railway',
  'international',
  'terminal',
  'majestic',
  'indiranagar',
  'koramangala',
  'whitefield',
  'yeshwanthpur',
  'kempegowda',
  'tomorrow',
  'today',
  'english',
  'kannada',
  'hindi',
  'register',
  'booking',
  'confirm',
  'location',
  'current',
  'wheelchair',
  'mobility',
  'luggage',
  'assistance',
  'password',
  'support',
  'history',
  'goodbye',
  'welcome',
  'helper',
]);

function splitGluedEnglishSpeech(raw: string): string {
  const camelSplit = raw.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  const tokens = camelSplit.split(/\s+/);
  const expanded = tokens.map((tok) => {
    const cleanLower = tok.toLowerCase().replace(/[^a-z]/g, '');
    if (cleanLower.length < 7 || CLEAN_SINGLE_ENGLISH_OR_PLACE_TOKENS.has(cleanLower)) {
      return tok;
    }
    if (
      /(iwanttogoto|wanttogoto|imgoingto|iwantto|wantto|goingto|takemeto|bookahelper|bookhelper|railwaystation|internationalairport|busstand|metrostation|bengaluru|bangalore|kempegowda|airport|station|railway)/i.test(
        tok
      )
    ) {
      return tok
        .replace(/iwanttogoto/gi, 'I want to go to ')
        .replace(/wanttogoto/gi, 'want to go to ')
        .replace(/imgoingto/gi, "I'm going to ")
        .replace(/iwantto/gi, 'I want to ')
        .replace(/wantto/gi, 'want to ')
        .replace(/goingto/gi, 'going to ')
        .replace(/takemeto/gi, 'take me to ')
        .replace(/bookahelper/gi, 'book a helper ')
        .replace(/bookhelper/gi, 'book helper ')
        .replace(/goto/gi, 'go to ')
        .replace(/railwaystation/gi, ' railway station ')
        .replace(/internationalairport/gi, ' international airport ')
        .replace(/busstand/gi, ' bus stand ')
        .replace(/metrostation/gi, ' metro station ')
        .replace(/kempegowda/gi, ' Kempegowda ')
        .replace(/bengaluru/gi, ' Bengaluru ')
        .replace(/bangalore/gi, ' Bangalore ')
        .replace(/railway/gi, ' railway ')
        .replace(/airport/gi, ' airport ')
        .replace(/station/gi, ' station ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    return tok;
  });
  return expanded.join(' ').replace(/\s+/g, ' ').trim();
}

function localParseLanguage(raw: string): Language | null {
  const clean = raw.toLowerCase().trim();
  if (/(english|इंग्लिश|अंग्रेजी|ಇಂಗ್ಲಿಷ್|inglish)/.test(clean) || /^(1|one|ಒಂದು|एक)$/.test(clean)) {
    return 'en';
  }
  if (/(kannada|ಕನ್ನಡ|कन्नड़|kannad)/.test(clean) || /^(2|two|ಎರಡು|दो)$/.test(clean)) {
    return 'kn';
  }
  if (/(hindi|हिन्दी|हिंदी|ಹಿಂದಿ)/.test(clean) || /^(3|three|ಮೂರು|तीन)$/.test(clean)) {
    return 'hi';
  }
  return null;
}

function localParseYesNo(raw: string): 'YES' | 'NO' | 'NONE' {
  const clean = raw.toLowerCase().trim();
  if (
    /\b(yes|yeah|yep|correct|confirm|right|sure|proceed|ok|okay|already registered|howdu|haudu|sari|haan|haa|theek hai|thik hai|bilkul|zaroor)\b/.test(clean) ||
    /(ಹೌದು|ಸರಿ|ಖಂಡಿತ|हाँ|हां|सही|ठीक|बिल्कुल|ज़रूर)/.test(clean)
  ) {
    return 'YES';
  }
  if (
    /\b(no|nope|not yet|haven't|new user|wrong|incorrect|change|edit|modify|illa|beda|nahi|nahin)\b/.test(clean) ||
    /(ಇಲ್ಲ|ಬೇಡ|ನಹಿ|ತಪ್ಪು|नहीं|नही|गलत|नहीं चाहिए)/.test(clean)
  ) {
    return 'NO';
  }
  return 'NONE';
}

function localParseEmail(raw: string): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/\s+at\s+/g, '@')
    .replace(/\s+dot\s+/g, '.')
    .replace(/\s+/g, '');
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : '';
}

function localParseDateISO(raw: string): string {
  const clean = raw.toLowerCase().trim();
  const now = new Date();
  const toISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (/\b(today|tonight|indu|aaj)\b|ಇಂದು|आज/.test(clean)) return toISO(now);
  if (/\b(day after tomorrow|naadiddu|parso)\b|ನಾಡಿದ್ದು|परसों/.test(clean)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    return toISO(d);
  }
  if (/\b(tomorrow|naale|kal)\b|ನಾಳೆ|कल/.test(clean)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return toISO(d);
  }

  const isoMatch = clean.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  const sanitized = clean.replace(/\b(\d{1,2})(st|nd|rd|th)\b/g, '$1');
  const parsed = new Date(sanitized);
  if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() >= now.getFullYear()) {
    return toISO(parsed);
  }
  return '';
}

function localParseTime24(raw: string): string {
  const clean = raw
    .toLowerCase()
    .replace(/\ba\.?\s*m\.?\b/g, 'am')
    .replace(/\bp\.?\s*m\.?\b/g, 'pm')
    .trim();

  if (/\bnoon\b|ಮಧ್ಯಾಹ್ನ|दोपहर/.test(clean) && !/\d/.test(clean)) return '12:00';
  if (/\bmidnight\b/.test(clean)) return '00:00';

  const m = clean.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (!m) return '';
  let hour = Number(m[1]);
  const minute = m[2] ? Number(m[2]) : 0;
  let period = m[3] || '';

  if (minute > 59 || hour > 23) return '';
  if (!period) {
    if (/(evening|night|afternoon|shaam|raat|dopahar|ಸಂಜೆ|ರಾತ್ರಿ|ಮಧ್ಯಾಹ್ನ|शाम|रात|दोपहर)/.test(clean) && hour < 12) {
      period = 'pm';
    } else if (/(morning|subah|ಬೆಳಿಗ್ಗೆ|सुबह)/.test(clean)) {
      period = 'am';
    }
  }
  if (period === 'pm' && hour < 12) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function normalizeSpokenDigits(raw: string): string {
  const tokens = raw.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
  let out = '';
  for (const tok of tokens) {
    if (/^\d+$/.test(tok)) {
      out += tok;
    } else if (WORD_DIGITS[tok] !== undefined && WORD_DIGITS[tok].length === 1) {
      out += WORD_DIGITS[tok];
    }
  }
  return out;
}

function localParseNumber(raw: string): number | null {
  const clean = raw.toLowerCase().trim();
  if (/\b(none|zero|no bags|no luggage|nothing|shunya)\b|ಯಾವುದೂ ಇಲ್ಲ|ಸೊನ್ನೆ|शून्य|कोई नहीं/.test(clean)) return 0;
  if (/\b(one|first|single|ondu|ek)\b|ಒಂದು|एक/.test(clean)) return 1;
  if (/\b(two|second|couple|eradu|do)\b|ಎರಡು|दो/.test(clean)) return 2;
  if (/\b(three|third|mooru|teen)\b|ಮೂರು|तीन/.test(clean)) return 3;
  if (/\b(four|fourth|naalku|chaar)\b|ನಾಲ್ಕು|चार/.test(clean)) return 4;
  if (/\b(five|aidu|paanch|panch)\b|ಐದು|पाँच|पांच/.test(clean)) return 5;
  if (/\b(six|aaru|chhah|che)\b|ಆರು|छह/.test(clean)) return 6;
  const digitMatch = clean.match(/\b(\d{1,3})\b/);
  return digitMatch ? Number(digitMatch[1]) : null;
}

function detectLocalGlobalCommand(raw: string, currentStep: VoiceStep): string {
  const clean = raw.toLowerCase().trim();
  if (
    /^(end conversation|goodbye|good bye|bye|hang up|close voice assistant|close assistant)$/.test(clean) ||
    clean.includes('end conversation') ||
    clean.includes('end call') ||
    /(ಅಲ್ವಿದಾ|ಕರೆ ಮುಗಿಸಿ|ವಿದಾಯ|अलविदा|कॉल बंद|कॉल समाप्त)/.test(clean)
  ) {
    return 'END_CONVERSATION';
  }
  if (/^(pause|pause mic|pause listening|hold on)$/.test(clean) || /(ವಿರಾಮ|ತಡೆಯಿರಿ|पॉज़|रुकिए)/.test(clean)) {
    return 'PAUSE';
  }
  if (/^(stop speaking|stop talking|quiet|silence|mute)$/.test(clean) || clean.includes('stop speaking')) {
    return 'STOP_SPEAKING';
  }
  if (/^(continue|resume|resume call)$/.test(clean) || /(ಮುಂದುವರಿಸಿ|जारी रखें)/.test(clean)) {
    return 'RESUME';
  }
  if (/^(repeat|say again|say that again|pardon|repeat please|repeat question)$/.test(clean) || /(ಮತ್ತೆ ಹೇಳಿ|ಪುನಃ ಹೇಳಿ|फिर से बोलो|दोहराएं|दोबारा बोलो)/.test(clean)) {
    return 'REPEAT';
  }
  if (clean.includes('change language') || clean.includes('switch language')) {
    return 'CHANGE_LANGUAGE';
  }
  if (clean.includes('return home') || clean === 'return to home' || clean === 'go home') {
    return 'RETURN_HOME';
  }
  if (clean.includes('what are my options') || /^(options|choices)$/.test(clean)) return 'WHAT_OPTIONS';
  if (/^(go back|back|previous|previous step)$/.test(clean) || /(ಹಿಂದೆ|ಹಿಂದಕ್ಕೆ|पीछे|वापस)/.test(clean)) return 'GO_BACK';
  if (clean.includes('forgot password') || clean.includes('reset password')) return 'FORGOT_PASSWORD';
  if (clean === 'help' || clean.includes('voice help')) return 'HELP';

  if (
    currentStep === 'LOGIN_AUTH_METHOD' ||
    currentStep === 'LOGIN_IDENTIFIER' ||
    currentStep === 'LOGIN_PASSWORD'
  ) {
    if (/(send otp|voice otp|use otp|\botp\b|ಒಟಿಪಿ|ओटीपी)/.test(clean)) {
      return 'VOICE_OTP_LOGIN';
    }
  }

  // If user clearly states a mid-flow correction, do NOT misclassify as plain NO or YES
  const hasCorrectionCue =
    /(mistake|wrong|change|update|actually|correction|instead|meant to|ಬದಲಾಯಿಸಿ|ತಪ್ಪಾಗಿದೆ|बदलना|गलत)/.test(clean) &&
    /(destination|drop|airport|station|pickup|phone|mobile|number|email|name|age|date|time|bag|luggage|wheelchair|mobility|payment|upi|cash|ಪಿಕಪ್|ಗಮ್ಯಸ್ಥಾನ|ದಿನಾಂಕ|ಸಮಯ|पिकअप|गंतव्य|तारीख|समय)/.test(
      clean
    );
  if (hasCorrectionCue) {
    return 'NONE';
  }

  if (
    currentStep === 'AUTH_CHECK_REGISTERED' ||
    currentStep === 'REG_SUMMARY_CONFIRM' ||
    currentStep === 'BOOK_PICKUP_CONFIRM' ||
    currentStep === 'BOOK_DEST_CONFIRM' ||
    currentStep === 'BOOK_DATE_CONFIRM' ||
    currentStep === 'BOOK_TIME_CONFIRM' ||
    currentStep === 'BOOK_SUMMARY_CONFIRM' ||
    currentStep === 'CONFIRM_CANCEL_EXISTING'
  ) {
    const yn = localParseYesNo(clean);
    if (yn !== 'NONE') return yn;
    if (/\bcancel\b|ರದ್ದು|कैंसल|रद्द/.test(clean)) return 'CANCEL_FLOW';
  }

  if (
    /(cancel.*booking|booking.*cancel|ಬುಕಿಂಗ್ ರದ್ದು|बुकिंग रद्द)/.test(clean)
  ) {
    return 'CANCEL_BOOKING';
  }

  if (currentStep === 'WELCOME_INTENT') {
    if (
      clean.includes('book') ||
      clean.includes('helper') ||
      clean.includes('luggage') ||
      clean.includes('assistance') ||
      /(ಬುಕ್|ಸಹಾಯಕ|ಸಹಾಯ|ಹೆಲ್ಪರ್|हेल्पर|बुक|मदद)/.test(clean)
    ) {
      return 'BOOK_HELPER';
    }
    if (
      clean.includes('register') ||
      clean.includes('new account') ||
      clean.includes('sign up') ||
      /(ನೋಂದಣಿ|ನೋಂದಾಯಿಸಿ|ಹೊಸ ಖಾತೆ|रजिस्टर|नया खाता)/.test(clean)
    ) {
      return 'REGISTER';
    }
    if (
      clean.includes('sign in') ||
      clean.includes('login') ||
      clean.includes('log in') ||
      /(ಸೈನ್ ಇನ್|ಲಾಗಿನ್|लॉगिन|साइन इन)/.test(clean)
    ) {
      return 'SIGN_IN';
    }
    if (clean.includes('track') || /(ಟ್ರ್ಯಾಕ್|ट्रैक)/.test(clean)) return 'TRACK_BOOKING';
    if (clean.includes('history') || clean.includes('bookings') || /(ಇತಿಹಾಸ|इतिहास|बुकिंग)/.test(clean)) {
      return 'BOOKING_HISTORY';
    }
    if (clean.includes('support') || clean.includes('help desk') || /(ಬೆಂಬಲ|ಸಹಾಯ ಕೇಂದ್ರ|सपोर्ट|हेल्पलाइन)/.test(clean)) {
      return 'CUSTOMER_SUPPORT';
    }
  }

  if (currentStep === 'AUTH_MAIN_MENU' || currentStep === 'BOOKING_COMPLETE') {
    if (
      /^(1|one|option 1|ಒಂದು|एक)$/.test(clean) ||
      /\bbook\b.*\bhelper\b|\bhelper\b.*\bbook\b/.test(clean) ||
      clean.includes('book another') ||
      /(ಬುಕ್|ಸಹಾಯಕ|बुक|हेल्पर)/.test(clean)
    ) {
      return 'BOOK_HELPER';
    }
    if (/^(2|two|option 2|ಎರಡು|दो)$/.test(clean) || clean.includes('track') || /(ಟ್ರ್ಯಾಕ್|ट्रैक)/.test(clean)) {
      return 'TRACK_BOOKING';
    }
    if (/^(3|three|option 3|ಮೂರು|तीन)$/.test(clean) || clean.includes('history') || clean.includes('bookings') || /(ಇತಿಹಾಸ|इतिहास)/.test(clean)) {
      return 'BOOKING_HISTORY';
    }
    if (/^(4|four|option 4|ನಾಲ್ಕು|चार)$/.test(clean) || clean.includes('support') || clean.includes('contact') || /(ಬೆಂಬಲ|ಸಹಾಯ|सपोर्ट)/.test(clean)) {
      return 'CUSTOMER_SUPPORT';
    }
    if (
      /^(5|five|option 5|ಐದು|पाँच)$/.test(clean) ||
      clean.includes('log out') ||
      clean.includes('logout') ||
      clean.includes('sign out') ||
      /(ಲಾಗ್ ಔಟ್|ಸೈನ್ ಔಟ್|लॉग आउट|साइन आउट)/.test(clean)
    ) {
      return 'LOGOUT';
    }
  }

  return 'NONE';
}

function detectLocalCorrection(raw: string): { editTarget: string; value: string } | null {
  const clean = raw.toLowerCase().trim();
  const isCue =
    /(mistake|wrong|change|update|actually|correction|instead|i meant|make it|ಬದಲಾಯಿಸಿ|ತಪ್ಪಾಗಿದೆ|ಬೇರೆ|बदलना|गलत|बदलो)/.test(clean);
  if (!isCue) return null;

  if (/(pickup|pick up|start from|ಪಿಕಪ್|पिकअप)/.test(clean)) {
    const m = clean.match(/(?:pickup to|pick up to|pickup|from|at)\s+(?:the\s+)?(.+)$/i);
    return { editTarget: 'PICKUP', value: m?.[1]?.trim() || '' };
  }
  if (/(destination|drop|go to|going to|airport|railway|station|terminal|bus stand|metro|ಗಮ್ಯಸ್ಥಾನ|गंतव्य)/.test(clean)) {
    const m = clean.match(
      /(?:go to|destination to|drop at|drop me at|meant|actually,?|instead,?|make it|to)\s+(?:the\s+)?(.+)$/i
    );
    const extracted = m?.[1]?.trim() || '';
    const cleaned =
      extracted && !/^(change|update|destination|drop)$/i.test(extracted) ? extracted : '';
    return { editTarget: 'DESTINATION', value: cleaned };
  }
  if (/(phone|mobile|number|ಮೊಬೈಲ್|ಫೋನ್|मोबाइल|नंबर)/.test(clean)) {
    const digits = normalizeSpokenDigits(clean);
    return { editTarget: 'PHONE', value: digits };
  }
  if (/(email|ಇಮೇಲ್|ईमेल)/.test(clean)) {
    const em = localParseEmail(clean.replace(/.*email(?:\s+is|\s+to)?\s+/i, ''));
    return { editTarget: 'EMAIL', value: em };
  }
  if (/\bname\b|ಹೆಸರು|नाम/.test(clean)) {
    const m = clean.match(/name(?:\s+is|\s+to)?\s+([a-z\s]{2,})/i);
    return { editTarget: 'NAME', value: m?.[1]?.trim() || '' };
  }
  if (/\bage\b|ವಯಸ್ಸು|उम्र/.test(clean)) {
    const n = localParseNumber(clean);
    return { editTarget: 'AGE', value: n ? String(n) : '' };
  }
  if (/\bdate\b|\b(today|tomorrow|day after tomorrow)\b|ದಿನಾಂಕ|ತಾರೀಖು|तारीख/.test(clean)) {
    const d = localParseDateISO(clean);
    return { editTarget: 'DATE', value: d };
  }
  if (/\btime\b|\b\d{1,2}(:\d{2})?\s*(am|pm|a\.m\.|p\.m\.)\b|ಸಮಯ|ಗಂಟೆ|समय|बजे/.test(clean)) {
    const t = localParseTime24(clean);
    return { editTarget: 'TIME', value: t };
  }
  if (/(bag|bags|luggage|suitcase|ಬ್ಯಾಗ್|ಲಗೇಜ್|बैग|सामान)/.test(clean)) {
    const n = localParseNumber(clean);
    return { editTarget: 'LUGGAGE', value: n !== null ? String(n) : '' };
  }
  if (/(wheelchair|mobility|assistance|ವೀಲ್|ಚಲನಶೀಲತೆ|व्हीलचेयर|मोबिलिटी)/.test(clean)) {
    return {
      editTarget: 'ASSISTANCE',
      value: /wheelchair|ವೀಲ್|व्हील/.test(clean) ? 'wheelchair' : localParseYesNo(clean),
    };
  }
  if (/(payment|pay|upi|cash|ಪಾವತಿ|ನಗದು|भुगतान|नकद)/.test(clean)) {
    return {
      editTarget: 'PAYMENT',
      value: /upi|ಯುಪಿಐ|यूपीआई/.test(clean) ? 'UPI' : /cash|ನಗದು|नकद/.test(clean) ? 'CASH' : '',
    };
  }
  return null;
}

function translatePlaceTermsToEnglish(raw: string): string {
  return raw
    .replace(/(?:ಬೆಂಗಳೂರು|ಬೆಂಗಳೂರಿಗೆ|ಬೆಂಗಳೂರಿನ|बेंगलुरु|बंगलौर)/g, ' Bengaluru ')
    .replace(/(?:ಮೈಸೂರು|ಮೈಸೂರಿಗೆ|मैसूर)/g, ' Mysuru ')
    .replace(/(?:ಕೆಂಪೇಗೌಡ|केम्पेगौड़ा)/g, ' Kempegowda ')
    .replace(/(?:ಅಂತರಾಷ್ಟ್ರೀಯ|ಅಂತರರಾಷ್ಟ್ರೀಯ|अंतरराष्ट्रीय)/g, ' International ')
    .replace(/(?:ವಿಮಾನ\s*ನಿಲ್ದಾಣಕ್ಕೆ|ವಿಮಾನ\s*ನಿಲ್ದಾಣ|ಏರ್‌ಪೋರ್ಟ್|ಏರ್ಪೋರ್ಟ್|एयरपोर्ट|हवाई\s*अड्डा|हवाई\s*अड्डे)/g, ' Airport ')
    .replace(/(?:ರೈಲ್ವೆ\s*ನಿಲ್ದಾಣಕ್ಕೆ|ರೈಲ್ವೆ\s*ನಿಲ್ದಾಣ|रेलवे\s*स्टेशन)/g, ' Railway Station ')
    .replace(/(?:ಮೆಟ್ರೋ\s*ನಿಲ್ದಾಣಕ್ಕೆ|ಮೆಟ್ರೋ\s*ನಿಲ್ದಾಣ|मेट्रो\s*स्टेशन)/g, ' Metro Station ')
    .replace(/(?:ಬಸ್\s*ನಿಲ್ದಾಣಕ್ಕೆ|ಬಸ್\s*ನಿಲ್ದಾಣ|ಬಸ್\s*ಸ್ಟ್ಯಾಂಡ್|बस\s*स्टैंड|बस\s*अड्डा)/g, ' Bus Stand ')
    .replace(/(?:ಮೆಜೆಸ್ಟಿಕ್|मैजेस्टिक)/g, ' Majestic ')
    .replace(/(?:ಯಶವಂತಪುರ|यशवंतपुर)/g, ' Yeshwanthpur ')
    .replace(/(?:ಇಂದಿರಾನಗರ|इंदिरानगर)/g, ' Indiranagar ')
    .replace(/(?:ಕೋರಮಂಗಲ|कोरमंगला)/g, ' Koramangala ')
    .replace(/(?:ವೈಟ್‌ಫೀಲ್ಡ್|ವೈಟ್‌ಫೀಲ್ಡ್‌|व्हाइटफील्ड)/g, ' Whitefield ')
    .replace(/(?:ನಿಲ್ದಾಣಕ್ಕೆ|ನಿಲ್ದಾಣ|स्टेशन)/g, ' Station ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripLocationLeadIn(raw: string): string {
  let out = translatePlaceTermsToEnglish(splitGluedEnglishSpeech(raw)).trim();
  for (let i = 0; i < 3; i += 1) {
    const next = out
      .replace(
        /^(?:actually|wait|please|can you|i want to|i would like to|i meant|take me to|go to|going to|travel to|drop me at|drop at|destination is|my destination is|pickup from|pickup at|pick me up from|pick me up at|pickup is|my pickup is|start from|from|at|to|near|nanage|nanu|naanu|mujhe|mera|hum|ನನಗೆ|ನಾನು|ನನ್ನ|ಪಿಕಪ್|ಗಮ್ಯಸ್ಥಾನ|मुझे|मेरा|मैं|हम|पिकअप|गंतव्य)[,\s]+/i,
        ''
      )
      .replace(/^(?:the\s+)/i, '')
      .trim();
    if (next === out) break;
    out = next;
  }
  // Strip trailing Kannada/Hindi travel verbs/postpositions (e.g. "Airport ge hogbeku", "Majestic inda pickup maadi")
  for (let i = 0; i < 3; i += 1) {
    const next = out
      .replace(
        /[,\s]+(?:please|thanks|thank you|hogbeku|hogabeku|hogona|maadbeku|madbeku|maadi|madi|beku|jaana hai|jana hai|jaana|jana|chahiye|hai|pickup|drop|se|ko|ge|inda|ninda|alli|ಹೋಗಬೇಕು|ಹೋಗಲು|ಬಯಸುತ್ತೇನೆ|ಮಾಡಿ|ಬೇಕಾಗಿದೆ|ಬೇಕು|ಪಿಕಪ್|ನಿಂದ|ಗೆ|ಕ್ಕೆ|जाना है|जाना|चाहिए|पिकअप|से|को|तक|है)[.!?।॥]*$/i,
        ''
      )
      .replace(/[.!?।॥]+$/, '')
      .trim();
    if (next === out) break;
    out = next;
  }
  return out;
}

function buildEmptyParseResult(): VoiceParseResult {
  return {
    globalCommand: 'NONE',
    isCorrection: false,
    correctionValue: '',
    selectedLanguage: 'NONE',
    useCurrentLocation: false,
    choiceIndex: 0,
    extractedLocationQuery: '',
    extractedDateISO: '',
    extractedTime24: '',
    assistanceCategory: '',
    accessibilityLabel: '',
    paymentMethod: 'NONE',
    fullName: '',
    mobileNumber: '',
    emailAddress: '',
    age: 0,
    luggageCount: -1,
    wantsMobilitySupport: 'UNKNOWN',
    editTarget: 'NONE',
    friendlyClarification: '',
  };
}

function tryResolveLocallyFast(
  raw: string,
  currentStep: VoiceStep,
  candidatesList: PlaceCandidate[]
): VoiceParseResult | null {
  const clean = raw.trim();
  const lower = clean.toLowerCase();

  // Check inline mid-flow correction first when unambiguous
  if (
    !isPasswordStep(currentStep) &&
    currentStep !== 'LANG_SELECT' &&
    currentStep !== 'REG_CHOOSE_CHANGE' &&
    currentStep !== 'BOOK_CHOOSE_CHANGE'
  ) {
    const corr = detectLocalCorrection(clean);
    if (corr) {
      const base = buildEmptyParseResult();
      base.isCorrection = true;
      base.editTarget = corr.editTarget;
      base.correctionValue = corr.value;
      if (corr.editTarget === 'PICKUP' || corr.editTarget === 'DESTINATION') {
        base.extractedLocationQuery = stripLocationLeadIn(corr.value);
        if (/(current location|gps|my location)/i.test(lower)) {
          base.useCurrentLocation = true;
        }
      }
      return base;
    }
  }

  const base = buildEmptyParseResult();

  switch (currentStep) {
    case 'LANG_SELECT':
    case 'REG_PREF_LANG': {
      const lang = localParseLanguage(clean);
      if (lang) {
        base.selectedLanguage = lang;
        return base;
      }
      return null;
    }
    case 'REG_NAME': {
      const stripped = clean
        .replace(/^(?:my name is|i am|this is|name is|call me|it is|it's)\s+/i, '')
        .trim();
      const words = stripped.split(/\s+/).filter(Boolean);
      if (
        stripped.length >= 2 &&
        stripped.length <= 50 &&
        words.length <= 5 &&
        !/\d/.test(stripped) &&
        !/\b(what|why|how|when|help|change|repeat|cancel)\b/i.test(lower)
      ) {
        base.fullName = stripped;
        return base;
      }
      return null;
    }
    case 'REG_PHONE': {
      const digits = normalizeSpokenDigits(clean);
      if (digits.length >= 10 && digits.length <= 13) {
        base.mobileNumber = digits;
        return base;
      }
      return null;
    }
    case 'REG_EMAIL': {
      const em = localParseEmail(clean);
      if (em) {
        base.emailAddress = em;
        return base;
      }
      return null;
    }
    case 'REG_AGE': {
      const ageNum = localParseNumber(clean);
      if (ageNum !== null && ageNum >= 12 && ageNum <= 110) {
        base.age = ageNum;
        return base;
      }
      return null;
    }
    case 'REG_ACCESSIBILITY': {
      if (/(visual|blind|sight|senior|elder|old|wheelchair|chair|mobility|walk)/.test(lower) || /^(no|none|nothing)$/.test(lower)) {
        if (/(visual|blind|sight)/.test(lower)) base.accessibilityLabel = 'Visually impaired passenger assistance';
        else if (/(senior|elder|old)/.test(lower)) base.accessibilityLabel = 'Senior citizen mobility assistance';
        else if (/(wheelchair|chair)/.test(lower)) base.accessibilityLabel = 'Wheelchair assistance';
        else if (/(mobility|walk)/.test(lower)) base.accessibilityLabel = 'Mobility assistance';
        else base.accessibilityLabel = 'General travel assistance';
        return base;
      }
      return null;
    }
    case 'REG_CHOOSE_CHANGE': {
      if (/\bname\b/.test(lower)) base.editTarget = 'NAME';
      else if (/(phone|mobile|number)/.test(lower)) base.editTarget = 'PHONE';
      else if (/\bemail\b/.test(lower)) base.editTarget = 'EMAIL';
      else if (/\bpassword\b/.test(lower)) base.editTarget = 'PASSWORD';
      else if (/\bage\b/.test(lower)) base.editTarget = 'AGE';
      else if (/\blanguage\b/.test(lower)) base.editTarget = 'LANGUAGE';
      else if (/(assistance|access|special|wheelchair|mobility)/.test(lower)) base.editTarget = 'ASSISTANCE';
      return base.editTarget !== 'NONE' ? base : null;
    }
    case 'LOGIN_IDENTIFIER':
    case 'FORGOT_IDENTIFIER': {
      const em = localParseEmail(clean);
      if (em) {
        base.emailAddress = em;
        return base;
      }
      const digits = normalizeSpokenDigits(clean);
      if (digits.length >= 10 && digits.length <= 13) {
        base.mobileNumber = digits;
        return base;
      }
      return null;
    }
    case 'LOGIN_AUTH_METHOD': {
      if (/(otp|code|voice|hands|one time|password|type|screen|ಒಟಿಪಿ|ओटीपी|ಪಾಸ್‌ವರ್ಡ್|पासवर्ड)/.test(lower)) {
        return base;
      }
      return null;
    }
    case 'LOGIN_OTP':
    case 'FORGOT_OTP': {
      const otp = normalizeSpokenDigits(clean);
      if (otp.length === 6) {
        base.mobileNumber = otp;
        return base;
      }
      return null;
    }
    case 'BOOK_PICKUP': {
      if (
        /\b(use my current location|current location|my location|detect gps|gps|here|illinda|yahaan se|yahan se)\b|ನನ್ನ ಪ್ರಸ್ತುತ|ಇಲ್ಲಿಂದ|मेरा वर्तमान|यहाँ से/i.test(
          lower
        )
      ) {
        base.useCurrentLocation = true;
        return base;
      }
      const q = stripLocationLeadIn(clean);
      if (
        q.length >= 2 &&
        q.length <= 80 &&
        !/^(what|why|how|help|wait|ಏನು|ಹೇಗೆ|ಯಾವಾಗ|क्या|कैसे|कब)\b/i.test(lower)
      ) {
        base.extractedLocationQuery = q;
        return base;
      }
      return null;
    }
    case 'BOOK_DESTINATION': {
      const q = stripLocationLeadIn(clean);
      if (
        q.length >= 2 &&
        q.length <= 80 &&
        !/^(what|why|how|help|wait|ಏನು|ಹೇಗೆ|ಯಾವಾಗ|क्या|कैसे|कब)\b/i.test(lower)
      ) {
        base.extractedLocationQuery = q;
        return base;
      }
      return null;
    }
    case 'BOOK_PICKUP_DISAMBIGUATE':
    case 'BOOK_DEST_DISAMBIGUATE': {
      if (/\b(search again|none|different|no|ಬೇರೆ|ಮತ್ತೆ ಹುಡುಕಿ|दूसरा|फिर से)\b/i.test(lower)) return base;
      const idx = localParseNumber(clean);
      if (idx && idx >= 1 && idx <= candidatesList.length) {
        base.choiceIndex = idx;
        return base;
      }
      return null;
    }
    case 'BOOK_DATE': {
      const dt = localParseDateISO(clean);
      const todayIso = new Date().toISOString().slice(0, 10);
      if (dt && /^\d{4}-\d{2}-\d{2}$/.test(dt) && dt >= todayIso) {
        base.extractedDateISO = dt;
        return base;
      }
      return null;
    }
    case 'BOOK_TIME': {
      const tm = localParseTime24(clean);
      if (tm && /^\d{2}:\d{2}$/.test(tm)) {
        base.extractedTime24 = tm;
        return base;
      }
      return null;
    }
    case 'BOOK_BAGS': {
      const cnt = localParseNumber(clean);
      if (cnt !== null && cnt >= 0 && cnt <= 15) {
        base.luggageCount = cnt;
        return base;
      }
      return null;
    }
    case 'BOOK_MOBILITY': {
      if (/(wheelchair|chair|ವೀಲ್|व्हील)/.test(lower)) {
        base.assistanceCategory = 'WHEELCHAIR';
        base.wantsMobilitySupport = 'YES';
        return base;
      }
      const yn = localParseYesNo(clean);
      if (yn === 'YES' || yn === 'NO') {
        base.wantsMobilitySupport = yn;
        return base;
      }
      if (/(escort|mobility|assist|support)/.test(lower)) {
        base.wantsMobilitySupport = 'YES';
        return base;
      }
      return null;
    }
    case 'BOOK_PAYMENT': {
      if (/(upi|google pay|phonepe|paytm|online|ಯುಪಿಐ|यूपीआई)/.test(lower)) {
        base.paymentMethod = 'UPI';
        return base;
      }
      if (/(cash|ನಗದು|नकद|कैश)/.test(lower)) {
        base.paymentMethod = 'CASH';
        return base;
      }
      return null;
    }
    case 'BOOK_CHOOSE_CHANGE': {
      if (/(pickup|current location|start)/.test(lower)) base.editTarget = 'PICKUP';
      else if (/(destination|drop)/.test(lower)) base.editTarget = 'DESTINATION';
      else if (/\bdate\b/.test(lower)) base.editTarget = 'DATE';
      else if (/\btime\b/.test(lower)) base.editTarget = 'TIME';
      else if (/(luggage|bag|suitcase)/.test(lower)) base.editTarget = 'LUGGAGE';
      else if (/(wheelchair|mobility|assistance)/.test(lower)) base.editTarget = 'ASSISTANCE';
      else if (/(payment|upi|cash)/.test(lower)) base.editTarget = 'PAYMENT';
      return base.editTarget !== 'NONE' ? base : null;
    }
    default:
      return null;
  }
}

function getStepProgressLabel(step: VoiceStep, lang: Language): string {
  const prefix = lang === 'kn' ? 'ಹಂತ' : lang === 'hi' ? 'चरण' : 'Step';
  switch (step) {
    case 'LANG_SELECT':
      return `${prefix} · Language Selection`;
    case 'WELCOME_INTENT':
      return 'Voice Greeting';
    case 'AUTH_CHECK_REGISTERED':
      return `${prefix} · Account Check`;
    case 'REG_NAME':
    case 'REG_PHONE':
    case 'REG_EMAIL':
    case 'REG_PASSWORD':
    case 'REG_CONFIRM_PASSWORD':
    case 'REG_AGE':
    case 'REG_PREF_LANG':
    case 'REG_ACCESSIBILITY':
    case 'REG_SUMMARY_CONFIRM':
    case 'REG_CHOOSE_CHANGE':
      return 'Hands-Free Passenger Registration';
    case 'LOGIN_IDENTIFIER':
    case 'LOGIN_AUTH_METHOD':
    case 'LOGIN_OTP':
    case 'LOGIN_PASSWORD':
    case 'FORGOT_IDENTIFIER':
    case 'FORGOT_OTP':
    case 'FORGOT_NEW_PASSWORD':
      return 'Hands-Free Passenger Sign-In';
    case 'AUTH_MAIN_MENU':
      return 'Voice Assistant Menu';
    case 'BOOK_PICKUP':
    case 'BOOK_PICKUP_DISAMBIGUATE':
    case 'BOOK_PICKUP_CONFIRM':
      return `${prefix} 1/7 · Pickup Location`;
    case 'BOOK_DESTINATION':
    case 'BOOK_DEST_DISAMBIGUATE':
    case 'BOOK_DEST_CONFIRM':
      return `${prefix} 2/7 · Destination`;
    case 'BOOK_DATE':
    case 'BOOK_DATE_CONFIRM':
      return `${prefix} 3/7 · Travel Date`;
    case 'BOOK_TIME':
    case 'BOOK_TIME_CONFIRM':
      return `${prefix} 4/7 · Travel Time`;
    case 'BOOK_BAGS':
      return `${prefix} 5/7 · Luggage Bags`;
    case 'BOOK_MOBILITY':
      return `${prefix} 6/7 · Mobility / Wheelchair`;
    case 'BOOK_PAYMENT':
      return `${prefix} 7/7 · Payment Method`;
    case 'BOOK_SUMMARY_CONFIRM':
    case 'BOOK_CHOOSE_CHANGE':
      return 'Booking Summary & Confirmation';
    case 'CONFIRM_CANCEL_EXISTING':
      return 'Cancel Booking Confirmation';
    case 'BOOKING_COMPLETE':
      return 'Booking Confirmed';
  }
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  open,
  initialMode = 'guided',
  onClose,
  onReturnHome,
  language: _language,
  onChangeLanguage: _onChangeLanguage,
  user,
  bookings,
  onVoiceAuthSuccess,
  onVoiceLogout,
  onExecuteAction,
  onVoiceBookingCompleted,
  onBookingCancelled,
}) => {
  const [voiceMode, setVoiceMode] = useState<'guided' | 'live'>(initialMode);
  const [step, setStep] = useState<VoiceStep>('WELCOME_INTENT');
  const [regDraft, setRegDraft] = useState<VoiceRegDraft>(INITIAL_REG_DRAFT);
  const [bookingDraft, setBookingDraft] = useState<VoiceBookingDraft>(INITIAL_BOOKING_DRAFT);
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);
  const [cancelCandidateCode, setCancelCandidateCode] = useState<string | null>(null);

  // Sensitive auth states kept strictly in local state & never spoken or saved into transcripts
  const [regPassword, setRegPassword] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotOtpCode, setForgotOtpCode] = useState('');
  const [demoResetCode, setDemoResetCode] = useState('');
  const [demoLoginOtpCode, setDemoLoginOtpCode] = useState('');
  const [protectedPasswordInput, setProtectedPasswordInput] = useState('');
  const [showProtectedPassword, setShowProtectedPassword] = useState(false);

  // Full-duplex call & audio telemetry state
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hearingSpeech, setHearingSpeech] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micGranted, setMicGranted] = useState<boolean | null>(null);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [assistantMessage, setAssistantMessage] = useState('');
  const [listeningAnnouncement, setListeningAnnouncement] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [micError, setMicError] = useState('');

  const openRef = useRef(open);
  const langRef = useRef<Language>('en');
  const stepRef = useRef<VoiceStep>('WELCOME_INTENT');
  const prevStepBeforeLangChangeRef = useRef<VoiceStep | null>(null);
  const pendingIntentRef = useRef<PendingIntent>('NONE');
  const resumeAfterCorrectionStepRef = useRef<VoiceStep | null>(null);
  const regDraftRef = useRef<VoiceRegDraft>(INITIAL_REG_DRAFT);
  const bookingDraftRef = useRef<VoiceBookingDraft>(INITIAL_BOOKING_DRAFT);
  const candidatesRef = useRef<PlaceCandidate[]>([]);
  const lastPromptRef = useRef<string>('');
  const returnToRegSummaryRef = useRef<boolean>(false);
  const returnToBookSummaryRef = useRef<boolean>(false);
  const stepHistoryRef = useRef<VoiceStep[]>([]);
  const cancelCodeRef = useRef<string | null>(null);
  const regPasswordRef = useRef<string>('');
  const loginIdentifierRef = useRef<string>('');
  const forgotIdentifierRef = useRef<string>('');
  const forgotOtpRef = useRef<string>('');
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  // Continuous Full-Duplex Audio + Recognition Engine Refs
  const recognitionRef = useRef<any>(null);
  const recognitionActiveRef = useRef<boolean>(false);
  const recSessionIdRef = useRef<number>(0);
  const ignoreNextOnEndRestartRef = useRef<boolean>(false);
  const autoListenEnabledRef = useRef<boolean>(true);
  const pausedRef = useRef<boolean>(false);
  const speakingRef = useRef<boolean>(false);
  const processingRef = useRef<boolean>(false);
  const speechSupportedRef = useRef<boolean>(true);
  const retryCountRef = useRef<number>(0);

  // Utterance End-of-Turn & Low-Latency Pipeline Refs
  const utteranceBufferRef = useRef<string>('');
  const utteranceFlushTimerRef = useRef<number | null>(null);
  const lastVoiceFrameAtRef = useRef<number>(Date.now());
  const lastProcessedRef = useRef<{ step: string; text: string; at: number }>({
    step: '',
    text: '',
    at: 0,
  });
  const placeSearchCacheRef = useRef<Map<string, { ts: number; candidates: PlaceCandidate[] }>>(
    new Map()
  );
  const placeSearchInFlightRef = useRef<Map<string, Promise<PlaceCandidate[]>>>(new Map());
  const placePrefetchTimerRef = useRef<number | null>(null);
  const lastPrefetchedKeyRef = useRef<string>('');
  const delayedThinkingTimerRef = useRef<number | null>(null);
  const unsupportedRecLangsRef = useRef<Set<string>>(new Set());
  const ttsSessionIdRef = useRef<number>(0);
  const ttsStartWatchdogRef = useRef<number | null>(null);
  const ttsEndWatchdogRef = useRef<number | null>(null);

  // Web Audio VAD + Barge-In + Extended Silence Check-In Refs
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<number | null>(null);
  const silenceMonitorIntervalRef = useRef<number | null>(null);
  const noiseFloorRef = useRef<number>(0.015);
  const ttsStartTimeRef = useRef<number>(0);
  const bargeInFramesRef = useRef<number>(0);
  const lastSpeechActivityAtRef = useRef<number>(Date.now());
  const silenceCheckInCountRef = useRef<number>(0);

  openRef.current = open;
  stepRef.current = step;
  regDraftRef.current = regDraft;
  bookingDraftRef.current = bookingDraft;
  candidatesRef.current = candidates;
  cancelCodeRef.current = cancelCandidateCode;
  regPasswordRef.current = regPassword;
  loginIdentifierRef.current = loginIdentifier;
  forgotIdentifierRef.current = forgotIdentifier;
  forgotOtpRef.current = forgotOtpCode;

  langRef.current = 'en';

  const vCopy = VOICE_I18N.en;

  const clearUtteranceBuffer = useCallback(() => {
    if (utteranceFlushTimerRef.current !== null) {
      window.clearTimeout(utteranceFlushTimerRef.current);
      utteranceFlushTimerRef.current = null;
    }
    if (placePrefetchTimerRef.current !== null) {
      window.clearTimeout(placePrefetchTimerRef.current);
      placePrefetchTimerRef.current = null;
    }
    utteranceBufferRef.current = '';
    setInterimTranscript('');
  }, []);

  const stopMicHardware = useCallback(() => {
    if (vadIntervalRef.current !== null) {
      window.clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (silenceMonitorIntervalRef.current !== null) {
      window.clearInterval(silenceMonitorIntervalRef.current);
      silenceMonitorIntervalRef.current = null;
    }
    if (micStreamRef.current) {
      for (const track of micStreamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {
          // ignore
        }
      }
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setMicLevel(0);
    setHearingSpeech(false);
  }, []);

  const updateStep = useCallback((nextStep: VoiceStep, pushHistory = true) => {
    if (pushHistory && stepRef.current !== nextStep) {
      stepHistoryRef.current = [...stepHistoryRef.current.slice(-15), stepRef.current];
    }
    stepRef.current = nextStep;
    setStep(nextStep);
    if (isPasswordStep(nextStep)) {
      setProtectedPasswordInput('');
      setShowProtectedPassword(false);
      globalThis.setTimeout(() => passwordInputRef.current?.focus(), 140);
    }
  }, []);

  const updateRegDraft = useCallback((updater: (prev: VoiceRegDraft) => VoiceRegDraft) => {
    setRegDraft((prev) => {
      const next = updater(prev);
      regDraftRef.current = next;
      return next;
    });
  }, []);

  const updateBookingDraft = useCallback(
    (updater: (prev: VoiceBookingDraft) => VoiceBookingDraft) => {
      setBookingDraft((prev) => {
        const next = updater(prev);
        bookingDraftRef.current = next;
        return next;
      });
    },
    []
  );

  const clearTtsWatchdogs = useCallback(() => {
    if (ttsStartWatchdogRef.current !== null) {
      window.clearTimeout(ttsStartWatchdogRef.current);
      ttsStartWatchdogRef.current = null;
    }
    if (ttsEndWatchdogRef.current !== null) {
      window.clearTimeout(ttsEndWatchdogRef.current);
      ttsEndWatchdogRef.current = null;
    }
  }, []);

  const stopSpeakingNow = useCallback(() => {
    ttsSessionIdRef.current += 1;
    clearTtsWatchdogs();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
    }
    speakingRef.current = false;
    setSpeaking(false);
  }, [clearTtsWatchdogs]);

  const stopListeningNow = useCallback(() => {
    ignoreNextOnEndRestartRef.current = true;
    recSessionIdRef.current += 1;
    clearUtteranceBuffer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort?.();
        recognitionRef.current.stop?.();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    recognitionActiveRef.current = false;
    setListening(false);
    setHearingSpeech(false);
    setListeningAnnouncement(VOICE_I18N[langRef.current].listeningStopped);
  }, [clearUtteranceBuffer]);

  const processUtteranceRef = useRef<(text: string) => Promise<void>>(async () => {});
  const speakAndListenRef = useRef<
    (text: string, autoListenAfter?: boolean, rememberAsPrompt?: boolean, overrideLang?: Language) => void
  >(() => {});

  const startListening = useCallback(() => {
    if (!openRef.current || pausedRef.current || !autoListenEnabledRef.current) return;
    if (speakingRef.current || processingRef.current) return;
    if (isPasswordStep(stepRef.current)) {
      stopListeningNow();
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      speechSupportedRef.current = false;
      setSpeechSupported(false);
      setListening(false);
      return;
    }

    if (recognitionActiveRef.current && recognitionRef.current) {
      return;
    }

    speechSupportedRef.current = true;
    setSpeechSupported(true);
    setMicError('');
    clearUtteranceBuffer();
    ignoreNextOnEndRestartRef.current = false;

    const mySessionId = ++recSessionIdRef.current;

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'en-IN';
      rec.interimResults = true;
      rec.continuous = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        if (!openRef.current || recSessionIdRef.current !== mySessionId) {
          try {
            rec.abort?.();
          } catch {
            // ignore
          }
          return;
        }
        recognitionActiveRef.current = true;
        setListening(true);
        lastSpeechActivityAtRef.current = Date.now();
        setListeningAnnouncement(VOICE_I18N[langRef.current].listeningStarted);
        playSoftCue('ready');
      };

      rec.onresult = (event: any) => {
        if (!openRef.current || recSessionIdRef.current !== mySessionId) return;
        if (isPasswordStep(stepRef.current) || pausedRef.current || speakingRef.current) return;

        let combinedFinal = '';
        let combinedInterim = '';
        for (let i = 0; i < event.results.length; i += 1) {
          const res = event.results[i];
          const piece = res?.[0]?.transcript || '';
          if (res.isFinal) {
            combinedFinal += `${piece} `;
          } else {
            combinedInterim += `${piece} `;
          }
        }

        const fullDisplay = `${combinedFinal}${combinedInterim}`.trim();
        if (!fullDisplay) return;

        lastSpeechActivityAtRef.current = Date.now();
        silenceCheckInCountRef.current = 0;
        retryCountRef.current = 0;
        setHearingSpeech(true);
        setInterimTranscript(fullDisplay);
        if (!isPasswordStep(stepRef.current)) {
          setTranscript(fullDisplay);
        }
        utteranceBufferRef.current = fullDisplay;

        if (utteranceFlushTimerRef.current !== null) {
          window.clearTimeout(utteranceFlushTimerRef.current);
          utteranceFlushTimerRef.current = null;
        }
        if (placePrefetchTimerRef.current !== null) {
          window.clearTimeout(placePrefetchTimerRef.current);
          placePrefetchTimerRef.current = null;
        }

        const flushNow = () => {
          if (recSessionIdRef.current !== mySessionId) return;
          const captured = utteranceBufferRef.current.trim();
          clearUtteranceBuffer();
          setHearingSpeech(false);
          if (!captured || processingRef.current) return;

          ignoreNextOnEndRestartRef.current = true;
          stopListeningNow();
          void processUtteranceRef.current(captured);
        };

        const lastResult = event.results[event.results.length - 1];
        const lowerTrim = fullDisplay.toLowerCase();
        const isDangling = /\b(to|from|at|in|on|and|or|wait|actually|the|a|an|my|around|change|update|make)$/i.test(
          lowerTrim
        );

        // Speculative Google Places prefetch while passenger finishes speaking pickup or destination
        const activeStep = stepRef.current;
        if (activeStep === 'BOOK_PICKUP' || activeStep === 'BOOK_DESTINATION') {
          const stripped = stripLocationLeadIn(fullDisplay);
          if (
            stripped.length >= 4 &&
            !/\b(current location|gps|my location|repeat|pause|back)\b/i.test(stripped)
          ) {
            const effLang: Language = 'en';
            const pKey = `${effLang}:${activeStep}:${stripped.toLowerCase()}`;
            if (
              lastPrefetchedKeyRef.current !== pKey &&
              !placeSearchCacheRef.current.has(pKey) &&
              !placeSearchInFlightRef.current.has(pKey)
            ) {
              placePrefetchTimerRef.current = window.setTimeout(() => {
                if (recSessionIdRef.current !== mySessionId) return;
                lastPrefetchedKeyRef.current = pKey;
                const bias =
                  activeStep === 'BOOK_DESTINATION' && bookingDraftRef.current.pickup
                    ? {
                        biasLat: bookingDraftRef.current.pickup.lat,
                        biasLng: bookingDraftRef.current.pickup.lng,
                      }
                    : {};
                const reqPromise = apiRequest<{ candidates: PlaceCandidate[] }>('/api/maps/places-search', {
                  method: 'POST',
                  body: JSON.stringify({
                    query: stripped,
                    languageCode: 'en',
                    ...bias,
                  }),
                })
                  .then((res) => {
                    const cands = res.candidates || [];
                    placeSearchCacheRef.current.set(pKey, {
                      ts: Date.now(),
                      candidates: cands,
                    });
                    return cands;
                  })
                  .catch(() => [] as PlaceCandidate[])
                  .finally(() => {
                    placeSearchInFlightRef.current.delete(pKey);
                  });
                placeSearchInFlightRef.current.set(pKey, reqPromise);
              }, 200);
            }
          }
        }

        const vadQuietMs = Date.now() - lastVoiceFrameAtRef.current;

        if (lastResult?.isFinal) {
          if (!isDangling && vadQuietMs >= 120) {
            queueMicrotask(flushNow);
            return;
          }
          const finalDelayMs = !isDangling ? 90 : 320;
          utteranceFlushTimerRef.current = window.setTimeout(flushNow, finalDelayMs);
          return;
        }

        // Fast interim flush gated by acoustic VAD silence
        const interimDelayMs = vadQuietMs > 240 ? 250 : 480;
        utteranceFlushTimerRef.current = window.setTimeout(flushNow, interimDelayMs);
      };

      rec.onerror = (event: any) => {
        if (recSessionIdRef.current !== mySessionId) return;
        const code = event?.error;
        recognitionActiveRef.current = false;
        setListening(false);
        setHearingSpeech(false);

        if (code === 'not-allowed' || code === 'service-not-allowed') {
          autoListenEnabledRef.current = false;
          setMicGranted(false);
          setMicError(VOICE_I18N[langRef.current].micDeniedNotice);
          return;
        }

        if (code === 'aborted') {
          return;
        }

        // If browser lacks native recognition pack for kn-IN/hi-IN, remember it and switch cleanly to en-IN without looping
        if (code === 'language-not-supported' && rec.lang !== 'en-IN') {
          unsupportedRecLangsRef.current.add(rec.lang);
          try {
            rec.onstart = null;
            rec.onresult = null;
            rec.onerror = null;
            rec.onend = null;
            rec.abort?.();
            startListening();
          } catch {
            // handled by next turn
          }
          return;
        }

        // Transient 'no-speech' or 'network' in continuous call mode is handled gracefully by onend restart + 11s silence monitor
        if (code === 'audio-capture') {
          retryCountRef.current += 1;
          if (retryCountRef.current >= 3) {
            autoListenEnabledRef.current = false;
            setMicError(VOICE_I18N[langRef.current].micDeniedNotice);
          }
        }
      };

      rec.onend = () => {
        if (recSessionIdRef.current !== mySessionId) return;
        recognitionActiveRef.current = false;
        setListening(false);
        setHearingSpeech(false);

        const leftover = utteranceBufferRef.current.trim();
        if (leftover && !processingRef.current && !pausedRef.current && !speakingRef.current) {
          clearUtteranceBuffer();
          void processUtteranceRef.current(leftover);
          return;
        }

        if (
          !ignoreNextOnEndRestartRef.current &&
          openRef.current &&
          autoListenEnabledRef.current &&
          !pausedRef.current &&
          !speakingRef.current &&
          !processingRef.current &&
          !isPasswordStep(stepRef.current)
        ) {
          window.setTimeout(() => {
            if (recSessionIdRef.current === mySessionId) {
              startListening();
            }
          }, 40);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      recognitionActiveRef.current = false;
      setListening(false);
    }
  }, [clearUtteranceBuffer, stopListeningNow]);

  const speakAndListen = useCallback(
    (
      text: string,
      autoListenAfter = true,
      rememberAsPrompt = false,
      _overrideLang?: Language
    ) => {
      if (delayedThinkingTimerRef.current !== null) {
        window.clearTimeout(delayedThinkingTimerRef.current);
        delayedThinkingTimerRef.current = null;
      }
      const targetLang: Language = 'en';
      if (rememberAsPrompt) {
        lastPromptRef.current = text;
      }
      setAssistantMessage(text);

      const shouldListen =
        autoListenAfter && !pausedRef.current && !isPasswordStep(stepRef.current);

      if (typeof window === 'undefined' || !window.speechSynthesis) {
        speakingRef.current = false;
        setSpeaking(false);
        if (shouldListen && openRef.current && autoListenEnabledRef.current) {
          globalThis.setTimeout(() => startListening(), 35);
        }
        return;
      }

      stopListeningNow();
      clearTtsWatchdogs();
      const myTtsSessionId = ++ttsSessionIdRef.current;
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }

      const resumeMicAfterTts = () => {
        if (ttsSessionIdRef.current !== myTtsSessionId) return;
        clearTtsWatchdogs();
        speakingRef.current = false;
        setSpeaking(false);
        if (
          shouldListen &&
          autoListenEnabledRef.current &&
          !pausedRef.current &&
          !processingRef.current &&
          openRef.current
        ) {
          globalThis.setTimeout(() => {
            if (ttsSessionIdRef.current === myTtsSessionId) {
              startListening();
            }
          }, 30);
        }
      };

      const utter = new SpeechSynthesisUtterance(text);
      const targetCode = SPEECH_LANG_CODES[targetLang] || 'en-IN';
      utter.lang = targetCode;
      const voices = window.speechSynthesis.getVoices?.() || [];
      const exactVoice =
        voices.find((v) => v.lang.toLowerCase() === targetCode.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('en'));
      if (exactVoice) {
        utter.voice = exactVoice;
      }
      utter.rate = 1.03;
      utter.pitch = 1;

      utter.onstart = () => {
        if (ttsSessionIdRef.current !== myTtsSessionId) return;
        if (ttsStartWatchdogRef.current !== null) {
          window.clearTimeout(ttsStartWatchdogRef.current);
          ttsStartWatchdogRef.current = null;
        }
        speakingRef.current = true;
        ttsStartTimeRef.current = Date.now();
        bargeInFramesRef.current = 0;
        setSpeaking(true);
      };
      utter.onend = () => {
        resumeMicAfterTts();
      };
      utter.onerror = () => {
        resumeMicAfterTts();
      };

      // Safety watchdogs so continuous conversation never hangs if a browser drops TTS onstart/onend
      ttsStartWatchdogRef.current = window.setTimeout(() => {
        if (ttsSessionIdRef.current === myTtsSessionId && !speakingRef.current) {
          resumeMicAfterTts();
        }
      }, 900);
      ttsEndWatchdogRef.current = window.setTimeout(
        () => {
          if (ttsSessionIdRef.current === myTtsSessionId) {
            resumeMicAfterTts();
          }
        },
        Math.min(18000, Math.max(3000, text.length * 105))
      );

      window.speechSynthesis.speak(utter);
    },
    [clearTtsWatchdogs, startListening, stopListeningNow]
  );

  speakAndListenRef.current = speakAndListen;

  const withDelayedThinkingFeedback = useCallback(
    async <T,>(promise: Promise<T>): Promise<T> => {
      if (delayedThinkingTimerRef.current !== null) {
        window.clearTimeout(delayedThinkingTimerRef.current);
      }
      delayedThinkingTimerRef.current = window.setTimeout(() => {
        delayedThinkingTimerRef.current = null;
        if (
          openRef.current &&
          !pausedRef.current &&
          !speakingRef.current &&
          processingRef.current &&
          typeof window !== 'undefined' &&
          window.speechSynthesis
        ) {
          const msg = VOICE_I18N[langRef.current].oneMomentPlease;
          setAssistantMessage(msg);
          const cue = new SpeechSynthesisUtterance(msg);
          cue.lang = SPEECH_LANG_CODES[langRef.current] || 'en-IN';
          cue.rate = 1.04;
          window.speechSynthesis.speak(cue);
        }
      }, 900);

      try {
        return await promise;
      } finally {
        if (delayedThinkingTimerRef.current !== null) {
          window.clearTimeout(delayedThinkingTimerRef.current);
          delayedThinkingTimerRef.current = null;
        }
      }
    },
    []
  );

  // Initialize continuous Web Audio VAD once per call activation (handles hardware permission + barge-in)
  const initMicAndVad = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicGranted(false);
      return false;
    }
    try {
      if (micStreamRef.current) return true;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (!openRef.current) {
        for (const t of stream.getTracks()) t.stop();
        return false;
      }
      micStreamRef.current = stream;
      setMicGranted(true);
      setMicError('');

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;

        const dataBuf = new Float32Array(analyser.fftSize);

        if (vadIntervalRef.current !== null) {
          window.clearInterval(vadIntervalRef.current);
        }
        vadIntervalRef.current = window.setInterval(() => {
          if (!openRef.current || !analyserRef.current || pausedRef.current) {
            setMicLevel(0);
            return;
          }
          if (isPasswordStep(stepRef.current)) {
            setMicLevel(0);
            return;
          }

          analyserRef.current.getFloatTimeDomainData(dataBuf);
          let sumSq = 0;
          for (let i = 0; i < dataBuf.length; i += 1) {
            sumSq += dataBuf[i] * dataBuf[i];
          }
          const rms = Math.sqrt(sumSq / dataBuf.length);
          const scaled = Math.min(1, rms * 10);
          setMicLevel(scaled);

          // Adapt noise floor gently while listening quietly
          if (!speakingRef.current && rms < 0.04) {
            noiseFloorRef.current = noiseFloorRef.current * 0.94 + rms * 0.06;
          }

          // Barge-In detection while Assistant TTS is speaking
          if (
            speakingRef.current &&
            !processingRef.current &&
            Date.now() - ttsStartTimeRef.current > 450
          ) {
            const bargeThreshold = Math.max(0.065, noiseFloorRef.current * 3.8);
            if (rms > bargeThreshold) {
              bargeInFramesRef.current += 1;
              if (bargeInFramesRef.current >= 6) {
                // ~300ms sustained user speech interrupts assistant smoothly
                bargeInFramesRef.current = 0;
                stopSpeakingNow();
                autoListenEnabledRef.current = true;
                startListening();
              }
            } else {
              bargeInFramesRef.current = Math.max(0, bargeInFramesRef.current - 1);
            }
          }

          // Track active voice activity every 50ms for crisp endpointing & silence check-ins
          if (listeningRefValue.current && rms > Math.max(0.025, noiseFloorRef.current * 2.1)) {
            const nowTs = Date.now();
            lastVoiceFrameAtRef.current = nowTs;
            lastSpeechActivityAtRef.current = nowTs;
            silenceCheckInCountRef.current = 0;
          }
        }, 50);
      }

      // Extended silence monitor (asks "Are you still there? Would you like me to repeat the question?")
      if (silenceMonitorIntervalRef.current !== null) {
        window.clearInterval(silenceMonitorIntervalRef.current);
      }
      silenceMonitorIntervalRef.current = window.setInterval(() => {
        if (
          !openRef.current ||
          pausedRef.current ||
          speakingRef.current ||
          processingRef.current ||
          !recognitionActiveRef.current ||
          isPasswordStep(stepRef.current) ||
          utteranceBufferRef.current.trim().length > 0
        ) {
          return;
        }
        const elapsed = Date.now() - lastSpeechActivityAtRef.current;
        if (elapsed >= 11500) {
          lastSpeechActivityAtRef.current = Date.now();
          silenceCheckInCountRef.current += 1;
          const c = VOICE_I18N[langRef.current];
          if (silenceCheckInCountRef.current <= 2) {
            speakAndListenRef.current(c.silenceCheckIn, true, false);
          } else {
            pausedRef.current = true;
            setPaused(true);
            autoListenEnabledRef.current = false;
            stopListeningNow();
            speakAndListenRef.current(c.silenceAutoPaused, false, false);
          }
        }
      }, 1000);

      return true;
    } catch {
      setMicGranted(false);
      autoListenEnabledRef.current = false;
      setMicError(VOICE_I18N[langRef.current].micDeniedNotice);
      return false;
    }
  }, [startListening, stopListeningNow, stopSpeakingNow]);

  const listeningRefValue = useRef(false);
  listeningRefValue.current = listening;

  // Build multilingual registration & booking summaries (NEVER speaks passwords!)
  const buildRegSummarySpeech = useCallback((d: VoiceRegDraft, lang: Language): string => {
    const langLabel = VOICE_I18N[d.preferredLanguage]?.langName || 'English';
    if (lang === 'kn') {
      return `ನಿಮ್ಮ ಹೆಸರು ${d.fullName}. ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ${d.phone}. ಇಮೇಲ್ ${d.email}. ವಯಸ್ಸು ${d.age}. ನೀವು ಇಷ್ಟಪಡುವ ಭಾಷೆ ${langLabel}. ನೀವು ${d.accessibilityRequirements} ವಿನಂತಿಸಿದ್ದೀರಿ. ನಾನು ನಿಮ್ಮ ಖಾತೆಯನ್ನು ರಚಿಸಬಹುದೇ? ಹೌದು ಅಥವಾ ಇಲ್ಲ ಎಂದು ಹೇಳಿ.`;
    }
    if (lang === 'hi') {
      return `आपका नाम ${d.fullName} है। मोबाइल नंबर ${d.phone} है। ईमेल ${d.email} है। आपकी उम्र ${d.age} है। आपकी पसंदीदा भाषा ${langLabel} है। आपने ${d.accessibilityRequirements} का अनुरोध किया है। क्या मैं आपका खाता बना दूँ? हाँ या नहीं बोलें।`;
    }
    return `Here are your registration details: Name is ${d.fullName}. Mobile number is ${d.phone}. Email is ${d.email}. Age is ${d.age}. Preferred language is ${langLabel}. Assistance preference is ${d.accessibilityRequirements}. Should I go ahead and create your account?`;
  }, []);

  const buildBookingSummarySpeech = useCallback(
    (d: VoiceBookingDraft, fare: number | null, lang: Language): string => {
      const mobilityText = d.wheelchairAssistance
        ? lang === 'kn'
          ? 'ವೀಲ್‌ಚೇರ್ ಸಹಾಯ'
          : lang === 'hi'
          ? 'व्हीलचेयर सहायता'
          : 'Wheelchair assistance'
        : d.mobilityAssistance
        ? lang === 'kn'
          ? 'ಚಲನಶೀಲತೆ ಸಹಾಯ'
          : lang === 'hi'
          ? 'मोबिलिटी सहायता'
          : 'Mobility assistance'
        : lang === 'kn'
        ? 'ಸಾಮಾನ್ಯ ಲಗೇಜ್ ಸಹಾಯ'
        : lang === 'hi'
        ? 'सामान्य सामान सहायता'
        : 'Standard luggage assistance';

      const dateReadable = formatReadableDate(d.travelDateISO, lang);
      const timeReadable = formatReadableTime(d.travelTime24);
      const farePart = fare
        ? lang === 'kn'
          ? `ಅಂದಾಜು ದರ ${fare} ರೂಪಾಯಿಗಳು. `
          : lang === 'hi'
          ? `अनुमानित किराया ${fare} रुपये। `
          : `Estimated fare is ${fare} rupees. `
        : '';

      if (lang === 'kn') {
        return `ನಿಮ್ಮ ಬುಕಿಂಗ್ ವಿವರಗಳು: ಪಿಕಪ್ ಸ್ಥಳ ${d.pickup?.formattedAddress}. ಗಮ್ಯಸ್ಥಾನ ${d.destination?.formattedAddress}. ದಿನಾಂಕ ${dateReadable}, ಸಮಯ ${timeReadable}. ಲಗೇಜ್ ಬ್ಯಾಗ್‌ಗಳು ${d.numBags}. ಸಹಾಯ ${mobilityText}. ಪಾವತಿ ವಿಧಾನ ${d.paymentMethod}. ${farePart}ಈ ಬುಕಿಂಗ್ ಅನ್ನು ದೃಢೀಕರಿಸಲು ಹೌದು, ಬದಲಾಯಿಸಲು ಇಲ್ಲ ಅಥವಾ ರದ್ದುಗೊಳಿಸಲು ಕ್ಯಾನ್ಸಲ್ ಎಂದು ಹೇಳಿ.`;
      }
      if (lang === 'hi') {
        return `आपकी बुकिंग का विवरण: पिकअप स्थान ${d.pickup?.formattedAddress}। गंतव्य ${d.destination?.formattedAddress}। तारीख ${dateReadable}, समय ${timeReadable}। सामान बैग ${d.numBags}। सहायता ${mobilityText}। भुगतान माध्यम ${d.paymentMethod}। ${farePart}बुकिंग पक्की करने के लिए हाँ, बदलने के लिए नहीं, या रद्द करने के लिए कैंसल बोलें।`;
      }
      return `Let us double check your booking: Pickup from ${d.pickup?.formattedAddress}, going to ${d.destination?.formattedAddress}. Date is ${dateReadable} at ${timeReadable}. ${d.numBags} luggage bags, ${mobilityText}, paying via ${d.paymentMethod}. ${farePart}Would you like me to confirm and submit this booking?`;
    },
    []
  );

  const askStepPrompt = useCallback(
    async (
      targetStep: VoiceStep,
      _overrideLang?: Language,
      overrideRegDraft?: VoiceRegDraft,
      overrideBookDraft?: VoiceBookingDraft,
      prefixAck?: string,
      customFullPrompt?: string
    ) => {
      const lang: Language = 'en';
      const c = VOICE_I18N.en;
      const rd = overrideRegDraft || regDraftRef.current;
      const bd = overrideBookDraft || bookingDraftRef.current;

      updateStep(targetStep);

      const say = (body: string, autoListen = true) => {
        const full = customFullPrompt || (prefixAck ? `${prefixAck} ${body}` : body);
        speakAndListen(full, autoListen, true, lang);
      };

      switch (targetStep) {
        case 'LANG_SELECT':
          say(c.initialGreetingAndLanguage, true);
          break;
        case 'WELCOME_INTENT':
          say(c.welcomeGreeting, true);
          break;
        case 'AUTH_CHECK_REGISTERED':
          say(
            pendingIntentRef.current === 'BOOK_HELPER'
              ? c.askAlreadyRegisteredForBooking
              : c.askAlreadyRegistered,
            true
          );
          break;
        case 'REG_NAME':
          say(c.regAskName, true);
          break;
        case 'REG_PHONE':
          say(rd.fullName ? c.regNiceToMeetAskPhone(rd.fullName) : c.regAskPhone, true);
          break;
        case 'REG_EMAIL':
          say(c.regAskEmail, true);
          break;
        case 'REG_PASSWORD':
          say(c.regAskPassword, false);
          break;
        case 'REG_CONFIRM_PASSWORD':
          say(c.regAskConfirmPassword, false);
          break;
        case 'REG_AGE':
          say(c.regAskAge, true);
          break;
        case 'REG_PREF_LANG':
          say(c.regAskPrefLang, true);
          break;
        case 'REG_ACCESSIBILITY':
          say(c.regAskAccessibility, true);
          break;
        case 'REG_SUMMARY_CONFIRM':
          returnToRegSummaryRef.current = false;
          say(buildRegSummarySpeech(rd, lang), true);
          break;
        case 'REG_CHOOSE_CHANGE':
          say(c.regAskChangeField, true);
          break;
        case 'LOGIN_IDENTIFIER':
          say(c.loginWelcomeBack, true);
          break;
        case 'LOGIN_AUTH_METHOD':
          say(
            'Thank you! Would you like to sign in hands-free with a 6-digit Voice OTP, or type your password on screen? Say OTP or Password.',
            true
          );
          break;
        case 'LOGIN_OTP':
          say(c.loginAskOtp, true);
          break;
        case 'LOGIN_PASSWORD':
          say(c.loginAskPasswordOrOtp, false);
          break;
        case 'FORGOT_IDENTIFIER':
          say(c.forgotAskIdentifier, true);
          break;
        case 'FORGOT_OTP':
          say(c.forgotAskOtp, true);
          break;
        case 'FORGOT_NEW_PASSWORD':
          say(c.forgotAskNewPassword, false);
          break;
        case 'AUTH_MAIN_MENU':
          say(c.authMainMenu, true);
          break;
        case 'BOOK_PICKUP':
          say(c.bookAskPickup, true);
          break;
        case 'BOOK_DESTINATION':
          say(c.bookAskDestination, true);
          break;
        case 'BOOK_DATE':
          say(c.bookAskDate, true);
          break;
        case 'BOOK_TIME':
          say(c.bookAskTime, true);
          break;
        case 'BOOK_BAGS':
          say(c.bookAskBags, true);
          break;
        case 'BOOK_MOBILITY':
          say(c.bookAskMobility, true);
          break;
        case 'BOOK_PAYMENT':
          say(c.bookAskPayment, true);
          break;
        case 'BOOK_SUMMARY_CONFIRM': {
          returnToBookSummaryRef.current = false;
          let estFare = bd.estimatedFare;
          if (estFare === null && bd.pickup && bd.destination) {
            try {
              const fareRes = await withDelayedThinkingFeedback(
                apiRequest<FareBreakdown>('/api/fare/estimate', {
                  method: 'POST',
                  body: JSON.stringify({
                    travelType: bd.travelType,
                    pickupLat: bd.pickup.lat,
                    pickupLng: bd.pickup.lng,
                    dropoffLat: bd.destination.lat,
                    dropoffLng: bd.destination.lng,
                    distanceKm: bd.distanceKm,
                    numBags: Math.max(1, bd.numBags),
                    luggageWeightKg: Math.max(8, bd.numBags * 12),
                    estimatedDurationMin: bd.durationMin,
                    mobilityAssistance: bd.mobilityAssistance,
                    wheelchairAssistance: bd.wheelchairAssistance,
                  }),
                })
              );
              estFare = fareRes.totalFare;
              updateBookingDraft((prev) => ({ ...prev, estimatedFare: fareRes.totalFare }));
            } catch {
              // keep previous fare
            }
          }
          say(buildBookingSummarySpeech(bd, estFare, lang), true);
          break;
        }
        case 'BOOK_CHOOSE_CHANGE':
          say(c.bookAskChangeField, true);
          break;
        default:
          break;
      }
    },
    [
      buildBookingSummarySpeech,
      buildRegSummarySpeech,
      speakAndListen,
      updateBookingDraft,
      updateStep,
      withDelayedThinkingFeedback,
    ]
  );

  // Trigger real browser Geolocation + Google Geocoding reverse lookup
  const handleDetectCurrentGps = useCallback(() => {
    const c = VOICE_I18N[langRef.current];
    if (!navigator.geolocation) {
      speakAndListen(c.bookGpsUnavailable, true, true);
      return;
    }

    processingRef.current = true;
    setProcessing(true);
    setAssistantMessage(c.bookDetectingGps);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        try {
          const geo = await withDelayedThinkingFeedback(
            apiRequest<{
              formattedAddress: string;
              placeId: string;
              lat: number;
              lng: number;
            }>('/api/maps/reverse-geocode', {
              method: 'POST',
              body: JSON.stringify({ lat, lng, languageCode: 'en' }),
            })
          );
          const candidate: PlaceCandidate = {
            placeId: geo.placeId || '',
            displayName: geo.formattedAddress.split(',')[0] || geo.formattedAddress,
            formattedAddress: geo.formattedAddress,
            lat: geo.lat,
            lng: geo.lng,
          };
          setCandidates([candidate]);
          candidatesRef.current = [candidate];
          updateStep('BOOK_PICKUP_CONFIRM');
          processingRef.current = false;
          setProcessing(false);
          speakAndListen(c.bookPickupConfirm(candidate.formattedAddress), true, true);
        } catch {
          processingRef.current = false;
          setProcessing(false);
          speakAndListen(c.bookGpsGeocodeFailed, true, true);
        }
      },
      () => {
        processingRef.current = false;
        setProcessing(false);
        speakAndListen(c.bookGpsDenied, true, true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  }, [speakAndListen, updateStep, withDelayedThinkingFeedback]);

  const finalizePickupAndContinue = useCallback(
    async (picked: PlaceCandidate, customAck?: string) => {
      const c = VOICE_I18N[langRef.current];
      const nextDraft = { ...bookingDraftRef.current, pickup: picked, estimatedFare: null };
      updateBookingDraft(() => nextDraft);
      const resumeStep = resumeAfterCorrectionStepRef.current;
      resumeAfterCorrectionStepRef.current = null;
      if (returnToBookSummaryRef.current) {
        await askStepPrompt('BOOK_SUMMARY_CONFIRM', undefined, undefined, nextDraft);
      } else if (
        resumeStep &&
        resumeStep !== 'BOOK_PICKUP' &&
        resumeStep !== 'BOOK_PICKUP_CONFIRM' &&
        resumeStep !== 'BOOK_PICKUP_DISAMBIGUATE'
      ) {
        await askStepPrompt(resumeStep, undefined, undefined, nextDraft, c.correctionPrefix);
      } else {
        await askStepPrompt(
          'BOOK_DESTINATION',
          undefined,
          undefined,
          nextDraft,
          undefined,
          customAck || c.ackPickupAskDest(picked.displayName)
        );
      }
    },
    [askStepPrompt, updateBookingDraft]
  );

  const finalizeDestinationCandidate = useCallback(
    async (picked: PlaceCandidate, customAck?: string) => {
      const c = VOICE_I18N[langRef.current];
      const pickup = bookingDraftRef.current.pickup;
      if (
        pickup &&
        areLocationsIdentical(
          pickup.lat,
          pickup.lng,
          pickup.formattedAddress,
          picked.lat,
          picked.lng,
          picked.formattedAddress
        )
      ) {
        updateStep('BOOK_DESTINATION');
        speakAndListen(c.bookSameLocation, true, true);
        return;
      }

      const distKm = pickup ? haversineDistanceKm(pickup.lat, pickup.lng, picked.lat, picked.lng) : 2;
      const durMin = Math.max(25, Math.round(distKm * 2.5 + 10));
      const inferredType = inferTravelType(pickup || picked);
      const nextDraft: VoiceBookingDraft = {
        ...bookingDraftRef.current,
        destination: picked,
        travelType: inferredType,
        distanceKm: distKm,
        durationMin: durMin,
        estimatedFare: null,
      };
      updateBookingDraft(() => nextDraft);

      // Compute exact Google Maps driving distance & ETA asynchronously in background without delaying conversation
      if (pickup) {
        void apiRequest<{ distanceKm: number; durationMin: number }>('/api/maps/compute-route', {
          method: 'POST',
          body: JSON.stringify({
            originLat: pickup.lat,
            originLng: pickup.lng,
            destLat: picked.lat,
            destLng: picked.lng,
          }),
        })
          .then((routeRes) => {
            updateBookingDraft((prev) => ({
              ...prev,
              distanceKm: routeRes.distanceKm,
              durationMin: routeRes.durationMin,
              estimatedFare: null,
            }));
          })
          .catch(() => {});
      }

      const resumeStep = resumeAfterCorrectionStepRef.current;
      resumeAfterCorrectionStepRef.current = null;
      if (returnToBookSummaryRef.current) {
        await askStepPrompt('BOOK_SUMMARY_CONFIRM', undefined, undefined, nextDraft);
      } else if (
        resumeStep &&
        resumeStep !== 'BOOK_DESTINATION' &&
        resumeStep !== 'BOOK_DEST_CONFIRM' &&
        resumeStep !== 'BOOK_DEST_DISAMBIGUATE'
      ) {
        await askStepPrompt(resumeStep, undefined, undefined, nextDraft, c.correctionPrefix);
      } else {
        await askStepPrompt(
          'BOOK_DATE',
          undefined,
          undefined,
          nextDraft,
          undefined,
          customAck || c.ackDestAskDate(picked.displayName)
        );
      }
    },
    [askStepPrompt, speakAndListen, updateBookingDraft, updateStep]
  );

  const searchPlacesForStep = useCallback(
    async (rawQuery: string, kind: 'pickup' | 'destination') => {
      const c = VOICE_I18N.en;
      const normalizedQuery = stripLocationLeadIn(rawQuery) || rawQuery.trim();
      const query = normalizedQuery;
      const safeErrorQuery = /[\u0900-\u097F\u0C80-\u0CFF]/.test(query) ? 'that location' : query;
      const stepKey = kind === 'pickup' ? 'BOOK_PICKUP' : 'BOOK_DESTINATION';
      const cacheKey = `en:${stepKey}:${query.trim().toLowerCase()}`;
      const cached = placeSearchCacheRef.current.get(cacheKey);
      const inFlight = placeSearchInFlightRef.current.get(cacheKey);

      let list: PlaceCandidate[] = [];
      if (cached && Date.now() - cached.ts < 180_000) {
        list = cached.candidates;
      } else if (inFlight) {
        processingRef.current = true;
        setProcessing(true);
        try {
          list = await withDelayedThinkingFeedback(inFlight);
        } finally {
          processingRef.current = false;
          setProcessing(false);
        }
      } else {
        processingRef.current = true;
        setProcessing(true);
        try {
          const bias =
            kind === 'destination' && bookingDraftRef.current.pickup
              ? {
                  biasLat: bookingDraftRef.current.pickup.lat,
                  biasLng: bookingDraftRef.current.pickup.lng,
                }
              : {};
          const res = await withDelayedThinkingFeedback(
            apiRequest<{ candidates: PlaceCandidate[] }>('/api/maps/places-search', {
              method: 'POST',
              body: JSON.stringify({ query, languageCode: 'en', ...bias }),
            })
          );
          list = res.candidates || [];
          placeSearchCacheRef.current.set(cacheKey, { ts: Date.now(), candidates: list });
          processingRef.current = false;
          setProcessing(false);
        } catch (err: any) {
          processingRef.current = false;
          setProcessing(false);
          const msg = String(err?.message || '');
          if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
          speakAndListen(c.bookPlaceNotFound(safeErrorQuery), true, true);
          return;
        }
      }

      if (list.length === 0) {
        speakAndListen(c.bookPlaceNotFound(safeErrorQuery), true, true);
        return;
      }

      if (
        kind === 'destination' &&
        list.length === 1 &&
        bookingDraftRef.current.pickup &&
        areLocationsIdentical(
          bookingDraftRef.current.pickup.lat,
          bookingDraftRef.current.pickup.lng,
          bookingDraftRef.current.pickup.formattedAddress,
          list[0].lat,
          list[0].lng,
          list[0].formattedAddress
        )
      ) {
        speakAndListen(c.bookSameLocation, true, true);
        return;
      }

      if (list.length === 1) {
        const picked = list[0];
        setCandidates([picked]);
        candidatesRef.current = [picked];

        // Confirm explicit mid-flow corrections before saving; proceed immediately during standard booking
        if (resumeAfterCorrectionStepRef.current) {
          if (kind === 'pickup') {
            updateStep('BOOK_PICKUP_CONFIRM');
            speakAndListen(c.correctionConfirmPlace('pickup', picked.displayName), true, true);
          } else {
            updateStep('BOOK_DEST_CONFIRM');
            speakAndListen(c.correctionConfirmPlace('destination', picked.displayName), true, true);
          }
          return;
        }

        if (kind === 'pickup') {
          await finalizePickupAndContinue(picked, c.ackPickupAskDest(picked.displayName));
        } else {
          await finalizeDestinationCandidate(picked, c.ackDestAskDate(picked.displayName));
        }
        return;
      }

      const topOptions = list.slice(0, 3);
      setCandidates(topOptions);
      candidatesRef.current = topOptions;
      const spokenOptions = topOptions
        .map((item, idx) => `${idx + 1}: ${item.displayName}, ${item.formattedAddress}.`)
        .join(' ');
      if (kind === 'pickup') {
        updateStep('BOOK_PICKUP_DISAMBIGUATE');
      } else {
        updateStep('BOOK_DEST_DISAMBIGUATE');
      }
      speakAndListen(c.bookMultipleFound(topOptions.length, kind, spokenOptions), true, true);
    },
    [
      finalizeDestinationCandidate,
      finalizePickupAndContinue,
      speakAndListen,
      updateStep,
      withDelayedThinkingFeedback,
    ]
  );

  const trackLatestBookingVoice = useCallback(async () => {
    const c = VOICE_I18N[langRef.current];
    processingRef.current = true;
    setProcessing(true);
    try {
      const res = await apiRequest<{ bookings: BookingRecord[] }>('/api/voice/bookings');
      processingRef.current = false;
      setProcessing(false);
      const list = res.bookings.length > 0 ? res.bookings : bookings;
      if (!list || list.length === 0) {
        speakAndListen(c.noBookingsTrackPrompt, true, true);
        return;
      }
      const latest = list[0];
      const otpSpoken = latest.otp?.otp_code ? latest.otp.otp_code.split('').join(' ') : null;
      speakAndListen(
        c.trackingSummarySpeech(
          latest.booking_code,
          latest.status,
          latest.pickup_location,
          latest.dropoff_location,
          latest.assignment?.helper_name || null,
          latest.assignment?.helper_location || null,
          latest.assignment?.eta_minutes ?? null,
          otpSpoken
        ),
        true,
        true
      );
      void onExecuteAction('TRACK_HELPER');
    } catch {
      processingRef.current = false;
      setProcessing(false);
      speakAndListen(c.trackingErrorPrompt, true, true);
    }
  }, [bookings, onExecuteAction, speakAndListen]);

  const readBookingHistoryVoice = useCallback(async () => {
    const c = VOICE_I18N[langRef.current];
    processingRef.current = true;
    setProcessing(true);
    try {
      const res = await apiRequest<{ bookings: BookingRecord[] }>('/api/voice/bookings');
      processingRef.current = false;
      setProcessing(false);
      const list = res.bookings.length > 0 ? res.bookings : bookings;
      if (!list || list.length === 0) {
        speakAndListen(c.emptyHistoryPrompt, true, true);
        return;
      }
      const top = list.slice(0, 3);
      const summary = top
        .map((b, i) =>
          c.historyItemSummary(
            i + 1,
            b.booking_code,
            b.status,
            b.pickup_location,
            b.dropoff_location,
            b.estimated_fare
          )
        )
        .join(' ');
      speakAndListen(c.historySummarySpeech(list.length, summary), true, true);
    } catch {
      processingRef.current = false;
      setProcessing(false);
      speakAndListen(c.historyErrorPrompt, true, true);
    }
  }, [bookings, speakAndListen]);

  const initiateCancelExistingVoice = useCallback(async () => {
    const c = VOICE_I18N[langRef.current];
    processingRef.current = true;
    setProcessing(true);
    let active: BookingRecord | undefined = bookings.find(
      (b) => b.status !== 'Assistance Completed' && b.status !== 'Booking Cancelled'
    );
    if (!active && getStoredToken()) {
      try {
        const res = await apiRequest<{ bookings: BookingRecord[] }>('/api/voice/bookings');
        active = res.bookings.find(
          (b) => b.status !== 'Assistance Completed' && b.status !== 'Booking Cancelled'
        );
      } catch {
        // ignore
      }
    }
    processingRef.current = false;
    setProcessing(false);

    if (!active) {
      speakAndListen(c.noActiveCancelPrompt, true, true);
      return;
    }
    setCancelCandidateCode(active.booking_code);
    cancelCodeRef.current = active.booking_code;
    updateStep('CONFIRM_CANCEL_EXISTING');
    speakAndListen(
      c.cancelConfirmPrompt(active.booking_code, formatReadableDate(active.travel_date, langRef.current)),
      true,
      true
    );
  }, [bookings, speakAndListen, updateStep]);

  const requestVoiceOtpSignIn = useCallback(async () => {
    const c = VOICE_I18N[langRef.current];
    if (!loginIdentifierRef.current) {
      await askStepPrompt('LOGIN_IDENTIFIER');
      return;
    }
    processingRef.current = true;
    setProcessing(true);
    try {
      const res = await apiRequest<{ demoOtpCode: string }>('/api/auth/voice-otp/request', {
        method: 'POST',
        body: JSON.stringify({ identifier: loginIdentifierRef.current }),
      });
      processingRef.current = false;
      setProcessing(false);
      setDemoLoginOtpCode(res.demoOtpCode);
      await askStepPrompt('LOGIN_OTP');
    } catch (err: any) {
      processingRef.current = false;
      setProcessing(false);
      speakAndListen(
        `${err?.message || 'Account not found.'} ${c.loginWelcomeBack}`,
        true,
        true
      );
      updateStep('LOGIN_IDENTIFIER', false);
    }
  }, [askStepPrompt, speakAndListen, updateStep]);

  const finishAuthSuccess = useCallback(
    async (res: { token: string; user: UserProfile }, isNewRegistration: boolean) => {
      setStoredToken(res.token);
      setDemoLoginOtpCode('');
      setProtectedPasswordInput('');
      setRegPassword('');
      regPasswordRef.current = '';
      // Always keep assistant output strictly in English regardless of user profile preference
      const activeLang: Language = 'en';
      langRef.current = 'en';
      onVoiceAuthSuccess(res.user);
      const nextCopy = VOICE_I18N.en;
      const welcomeAck = isNewRegistration ? nextCopy.regSuccess : nextCopy.loginSuccess;

      const intent = pendingIntentRef.current;
      pendingIntentRef.current = 'NONE';
      if (intent === 'BOOK_HELPER') {
        updateBookingDraft(() => INITIAL_BOOKING_DRAFT);
        returnToBookSummaryRef.current = false;
        setConfirmedBooking(null);
        await askStepPrompt('BOOK_PICKUP', activeLang, undefined, INITIAL_BOOKING_DRAFT, welcomeAck);
        return;
      }
      if (intent === 'TRACK_BOOKING') {
        updateStep('AUTH_MAIN_MENU', false);
        await trackLatestBookingVoice();
        return;
      }
      if (intent === 'BOOKING_HISTORY') {
        updateStep('AUTH_MAIN_MENU', false);
        await readBookingHistoryVoice();
        return;
      }
      if (intent === 'CANCEL_BOOKING') {
        updateStep('AUTH_MAIN_MENU', false);
        await initiateCancelExistingVoice();
        return;
      }

      updateStep('AUTH_MAIN_MENU', false);
      speakAndListen(`${welcomeAck} ${nextCopy.authMainMenu}`, true, true, activeLang);
    },
    [
      askStepPrompt,
      initiateCancelExistingVoice,
      onVoiceAuthSuccess,
      readBookingHistoryVoice,
      speakAndListen,
      trackLatestBookingVoice,
      updateBookingDraft,
      updateStep,
    ]
  );

  const submitVoiceRegistration = useCallback(async () => {
    const c = VOICE_I18N[langRef.current];
    const rd = regDraftRef.current;
    processingRef.current = true;
    setProcessing(true);
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>(
        '/api/auth/register/passenger',
        {
          method: 'POST',
          body: JSON.stringify({
            fullName: rd.fullName,
            email: rd.email,
            phone: rd.phone,
            password: regPasswordRef.current,
            age: rd.age,
            preferredLanguage: rd.preferredLanguage,
            accessibilityRequirements: rd.accessibilityRequirements,
          }),
        }
      );
      processingRef.current = false;
      setProcessing(false);
      await finishAuthSuccess(res, true);
    } catch (err: any) {
      processingRef.current = false;
      setProcessing(false);
      const msg = String(err?.message || '');
      if (msg.toLowerCase().includes('already exists')) {
        updateStep('AUTH_CHECK_REGISTERED');
        speakAndListen(c.regDuplicateError, true, true);
      } else {
        speakAndListen(c.regErrorPrompt(msg), true, true);
      }
    }
  }, [finishAuthSuccess, speakAndListen, updateStep]);

  const submitProtectedPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const val = protectedPasswordInput;
      const current = stepRef.current;
      const c = VOICE_I18N[langRef.current];

      if (current === 'REG_PASSWORD') {
        if (val.length < 6) {
          speakAndListen(c.regPasswordShort, false, true);
          return;
        }
        setRegPassword(val);
        regPasswordRef.current = val;
        setProtectedPasswordInput('');
        await askStepPrompt('REG_CONFIRM_PASSWORD');
        return;
      }

      if (current === 'REG_CONFIRM_PASSWORD') {
        if (val !== regPasswordRef.current) {
          setProtectedPasswordInput('');
          speakAndListen(c.regPasswordMismatch, false, true);
          return;
        }
        setProtectedPasswordInput('');
        if (returnToRegSummaryRef.current) {
          await askStepPrompt('REG_SUMMARY_CONFIRM');
        } else {
          await askStepPrompt('REG_AGE');
        }
        return;
      }

      if (current === 'LOGIN_PASSWORD') {
        if (!val) {
          speakAndListen(c.loginAskPasswordOrOtp, false, true);
          return;
        }
        processingRef.current = true;
        setProcessing(true);
        try {
          const res = await apiRequest<{ token: string; user: UserProfile }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
              identifier: loginIdentifierRef.current,
              email: loginIdentifierRef.current,
              password: val,
              expectedRole: 'PASSENGER',
            }),
          });
          processingRef.current = false;
          setProcessing(false);
          await finishAuthSuccess(res, false);
        } catch {
          processingRef.current = false;
          setProcessing(false);
          setProtectedPasswordInput('');
          speakAndListen(c.loginFailed, true, true);
        }
        return;
      }

      if (current === 'FORGOT_NEW_PASSWORD') {
        if (val.length < 6) {
          speakAndListen(c.regPasswordShort, false, true);
          return;
        }
        processingRef.current = true;
        setProcessing(true);
        try {
          await apiRequest('/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({
              identifier: forgotIdentifierRef.current,
              resetCode: forgotOtpRef.current,
              newPassword: val,
            }),
          });
          processingRef.current = false;
          setProcessing(false);
          setProtectedPasswordInput('');
          setDemoResetCode('');
          setLoginIdentifier(forgotIdentifierRef.current);
          loginIdentifierRef.current = forgotIdentifierRef.current;
          updateStep('LOGIN_AUTH_METHOD', false);
          speakAndListen(c.forgotSuccess, true, true);
        } catch (err: any) {
          processingRef.current = false;
          setProcessing(false);
          setProtectedPasswordInput('');
          speakAndListen(
            `${err?.message || 'OTP verification failed.'} Please speak your 6-digit OTP again.`,
            true,
            true
          );
          updateStep('FORGOT_OTP', false);
        }
      }
    },
    [askStepPrompt, finishAuthSuccess, protectedPasswordInput, speakAndListen, updateStep]
  );

  // Handles mid-conversation natural corrections without restarting the whole flow
  const handleMidFlowCorrection = useCallback(
    async (
      currentStep: VoiceStep,
      editTarget: string,
      correctionVal: string,
      nlu: VoiceParseResult | null,
      rawClean: string
    ): Promise<boolean> => {
      const c = VOICE_I18N[langRef.current];
      const returnStep =
        resumeAfterCorrectionStepRef.current || currentStep;

      if (editTarget === 'DESTINATION') {
        resumeAfterCorrectionStepRef.current = returnStep;
        const query = nlu?.extractedLocationQuery?.trim() || correctionVal.trim();
        if (query) {
          await searchPlacesForStep(query, 'destination');
        } else {
          updateStep('BOOK_DESTINATION');
          speakAndListen(c.correctionAskDest, true, true);
        }
        return true;
      }

      if (editTarget === 'PICKUP') {
        resumeAfterCorrectionStepRef.current = returnStep;
        if (nlu?.useCurrentLocation) {
          handleDetectCurrentGps();
          return true;
        }
        const query = nlu?.extractedLocationQuery?.trim() || correctionVal.trim();
        if (query) {
          await searchPlacesForStep(query, 'pickup');
        } else {
          updateStep('BOOK_PICKUP');
          speakAndListen(c.correctionAskPickup, true, true);
        }
        return true;
      }

      if (editTarget === 'PHONE') {
        const digits = (nlu?.mobileNumber || normalizeSpokenDigits(correctionVal || rawClean)).replace(
          /\D/g,
          ''
        );
        if (digits.length >= 10 && digits.length <= 13) {
          const nextReg = { ...regDraftRef.current, phone: digits };
          updateRegDraft(() => nextReg);
          resumeAfterCorrectionStepRef.current = null;
          await askStepPrompt(returnStep, undefined, nextReg, undefined, c.correctionPrefix);
        } else {
          resumeAfterCorrectionStepRef.current = returnStep;
          updateStep('REG_PHONE');
          speakAndListen(c.correctionAskPhone, true, true);
        }
        return true;
      }

      if (editTarget === 'EMAIL') {
        const em = localParseEmail(nlu?.emailAddress || correctionVal);
        if (em) {
          const nextReg = { ...regDraftRef.current, email: em };
          updateRegDraft(() => nextReg);
          resumeAfterCorrectionStepRef.current = null;
          await askStepPrompt(returnStep, undefined, nextReg, undefined, c.correctionPrefix);
        } else {
          resumeAfterCorrectionStepRef.current = returnStep;
          updateStep('REG_EMAIL');
          speakAndListen(c.correctionAskEmail, true, true);
        }
        return true;
      }

      if (editTarget === 'NAME') {
        const nm = (nlu?.fullName || correctionVal).trim();
        if (nm.length >= 2 && !/\d/.test(nm)) {
          const nextReg = { ...regDraftRef.current, fullName: nm };
          updateRegDraft(() => nextReg);
          resumeAfterCorrectionStepRef.current = null;
          await askStepPrompt(returnStep, undefined, nextReg, undefined, c.correctionPrefix);
        } else {
          resumeAfterCorrectionStepRef.current = returnStep;
          updateStep('REG_NAME');
          speakAndListen(c.correctionAskName, true, true);
        }
        return true;
      }

      if (editTarget === 'AGE') {
        const ag = nlu?.age && nlu.age > 0 ? nlu.age : localParseNumber(correctionVal || rawClean);
        if (ag && ag >= 12 && ag <= 110) {
          const nextReg = { ...regDraftRef.current, age: ag };
          updateRegDraft(() => nextReg);
          resumeAfterCorrectionStepRef.current = null;
          await askStepPrompt(returnStep, undefined, nextReg, undefined, c.correctionPrefix);
        } else {
          resumeAfterCorrectionStepRef.current = returnStep;
          updateStep('REG_AGE');
          speakAndListen(c.correctionAskAge, true, true);
        }
        return true;
      }

      if (editTarget === 'DATE') {
        const dt = nlu?.extractedDateISO || localParseDateISO(correctionVal || rawClean);
        const todayIso = new Date().toISOString().slice(0, 10);
        if (dt && dt >= todayIso) {
          const nextBook = { ...bookingDraftRef.current, travelDateISO: dt };
          updateBookingDraft(() => nextBook);
          resumeAfterCorrectionStepRef.current = null;
          await askStepPrompt(returnStep, undefined, undefined, nextBook, c.correctionPrefix);
        } else {
          resumeAfterCorrectionStepRef.current = returnStep;
          updateStep('BOOK_DATE');
          speakAndListen(c.correctionAskDate, true, true);
        }
        return true;
      }

      if (editTarget === 'TIME') {
        const tm = nlu?.extractedTime24 || localParseTime24(correctionVal || rawClean);
        if (tm && /^\d{2}:\d{2}$/.test(tm)) {
          const nextBook = { ...bookingDraftRef.current, travelTime24: tm };
          updateBookingDraft(() => nextBook);
          resumeAfterCorrectionStepRef.current = null;
          await askStepPrompt(returnStep, undefined, undefined, nextBook, c.correctionPrefix);
        } else {
          resumeAfterCorrectionStepRef.current = returnStep;
          updateStep('BOOK_TIME');
          speakAndListen(c.correctionAskTime, true, true);
        }
        return true;
      }

      if (editTarget === 'LUGGAGE') {
        const cnt =
          nlu && typeof nlu.luggageCount === 'number' && nlu.luggageCount >= 0
            ? nlu.luggageCount
            : localParseNumber(correctionVal || rawClean);
        if (cnt !== null && cnt >= 0 && cnt <= 15) {
          const nextBook = { ...bookingDraftRef.current, numBags: cnt, estimatedFare: null };
          updateBookingDraft(() => nextBook);
          resumeAfterCorrectionStepRef.current = null;
          await askStepPrompt(returnStep, undefined, undefined, nextBook, c.correctionPrefix);
        } else {
          resumeAfterCorrectionStepRef.current = returnStep;
          updateStep('BOOK_BAGS');
          speakAndListen(c.correctionAskBags, true, true);
        }
        return true;
      }

      if (editTarget === 'ASSISTANCE') {
        const lower = `${correctionVal} ${rawClean}`.toLowerCase();
        const wantsWheel =
          nlu?.assistanceCategory === 'WHEELCHAIR' || /(wheelchair|chair)/.test(lower);
        const wantsMob =
          wantsWheel ||
          nlu?.wantsMobilitySupport === 'YES' ||
          /(mobility|escort|support|blind|visual)/.test(lower);
        if (wantsWheel || wantsMob || nlu?.wantsMobilitySupport === 'NO') {
          const nextBook: VoiceBookingDraft = {
            ...bookingDraftRef.current,
            mobilityAssistance: wantsMob,
            wheelchairAssistance: wantsWheel,
            estimatedFare: null,
            assistanceCategory: wantsWheel
              ? 'Wheelchair & Mobility Assistance'
              : wantsMob
              ? 'Mobility & Visually Impaired Escort'
              : 'Luggage Porter Assistance',
          };
          updateBookingDraft(() => nextBook);
          resumeAfterCorrectionStepRef.current = null;
          await askStepPrompt(returnStep, undefined, undefined, nextBook, c.correctionPrefix);
        } else {
          resumeAfterCorrectionStepRef.current = returnStep;
          updateStep('BOOK_MOBILITY');
          speakAndListen(c.correctionAskMobility, true, true);
        }
        return true;
      }

      if (editTarget === 'PAYMENT') {
        const lower = `${correctionVal} ${rawClean}`.toLowerCase();
        const pm: 'UPI' | 'CASH' | null =
          nlu?.paymentMethod === 'UPI' || nlu?.paymentMethod === 'CASH'
            ? nlu.paymentMethod
            : /upi|online|google pay|phonepe/.test(lower)
            ? 'UPI'
            : /cash/.test(lower)
            ? 'CASH'
            : null;
        if (pm) {
          const nextBook = { ...bookingDraftRef.current, paymentMethod: pm };
          updateBookingDraft(() => nextBook);
          resumeAfterCorrectionStepRef.current = null;
          await askStepPrompt(returnStep, undefined, undefined, nextBook, c.correctionPrefix);
        } else {
          resumeAfterCorrectionStepRef.current = returnStep;
          updateStep('BOOK_PAYMENT');
          speakAndListen(c.correctionAskPayment, true, true);
        }
        return true;
      }

      return false;
    },
    [
      askStepPrompt,
      handleDetectCurrentGps,
      searchPlacesForStep,
      speakAndListen,
      updateBookingDraft,
      updateRegDraft,
      updateStep,
    ]
  );

  // Core utterance processor with instant automatic language detection & mid-conversation switching
  const processUtterance = useCallback(
    async (rawText: string) => {
      const clean = rawText.trim();
      if (!clean || processingRef.current) return;

      const currentStep = stepRef.current;
      const nowTs = Date.now();
      if (
        lastProcessedRef.current.step === currentStep &&
        lastProcessedRef.current.text === clean.toLowerCase() &&
        nowTs - lastProcessedRef.current.at < 1200
      ) {
        return;
      }
      lastProcessedRef.current = { step: currentStep, text: clean.toLowerCase(), at: nowTs };

      if (!isPasswordStep(currentStep)) {
        setTranscript(clean);
      }

      // 1. Keep assistant response language strictly English ('en') while understanding EN/KN/HI input
      langRef.current = 'en';

      const localCmd = detectLocalGlobalCommand(clean, currentStep);
      const localFast =
        localCmd === 'NONE' ? tryResolveLocallyFast(clean, currentStep, candidatesRef.current) : null;
      const localCorrection =
        localCmd === 'NONE' && !localFast ? detectLocalCorrection(clean) : null;
      let nlu: VoiceParseResult | null = localFast;

      // 2. Invoke Gemini AI NLU when deterministic fast-path cannot resolve cleanly
      if (localCmd === 'NONE' && !nlu) {
        processingRef.current = true;
        setProcessing(true);
        try {
          const todayIso = new Date().toISOString().slice(0, 10);
          const optionsList =
            currentStep === 'BOOK_PICKUP_DISAMBIGUATE' ||
            currentStep === 'BOOK_DEST_DISAMBIGUATE'
              ? candidatesRef.current.map((item) => `${item.displayName}, ${item.formattedAddress}`)
              : undefined;
          const res = await withDelayedThinkingFeedback(
            apiRequest<{ parsed: VoiceParseResult }>('/api/voice/understand', {
              method: 'POST',
              body: JSON.stringify({
                transcript: clean,
                currentStep,
                language: 'en',
                currentLocalDate: todayIso,
                optionsList,
                conversationContext: {
                  isAuthenticated: Boolean(user),
                  pendingIntent: pendingIntentRef.current,
                  regName: regDraftRef.current.fullName,
                  regPhone: regDraftRef.current.phone,
                  regEmail: regDraftRef.current.email,
                  pickup: bookingDraftRef.current.pickup?.formattedAddress || '',
                  destination: bookingDraftRef.current.destination?.formattedAddress || '',
                  travelDateISO: bookingDraftRef.current.travelDateISO,
                  travelTime24: bookingDraftRef.current.travelTime24,
                  numBags: bookingDraftRef.current.numBags,
                  paymentMethod: bookingDraftRef.current.paymentMethod,
                },
              }),
            })
          );
          nlu = res.parsed;
        } catch {
          nlu = null;
        }
        processingRef.current = false;
        setProcessing(false);
      }

      // 3. Enforce English-only response copy regardless of detected spoken language
      langRef.current = 'en';
      const c = VOICE_I18N.en;
      const cmd = localCmd !== 'NONE' ? localCmd : nlu?.globalCommand || 'NONE';

      // If speech was genuinely ambiguous/unclear with no extracted action or field, politely clarify in English
      if (
        nlu?.detectedLanguage === 'UNCLEAR' &&
        cmd === 'NONE' &&
        !nlu.isCorrection &&
        !nlu.useCurrentLocation &&
        !nlu.extractedLocationQuery &&
        !nlu.extractedDateISO &&
        !nlu.extractedTime24 &&
        !nlu.fullName &&
        !nlu.mobileNumber &&
        !nlu.emailAddress &&
        nlu.luggageCount < 0 &&
        nlu.paymentMethod === 'NONE' &&
        nlu.choiceIndex <= 0 &&
        nlu.selectedLanguage === 'NONE'
      ) {
        const safeClarify =
          nlu.friendlyClarification && !/[\u0900-\u097F\u0C80-\u0CFF]/.test(nlu.friendlyClarification)
            ? nlu.friendlyClarification
            : c.clarifySpeechPrompt;
        speakAndListen(safeClarify, true, false);
        return;
      }

      // Universal continuous call commands
      if (cmd === 'END_CONVERSATION') {
        pausedRef.current = true;
        autoListenEnabledRef.current = false;
        stopListeningNow();
        stopSpeakingNow();
        setAssistantMessage(c.conversationEnded);
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          const bye = new SpeechSynthesisUtterance(c.conversationEnded);
          bye.lang = SPEECH_LANG_CODES[langRef.current] || 'en-IN';
          bye.onend = () => onClose();
          window.speechSynthesis.speak(bye);
          window.setTimeout(() => onClose(), 3200);
        } else {
          onClose();
        }
        return;
      }

      if (cmd === 'PAUSE' || cmd === 'STOP_SPEAKING') {
        pausedRef.current = true;
        setPaused(true);
        autoListenEnabledRef.current = false;
        stopSpeakingNow();
        stopListeningNow();
        setAssistantMessage(c.conversationPaused);
        return;
      }

      if (cmd === 'RESUME' || cmd === 'CONTINUE') {
        pausedRef.current = false;
        setPaused(false);
        autoListenEnabledRef.current = true;
        speakAndListen(`${c.conversationResumed} ${lastPromptRef.current}`, !isPasswordStep(currentStep), false);
        return;
      }

      if (cmd === 'REPEAT') {
        speakAndListen(lastPromptRef.current, !isPasswordStep(currentStep), false);
        return;
      }

      if (cmd === 'RETURN_HOME') {
        stopSpeakingNow();
        stopListeningNow();
        stopMicHardware();
        onReturnHome();
        return;
      }

      if (cmd === 'CHANGE_LANGUAGE') {
        speakAndListen(
          `I always respond in English, and you can speak to me in English, Kannada, or Hindi anytime. ${lastPromptRef.current}`,
          !isPasswordStep(currentStep),
          false
        );
        return;
      }

      if (cmd === 'GO_BACK') {
        resumeAfterCorrectionStepRef.current = null;
        const prev = stepHistoryRef.current.pop();
        if (prev) {
          await askStepPrompt(prev);
        } else {
          await askStepPrompt(user ? 'AUTH_MAIN_MENU' : 'WELCOME_INTENT');
        }
        return;
      }

      if (cmd === 'HELP' || cmd === 'WHAT_OPTIONS') {
        speakAndListen(lastPromptRef.current, !isPasswordStep(currentStep), false);
        return;
      }

      if (cmd === 'FORGOT_PASSWORD') {
        await askStepPrompt('FORGOT_IDENTIFIER');
        return;
      }

      if (cmd === 'VOICE_OTP_LOGIN') {
        await requestVoiceOtpSignIn();
        return;
      }

      if (cmd === 'CUSTOMER_SUPPORT') {
        speakAndListen(c.supportMessage, true, true);
        return;
      }

      if (cmd === 'LOGOUT') {
        onVoiceLogout();
        pendingIntentRef.current = 'NONE';
        updateRegDraft(() => INITIAL_REG_DRAFT);
        updateBookingDraft(() => INITIAL_BOOKING_DRAFT);
        setConfirmedBooking(null);
        updateStep('WELCOME_INTENT', false);
        speakAndListen(`${c.loggedOutMessage} ${c.welcomeGreeting}`, true, true);
        return;
      }

      if (cmd === 'CANCEL_BOOKING') {
        if (
          currentStep !== 'AUTH_MAIN_MENU' &&
          currentStep !== 'BOOKING_COMPLETE' &&
          currentStep !== 'WELCOME_INTENT'
        ) {
          updateBookingDraft(() => INITIAL_BOOKING_DRAFT);
          returnToBookSummaryRef.current = false;
          resumeAfterCorrectionStepRef.current = null;
          updateStep('AUTH_MAIN_MENU', false);
          speakAndListen(`${c.bookDiscarded} ${c.authMainMenu}`, true, true);
          return;
        }
        if (!user) {
          pendingIntentRef.current = 'CANCEL_BOOKING';
          await askStepPrompt('AUTH_CHECK_REGISTERED');
          return;
        }
        await initiateCancelExistingVoice();
        return;
      }

      // Mid-conversation field correction check (at ANY step outside language selection / password entry)
      if (
        !isPasswordStep(currentStep) &&
        currentStep !== 'LANG_SELECT' &&
        currentStep !== 'REG_CHOOSE_CHANGE' &&
        currentStep !== 'BOOK_CHOOSE_CHANGE'
      ) {
        const corrTarget =
          (nlu?.isCorrection && nlu.editTarget !== 'NONE' ? nlu.editTarget : '') ||
          localCorrection?.editTarget ||
          '';
        if (corrTarget) {
          const corrVal = nlu?.correctionValue || localCorrection?.value || '';
          const handled = await handleMidFlowCorrection(
            currentStep,
            corrTarget,
            corrVal,
            nlu,
            clean
          );
          if (handled) return;
        }
      }

      // Step-by-step state machine
      switch (currentStep) {
        case 'LANG_SELECT': {
          langRef.current = 'en';
          const resumeStep = prevStepBeforeLangChangeRef.current;
          prevStepBeforeLangChangeRef.current = null;
          if (resumeStep && resumeStep !== 'LANG_SELECT') {
            await askStepPrompt(resumeStep, 'en');
          } else if (user) {
            await askStepPrompt('AUTH_MAIN_MENU', 'en');
          } else {
            await askStepPrompt('WELCOME_INTENT', 'en');
          }
          return;
        }

        case 'WELCOME_INTENT': {
          if (cmd === 'BOOK_HELPER') {
            pendingIntentRef.current = 'BOOK_HELPER';
            await askStepPrompt('AUTH_CHECK_REGISTERED');
            return;
          }
          if (cmd === 'REGISTER') {
            pendingIntentRef.current = 'NONE';
            updateRegDraft(() => ({
              ...INITIAL_REG_DRAFT,
              preferredLanguage: langRef.current,
            }));
            setRegPassword('');
            regPasswordRef.current = '';
            await askStepPrompt('REG_NAME', undefined, undefined, undefined, c.startRegIntro);
            return;
          }
          if (cmd === 'SIGN_IN') {
            pendingIntentRef.current = 'NONE';
            await askStepPrompt('LOGIN_IDENTIFIER');
            return;
          }
          if (cmd === 'TRACK_BOOKING' || cmd === 'CHECK_BOOKING') {
            pendingIntentRef.current = 'TRACK_BOOKING';
            await askStepPrompt('AUTH_CHECK_REGISTERED');
            return;
          }
          if (cmd === 'BOOKING_HISTORY') {
            pendingIntentRef.current = 'BOOKING_HISTORY';
            await askStepPrompt('AUTH_CHECK_REGISTERED');
            return;
          }
          speakAndListen(`${c.notUnderstood} ${c.welcomeGreeting}`, true, true);
          return;
        }

        case 'AUTH_CHECK_REGISTERED': {
          const yn = cmd === 'YES' || cmd === 'NO' ? cmd : localParseYesNo(clean);
          if (yn === 'NO') {
            updateRegDraft(() => ({
              ...INITIAL_REG_DRAFT,
              preferredLanguage: langRef.current,
            }));
            setRegPassword('');
            regPasswordRef.current = '';
            updateStep('REG_NAME');
            speakAndListen(`${c.startRegIntro} ${c.regAskName}`, true, true);
            return;
          }
          if (yn === 'YES') {
            await askStepPrompt('LOGIN_IDENTIFIER');
            return;
          }
          speakAndListen(`${c.notUnderstood} ${c.askAlreadyRegistered}`, true, true);
          return;
        }

        case 'REG_NAME': {
          const name = (
            nlu?.fullName ||
            clean.replace(/^(my name is|i am|this is|name is)\s+/i, '')
          ).trim();
          if (name.length < 2 || /\d/.test(name)) {
            speakAndListen(`${c.notUnderstood} ${c.regAskName}`, true, true);
            return;
          }
          const nextReg = { ...regDraftRef.current, fullName: name };
          updateRegDraft(() => nextReg);
          const resumeStep = resumeAfterCorrectionStepRef.current;
          resumeAfterCorrectionStepRef.current = null;
          if (returnToRegSummaryRef.current) {
            await askStepPrompt('REG_SUMMARY_CONFIRM', undefined, nextReg);
          } else if (resumeStep && resumeStep !== 'REG_NAME') {
            await askStepPrompt(resumeStep, undefined, nextReg, undefined, c.correctionPrefix);
          } else {
            await askStepPrompt('REG_PHONE', undefined, nextReg);
          }
          return;
        }

        case 'REG_PHONE': {
          const digits = (nlu?.mobileNumber || normalizeSpokenDigits(clean)).replace(/\D/g, '');
          if (digits.length < 10 || digits.length > 13) {
            speakAndListen(c.regInvalidPhone(digits.length), true, true);
            return;
          }
          const nextReg = { ...regDraftRef.current, phone: digits };
          updateRegDraft(() => nextReg);
          const resumeStep = resumeAfterCorrectionStepRef.current;
          resumeAfterCorrectionStepRef.current = null;
          if (returnToRegSummaryRef.current) {
            await askStepPrompt('REG_SUMMARY_CONFIRM', undefined, nextReg);
          } else if (resumeStep && resumeStep !== 'REG_PHONE') {
            await askStepPrompt(resumeStep, undefined, nextReg, undefined, c.correctionPrefix);
          } else {
            await askStepPrompt('REG_EMAIL', undefined, nextReg);
          }
          return;
        }

        case 'REG_EMAIL': {
          const email = localParseEmail(nlu?.emailAddress || clean);
          if (!email) {
            speakAndListen(c.regInvalidEmail, true, true);
            return;
          }
          const nextReg = { ...regDraftRef.current, email };
          updateRegDraft(() => nextReg);
          const resumeStep = resumeAfterCorrectionStepRef.current;
          resumeAfterCorrectionStepRef.current = null;
          if (returnToRegSummaryRef.current) {
            await askStepPrompt('REG_SUMMARY_CONFIRM', undefined, nextReg);
          } else if (resumeStep && resumeStep !== 'REG_EMAIL') {
            await askStepPrompt(resumeStep, undefined, nextReg, undefined, c.correctionPrefix);
          } else {
            await askStepPrompt('REG_PASSWORD', undefined, nextReg);
          }
          return;
        }

        case 'REG_PASSWORD':
        case 'REG_CONFIRM_PASSWORD':
        case 'FORGOT_NEW_PASSWORD': {
          speakAndListen(c.regAskPassword, false, true);
          return;
        }

        case 'REG_AGE': {
          const ageNum = nlu?.age && nlu.age > 0 ? nlu.age : localParseNumber(clean);
          if (!ageNum || ageNum < 12 || ageNum > 110) {
            speakAndListen(c.regInvalidAge, true, true);
            return;
          }
          const nextReg = { ...regDraftRef.current, age: ageNum, preferredLanguage: 'en' as Language };
          updateRegDraft(() => nextReg);
          const resumeStep = resumeAfterCorrectionStepRef.current;
          resumeAfterCorrectionStepRef.current = null;
          if (returnToRegSummaryRef.current) {
            await askStepPrompt('REG_SUMMARY_CONFIRM', 'en', nextReg);
          } else if (resumeStep && resumeStep !== 'REG_AGE') {
            await askStepPrompt(resumeStep, 'en', nextReg, undefined, c.correctionPrefix);
          } else {
            await askStepPrompt('REG_ACCESSIBILITY', 'en', nextReg);
          }
          return;
        }

        case 'REG_PREF_LANG': {
          const nextReg = { ...regDraftRef.current, preferredLanguage: 'en' as Language };
          updateRegDraft(() => nextReg);
          langRef.current = 'en';
          if (returnToRegSummaryRef.current) {
            await askStepPrompt('REG_SUMMARY_CONFIRM', 'en', nextReg);
          } else {
            await askStepPrompt('REG_ACCESSIBILITY', 'en', nextReg);
          }
          return;
        }

        case 'REG_ACCESSIBILITY': {
          const lower = clean.toLowerCase();
          let label =
            nlu?.accessibilityLabel && !/[\u0900-\u097F\u0C80-\u0CFF]/.test(nlu.accessibilityLabel)
              ? nlu.accessibilityLabel.trim()
              : '';
          if (!label) {
            if (/(visual|blind|sight|ದೃಷ್ಟಿ|नेत्रहीन)/.test(lower)) {
              label = 'Visually impaired passenger assistance';
            } else if (/(senior|elder|old|ಹಿರಿಯ|वरिष्ठ)/.test(lower)) {
              label = 'Senior citizen mobility assistance';
            } else if (/(wheelchair|chair|ವೀಲ್|व्हील)/.test(lower)) {
              label = 'Wheelchair assistance';
            } else if (/(mobility|walk|ಚಲನಶೀಲತೆ|मोबिलिटी)/.test(lower)) {
              label = 'Mobility assistance';
            } else if (/^(no|none|nothing|ಇಲ್ಲ|ನಹಿ|नहीं)$/.test(lower)) {
              label = 'General travel assistance';
            } else if (/[\u0900-\u097F\u0C80-\u0CFF]/.test(clean)) {
              label = 'General travel assistance';
            } else {
              label = clean;
            }
          }
          const nextReg = { ...regDraftRef.current, accessibilityRequirements: label };
          updateRegDraft(() => nextReg);
          await askStepPrompt('REG_SUMMARY_CONFIRM', 'en', nextReg);
          return;
        }

        case 'REG_SUMMARY_CONFIRM': {
          const yn = cmd === 'YES' || cmd === 'NO' ? cmd : localParseYesNo(clean);
          if (yn === 'YES') {
            await submitVoiceRegistration();
            return;
          }
          if (yn === 'NO') {
            await askStepPrompt('REG_CHOOSE_CHANGE');
            return;
          }
          speakAndListen(c.confirmYesNoPrompt, true, true);
          return;
        }

        case 'REG_CHOOSE_CHANGE': {
          returnToRegSummaryRef.current = true;
          const tTarget = nlu?.editTarget || 'NONE';
          const lower = clean.toLowerCase();
          if (tTarget === 'NAME' || /\bname\b/.test(lower)) await askStepPrompt('REG_NAME');
          else if (tTarget === 'PHONE' || /(phone|mobile|number)/.test(lower)) await askStepPrompt('REG_PHONE');
          else if (tTarget === 'EMAIL' || /\bemail\b/.test(lower)) await askStepPrompt('REG_EMAIL');
          else if (tTarget === 'PASSWORD' || /\bpassword\b/.test(lower)) await askStepPrompt('REG_PASSWORD');
          else if (tTarget === 'AGE' || /\bage\b/.test(lower)) await askStepPrompt('REG_AGE');
          else if (tTarget === 'LANGUAGE' || /\blanguage\b/.test(lower)) await askStepPrompt('REG_PREF_LANG');
          else if (tTarget === 'ASSISTANCE' || /(assistance|access|special)/.test(lower)) {
            await askStepPrompt('REG_ACCESSIBILITY');
          } else {
            speakAndListen(c.regAskChangeField, true, true);
          }
          return;
        }

        case 'LOGIN_IDENTIFIER': {
          const emailVal = localParseEmail(nlu?.emailAddress || clean);
          const phoneVal = (nlu?.mobileNumber || normalizeSpokenDigits(clean)).replace(/\D/g, '');
          const identifier = emailVal || (phoneVal.length >= 10 ? phoneVal : '');
          if (!identifier) {
            speakAndListen(`${c.notUnderstood} ${c.loginWelcomeBack}`, true, true);
            return;
          }
          setLoginIdentifier(identifier);
          loginIdentifierRef.current = identifier;
          await askStepPrompt('LOGIN_AUTH_METHOD');
          return;
        }

        case 'LOGIN_AUTH_METHOD': {
          const lower = clean.toLowerCase();
          if (/(otp|code|voice|hands|one time|ಒಟಿಪಿ|ओटीपी)/.test(lower)) {
            await requestVoiceOtpSignIn();
            return;
          }
          if (/(password|type|screen|ಪಾಸ್‌ವರ್ಡ್|पासवर्ड)/.test(lower)) {
            await askStepPrompt('LOGIN_PASSWORD');
            return;
          }
          speakAndListen(c.loginMethodPrompt, true, true);
          return;
        }

        case 'LOGIN_OTP': {
          const otpDigits = (nlu?.mobileNumber || normalizeSpokenDigits(clean)).replace(/\D/g, '');
          if (otpDigits.length !== 6) {
            speakAndListen(c.loginOtpInvalid, true, true);
            return;
          }
          processingRef.current = true;
          setProcessing(true);
          try {
            const res = await apiRequest<{ token: string; user: UserProfile }>(
              '/api/auth/voice-otp/verify',
              {
                method: 'POST',
                body: JSON.stringify({
                  identifier: loginIdentifierRef.current,
                  otpCode: otpDigits,
                }),
              }
            );
            processingRef.current = false;
            setProcessing(false);
            await finishAuthSuccess(res, false);
          } catch (err: any) {
            processingRef.current = false;
            setProcessing(false);
            speakAndListen(c.otpRetryPrompt(err?.message || c.loginOtpInvalid), true, true);
          }
          return;
        }

        case 'LOGIN_PASSWORD': {
          if (clean.toLowerCase().includes('try again') || clean.toLowerCase().includes('another')) {
            await askStepPrompt('LOGIN_IDENTIFIER');
            return;
          }
          speakAndListen(c.loginAskPasswordOrOtp, false, true);
          return;
        }

        case 'FORGOT_IDENTIFIER': {
          const emailVal = localParseEmail(nlu?.emailAddress || clean);
          const phoneVal = (nlu?.mobileNumber || normalizeSpokenDigits(clean)).replace(/\D/g, '');
          const identifier = emailVal || (phoneVal.length >= 10 ? phoneVal : '');
          if (!identifier) {
            speakAndListen(`${c.notUnderstood} ${c.forgotAskIdentifier}`, true, true);
            return;
          }
          processingRef.current = true;
          setProcessing(true);
          try {
            const res = await apiRequest<{ demoResetCode: string }>('/api/auth/forgot-password', {
              method: 'POST',
              body: JSON.stringify({ identifier }),
            });
            processingRef.current = false;
            setProcessing(false);
            setForgotIdentifier(identifier);
            forgotIdentifierRef.current = identifier;
            setDemoResetCode(res.demoResetCode);
            await askStepPrompt('FORGOT_OTP');
          } catch (err: any) {
            processingRef.current = false;
            setProcessing(false);
            speakAndListen(
              `${err?.message || 'Account not found.'} ${c.forgotAskIdentifier}`,
              true,
              true
            );
          }
          return;
        }

        case 'FORGOT_OTP': {
          const otpDigits = (nlu?.mobileNumber || normalizeSpokenDigits(clean)).replace(/\D/g, '');
          if (otpDigits.length !== 6) {
            speakAndListen(c.forgotOtpInvalidPrompt, true, true);
            return;
          }
          setForgotOtpCode(otpDigits);
          forgotOtpRef.current = otpDigits;
          await askStepPrompt('FORGOT_NEW_PASSWORD');
          return;
        }

        case 'AUTH_MAIN_MENU':
        case 'BOOKING_COMPLETE': {
          if (cmd === 'BOOK_HELPER') {
            updateBookingDraft(() => INITIAL_BOOKING_DRAFT);
            returnToBookSummaryRef.current = false;
            resumeAfterCorrectionStepRef.current = null;
            setConfirmedBooking(null);
            await askStepPrompt('BOOK_PICKUP', undefined, undefined, INITIAL_BOOKING_DRAFT);
            return;
          }
          if (cmd === 'TRACK_BOOKING' || cmd === 'CHECK_BOOKING') {
            await trackLatestBookingVoice();
            return;
          }
          if (cmd === 'BOOKING_HISTORY') {
            await readBookingHistoryVoice();
            return;
          }
          speakAndListen(c.authMenuInvalid, true, true);
          return;
        }

        case 'CONFIRM_CANCEL_EXISTING': {
          const yn = cmd === 'YES' || cmd === 'NO' ? cmd : localParseYesNo(clean);
          if (yn === 'YES' && cancelCodeRef.current) {
            processingRef.current = true;
            setProcessing(true);
            try {
              await apiRequest(`/api/voice/bookings/${cancelCodeRef.current}/cancel`, {
                method: 'PATCH',
              });
              onBookingCancelled();
              processingRef.current = false;
              setProcessing(false);
              updateStep('AUTH_MAIN_MENU', false);
              speakAndListen(
                `${c.bookingCancelledSpeech(cancelCodeRef.current)} ${c.authMainMenu}`,
                true,
                true
              );
            } catch {
              processingRef.current = false;
              setProcessing(false);
              updateStep('AUTH_MAIN_MENU', false);
              speakAndListen(`${c.cancelErrorPrompt} ${c.authMainMenu}`, true, true);
            }
          } else {
            updateStep('AUTH_MAIN_MENU', false);
            speakAndListen(`${c.bookingKeptSpeech} ${c.authMainMenu}`, true, true);
          }
          return;
        }

        case 'BOOK_PICKUP': {
          const wantsGps =
            nlu?.useCurrentLocation ||
            /\b(use my current location|current location|my location|detect gps|gps|here)\b|ನನ್ನ ಪ್ರಸ್ತುತ|मेरा वर्तमान/i.test(
              clean
            );
          if (wantsGps) {
            handleDetectCurrentGps();
            return;
          }
          const query = nlu?.extractedLocationQuery?.trim() || clean;
          await searchPlacesForStep(query, 'pickup');
          return;
        }

        case 'BOOK_PICKUP_DISAMBIGUATE': {
          if (/\b(search again|none|different|no)\b/i.test(clean)) {
            await askStepPrompt('BOOK_PICKUP');
            return;
          }
          const idx =
            nlu?.choiceIndex && nlu.choiceIndex > 0 ? nlu.choiceIndex : localParseNumber(clean);
          const list = candidatesRef.current;
          if (!idx || idx < 1 || idx > list.length) {
            speakAndListen(c.bookPickOptionRange(list.length), true, true);
            return;
          }
          await finalizePickupAndContinue(list[idx - 1]);
          return;
        }

        case 'BOOK_PICKUP_CONFIRM': {
          const yn = cmd === 'YES' || cmd === 'NO' ? cmd : localParseYesNo(clean);
          if (yn === 'YES') {
            await finalizePickupAndContinue(candidatesRef.current[0]);
          } else if (yn === 'NO') {
            await askStepPrompt('BOOK_PICKUP');
          } else {
            speakAndListen(c.confirmYesNoPrompt, true, true);
          }
          return;
        }

        case 'BOOK_DESTINATION': {
          const query = nlu?.extractedLocationQuery?.trim() || clean;
          await searchPlacesForStep(query, 'destination');
          return;
        }

        case 'BOOK_DEST_DISAMBIGUATE': {
          if (/\b(search again|none|different|no)\b/i.test(clean)) {
            await askStepPrompt('BOOK_DESTINATION');
            return;
          }
          const idx =
            nlu?.choiceIndex && nlu.choiceIndex > 0 ? nlu.choiceIndex : localParseNumber(clean);
          const list = candidatesRef.current;
          if (!idx || idx < 1 || idx > list.length) {
            speakAndListen(c.bookPickOptionRange(list.length), true, true);
            return;
          }
          const picked = list[idx - 1];
          setCandidates([picked]);
          candidatesRef.current = [picked];
          if (resumeAfterCorrectionStepRef.current) {
            updateStep('BOOK_DEST_CONFIRM');
            speakAndListen(c.correctionConfirmPlace('destination', picked.displayName), true, true);
          } else {
            await finalizeDestinationCandidate(picked, c.ackDestAskDate(picked.displayName));
          }
          return;
        }

        case 'BOOK_DEST_CONFIRM': {
          const yn = cmd === 'YES' || cmd === 'NO' ? cmd : localParseYesNo(clean);
          if (yn === 'YES') {
            await finalizeDestinationCandidate(candidatesRef.current[0]);
          } else if (yn === 'NO') {
            await askStepPrompt('BOOK_DESTINATION');
          } else {
            speakAndListen(c.confirmYesNoPrompt, true, true);
          }
          return;
        }

        case 'BOOK_DATE': {
          const dateIso = nlu?.extractedDateISO || localParseDateISO(clean);
          const todayIso = new Date().toISOString().slice(0, 10);
          if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso) || dateIso < todayIso) {
            speakAndListen(c.bookInvalidDate, true, true);
            return;
          }
          const nextBook = { ...bookingDraftRef.current, travelDateISO: dateIso };
          updateBookingDraft(() => nextBook);
          const resumeStep = resumeAfterCorrectionStepRef.current;
          resumeAfterCorrectionStepRef.current = null;
          if (returnToBookSummaryRef.current) {
            await askStepPrompt('BOOK_SUMMARY_CONFIRM', undefined, undefined, nextBook);
          } else if (resumeStep && resumeStep !== 'BOOK_DATE' && resumeStep !== 'BOOK_DATE_CONFIRM') {
            await askStepPrompt(resumeStep, undefined, undefined, nextBook, c.correctionPrefix);
          } else {
            await askStepPrompt(
              'BOOK_TIME',
              undefined,
              undefined,
              nextBook,
              undefined,
              c.ackDateAskTime(formatReadableDate(dateIso, langRef.current))
            );
          }
          return;
        }

        case 'BOOK_DATE_CONFIRM': {
          const yn = cmd === 'YES' || cmd === 'NO' ? cmd : localParseYesNo(clean);
          if (yn === 'YES') {
            const resumeStep = resumeAfterCorrectionStepRef.current;
            resumeAfterCorrectionStepRef.current = null;
            if (returnToBookSummaryRef.current) {
              await askStepPrompt('BOOK_SUMMARY_CONFIRM');
            } else if (resumeStep && resumeStep !== 'BOOK_DATE' && resumeStep !== 'BOOK_DATE_CONFIRM') {
              await askStepPrompt(resumeStep, undefined, undefined, undefined, c.correctionPrefix);
            } else {
              await askStepPrompt('BOOK_TIME');
            }
          } else if (yn === 'NO') {
            await askStepPrompt('BOOK_DATE');
          } else {
            speakAndListen(c.confirmYesNoPrompt, true, true);
          }
          return;
        }

        case 'BOOK_TIME': {
          const time24 = nlu?.extractedTime24 || localParseTime24(clean);
          if (!time24 || !/^\d{2}:\d{2}$/.test(time24)) {
            speakAndListen(c.bookInvalidTime, true, true);
            return;
          }
          const nextBook = { ...bookingDraftRef.current, travelTime24: time24 };
          updateBookingDraft(() => nextBook);
          const resumeStep = resumeAfterCorrectionStepRef.current;
          resumeAfterCorrectionStepRef.current = null;
          if (returnToBookSummaryRef.current) {
            await askStepPrompt('BOOK_SUMMARY_CONFIRM', undefined, undefined, nextBook);
          } else if (resumeStep && resumeStep !== 'BOOK_TIME' && resumeStep !== 'BOOK_TIME_CONFIRM') {
            await askStepPrompt(resumeStep, undefined, undefined, nextBook, c.correctionPrefix);
          } else {
            await askStepPrompt(
              'BOOK_BAGS',
              undefined,
              undefined,
              nextBook,
              undefined,
              c.ackTimeAskBags(formatReadableTime(time24))
            );
          }
          return;
        }

        case 'BOOK_TIME_CONFIRM': {
          const yn = cmd === 'YES' || cmd === 'NO' ? cmd : localParseYesNo(clean);
          if (yn === 'YES') {
            const resumeStep = resumeAfterCorrectionStepRef.current;
            resumeAfterCorrectionStepRef.current = null;
            if (returnToBookSummaryRef.current) {
              await askStepPrompt('BOOK_SUMMARY_CONFIRM');
            } else if (resumeStep && resumeStep !== 'BOOK_TIME' && resumeStep !== 'BOOK_TIME_CONFIRM') {
              await askStepPrompt(resumeStep, undefined, undefined, undefined, c.correctionPrefix);
            } else {
              await askStepPrompt('BOOK_BAGS');
            }
          } else if (yn === 'NO') {
            await askStepPrompt('BOOK_TIME');
          } else {
            speakAndListen(c.confirmYesNoPrompt, true, true);
          }
          return;
        }

        case 'BOOK_BAGS': {
          const count =
            nlu && typeof nlu.luggageCount === 'number' && nlu.luggageCount >= 0
              ? nlu.luggageCount
              : localParseNumber(clean);
          if (count === null || count < 0 || count > 15) {
            speakAndListen(c.bookInvalidBags, true, true);
            return;
          }
          const nextDraft = { ...bookingDraftRef.current, numBags: count, estimatedFare: null };
          updateBookingDraft(() => nextDraft);
          const resumeStep = resumeAfterCorrectionStepRef.current;
          resumeAfterCorrectionStepRef.current = null;
          if (returnToBookSummaryRef.current) {
            await askStepPrompt('BOOK_SUMMARY_CONFIRM', undefined, undefined, nextDraft);
          } else if (resumeStep && resumeStep !== 'BOOK_BAGS') {
            await askStepPrompt(resumeStep, undefined, undefined, nextDraft, c.correctionPrefix);
          } else {
            await askStepPrompt(
              'BOOK_MOBILITY',
              undefined,
              undefined,
              nextDraft,
              undefined,
              c.ackBagsAskMobility(count)
            );
          }
          return;
        }

        case 'BOOK_MOBILITY': {
          const lower = clean.toLowerCase();
          const wantsWheelchair =
            nlu?.assistanceCategory === 'WHEELCHAIR' || /(wheelchair|chair|ವೀಲ್|व्हील)/.test(lower);
          const yn =
            nlu?.wantsMobilitySupport === 'YES'
              ? 'YES'
              : nlu?.wantsMobilitySupport === 'NO'
              ? 'NO'
              : localParseYesNo(clean);

          if (!wantsWheelchair && yn === 'NONE') {
            speakAndListen(c.bookAskMobility, true, true);
            return;
          }

          const mobility = wantsWheelchair || yn === 'YES';
          const category = wantsWheelchair
            ? 'Wheelchair & Mobility Assistance'
            : mobility
            ? 'Mobility & Visually Impaired Escort'
            : 'Luggage Porter Assistance';

          const nextDraft: VoiceBookingDraft = {
            ...bookingDraftRef.current,
            mobilityAssistance: mobility,
            wheelchairAssistance: wantsWheelchair,
            assistanceCategory: category,
            estimatedFare: null,
          };
          updateBookingDraft(() => nextDraft);

          // Pre-calculate fare asynchronously during payment step so summary reads in 0ms
          if (nextDraft.pickup && nextDraft.destination) {
            void apiRequest<FareBreakdown>('/api/fare/estimate', {
              method: 'POST',
              body: JSON.stringify({
                travelType: nextDraft.travelType,
                pickupLat: nextDraft.pickup.lat,
                pickupLng: nextDraft.pickup.lng,
                dropoffLat: nextDraft.destination.lat,
                dropoffLng: nextDraft.destination.lng,
                distanceKm: nextDraft.distanceKm,
                numBags: Math.max(1, nextDraft.numBags),
                luggageWeightKg: Math.max(8, nextDraft.numBags * 12),
                estimatedDurationMin: nextDraft.durationMin,
                mobilityAssistance: nextDraft.mobilityAssistance,
                wheelchairAssistance: nextDraft.wheelchairAssistance,
              }),
            })
              .then((fareRes) => {
                updateBookingDraft((prev) => ({ ...prev, estimatedFare: fareRes.totalFare }));
              })
              .catch(() => {});
          }

          const shortAssistLabel = wantsWheelchair
            ? 'wheelchair assistance'
            : mobility
            ? 'mobility escort'
            : 'luggage assistance';

          const resumeStep = resumeAfterCorrectionStepRef.current;
          resumeAfterCorrectionStepRef.current = null;
          if (returnToBookSummaryRef.current) {
            await askStepPrompt('BOOK_SUMMARY_CONFIRM', undefined, undefined, nextDraft);
          } else if (resumeStep && resumeStep !== 'BOOK_MOBILITY') {
            await askStepPrompt(resumeStep, undefined, undefined, nextDraft, c.correctionPrefix);
          } else {
            await askStepPrompt(
              'BOOK_PAYMENT',
              undefined,
              undefined,
              nextDraft,
              undefined,
              c.ackMobilityAskPayment(shortAssistLabel)
            );
          }
          return;
        }

        case 'BOOK_PAYMENT': {
          const lower = clean.toLowerCase();
          let payMethod: 'UPI' | 'CASH' | null =
            nlu?.paymentMethod === 'UPI' || nlu?.paymentMethod === 'CASH'
              ? nlu.paymentMethod
              : null;
          if (!payMethod) {
            if (/(upi|google pay|phonepe|paytm|online|ಯುಪಿಐ|यूपीआई)/.test(lower)) payMethod = 'UPI';
            else if (/(cash|ನಗದು|नकद|कैश)/.test(lower)) payMethod = 'CASH';
          }
          if (!payMethod) {
            speakAndListen(c.bookInvalidPayment, true, true);
            return;
          }
          const nextDraft: VoiceBookingDraft = {
            ...bookingDraftRef.current,
            paymentMethod: payMethod,
          };
          updateBookingDraft(() => nextDraft);
          await askStepPrompt('BOOK_SUMMARY_CONFIRM', undefined, undefined, nextDraft);
          return;
        }

        case 'BOOK_SUMMARY_CONFIRM': {
          const yn =
            cmd === 'CANCEL_FLOW'
              ? 'CANCEL_FLOW'
              : cmd === 'YES' || cmd === 'NO'
              ? cmd
              : localParseYesNo(clean);

          if (yn === 'YES') {
            const d = bookingDraftRef.current;
            if (!d.pickup || !d.destination) {
              await askStepPrompt('BOOK_PICKUP');
              return;
            }
            processingRef.current = true;
            setProcessing(true);
            try {
              const res = await withDelayedThinkingFeedback(
                apiRequest<{ booking: BookingRecord }>('/api/voice/bookings', {
                  method: 'POST',
                  body: JSON.stringify({
                    passengerName: user?.full_name || regDraftRef.current.fullName,
                    passengerPhone: user?.phone || regDraftRef.current.phone,
                    passengerEmail: user?.email || regDraftRef.current.email,
                    travelType: d.travelType,
                    pickupLocation: d.pickup.formattedAddress,
                    pickupLat: d.pickup.lat,
                    pickupLng: d.pickup.lng,
                    pickupPlaceId: d.pickup.placeId || null,
                    dropoffLocation: d.destination.formattedAddress,
                    dropoffLat: d.destination.lat,
                    dropoffLng: d.destination.lng,
                    dropoffPlaceId: d.destination.placeId || null,
                    travelDate: d.travelDateISO,
                    travelTime: d.travelTime24,
                    numBags: d.numBags,
                    numPassengers: 1,
                    mobilityAssistance: d.mobilityAssistance,
                    wheelchairAssistance: d.wheelchairAssistance,
                    assistanceCategory: d.assistanceCategory,
                    specialRequirements: user?.passenger?.accessibility_requirements || '',
                    preferredLanguage: langRef.current,
                    distanceKm: d.distanceKm,
                    estimatedDurationMin: d.durationMin,
                    paymentMethod: d.paymentMethod,
                  }),
                })
              );
              processingRef.current = false;
              setProcessing(false);
              const saved = res.booking;
              setConfirmedBooking(saved);
              onVoiceBookingCompleted(saved);
              updateStep('BOOKING_COMPLETE', false);
              playSoftCue('chime');

              const otpSpoken = saved.otp?.otp_code ? saved.otp.otp_code.split('').join(' ') : null;

              speakAndListen(
                c.bookingConfirmedSpeech(
                  saved.booking_code,
                  saved.pickup_location,
                  saved.dropoff_location,
                  saved.estimated_fare,
                  saved.assignment?.helper_name || null,
                  saved.assignment?.eta_minutes ?? null,
                  otpSpoken
                ),
                true,
                true
              );
            } catch (err: any) {
              processingRef.current = false;
              setProcessing(false);
              speakAndListen(c.bookingSubmitFailed(err?.message || 'network error'), true, true);
            }
          } else if (yn === 'NO') {
            await askStepPrompt('BOOK_CHOOSE_CHANGE');
          } else if (yn === 'CANCEL_FLOW') {
            updateBookingDraft(() => INITIAL_BOOKING_DRAFT);
            returnToBookSummaryRef.current = false;
            updateStep('AUTH_MAIN_MENU', false);
            speakAndListen(`${c.bookDiscarded} ${c.authMainMenu}`, true, true);
          } else {
            speakAndListen(c.confirmYesNoPrompt, true, true);
          }
          return;
        }

        case 'BOOK_CHOOSE_CHANGE': {
          returnToBookSummaryRef.current = true;
          const target = nlu?.editTarget || 'NONE';
          const lower = clean.toLowerCase();
          if (target === 'PICKUP' || /(pickup|current location|start)/.test(lower)) {
            await askStepPrompt('BOOK_PICKUP');
          } else if (target === 'DESTINATION' || /(destination|drop)/.test(lower)) {
            await askStepPrompt('BOOK_DESTINATION');
          } else if (target === 'DATE' || /\bdate\b/.test(lower)) {
            await askStepPrompt('BOOK_DATE');
          } else if (target === 'TIME' || /\btime\b/.test(lower)) {
            await askStepPrompt('BOOK_TIME');
          } else if (target === 'LUGGAGE' || /(luggage|bag|suitcase)/.test(lower)) {
            await askStepPrompt('BOOK_BAGS');
          } else if (target === 'ASSISTANCE' || /(wheelchair|mobility|assistance)/.test(lower)) {
            await askStepPrompt('BOOK_MOBILITY');
          } else if (target === 'PAYMENT' || /(payment|upi|cash)/.test(lower)) {
            await askStepPrompt('BOOK_PAYMENT');
          } else {
            speakAndListen(c.bookAskChangeField, true, true);
          }
          return;
        }
      }
    },
    [
      askStepPrompt,
      finalizeDestinationCandidate,
      finalizePickupAndContinue,
      finishAuthSuccess,
      handleDetectCurrentGps,
      handleMidFlowCorrection,
      initiateCancelExistingVoice,
      onBookingCancelled,
      onClose,
      onReturnHome,
      onVoiceBookingCompleted,
      onVoiceLogout,
      readBookingHistoryVoice,
      requestVoiceOtpSignIn,
      searchPlacesForStep,
      speakAndListen,
      stopListeningNow,
      stopMicHardware,
      stopSpeakingNow,
      submitVoiceRegistration,
      trackLatestBookingVoice,
      updateBookingDraft,
      updateRegDraft,
      updateStep,
      user,
      withDelayedThinkingFeedback,
    ]
  );

  processUtteranceRef.current = processUtterance;

  // One-time voice activation when opened: request mic permission + start continuous call + speak greeting
  useEffect(() => {
    if (open) {
      setVoiceMode(initialMode);
      pausedRef.current = false;
      setPaused(false);
      autoListenEnabledRef.current = initialMode === 'guided';
      processingRef.current = false;
      setProcessing(false);
      retryCountRef.current = 0;
      stepHistoryRef.current = [];
      prevStepBeforeLangChangeRef.current = null;
      pendingIntentRef.current = 'NONE';
      resumeAfterCorrectionStepRef.current = null;
      returnToRegSummaryRef.current = false;
      returnToBookSummaryRef.current = false;
      setConfirmedBooking(null);
      setCandidates([]);
      candidatesRef.current = [];
      setTranscript('');
      setInterimTranscript('');
      setMicError('');
      setProtectedPasswordInput('');
      setDemoResetCode('');
      setDemoLoginOtpCode('');
      lastSpeechActivityAtRef.current = Date.now();
      silenceCheckInCountRef.current = 0;

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      speechSupportedRef.current = Boolean(SpeechRecognition);
      setSpeechSupported(Boolean(SpeechRecognition));

      const c = VOICE_I18N[langRef.current];
      if (user) {
        updateStep('AUTH_MAIN_MENU', false);
        lastPromptRef.current = c.authMainMenu;
      } else {
        setRegDraft({ ...INITIAL_REG_DRAFT, preferredLanguage: langRef.current });
        setBookingDraft(INITIAL_BOOKING_DRAFT);
        updateStep('WELCOME_INTENT', false);
        lastPromptRef.current = c.welcomeGreeting;
      }

      if (initialMode === 'live') {
        stopListeningNow();
        stopSpeakingNow();
        stopMicHardware();
        return;
      }

      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.getVoices?.();
      }
      void initMicAndVad();
      speakAndListen(lastPromptRef.current, true, true, langRef.current);
    } else {
      setVoiceMode('guided');
      stopListeningNow();
      stopSpeakingNow();
      stopMicHardware();
    }
  }, [
    open,
    initialMode,
    initMicAndVad,
    speakAndListen,
    stopListeningNow,
    stopMicHardware,
    stopSpeakingNow,
    updateStep,
    user,
  ]);

  // Keyboard accessibility: Escape closes, Space toggles Pause/Resume or interrupts speech
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === ' ' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'BUTTON') {
        e.preventDefault();
        if (speakingRef.current) {
          stopSpeakingNow();
          pausedRef.current = false;
          setPaused(false);
          autoListenEnabledRef.current = true;
          startListening();
          return;
        }
        if (pausedRef.current) {
          pausedRef.current = false;
          setPaused(false);
          autoListenEnabledRef.current = true;
          startListening();
        } else {
          pausedRef.current = true;
          setPaused(true);
          autoListenEnabledRef.current = false;
          stopListeningNow();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, startListening, stopListeningNow, stopSpeakingNow]);

  useEffect(() => {
    return () => {
      stopListeningNow();
      stopSpeakingNow();
      stopMicHardware();
    };
  }, [stopListeningNow, stopMicHardware, stopSpeakingNow]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const text = manualInput.trim();
    setManualInput('');
    stopSpeakingNow();
    stopListeningNow();
    void processUtterance(text);
  };

  if (!open) return null;

  const passwordStepActive = isPasswordStep(step);

  const callStatusLabel = passwordStepActive
    ? vCopy.ui.protectedPassNotice
    : paused
    ? vCopy.ui.pausedLabel
    : processing
    ? vCopy.ui.processingLabel
    : speaking
    ? vCopy.ui.speakingLabel
    : hearingSpeech
    ? vCopy.ui.hearingYouLabel
    : listening
    ? vCopy.ui.listeningLabel
    : vCopy.ui.readyLabel;

  const contextualQuickActions: { label: string; phrase: string; kind?: 'gps' | 'support' }[] = (() => {
    const isKn = false;
    const isHi = false;
    const repeatPhrase = 'Repeat';
    const backPhrase = 'Go back';
    const yesPhrase = 'Yes';
    const noPhrase = 'No';

    if (step === 'LANG_SELECT' || step === 'REG_PREF_LANG') {
      return [
        { label: '1 · English', phrase: 'English' },
        { label: '2 · ಕನ್ನಡ (Kannada)', phrase: 'Kannada' },
        { label: '3 · हिन्दी (Hindi)', phrase: 'Hindi' },
      ];
    }
    if (step === 'WELCOME_INTENT') {
      return [
        {
          label: isKn ? 'ಸಹಾಯಕರನ್ನು ಬುಕ್ ಮಾಡಿ' : isHi ? 'हेल्पर बुक करें' : 'Book a Helper',
          phrase: isKn ? 'ಸಹಾಯಕರನ್ನು ಬುಕ್ ಮಾಡಿ' : isHi ? 'मुझे एक हेल्पर बुक करना है' : 'I want to book a helper',
        },
        {
          label: isKn ? 'ಖಾತೆ ನೋಂದಾಯಿಸಿ' : isHi ? 'नया खाता बनाएं' : 'Register Account',
          phrase: isKn ? 'ನೋಂದಾಯಿಸಿ' : isHi ? 'रजिस्टर करें' : 'Register',
        },
        {
          label: isKn ? 'ಸೈನ್ ಇನ್' : isHi ? 'साइन इन' : 'Sign In',
          phrase: isKn ? 'ಸೈನ್ ಇನ್' : isHi ? 'लॉगिन करें' : 'Sign in',
        },
        {
          label: isKn ? 'ಬುಕಿಂಗ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ' : isHi ? 'बुकिंग ट्रैक करें' : 'Track Booking',
          phrase: isKn ? 'ಬುಕಿಂಗ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ' : isHi ? 'बुकिंग ट्रैक करें' : 'Track booking',
        },
      ];
    }
    if (step === 'AUTH_CHECK_REGISTERED') {
      return [
        { label: isKn ? 'ಹೌದು — ನೋಂದಾಯಿಸಿದ್ದೇನೆ' : isHi ? 'हाँ — पहले से रजिस्टर हूँ' : 'Yes — Already Registered', phrase: yesPhrase },
        { label: isKn ? 'ಇಲ್ಲ — ನೋಂದಾಯಿಸಿ' : isHi ? 'नहीं — नया खाता बनाएं' : 'No — Register Me', phrase: noPhrase },
      ];
    }
    if (step === 'LOGIN_AUTH_METHOD' || step === 'LOGIN_PASSWORD') {
      return [
        { label: isKn ? 'ಧ್ವನಿ OTP ಮೂಲಕ ಸೈನ್ ಇನ್' : isHi ? 'वॉइस OTP से लॉगिन' : 'Sign In Hands-Free with Voice OTP', phrase: 'Send OTP' },
        { label: isKn ? 'ಪಾಸ್‌ವರ್ಡ್ ಟೈಪ್ ಮಾಡಿ' : isHi ? 'पासवर्ड दर्ज करें' : 'Enter Password on Screen', phrase: isKn ? 'ಪಾಸ್‌ವರ್ಡ್' : isHi ? 'पासवर्ड' : 'Password' },
        { label: isKn ? 'ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿದ್ದೀರಾ' : isHi ? 'पासवर्ड भूल गए' : 'Forgot Password', phrase: 'Forgot password' },
        { label: isKn ? 'ಹಿಂದೆ ಹೋಗಿ' : isHi ? 'वापस जाएं' : 'Go Back', phrase: backPhrase },
      ];
    }
    if (step === 'REG_ACCESSIBILITY') {
      return [
        { label: isKn ? 'ದೃಷ್ಟಿಹೀನರ ಸಹಾಯ' : isHi ? 'दृष्टिबाधित सहायता' : 'Visually Impaired', phrase: 'Visually impaired' },
        { label: isKn ? 'ಹಿರಿಯ ನಾಗರಿಕರು' : isHi ? 'वरिष्ठ नागरिक' : 'Senior Citizen', phrase: 'Senior citizen' },
        { label: isKn ? 'ಚಲನಶೀಲತೆ ಸಹಾಯ' : isHi ? 'मोबिलिटी सहायता' : 'Mobility Assistance', phrase: 'Mobility assistance' },
        { label: isKn ? 'ವೀಲ್‌ಚೇರ್ ಸಹಾಯ' : isHi ? 'व्हीलचेयर सहायता' : 'Wheelchair Assistance', phrase: 'Wheelchair assistance' },
      ];
    }
    if (step === 'AUTH_MAIN_MENU' || step === 'BOOKING_COMPLETE') {
      return [
        { label: isKn ? 'ಸಹಾಯಕರನ್ನು ಬುಕ್ ಮಾಡಿ' : isHi ? 'हेल्पर बुक करें' : 'Book a Helper', phrase: isKn ? 'ಸಹಾಯಕರನ್ನು ಬುಕ್ ಮಾಡಿ' : isHi ? 'हेल्पर बुक करें' : 'Book a helper' },
        { label: isKn ? 'ಬುಕಿಂಗ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ' : isHi ? 'बुकिंग ट्रैक करें' : 'Track Booking', phrase: isKn ? 'ಬುಕಿಂಗ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ' : isHi ? 'बुकिंग ट्रैक करें' : 'Track booking' },
        { label: isKn ? 'ಬುಕಿಂಗ್ ಇತಿಹಾಸ' : isHi ? 'बुकिंग इतिहास' : 'Booking History', phrase: isKn ? 'ಬುಕಿಂಗ್ ಇತಿಹಾಸ' : isHi ? 'बुकिंग इतिहास' : 'Booking history' },
        { label: isKn ? 'ಸಹಾಯ ಕೇಂದ್ರ' : isHi ? 'कस्टमर सपोर्ट' : 'Customer Support', phrase: isKn ? 'ಸಹಾಯ ಕೇಂದ್ರ' : isHi ? 'कस्टमर सपोर्ट' : 'Customer support', kind: 'support' },
      ];
    }
    if (step === 'BOOK_PICKUP') {
      return [
        {
          label: isKn ? 'ನನ್ನ ಪ್ರಸ್ತುತ ಸ್ಥಳವನ್ನು ಬಳಸಿ (GPS)' : isHi ? 'मेरा वर्तमान स्थान उपयोग करें (GPS)' : 'Use My Current Location (GPS)',
          phrase: isKn ? 'ನನ್ನ ಪ್ರಸ್ತುತ ಸ್ಥಳ' : isHi ? 'मेरा वर्तमान स्थान' : 'Use my current location',
          kind: 'gps',
        },
        { label: vCopy.ui.repeatBtn, phrase: repeatPhrase },
      ];
    }
    if (step === 'BOOK_PICKUP_DISAMBIGUATE' || step === 'BOOK_DEST_DISAMBIGUATE') {
      return [
        ...candidates.map((item, idx) => ({
          label: `${idx + 1}: ${item.displayName}`,
          phrase: String(idx + 1),
        })),
        { label: isKn ? 'ಮತ್ತೆ ಹುಡುಕಿ' : isHi ? 'फिर से खोजें' : 'Search Again', phrase: isKn ? 'ಮತ್ತೆ ಹುಡುಕಿ' : isHi ? 'फिर से खोजें' : 'Search again' },
      ];
    }
    if (
      step === 'REG_SUMMARY_CONFIRM' ||
      step === 'BOOK_PICKUP_CONFIRM' ||
      step === 'BOOK_DEST_CONFIRM' ||
      step === 'BOOK_DATE_CONFIRM' ||
      step === 'BOOK_TIME_CONFIRM' ||
      step === 'BOOK_SUMMARY_CONFIRM' ||
      step === 'CONFIRM_CANCEL_EXISTING'
    ) {
      return [
        { label: isKn ? 'ಹೌದು — ದೃಢೀಕರಿಸಿ' : isHi ? 'हाँ — कन्फर्म करें' : 'Yes — Confirm', phrase: yesPhrase },
        { label: isKn ? 'ಇಲ್ಲ — ಬದಲಾಯಿಸಿ' : isHi ? 'नहीं — बदलें' : 'No — Make Changes', phrase: noPhrase },
        ...(step === 'BOOK_SUMMARY_CONFIRM' ? [{ label: isKn ? 'ರದ್ದುಮಾಡಿ' : isHi ? 'कैंसल करें' : 'Discard Draft', phrase: isKn ? 'ರದ್ದು' : isHi ? 'कैंसल' : 'Cancel' }] : []),
      ];
    }
    if (step === 'BOOK_MOBILITY') {
      return [
        { label: isKn ? 'ಹೌದು — ವೀಲ್‌ಚೇರ್ ಸಹಾಯ' : isHi ? 'हाँ — व्हीलचेयर सहायता' : 'Yes — Wheelchair Assistance', phrase: isKn ? 'ವೀಲ್‌ಚೇರ್' : isHi ? 'व्हीलचेयर' : 'Wheelchair' },
        { label: isKn ? 'ಹೌದು — ಚಲನಶೀಲತೆ ಸಹಾಯ' : isHi ? 'हाँ — मोबिलिटी सहायता' : 'Yes — Mobility Escort', phrase: yesPhrase },
        { label: isKn ? 'ಇಲ್ಲ — ಲಗೇಜ್ ಮಾತ್ರ' : isHi ? 'नहीं — केवल सामान' : 'No — Luggage Only', phrase: noPhrase },
      ];
    }
    if (step === 'BOOK_PAYMENT') {
      return [
        { label: isKn ? 'UPI ಮೂಲಕ ಪಾವತಿ' : isHi ? 'UPI से भुगतान' : 'Pay via UPI', phrase: 'UPI' },
        { label: isKn ? 'ನಗದು ಪಾವತಿ' : isHi ? 'नकद भुगतान' : 'Pay via Cash', phrase: isKn ? 'ನಗದು' : isHi ? 'नकद' : 'Cash' },
      ];
    }
    return [
      { label: vCopy.ui.repeatBtn, phrase: repeatPhrase },
      { label: isKn ? 'ಹಿಂದೆ ಹೋಗಿ' : isHi ? 'वापस जाएं' : 'Go Back', phrase: backPhrase },
    ];
  })();

  // Live audio waveform heights scaled proportionally from real AnalyserNode RMS
  const barFactors = [0.45, 0.8, 1.0, 0.72, 0.5];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-assistant-heading"
    >
      <div className="bg-white border-2 border-[#123B67] rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-auto">
        {/* Call Control Header */}
        <div className="bg-[#123B67] text-white px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-11 h-11 rounded-xl bg-[#16A6A1] text-white flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <PhoneCall className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2
                id="voice-assistant-heading"
                className="font-display text-lg sm:text-xl font-bold truncate"
              >
                {vCopy.ui.heading}
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 font-medium">
                {getStepProgressLabel(step, 'en')} · English
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {voiceMode === 'guided' && (
              <>
                <button
                  type="button"
                  onClick={() => speakAndListen(lastPromptRef.current || vCopy.welcomeGreeting, !passwordStepActive, false)}
                  className="inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{vCopy.ui.repeatBtn}</span>
                </button>

                {speaking ? (
                  <button
                    type="button"
                    onClick={() => {
                      stopSpeakingNow();
                      pausedRef.current = false;
                      setPaused(false);
                      autoListenEnabledRef.current = true;
                      startListening();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-lg bg-[#16A6A1] hover:bg-[#11827E] text-white text-xs font-bold whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{vCopy.ui.interruptBtn}</span>
                  </button>
                ) : paused ? (
                  <button
                    type="button"
                    onClick={() => {
                      pausedRef.current = false;
                      setPaused(false);
                      autoListenEnabledRef.current = true;
                      void initMicAndVad().then(() => {
                        speakAndListen(lastPromptRef.current, !passwordStepActive, false);
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-lg bg-[#16A6A1] hover:bg-[#11827E] text-white text-xs font-bold whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{vCopy.ui.resumeBtn}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      pausedRef.current = true;
                      setPaused(true);
                      autoListenEnabledRef.current = false;
                      stopSpeakingNow();
                      stopListeningNow();
                      setAssistantMessage(vCopy.conversationPaused);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{vCopy.ui.pauseBtn}</span>
                  </button>
                )}

              </>
            )}

            <button
              type="button"
              onClick={() => {
                if (voiceMode === 'guided') {
                  autoListenEnabledRef.current = false;
                  stopListeningNow();
                  stopSpeakingNow();
                  stopMicHardware();
                  setVoiceMode('live');
                } else {
                  setVoiceMode('guided');
                  pausedRef.current = false;
                  setPaused(false);
                  autoListenEnabledRef.current = true;
                  void initMicAndVad().then(() => {
                    speakAndListen(lastPromptRef.current || vCopy.welcomeGreeting, !passwordStepActive, false);
                  });
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-lg text-xs font-bold whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-white transition-colors ${
                voiceMode === 'live'
                  ? 'bg-[#16A6A1] text-white'
                  : 'bg-white/15 hover:bg-white/25 text-white'
              }`}
            >
              <AudioLines className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{voiceMode === 'live' ? 'Guided Booking' : 'Live AI Chat'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopListeningNow();
                stopSpeakingNow();
                stopMicHardware();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-white"
            >
              <PhoneOff className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{vCopy.ui.endCallBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopListeningNow();
                stopSpeakingNow();
                stopMicHardware();
                onReturnHome();
              }}
              className="w-10 h-10 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-white shrink-0"
              aria-label="Close Voice Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {voiceMode === 'live' ? (
          <div className="max-h-[84vh] overflow-y-auto">
            <LiveVoiceConversation
              language="en"
              onSwitchToGuided={() => {
                setVoiceMode('guided');
                pausedRef.current = false;
                setPaused(false);
                autoListenEnabledRef.current = true;
                void initMicAndVad().then(() => {
                  speakAndListen(lastPromptRef.current || vCopy.welcomeGreeting, !passwordStepActive, false);
                });
              }}
            />
          </div>
        ) : (
        <div className="p-5 sm:p-6 space-y-5 max-h-[84vh] overflow-y-auto">
          <span className="sr-only" aria-live="polite">
            {listeningAnnouncement}
          </span>

          {/* Hands-Free Live Call Telemetry & Conversation Panel */}
          <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-[#EAF4FF] border border-[#123B67]/20 space-y-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={passwordStepActive}
                onClick={() => {
                  if (passwordStepActive) return;
                  if (speakingRef.current) {
                    stopSpeakingNow();
                    pausedRef.current = false;
                    setPaused(false);
                    autoListenEnabledRef.current = true;
                    startListening();
                    return;
                  }
                  if (pausedRef.current) {
                    pausedRef.current = false;
                    setPaused(false);
                    autoListenEnabledRef.current = true;
                    void initMicAndVad().then(() => startListening());
                  } else {
                    pausedRef.current = true;
                    setPaused(true);
                    autoListenEnabledRef.current = false;
                    stopListeningNow();
                  }
                }}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-transform focus-visible:outline-4 focus-visible:outline-[#123B67] disabled:opacity-45 ${
                  passwordStepActive
                    ? 'bg-slate-600'
                    : paused
                    ? 'bg-slate-700 hover:bg-slate-800'
                    : speaking
                    ? 'bg-[#16A6A1] hover:bg-[#11827E]'
                    : listening
                    ? 'bg-[#123B67] scale-105'
                    : 'bg-[#123B67] hover:bg-[#0B2542]'
                }`}
                aria-label={callStatusLabel}
                aria-pressed={listening}
              >
                {passwordStepActive ? (
                  <Lock className="w-8 h-8" />
                ) : paused ? (
                  <MicOff className="w-8 h-8" />
                ) : speaking ? (
                  <Volume2 className="w-8 h-8" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>

              {/* Real RMS Analyser Waveform Bars */}
              <div className="flex items-end gap-1.5 h-12 px-2" aria-hidden="true">
                {barFactors.map((factor, i) => {
                  const pct = passwordStepActive || paused
                    ? 16
                    : speaking
                    ? 38 + ((i * 23) % 45)
                    : listening
                    ? Math.max(18, Math.round(micLevel * 100 * factor))
                    : 18;
                  return (
                    <div
                      key={i}
                      style={{ height: `${Math.min(100, pct)}%` }}
                      className={`w-2 rounded-full transition-all duration-100 ${
                        speaking
                          ? 'bg-[#16A6A1]'
                          : listening
                          ? 'bg-[#123B67]'
                          : 'bg-slate-400'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="text-sm font-bold text-[#123B67] flex flex-wrap items-center justify-center gap-2">
              <span>{callStatusLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-slate-600">
                {micGranted === false
                  ? 'Manual fallback active'
                  : paused
                  ? 'Say or tap Resume'
                  : 'Speak naturally — pauses wait before submitting'}
              </span>
            </div>

            {!speechSupported && (
              <p className="text-xs font-semibold text-amber-950 bg-amber-100 px-3 py-1.5 rounded-md">
                Continuous Web Speech Recognition is unavailable in this browser — use the text input or quick replies below.
              </p>
            )}
            {micError && (
              <p className="text-xs font-semibold text-red-900 bg-red-100 px-3 py-1.5 rounded-md">
                {micError}
              </p>
            )}

            {/* Current Spoken Prompt */}
            <div
              className="w-full bg-white border border-[#123B67]/30 rounded-xl p-4 text-left space-y-1.5"
              aria-live="assertive"
            >
              <span className="text-xs font-bold tracking-wide text-[#16A6A1] block">
                {vCopy.ui.assistantPromptTitle}
              </span>
              <p className="text-lg sm:text-xl font-bold text-[#123B67] leading-snug">
                {assistantMessage || vCopy.welcomeGreeting}
              </p>
            </div>

            {/* Live Transcript Display (Never shown during password entry) */}
            {(transcript || interimTranscript) && !passwordStepActive && (
              <div
                className="w-full bg-slate-900 text-white rounded-xl p-4 text-left space-y-1"
                aria-live="polite"
              >
                <span className="text-xs font-bold tracking-wide text-teal-300 block">
                  {vCopy.ui.youSaidTitle}
                </span>
                <p className="text-lg sm:text-xl font-semibold">
                  &ldquo;{interimTranscript || transcript}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Demo Voice OTP / Reset OTP Verification Banner */}
          {((demoResetCode && step === 'FORGOT_OTP') || (demoLoginOtpCode && step === 'LOGIN_OTP')) && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-400 text-amber-950 space-y-1">
              <p className="text-xs font-bold flex items-center gap-1.5">
                <KeyRound className="w-4 h-4" />
                {step === 'LOGIN_OTP' ? 'Hands-Free Login OTP' : 'Password Reset Verification OTP'}
              </p>
              <p className="text-base font-mono font-bold tabular-nums">
                OTP Code:{' '}
                <span className="text-xl tracking-widest">
                  {step === 'LOGIN_OTP' ? demoLoginOtpCode : demoResetCode}
                </span>
              </p>
            </div>
          )}

          {/* Protected Masked Password Form (Voice & Speech Transcript Disabled) */}
          {passwordStepActive && (
            <form
              onSubmit={submitProtectedPassword}
              className="p-5 rounded-xl bg-slate-900 text-white border border-[#16A6A1] space-y-3"
            >
              <div className="flex items-center gap-2 text-teal-300">
                <Lock className="w-5 h-5 shrink-0" />
                <label htmlFor="voice-protected-password" className="text-sm sm:text-base font-bold">
                  {vCopy.ui.protectedPassLabel}
                </label>
              </div>
              <p className="text-xs text-slate-300">{vCopy.ui.protectedPassNotice}</p>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <input
                    ref={passwordInputRef}
                    id="voice-protected-password"
                    type={showProtectedPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={protectedPasswordInput}
                    onChange={(e) => setProtectedPasswordInput(e.target.value)}
                    placeholder={vCopy.ui.protectedPassPlaceholder}
                    autoComplete={step === 'LOGIN_PASSWORD' ? 'current-password' : 'new-password'}
                    className="w-full px-4 py-3.5 pr-12 rounded-xl bg-white text-slate-900 text-lg font-medium focus:outline-4 focus:outline-[#16A6A1]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowProtectedPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-slate-900"
                    aria-label={showProtectedPassword ? 'Hide password' : 'Show password'}
                  >
                    {showProtectedPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={processing || !protectedPasswordInput}
                  className="px-6 py-3.5 rounded-xl bg-[#16A6A1] hover:bg-[#11827E] text-white font-bold text-base whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  {vCopy.ui.submitPassBtn}
                </button>
              </div>
            </form>
          )}

          {/* Booking Confirmed Receipt */}
          {step === 'BOOKING_COMPLETE' && confirmedBooking && (
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-700 space-y-3">
              <div className="flex items-center gap-2 text-emerald-900">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <h3 className="font-display text-lg font-bold">
                  {vCopy.ui.bookingConfirmedTitle} — {confirmedBooking.booking_code}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-emerald-950">
                <p>
                  <strong>{vCopy.ui.statusLabel}:</strong> {confirmedBooking.status}
                </p>
                <p className="tabular-nums">
                  <strong>{vCopy.ui.fareLabel}:</strong> ₹{confirmedBooking.estimated_fare} ({confirmedBooking.payment_method})
                </p>
                <p>
                  <strong>{vCopy.ui.pickupLabel}:</strong> {confirmedBooking.pickup_location}
                </p>
                <p>
                  <strong>{vCopy.ui.destinationLabel}:</strong> {confirmedBooking.dropoff_location}
                </p>
                {confirmedBooking.assignment && (
                  <p>
                    <strong>{vCopy.ui.assignedHelperLabel}:</strong> {confirmedBooking.assignment.helper_name} (ETA{' '}
                    {confirmedBooking.assignment.eta_minutes} min)
                  </p>
                )}
                {confirmedBooking.otp?.otp_code && (
                  <p className="font-mono font-bold tabular-nums">
                    <strong>{vCopy.ui.handoverOtpLabel}:</strong> {confirmedBooking.otp.otp_code}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Accessible Manual Text Fallback (Disabled during Password Steps) */}
          {!passwordStepActive && (
            <form onSubmit={handleManualSubmit} className="space-y-1.5">
              <label htmlFor="voice-text-fallback" className="block text-sm font-bold text-[#123B67]">
                {vCopy.ui.textInputLabel}
              </label>
              <div className="flex gap-2">
                <input
                  id="voice-text-fallback"
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder={vCopy.ui.textInputPlaceholder}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:border-[#123B67] text-base text-slate-900 bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={processing || !manualInput.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl bg-[#123B67] hover:bg-[#0B2542] text-white font-semibold text-base whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{vCopy.ui.sendBtn}</span>
                </button>
              </div>
            </form>
          )}

          {/* Contextual Accessible Touch/Keyboard Shortcuts */}
          <div className="space-y-2">
            <p className="text-xs font-bold tracking-wide text-slate-600 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#16A6A1]" />
              {vCopy.ui.quickOptionsTitle}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {contextualQuickActions.map((cmd) => (
                <button
                  key={cmd.label}
                  type="button"
                  onClick={() => {
                    stopSpeakingNow();
                    stopListeningNow();
                    void processUtterance(cmd.phrase);
                  }}
                  className="text-left px-4 py-3 rounded-xl border border-[#123B67]/30 hover:border-[#123B67] hover:bg-[#EAF4FF] text-sm sm:text-base font-bold text-[#123B67] transition-colors flex items-center gap-2 min-h-[48px]"
                >
                  {cmd.kind === 'gps' && (
                    <LocateFixed className="w-4 h-4 text-[#16A6A1] shrink-0" />
                  )}
                  {cmd.kind === 'support' && (
                    <PhoneCall className="w-4 h-4 text-[#16A6A1] shrink-0" />
                  )}
                  <span>{cmd.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};
