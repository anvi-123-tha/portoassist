import { useCallback, useEffect, useState } from 'react';
import { AudioLines, Mic } from 'lucide-react';
import { apiRequest, connectRealtimeSocket, getStoredToken, setStoredToken } from './api';
import { AuthPage } from './components/AuthPage';
import { BookingPage } from './components/BookingPage';
import { HelperDashboard } from './components/HelperDashboard';
import { HomePage } from './components/HomePage';
import { Navbar } from './components/Navbar';
import { PassengerDashboard } from './components/PassengerDashboard';
import { TrackingMap } from './components/TrackingMap';
import { VoiceAssistant, type VoiceAction } from './components/VoiceAssistant';
import type {
  AppRoute,
  BookingRecord,
  Language,
  NotificationItem,
  UserProfile,
  UserRole,
} from './types';

export default function App() {
  const [route, setRoute] = useState<AppRoute>('home');
  const [authRole, setAuthRole] = useState<UserRole>('PASSENGER');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [language, setLanguage] = useState<Language>('en');
  const [largeText, setLargeText] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceInitialMode, setVoiceInitialMode] = useState<'guided' | 'live'>('guided');
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [passengerTab, setPassengerTab] = useState<
    'overview' | 'bookings' | 'track' | 'history' | 'payments' | 'profile' | 'support'
  >('overview');

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('portoassist_lang', lang);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('large-text', largeText);
  }, [largeText]);

  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  useEffect(() => {
    const onShortcut = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setVoiceOpen(true);
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  const fetchUserScopedData = useCallback(async (activeUser: UserProfile | null) => {
    if (!activeUser) {
      setBookings([]);
      setNotifications([]);
      return;
    }
    try {
      const [bRes, nRes] = await Promise.all([
        apiRequest<{ bookings: BookingRecord[] }>('/api/bookings'),
        apiRequest<{ notifications: NotificationItem[] }>('/api/notifications'),
      ]);
      setBookings(bRes.bookings);
      setNotifications(nRes.notifications);
      if (bRes.bookings.length > 0) {
        setSelectedBookingId((prev) => prev || bRes.bookings[0].id);
      }
    } catch {
      // ignore if token expired
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setAuthReady(true);
      return;
    }
    apiRequest<{ user: UserProfile }>('/api/auth/me')
      .then((res) => {
        setUser(res.user);
        return fetchUserScopedData(res.user);
      })
      .catch(() => {
        setStoredToken(null);
      })
      .finally(() => {
        setAuthReady(true);
      });
  }, [fetchUserScopedData]);

  // Real-time WebSocket connection for booking & helper location updates
  useEffect(() => {
    if (!user) return;
    const ws = connectRealtimeSocket((event, payload) => {
      if (event === 'booking:created' || event === 'booking:updated') {
        fetchUserScopedData(user);
      } else if (event === 'helper:location' && payload?.bookingId) {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === payload.bookingId && b.assignment
              ? {
                  ...b,
                  assignment: {
                    ...b.assignment,
                    helper_lat: payload.lat,
                    helper_lng: payload.lng,
                    distance_km: payload.distanceKm,
                    eta_minutes: payload.etaMinutes,
                    helper_location: payload.locationLabel,
                  },
                }
              : b
          )
        );
      } else if (event === 'notification:new' && payload) {
        setNotifications((prev) => [payload, ...prev]);
      }
    });
    return () => {
      ws?.close();
    };
  }, [user, fetchUserScopedData]);

  const navigate = (targetRoute: AppRoute, anchorId?: string) => {
    let resolvedRoute: AppRoute = targetRoute;
    if (targetRoute === 'passenger-dashboard') {
      if (!user) resolvedRoute = 'login';
      else if (user.role !== 'PASSENGER') resolvedRoute = 'helper-dashboard';
    } else if (targetRoute === 'helper-dashboard') {
      if (!user) resolvedRoute = 'login';
      else if (user.role !== 'HELPER') resolvedRoute = 'passenger-dashboard';
    } else if (targetRoute === 'book' && user?.role === 'HELPER') {
      resolvedRoute = 'helper-dashboard';
    }

    setRoute(resolvedRoute);
    if (anchorId && resolvedRoute === 'home') {
      setTimeout(() => {
        const el = document.getElementById(anchorId);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navigateAuth = (mode: 'login' | 'register', role: UserRole) => {
    setAuthRole(role);
    navigate(mode);
  };

  const handleAuthSuccess = async (loggedUser: UserProfile, redirectRoute: AppRoute) => {
    setUser(loggedUser);
    await fetchUserScopedData(loggedUser);
    navigate(redirectRoute);
  };

  const handleLogout = () => {
    setStoredToken(null);
    setUser(null);
    setBookings([]);
    setNotifications([]);
    navigate('home');
  };

  const handleBookingCreated = async (newBooking: BookingRecord) => {
    setSelectedBookingId(newBooking.id);
    if (user) {
      await fetchUserScopedData(user);
      setPassengerTab('track');
      navigate('passenger-dashboard');
    }
  };

  const handleVoiceAction = async (action: VoiceAction): Promise<string> => {
    if (action === 'BOOK_HELPER') {
      setVoiceOpen(false);
      navigate('book');
      return 'Opened the Book Assistance form.';
    }
    if (action === 'SHOW_FARE') {
      setVoiceOpen(false);
      navigate('book');
      return 'Showing the transparent fare estimator.';
    }
    if (action === 'CONTACT_SUPPORT') {
      setVoiceOpen(false);
      if (user?.role === 'PASSENGER') {
        setPassengerTab('support');
        navigate('passenger-dashboard');
        return 'Opened Help and Support in your passenger dashboard.';
      }
      navigate('home', 'contact-section');
      return 'Scrolled to the 24/7 contact support form.';
    }
    if (action === 'SHOW_BOOKINGS') {
      setVoiceOpen(false);
      if (!user) {
        navigate('login');
        return 'Please sign in to view your bookings.';
      }
      if (user.role === 'PASSENGER') {
        setPassengerTab('bookings');
        navigate('passenger-dashboard');
      } else {
        navigate('helper-dashboard');
      }
      return `Showing your ${bookings.length} bookings.`;
    }
    if (action === 'TRACK_HELPER') {
      if (!user) {
        return 'Please sign in to track your helper.';
      }
      navigate('track');
      return 'Opened live OpenStreetMap helper tracking.';
    }
    if (action === 'CANCEL_BOOKING') {
      const active = bookings.find(
        (b) => b.status !== 'Assistance Completed' && b.status !== 'Booking Cancelled'
      );
      if (!active) {
        return 'You have no active booking to cancel.';
      }
      await apiRequest(`/api/bookings/${active.id}/cancel`, { method: 'PATCH' });
      await fetchUserScopedData(user);
      return `Cancelled booking ${active.booking_code}.`;
    }
    return 'Done.';
  };

  const activeTrackBooking =
    bookings.find((b) => b.id === selectedBookingId) ||
    bookings.find((b) => b.status !== 'Assistance Completed' && b.status !== 'Booking Cancelled') ||
    bookings[0] ||
    null;

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-[#123B67] font-display font-semibold">
        Loading PortoAssist...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Navbar
        route={route}
        onNavigate={navigate}
        onNavigateAuth={navigateAuth}
        user={user}
        onLogout={handleLogout}
        language={language}
        onChangeLanguage={handleLanguageChange}
        largeText={largeText}
        onToggleLargeText={() => setLargeText((p) => !p)}
        onOpenVoice={() => setVoiceOpen(true)}
      />

      <div className="flex-1">
        {route === 'home' && (
          <HomePage
            language={language}
            user={user}
            onNavigate={navigate}
            onNavigateAuth={navigateAuth}
            onOpenVoice={() => setVoiceOpen(true)}
          />
        )}

        {(route === 'login' || route === 'register') && (
          <AuthPage
            initialMode={route}
            initialRole={authRole}
            onAuthSuccess={handleAuthSuccess}
          />
        )}

        {route === 'book' && (
          <BookingPage
            language={language}
            user={user}
            onRequireLogin={() => navigate('login')}
            onBookingCreated={handleBookingCreated}
            onNavigate={navigate}
          />
        )}

        {route === 'track' && (
          <div className="bg-[#F5F8FC] min-h-[calc(100vh-140px)] py-8 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 pa-card p-5">
                <div>
                  <h1 className="font-display text-2xl font-bold text-[#0B2545]">
                    Live Helper &amp; Handover Tracking
                  </h1>
                  <p className="text-sm text-[#526174]">
                    Real-time OpenStreetMap coordinates and OTP verification status
                  </p>
                </div>
                {bookings.length > 0 && (
                  <select
                    value={activeTrackBooking?.id || ''}
                    onChange={(e) => setSelectedBookingId(Number(e.target.value))}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-[#0B2545] bg-white focus:border-[#16A6A1] focus:outline-none"
                  >
                    {bookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.booking_code} — {b.pickup_location}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {activeTrackBooking ? (
                <TrackingMap
                  booking={activeTrackBooking}
                  language={language}
                  showOtpPanel={user?.role !== 'HELPER'}
                />
              ) : (
                <div className="pa-card p-8 text-center space-y-3">
                  <p className="text-[#526174]">No active bookings available to track.</p>
                  <button
                    type="button"
                    onClick={() => navigate('book')}
                    className="px-5 py-2.5 rounded-lg bg-[#123B67] hover:bg-[#0B2545] text-white text-sm font-semibold transition-colors"
                  >
                    Book Assistance Now
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {route === 'passenger-dashboard' &&
          (user?.role === 'PASSENGER' ? (
            <PassengerDashboard
              user={user}
              language={language}
              bookings={bookings}
              notifications={notifications}
              initialTab={passengerTab}
              selectedBookingId={selectedBookingId}
              onSelectBookingId={setSelectedBookingId}
              onRefreshData={() => fetchUserScopedData(user)}
              onUserUpdated={setUser}
              onNavigate={navigate}
            />
          ) : (
            <div className="max-w-xl mx-auto my-12 bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
              <h2 className="font-display text-xl font-bold text-[#123B67]">
                Passenger Access Required
              </h2>
              <p className="text-sm text-slate-600">
                {user?.role === 'HELPER'
                  ? 'You are signed in as a Helper and cannot access the Passenger Dashboard.'
                  : 'Please sign in with a Passenger account to access the Passenger Dashboard.'}
              </p>
              <button
                type="button"
                onClick={() => navigate(user?.role === 'HELPER' ? 'helper-dashboard' : 'login')}
                className="px-5 py-2.5 rounded-lg bg-[#123B67] text-white text-sm font-semibold"
              >
                {user?.role === 'HELPER' ? 'Go to Helper Dashboard' : 'Sign In'}
              </button>
            </div>
          ))}

        {route === 'helper-dashboard' &&
          (user?.role === 'HELPER' ? (
            <HelperDashboard
              user={user}
              language={language}
              bookings={bookings}
              notifications={notifications}
              onRefreshData={() => fetchUserScopedData(user)}
              onUserUpdated={setUser}
            />
          ) : (
            <div className="max-w-xl mx-auto my-12 bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
              <h2 className="font-display text-xl font-bold text-[#123B67]">
                Helper Access Required
              </h2>
              <p className="text-sm text-slate-600">
                {user?.role === 'PASSENGER'
                  ? 'You are signed in as a Passenger and cannot access the Helper Dashboard.'
                  : 'Please sign in with a Helper account to access the Helper Dashboard.'}
              </p>
              <button
                type="button"
                onClick={() => navigate(user?.role === 'PASSENGER' ? 'passenger-dashboard' : 'login')}
                className="px-5 py-2.5 rounded-lg bg-[#123B67] text-white text-sm font-semibold"
              >
                {user?.role === 'PASSENGER' ? 'Go to Passenger Dashboard' : 'Sign In'}
              </button>
            </div>
          ))}
      </div>

      {/* Floating High-Contrast Accessible Voice Triggers */}
      <div className="fixed bottom-5 right-5 z-30 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setVoiceInitialMode('live');
            setVoiceOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-[#16A6A1] hover:bg-[#11827E] text-white border-2 border-white shadow-[0_12px_28px_-6px_rgba(11,37,69,0.4)] font-bold text-sm transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-[#123B67]"
          aria-label="Start Live Voice Conversation"
        >
          <AudioLines className="w-5 h-5" />
          <span>Live Voice AI</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setVoiceInitialMode('guided');
            setVoiceOpen(true);
          }}
          className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full bg-[#123B67] hover:bg-[#0B2545] text-white border-2 border-white shadow-[0_12px_28px_-6px_rgba(11,37,69,0.45)] font-bold text-sm transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-[#16A6A1]"
          aria-label="Start Voice Assistant (Alt+V)"
        >
          <Mic className="w-5 h-5 text-[#16A6A1]" />
          <span>Start Voice Assistant</span>
        </button>
      </div>

      <VoiceAssistant
        open={voiceOpen}
        initialMode={voiceInitialMode}
        onClose={() => setVoiceOpen(false)}
        onReturnHome={() => {
          setVoiceOpen(false);
          navigate('home');
        }}
        language={language}
        onChangeLanguage={handleLanguageChange}
        user={user}
        bookings={bookings}
        onVoiceAuthSuccess={(loggedUser) => {
          setUser(loggedUser);
          void fetchUserScopedData(loggedUser);
          navigate(loggedUser.role === 'HELPER' ? 'helper-dashboard' : 'passenger-dashboard');
        }}
        onVoiceLogout={() => {
          setStoredToken(null);
          setUser(null);
          setBookings([]);
          setNotifications([]);
          navigate('home');
        }}
        onExecuteAction={handleVoiceAction}
        onVoiceBookingCompleted={(newBooking) => {
          setSelectedBookingId(newBooking.id);
          if (user) {
            void fetchUserScopedData(user);
          } else {
            setBookings((prev) => [newBooking, ...prev]);
          }
        }}
        onBookingCancelled={() => {
          if (user) {
            void fetchUserScopedData(user);
          }
        }}
      />
    </div>
  );
}
