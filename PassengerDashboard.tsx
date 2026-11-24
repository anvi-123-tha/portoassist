import React, { useEffect, useState } from 'react';
import {
  Bell,
  CreditCard,
  Flag,
  HelpCircle,
  History,
  LayoutDashboard,
  Luggage,
  MapPin,
  PlusCircle,
  RefreshCw,
  Star,
  User,
} from 'lucide-react';
import { apiRequest } from '../api';
import { I18N } from '../i18n';
import type {
  AppRoute,
  BookingRecord,
  Language,
  NotificationItem,
  SupportTicket,
  UserProfile,
} from '../types';
import { TrackingMap } from './TrackingMap';

type PassengerTab =
  | 'overview'
  | 'bookings'
  | 'track'
  | 'history'
  | 'payments'
  | 'profile'
  | 'support';

interface PassengerDashboardProps {
  user: UserProfile;
  language: Language;
  bookings: BookingRecord[];
  notifications: NotificationItem[];
  initialTab?: PassengerTab;
  selectedBookingId: number | null;
  onSelectBookingId: (id: number) => void;
  onRefreshData: () => Promise<void>;
  onUserUpdated: (user: UserProfile) => void;
  onNavigate: (route: AppRoute) => void;
}

export const PassengerDashboard: React.FC<PassengerDashboardProps> = ({
  user,
  language,
  bookings,
  notifications,
  initialTab = 'overview',
  selectedBookingId,
  onSelectBookingId,
  onRefreshData,
  onUserUpdated,
  onNavigate,
}) => {
  const t = I18N[language];
  const [tab, setTab] = useState<PassengerTab>(initialTab);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [actionMsg, setActionMsg] = useState('');
  const [actionErr, setActionErr] = useState('');

  // Review state
  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Safety Report / Block state
  const [reportBookingId, setReportBookingId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState('Safety / Conduct Concern');
  const [reportDetails, setReportDetails] = useState('');
  const [reportBlockUser, setReportBlockUser] = useState(true);

  // Profile form state
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone);
  const [prefLang, setPrefLang] = useState<Language>(user.preferred_language);
  const [age, setAge] = useState(user.passenger?.age ? String(user.passenger.age) : '');
  const [accessibility, setAccessibility] = useState(
    user.passenger?.accessibility_requirements || ''
  );
  const [emergencyContact, setEmergencyContact] = useState(
    user.passenger?.emergency_contact || ''
  );

  // Support form state
  const [supCategory, setSupCategory] = useState('Wheelchair / Mobility');
  const [supSubject, setSupSubject] = useState('');
  const [supDesc, setSupDesc] = useState('');
  const [supBookingId, setSupBookingId] = useState<string>('');

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    apiRequest<{ tickets: SupportTicket[] }>('/api/support')
      .then((res) => setTickets(res.tickets))
      .catch(() => {});
  }, []);

  const upcomingBookings = bookings.filter(
    (b) => b.status !== 'Assistance Completed' && b.status !== 'Booking Cancelled'
  );
  const completedBookings = bookings.filter((b) => b.status === 'Assistance Completed');
  const currentBooking =
    bookings.find((b) => b.id === selectedBookingId) ||
    upcomingBookings[0] ||
    bookings[0] ||
    null;

  const handleCancelBooking = async (bookingId: number) => {
    setActionErr('');
    setActionMsg('');
    try {
      await apiRequest(`/api/bookings/${bookingId}/cancel`, { method: 'PATCH' });
      setActionMsg('Booking cancelled and notification sent.');
      await onRefreshData();
    } catch (err: any) {
      setActionErr(err.message || 'Could not cancel booking.');
    }
  };

  const handleRetryMatch = async (bookingId: number) => {
    setActionErr('');
    setActionMsg('');
    try {
      const res = await apiRequest<{ matched: boolean; message?: string }>(
        `/api/bookings/${bookingId}/retry-match`,
        { method: 'POST' }
      );
      setActionMsg(
        res.matched
          ? 'Helper matched! Your booking has been assigned to an available nearby helper.'
          : res.message || 'No active helpers online nearby right now. Please try again shortly.'
      );
      await onRefreshData();
    } catch (err: any) {
      setActionErr(err.message || 'Unable to retry matching.');
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportBookingId) return;
    setActionErr('');
    setActionMsg('');
    try {
      const res = await apiRequest<{ message: string }>('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: reportBookingId,
          reason: reportReason,
          details: reportDetails,
          blockUser: reportBlockUser,
        }),
      });
      setActionMsg(res.message);
      setReportBookingId(null);
      setReportDetails('');
      await onRefreshData();
    } catch (err: any) {
      setActionErr(err.message || 'Unable to submit safety report.');
    }
  };

  const handlePayUpi = async (bookingId: number) => {
    setActionErr('');
    setActionMsg('');
    try {
      await apiRequest(`/api/bookings/${bookingId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ method: 'UPI', upiId: 'passenger@okicici' }),
      });
      setActionMsg('Simulated UPI payment confirmed.');
      await onRefreshData();
    } catch (err: any) {
      setActionErr(err.message || 'Payment failed.');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBookingId) return;
    setActionErr('');
    try {
      await apiRequest(`/api/bookings/${reviewBookingId}/review`, {
        method: 'POST',
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      setReviewBookingId(null);
      setReviewComment('');
      setActionMsg('Thank you! Your helper rating has been saved.');
      await onRefreshData();
    } catch (err: any) {
      setActionErr(err.message || 'Could not submit review.');
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionErr('');
    setActionMsg('');
    try {
      const res = await apiRequest<{ user: UserProfile }>('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName,
          phone,
          preferredLanguage: prefLang,
          age: age ? Number(age) : null,
          accessibilityRequirements: accessibility,
          emergencyContact,
        }),
      });
      onUserUpdated(res.user);
      setActionMsg('Profile updated successfully.');
    } catch (err: any) {
      setActionErr(err.message || 'Could not save profile.');
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionErr('');
    try {
      const res = await apiRequest<{ ticket: SupportTicket }>('/api/support', {
        method: 'POST',
        body: JSON.stringify({
          category: supCategory,
          subject: supSubject,
          description: supDesc,
          bookingId: supBookingId ? Number(supBookingId) : null,
        }),
      });
      setTickets((prev) => [res.ticket, ...prev]);
      setSupSubject('');
      setSupDesc('');
      setActionMsg('Support request submitted. Our dispatch team will respond shortly.');
    } catch (err: any) {
      setActionErr(err.message || 'Unable to submit support request.');
    }
  };

  const handleMarkNotificationsRead = async () => {
    await apiRequest('/api/notifications/read-all', { method: 'PATCH' }).catch(() => {});
    await onRefreshData();
  };

  const unreadCount = notifications.filter((n) => n.is_read === 0).length;

  const navItems: { id: PassengerTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'bookings', label: t.dashboard.myBookings, icon: <Luggage className="w-4 h-4" /> },
    { id: 'track', label: t.dashboard.trackHelper, icon: <MapPin className="w-4 h-4" /> },
    { id: 'history', label: t.dashboard.history, icon: <History className="w-4 h-4" /> },
    { id: 'payments', label: t.dashboard.payments, icon: <CreditCard className="w-4 h-4" /> },
    { id: 'profile', label: t.dashboard.profile, icon: <User className="w-4 h-4" /> },
    { id: 'support', label: t.dashboard.support, icon: <HelpCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-[#F5F8FC] min-h-[calc(100vh-140px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar */}
        <aside className="lg:col-span-3 pa-card p-4 space-y-2">
          <div className="px-3 py-2 border-b border-slate-200/80 mb-2">
            <p className="text-xs text-[#526174]">Passenger Portal</p>
            <p className="font-display font-bold text-[#0B2545] truncate">{user.full_name}</p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('book')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#16A6A1] hover:bg-[#11827E] text-white text-sm font-semibold transition-colors mb-2"
          >
            <PlusCircle className="w-4 h-4" />
            {t.dashboard.bookNew}
          </button>

          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === item.id
                  ? 'bg-[#EAF4FF] text-[#123B67] font-semibold'
                  : 'text-[#526174] hover:bg-[#F5F8FC] hover:text-[#0B2545]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        {/* Main Workspace */}
        <main className="lg:col-span-9 space-y-6">
          {/* Header & Notifications bar */}
          <div className="pa-card p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-[#0B2545]">
                {t.dashboard.welcome}, {user.full_name}
              </h1>
              <p className="text-sm text-[#526174] mt-0.5">
                {user.passenger?.accessibility_requirements ||
                  'Manage your luggage & mobility bookings, live tracking, and OTP handovers.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleMarkNotificationsRead}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-[#123B67] hover:bg-slate-50"
            >
              <Bell className="w-4 h-4 text-[#16A6A1]" />
              <span className="tabular-nums">{unreadCount} Unread Alerts</span>
            </button>
          </div>

          {actionMsg && (
            <div className="p-3.5 rounded-lg bg-teal-50 border border-teal-200 text-sm text-teal-900 font-medium">
              {actionMsg}
            </div>
          )}
          {actionErr && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 font-medium">
              {actionErr}
            </div>
          )}

          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="pa-card p-4">
                  <p className="text-xs text-[#526174]">{t.dashboard.totalBookings}</p>
                  <p className="font-mono text-2xl font-bold text-[#0B2545] mt-1 tabular-nums">
                    {bookings.length}
                  </p>
                </div>
                <div className="pa-card p-4">
                  <p className="text-xs text-[#526174]">{t.dashboard.upcomingBookings}</p>
                  <p className="font-mono text-2xl font-bold text-[#16A6A1] mt-1 tabular-nums">
                    {upcomingBookings.length}
                  </p>
                </div>
                <div className="pa-card p-4">
                  <p className="text-xs text-[#526174]">{t.dashboard.completedBookings}</p>
                  <p className="font-mono text-2xl font-bold text-[#0B2545] mt-1 tabular-nums">
                    {completedBookings.length}
                  </p>
                </div>
                <div className="pa-card p-4">
                  <p className="text-xs text-[#526174]">{t.dashboard.activeStatus}</p>
                  <p className="text-sm font-bold text-[#0B2545] mt-1.5 truncate">
                    {currentBooking ? currentBooking.status : 'No Active Trip'}
                  </p>
                </div>
              </div>

              {currentBooking ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-bold text-[#123B67]">
                      Active Trip Tracking &amp; Handover
                    </h2>
                    <button
                      type="button"
                      onClick={() => setTab('track')}
                      className="text-xs font-semibold text-[#16A6A1] hover:underline"
                    >
                      Open Full Tracking View →
                    </button>
                  </div>
                  <TrackingMap
                    booking={currentBooking}
                    language={language}
                    onRetryMatch={() => handleRetryMatch(currentBooking.id)}
                  />
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
                  <p className="font-display text-lg font-bold text-[#123B67]">
                    No bookings yet
                  </p>
                  <p className="text-sm text-slate-600">
                    Book your first airport, railway, or bus terminal luggage &amp; mobility helper.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('book')}
                    className="px-5 py-2.5 rounded-lg bg-[#123B67] text-white text-sm font-semibold"
                  >
                    Book Assistance
                  </button>
                </div>
              )}

              {/* Recent Notifications */}
              <div className="pa-card p-5 space-y-3">
                <h2 className="font-display text-base font-bold text-[#0B2545]">
                  Recent Notifications
                </h2>
                {notifications.length === 0 ? (
                  <p className="text-sm text-slate-500">No notifications yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.slice(0, 5).map((n) => (
                      <div key={n.id} className="py-2.5 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[#123B67]">{n.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 shrink-0">
                          {n.created_at.slice(0, 16)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MY BOOKINGS & HISTORY TABS */}
          {(tab === 'bookings' || tab === 'history') && (
            <div className="pa-card p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold text-[#0B2545]">
                  {tab === 'history' ? t.dashboard.history : t.dashboard.myBookings}
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('book')}
                  className="px-4 py-2 rounded-lg bg-[#16A6A1] text-white text-xs font-semibold"
                >
                  + New Booking
                </button>
              </div>

              {(tab === 'history'
                ? bookings.filter(
                    (b) =>
                      b.status === 'Assistance Completed' || b.status === 'Booking Cancelled'
                  )
                : bookings
              ).length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">
                  No bookings in this view.
                </p>
              ) : (
                <div className="space-y-4">
                  {(tab === 'history'
                    ? bookings.filter(
                        (b) =>
                          b.status === 'Assistance Completed' || b.status === 'Booking Cancelled'
                      )
                    : bookings
                  ).map((b) => (
                    <div
                      key={b.id}
                      className="border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-mono text-slate-500">
                            {b.booking_code} · {b.travel_type} · {b.travel_date} {b.travel_time}
                          </p>
                          <h3 className="font-display font-bold text-[#123B67] mt-0.5">
                            {b.pickup_location} → {b.dropoff_location}
                          </h3>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-[#123B67] tabular-nums">
                            ₹{b.estimated_fare}
                          </span>
                          <p className="text-xs font-semibold text-[#11827E]">
                            {t.statuses[b.status] || b.status}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
                        <div>
                          {b.assignment ? (
                            <span>
                              Helper: <strong className="text-[#123B67]">{b.assignment.helper_name}</strong> ({b.assignment.helper_rating}★)
                            </span>
                          ) : (
                            <span>Awaiting helper assignment</span>
                          )}
                          {b.otp && (
                            <span className="ml-3 font-mono text-[#123B67]">
                              OTP: <strong>{b.otp.otp_code}</strong>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectBookingId(b.id);
                              setTab('track');
                            }}
                            className="px-3 py-1.5 rounded-md bg-[#EAF4FF] text-[#123B67] font-semibold hover:bg-blue-100"
                          >
                            Track &amp; OTP
                          </button>

                          {b.payment?.status === 'PENDING' && b.status !== 'Booking Cancelled' && (
                            <button
                              type="button"
                              onClick={() => handlePayUpi(b.id)}
                              className="px-3 py-1.5 rounded-md bg-[#16A6A1] text-white font-semibold"
                            >
                              Pay UPI (Demo)
                            </button>
                          )}

                          {!b.assignment &&
                            b.status !== 'Assistance Completed' &&
                            b.status !== 'Booking Cancelled' && (
                              <button
                                type="button"
                                onClick={() => handleRetryMatch(b.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#16A6A1] text-white font-semibold hover:bg-[#11827E]"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Retry Helper Search
                              </button>
                            )}

                          {b.status !== 'Assistance Completed' &&
                            b.status !== 'Booking Cancelled' && (
                              <button
                                type="button"
                                onClick={() => handleCancelBooking(b.id)}
                                className="px-3 py-1.5 rounded-md border border-red-200 text-red-700 font-semibold hover:bg-red-50"
                              >
                                Cancel
                              </button>
                            )}

                          {b.status === 'Assistance Completed' && !b.review && b.assignment && (
                            <button
                              type="button"
                              onClick={() => setReviewBookingId(b.id)}
                              className="px-3 py-1.5 rounded-md border border-[#123B67] text-[#123B67] font-semibold hover:bg-slate-50"
                            >
                              Rate Helper
                            </button>
                          )}

                          {b.assignment && (
                            <button
                              type="button"
                              onClick={() =>
                                setReportBookingId(reportBookingId === b.id ? null : b.id)
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                            >
                              <Flag className="w-3.5 h-3.5 text-red-600" />
                              Report / Block
                            </button>
                          )}
                        </div>
                      </div>

                      {reportBookingId === b.id && b.assignment && (
                        <form
                          onSubmit={handleReportSubmit}
                          className="p-3.5 rounded-lg bg-red-50/70 border border-red-200 space-y-2.5"
                        >
                          <p className="text-xs font-bold text-red-900">
                            Report or Block Helper ({b.assignment.helper_name})
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <select
                              value={reportReason}
                              onChange={(e) => setReportReason(e.target.value)}
                              className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                            >
                              <option>Safety / Conduct Concern</option>
                              <option>Late Arrival / No-Show</option>
                              <option>Luggage Handling Issue</option>
                              <option>Overcharging Request</option>
                            </select>
                            <label className="inline-flex items-center gap-2 text-xs text-slate-800">
                              <input
                                type="checkbox"
                                checked={reportBlockUser}
                                onChange={(e) => setReportBlockUser(e.target.checked)}
                              />
                              Block this helper from future matches
                            </label>
                          </div>
                          <textarea
                            rows={2}
                            value={reportDetails}
                            onChange={(e) => setReportDetails(e.target.value)}
                            placeholder="Share details..."
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                          />
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="px-3.5 py-1.5 rounded-lg bg-red-700 text-white text-xs font-semibold"
                            >
                              Submit Report
                            </button>
                            <button
                              type="button"
                              onClick={() => setReportBookingId(null)}
                              className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold"
                            >
                              Close
                            </button>
                          </div>
                        </form>
                      )}

                      {b.review && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                          Your rating: {b.review.rating}★ — "{b.review.comment}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Rating Modal Inline */}
              {reviewBookingId && (
                <form
                  onSubmit={handleReviewSubmit}
                  className="p-4 rounded-xl bg-[#EAF4FF] border border-blue-200 space-y-3"
                >
                  <h3 className="font-display font-bold text-[#123B67] text-sm">
                    Rate Your Assistance Experience
                  </h3>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className={`p-1.5 rounded ${
                          reviewRating >= star ? 'text-amber-500' : 'text-slate-300'
                        }`}
                      >
                        <Star className="w-5 h-5 fill-current" />
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share feedback on timeliness, care, and luggage handling..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#123B67] text-white text-xs font-semibold"
                    >
                      Submit Review
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewBookingId(null)}
                      className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold"
                    >
                      Close
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TRACK HELPER TAB */}
          {tab === 'track' && (
            <div className="space-y-4">
              {bookings.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <label className="text-xs font-semibold text-slate-700">
                    Select Booking to Track:
                  </label>
                  <select
                    value={currentBooking?.id || ''}
                    onChange={(e) => onSelectBookingId(Number(e.target.value))}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    {bookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.booking_code} — {b.pickup_location} ({b.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {currentBooking ? (
                <TrackingMap
                  booking={currentBooking}
                  language={language}
                  onRetryMatch={() => handleRetryMatch(currentBooking.id)}
                />
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
                  No active booking to track.
                </div>
              )}
            </div>
          )}

          {/* PAYMENTS TAB */}
          {tab === 'payments' && (
            <div className="pa-card p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#0B2545]">
                {t.dashboard.payments}
              </h2>
              <p className="text-xs text-slate-500">
                All online UPI transactions on this platform use a simulated demonstration ledger.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2.5 pr-4">Booking</th>
                      <th className="py-2.5 pr-4">Method</th>
                      <th className="py-2.5 pr-4">Reference</th>
                      <th className="py-2.5 pr-4">Status</th>
                      <th className="py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="py-3 pr-4 font-mono text-xs">{b.booking_code}</td>
                        <td className="py-3 pr-4">{b.payment?.method || b.payment_method}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-slate-600">
                          {b.payment?.transaction_ref || '—'}
                        </td>
                        <td className="py-3 pr-4 text-xs font-semibold text-[#123B67]">
                          {b.payment?.status || 'PENDING'}
                        </td>
                        <td className="py-3 text-right font-mono font-semibold tabular-nums">
                          ₹{b.estimated_fare}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PROFILE TAB */}
          {tab === 'profile' && (
            <form
              onSubmit={handleProfileSave}
              className="pa-card p-6 space-y-4"
            >
              <h2 className="font-display text-lg font-bold text-[#0B2545]">
                {t.dashboard.profile}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preferred Language
                  </label>
                  <select
                    value={prefLang}
                    onChange={(e) => setPrefLang(e.target.value as Language)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    <option value="en">English</option>
                    <option value="kn">ಕನ್ನಡ (Kannada)</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Accessibility Requirements
                  </label>
                  <input
                    type="text"
                    value={accessibility}
                    onChange={(e) => setAccessibility(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-[#123B67] text-white text-sm font-semibold"
              >
                Save Profile Changes
              </button>
            </form>
          )}

          {/* SUPPORT TAB */}
          {tab === 'support' && (
            <div className="space-y-6">
              <form
                onSubmit={handleSupportSubmit}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <h2 className="font-display text-lg font-bold text-[#123B67]">
                  Submit Support or Accessibility Request
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Category
                    </label>
                    <select
                      value={supCategory}
                      onChange={(e) => setSupCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white"
                    >
                      <option>Wheelchair / Mobility</option>
                      <option>Booking Issue</option>
                      <option>Luggage Safety</option>
                      <option>Payment / Refund</option>
                      <option>Accessibility Feedback</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Related Booking (Optional)
                    </label>
                    <select
                      value={supBookingId}
                      onChange={(e) => setSupBookingId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white"
                    >
                      <option value="">None</option>
                      {bookings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.booking_code} — {b.travel_type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={supSubject}
                    onChange={(e) => setSupSubject(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Details *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={supDesc}
                    onChange={(e) => setSupDesc(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#16A6A1] text-white text-sm font-semibold"
                >
                  Submit Ticket
                </button>
              </form>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                <h3 className="font-display font-bold text-[#123B67]">Your Support Tickets</h3>
                {tickets.length === 0 ? (
                  <p className="text-sm text-slate-500">No support tickets submitted.</p>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((tk) => (
                      <div key={tk.id} className="p-4 rounded-lg border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm text-[#123B67]">{tk.subject}</p>
                          <span className="font-mono text-xs font-semibold text-[#11827E]">
                            {tk.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{tk.description}</p>
                        {tk.admin_response && (
                          <p className="text-xs bg-[#EAF4FF] p-2.5 rounded text-[#123B67] mt-2">
                            <strong>Support Update:</strong> {tk.admin_response}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
