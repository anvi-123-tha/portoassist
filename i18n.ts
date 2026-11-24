import type { Language } from './types';

export interface Translations {
  tagline: string;
  nav: {
    home: string;
    services: string;
    howItWorks: string;
    track: string;
    contact: string;
    login: string;
    register: string;
    dashboard: string;
    bookNow: string;
    logout: string;
  };
  hero: {
    heading: string;
    subheading: string;
    bookBtn: string;
    findHelperBtn: string;
  };
  sections: {
    servicesTitle: string;
    servicesLead: string;
    howTitle: string;
    whyTitle: string;
    helpersTitle: string;
    testimonialsTitle: string;
    contactTitle: string;
  };
  booking: {
    title: string;
    subtitle: string;
    passengerInfo: string;
    journeyInfo: string;
    assistanceInfo: string;
    fareBreakdown: string;
    confirmBooking: string;
    estimatedTotal: string;
    baseFare: string;
    distanceCharge: string;
    luggageCharge: string;
    mobilityCharge: string;
    durationCharge: string;
  };
  dashboard: {
    welcome: string;
    totalBookings: string;
    upcomingBookings: string;
    completedBookings: string;
    activeStatus: string;
    bookNew: string;
    myBookings: string;
    trackHelper: string;
    history: string;
    payments: string;
    profile: string;
    support: string;
  };
  voice: {
    title: string;
    listening: string;
    idle: string;
    speakPrompt: string;
    confirmCancel: string;
    confirmBook: string;
  };
  statuses: Record<string, string>;
}

const en: Translations = {
  tagline: 'Travel Easy. Move Freely.',
  nav: {
    home: 'Home',
    services: 'Services',
    howItWorks: 'How It Works',
    track: 'Track',
    contact: 'Contact',
    login: 'Login',
    register: 'Register',
    dashboard: 'Dashboard',
    bookNow: 'Book Assistance',
    logout: 'Sign Out',
  },
  hero: {
    heading: 'Your Journey, Made Easier',
    subheading:
      'On-demand, verified luggage porters and wheelchair mobility companions across airports, railway stations, and bus terminals — with voice booking, live map tracking, and OTP-verified handover.',
    bookBtn: 'Book Assistance',
    findHelperBtn: 'Find a Helper',
  },
  sections: {
    servicesTitle: 'Accessible Transit Services',
    servicesLead:
      'Designed for senior citizens, families with heavy luggage, and passengers needing barrier-free station transfers.',
    howTitle: 'How PortoAssist Works',
    whyTitle: 'Why Travelers Trust PortoAssist',
    helpersTitle: 'Verified Station & Airport Helpers',
    testimonialsTitle: 'Traveler Stories',
    contactTitle: 'Contact & 24/7 Transit Desk',
  },
  booking: {
    title: 'Book Luggage & Mobility Assistance',
    subtitle: 'Get instant transparent fare estimates and smart helper matching before confirming.',
    passengerInfo: 'Passenger Information',
    journeyInfo: 'Journey & Hub Details',
    assistanceInfo: 'Luggage & Mobility Requirements',
    fareBreakdown: 'Transparent Fare Estimate',
    confirmBooking: 'Confirm & Match Helper',
    estimatedTotal: 'Estimated Total',
    baseFare: 'Base Station/Terminal Fare',
    distanceCharge: 'Distance Charge',
    luggageCharge: 'Luggage Handling',
    mobilityCharge: 'Mobility / Wheelchair Support',
    durationCharge: 'Extended Duration',
  },
  dashboard: {
    welcome: 'Welcome back',
    totalBookings: 'Total Bookings',
    upcomingBookings: 'Active / Upcoming',
    completedBookings: 'Completed',
    activeStatus: 'Current Status',
    bookNew: 'Book Assistance',
    myBookings: 'My Bookings',
    trackHelper: 'Track Helper',
    history: 'Booking History',
    payments: 'Payment Details',
    profile: 'Profile',
    support: 'Help & Support',
  },
  voice: {
    title: 'Start Voice Assistant',
    listening: 'Listening for your voice response...',
    idle: 'Press the large microphone button or speak naturally',
    speakPrompt: 'Say 1 to book a helper, 2 to check your booking, 3 to cancel, or 4 for support.',
    confirmCancel: 'Are you sure you want to cancel your active booking? Say Yes to confirm or No to keep it.',
    confirmBook: 'Starting voice booking step by step.',
  },
  statuses: {
    'Booking Requested': 'Booking Requested',
    'Searching for Helper': 'Searching for Helper',
    'Helper Assigned': 'Helper Assigned',
    'Helper Accepted': 'Helper Accepted',
    'Helper On the Way': 'Helper On the Way',
    'Assistance Started': 'Assistance Started',
    'Assistance Completed': 'Assistance Completed',
    'Booking Cancelled': 'Booking Cancelled',
  },
};

const kn: Translations = {
  tagline: 'ಸುಲಭ ಪ್ರಯಾಣ. ಸ್ವತಂತ್ರ ಚಲನೆ.',
  nav: {
    home: 'ಮುಖಪುಟ',
    services: 'ಸೇವೆಗಳು',
    howItWorks: 'ಕಾರ್ಯವಿಧಾನ',
    track: 'ಟ್ರ್ಯಾಕ್',
    contact: 'ಸಂಪರ್ಕಿಸಿ',
    login: 'ಲಾಗಿನ್',
    register: 'ನೋಂದಣಿ',
    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    bookNow: 'ಸಹಾಯ ಬುಕ್ ಮಾಡಿ',
    logout: 'ಲಾಗ್ ಔಟ್',
  },
  hero: {
    heading: 'ನಿಮ್ಮ ಪ್ರಯಾಣ ಈಗ ಇನ್ನಷ್ಟು ಸುಲಭ',
    subheading:
      'ವಿಮಾನ ನಿಲ್ದಾಣ, ರೈಲು ನಿಲ್ದಾಣ ಮತ್ತು ಬಸ್ ನಿಲ್ದಾಣಗಳಲ್ಲಿ ಲಗೇಜ್ ಮತ್ತು ವೀಲ್‌ಚೇರ್ ಸಹಾಯಕರನ್ನು ತಕ್ಷಣ ಬುಕ್ ಮಾಡಿ — ಧ್ವನಿ ಆಜ್ಞೆ, ನೇರ ನಕ್ಷೆ ಟ್ರ್ಯಾಕಿಂಗ್ ಮತ್ತು OTP ಪರಿಶೀಲನೆಯೊಂದಿಗೆ.',
    bookBtn: 'ಸಹಾಯ ಬುಕ್ ಮಾಡಿ',
    findHelperBtn: 'ಸಹಾಯಕರನ್ನು ಹುಡುಕಿ',
  },
  sections: {
    servicesTitle: 'ಪ್ರಯಾಣಿಕರ ಸಹಾಯ ಸೇವೆಗಳು',
    servicesLead:
      'ಹಿರಿಯ ನಾಗರಿಕರು, ಭಾರವಾದ ಲಗೇಜ್ ಹೊಂದಿರುವ ಕುಟುಂಬಗಳು ಮತ್ತು ಸುಲಭ ಸಂಚಾರದ ಅಗತ್ಯವಿರುವ ಪ್ರಯಾಣಿಕರಿಗಾಗಿ ನಿರ್ಮಿಸಲಾಗಿದೆ.',
    howTitle: 'ಪೋರ್ಟೊಅಸಿಸ್ಟ್ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
    whyTitle: 'ಪೋರ್ಟೊಅಸಿಸ್ಟ್ ಏಕೆ ವಿಶ್ವಾಸಾರ್ಹ',
    helpersTitle: 'ಪರಿಶೀಲಿಸಿದ ನಿಲ್ದಾಣ ಸಹಾಯಕರು',
    testimonialsTitle: 'ಪ್ರಯಾಣಿಕರ ಅನುಭವಗಳು',
    contactTitle: 'ಸಂಪರ್ಕ ಮತ್ತು ಸಹಾಯ ಕೇಂದ್ರ',
  },
  booking: {
    title: 'ಲಗೇಜ್ ಮತ್ತು ಚಲನಶೀಲತೆ ಸಹಾಯ ಬುಕಿಂಗ್',
    subtitle: 'ದೃಢೀಕರಿಸುವ ಮೊದಲು ಪಾರದರ್ಶಕ ದರ ಮತ್ತು ಸೂಕ್ತ ಸಹಾಯಕರನ್ನು ಪಡೆಯಿರಿ.',
    passengerInfo: 'ಪ್ರಯಾಣಿಕರ ವಿವರಗಳು',
    journeyInfo: 'ಪ್ರಯಾಣ ಮತ್ತು ನಿಲ್ದಾಣದ ವಿವರ',
    assistanceInfo: 'ಲಗೇಜ್ ಮತ್ತು ಸಹಾಯದ ಅಗತ್ಯಗಳು',
    fareBreakdown: 'ಪಾರದರ್ಶಕ ದರ ವಿವರ',
    confirmBooking: 'ಬುಕಿಂಗ್ ದೃಢೀಕರಿಸಿ',
    estimatedTotal: 'ಅಂದಾಜು ಒಟ್ಟು ಮೊತ್ತ',
    baseFare: 'ಮೂಲ ಸೇವಾ ಶುಲ್ಕ',
    distanceCharge: 'ದೂರ ಶುಲ್ಕ',
    luggageCharge: 'ಲಗೇಜ್ ಶುಲ್ಕ',
    mobilityCharge: 'ವೀಲ್‌ಚೇರ್ / ಚಲನಶೀಲತೆ ಶುಲ್ಕ',
    durationCharge: 'ಹೆಚ್ಚುವರಿ ಸಮಯ ಶುಲ್ಕ',
  },
  dashboard: {
    welcome: 'ಸ್ವಾಗತ',
    totalBookings: 'ಒಟ್ಟು ಬುಕಿಂಗ್‌ಗಳು',
    upcomingBookings: 'ಸಕ್ರಿಯ / ಮುಂಬರುವ',
    completedBookings: 'ಪೂರ್ಣಗೊಂಡವು',
    activeStatus: 'ಪ್ರಸ್ತುತ ಸ್ಥಿತಿ',
    bookNew: 'ಹೊಸ ಸಹಾಯ ಬುಕ್ ಮಾಡಿ',
    myBookings: 'ನನ್ನ ಬುಕಿಂಗ್‌ಗಳು',
    trackHelper: 'ಸಹಾಯಕರನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ',
    history: 'ಬುಕಿಂಗ್ ಇತಿಹಾಸ',
    payments: 'ಪಾವತಿ ವಿವರಗಳು',
    profile: 'ಪ್ರೊಫೈಲ್',
    support: 'ಸಹಾಯ ಮತ್ತು ಬೆಂಬಲ',
  },
  voice: {
    title: 'ಧ್ವನಿ ಸಹಾಯಕ',
    listening: 'ನಿಮ್ಮ ಆದೇಶವನ್ನು ಕೇಳಲಾಗುತ್ತಿದೆ...',
    idle: 'ಮೈಕ್ರೊಫೋನ್ ಒತ್ತಿ ಅಥವಾ ಆದೇಶ ಆಯ್ಕೆಮಾಡಿ',
    speakPrompt: '"Book a helper", "Track my helper" ಅಥವಾ "Show my bookings" ಎಂದು ಹೇಳಿ.',
    confirmCancel: 'ನಿಮ್ಮ ಸಕ್ರಿಯ ಬುಕಿಂಗ್ ರದ್ದುಗೊಳಿಸಲು ಖಚಿತವೇ? ಮುಂದುವರಿಯಲು ದೃಢೀಕರಿಸಿ.',
    confirmBook: 'ನಿಮ್ಮ ಪ್ರವಾಸದ ವಿವರಗಳನ್ನು ದೃಢೀಕರಿಸಲು ಬುಕಿಂಗ್ ಫಾರ್ಮ್ ತೆರೆಯಲಾಗುತ್ತಿದೆ.',
  },
  statuses: {
    'Booking Requested': 'ಬುಕಿಂಗ್ ವಿನಂತಿಸಲಾಗಿದೆ',
    'Searching for Helper': 'ಸಹಾಯಕರನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ',
    'Helper Assigned': 'ಸಹಾಯಕ ನಿಯೋಜಿಸಲಾಗಿದೆ',
    'Helper Accepted': 'ಸಹಾಯಕರು ಒಪ್ಪಿಕೊಂಡಿದ್ದಾರೆ',
    'Helper On the Way': 'ಸಹಾಯಕರು ಬರುತ್ತಿದ್ದಾರೆ',
    'Assistance Started': 'ಸಹಾಯ ಪ್ರಾರಂಭವಾಗಿದೆ',
    'Assistance Completed': 'ಸಹಾಯ ಪೂರ್ಣಗೊಂಡಿದೆ',
    'Booking Cancelled': 'ಬುಕಿಂಗ್ ರದ್ದಾಗಿದೆ',
  },
};

const hi: Translations = {
  tagline: 'आसान सफर. बेफिक्र आवाजाही.',
  nav: {
    home: 'होम',
    services: 'सेवाएं',
    howItWorks: 'कैसे काम करता है',
    track: 'ट्रैक करें',
    contact: 'संपर्क',
    login: 'लॉगिन',
    register: 'रजिस्टर',
    dashboard: 'डैशबोर्ड',
    bookNow: 'सहायता बुक करें',
    logout: 'लॉग आउट',
  },
  hero: {
    heading: 'आपकी यात्रा, अब और आसान',
    subheading:
      'हवाई अड्डों, रेलवे स्टेशनों और बस टर्मिनलों पर सत्यापित सामान सहायक और व्हीलचेयर सहायता तुरंत बुक करें — वॉइस बुकिंग, लाइव मैप ट्रैकिंग और OTP सत्यापन के साथ।',
    bookBtn: 'सहायता बुक करें',
    findHelperBtn: 'सहायक खोजें',
  },
  sections: {
    servicesTitle: 'सुगम यात्रा सेवाएं',
    servicesLead:
      'वरिष्ठ नागरिकों, भारी सामान वाले परिवारों और सुगम स्टेशन ट्रांसफर की आवश्यकता वाले यात्रियों के लिए निर्मित।',
    howTitle: 'PortoAssist कैसे काम करता है',
    whyTitle: 'यात्री PortoAssist पर भरोसा क्यों करते हैं',
    helpersTitle: 'सत्यापित स्टेशन और एयरपोर्ट सहायक',
    testimonialsTitle: 'यात्रियों के अनुभव',
    contactTitle: 'संपर्क और 24/7 सहायता डेस्क',
  },
  booking: {
    title: 'सामान और मोबिलिटी सहायता बुकिंग',
    subtitle: 'पुष्टि करने से पहले पारदर्शी किराया अनुमान और स्मार्ट सहायक मिलान देखें।',
    passengerInfo: 'यात्री विवरण',
    journeyInfo: 'यात्रा और स्टेशन विवरण',
    assistanceInfo: 'सामान और सहायता आवश्यकताएं',
    fareBreakdown: 'पारदर्शी किराया विवरण',
    confirmBooking: 'बुकिंग की पुष्टि करें',
    estimatedTotal: 'अनुमानित कुल राशि',
    baseFare: 'आधार सेवा शुल्क',
    distanceCharge: 'दूरी शुल्क',
    luggageCharge: 'सामान शुल्क',
    mobilityCharge: 'मोबिलिटी / व्हीलचेयर सहायता',
    durationCharge: 'अतिरिक्त समय शुल्क',
  },
  dashboard: {
    welcome: 'स्वागत है',
    totalBookings: 'कुल बुकिंग',
    upcomingBookings: 'सक्रिय / आगामी',
    completedBookings: 'पूर्ण हुईं',
    activeStatus: 'वर्तमान स्थिति',
    bookNew: 'सहायता बुक करें',
    myBookings: 'मेरी बुकिंग',
    trackHelper: 'सहायक ट्रैक करें',
    history: 'बुकिंग इतिहास',
    payments: 'भुगतान विवरण',
    profile: 'प्रोफ़ाइल',
    support: 'मदद और सहायता',
  },
  voice: {
    title: 'वॉइस असिस्टेंट',
    listening: 'आपका निर्देश सुना जा रहा है...',
    idle: 'माइक्रोफ़ोन दबाएं या कमांड चुनें',
    speakPrompt: '"Book a helper", "Track my helper" या "Show my bookings" बोलें।',
    confirmCancel: 'क्या आप अपनी सक्रिय बुकिंग रद्द करना चाहते हैं? आगे बढ़ने के लिए पुष्टि करें।',
    confirmBook: 'आपकी यात्रा का विवरण भरने के लिए बुकिंग फॉर्म खोला जा रहा है।',
  },
  statuses: {
    'Booking Requested': 'बुकिंग अनुरोधित',
    'Searching for Helper': 'सहायक खोजा जा रहा है',
    'Helper Assigned': 'सहायक नियुक्त',
    'Helper Accepted': 'सहायक ने स्वीकार किया',
    'Helper On the Way': 'सहायक रास्ते में हैं',
    'Assistance Started': 'सहायता शुरू हुई',
    'Assistance Completed': 'सहायता पूर्ण',
    'Booking Cancelled': 'बुकिंग रद्द',
  },
};

export const I18N: Record<Language, Translations> = { en, kn, hi };

export const SPEECH_LANG_CODES: Record<Language, string> = {
  en: 'en-IN',
  kn: 'kn-IN',
  hi: 'hi-IN',
};
