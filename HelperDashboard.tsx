import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  DollarSign,
  ExternalLink,
  Flag,
  LocateFixed,
  Navigation,
  Star,
  User,
  XCircle,
} from 'lucide-react';
import { apiRequest } from '../api';
import type { BookingRecord, Language, NotificationItem, UserProfile } from '../types';
import { TrackingMap } from './TrackingMap';

type HelperTab = 'requests' | 'active' | 'earnings' | 'reviews' | 'profile';

interface HelperDashboardProps {
  user: UserProfile;
  language: Language;
  bookings: BookingRecord[];
  notifications: NotificationItem[];
  onRefreshData: () => Promise<void>;
  onUserUpdated: (user: UserProfile) => void;
}

export const HelperDashboard: React.FC<HelperDashboardProps> = ({
  user,
  language,
  bookings,
  onRefreshData,
  onUserUpdated,
}) => {
  const [tab, setTab] = useState<HelperTab>('requests');
  const [reviews, setReviews] = useState<any[]>([]);
  const [otpInputs, setOtpInputs] = useState<Record<number, string>>({});
  const [qrInputs, setQrInputs] = useState<Record<number, string>>({});
  const [reportBookingId, setReportBookingId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState('Safety / Conduct Concern');
  const [reportDetails, setReportDetails] = useState('');
  const [reportBlockUser, setReportBlockUser] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Profile fields
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone);
  const [languagesKnown, setLanguagesKnown] = useState(user.helper?.languages_known || '');
  const [experienceYears, setExperienceYears] = useState(
    String(user.helper?.experience_years || 1)
  );
  const [assistanceCategories, setAssistanceCategories] = useState(
    user.helper?.assistance_categories || ''
  );
  const [currentLocation, setCurrentLocation] = useState(user.helper?.current_location || '');

  useEffect(() => {
    apiRequest<{ reviews: any[] }>('/api/helper/reviews')
      .then((res) => setReviews(res.reviews))
      .catch(() => {});
  }, [bookings]);

  const isAvailable = user.helper?.is_available === 1;
  const isBlocked =
    user.helper?.verified_status === 'BLOCKED' || user.account_status === 'BLOCKED';

  const pendingRequests = bookings.filter(
    (b) => b.assignment?.status === 'PENDING' && b.status !== 'Booking Cancelled'
  );
  const activeJobs = bookings.filter(
    (b) =>
      b.assignment?.status === 'ACCEPTED' &&
      b.status !== 'Assistance Completed' &&
      b.status !== 'Booking Cancelled'
  );
  const completedJobs = bookings.filter((b) => b.status === 'Assistance Completed');
  const historyJobs = bookings.filter(
    (b) => b.status === 'Assistance Completed' || b.status === 'Booking Cancelled'
  );
  const totalEarnings = completedJobs.reduce((sum, b) => sum + b.estimated_fare, 0);

  const toggleAvailability = async () => {
    setErr('');
    setMsg('');
    try {
      const res = await apiRequest<{ user: UserProfile }>('/api/helper/availability', {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable: !isAvailable }),
      });
      onUserUpdated(res.user);
      setMsg(`Availability updated to ${!isAvailable ? 'Available' : 'Unavailable'}.`);
    } catch (e: any) {
      setErr(e.message || 'Unable to change availability.');
    }
  };

  const respondAssignment = async (assignmentId: number, action: 'ACCEPT' | 'REJECT') => {
    setErr('');
    setMsg('');
    try {
      await apiRequest(`/api/helper/assignments/${assignmentId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setMsg(
        action === 'ACCEPT'
          ? 'Booking accepted! Navigate to passenger pickup location.'
          : 'Request rejected. Smart dispatch reassigned to the next best helper.'
      );
      if (action === 'ACCEPT') setTab('active');
      await onRefreshData();
    } catch (e: any) {
      setErr(e.message || 'Action failed.');
    }
  };

  const updateStatus = async (bookingId: number, status: string) => {
    setErr('');
    setMsg('');
    try {
      await apiRequest(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setMsg(`Booking status updated to "${status}".`);
      await onRefreshData();
    } catch (e: any) {
      setErr(e.message || 'Could not update status.');
    }
  };

  const broadcastBrowserGps = (booking: BookingRecord) => {
    setErr('');
    if (!navigator.geolocation) {
      setErr('Geolocation unavailable in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await apiRequest(`/api/bookings/${booking.id}/location`, {
            method: 'PATCH',
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              locationLabel: 'Live Helper GPS Signal',
            }),
          });
          setMsg('Live browser GPS location broadcast to passenger map.');
          await onRefreshData();
        } catch (e: any) {
          setErr(e.message || 'Failed to update location.');
        }
      },
      () => {
        setErr('Location permission denied. Use "Move Step Toward Pickup" to update route.');
      }
    );
  };

  const stepTowardPickup = async (booking: BookingRecord) => {
    if (!booking.assignment) return;
    setErr('');
    const currLat = booking.assignment.helper_lat;
    const currLng = booking.assignment.helper_lng;
    const nextLat = Number((currLat + (booking.pickup_lat - currLat) * 0.45).toFixed(6));
    const nextLng = Number((currLng + (booking.pickup_lng - currLng) * 0.45).toFixed(6));
    try {
      await apiRequest(`/api/bookings/${booking.id}/location`, {
        method: 'PATCH',
        body: JSON.stringify({
          lat: nextLat,
          lng: nextLng,
          locationLabel: `En route to ${booking.pickup_location}`,
        }),
      });
      setMsg('Location updated along station route.');
      await onRefreshData();
    } catch (e: any) {
      setErr(e.message || 'Failed to move location.');
    }
  };

  const submitSafetyReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportBookingId) return;
    setErr('');
    setMsg('');
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
      setMsg(res.message);
      setReportBookingId(null);
      setReportDetails('');
      await onRefreshData();
    } catch (e: any) {
      setErr(e.message || 'Unable to submit report.');
    }
  };

  const verifyHandover = async (bookingId: number) => {
    setErr('');
    setMsg('');
    const otpCode = otpInputs[bookingId] || '';
    const qrToken = qrInputs[bookingId] || '';
    if (!otpCode && !qrToken) {
      setErr('Enter the passenger 6-digit OTP or QR token.');
      return;
    }
    try {
      await apiRequest(`/api/bookings/${bookingId}/verify-handover`, {
        method: 'POST',
        body: JSON.stringify({ otpCode, qrToken }),
      });
      setMsg('Handover OTP/QR verified! Assistance marked completed.');
      await onRefreshData();
    } catch (e: any) {
      setErr(e.message || 'OTP/QR verification failed.');
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      const res = await apiRequest<{ user: UserProfile }>('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName,
          phone,
          languagesKnown,
          experienceYears: Number(experienceYears) || 1,
          assistanceCategories,
          currentLocation,
        }),
      });
      onUserUpdated(res.user);
      setMsg('Helper profile updated.');
    } catch (e: any) {
      setErr(e.message || 'Could not save profile.');
    }
  };

  return (
    <div className="bg-[#F5F8FC] min-h-[calc(100vh-140px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar */}
        <aside className="lg:col-span-3 pa-card p-4 space-y-2">
          <div className="flex items-center gap-3 px-2 pb-3 border-b border-slate-200/80">
            <img
              src={
                user.helper?.avatar_url ||
                '/src/assets/images/helper_avatar_arjun_1794979398701.jpg'
              }
              alt={user.full_name}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-lg object-cover border border-slate-200"
            />
            <div className="min-w-0">
              <p className="font-display font-bold text-[#0B2545] truncate">{user.full_name}</p>
              <p className="text-xs text-[#526174] tabular-nums">
                {user.helper?.rating.toFixed(2)}★ · {user.helper?.completed_jobs} trips
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isBlocked}
            onClick={toggleAvailability}
            className={`w-full py-2.5 px-3 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50 ${
              isAvailable && !isBlocked
                ? 'bg-teal-50 border-[#16A6A1] text-[#11827E]'
                : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}
          >
            Status:{' '}
            {isBlocked
              ? 'Account Blocked'
              : isAvailable
              ? 'Available for Match'
              : 'Unavailable'}
          </button>

          {[
            { id: 'requests', label: `New Requests (${pendingRequests.length})`, icon: <ClipboardCheck className="w-4 h-4" /> },
            { id: 'active', label: `Active Jobs (${activeJobs.length})`, icon: <Navigation className="w-4 h-4" /> },
            { id: 'earnings', label: 'Earnings & History', icon: <DollarSign className="w-4 h-4" /> },
            { id: 'reviews', label: 'Ratings & Reviews', icon: <Star className="w-4 h-4" /> },
            { id: 'profile', label: 'Profile Settings', icon: <User className="w-4 h-4" /> },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as HelperTab)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === item.id
                  ? 'bg-[#EAF4FF] text-[#123B67] font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        {/* Main Panel */}
        <main className="lg:col-span-9 space-y-6">
          {isBlocked && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-1.5 text-red-900">
              <p className="font-display text-base font-bold">
                Helper Account Blocked
              </p>
              <p className="text-sm leading-relaxed">
                This helper account has been automatically restricted due to multiple safety reports. Contact PortoAssist Support if you believe this was in error.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="pa-card p-4">
              <p className="text-xs text-[#526174]">Pending Requests</p>
              <p className="font-mono text-2xl font-bold text-[#0B2545] mt-1 tabular-nums">
                {pendingRequests.length}
              </p>
            </div>
            <div className="pa-card p-4">
              <p className="text-xs text-[#526174]">Active Assignments</p>
              <p className="font-mono text-2xl font-bold text-[#16A6A1] mt-1 tabular-nums">
                {activeJobs.length}
              </p>
            </div>
            <div className="pa-card p-4">
              <p className="text-xs text-[#526174]">Completed Trips</p>
              <p className="font-mono text-2xl font-bold text-[#0B2545] mt-1 tabular-nums">
                {completedJobs.length}
              </p>
            </div>
            <div className="pa-card p-4">
              <p className="text-xs text-[#526174]">Total Earnings</p>
              <p className="font-mono text-2xl font-bold text-[#0B2545] mt-1 tabular-nums">
                ₹{totalEarnings}
              </p>
            </div>
          </div>

          {msg && (
            <div className="p-3.5 rounded-lg bg-teal-50 border border-teal-200 text-sm text-teal-900 font-medium">
              {msg}
            </div>
          )}
          {err && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 font-medium">
              {err}
            </div>
          )}

          {/* NEW BOOKING REQUESTS */}
          {tab === 'requests' && (
            <div className="pa-card p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#0B2545]">
                Incoming Assistance Requests
              </h2>
              {pendingRequests.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">
                  No pending requests right now. Keep your status set to Available to receive matches.
                </p>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((b) => (
                    <div
                      key={b.id}
                      className="border border-slate-200 rounded-xl p-5 space-y-4 bg-[#EAF4FF]/30"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-xs text-slate-500">
                            {b.booking_code} · {b.travel_type} · {b.travel_date} {b.travel_time}
                          </p>
                          <h3 className="font-display font-bold text-lg text-[#123B67] mt-0.5">
                            {b.passenger_name} ({b.passenger_phone})
                          </h3>
                          <p className="text-sm text-slate-700 mt-1">
                            <strong>Pickup:</strong> {b.pickup_location}
                          </p>
                          <p className="text-sm text-slate-700">
                            <strong>Drop-off:</strong> {b.dropoff_location}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-xl font-bold text-[#123B67] tabular-nums">
                            ₹{b.estimated_fare}
                          </span>
                          <p className="text-xs text-slate-600 mt-1">
                            {b.num_bags} bags · {b.luggage_weight_kg} kg
                          </p>
                          <p className="text-xs font-medium text-[#11827E]">
                            {b.wheelchair_assistance ? 'Wheelchair Needed' : b.mobility_assistance ? 'Mobility Support' : 'Luggage Only'}
                          </p>
                        </div>
                      </div>

                      {b.special_requirements && (
                        <p className="text-xs bg-white p-2.5 rounded border border-slate-200 text-slate-700">
                          <strong>Passenger Note:</strong> {b.special_requirements}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => respondAssignment(b.assignment!.id, 'ACCEPT')}
                          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#16A6A1] hover:bg-[#11827E] text-white text-sm font-semibold"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Accept Booking
                        </button>
                        <button
                          type="button"
                          onClick={() => respondAssignment(b.assignment!.id, 'REJECT')}
                          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg border border-red-300 bg-white hover:bg-red-50 text-red-700 text-sm font-semibold"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject &amp; Reassign
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ACTIVE ASSIGNMENTS + NAVIGATION + OTP HANDOVER */}
          {tab === 'active' && (
            <div className="space-y-6">
              {activeJobs.length === 0 ? (
                <div className="pa-card p-8 text-center text-sm text-[#526174]">
                  No active assignments. Accept a request from the New Requests tab.
                </div>
              ) : (
                activeJobs.map((b) => (
                  <div key={b.id} className="space-y-4">
                    <div className="pa-card p-6 space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="font-mono text-xs text-[#526174]">
                            {b.booking_code} · {b.travel_type}
                          </p>
                          <h2 className="font-display text-xl font-bold text-[#123B67]">
                            Passenger: {b.passenger_name} · {b.passenger_phone}
                          </h2>
                          <p className="text-xs text-slate-600 mt-1">
                            {b.num_bags} bags ({b.luggage_weight_kg} kg) · Payment: {b.payment_method} ({b.payment?.status})
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${b.pickup_lat},${b.pickup_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-[#16A6A1]" />
                            Navigate to Pickup
                          </a>
                          <button
                            type="button"
                            onClick={() => broadcastBrowserGps(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#123B67] text-[#123B67] text-xs font-semibold hover:bg-[#EAF4FF]"
                          >
                            <LocateFixed className="w-3.5 h-3.5" />
                            Send Real Browser GPS
                          </button>
                          <button
                            type="button"
                            onClick={() => stepTowardPickup(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#EAF4FF] text-[#123B67] text-xs font-semibold hover:bg-blue-100"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            Advance Route Step
                          </button>
                          {(b.status === 'Helper Accepted' || b.status === 'Helper Assigned') && (
                            <button
                              type="button"
                              onClick={() => updateStatus(b.id, 'Helper On the Way')}
                              className="px-3.5 py-2 rounded-lg bg-[#16A6A1] text-white text-xs font-semibold"
                            >
                              On the Way to Pickup
                            </button>
                          )}
                          {b.status === 'Helper On the Way' && (
                            <button
                              type="button"
                              onClick={() => updateStatus(b.id, 'Assistance Started')}
                              className="px-3.5 py-2 rounded-lg bg-[#123B67] text-white text-xs font-semibold"
                            >
                              Mark Assistance Started
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setReportBookingId(reportBookingId === b.id ? null : b.id)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50"
                          >
                            <Flag className="w-3.5 h-3.5" />
                            Report / Block
                          </button>
                        </div>
                      </div>

                      {reportBookingId === b.id && (
                        <form
                          onSubmit={submitSafetyReport}
                          className="p-4 rounded-xl bg-red-50/70 border border-red-200 space-y-3"
                        >
                          <h3 className="font-display font-bold text-sm text-red-900">
                            Report or Block Passenger ({b.passenger_name})
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <select
                              value={reportReason}
                              onChange={(e) => setReportReason(e.target.value)}
                              className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                            >
                              <option>Safety / Conduct Concern</option>
                              <option>No-Show at Pickup</option>
                              <option>Misleading Luggage Info</option>
                              <option>Harassment or Abuse</option>
                            </select>
                            <label className="inline-flex items-center gap-2 text-xs text-slate-800 font-medium">
                              <input
                                type="checkbox"
                                checked={reportBlockUser}
                                onChange={(e) => setReportBlockUser(e.target.checked)}
                              />
                              Block future bookings from this passenger
                            </label>
                          </div>
                          <textarea
                            rows={2}
                            value={reportDetails}
                            onChange={(e) => setReportDetails(e.target.value)}
                            placeholder="Optional details..."
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                          />
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="px-4 py-2 rounded-lg bg-red-700 text-white text-xs font-semibold"
                            >
                              Submit Safety Report
                            </button>
                            <button
                              type="button"
                              onClick={() => setReportBookingId(null)}
                              className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Secure OTP / QR Handover Verification Form */}
                      <div className="bg-[#EAF4FF]/60 border border-blue-200 rounded-xl p-4 space-y-3">
                        <h3 className="font-display font-bold text-sm text-[#123B67]">
                          Secure Handover Verification (Required to Complete)
                        </h3>
                        <p className="text-xs text-slate-600">
                          Ask the passenger for their 6-digit OTP or scan/paste their QR verification token when luggage is handed over.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input
                            type="text"
                            placeholder="Enter 6-digit OTP"
                            value={otpInputs[b.id] || ''}
                            onChange={(e) =>
                              setOtpInputs((prev) => ({ ...prev, [b.id]: e.target.value }))
                            }
                            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-mono"
                          />
                          <input
                            type="text"
                            placeholder="Or paste QR token (PA-QR-...)"
                            value={qrInputs[b.id] || ''}
                            onChange={(e) =>
                              setQrInputs((prev) => ({ ...prev, [b.id]: e.target.value }))
                            }
                            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => verifyHandover(b.id)}
                            className="px-4 py-2 rounded-lg bg-[#16A6A1] hover:bg-[#11827E] text-white text-sm font-semibold"
                          >
                            Verify &amp; Complete
                          </button>
                        </div>
                      </div>
                    </div>

                    <TrackingMap booking={b} language={language} showOtpPanel={false} />
                  </div>
                ))
              )}
            </div>
          )}

          {/* EARNINGS & HISTORY */}
          {tab === 'earnings' && (
            <div className="pa-card p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-[#0B2545]">
                  Earnings &amp; Booking History
                </h2>
                <span className="font-mono text-sm font-bold text-[#11827E] tabular-nums">
                  Total Earned: ₹{totalEarnings}
                </span>
              </div>
              {historyJobs.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No completed or past trips yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-slate-500">
                        <th className="py-2 pr-4">Booking</th>
                        <th className="py-2 pr-4">Passenger</th>
                        <th className="py-2 pr-4">Hub &amp; Route</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Method</th>
                        <th className="py-2 text-right">Fare Earned</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyJobs.map((b) => (
                        <tr key={b.id}>
                          <td className="py-3 pr-4 font-mono text-xs">{b.booking_code}</td>
                          <td className="py-3 pr-4">{b.passenger_name}</td>
                          <td className="py-3 pr-4 text-xs text-slate-600">
                            {b.pickup_location} → {b.dropoff_location}
                          </td>
                          <td className="py-3 pr-4 text-xs font-medium text-[#123B67]">
                            {b.status}
                          </td>
                          <td className="py-3 pr-4 text-xs">{b.payment_method}</td>
                          <td className="py-3 text-right font-mono font-semibold text-[#11827E] tabular-nums">
                            {b.status === 'Assistance Completed' ? `₹${b.estimated_fare}` : '₹0'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* RATINGS & REVIEWS */}
          {tab === 'reviews' && (
            <div className="pa-card p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#0B2545]">
                Passenger Ratings &amp; Reviews
              </h2>
              {reviews.length === 0 ? (
                <p className="text-sm text-slate-500">No passenger reviews yet.</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="p-4 rounded-lg border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm text-[#123B67]">
                          {r.passenger_name} · <span className="font-mono text-xs">{r.booking_code}</span>
                        </p>
                        <span className="font-mono text-sm font-bold text-amber-600">
                          {r.rating} ★
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HELPER PROFILE */}
          {tab === 'profile' && (
            <form
              onSubmit={saveProfile}
              className="pa-card p-6 space-y-4"
            >
              <h2 className="font-display text-lg font-bold text-[#0B2545]">
                Helper Profile Settings
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Languages Known
                  </label>
                  <input
                    type="text"
                    value={languagesKnown}
                    onChange={(e) => setLanguagesKnown(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Experience (Years)
                  </label>
                  <input
                    type="number"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assistance Categories
                  </label>
                  <input
                    type="text"
                    value={assistanceCategories}
                    onChange={(e) => setAssistanceCategories(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Station / Hub Location
                  </label>
                  <input
                    type="text"
                    value={currentLocation}
                    onChange={(e) => setCurrentLocation(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-[#123B67] text-white text-sm font-semibold"
              >
                Save Helper Profile
              </button>
            </form>
          )}
        </main>
      </div>
    </div>
  );
};
