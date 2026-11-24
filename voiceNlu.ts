import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

export type VoiceGlobalCommand =
  | 'NONE'
  | 'BOOK_HELPER'
  | 'TRACK_BOOKING'
  | 'BOOKING_HISTORY'
  | 'CHECK_BOOKING'
  | 'CANCEL_BOOKING'
  | 'CUSTOMER_SUPPORT'
  | 'REGISTER'
  | 'SIGN_IN'
  | 'VOICE_OTP_LOGIN'
  | 'LOGOUT'
  | 'FORGOT_PASSWORD'
  | 'GO_BACK'
  | 'REPEAT'
  | 'WHAT_OPTIONS'
  | 'CHANGE_LANGUAGE'
  | 'RETURN_HOME'
  | 'PAUSE'
  | 'RESUME'
  | 'END_CONVERSATION'
  | 'CHANGE_LOCATION'
  | 'CHANGE_DESTINATION'
  | 'CHANGE_DATE'
  | 'CHANGE_TIME'
  | 'CHANGE_ASSISTANCE'
  | 'CHANGE_PASSENGER_DETAILS'
  | 'HELP'
  | 'STOP_SPEAKING'
  | 'CONTINUE'
  | 'YES'
  | 'NO'
  | 'CANCEL_FLOW';

export type VoiceAssistanceCategory =
  | 'NONE'
  | 'VISUALLY_IMPAIRED'
  | 'LUGGAGE'
  | 'WHEELCHAIR'
  | 'MOBILITY'
  | 'SENIOR_CITIZEN'
  | 'OTHER'
  | 'COMPLETE';

export type VoiceEditTarget =
  | 'NONE'
  | 'PICKUP'
  | 'DESTINATION'
  | 'DATE'
  | 'TIME'
  | 'LUGGAGE'
  | 'ASSISTANCE'
  | 'PAYMENT'
  | 'NAME'
  | 'PHONE'
  | 'EMAIL'
  | 'PASSWORD'
  | 'AGE'
  | 'LANGUAGE';

export interface VoiceParseResult {
  detectedLanguage: 'en' | 'kn' | 'hi' | 'UNCLEAR';
  globalCommand: VoiceGlobalCommand;
  isCorrection: boolean;
  correctionValue: string;
  selectedLanguage: 'NONE' | 'en' | 'kn' | 'hi';
  useCurrentLocation: boolean;
  choiceIndex: number;
  extractedLocationQuery: string;
  needsLocationConfirmation?: boolean;
  extractedDateISO: string;
  extractedTime24: string;
  assistanceCategory: VoiceAssistanceCategory;
  accessibilityLabel: string;
  paymentMethod: 'NONE' | 'UPI' | 'CASH';
  fullName: string;
  mobileNumber: string;
  emailAddress: string;
  age: number;
  luggageCount: number;
  wantsMobilitySupport: 'UNKNOWN' | 'YES' | 'NO';
  editTarget: VoiceEditTarget;
  friendlyClarification: string;
  _meta?: { model: string; latencyMs: number; cached?: boolean };
}

const COMPACT_VOICE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    detectedLanguage: {
      type: Type.STRING,
      enum: ['en', 'kn', 'hi', 'UNCLEAR'],
    },
    globalCommand: {
      type: Type.STRING,
      enum: [
        'NONE',
        'BOOK_HELPER',
        'TRACK_BOOKING',
        'BOOKING_HISTORY',
        'CHECK_BOOKING',
        'CANCEL_BOOKING',
        'CUSTOMER_SUPPORT',
        'REGISTER',
        'SIGN_IN',
        'VOICE_OTP_LOGIN',
        'LOGOUT',
        'FORGOT_PASSWORD',
        'GO_BACK',
        'REPEAT',
        'WHAT_OPTIONS',
        'CHANGE_LANGUAGE',
        'RETURN_HOME',
        'PAUSE',
        'RESUME',
        'END_CONVERSATION',
        'CHANGE_LOCATION',
        'CHANGE_DESTINATION',
        'CHANGE_DATE',
        'CHANGE_TIME',
        'CHANGE_ASSISTANCE',
        'CHANGE_PASSENGER_DETAILS',
        'HELP',
        'STOP_SPEAKING',
        'CONTINUE',
        'YES',
        'NO',
        'CANCEL_FLOW',
      ],
    },
    isCorrection: { type: Type.BOOLEAN },
    correctionValue: { type: Type.STRING },
    selectedLanguage: { type: Type.STRING, enum: ['NONE', 'en', 'kn', 'hi'] },
    useCurrentLocation: { type: Type.BOOLEAN },
    choiceIndex: { type: Type.INTEGER },
    extractedLocationQuery: { type: Type.STRING },
    needsLocationConfirmation: { type: Type.BOOLEAN },
    extractedDateISO: { type: Type.STRING },
    extractedTime24: { type: Type.STRING },
    assistanceCategory: {
      type: Type.STRING,
      enum: [
        'NONE',
        'VISUALLY_IMPAIRED',
        'LUGGAGE',
        'WHEELCHAIR',
        'MOBILITY',
        'SENIOR_CITIZEN',
        'OTHER',
        'COMPLETE',
      ],
    },
    accessibilityLabel: { type: Type.STRING },
    paymentMethod: { type: Type.STRING, enum: ['NONE', 'UPI', 'CASH'] },
    fullName: { type: Type.STRING },
    mobileNumber: { type: Type.STRING },
    emailAddress: { type: Type.STRING },
    age: { type: Type.INTEGER },
    luggageCount: { type: Type.INTEGER },
    wantsMobilitySupport: { type: Type.STRING, enum: ['UNKNOWN', 'YES', 'NO'] },
    editTarget: {
      type: Type.STRING,
      enum: [
        'NONE',
        'PICKUP',
        'DESTINATION',
        'DATE',
        'TIME',
        'LUGGAGE',
        'ASSISTANCE',
        'PAYMENT',
        'NAME',
        'PHONE',
        'EMAIL',
        'PASSWORD',
        'AGE',
        'LANGUAGE',
      ],
    },
    friendlyClarification: { type: Type.STRING },
  },
  required: ['detectedLanguage', 'globalCommand'],
};

function normalizeParseResult(
  raw: Partial<VoiceParseResult>,
  fallbackLang: string
): VoiceParseResult {
  const validLang: 'en' | 'kn' | 'hi' | 'UNCLEAR' =
    raw.detectedLanguage === 'en' ||
    raw.detectedLanguage === 'kn' ||
    raw.detectedLanguage === 'hi' ||
    raw.detectedLanguage === 'UNCLEAR'
      ? raw.detectedLanguage
      : fallbackLang === 'kn' || fallbackLang === 'hi'
      ? fallbackLang
      : 'en';
  return {
    detectedLanguage: validLang,
    globalCommand: raw.globalCommand || 'NONE',
    isCorrection: Boolean(raw.isCorrection),
    correctionValue: raw.correctionValue || '',
    selectedLanguage: raw.selectedLanguage || 'NONE',
    useCurrentLocation: Boolean(raw.useCurrentLocation),
    choiceIndex: typeof raw.choiceIndex === 'number' ? raw.choiceIndex : 0,
    extractedLocationQuery: raw.extractedLocationQuery || '',
    needsLocationConfirmation: Boolean(raw.needsLocationConfirmation),
    extractedDateISO: raw.extractedDateISO || '',
    extractedTime24: raw.extractedTime24 || '',
    assistanceCategory: raw.assistanceCategory || 'NONE',
    accessibilityLabel: raw.accessibilityLabel || '',
    paymentMethod: raw.paymentMethod || 'NONE',
    fullName: raw.fullName || '',
    mobileNumber: raw.mobileNumber || '',
    emailAddress: raw.emailAddress || '',
    age: typeof raw.age === 'number' ? raw.age : 0,
    luggageCount: typeof raw.luggageCount === 'number' ? raw.luggageCount : -1,
    wantsMobilitySupport: raw.wantsMobilitySupport || 'UNKNOWN',
    editTarget: raw.editTarget || 'NONE',
    friendlyClarification: raw.friendlyClarification || '',
  };
}

let cachedAiClient: GoogleGenAI | null = null;
let cachedApiKey = '';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey.startsWith('MY_')) {
    return null;
  }
  if (cachedAiClient && cachedApiKey === apiKey) {
    return cachedAiClient;
  }
  cachedApiKey = apiKey;
  cachedAiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 1800,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  return cachedAiClient;
}

let geminiCooldownUntil = 0;

const NLU_CACHE_TTL_MS = 5 * 60 * 1000;
const nluCache = new Map<string, { expiresAt: number; result: VoiceParseResult }>();

function getCachedNlu(key: string): VoiceParseResult | null {
  const hit = nluCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    nluCache.delete(key);
    return null;
  }
  return hit.result;
}

function setCachedNlu(key: string, result: VoiceParseResult) {
  if (nluCache.size >= 500) {
    const oldest = nluCache.keys().next().value;
    if (oldest) nluCache.delete(oldest);
  }
  nluCache.set(key, { expiresAt: Date.now() + NLU_CACHE_TTL_MS, result });
}

const COMPACT_SYSTEM_INSTRUCTION = `You are PortoAssist's ultra-fast multilingual voice NLU supporting spoken/typed input in English ('en'), Kannada ('kn'), and Hindi ('hi') — including native scripts, Romanized Kanglish/Hinglish, mixed-language phrases, Indian English, and glued/noisy speech.
Return compact JSON with detectedLanguage, globalCommand, and ONLY relevant non-default fields.

Language Comprehension & STRICT ENGLISH-ONLY OUTPUT Rules (CRITICAL):
- Understand the passenger's meaning in English, Kannada, OR Hindi (e.g., "ನನಗೆ ಸಹಾಯಕ ಬೇಕು" -> BOOK_HELPER, "मुझे एयरपोर्ट जाना है" -> destination/place "airport").
- ALWAYS set detectedLanguage ('en' | 'kn' | 'hi' | 'UNCLEAR') strictly from the input Utterance for telemetry, OR 'UNCLEAR' if genuinely unintelligible/garbled.
- CRITICAL: EVERY text field you output (extractedLocationQuery, correctionValue, accessibilityLabel, friendlyClarification) MUST be written STRICTLY in clear, natural English ONLY. NEVER output Kannada script, Hindi Devanagari script, Kanglish, or Hinglish words in any output field!
  - Example: "ಬೆಂಗಳೂರು ವಿಮಾನ ನಿಲ್ದಾಣಕ್ಕೆ" -> extractedLocationQuery="Bengaluru Airport"
  - Example: "मुझे एयरपोर्ट जाना है" -> extractedLocationQuery="airport"
  - Example: "बेंगलुरु रेलवे स्टेशन" -> extractedLocationQuery="Bengaluru Railway Station"
  - Example: friendlyClarification MUST ALWAYS be natural English ONLY (e.g., "Sorry, I did not catch that. Could you please say it again?").
- NEVER ask the passenger which language they prefer or set globalCommand="CHANGE_LANGUAGE" unless explicitly asked.

Extraction Rules:
1. Commands at any step: BOOK_HELPER ("book helper", "ನನಗೆ ಸಹಾಯಕ ಬೇಕು", "ಹೆಲ್ಪರ್ ಬೇಕು", "मुझे हेल्पर बुक करना है", "मदद चाहिए"), TRACK_BOOKING, BOOKING_HISTORY, CANCEL_BOOKING, CUSTOMER_SUPPORT, REGISTER, SIGN_IN, GO_BACK, REPEAT, WHAT_OPTIONS, RETURN_HOME, PAUSE, STOP_SPEAKING, RESUME, END_CONVERSATION, HELP, FORGOT_PASSWORD, VOICE_OTP_LOGIN, YES (yes/yeah/ok/ಹೌದು/ಸರಿ/howdu/हाँ/हां/ठीक है), NO (no/nope/ಇಲ್ಲ/ಬೇಡ/illa/नहीं/nahi), CANCEL_FLOW.
2. Mid-flow corrections (mistake/wrong/change/update/actually/ಬದಲಾಯಿಸಿ/ತಪ್ಪಾಗಿದೆ/बदलना है/गलत + field): ALWAYS set isCorrection=true, globalCommand="NONE", editTarget=("PICKUP"|"DESTINATION"|"DATE"|"TIME"|"LUGGAGE"|"ASSISTANCE"|"PAYMENT"|"NAME"|"PHONE"|"EMAIL"|"AGE"|"LANGUAGE"), and put the English replacement in correctionValue AND typed field.
3. Places & glued speech:
   - Fix glued/phonetic speech ("IwanttogotoBengalururailwaystation" -> extractedLocationQuery="Bengaluru railway station").
   - Strip Kannada/Hindi postpositions and translate non-English place terms to English ("Airport ge hogbeku" -> "Airport"; "Majestic se" -> "Majestic"; "ಬೆಂಗಳೂರು ವಿಮಾನ ನಿಲ್ದಾಣಕ್ಕೆ" -> "Bengaluru Airport"; "मुझे एयरपोर्ट जाना है" -> "Airport").
   - BOOK_PICKUP GPS/current location ("current location", "ನನ್ನ ಪ್ರಸ್ತುತ ಸ್ಥಳ", "मेरा वर्तमान स्थान", "yahaan se", "illinda") -> useCurrentLocation=true.
4. Dates relative to currentLocalDate ("ಇಂದು"/"aaj"->today, "ನಾಳೆ"/"kal"->tomorrow) -> extractedDateISO (YYYY-MM-DD). Times -> extractedTime24 (HH:MM).
5. Phones/OTP (EN/KN/HI digit words) -> digits-only mobileNumber. Emails -> emailAddress. Options -> 1-based choiceIndex. Bags -> luggageCount (0 for none). Mobility -> wantsMobilitySupport + assistanceCategory. Payment -> paymentMethod.`;

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
  // Insert spaces on camelCase boundaries ("IwanttogotoBengaluru" -> "Iwanttogoto Bengaluru")
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

function detectServerLanguage(raw: string, fallbackLang: string): 'en' | 'kn' | 'hi' | 'UNCLEAR' {
  const clean = raw.trim();
  if (!clean) return 'UNCLEAR';

  const knChars = (clean.match(/[\u0C80-\u0CFF]/g) || []).length;
  const hiChars = (clean.match(/[\u0900-\u097F]/g) || []).length;
  if (knChars > 0 && knChars >= hiChars) return 'kn';
  if (hiChars > 0 && hiChars > knChars) return 'hi';

  const repaired = splitGluedEnglishSpeech(clean);
  const lower = repaired.toLowerCase();

  if (/^[\d\s:.-]+$/.test(clean) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) {
    return fallbackLang === 'kn' || fallbackLang === 'hi' ? fallbackLang : 'en';
  }
  if (/^(upi|cash|ok|okay|otp|1|2|3|4|5)$/i.test(lower)) {
    return fallbackLang === 'kn' || fallbackLang === 'hi' ? fallbackLang : 'en';
  }

  let knScore = 0;
  let hiScore = 0;
  let enScore = 0;

  const knMatches = lower.match(
    /\b(nanu|naanu|nanage|nanna|nimma|namma|hogbeku|hogabeku|hogona|maadbeku|madbeku|maadi|madi|beku|beda|banni|yelli|elli|ellige|yaavaga|yavaga|eshtu|estu|howdu|haudu|illa|sari|dayavittu|sahaaya|sahaya|indu|naale|naadiddu|nagadu|ondu|eradu|mooru|naalku|aidu|illinda|ge|inda|alli|annu|hesaru|vayassu)\b/g
  );
  if (knMatches) knScore += knMatches.length * 3;
  if (/\b[a-z]{3,}(ge|beku|inda)\b/.test(lower)) knScore += 2;

  const hiMatches = lower.match(
    /\b(mujhe|mujhko|mera|meri|mere|hum|humko|humara|aap|aapka|kahaan|kahan|kaha|jaana|jana|jaunga|jaungi|aana|chahiye|chaahiye|karna|karo|kardo|karne|hai|hain|hoon|hun|nahi|nahin|haan|haa|theek|thik|kripya|batao|bataiye|kitna|kitne|kab|kaise|aaj|kal|parso|samay|subah|shaam|raat|dopahar|nagad|paisa|madad|naam|umr|baje|se|mein|ko|ke|liye|ek|do|teen|chaar|paanch)\b/g
  );
  if (hiMatches) hiScore += hiMatches.length * 3;

  const enMatches = lower.match(
    /\b(i|want|to|go|would|like|need|book|helper|where|what|when|which|pickup|destination|drop|today|tomorrow|yes|yeah|no|nope|please|thanks|thank|confirm|cancel|change|update|repeat|back|sign|login|logout|register|track|history|support|morning|evening|wheelchair|mobility|luggage|bags|current|location|hello|hi|bye)\b/g
  );
  if (enMatches) enScore += enMatches.length * 2;

  if (knScore > hiScore && knScore >= enScore && knScore >= 2) return 'kn';
  if (hiScore > knScore && hiScore >= enScore && hiScore >= 2) return 'hi';
  if (enScore > knScore && enScore > hiScore && enScore >= 2) return 'en';

  // Non-alphabetic or gibberish short noises without real words
  if (/^[^a-zA-Z0-9\u0C80-\u0CFF\u0900-\u097F]+$/.test(clean) || (clean.length <= 2 && !/^\d+$/.test(clean))) {
    return 'UNCLEAR';
  }
  return fallbackLang === 'kn' || fallbackLang === 'hi' ? fallbackLang : 'en';
}

function translateCommonPlaceWordsToEnglish(raw: string): string {
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

function stripServerPlaceQuery(raw: string): string {
  let out = translateCommonPlaceWordsToEnglish(splitGluedEnglishSpeech(raw)).trim();
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

function buildDeterministicMultilingualNlu(params: {
  transcript: string;
  currentStep: string;
  language: string;
  currentLocalDate: string;
}): VoiceParseResult {
  const repaired = splitGluedEnglishSpeech(params.transcript);
  const lower = repaired.toLowerCase();
  const detectedLanguage = detectServerLanguage(params.transcript, params.language);
  const res = normalizeParseResult({ detectedLanguage }, params.language);

  if (detectedLanguage === 'UNCLEAR') {
    res.friendlyClarification = 'Sorry, that sounded unclear. Could you please say that again?';
    return res;
  }

  // Global commands
  if (/(book|helper|luggage|assistance|ಬುಕ್|ಸಹಾಯಕ|ಸಹಾಯ|ಹೆಲ್ಪರ್|हेल्पर|बुक|मदद)/.test(lower) && (params.currentStep === 'WELCOME_INTENT' || params.currentStep === 'AUTH_MAIN_MENU' || params.currentStep === 'BOOKING_COMPLETE')) {
    res.globalCommand = 'BOOK_HELPER';
    return res;
  }
  if (/(register|sign up|new account|ನೋಂದಣಿ|ನೋಂದಾಯಿಸಿ|रजिस्टर)/.test(lower) && params.currentStep === 'WELCOME_INTENT') {
    res.globalCommand = 'REGISTER';
    return res;
  }
  if (/(sign in|login|log in|ಸೈನ್ ಇನ್|ಲಾಗಿನ್|लॉगिन|साइन इन)/.test(lower) && params.currentStep === 'WELCOME_INTENT') {
    res.globalCommand = 'SIGN_IN';
    return res;
  }
  if (/(track|ಟ್ರ್ಯಾಕ್|ट्रैक)/.test(lower) && (params.currentStep === 'WELCOME_INTENT' || params.currentStep === 'AUTH_MAIN_MENU' || params.currentStep === 'BOOKING_COMPLETE')) {
    res.globalCommand = 'TRACK_BOOKING';
    return res;
  }
  if (/(history|ಇತಿಹಾಸ|इतिहास)/.test(lower) && (params.currentStep === 'WELCOME_INTENT' || params.currentStep === 'AUTH_MAIN_MENU' || params.currentStep === 'BOOKING_COMPLETE')) {
    res.globalCommand = 'BOOKING_HISTORY';
    return res;
  }

  // Yes / No
  if (/\b(yes|yeah|yep|ok|okay|sure|confirm|howdu|haudu|sari|haan|haa|theek hai)\b|ಹೌದು|ಸರಿ|हाँ|हां|ठीक/.test(lower)) {
    res.globalCommand = 'YES';
  } else if (/\b(no|nope|illa|beda|nahi|nahin)\b|ಇಲ್ಲ|ಬೇಡ|नहीं|नही/.test(lower)) {
    res.globalCommand = 'NO';
  }

  // Pickup / Destination extraction (including glued & mixed Kanglish/Hinglish!)
  if (params.currentStep === 'BOOK_PICKUP' || params.currentStep === 'BOOK_DESTINATION') {
    if (params.currentStep === 'BOOK_PICKUP' && /\b(current location|my location|gps|illinda|yahaan se|yahan se)\b|ನನ್ನ ಪ್ರಸ್ತುತ|मेरा वर्तमान/.test(lower)) {
      res.useCurrentLocation = true;
    } else {
      const q = stripServerPlaceQuery(repaired);
      if (q.length >= 2) {
        res.extractedLocationQuery = q;
      }
    }
  }

  // Dates & Times
  if (/\b(today|indu|aaj)\b|ಇಂದು|आज/.test(lower)) {
    res.extractedDateISO = params.currentLocalDate;
  } else if (/\b(tomorrow|naale|kal)\b|ನಾಳೆ|कल/.test(lower)) {
    const dt = new Date(`${params.currentLocalDate}T00:00:00`);
    if (!Number.isNaN(dt.getTime())) {
      dt.setDate(dt.getDate() + 1);
      res.extractedDateISO = dt.toISOString().slice(0, 10);
    }
  }

  if (/\b(upi|ಯುಪಿಐ|यूपीआई)\b/i.test(lower)) res.paymentMethod = 'UPI';
  else if (/\b(cash|nagad|ನಗದು|नकद)\b/i.test(lower)) res.paymentMethod = 'CASH';

  if (/(wheelchair|ವೀಲ್|व्हील)/.test(lower)) {
    res.assistanceCategory = 'WHEELCHAIR';
    res.wantsMobilitySupport = 'YES';
  }

  return res;
}

export async function parseVoiceUtteranceWithGemini(params: {
  transcript: string;
  currentStep: string;
  language: string;
  currentLocalDate: string;
  optionsList?: string[];
  conversationContext?: Record<string, unknown>;
}): Promise<VoiceParseResult> {
  const canCache = !params.optionsList || params.optionsList.length === 0;
  const cacheKey = `${params.currentStep}|${params.language}|${params.currentLocalDate}|${params.transcript
    .trim()
    .toLowerCase()}`;
  if (canCache) {
    const cached = getCachedNlu(cacheKey);
    if (cached) return { ...cached, _meta: { model: 'cache', latencyMs: 0, cached: true } };
  }

  const ai = getGeminiClient();
  if (!ai || Date.now() < geminiCooldownUntil) {
    const t0 = Date.now();
    const fallback = buildDeterministicMultilingualNlu(params);
    if (canCache) setCachedNlu(cacheKey, fallback);
    return { ...fallback, _meta: { model: 'fast-multilingual-fallback', latencyMs: Date.now() - t0 } };
  }

  const optionsLine =
    params.optionsList && params.optionsList.length > 0
      ? `Options:\n${params.optionsList.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n`
      : '';

  const ctx = params.conversationContext;
  const compactCtx = ctx
    ? Object.entries(ctx)
        .filter(([, v]) => v !== '' && v !== null && v !== undefined && v !== -1 && v !== 'NONE')
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(', ')
    : '';

  const prompt = `Step:${params.currentStep} Lang:${params.language} Date:${params.currentLocalDate}
${compactCtx ? `Ctx:${compactCtx}\n` : ''}${optionsLine}Utterance:"${params.transcript}"`;

  const modelsToTry: Array<{ model: string; thinkingLevel: ThinkingLevel }> = [
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW },
  ];

  for (const candidate of modelsToTry) {
    try {
      const startedAt = Date.now();
      const response = await Promise.race([
        ai.models.generateContent({
          model: candidate.model,
          contents: prompt,
          config: {
            systemInstruction: COMPACT_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: COMPACT_VOICE_SCHEMA,
            thinkingConfig: { thinkingLevel: candidate.thinkingLevel },
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), 1800)
        ),
      ]);

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('Empty response from Gemini NLU');
      }
      const latencyMs = Date.now() - startedAt;
      const parsed = normalizeParseResult(
        JSON.parse(rawText) as Partial<VoiceParseResult>,
        params.language
      );
      if (canCache) {
        setCachedNlu(cacheKey, parsed);
      }
      return { ...parsed, _meta: { model: candidate.model, latencyMs } };
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        geminiCooldownUntil = Date.now() + 60_000;
        break;
      }
      if (msg.includes('404') || msg.includes('NOT_FOUND') || msg.includes('400')) {
        continue;
      }
      if (msg.includes('GEMINI_TIMEOUT')) {
        break;
      }
    }
  }

  const t0 = Date.now();
  const fallback = buildDeterministicMultilingualNlu(params);
  if (canCache) {
    setCachedNlu(cacheKey, fallback);
  }
  return { ...fallback, _meta: { model: 'fast-multilingual-fallback', latencyMs: Date.now() - t0 } };
}
