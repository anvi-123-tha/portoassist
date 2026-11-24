import React, { useEffect, useState } from 'react';
import {
  Accessibility,
  ArrowRight,
  CheckCircle2,
  Clock,
  Globe,
  Headphones,
  Luggage,
  MapPin,
  Mic,
  Navigation,
  Phone,
  QrCode,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  Users,
  Volume2,
} from 'lucide-react';
import { apiRequest } from '../api';
import { I18N } from '../i18n';
import type { AppRoute, Language, UserProfile, UserRole } from '../types';
import { BrandLogo } from './BrandLogo';

interface HomePageProps {
  language: Language;
  user: UserProfile | null;
  onNavigate: (route: AppRoute, anchorId?: string) => void;
  onNavigateAuth: (mode: 'login' | 'register', role: UserRole) => void;
  onOpenVoice: () => void;
}

interface PublicHelper {
  helperId: number;
  fullName: string;
  avatarUrl: string;
  languagesKnown: string;
  experienceYears: number;
  assistanceCategories: string;
  currentLocation: string;
  isAvailable: number;
  rating: number;
  totalReviews: number;
  completedJobs: number;
  maxBags: number;
  maxWeightKg: number;
}

export const HomePage: React.FC<HomePageProps> = ({
  language,
  user,
  onNavigate,
  onNavigateAuth,
  onOpenVoice,
}) => {
  const t = I18N[language];
  const [helpers, setHelpers] = useState<PublicHelper[]>([]);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [aboutImgFailed, setAboutImgFailed] = useState(false);
  const [failedAvatars, setFailedAvatars] = useState<Record<number, boolean>>({});
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [contactFeedback, setContactFeedback] = useState('');

  useEffect(() => {
    apiRequest<{ helpers: PublicHelper[] }>('/api/helpers/public')
      .then((res) => setHelpers(res.helpers))
      .catch(() => {
        // ignore
      });
  }, []);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus('sending');
    setContactFeedback('');
    try {
      const res = await apiRequest<{ message: string }>('/api/contact/public', {
        method: 'POST',
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          subject: contactSubject,
          message: contactMessage,
        }),
      });
      setContactStatus('sent');
      setContactFeedback(res.message);
      setContactName('');
      setContactEmail('');
      setContactSubject('');
      setContactMessage('');
    } catch (err: any) {
      setContactStatus('error');
      setContactFeedback(err.message || 'Unable to send message.');
    }
  };

  const primaryBookRoute: AppRoute = user?.role === 'HELPER' ? 'helper-dashboard' : 'book';

  const serviceCards = [
    {
      icon: <Luggage className="w-6 h-6 text-[#123B67]" aria-hidden="true" />,
      badgeBg: 'bg-[#EAF4FF]',
      title: 'Luggage Assistance',
      description:
        'Trained terminal porters meet you at curbside pickup lanes, railway gates, or bus bays and carry heavy bags safely along barrier-free routes.',
      meta: 'Curbside to platform or boarding gate',
      actionLabel: 'Book Luggage Porter',
      onClick: () => onNavigate(primaryBookRoute),
      featured: true,
    },
    {
      icon: <Accessibility className="w-6 h-6 text-[#16A6A1]" aria-hidden="true" />,
      badgeBg: 'bg-[#EAF4FF]',
      title: 'Mobility Support',
      description:
        'Dedicated wheelchair escorts, elevator-priority routing, and patient step-by-step accompaniment for senior citizens and passengers with reduced mobility.',
      meta: 'Barrier-free lift & ramp guidance',
      actionLabel: 'Request Mobility Escort',
      onClick: () => onNavigate(primaryBookRoute),
      featured: true,
    },
    {
      icon: <Mic className="w-6 h-6 text-[#123B67]" aria-hidden="true" />,
      badgeBg: 'bg-[#EAF4FF]',
      title: 'Voice-Based Booking',
      description:
        'Hands-free conversational AI voice assistant lets visually impaired passengers register, sign in, and complete an entire booking using natural speech.',
      meta: 'English · ಕನ್ನಡ · हिन्दी',
      actionLabel: 'Start Voice Assistant',
      onClick: onOpenVoice,
      featured: false,
    },
    {
      icon: <Navigation className="w-6 h-6 text-[#16A6A1]" aria-hidden="true" />,
      badgeBg: 'bg-[#EAF4FF]',
      title: 'Real-Time Tracking',
      description:
        'Follow your assigned helper on an interactive route map with live ETA, real-time distance updates, and clear arrival milestones.',
      meta: 'Live GPS & station status sync',
      actionLabel: user ? 'Open Live Tracking' : 'Explore Booking Flow',
      onClick: () => onNavigate(user ? (user.role === 'HELPER' ? 'helper-dashboard' : 'track') : 'book'),
      featured: false,
    },
    {
      icon: <QrCode className="w-6 h-6 text-[#123B67]" aria-hidden="true" />,
      badgeBg: 'bg-[#EAF4FF]',
      title: 'Secure Passenger Handover',
      description:
        'Every confirmed booking generates a unique 6-digit OTP and QR verification code so luggage is released only upon your explicit confirmation.',
      meta: 'Backend OTP & QR protection',
      actionLabel: 'Book With Verification',
      onClick: () => onNavigate(primaryBookRoute),
      featured: false,
    },
  ];

  const howItWorksSteps = [
    {
      number: '01',
      title: '1. Book Your Assistance.',
      description:
        'Choose your Airport, Railway, or Bus terminal, bag count, and mobility options — visually on Google Maps or hands-free by voice.',
    },
    {
      number: '02',
      title: '2. Get Matched With a Helper.',
      description:
        'Our smart matching engine pairs you with a verified nearby helper suited to your language, luggage weight, and support needs.',
    },
    {
      number: '03',
      title: '3. Track Your Helper.',
      description:
        'Monitor your helper approaching the pickup gate in real time with accurate ETA, live distance, and instant status notifications.',
    },
    {
      number: '04',
      title: '4. Enjoy Your Journey.',
      description:
        'Confirm safe arrival and luggage delivery with your 6-digit OTP or QR code and move through the terminal stress-free.',
    },
  ];

  const whyChooseItems = [
    {
      icon: <Sparkles className="w-5 h-5 text-[#16A6A1]" aria-hidden="true" />,
      title: 'Smart Helper Matching',
      description:
        'Automatically pairs you with the best-rated, closest helper who speaks your preferred language and supports your luggage capacity.',
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-[#16A6A1]" aria-hidden="true" />,
      title: 'Transparent Fare Estimation',
      description:
        'See an exact, itemized fare breakdown before confirming — no station haggling or unexpected surcharges across UPI or Cash.',
    },
    {
      icon: <Clock className="w-5 h-5 text-[#16A6A1]" aria-hidden="true" />,
      title: 'Real-Time Updates',
      description:
        'Live helper coordinates, milestone progress from match to completion, and instant alerts keep you and your family informed.',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-[#16A6A1]" aria-hidden="true" />,
      title: 'Secure OTP/QR Verification',
      description:
        'Server-validated 6-digit handover OTP and scannable QR token guarantee accountable, tamper-proof luggage delivery.',
    },
    {
      icon: <MapPin className="w-5 h-5 text-[#16A6A1]" aria-hidden="true" />,
      title: 'Convenient Booking',
      description:
        'Pin exact pickup gates with Google Maps GPS or book completely eyes-free through our continuous conversational Voice Assistant.',
    },
    {
      icon: <Users className="w-5 h-5 text-[#16A6A1]" aria-hidden="true" />,
      title: 'Inclusive Travel Experience',
      description:
        'Thoughtfully engineered for blind and visually impaired travelers, senior citizens, wheelchair users, and multi-bag families.',
    },
  ];

  return (
    <div className="bg-white text-[#526174]">
      {/* 1. HERO SECTION (+ FIRST-TIME WELCOME PORTAL WHEN LOGGED OUT) */}
      <section
        aria-labelledby="hero-heading"
        className="border-b border-slate-200/80 bg-gradient-to-b from-[#EAF4FF] via-[#F5F8FC] to-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-[#16A6A1]">
                {!user
                  ? 'Welcome to PortoAssist · Accessible Travel Support'
                  : `PortoAssist · ${t.tagline}`}
              </p>

              <h1
                id="hero-heading"
                className="font-display font-extrabold text-[#0B2545] tracking-tight leading-[1.08]"
                style={{ fontSize: 'clamp(2.35rem, 4.3vw, 3.75rem)', textWrap: 'balance' }}
              >
                Travel Easy. Move Freely.
              </h1>

              <p className="text-base sm:text-lg text-[#526174] leading-relaxed max-w-xl">
                Your journey deserves comfort, confidence and care. Get reliable luggage and mobility assistance whenever you travel.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate(primaryBookRoute)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#123B67] hover:bg-[#0B2545] text-white font-semibold text-sm sm:text-base transition-all duration-150 min-h-[48px] whitespace-nowrap shrink-0 shadow-[0_8px_20px_-6px_rgba(18,59,103,0.4)]"
                >
                  {user?.role === 'HELPER' ? 'Open Helper Dashboard' : 'Book Assistance'}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={onOpenVoice}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#16A6A1] hover:bg-[#11827E] text-white font-semibold text-sm sm:text-base transition-all duration-150 min-h-[48px] whitespace-nowrap shrink-0 shadow-[0_8px_20px_-6px_rgba(22,166,161,0.45)]"
                  aria-label="Start Voice Assistant"
                >
                  <Mic className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Start Voice Assistant</span>
                </button>

                <a
                  href="#verified-helpers-section"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-[#123B67]/20 bg-white hover:bg-[#EAF4FF]/70 text-[#123B67] font-semibold text-sm sm:text-base transition-colors min-h-[48px] whitespace-nowrap shrink-0"
                >
                  {t.hero.findHelperBtn}
                </a>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative aspect-[16/11] sm:aspect-[16/10] rounded-2xl overflow-hidden border border-[#123B67]/12 bg-[#EAF4FF] shadow-[0_24px_56px_-18px_rgba(11,37,69,0.22)]">
                {!heroImgFailed ? (
                  <img
                    src="/src/assets/images/hero_airport_assistance_1794979398722.jpg"
                    alt="Uniformed PortoAssist helper assisting a traveler with wheelchair and rolling luggage inside a bright airport terminal"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#123B67] to-[#0B2545] flex flex-col items-center justify-center p-8 text-center text-white">
                    <Luggage className="w-14 h-14 text-[#16A6A1] mb-3" aria-hidden="true" />
                    <p className="font-display text-xl font-bold">
                      Verified Airport &amp; Station Escorts
                    </p>
                    <p className="text-sm text-blue-100 mt-1 max-w-sm">
                      Reliable luggage porters and wheelchair mobility support across major transit terminals.
                    </p>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0B2545]/90 via-[#0B2545]/50 to-transparent p-5 sm:p-6 text-white">
                  <p className="text-sm sm:text-base font-semibold">
                    Verified Airport, Railway &amp; Bus Terminal Escorts
                  </p>
                  <p className="text-xs sm:text-sm text-blue-100 mt-0.5">
                    English · ಕನ್ನಡ · हिन्दी · OTP-verified luggage handover
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* FIRST-TIME WELCOME PORTAL (Preserved intact when not logged in) */}
          {!user && (
            <div className="space-y-5 pt-2">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0B2545]">
                    Welcome to PortoAssist
                  </h2>
                  <p className="text-sm text-[#526174] mt-0.5">
                    Accessible luggage assistance and mobility support for everyone. Choose how you would like to continue:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {/* OPTION 1: PASSENGER */}
                <div className="pa-card pa-card-interactive p-6 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <div className="w-11 h-11 rounded-xl bg-[#EAF4FF] text-[#123B67] flex items-center justify-center">
                      <Users className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-[#0B2545]">
                      I am a Passenger
                    </h3>
                    <p className="text-sm sm:text-base text-[#526174] leading-relaxed">
                      I need assistance with my luggage and travel.
                    </p>
                  </div>
                  <div className="space-y-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => onNavigateAuth('register', 'PASSENGER')}
                      className="w-full min-h-[48px] px-5 py-3 rounded-lg bg-[#123B67] hover:bg-[#0B2545] text-white font-semibold text-sm sm:text-base transition-colors flex items-center justify-center gap-2"
                    >
                      Register as Passenger
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateAuth('login', 'PASSENGER')}
                      className="w-full min-h-[48px] px-5 py-3 rounded-lg border border-slate-300 bg-white hover:bg-[#EAF4FF]/60 text-[#123B67] font-semibold text-sm sm:text-base transition-colors"
                    >
                      Passenger Sign In
                    </button>
                  </div>
                </div>

                {/* OPTION 2: HELPER */}
                <div className="pa-card pa-card-interactive p-6 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <div className="w-11 h-11 rounded-xl bg-[#EAF4FF] text-[#16A6A1] flex items-center justify-center">
                      <UserCheck className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-[#0B2545]">
                      I am a Helper
                    </h3>
                    <p className="text-sm sm:text-base text-[#526174] leading-relaxed">
                      I want to provide luggage and mobility assistance.
                    </p>
                  </div>
                  <div className="space-y-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => onNavigateAuth('register', 'HELPER')}
                      className="w-full min-h-[48px] px-5 py-3 rounded-lg bg-[#16A6A1] hover:bg-[#11827E] text-white font-semibold text-sm sm:text-base transition-colors flex items-center justify-center gap-2"
                    >
                      Register as Helper
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateAuth('login', 'HELPER')}
                      className="w-full min-h-[48px] px-5 py-3 rounded-lg border border-slate-300 bg-white hover:bg-[#EAF4FF]/60 text-[#123B67] font-semibold text-sm sm:text-base transition-colors"
                    >
                      Helper Sign In
                    </button>
                  </div>
                </div>

                {/* OPTION 3: VISUALLY IMPAIRED PASSENGER */}
                <div className="bg-gradient-to-br from-[#123B67] to-[#0B2545] text-white border border-[#0B2545] rounded-xl p-6 flex flex-col justify-between space-y-6 shadow-[0_14px_34px_-14px_rgba(11,37,69,0.45)]">
                  <div className="space-y-3">
                    <div className="w-11 h-11 rounded-xl bg-[#16A6A1] text-white flex items-center justify-center">
                      <Mic className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-white">
                      Voice Assistance for Visually Impaired
                    </h3>
                    <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
                      Navigate, register, sign in and book assistance using your voice.
                    </p>
                  </div>
                  <div className="space-y-2.5 pt-2">
                    <button
                      type="button"
                      onClick={onOpenVoice}
                      className="w-full min-h-[58px] px-5 py-3.5 rounded-xl bg-[#16A6A1] hover:bg-[#11827E] text-white border-2 border-white/90 font-bold text-base tracking-wide transition-colors flex items-center justify-center gap-3 shadow-md focus-visible:outline-4 focus-visible:outline-white"
                      aria-label="START VOICE ASSISTANT for visually impaired passengers"
                    >
                      <Mic className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <span>START VOICE ASSISTANT</span>
                    </button>
                    <p className="text-xs text-blue-100 text-center">
                      English · ಕನ್ನಡ · हिन्दी · Shortcut: Alt + V
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4-Column Proof Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-8 border-t border-slate-200/80">
            <div>
              <p className="font-mono text-2xl font-bold text-[#0B2545] tabular-nums">4 min</p>
              <p className="text-sm text-[#526174] mt-1">Average station helper arrival after match</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-[#0B2545] tabular-nums">100%</p>
              <p className="text-sm text-[#526174] mt-1">Backend OTP &amp; QR luggage handover check</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-[#0B2545] tabular-nums">3 Languages</p>
              <p className="text-sm text-[#526174] mt-1">Full voice &amp; UI support in EN, KN, HI</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-[#0B2545] tabular-nums">Upfront ₹</p>
              <p className="text-sm text-[#526174] mt-1">Itemized distance, bag, and mobility pricing</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ABOUT US SECTION */}
      <section id="about-section" className="bg-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-5">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-[#123B67]/10 bg-[#F5F8FC] shadow-[0_18px_40px_-16px_rgba(11,37,69,0.18)]">
              {!aboutImgFailed ? (
                <img
                  src="/src/assets/images/service_railway_porter_1794979399808.jpg"
                  alt="Uniformed PortoAssist railway porter organizing luggage safely beside an accessible terminal elevator"
                  referrerPolicy="no-referrer"
                  onError={() => setAboutImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#EAF4FF] flex flex-col items-center justify-center p-6 text-center">
                  <ShieldCheck className="w-12 h-12 text-[#123B67] mb-2" aria-hidden="true" />
                  <p className="font-display font-bold text-[#0B2545]">
                    Verified Station Assistance
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-5">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-[#16A6A1]">
              About Us
            </p>
            <h2
              className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0B2545] tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Built to make every airport, railway, and bus transfer effortless.
            </h2>
            <p className="text-base text-[#526174] leading-relaxed">
              Navigating crowded transit terminals with heavy luggage, elderly family members, wheelchairs, or visual impairment should never feel overwhelming. PortoAssist connects travelers directly with background-verified terminal helpers in minutes.
            </p>
            <p className="text-base text-[#526174] leading-relaxed">
              From smart helper matching and transparent fare estimation to hands-free multilingual voice booking and OTP-verified handovers, every step is crafted for dignity, speed, and complete peace of mind.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3">
              <div className="bg-[#F5F8FC] border border-slate-200/80 rounded-xl p-4">
                <p className="font-display font-bold text-[#0B2545] text-sm">Verified Staff</p>
                <p className="text-xs text-[#526174] mt-1">
                  Trained transit porters &amp; mobility escorts across major hubs.
                </p>
              </div>
              <div className="bg-[#F5F8FC] border border-slate-200/80 rounded-xl p-4">
                <p className="font-display font-bold text-[#0B2545] text-sm">Voice-First Access</p>
                <p className="text-xs text-[#526174] mt-1">
                  Continuous spoken booking for blind and visually impaired flyers.
                </p>
              </div>
              <div className="bg-[#F5F8FC] border border-slate-200/80 rounded-xl p-4">
                <p className="font-display font-bold text-[#0B2545] text-sm">End-to-End Safety</p>
                <p className="text-xs text-[#526174] mt-1">
                  Live map tracking plus 6-digit OTP &amp; QR delivery verification.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SERVICES SECTION (5 MODERN CARDS) */}
      <section
        id="services-section"
        className="bg-[#F5F8FC] border-y border-slate-200/80 py-16 lg:py-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-10 space-y-2">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-[#16A6A1]">
              Our Services
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight">
              {t.sections.servicesTitle}
            </h2>
            <p className="text-[#526174] text-base">{t.sections.servicesLead}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 items-stretch">
            {serviceCards.map((card, index) => (
              <div
                key={card.title}
                className={`pa-card pa-card-interactive p-6 flex flex-col justify-between space-y-5 ${
                  index < 2 ? 'lg:col-span-3' : 'lg:col-span-2'
                }`}
              >
                <div className="space-y-4">
                  <div
                    className={`w-12 h-12 rounded-xl ${card.badgeBg} flex items-center justify-center`}
                  >
                    {card.icon}
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display text-lg sm:text-xl font-bold text-[#0B2545]">
                      {card.title}
                    </h3>
                    <p className="text-sm text-[#526174] leading-relaxed">{card.description}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-[#526174]">{card.meta}</span>
                  <button
                    type="button"
                    onClick={card.onClick}
                    className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#16A6A1] hover:text-[#11827E] whitespace-nowrap shrink-0"
                  >
                    <span>{card.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS (4-STEP TIMELINE) */}
      <section id="how-it-works-section" className="bg-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-12 space-y-2">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-[#16A6A1]">
              How It Works
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight">
              {t.sections.howTitle}
            </h2>
            <p className="text-[#526174] text-base">
              Four effortless steps from terminal arrival to verified luggage handover.
            </p>
          </div>

          <div className="relative">
            {/* Desktop connecting track */}
            <div
              className="hidden lg:block absolute top-8 left-12 right-12 h-0.5 bg-[#EAF4FF]"
              aria-hidden="true"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
              {howItWorksSteps.map((step) => (
                <div key={step.number} className="pa-card p-6 space-y-4 relative">
                  <div className="flex items-center justify-between">
                    <span className="w-11 h-11 rounded-xl bg-[#123B67] text-white font-mono text-sm font-bold flex items-center justify-center shadow-xs">
                      {step.number}
                    </span>
                    <span className="h-1 flex-1 ml-3 rounded-full bg-[#EAF4FF] lg:hidden" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display text-lg font-bold text-[#0B2545]">{step.title}</h3>
                    <p className="text-sm text-[#526174] leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. ACCESSIBILITY SECTION ("TRAVEL WITHOUT BARRIERS") */}
      <section
        id="accessibility-section"
        aria-labelledby="accessibility-heading"
        className="bg-gradient-to-br from-[#0B2545] via-[#123B67] to-[#0B2545] text-white py-16 lg:py-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-[#16A6A1]">
              Accessible By Design
            </p>
            <h2
              id="accessibility-heading"
              className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Travel Without Barriers
            </h2>
            <p className="text-base text-blue-100 leading-relaxed max-w-xl">
              Blind and visually impaired travelers can complete registration, sign in, select locations, confirm fares, and receive live booking &amp; OTP updates completely hands-free through natural conversation.
            </p>

            <ul className="space-y-3.5 text-sm sm:text-base text-blue-50">
              {[
                {
                  icon: <Headphones className="w-5 h-5 text-[#16A6A1] shrink-0 mt-0.5" />,
                  title: 'Hands-free AI Voice Assistant',
                  detail: 'One activation begins continuous conversation without repeated taps.',
                },
                {
                  icon: <Globe className="w-5 h-5 text-[#16A6A1] shrink-0 mt-0.5" />,
                  title: 'Multilingual support (English, Kannada, Hindi)',
                  detail: 'Speak and hear clear prompts in your preferred language.',
                },
                {
                  icon: <Mic className="w-5 h-5 text-[#16A6A1] shrink-0 mt-0.5" />,
                  title: 'Voice-guided booking',
                  detail: 'Step-by-step spoken pickup, destination, bag count, and fare check.',
                },
                {
                  icon: <Accessibility className="w-5 h-5 text-[#16A6A1] shrink-0 mt-0.5" />,
                  title: 'Accessible navigation',
                  detail: 'High-contrast hierarchy, Large Text scaling, and Alt + V keyboard launch.',
                },
                {
                  icon: <Volume2 className="w-5 h-5 text-[#16A6A1] shrink-0 mt-0.5" />,
                  title: 'Spoken booking updates',
                  detail: 'Hear your booking ID, helper arrival details, and 6-digit OTP clearly.',
                },
              ].map((feat) => (
                <li key={feat.title} className="flex items-start gap-3">
                  {feat.icon}
                  <div>
                    <strong className="text-white font-semibold">{feat.title}</strong>
                    <span className="text-blue-200"> — {feat.detail}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onOpenVoice}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#16A6A1] hover:bg-[#11827E] text-white font-bold text-base transition-colors min-h-[52px] whitespace-nowrap shrink-0 shadow-[0_12px_28px_-8px_rgba(22,166,161,0.55)] focus-visible:outline-4 focus-visible:outline-white"
              >
                <Mic className="w-5 h-5" aria-hidden="true" />
                <span>Try Voice Assistant</span>
              </button>
              <span className="text-xs sm:text-sm text-blue-200 font-mono">
                Press Alt + V anytime
              </span>
            </div>
          </div>

          {/* Interactive Spoken Flow Showcase Card */}
          <div className="lg:col-span-6">
            <div className="bg-white/[0.07] border border-white/15 rounded-2xl p-6 sm:p-8 space-y-6 backdrop-blur-xs shadow-[0_24px_54px_-18px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#16A6A1] text-white flex items-center justify-center">
                    <Mic className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-white text-base">
                      Continuous Voice Booking Flow
                    </p>
                    <p className="text-xs text-blue-200">
                      Eyes-free conversation from welcome to OTP
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-[#16A6A1] font-semibold">EN · KN · HI</span>
              </div>

              <div className="space-y-3">
                {[
                  {
                    step: '01',
                    speaker: 'Assistant',
                    line: '"Welcome to PortoAssist. Which language do you prefer — English, Kannada, or Hindi?"',
                  },
                  {
                    step: '02',
                    speaker: 'Passenger',
                    line: '"English. Please book luggage and wheelchair help at KSR Bengaluru Gate 1."',
                  },
                  {
                    step: '03',
                    speaker: 'Assistant',
                    line: '"Matched with Lakshmi. Estimated fare ₹240. Shall I confirm your booking?"',
                  },
                  {
                    step: '04',
                    speaker: 'Confirmed',
                    line: '"Booking confirmed! Your helper arrives in 4 minutes. Your handover OTP is spoken aloud."',
                  },
                ].map((turn) => (
                  <div
                    key={turn.step}
                    className="rounded-xl bg-[#0B2545]/70 border border-white/10 p-3.5 flex items-start gap-3"
                  >
                    <span className="font-mono text-xs font-bold text-[#16A6A1] pt-0.5 shrink-0">
                      {turn.step}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                        {turn.speaker}
                      </p>
                      <p className="text-xs sm:text-sm text-white/95 mt-0.5 leading-relaxed">
                        {turn.line}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. WHY CHOOSE PORTOASSIST? (6 BALANCED CARDS) */}
      <section
        id="why-choose-section"
        className="bg-[#F5F8FC] border-b border-slate-200/80 py-16 lg:py-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-[#16A6A1]">
              Why Choose PortoAssist?
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight">
              {t.sections.whyTitle}
            </h2>
            <p className="text-[#526174] text-base">
              Built for safety, clarity, and dignity across every terminal transfer.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyChooseItems.map((item) => (
              <div key={item.title} className="pa-card pa-card-interactive p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAF4FF] flex items-center justify-center">
                  {item.icon}
                </div>
                <h3 className="font-display text-lg font-bold text-[#0B2545]">{item.title}</h3>
                <p className="text-sm text-[#526174] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. VERIFIED HELPERS DIRECTORY ("Find a Helper") */}
      <section id="verified-helpers-section" className="bg-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-[#16A6A1]">
                Trusted Transit Team
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight">
                {t.sections.helpersTitle}
              </h2>
              <p className="text-[#526174]">
                Background-checked mobility and luggage specialists ready across major transit hubs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(primaryBookRoute)}
              className="px-5 py-2.5 rounded-xl bg-[#16A6A1] hover:bg-[#11827E] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              Match Nearest Helper
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {helpers.map((h) => (
              <div
                key={h.helperId}
                className="pa-card pa-card-interactive p-6 flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start gap-4">
                  {!failedAvatars[h.helperId] && h.avatarUrl ? (
                    <img
                      src={h.avatarUrl}
                      alt={h.fullName}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedAvatars((prev) => ({ ...prev, [h.helperId]: true }))
                      }
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[#EAF4FF] text-[#123B67] font-display font-bold text-xl flex items-center justify-center shrink-0">
                      {h.fullName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold text-[#0B2545] truncate">
                      {h.fullName}
                    </h3>
                    <p className="text-xs text-[#526174] mt-0.5 tabular-nums">
                      {h.rating.toFixed(2)} ★ ({h.totalReviews} reviews) · {h.completedJobs} trips
                    </p>
                    <p className="text-xs font-semibold text-[#11827E] mt-1">
                      {h.isAvailable ? 'Available Now' : 'Currently Busy'} · {h.experienceYears} yrs exp
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-[#526174] border-t border-slate-100 pt-3">
                  <p>
                    <strong className="text-[#0B2545]">Hub:</strong> {h.currentLocation}
                  </p>
                  <p>
                    <strong className="text-[#0B2545]">Languages:</strong> {h.languagesKnown}
                  </p>
                  <p>
                    <strong className="text-[#0B2545]">Specialties:</strong> {h.assistanceCategories}
                  </p>
                  <p className="tabular-nums">
                    <strong className="text-[#0B2545]">Capacity:</strong> Up to {h.maxBags} bags /{' '}
                    {h.maxWeightKg} kg
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate(primaryBookRoute)}
                  className="w-full py-2.5 px-4 rounded-lg border border-[#123B67] text-[#123B67] hover:bg-[#123B67] hover:text-white text-sm font-semibold transition-colors"
                >
                  Book Assistance
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. TRAVELER STORIES (TESTIMONIALS) */}
      <section className="bg-[#F5F8FC] border-y border-slate-200/80 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-[#16A6A1]">
                Passenger Feedback
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B2545] mt-1">
                {t.sections.testimonialsTitle}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <blockquote className="pa-card p-6 sm:p-7 space-y-4">
              <div className="flex items-center gap-1 text-amber-500">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className="w-4 h-4 fill-current" aria-hidden="true" />
                ))}
              </div>
              <p className="text-sm sm:text-base text-[#0B2545]/90 leading-relaxed">
                &ldquo;My 72-year-old mother traveled alone into KSR Bengaluru with three heavy suitcases. Lakshmi met her at Gate 1 with a wheelchair and spoke Kannada throughout — turning a stressful arrival into a 12-minute breeze.&rdquo;
              </p>
              <footer className="text-xs text-[#526174] pt-3 border-t border-slate-100">
                <strong className="text-[#0B2545]">Ananya Rao</strong> · Product Architect, Bengaluru
              </footer>
            </blockquote>

            <blockquote className="pa-card p-6 sm:p-7 space-y-4">
              <div className="flex items-center gap-1 text-amber-500">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className="w-4 h-4 fill-current" aria-hidden="true" />
                ))}
              </div>
              <p className="text-sm sm:text-base text-[#0B2545]/90 leading-relaxed">
                &ldquo;Using voice booking in Hindi before landing at Terminal 1 gave us an instant fare estimate and Arjun&apos;s live map location at Lane 4. The OTP handover gave our family total peace of mind.&rdquo;
              </p>
              <footer className="text-xs text-[#526174] pt-3 border-t border-slate-100">
                <strong className="text-[#0B2545]">Mohan Sharma</strong> · Retired Civil Engineer, Jaipur
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* 9. CONTACT & SUPPORT SECTION */}
      <section id="contact-section" className="bg-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 space-y-5">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-[#16A6A1]">
              Contact &amp; Dispatch
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight">
              {t.sections.contactTitle}
            </h2>
            <p className="text-[#526174] text-sm sm:text-base leading-relaxed">
              Need group wheelchair coordination, station accessibility info, or help with an existing booking? Reach our 24/7 dispatch desk.
            </p>
            <div className="space-y-3 text-sm text-[#0B2545] pt-2">
              <p className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#16A6A1]" aria-hidden="true" />
                <span className="font-mono">+91 80 4411 2200 (24/7 Accessible Helpline)</span>
              </p>
              <p className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-[#16A6A1]" aria-hidden="true" />
                <span>KSR Bengaluru · Kempegowda Airport T1/T2 · Majestic Hub</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleContactSubmit} className="lg:col-span-7 pa-card p-6 sm:p-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact-name" className="block text-xs font-semibold text-[#0B2545] mb-1.5">
                  Your Name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-[#0B2545] focus:border-[#16A6A1] focus:ring-2 focus:ring-[#16A6A1]/20 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-xs font-semibold text-[#0B2545] mb-1.5">
                  Email Address
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-[#0B2545] focus:border-[#16A6A1] focus:ring-2 focus:ring-[#16A6A1]/20 focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div>
              <label htmlFor="contact-subject" className="block text-xs font-semibold text-[#0B2545] mb-1.5">
                Subject
              </label>
              <input
                id="contact-subject"
                type="text"
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
                placeholder="Wheelchair coordination or station query"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-[#0B2545] focus:border-[#16A6A1] focus:ring-2 focus:ring-[#16A6A1]/20 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="contact-message" className="block text-xs font-semibold text-[#0B2545] mb-1.5">
                Message
              </label>
              <textarea
                id="contact-message"
                rows={3}
                required
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Tell us your terminal, date, or support question..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-[#0B2545] focus:border-[#16A6A1] focus:ring-2 focus:ring-[#16A6A1]/20 focus:outline-none transition-colors"
              />
            </div>
            {contactFeedback && (
              <p
                className={`text-sm font-medium ${
                  contactStatus === 'error' ? 'text-red-700' : 'text-[#11827E]'
                }`}
              >
                {contactFeedback}
              </p>
            )}
            <button
              type="submit"
              disabled={contactStatus === 'sending'}
              className="px-6 py-3 rounded-xl bg-[#123B67] hover:bg-[#0B2545] text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {contactStatus === 'sending' ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0B2545] text-slate-200 border-t border-[#123B67]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-2">
            <BrandLogo invert />
            <p className="text-xs text-slate-300">
              {t.tagline} · Accessible Luggage &amp; Mobility Support Platform
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <button
              type="button"
              onClick={() => onNavigate('home', 'about-section')}
              className="hover:text-white hover:underline underline-offset-4"
            >
              About Us
            </button>
            <button
              type="button"
              onClick={() => onNavigate(primaryBookRoute)}
              className="hover:text-white hover:underline underline-offset-4"
            >
              Book Assistance
            </button>
            <button
              type="button"
              onClick={() => onNavigateAuth('login', 'PASSENGER')}
              className="hover:text-white hover:underline underline-offset-4"
            >
              Passenger Portal
            </button>
            <button
              type="button"
              onClick={() => onNavigateAuth('login', 'HELPER')}
              className="hover:text-white hover:underline underline-offset-4"
            >
              Helper Sign In
            </button>
            <button
              type="button"
              onClick={() => onNavigateAuth('register', 'HELPER')}
              className="hover:text-white hover:underline underline-offset-4"
            >
              Become a Helper
            </button>
          </div>
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} PortoAssist Transit Mobility. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
