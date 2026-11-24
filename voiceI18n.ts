import type { Language } from './types';

export interface VoiceCopy {
  langName: string;
  initialGreetingAndLanguage: string;
  askLanguageAgain: string;
  welcomeGreeting: string;
  askAlreadyRegistered: string;
  askAlreadyRegisteredForBooking: string;
  notUnderstood: string;
  oneMomentPlease: string;
  startRegIntro: string;
  regAskName: string;
  regNiceToMeetAskPhone: (name: string) => string;
  regAskPhone: string;
  regAskEmail: string;
  regAskPassword: string;
  regAskConfirmPassword: string;
  regAskAge: string;
  regAskPrefLang: string;
  regAskAccessibility: string;
  regInvalidPhone: (count: number) => string;
  regInvalidEmail: string;
  regPasswordShort: string;
  regPasswordMismatch: string;
  regInvalidAge: string;
  regAskChangeField: string;
  regDuplicateError: string;
  regSuccess: string;
  loginWelcomeBack: string;
  loginAskPasswordOrOtp: string;
  loginAskOtp: string;
  loginOtpInvalid: string;
  loginSuccess: string;
  loginFailed: string;
  forgotAskIdentifier: string;
  forgotAskOtp: string;
  forgotAskNewPassword: string;
  forgotSuccess: string;
  authMainMenu: string;
  authMenuInvalid: string;
  bookAskPickup: string;
  bookDetectingGps: string;
  bookGpsUnavailable: string;
  bookGpsDenied: string;
  bookGpsGeocodeFailed: string;
  bookPickupConfirm: (addr: string) => string;
  bookAskDestination: string;
  bookDestConfirm: (name: string, addr: string) => string;
  bookSameLocation: string;
  bookPlaceNotFound: (query: string) => string;
  bookMultipleFound: (count: number, kind: 'pickup' | 'destination', optionsText: string) => string;
  bookPickOptionRange: (max: number) => string;
  bookAskDate: string;
  bookInvalidDate: string;
  bookDateConfirm: (dateText: string) => string;
  bookAskTime: string;
  bookInvalidTime: string;
  bookTimeConfirm: (timeText: string) => string;
  bookAskBags: string;
  bookInvalidBags: string;
  bookAskMobility: string;
  bookAskPayment: string;
  bookInvalidPayment: string;
  bookAskChangeField: string;
  bookDiscarded: string;
  ackPickupAskDest: (place: string) => string;
  ackDestAskDate: (place: string) => string;
  ackDateAskTime: (dateText: string) => string;
  ackTimeAskBags: (timeText: string) => string;
  ackBagsAskMobility: (bags: number) => string;
  ackMobilityAskPayment: (label: string) => string;
  correctionConfirmPlace: (kind: 'pickup' | 'destination', name: string) => string;
  confirmYesNoPrompt: string;
  listeningStarted: string;
  listeningStopped: string;
  speakingStopped: string;
  silenceCheckIn: string;
  silenceAutoPaused: string;
  conversationPaused: string;
  conversationResumed: string;
  conversationEnded: string;
  micDeniedNotice: string;
  correctionPrefix: string;
  correctionAskPickup: string;
  correctionAskDest: string;
  correctionAskPhone: string;
  correctionAskEmail: string;
  correctionAskName: string;
  correctionAskAge: string;
  correctionAskDate: string;
  correctionAskTime: string;
  correctionAskBags: string;
  correctionAskMobility: string;
  correctionAskPayment: string;
  supportMessage: string;
  loggedOutMessage: string;
  clarifySpeechPrompt: string;
  noBookingsTrackPrompt: string;
  trackingSummarySpeech: (
    code: string,
    status: string,
    pickup: string,
    dropoff: string,
    helperName: string | null,
    helperLoc: string | null,
    etaMin: number | null,
    otpCode: string | null
  ) => string;
  trackingErrorPrompt: string;
  emptyHistoryPrompt: string;
  historyItemSummary: (
    idx: number,
    code: string,
    status: string,
    pickup: string,
    dropoff: string,
    fare: number
  ) => string;
  historySummarySpeech: (total: number, summaryText: string) => string;
  historyErrorPrompt: string;
  noActiveCancelPrompt: string;
  cancelConfirmPrompt: (code: string, dateText: string) => string;
  bookingCancelledSpeech: (code: string) => string;
  cancelErrorPrompt: string;
  bookingKeptSpeech: string;
  bookingConfirmedSpeech: (
    code: string,
    pickup: string,
    dropoff: string,
    fare: number,
    helperName: string | null,
    etaMin: number | null,
    otpSpoken: string | null
  ) => string;
  bookingSubmitFailed: (errMsg: string) => string;
  loginMethodPrompt: string;
  forgotOtpInvalidPrompt: string;
  otpRetryPrompt: (errMsg: string) => string;
  regErrorPrompt: (errMsg: string) => string;
  ui: {
    heading: string;
    repeatBtn: string;
    pauseBtn: string;
    resumeBtn: string;
    interruptBtn: string;
    changeLangBtn: string;
    endCallBtn: string;
    listeningLabel: string;
    hearingYouLabel: string;
    speakingLabel: string;
    processingLabel: string;
    pausedLabel: string;
    readyLabel: string;
    assistantPromptTitle: string;
    youSaidTitle: string;
    quickOptionsTitle: string;
    textInputLabel: string;
    textInputPlaceholder: string;
    sendBtn: string;
    protectedPassLabel: string;
    protectedPassPlaceholder: string;
    submitPassBtn: string;
    protectedPassNotice: string;
    bookingConfirmedTitle: string;
    statusLabel: string;
    fareLabel: string;
    pickupLabel: string;
    destinationLabel: string;
    assignedHelperLabel: string;
    handoverOtpLabel: string;
  };
}

const en: VoiceCopy = {
  langName: 'English',
  initialGreetingAndLanguage:
    'Hello! Welcome to PortoAssist. I am your personal voice assistant, and I am listening continuously so you can speak naturally just like a phone call. Which language would you prefer? English, Kannada, or Hindi?',
  askLanguageAgain: 'Please tell me which language you prefer: English, Kannada, or Hindi.',
  welcomeGreeting:
    'Hello! Welcome to PortoAssist. How can I help you today? You can say book a helper, register, sign in, or track a booking.',
  askAlreadyRegistered: 'Have you already registered with PortoAssist? Just say yes or no.',
  askAlreadyRegisteredForBooking:
    'Of course, I would be happy to help you book a helper! First, have you already registered with PortoAssist?',
  notUnderstood: 'Sorry, I did not quite catch that. Could you please say it again?',
  oneMomentPlease: 'One moment, please...',
  startRegIntro: 'No problem at all. I will help you register right away.',
  regAskName: 'What is your full name?',
  regNiceToMeetAskPhone: (name) =>
    `Nice to meet you, ${name}! Could you tell me your 10-digit mobile number?`,
  regAskPhone: 'Could you tell me your 10-digit mobile number?',
  regAskEmail: 'Got it. And what is your email address?',
  regAskPassword:
    'Now please create a password. For your privacy, passwords are never spoken aloud or recorded. Please type your password in the protected box on screen.',
  regAskConfirmPassword:
    'Please type your password one more time in the protected box to confirm it.',
  regAskAge: 'Great. May I know your age?',
  regAskPrefLang: 'Which language do you prefer for future journeys? English, Kannada, or Hindi?',
  regAskAccessibility:
    'Do you need any special assistance, such as visually impaired support, senior citizen care, wheelchair, or mobility help?',
  regInvalidPhone: (count) =>
    `I heard ${count} digits. Could you please share a valid 10-digit mobile number?`,
  regInvalidEmail:
    'That did not sound like a complete email address. Please say your email clearly, or type it in the box below.',
  regPasswordShort: 'Your password needs at least 6 characters. Please enter it securely on screen.',
  regPasswordMismatch:
    'Those passwords did not match. Please enter your confirmation password again, or say go back to change it.',
  regInvalidAge: 'Please tell me a valid age between 12 and 110.',
  regAskChangeField:
    'Which detail would you like to change? Name, mobile number, email, password, age, language, or special assistance?',
  regDuplicateError:
    'It looks like an account with that email or mobile number already exists. Would you like me to sign you in instead? Say yes or no.',
  regSuccess: 'Wonderful! Your PortoAssist passenger account is ready.',
  loginWelcomeBack:
    'Welcome back! Please tell me your registered mobile number or email address to sign in.',
  loginAskPasswordOrOtp:
    'Thank you! For security, passwords are never spoken. You can type your password in the protected box on screen, or simply say send OTP to sign in completely by voice.',
  loginAskOtp:
    'I have generated a 6-digit login OTP for your account and shown it on screen. Whenever you are ready, please speak those 6 digits.',
  loginOtpInvalid: 'That OTP code did not match. Please speak the 6-digit OTP code carefully.',
  loginSuccess: 'You are signed in! Welcome back to PortoAssist.',
  loginFailed:
    'Those login details did not match. Say try again, say send OTP for hands-free login, or say forgot password.',
  forgotAskIdentifier:
    'Of course. Please tell me your registered mobile number or email address so I can prepare a reset OTP.',
  forgotAskOtp:
    'I have generated your 6-digit verification OTP on screen. Please speak or enter those 6 digits.',
  forgotAskNewPassword: 'Your OTP is verified. Please enter your new password in the protected box on screen.',
  forgotSuccess:
    'Your password has been updated. Please enter your new password in the protected box, or say send OTP.',
  authMainMenu:
    'How can I help you now? You can say book a helper, track your booking, hear booking history, customer support, or log out.',
  authMenuInvalid:
    'Sorry, I did not catch that. You can say book a helper, track booking, booking history, customer support, or log out.',
  bookAskPickup:
    'Sure, let us book your helper! Where should the helper pick you up? You can name the station or place, or say use my current location.',
  bookDetectingGps: 'Checking your current GPS location using Google Maps right now...',
  bookGpsUnavailable:
    'GPS location is not available on this device. Could you please tell me your pickup location?',
  bookGpsDenied:
    'I could not access location permission. Please tell me your pickup address or station name.',
  bookGpsGeocodeFailed:
    'I found your coordinates, though I could not read the street name. Please tell me your pickup location.',
  bookPickupConfirm: (addr) =>
    `I have your pickup location as ${addr}. Should we use this location?`,
  bookAskDestination: 'Great! Where would you like to go?',
  bookDestConfirm: (name, addr) =>
    `I found ${name}, ${addr}. Is that your destination?`,
  bookSameLocation:
    'Your destination matches your pickup location. Could you tell me a different destination?',
  bookPlaceNotFound: (query) =>
    `I could not find ${query} on Google Maps. Could you say the station, airport, or street name a bit more clearly?`,
  bookMultipleFound: (count, kind, optionsText) =>
    `I found ${count} ${kind === 'pickup' ? 'pickup' : 'destination'} matches. ${optionsText} Which option would you like: 1, 2, or 3?`,
  bookPickOptionRange: (max) =>
    `Please choose an option from 1 to ${max}, or say search again.`,
  bookAskDate: 'What date are you travelling? You can say today, tomorrow, or a specific date.',
  bookInvalidDate:
    'Please share a valid upcoming date, like today, tomorrow, or 25 November.',
  bookDateConfirm: (dateText) =>
    `Got it — ${dateText}. Is that travel date right?`,
  bookAskTime: 'What time do you need the helper to meet you?',
  bookInvalidTime:
    'Could you share a clear time, such as 10 AM, 4:30 PM, or 6 in the evening?',
  bookTimeConfirm: (timeText) =>
    `Okay, ${timeText}. Shall we lock in that time?`,
  bookAskBags: 'How many luggage bags will you be carrying?',
  bookInvalidBags: 'Please tell me a number of bags between 0 and 15.',
  bookAskMobility:
    'Will you need wheelchair support or mobility escort assistance? Just say yes, no, or wheelchair.',
  bookAskPayment: 'How would you prefer to pay — UPI or cash?',
  bookInvalidPayment: 'Please say UPI or cash for your payment method.',
  bookAskChangeField:
    'Which part would you like to update — pickup, destination, date, time, bags, assistance, or payment?',
  bookDiscarded: 'No problem, I have cleared that booking draft.',
  ackPickupAskDest: (place) => `Okay, ${place}. Where would you like to go?`,
  ackDestAskDate: (place) =>
    `Got it, ${place}! What date are you travelling? Say today, tomorrow, or a date.`,
  ackDateAskTime: (dateText) =>
    `Okay, ${dateText}. What time would you like assistance?`,
  ackTimeAskBags: (timeText) =>
    `Got it, ${timeText}. How many luggage bags will you be carrying?`,
  ackBagsAskMobility: (bags) =>
    `Okay, ${bags} ${bags === 1 ? 'bag' : 'bags'}. Will you need wheelchair support or mobility escort assistance?`,
  ackMobilityAskPayment: (label) =>
    `Got it, ${label}. Would you like to pay via UPI or cash?`,
  correctionConfirmPlace: (kind, name) =>
    `No problem! I'll change your ${kind} to ${name}. Is that correct?`,
  confirmYesNoPrompt: 'Just say yes to confirm, or tell me what you would like to change.',
  listeningStarted: 'Continuous listening active',
  listeningStopped: 'Microphone paused',
  speakingStopped: 'Audio paused. Speak anytime or say resume when ready.',
  silenceCheckIn: 'Are you still there? Would you like me to repeat the question?',
  silenceAutoPaused: 'I will pause listening for now. Tap Resume or press Space whenever you are ready.',
  conversationPaused: 'Voice conversation paused. Tap Resume or press Space whenever you want to continue.',
  conversationResumed: 'I am back with you.',
  conversationEnded: 'Thank you for calling PortoAssist. Have a safe journey. Goodbye!',
  micDeniedNotice:
    'Microphone permission is blocked or unavailable. Please allow microphone access in your browser, or use the text box and accessible shortcuts below.',
  correctionPrefix: 'No problem, I will update that right away.',
  correctionAskPickup: 'Sure — what should your new pickup location be?',
  correctionAskDest: 'Of course — what is your correct destination?',
  correctionAskPhone: 'Sure — what is your correct 10-digit mobile number?',
  correctionAskEmail: 'Okay — what is your correct email address?',
  correctionAskName: 'Sure — what name should I use instead?',
  correctionAskAge: 'Okay — what is your age?',
  correctionAskDate: 'Sure — what travel date would you prefer?',
  correctionAskTime: 'Got it — what is your new travel time?',
  correctionAskBags: 'Okay — how many luggage bags should I put down?',
  correctionAskMobility: 'Sure — do you want wheelchair or mobility assistance?',
  correctionAskPayment: 'Got it — would you prefer UPI or cash?',
  supportMessage:
    'Our 24 by 7 accessible support desk is available at 0 8 0, 4 4 1 1, 2 2 0 0. Would you like to book a helper or track a booking?',
  loggedOutMessage: 'You have been signed out safely.',
  clarifySpeechPrompt: 'Sorry, that sounded a bit unclear. Could you please repeat what you need?',
  noBookingsTrackPrompt: 'You do not have any bookings yet. Would you like to book a helper now?',
  trackingSummarySpeech: (code, status, pickup, dropoff, helperName, helperLoc, etaMin, otpCode) => {
    const helperPart = helperName
      ? `Your helper ${helperName} is at ${helperLoc}, ETA ${etaMin} minutes. `
      : 'Matching nearest available helper now. ';
    const otpPart = otpCode ? `Handover OTP is ${otpCode}. ` : '';
    return `Tracking booking ${code}. Status is ${status}. Pickup: ${pickup}. Destination: ${dropoff}. ${helperPart}${otpPart}Would you like to book another helper, hear booking history, or cancel a booking?`;
  },
  trackingErrorPrompt: 'Could not fetch live tracking details right now. Please try again.',
  emptyHistoryPrompt: 'Your booking history is empty. Say book a helper whenever you are ready.',
  historyItemSummary: (idx, code, status, pickup, dropoff, fare) =>
    `Booking ${idx}: ${code}, status ${status}, from ${pickup} to ${dropoff}, fare ${fare} rupees.`,
  historySummarySpeech: (total, summaryText) =>
    `You have ${total} bookings. ${summaryText} Would you like to book a helper, track your booking, or log out?`,
  historyErrorPrompt: 'Could not retrieve booking history right now.',
  noActiveCancelPrompt: 'You have no active bookings to cancel. Say book a helper anytime.',
  cancelConfirmPrompt: (code, dateText) =>
    `Do you want to cancel booking ${code} for ${dateText}? Say yes to cancel or no to keep it.`,
  bookingCancelledSpeech: (code) => `Booking ${code} has been cancelled.`,
  cancelErrorPrompt: 'Could not cancel that booking right now.',
  bookingKeptSpeech: 'Your booking remains active.',
  bookingConfirmedSpeech: (code, pickup, dropoff, fare, helperName, etaMin, otpSpoken) => {
    const helperPart = helperName
      ? `Your helper ${helperName} has been assigned and should arrive in about ${etaMin} minutes. `
      : 'We are matching the nearest verified helper for you now. ';
    const otpPart = otpSpoken ? `Your handover OTP is ${otpSpoken}. ` : '';
    return `Your booking is confirmed! Booking ID is ${code}, from ${pickup} to ${dropoff}. ${helperPart}Estimated fare is ${fare} rupees. ${otpPart}You can say track booking, booking history, book another helper, or goodbye.`;
  },
  bookingSubmitFailed: (errMsg) =>
    `Could not submit your booking: ${errMsg}. Please say yes to try again, or no to edit details.`,
  loginMethodPrompt:
    'Please say OTP to sign in hands-free by voice, or say Password to enter your password on screen.',
  forgotOtpInvalidPrompt: 'Please speak or enter the 6-digit OTP verification code.',
  otpRetryPrompt: (errMsg) => `${errMsg} Please speak your 6-digit OTP again.`,
  regErrorPrompt: (errMsg) =>
    `Registration could not be completed: ${errMsg}. Say yes to try again or no to edit your details.`,
  ui: {
    heading: 'PortoAssist Voice Call',
    repeatBtn: 'Repeat',
    pauseBtn: 'Pause Mic',
    resumeBtn: 'Resume Call',
    interruptBtn: 'Interrupt & Speak',
    changeLangBtn: 'Language',
    endCallBtn: 'End Call',
    listeningLabel: 'Hands-Free · Listening...',
    hearingYouLabel: 'Hearing You — Keep Speaking...',
    speakingLabel: 'Speaking (Speak Anytime to Interrupt)',
    processingLabel: 'Understanding & Checking...',
    pausedLabel: 'Conversation Paused',
    readyLabel: 'Call Standby',
    assistantPromptTitle: 'Assistant',
    youSaidTitle: 'You Said',
    quickOptionsTitle: 'Accessible Quick Replies',
    textInputLabel: 'Type a Message (Optional Fallback)',
    textInputPlaceholder: 'Type anytime if you cannot speak right now...',
    sendBtn: 'Send',
    protectedPassLabel: 'Protected Password Entry (Never Spoken or Recorded)',
    protectedPassPlaceholder: 'Enter password securely',
    submitPassBtn: 'Submit Password',
    protectedPassNotice: 'Voice listening is muted here so passwords are never captured in audio or transcripts.',
    bookingConfirmedTitle: 'Booking Confirmed',
    statusLabel: 'Status',
    fareLabel: 'Estimated Fare',
    pickupLabel: 'Pickup',
    destinationLabel: 'Destination',
    assignedHelperLabel: 'Assigned Helper',
    handoverOtpLabel: 'Handover OTP',
  },
};

const kn: VoiceCopy = {
  langName: 'ಕನ್ನಡ',
  initialGreetingAndLanguage:
    'ನಮಸ್ಕಾರ! ಪೋರ್ಟೊಅಸಿಸ್ಟ್‌ಗೆ ಸ್ವಾಗತ. ನಾನು ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಧ್ವನಿ ಸಹಾಯಕ. ನೀವು ಫೋನ್ ಕರೆಯಂತೆ ನಿರಂತರವಾಗಿ ಮಾತನಾಡಬಹುದು. ನೀವು ಯಾವ ಭಾಷೆಯನ್ನು ಇಷ್ಟಪಡುತ್ತೀರಿ — ಇಂಗ್ಲಿಷ್, ಕನ್ನಡ ಅಥವಾ ಹಿಂದಿ?',
  askLanguageAgain: 'ದಯವಿಟ್ಟು ಇಂಗ್ಲಿಷ್, ಕನ್ನಡ ಅಥವಾ ಹಿಂದಿ ಭಾಷೆಯನ್ನು ಹೇಳಿ.',
  welcomeGreeting:
    'ನಮಸ್ಕಾರ! ಪೋರ್ಟೊಅಸಿಸ್ಟ್‌ಗೆ ಸ್ವಾಗತ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ? ಸಹಾಯಕರನ್ನು ಬುಕ್ ಮಾಡಿ, ನೋಂದಾಯಿಸಿ, ಸೈನ್ ಇನ್ ಮಾಡಿ ಅಥವಾ ಬುಕಿಂಗ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ ಎಂದು ಹೇಳಬಹುದು.',
  askAlreadyRegistered: 'ನೀವು ಈಗಾಗಲೇ ಪೋರ್ಟೊಅಸಿಸ್ಟ್‌ನಲ್ಲಿ ನೋಂದಾಯಿಸಿದ್ದೀರಾ? ಹೌದು ಅಥವಾ ಇಲ್ಲ ಎಂದು ಹೇಳಿ.',
  askAlreadyRegisteredForBooking:
    'ಖಂಡಿತ, ಸಹಾಯಕರನ್ನು ಬುಕ್ ಮಾಡಲು ನಾನು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ! ಮೊದಲು, ನೀವು ಈಗಾಗಲೇ ನೋಂದಾಯಿಸಿದ್ದೀರಾ?',
  notUnderstood: 'ಕ್ಷಮಿಸಿ, ನನಗೆ ಅದು ಸರಿಯಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳಿ.',
  oneMomentPlease: 'ದಯವಿಟ್ಟು ಒಂದು ಕ್ಷಣ ನಿರೀಕ್ಷಿಸಿ...',
  startRegIntro: 'ಪರವಾಗಿಲ್ಲ, ಈಗಲೇ ನಿಮ್ಮ ಖಾತೆಯನ್ನು ರಚಿಸೋಣ.',
  regAskName: 'ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರೇನು?',
  regNiceToMeetAskPhone: (name) =>
    `ನಿಮ್ಮನ್ನು ಭೇಟಿಯಾಗಿ ಸಂತೋಷವಾಯಿತು, ${name}! ನಿಮ್ಮ 10-ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳುತ್ತೀರಾ?`,
  regAskPhone: 'ನಿಮ್ಮ 10-ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳಿ.',
  regAskEmail: 'ಸರಿ. ನಿಮ್ಮ ಇಮೇಲ್ ವಿಳಾಸವೇನು?',
  regAskPassword:
    'ಈಗ ದಯವಿಟ್ಟು ಪಾಸ್‌ವರ್ಡ್ ರಚಿಸಿ. ಗೌಪ್ಯತೆಗಾಗಿ ಪಾಸ್‌ವರ್ಡ್‌ಗಳನ್ನು ಎಂದಿಗೂ ಓದಲಾಗುವುದಿಲ್ಲ. ದಯವಿಟ್ಟು ಪರದೆಯ ಮೇಲಿನ ಸುರಕ್ಷಿತ ಬಾಕ್ಸ್‌ನಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ.',
  regAskConfirmPassword: 'ದೃಢೀಕರಿಸಲು ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ಅನ್ನು ಮತ್ತೊಮ್ಮೆ ಟೈಪ್ ಮಾಡಿ.',
  regAskAge: 'ನಿಮ್ಮ ವಯಸ್ಸು ಎಷ್ಟು?',
  regAskPrefLang: 'ಮುಂದಿನ ಪ್ರಯಾಣಗಳಿಗೆ ನೀವು ಯಾವ ಭಾಷೆಯನ್ನು ಇಷ್ಟಪಡುತ್ತೀರಿ? ಇಂಗ್ಲಿಷ್, ಕನ್ನಡ ಅಥವಾ ಹಿಂದಿ?',
  regAskAccessibility:
    'ನಿಮಗೆ ದೃಷ್ಟಿಹೀನರ ಸಹಾಯ, ಹಿರಿಯ ನಾಗರಿಕರ ಆರೈಕೆ, ವೀಲ್‌ಚೇರ್ ಅಥವಾ ಚಲನಶೀಲತೆ ಸಹಾಯ ಬೇಕೇ?',
  regInvalidPhone: (count) =>
    `ನನಗೆ ${count} ಅಂಕೆಗಳು ಕೇಳಿಸಿದವು. ದಯವಿಟ್ಟು 10-ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳಿ.`,
  regInvalidEmail: 'ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ಇಮೇಲ್ ವಿಳಾಸವನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಹೇಳಿ ಅಥವಾ ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ.',
  regPasswordShort: 'ಪಾಸ್‌ವರ್ಡ್ ಕನಿಷ್ಠ 6 ಅಕ್ಷರಗಳನ್ನು ಹೊಂದಿರಬೇಕು. ದಯವಿಟ್ಟು ಮತ್ತೆ ನಮೂದಿಸಿ.',
  regPasswordMismatch: 'ಪಾಸ್‌ವರ್ಡ್‌ಗಳು ಹೊಂದಿಕೆಯಾಗುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ನಮೂದಿಸಿ.',
  regInvalidAge: 'ದಯವಿಟ್ಟು 12 ರಿಂದ 110 ರ ನಡುವಿನ ವಯಸ್ಸನ್ನು ಹೇಳಿ.',
  regAskChangeField:
    'ಯಾವ ವಿವರವನ್ನು ಬದಲಾಯಿಸಬೇಕು? ಹೆಸರು, ಮೊಬೈಲ್ ಸಂಖ್ಯೆ, ಇಮೇಲ್, ಪಾಸ್‌ವರ್ಡ್, ವಯಸ್ಸು, ಭಾಷೆ ಅಥವಾ ವಿಶೇಷ ಸಹಾಯ?',
  regDuplicateError:
    'ಈ ಇಮೇಲ್ ಅಥವಾ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯ ಖಾತೆ ಈಗಾಗಲೇ ಇದೆ. ನಾನು ನಿಮ್ಮನ್ನು ಸೈನ್ ಇನ್ ಮಾಡಲೇ? ಹೌದು ಅಥವಾ ಇಲ್ಲ ಎಂದು ಹೇಳಿ.',
  regSuccess: 'ಅದ್ಭುತ! ನಿಮ್ಮ ಪೋರ್ಟೊಅಸಿಸ್ಟ್ ಪ್ರಯಾಣಿಕ ಖಾತೆ ಸಿದ್ಧವಾಗಿದೆ.',
  loginWelcomeBack:
    'ಮತ್ತೆ ಸ್ವಾಗತ! ಸೈನ್ ಇನ್ ಮಾಡಲು ನಿಮ್ಮ ನೋಂದಾಯಿತ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಅಥವಾ ಇಮೇಲ್ ಹೇಳಿ.',
  loginAskPasswordOrOtp:
    'ಧನ್ಯವಾದಗಳು! ಸುರಕ್ಷತೆಗಾಗಿ ಪಾಸ್‌ವರ್ಡ್‌ಗಳನ್ನು ಜೋರಾಗಿ ಹೇಳಲಾಗುವುದಿಲ್ಲ. ಪರದೆಯ ಮೇಲೆ ಪಾಸ್‌ವರ್ಡ್ ಟೈಪ್ ಮಾಡಿ, ಅಥವಾ ಧ್ವನಿಯ ಮೂಲಕವೇ ಸೈನ್ ಇನ್ ಮಾಡಲು Send OTP ಎಂದು ಹೇಳಿ.',
  loginAskOtp:
    'ನಿಮ್ಮ ಖಾತೆಗೆ 6-ಅಂಕಿಯ ಲಾಗಿನ್ ಒಟಿಪಿ ರಚಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಆ 6 ಅಂಕೆಗಳನ್ನು ಹೇಳಿ.',
  loginOtpInvalid: 'ಆ ಒಟಿಪಿ ಕೋಡ್ ಹೊಂದಿಕೆಯಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು 6-ಅಂಕಿಯ ಒಟಿಪಿ ಮತ್ತೆ ಹೇಳಿ.',
  loginSuccess: 'ನೀವು ಯಶಸ್ವಿಯಾಗಿ ಸೈನ್ ಇನ್ ಆಗಿದ್ದೀರಿ!',
  loginFailed:
    'ಲಾಗಿನ್ ವಿವರಗಳು ತಪ್ಪಾಗಿವೆ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ Send OTP ಎಂದು ಹೇಳಿ.',
  forgotAskIdentifier: 'ಖಂಡಿತ. ಒಟಿಪಿ ಪಡೆಯಲು ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಅಥವಾ ಇಮೇಲ್ ಹೇಳಿ.',
  forgotAskOtp: '6-ಅಂಕಿಯ ಒಟಿಪಿ ಪರದೆಯ ಮೇಲೆ ತೋರಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಆ 6 ಅಂಕೆಗಳನ್ನು ಹೇಳಿ.',
  forgotAskNewPassword: 'ಒಟಿಪಿ ಪರಿಶೀಲಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಸುರಕ್ಷಿತ ಬಾಕ್ಸ್‌ನಲ್ಲಿ ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ.',
  forgotSuccess: 'ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ನವೀಕರಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ ಅಥವಾ Send OTP ಹೇಳಿ.',
  authMainMenu:
    'ಈಗ ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ? ಸಹಾಯಕರನ್ನು ಬುಕ್ ಮಾಡಿ, ಬುಕಿಂಗ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ, ಬುಕಿಂಗ್ ಇತಿಹಾಸ, ಸಹಾಯ ಕೇಂದ್ರ, ಅಥವಾ ಲಾಗ್ ಔಟ್ ಎಂದು ಹೇಳಿ.',
  authMenuInvalid:
    'ಕ್ಷಮಿಸಿ, ಅರ್ಥವಾಗಲಿಲ್ಲ. ಬುಕ್ ಮಾಡಿ, ಟ್ರ್ಯಾಕ್ ಮಾಡಿ, ಇತಿಹಾಸ, ಬೆಂಬಲ ಅಥವಾ ಲಾಗ್ ಔಟ್ ಎಂದು ಹೇಳಿ.',
  bookAskPickup:
    'ಸರಿ, ಬುಕಿಂಗ್ ಪ್ರಾರಂಭಿಸೋಣ! ಸಹಾಯಕರು ನಿಮ್ಮನ್ನು ಎಲ್ಲಿಂದ ಪಿಕಪ್ ಮಾಡಬೇಕು? ಸ್ಥಳದ ಹೆಸರು ಹೇಳಿ ಅಥವಾ ನನ್ನ ಪ್ರಸ್ತುತ ಸ್ಥಳವನ್ನು ಬಳಸಿ ಎಂದು ಹೇಳಿ.',
  bookDetectingGps: 'Google Maps ಮೂಲಕ ನಿಮ್ಮ ಪ್ರಸ್ತುತ GPS ಸ್ಥಳವನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ...',
  bookGpsUnavailable: 'GPS ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪಿಕಪ್ ಸ್ಥಳವನ್ನು ಹೇಳಿ.',
  bookGpsDenied: 'ಸ್ಥಳ ಅನುಮತಿ ಸಿಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪಿಕಪ್ ಸ್ಥಳವನ್ನು ಹೇಳಿ.',
  bookGpsGeocodeFailed: 'ವಿಳಾಸ ಓದಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪಿಕಪ್ ಸ್ಥಳವನ್ನು ಹೇಳಿ.',
  bookPickupConfirm: (addr) => `ನಿಮ್ಮ ಪಿಕಪ್ ಸ್ಥಳ ${addr}. ಇದನ್ನು ಬಳಸೋಣವೇ?`,
  bookAskDestination: 'ಚೆನ್ನಾಗಿದೆ! ನೀವು ಎಲ್ಲಿಗೆ ಹೋಗಲು ಬಯಸುತ್ತೀರಿ?',
  bookDestConfirm: (name, addr) => `${name}, ${addr} ಕಂಡುಬಂದಿದೆ. ಇದೇ ನಿಮ್ಮ ಗಮ್ಯಸ್ಥಾನವೇ?`,
  bookSameLocation: 'ಗಮ್ಯಸ್ಥಾನ ಮತ್ತು ಪಿಕಪ್ ಸ್ಥಳ ಒಂದೇ ಆಗಿವೆ. ದಯವಿಟ್ಟು ಬೇರೆ ಗಮ್ಯಸ್ಥಾನವನ್ನು ಹೇಳಿ.',
  bookPlaceNotFound: (query) =>
    `${query} ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು ನಿಲ್ದಾಣ ಅಥವಾ ವಿಳಾಸವನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಹೇಳಿ.`,
  bookMultipleFound: (count, _kind, optionsText) =>
    `${count} ಸ್ಥಳಗಳು ಕಂಡುಬಂದಿವೆ. ${optionsText} ಯಾವ ಆಯ್ಕೆ ಬೇಕು — 1, 2 ಅಥವಾ 3?`,
  bookPickOptionRange: (max) => `ದಯವಿಟ್ಟು 1 ರಿಂದ ${max} ರೊಳಗಿನ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳಿ.`,
  bookAskDate: 'ನೀವು ಯಾವ ದಿನಾಂಕದಂದು ಪ್ರಯಾಣಿಸುತ್ತಿದ್ದೀರಿ? ಇಂದು, ನಾಳೆ ಅಥವಾ ದಿನಾಂಕ ಹೇಳಿ.',
  bookInvalidDate: 'ದಯವಿಟ್ಟು ಇಂದು, ನಾಳೆ ಅಥವಾ ಸರಿಯಾದ ದಿನಾಂಕವನ್ನು ಹೇಳಿ.',
  bookDateConfirm: (dateText) => `${dateText} ಎಂದು ನಮೂದಿಸಿದ್ದೇನೆ. ಈ ದಿನಾಂಕ ಸರಿಯಾಗಿದೆಯೇ?`,
  bookAskTime: 'ಸಹಾಯಕರು ನಿಮಗೆ ಎಷ್ಟು ಗಂಟೆಗೆ ಬರಬೇಕು?',
  bookInvalidTime: 'ದಯವಿಟ್ಟು ಸ್ಪಷ್ಟವಾದ ಸಮಯವನ್ನು ಹೇಳಿ, ಉದಾಹರಣೆಗೆ ಬೆಳಿಗ್ಗೆ 10 ಅಥವಾ ಸಂಜೆ 6 ಗಂಟೆ.',
  bookTimeConfirm: (timeText) => `ಸರಿ, ${timeText}. ಈ ಸಮಯವನ್ನು ಖಚಿತಪಡಿಸಲೇ?`,
  bookAskBags: 'ನಿಮ್ಮ ಬಳಿ ಎಷ್ಟು ಲಗೇಜ್ ಬ್ಯಾಗ್‌ಗಳಿವೆ?',
  bookInvalidBags: 'ದಯವಿಟ್ಟು 0 ರಿಂದ 15 ರೊಳಗಿನ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳಿ.',
  bookAskMobility: 'ನಿಮಗೆ ವೀಲ್‌ಚೇರ್ ಅಥವಾ ಚಲನಶೀಲತೆ ಸಹಾಯ ಬೇಕೇ? ಹೌದು, ಇಲ್ಲ ಅಥವಾ ವೀಲ್‌ಚೇರ್ ಎಂದು ಹೇಳಿ.',
  bookAskPayment: 'ನೀವು UPI ಅಥವಾ ನಗದು ಮೂಲಕ ಪಾವತಿಸಲು ಬಯಸುತ್ತೀರಾ?',
  bookInvalidPayment: 'ದಯವಿಟ್ಟು UPI ಅಥವಾ ನಗದು ಎಂದು ಹೇಳಿ.',
  bookAskChangeField:
    'ಯಾವ ವಿವರವನ್ನು ಬದಲಾಯಿಸಬೇಕು — ಪಿಕಪ್, ಗಮ್ಯಸ್ಥಾನ, ದಿನಾಂಕ, ಸಮಯ, ಬ್ಯಾಗ್‌ಗಳು, ಸಹಾಯ ಅಥವಾ ಪಾವತಿ?',
  bookDiscarded: 'ಪರವಾಗಿಲ್ಲ, ಆ ಬುಕಿಂಗ್ ರದ್ದುಗೊಳಿಸಿದ್ದೇನೆ.',
  ackPickupAskDest: (place) => `ಸರಿ, ${place}. ನೀವು ಎಲ್ಲಿಗೆ ಹೋಗಲು ಬಯಸುತ್ತೀರಿ?`,
  ackDestAskDate: (place) =>
    `ಸರಿ, ${place}! ನೀವು ಯಾವ ದಿನಾಂಕದಂದು ಪ್ರಯಾಣಿಸುತ್ತಿದ್ದೀರಿ? ಇಂದು, ನಾಳೆ ಅಥವಾ ದಿನಾಂಕ ಹೇಳಿ.`,
  ackDateAskTime: (dateText) =>
    `ಸರಿ, ${dateText}. ಸಹಾಯಕರು ನಿಮಗೆ ಎಷ್ಟು ಗಂಟೆಗೆ ಬರಬೇಕು?`,
  ackTimeAskBags: (timeText) =>
    `ಸರಿ, ${timeText}. ನಿಮ್ಮ ಬಳಿ ಎಷ್ಟು ಲಗೇಜ್ ಬ್ಯಾಗ್‌ಗಳಿವೆ?`,
  ackBagsAskMobility: (bags) =>
    `ಸರಿ, ${bags} ಬ್ಯಾಗ್‌ಗಳು. ನಿಮಗೆ ವೀಲ್‌ಚೇರ್ ಅಥವಾ ಚಲನಶೀಲತೆ ಸಹಾಯ ಬೇಕೇ?`,
  ackMobilityAskPayment: (label) =>
    `ಸರಿ, ${label}. ನೀವು UPI ಅಥವಾ ನಗದು ಮೂಲಕ ಪಾವತಿಸಲು ಬಯಸುತ್ತೀರಾ?`,
  correctionConfirmPlace: (kind, name) =>
    `ಪರವಾಗಿಲ್ಲ! ನಿಮ್ಮ ${kind === 'pickup' ? 'ಪಿಕಪ್ ಸ್ಥಳವನ್ನು' : 'ಗಮ್ಯಸ್ಥಾನವನ್ನು'} ${name} ಗೆ ಬದಲಾಯಿಸುತ್ತೇನೆ. ಇದು ಸರಿಯಾಗಿದೆಯೇ?`,
  confirmYesNoPrompt: 'ದೃಢೀಕರಿಸಲು ಹೌದು ಎಂದು ಹೇಳಿ, ಅಥವಾ ಏನು ಬದಲಾಯಿಸಬೇಕೆಂದು ತಿಳಿಸಿ.',
  listeningStarted: 'ನಿರಂತರ ಕೇಳುವಿಕೆ ಸಕ್ರಿಯವಾಗಿದೆ',
  listeningStopped: 'ಮೈಕ್ ವಿರಾಮದಲ್ಲಿದೆ',
  speakingStopped: 'ಧ್ವನಿ ನಿಲ್ಲಿಸಲಾಗಿದೆ. ಸಿದ್ಧವಾದಾಗ ಮಾತನಾಡಿ.',
  silenceCheckIn: 'ನೀವು ಇನ್ನೂ ಇದ್ದೀರಾ? ನಾನು ಪ್ರಶ್ನೆಯನ್ನು ಮತ್ತೊಮ್ಮೆ ಹೇಳಲೇ?',
  silenceAutoPaused: 'ಸದ್ಯಕ್ಕೆ ಕೇಳುವುದನ್ನು ವಿರಾಮಗೊಳಿಸಿದ್ದೇನೆ. ಸಿದ್ಧವಾದಾಗ ಮುಂದುವರಿಸಿ ಒತ್ತಿ.',
  conversationPaused: 'ಸಂಭಾಷಣೆ ವಿರಾಮದಲ್ಲಿದೆ. ಮುಂದುವರಿಸಲು Resume ಒತ್ತಿ.',
  conversationResumed: 'ನಾನು ಕೇಳುತ್ತಿದ್ದೇನೆ.',
  conversationEnded: 'ಪೋರ್ಟೊಅಸಿಸ್ಟ್‌ಗೆ ಕರೆ ಮಾಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ಶುಭ ಪ್ರಯಾಣ!',
  micDeniedNotice:
    'ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಅನುಮತಿ ನೀಡಿ ಅಥವಾ ಕೆಳಗಿನ ಟೈಪ್ ಬಾಕ್ಸ್ ಬಳಸಿ.',
  correctionPrefix: 'ಪರವಾಗಿಲ್ಲ, ನಾನು ಅದನ್ನು ಈಗಲೇ ಸರಿಪಡಿಸುತ್ತೇನೆ.',
  correctionAskPickup: 'ಖಂಡಿತ — ಹೊಸ ಪಿಕಪ್ ಸ್ಥಳ ಯಾವುದು?',
  correctionAskDest: 'ಖಂಡಿತ — ನಿಮ್ಮ ಸರಿಯಾದ ಗಮ್ಯಸ್ಥಾನ ಯಾವುದು?',
  correctionAskPhone: 'ಖಂಡಿತ — ಸರಿಯಾದ 10-ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳಿ.',
  correctionAskEmail: 'ಸರಿ — ನಿಮ್ಮ ಸರಿಯಾದ ಇಮೇಲ್ ವಿಳಾಸವೇನು?',
  correctionAskName: 'ಖಂಡಿತ — ಯಾವ ಹೆಸರನ್ನು ಬಳಸಬೇಕು?',
  correctionAskAge: 'ಸರಿ — ನಿಮ್ಮ ವಯಸ್ಸು ಎಷ್ಟು?',
  correctionAskDate: 'ಖಂಡಿತ — ಯಾವ ಪ್ರಯಾಣದ ದಿನಾಂಕ ಬೇಕು?',
  correctionAskTime: 'ಸರಿ — ಹೊಸ ಸಮಯ ಯಾವುದು?',
  correctionAskBags: 'ಸರಿ — ಎಷ್ಟು ಬ್ಯಾಗ್‌ಗಳಿವೆ?',
  correctionAskMobility: 'ಖಂಡಿತ — ವೀಲ್‌ಚೇರ್ ಅಥವಾ ಚಲನಶೀಲತೆ ಸಹಾಯ ಬೇಕೇ?',
  correctionAskPayment: 'ಸರಿ — UPI ಅಥವಾ ನಗದು ಬೇಕೇ?',
  supportMessage:
    'ನಮ್ಮ 24 ಗಂಟೆಗಳ ಸಹಾಯವಾಣಿ ಸಂಖ್ಯೆ 0 8 0, 4 4 1 1, 2 2 0 0.',
  loggedOutMessage: 'ನೀವು ಸುರಕ್ಷಿತವಾಗಿ ಸೈನ್ ಔಟ್ ಆಗಿದ್ದೀರಿ.',
  clarifySpeechPrompt: 'ಕ್ಷಮಿಸಿ, ಅದು ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳಿ.',
  noBookingsTrackPrompt: 'ನಿಮ್ಮಲ್ಲಿ ಇನ್ನೂ ಯಾವುದೇ ಬುಕಿಂಗ್‌ಗಳಿಲ್ಲ. ಈಗ ಸಹಾಯಕರನ್ನು ಬುಕ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಾ?',
  trackingSummarySpeech: (code, status, pickup, dropoff, helperName, helperLoc, etaMin, otpCode) => {
    const helperPart = helperName
      ? `ನಿಮ್ಮ ಸಹಾಯಕ ${helperName} ಪ್ರಸ್ತುತ ${helperLoc} ಬಳಿ ಇದ್ದಾರೆ, ಸುಮಾರು ${etaMin} ನಿಮಿಷಗಳಲ್ಲಿ ತಲುಪುತ್ತಾರೆ. `
      : 'ಸಮೀಪದ ಸಹಾಯಕರನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ. ';
    const otpPart = otpCode ? `ಹ್ಯಾಂಡ್‌ಓವರ್ OTP ${otpCode}. ` : '';
    return `ಬುಕಿಂಗ್ ${code} ಟ್ರ್ಯಾಕ್ ಮಾಡಲಾಗುತ್ತಿದೆ. ಸ್ಥಿತಿ: ${status}. ಪಿಕಪ್: ${pickup}. ಗಮ್ಯಸ್ಥಾನ: ${dropoff}. ${helperPart}${otpPart}ಮತ್ತೊಂದು ಬುಕಿಂಗ್ ಮಾಡಲು, ಇತಿಹಾಸ ಕೇಳಲು ಅಥವಾ ರದ್ದುಗೊಳಿಸಲು ಹೇಳಿ.`;
  },
  trackingErrorPrompt: 'ಲೈವ್ ಟ್ರ್ಯಾಕಿಂಗ್ ವಿವರಗಳನ್ನು ಪಡೆಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  emptyHistoryPrompt: 'ನಿಮ್ಮ ಬುಕಿಂಗ್ ಇತಿಹಾಸ ಖಾಲಿ ಇದೆ. ಸಿದ್ಧವಾದಾಗ ಸಹಾಯಕರನ್ನು ಬುಕ್ ಮಾಡಿ ಎಂದು ಹೇಳಿ.',
  historyItemSummary: (idx, code, status, pickup, dropoff, fare) =>
    `ಬುಕಿಂಗ್ ${idx}: ${code}, ಸ್ಥಿತಿ ${status}, ${pickup} ನಿಂದ ${dropoff} ಗೆ, ದರ ${fare} ರೂಪಾಯಿಗಳು.`,
  historySummarySpeech: (total, summaryText) =>
    `ನಿಮ್ಮಲ್ಲಿ ${total} ಬುಕಿಂಗ್‌ಗಳಿವೆ. ${summaryText} ಸಹಾಯಕರನ್ನು ಬುಕ್ ಮಾಡಲು, ಟ್ರ್ಯಾಕ್ ಮಾಡಲು ಅಥವಾ ಲಾಗ್ ಔಟ್ ಮಾಡಲು ಹೇಳಿ.`,
  historyErrorPrompt: 'ಈಗ ಬುಕಿಂಗ್ ಇತಿಹಾಸವನ್ನು ಪಡೆಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
  noActiveCancelPrompt: 'ರದ್ದುಗೊಳಿಸಲು ಯಾವುದೇ ಸಕ್ರಿಯ ಬುಕಿಂಗ್‌ಗಳಿಲ್ಲ. ಯಾವಾಗ ಬೇಕಾದರೂ ಬುಕ್ ಮಾಡಿ ಎಂದು ಹೇಳಿ.',
  cancelConfirmPrompt: (code, dateText) =>
    `${dateText} ರ ಬುಕಿಂಗ್ ${code} ಅನ್ನು ರದ್ದುಗೊಳಿಸಲು ಬಯಸುತ್ತೀರಾ? ರದ್ದುಗೊಳಿಸಲು ಹೌದು ಅಥವಾ ಉಳಿಸಿಕೊಳ್ಳಲು ಇಲ್ಲ ಎಂದು ಹೇಳಿ.`,
  bookingCancelledSpeech: (code) => `ಬುಕಿಂಗ್ ${code} ಅನ್ನು ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ.`,
  cancelErrorPrompt: 'ಈಗ ಆ ಬುಕಿಂಗ್ ರದ್ದುಗೊಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
  bookingKeptSpeech: 'ನಿಮ್ಮ ಬುಕಿಂಗ್ ಸಕ್ರಿಯವಾಗಿದೆ.',
  bookingConfirmedSpeech: (code, pickup, dropoff, fare, helperName, etaMin, otpSpoken) => {
    const helperPart = helperName
      ? `ನಿಮ್ಮ ಸಹಾಯಕ ${helperName} ಅವರನ್ನು ನಿಯೋಜಿಸಲಾಗಿದೆ, ಸುಮಾರು ${etaMin} ನಿಮಿಷಗಳಲ್ಲಿ ತಲುಪುತ್ತಾರೆ. `
      : 'ಸಮೀಪದ ಪರಿಶೀಲಿತ ಸಹಾಯಕರನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ. ';
    const otpPart = otpSpoken ? `ನಿಮ್ಮ ಹ್ಯಾಂಡ್‌ಓವರ್ OTP ${otpSpoken}. ` : '';
    return `ನಿಮ್ಮ ಬುಕಿಂಗ್ ದೃಢೀಕರಿಸಲಾಗಿದೆ! ಬುಕಿಂಗ್ ಸಂಖ್ಯೆ ${code}, ${pickup} ನಿಂದ ${dropoff} ಗೆ. ${helperPart}ಅಂದಾಜು ದರ ${fare} ರೂಪಾಯಿಗಳು. ${otpPart}ಬುಕಿಂಗ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ, ಬುಕಿಂಗ್ ಇತಿಹಾಸ, ಮತ್ತೊಂದು ಬುಕಿಂಗ್ ಅಥವಾ ವಿದಾಯ ಎಂದು ಹೇಳಬಹುದು.`;
  },
  bookingSubmitFailed: (errMsg) =>
    `ಬುಕಿಂಗ್ ಸಲ್ಲಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ: ${errMsg}. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಲು ಹೌದು, ಅಥವಾ ವಿವರ ಬದಲಾಯಿಸಲು ಇಲ್ಲ ಎಂದು ಹೇಳಿ.`,
  loginMethodPrompt:
    'ಧ್ವನಿಯ ಮೂಲಕ ಹ್ಯಾಂಡ್ಸ್-ಫ್ರೀ ಸೈನ್ ಇನ್ ಮಾಡಲು OTP ಎಂದು ಹೇಳಿ, ಅಥವಾ ಪರದೆಯ ಮೇಲೆ ಪಾಸ್‌ವರ್ಡ್ ಟೈಪ್ ಮಾಡಲು Password ಎಂದು ಹೇಳಿ.',
  forgotOtpInvalidPrompt: 'ದಯವಿಟ್ಟು 6-ಅಂಕಿಯ OTP ಪರಿಶೀಲನಾ ಕೋಡ್ ಅನ್ನು ಹೇಳಿ ಅಥವಾ ನಮೂದಿಸಿ.',
  otpRetryPrompt: (errMsg) => `${errMsg} ದಯವಿಟ್ಟು 6-ಅಂಕಿಯ OTP ಅನ್ನು ಮತ್ತೆ ಹೇಳಿ.`,
  regErrorPrompt: (errMsg) =>
    `ನೋಂದಣಿ ಪೂರ್ಣಗೊಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ: ${errMsg}. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಲು ಹೌದು ಅಥವಾ ವಿವರ ಬದಲಾಯಿಸಲು ಇಲ್ಲ ಎಂದು ಹೇಳಿ.`,
  ui: {
    heading: 'ಪೋರ್ಟೊಅಸಿಸ್ಟ್ ಧ್ವನಿ ಕರೆ',
    repeatBtn: 'ಮತ್ತೆ ಹೇಳಿ',
    pauseBtn: 'ವಿರಾಮ',
    resumeBtn: 'ಮುಂದುವರಿಸಿ',
    interruptBtn: 'ಮಧ್ಯೆ ಮಾತನಾಡಿ',
    changeLangBtn: 'ಭಾಷೆ',
    endCallBtn: 'ಕರೆ ಮುಗಿಸಿ',
    listeningLabel: 'ನಿರಂತರವಾಗಿ ಕೇಳುತ್ತಿದೆ...',
    hearingYouLabel: 'ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದೆ...',
    speakingLabel: 'ಮಾತನಾಡುತ್ತಿದೆ (ತಡೆಯಲು ಮಾತನಾಡಿ)',
    processingLabel: 'ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲಾಗುತ್ತಿದೆ...',
    pausedLabel: 'ವಿರಾಮದಲ್ಲಿದೆ',
    readyLabel: 'ಸಿದ್ಧವಾಗಿದೆ',
    assistantPromptTitle: 'ಸಹಾಯಕ',
    youSaidTitle: 'ನೀವು ಹೇಳಿದ್ದು',
    quickOptionsTitle: 'ತ್ವರಿತ ಉತ್ತರಗಳು',
    textInputLabel: 'ಸಂದೇಶ ಟೈಪ್ ಮಾಡಿ (ಐಚ್ಛಿಕ)',
    textInputPlaceholder: 'ಟೈಪ್ ಮಾಡಿ...',
    sendBtn: 'ಕಳುಹಿಸಿ',
    protectedPassLabel: 'ಸುರಕ್ಷಿತ ಪಾಸ್‌ವರ್ಡ್ (ಎಂದಿಗೂ ಓದಲಾಗುವುದಿಲ್ಲ)',
    protectedPassPlaceholder: 'ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ',
    submitPassBtn: 'ಸಲ್ಲಿಸಿ',
    protectedPassNotice: 'ಗೌಪ್ಯತೆಗಾಗಿ ಪಾಸ್‌ವರ್ಡ್ ಹಂತದಲ್ಲಿ ಮೈಕ್ ಆಫ್ ಆಗಿರುತ್ತದೆ.',
    bookingConfirmedTitle: 'ಬುಕಿಂಗ್ ದೃಢೀಕರಿಸಲಾಗಿದೆ',
    statusLabel: 'ಸ್ಥಿತಿ',
    fareLabel: 'ಅಂದಾಜು ದರ',
    pickupLabel: 'ಪಿಕಪ್',
    destinationLabel: 'ಗಮ್ಯಸ್ಥಾನ',
    assignedHelperLabel: 'ನಿಯೋಜಿತ ಸಹಾಯಕ',
    handoverOtpLabel: 'ಹ್ಯಾಂಡ್‌ಓವರ್ OTP',
  },
};

const hi: VoiceCopy = {
  langName: 'हिन्दी',
  initialGreetingAndLanguage:
    'नमस्ते! PortoAssist में आपका स्वागत है। मैं आपका पर्सनल वॉइस असिस्टेंट हूँ और फोन कॉल की तरह लगातार सुन रहा हूँ ताकि आप आसानी से बात कर सकें। आप कौन सी भाषा पसंद करेंगे — इंग्लिश, कन्नड़ या हिंदी?',
  askLanguageAgain: 'कृपया बताएं आप कौन सी भाषा चुनना चाहेंगे: इंग्लिश, कन्नड़ या हिंदी?',
  welcomeGreeting:
    'नमस्ते! PortoAssist में आपका स्वागत है। आज मैं आपकी क्या मदद कर सकता हूँ? आप कह सकते हैं बुक ए हेल्पर, रजिस्टर, साइन इन या ट्रैक बुकिंग।',
  askAlreadyRegistered: 'क्या आप पहले से PortoAssist पर रजिस्टर हैं? बस हाँ या नहीं बोलें।',
  askAlreadyRegisteredForBooking:
    'बिल्कुल, मैं हेल्पर बुक करने में आपकी मदद करूँगा! सबसे पहले, क्या आप पहले से PortoAssist पर रजिस्टर हैं?',
  notUnderstood: 'माफ़ कीजिए, मैं ठीक से समझ नहीं पाया। कृपया एक बार फिर से बोलें।',
  oneMomentPlease: 'कृपया एक क्षण रुकिए...',
  startRegIntro: 'कोई बात नहीं, मैं अभी आपका अकाउंट बनाने में मदद करता हूँ।',
  regAskName: 'आपका पूरा नाम क्या है?',
  regNiceToMeetAskPhone: (name) =>
    `आपसे मिलकर अच्छा लगा, ${name}! क्या आप अपना 10-अंकीय मोबाइल नंबर बता सकते हैं?`,
  regAskPhone: 'कृपया अपना 10-अंकीय मोबाइल नंबर बताएं।',
  regAskEmail: 'ठीक है। आपका ईमेल पता क्या है?',
  regAskPassword:
    'अब कृपया एक पासवर्ड बनाएं। आपकी सुरक्षा के लिए पासवर्ड कभी बोलकर नहीं सुनाया जाता। कृपया स्क्रीन पर दिए सुरक्षित बॉक्स में पासवर्ड दर्ज करें।',
  regAskConfirmPassword: 'पुष्टि के लिए कृपया अपना पासवर्ड एक बार फिर सुरक्षित बॉक्स में लिखें।',
  regAskAge: 'बहुत बढ़िया। आपकी उम्र क्या है?',
  regAskPrefLang: 'आगे की यात्रा के लिए आप कौन सी भाषा पसंद करेंगे? इंग्लिश, कन्नड़ या हिंदी?',
  regAskAccessibility:
    'क्या आपको किसी विशेष सहायता की ज़रूरत है — जैसे दृष्टिबाधित सहायता, वरिष्ठ नागरिक देखभाल, व्हीलचेयर या मोबिलिटी सहायता?',
  regInvalidPhone: (count) =>
    `मुझे ${count} अंक सुनाई दिए। कृपया एक सही 10-अंकीय मोबाइल नंबर बताएं।`,
  regInvalidEmail: 'कृपया सही ईमेल पता साफ बोलें या नीचे बॉक्स में टाइप करें।',
  regPasswordShort: 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए। कृपया सुरक्षित बॉक्स में लिखें।',
  regPasswordMismatch: 'पासवर्ड मेल नहीं खा रहे हैं। कृपया दोबारा सही पासवर्ड लिखें।',
  regInvalidAge: 'कृपया 12 से 110 के बीच सही उम्र बताएं।',
  regAskChangeField:
    'आप कौन सी जानकारी बदलना चाहेंगे — नाम, मोबाइल नंबर, ईमेल, पासवर्ड, उम्र, भाषा या विशेष सहायता?',
  regDuplicateError:
    'इस ईमेल या मोबाइल नंबर से खाता पहले से मौजूद है। क्या मैं आपको साइन इन करा दूँ? हाँ या नहीं बोलें।',
  regSuccess: 'शानदार! आपका PortoAssist यात्री खाता तैयार है।',
  loginWelcomeBack:
    'वापसी पर स्वागत है! साइन इन करने के लिए अपना पंजीकृत मोबाइल नंबर या ईमेल पता बताएं।',
  loginAskPasswordOrOtp:
    'धन्यवाद! सुरक्षा के लिए पासवर्ड कभी बोला नहीं जाता। आप स्क्रीन पर सुरक्षित बॉक्स में पासवर्ड लिख सकते हैं, या बिना टाइप किए लॉगिन करने के लिए Send OTP बोल सकते हैं।',
  loginAskOtp:
    'मैंने आपके खाते के लिए 6-अंकीय लॉगिन OTP बना दिया है जो स्क्रीन पर दिख रहा है। कृपया वे 6 अंक बोलें।',
  loginOtpInvalid: 'वह OTP मेल नहीं खाया। कृपया 6-अंकीय OTP साफ बोलें।',
  loginSuccess: 'आप सफलतापूर्वक साइन इन हो गए हैं!',
  loginFailed:
    'लॉगिन विवरण सही नहीं थे। कृपया फिर से प्रयास करें या हैंड्स-फ्री लॉगिन के लिए Send OTP बोलें।',
  forgotAskIdentifier: 'बिल्कुल। OTP पाने के लिए अपना पंजीकृत मोबाइल नंबर या ईमेल बताएं।',
  forgotAskOtp: '6-अंकीय OTP स्क्रीन पर दिख रहा है। कृपया वे 6 अंक बोलें।',
  forgotAskNewPassword: 'OTP सत्यापित हो गया। कृपया सुरक्षित बॉक्स में नया पासवर्ड लिखें।',
  forgotSuccess: 'आपका पासवर्ड अपडेट हो गया है। कृपया नया पासवर्ड लिखें या Send OTP बोलें।',
  authMainMenu:
    'अब मैं आपकी क्या मदद करूँ? आप बोल सकते हैं बुक ए हेल्पर, ट्रैक बुकिंग, बुकिंग इतिहास, कस्टमर सपोर्ट या लॉग आउट।',
  authMenuInvalid:
    'माफ़ कीजिए, समझ नहीं आया। बुक ए हेल्पर, ट्रैक बुकिंग, इतिहास, सपोर्ट या लॉग आउट बोलें।',
  bookAskPickup:
    'ज़रूर, आइए हेल्पर बुक करते हैं! हेल्पर आपको कहाँ से पिकअप करे? स्थान का नाम बोलें या कहें मेरा वर्तमान स्थान उपयोग करें।',
  bookDetectingGps: 'Google Maps से आपका वर्तमान GPS स्थान देखा जा रहा है...',
  bookGpsUnavailable: 'इस ब्राउज़र में GPS उपलब्ध नहीं है। कृपया पिकअप स्थान बोलें।',
  bookGpsDenied: 'लोकेशन अनुमति नहीं मिली। कृपया अपना पिकअप स्थान बोलें।',
  bookGpsGeocodeFailed: 'पता पढ़ा नहीं जा सका। कृपया अपना पिकअप स्थान बोलें।',
  bookPickupConfirm: (addr) => `आपका पिकअप स्थान ${addr} है। क्या हम इसे पक्का करें?`,
  bookAskDestination: 'बहुत अच्छे! आप कहाँ जाना चाहते हैं?',
  bookDestConfirm: (name, addr) => `मुझे ${name}, ${addr} मिला। क्या यही आपका गंतव्य है?`,
  bookSameLocation: 'गंतव्य और पिकअप स्थान एक नहीं हो सकते। कृपया दूसरा गंतव्य बताएं।',
  bookPlaceNotFound: (query) =>
    `${query} नहीं मिला। कृपया स्टेशन, एयरपोर्ट या पता थोड़ा और साफ बोलें।`,
  bookMultipleFound: (count, _kind, optionsText) =>
    `मुझे ${count} स्थान मिले हैं। ${optionsText} आप कौन सा विकल्प चुनेंगे — 1, 2 या 3?`,
  bookPickOptionRange: (max) => `कृपया 1 से ${max} के बीच चुनें, या फिर से खोजने को कहें।`,
  bookAskDate: 'आप किस तारीख को यात्रा कर रहे हैं? आज, कल या कोई तारीख बोलें।',
  bookInvalidDate: 'कृपया आज, कल या कोई आने वाली तारीख बताएं।',
  bookDateConfirm: (dateText) => `ठीक है — ${dateText}। क्या यह तारीख सही है?`,
  bookAskTime: 'हेल्पर को किस समय आपसे मिलना चाहिए?',
  bookInvalidTime: 'कृपया सही समय बोलें, जैसे सुबह 10 बजे या शाम 6 बजे।',
  bookTimeConfirm: (timeText) => `ठीक है, ${timeText}। क्या हम यह समय पक्का करें?`,
  bookAskBags: 'आपके पास कितने सामान बैग हैं?',
  bookInvalidBags: 'कृपया 0 से 15 के बीच बैग की संख्या बताएं।',
  bookAskMobility: 'क्या आपको व्हीलचेयर या मोबिलिटी सहायता चाहिए? हाँ, नहीं या व्हीलचेयर बोलें।',
  bookAskPayment: 'आप भुगतान कैसे करेंगे — UPI या नकद?',
  bookInvalidPayment: 'कृपया UPI या नकद बोलें।',
  bookAskChangeField:
    'कौन सा विवरण बदलना है — पिकअप, गंतव्य, तारीख, समय, बैग, सहायता या भुगतान?',
  bookDiscarded: 'कोई बात नहीं, मैंने वह बुकिंग ड्राफ्ट हटा दिया है।',
  ackPickupAskDest: (place) => `ठीक है, ${place}। आप कहाँ जाना चाहते हैं?`,
  ackDestAskDate: (place) =>
    `ठीक है, ${place}! आप किस तारीख को यात्रा कर रहे हैं? आज, कल या कोई तारीख बोलें।`,
  ackDateAskTime: (dateText) =>
    `ठीक है, ${dateText}। आपको किस समय सहायता चाहिए?`,
  ackTimeAskBags: (timeText) =>
    `ठीक है, ${timeText}। आपके पास कितने सामान बैग हैं?`,
  ackBagsAskMobility: (bags) =>
    `ठीक है, ${bags} बैग। क्या आपको व्हीलचेयर या मोबिलिटी सहायता चाहिए?`,
  ackMobilityAskPayment: (label) =>
    `ठीक है, ${label}। आप UPI या नकद से भुगतान करेंगे?`,
  correctionConfirmPlace: (kind, name) =>
    `कोई बात नहीं! मैं आपका ${kind === 'pickup' ? 'पिकअप स्थान' : 'गंतव्य'} ${name} कर देता हूँ। क्या यह सही है?`,
  confirmYesNoPrompt: 'पक्का करने के लिए हाँ बोलें, या बताएं कि क्या बदलना है।',
  listeningStarted: 'लगातार सुनना चालू है',
  listeningStopped: 'माइक रोका गया',
  speakingStopped: 'आवाज़ रोक दी गई है। आप कभी भी बोल सकते हैं।',
  silenceCheckIn: 'क्या आप अभी भी लाइन पर हैं? क्या मैं सवाल फिर से दोहराऊँ?',
  silenceAutoPaused: 'मैं अभी सुनना रोक रहा हूँ। तैयार होने पर Resume दबाएं या Space दबाएं।',
  conversationPaused: 'कॉल पॉज़ की गई है। आगे बढ़ने के लिए Resume दबाएं।',
  conversationResumed: 'जी, मैं सुन रहा हूँ।',
  conversationEnded: 'PortoAssist से बात करने के लिए धन्यवाद। आपकी यात्रा मंगलमय हो!',
  micDeniedNotice:
    'माइक्रोफ़ोन अनुमति बंद है। कृपया अनुमति दें या नीचे टेक्स्ट बॉक्स और शॉर्टकट का उपयोग करें।',
  correctionPrefix: 'कोई बात नहीं, मैं इसे अभी अपडेट कर देता हूँ।',
  correctionAskPickup: 'बिल्कुल — नया पिकअप स्थान क्या होना चाहिए?',
  correctionAskDest: 'जी बिल्कुल — आपका सही गंतव्य क्या है?',
  correctionAskPhone: 'ज़रूर — सही 10-अंकीय मोबाइल नंबर बताएं।',
  correctionAskEmail: 'ठीक है — आपका सही ईमेल पता क्या है?',
  correctionAskName: 'बिल्कुल — कौन सा नाम रखना है?',
  correctionAskAge: 'ठीक है — आपकी उम्र क्या है?',
  correctionAskDate: 'ज़रूर — यात्रा की कौन सी तारीख रखनी है?',
  correctionAskTime: 'ठीक है — नया यात्रा समय क्या है?',
  correctionAskBags: 'ठीक है — कितने बैग लिखूँ?',
  correctionAskMobility: 'ज़रूर — क्या आपको व्हीलचेयर या मोबिलिटी सहायता चाहिए?',
  correctionAskPayment: 'ठीक है — UPI या नकद?',
  supportMessage:
    'हमारी 24x7 हेल्पलाइन संख्या 0 8 0, 4 4 1 1, 2 2 0 0 है।',
  loggedOutMessage: 'आप सुरक्षित रूप से लॉग आउट हो गए हैं।',
  clarifySpeechPrompt: 'माफ़ कीजिए, आपकी बात साफ समझ नहीं आई। कृपया एक बार फिर से बोलें?',
  noBookingsTrackPrompt: 'आपकी अभी कोई बुकिंग नहीं है। क्या आप अभी हेल्पर बुक करना चाहेंगे?',
  trackingSummarySpeech: (code, status, pickup, dropoff, helperName, helperLoc, etaMin, otpCode) => {
    const helperPart = helperName
      ? `आपके हेल्पर ${helperName} अभी ${helperLoc} पर हैं, लगभग ${etaMin} मिनट में पहुँचेंगे। `
      : 'हम अभी नज़दीकी उपलब्ध हेल्पर ढूँढ रहे हैं। ';
    const otpPart = otpCode ? `हैंडओवर OTP ${otpCode} है। ` : '';
    return `बुकिंग ${code} ट्रैक हो रही है। स्थिति: ${status}। पिकअप: ${pickup}। गंतव्य: ${dropoff}। ${helperPart}${otpPart}क्या आप दूसरा हेल्पर बुक करना, बुकिंग इतिहास सुनना या बुकिंग रद्द करना चाहेंगे?`;
  },
  trackingErrorPrompt: 'अभी लाइव ट्रैकिंग जानकारी नहीं मिल सकी। कृपया फिर से प्रयास करें।',
  emptyHistoryPrompt: 'आपका बुकिंग इतिहास खाली है। जब चाहें हेल्पर बुक करें बोलें।',
  historyItemSummary: (idx, code, status, pickup, dropoff, fare) =>
    `बुकिंग ${idx}: ${code}, स्थिति ${status}, ${pickup} से ${dropoff} तक, किराया ${fare} रुपये।`,
  historySummarySpeech: (total, summaryText) =>
    `आपकी कुल ${total} बुकिंग हैं। ${summaryText} क्या आप हेल्पर बुक करना, बुकिंग ट्रैक करना या लॉग आउट करना चाहेंगे?`,
  historyErrorPrompt: 'अभी बुकिंग इतिहास नहीं मिल सका।',
  noActiveCancelPrompt: 'रद्द करने के लिए कोई सक्रिय बुकिंग नहीं है। आप कभी भी बुक करने के लिए बोल सकते हैं।',
  cancelConfirmPrompt: (code, dateText) =>
    `क्या आप ${dateText} की बुकिंग ${code} को रद्द करना चाहते हैं? रद्द करने के लिए हाँ या रखने के लिए नहीं बोलें।`,
  bookingCancelledSpeech: (code) => `बुकिंग ${code} रद्द कर दी गई है।`,
  cancelErrorPrompt: 'अभी वह बुकिंग रद्द नहीं हो सकी।',
  bookingKeptSpeech: 'आपकी बुकिंग अभी भी सक्रिय है।',
  bookingConfirmedSpeech: (code, pickup, dropoff, fare, helperName, etaMin, otpSpoken) => {
    const helperPart = helperName
      ? `आपके हेल्पर ${helperName} नियुक्त कर दिए गए हैं और लगभग ${etaMin} मिनट में पहुँचेंगे। `
      : 'हम अभी आपके लिए नज़दीकी सत्यापित हेल्पर ढूँढ रहे हैं। ';
    const otpPart = otpSpoken ? `आपका हैंडओवर OTP ${otpSpoken} है। ` : '';
    return `आपकी बुकिंग कन्फर्म हो गई है! बुकिंग आईडी ${code} है, ${pickup} से ${dropoff} तक। ${helperPart}अनुमानित किराया ${fare} रुपये है। ${otpPart}आप ट्रैक बुकिंग, बुकिंग इतिहास, दूसरा हेल्पर बुक करें या अलविदा कह सकते हैं।`;
  },
  bookingSubmitFailed: (errMsg) =>
    `बुकिंग सबमिट नहीं हो सकी: ${errMsg}। फिर से प्रयास करने के लिए हाँ या विवरण बदलने के लिए नहीं बोलें।`,
  loginMethodPrompt:
    'आवाज़ से साइन इन करने के लिए OTP बोलें, या स्क्रीन पर पासवर्ड लिखने के लिए Password बोलें।',
  forgotOtpInvalidPrompt: 'कृपया 6-अंकीय OTP कोड बोलें या दर्ज करें।',
  otpRetryPrompt: (errMsg) => `${errMsg} कृपया अपना 6-अंकीय OTP फिर से बोलें।`,
  regErrorPrompt: (errMsg) =>
    `रजिस्ट्रेशन पूरा नहीं हो सका: ${errMsg}। फिर से प्रयास करने के लिए हाँ या विवरण बदलने के लिए नहीं बोलें।`,
  ui: {
    heading: 'PortoAssist वॉइस कॉल',
    repeatBtn: 'दोहराएं',
    pauseBtn: 'पॉज़',
    resumeBtn: 'जारी रखें',
    interruptBtn: 'रोककर बोलें',
    changeLangBtn: 'भाषा',
    endCallBtn: 'कॉल समाप्त',
    listeningLabel: 'हैंड्स-फ़्री · सुन रहा है...',
    hearingYouLabel: 'आपकी आवाज़ सुन रहा है...',
    speakingLabel: 'बोल रहा है (बोलकर रोक सकते हैं)',
    processingLabel: 'समझ रहा है...',
    pausedLabel: 'कॉल पॉज़ है',
    readyLabel: 'कॉल तैयार',
    assistantPromptTitle: 'असिस्टेंट',
    youSaidTitle: 'आपने कहा',
    quickOptionsTitle: 'त्वरित उत्तर विकल्प',
    textInputLabel: 'संदेश लिखें (वैकल्पिक)',
    textInputPlaceholder: 'अगर अभी बोलना संभव न हो तो यहाँ लिखें...',
    sendBtn: 'भेजें',
    protectedPassLabel: 'सुरक्षित पासवर्ड बॉक्स (कभी बोला या रिकॉर्ड नहीं होता)',
    protectedPassPlaceholder: 'पासवर्ड सुरक्षित रूप से दर्ज करें',
    submitPassBtn: 'पासवर्ड सबमिट करें',
    protectedPassNotice: 'गोपनीयता के लिए पासवर्ड चरण के दौरान माइक्रोफ़ोन म्यूट रहता है।',
    bookingConfirmedTitle: 'बुकिंग कन्फर्म हो गई',
    statusLabel: 'स्थिति',
    fareLabel: 'अनुमानित किराया',
    pickupLabel: 'पिकअप',
    destinationLabel: 'गंतव्य',
    assignedHelperLabel: 'नियुक्त हेल्पर',
    handoverOtpLabel: 'हैंडओवर OTP',
  },
};

export const VOICE_I18N: Record<Language, VoiceCopy> = { en, kn, hi };
