import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Sparkles, Star } from 'lucide-react';
import { apiRequest } from '../api';
import { areLocationsIdentical } from '../config/googleMaps';
import { I18N } from '../i18n';
import type {
  AppRoute,
  BookingRecord,
  FareBreakdown,
  HelperCandidate,
  Language,
  SelectedLocation,
  UserProfile,
} from '../types';
import { GoogleMapsLocationSelector } from './GoogleMapsLocationSelector';

interface BookingPageProps {
  language: Language;
  user: UserProfile | null;
  onRequireLogin: () => void;
  onBookingCreated: (booking: BookingRecord) => void;
  onNavigate: (route: AppRoute) => void;
}

export const BookingPage: React.FC<BookingPageProps> = ({
  language,
  user,
  onRequireLogin,
  onBookingCreated,
}) => {
  const t = I18N[language];
  const today = new Date().toISOString().slice(0, 10);
  const assistanceSectionRef = useRef<HTMLElement | null>(null);

  const [passengerName, setPassengerName] = useState(user?.full_name || '');
  const [passengerPhone, setPassengerPhone] = useState(user?.phone || '');
  const [passengerEmail, setPassengerEmail] = useState(user?.email || '');

  const [travelType, setTravelType] = useState<'Airport' | 'Railway Station' | 'Bus Station'>(
    'Railway Station'
  );
  const [pickupLocation, setPickupLocation] = useState<SelectedLocation | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<SelectedLocation | null>(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [locationsConfirmed, setLocationsConfirmed] = useState(false);

  const [travelDate, setTravelDate] = useState(today);
  const [travelTime, setTravelTime] = useState('15:30');

  const [numBags, setNumBags] = useState(2);
  const [luggageWeightKg, setLuggageWeightKg] = useState(28);
  const [numPassengers, setNumPassengers] = useState(1);
  const [estimatedDurationMin, setEstimatedDurationMin] = useState(35);
  const [mobilityAssistance, setMobilityAssistance] = useState(true);
  const [wheelchairAssistance, setWheelchairAssistance] = useState(false);
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<Language>(language);

  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CASH'>('UPI');
  const [upiId, setUpiId] = useState('traveler@okaxis');

  const [fare, setFare] = useState<FareBreakdown | null>(null);
  const [matches, setMatches] = useState<HelperCandidate[]>([]);
  const [autoAssign, setAutoAssign] = useState(true);
  const [selectedHelperId, setSelectedHelperId] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setPassengerName((prev) => prev || user.full_name);
      setPassengerPhone((prev) => prev || user.phone);
      setPassengerEmail((prev) => prev || user.email);
    }
  }, [user]);

  const handleRouteMetricsChange = useCallback((distKm: number | null, durMin: number | null) => {
    setRouteDistanceKm(distKm);
    if (typeof durMin === 'number' && durMin > 0) {
      setEstimatedDurationMin(Math.max(20, Math.min(180, durMin)));
    }
  }, []);

  const handleLocationsConfirmed = useCallback((confirmed: boolean) => {
    setLocationsConfirmed(confirmed);
    if (confirmed) {
      setError('');
      setTimeout(() => {
        assistanceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 120);
    }
  }, []);

  // Live fare estimation + Smart Helper Matching preview based on real selected coordinates
  useEffect(() => {
    if (!pickupLocation?.verified) {
      setFare(null);
      setMatches([]);
      return;
    }

    let active = true;
    const targetLat = dropoffLocation?.verified ? dropoffLocation.lat : pickupLocation.lat;
    const targetLng = dropoffLocation?.verified ? dropoffLocation.lng : pickupLocation.lng;

    Promise.all([
      apiRequest<FareBreakdown>('/api/fare/estimate', {
        method: 'POST',
        body: JSON.stringify({
          travelType,
          pickupLat: pickupLocation.lat,
          pickupLng: pickupLocation.lng,
          dropoffLat: targetLat,
          dropoffLng: targetLng,
          distanceKm: routeDistanceKm ?? undefined,
          numBags,
          luggageWeightKg,
          estimatedDurationMin,
          mobilityAssistance,
          wheelchairAssistance,
        }),
      }),
      apiRequest<{ helpers: HelperCandidate[] }>('/api/helpers/match', {
        method: 'POST',
        body: JSON.stringify({
          pickupLat: pickupLocation.lat,
          pickupLng: pickupLocation.lng,
          numBags,
          luggageWeightKg,
          mobilityAssistance,
          wheelchairAssistance,
          preferredLanguage,
        }),
      }),
    ])
      .then(([fareRes, matchRes]) => {
        if (!active) return;
        setFare(fareRes);
        setMatches(matchRes.helpers);
      })
      .catch(() => {
        // ignore transient error
      });
    return () => {
      active = false;
    };
  }, [
    travelType,
    pickupLocation?.lat,
    pickupLocation?.lng,
    pickupLocation?.verified,
    dropoffLocation?.lat,
    dropoffLocation?.lng,
    dropoffLocation?.verified,
    routeDistanceKm,
    numBags,
    luggageWeightKg,
    estimatedDurationMin,
    mobilityAssistance,
    wheelchairAssistance,
    preferredLanguage,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      onRequireLogin();
      return;
    }
    if (user.role === 'HELPER') {
      setError('Please sign in with a Passenger account to book assistance.');
      return;
    }
    if (!pickupLocation?.verified || !pickupLocation.formattedAddress.trim()) {
      setError('Please select a valid Pickup Location on Google Maps.');
      return;
    }
    if (!dropoffLocation?.verified || !dropoffLocation.formattedAddress.trim()) {
      setError('Please select a valid Destination Location on Google Maps.');
      return;
    }
    if (
      areLocationsIdentical(
        pickupLocation.lat,
        pickupLocation.lng,
        pickupLocation.formattedAddress,
        dropoffLocation.lat,
        dropoffLocation.lng,
        dropoffLocation.formattedAddress
      )
    ) {
      setError('Pickup and destination cannot be the exact same location.');
      return;
    }
    if (!locationsConfirmed) {
      setError('Please click "Confirm Locations and Continue" inside Journey & Hub Details first.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{ booking: BookingRecord }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          passengerName,
          passengerPhone,
          passengerEmail,
          travelType,
          pickupLocation: pickupLocation.formattedAddress,
          pickupLat: pickupLocation.lat,
          pickupLng: pickupLocation.lng,
          pickupPlaceId: pickupLocation.placeId || null,
          dropoffLocation: dropoffLocation.formattedAddress,
          dropoffLat: dropoffLocation.lat,
          dropoffLng: dropoffLocation.lng,
          dropoffPlaceId: dropoffLocation.placeId || null,
          distanceKm: routeDistanceKm ?? undefined,
          travelDate,
          travelTime,
          numBags,
          luggageWeightKg,
          numPassengers,
          estimatedDurationMin,
          mobilityAssistance,
          wheelchairAssistance,
          specialRequirements,
          preferredLanguage,
          paymentMethod,
          upiId: paymentMethod === 'UPI' ? upiId : '',
          autoAssign,
          selectedHelperId: autoAssign ? null : selectedHelperId,
        }),
      });
      onBookingCreated(res.booking);
    } catch (err: any) {
      setError(err.message || 'Could not create booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F5F8FC] min-h-[calc(100vh-140px)] py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B2545]">
              {t.booking.title}
            </h1>
            <p className="text-sm sm:text-base text-[#526174] mt-1">{t.booking.subtitle}</p>
          </div>
          {!user && (
            <button
              type="button"
              onClick={onRequireLogin}
              className="px-4 py-2 rounded-lg bg-[#EAF4FF] text-[#123B67] text-xs font-semibold border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              Sign in to save &amp; confirm booking
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 columns: Form Sections */}
          <div className="lg:col-span-7 space-y-6">
            {/* Passenger Info */}
            <section className="pa-card p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#0B2545]">
                01. {t.booking.passengerInfo}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Passenger Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={passengerPhone}
                    onChange={(e) => setPassengerPhone(e.target.value)}
                    placeholder="+91 98..."
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={passengerEmail}
                    onChange={(e) => setPassengerEmail(e.target.value)}
                    placeholder="passenger@example.com"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>
            </section>

            {/* Journey Info */}
            <section className="pa-card p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-[#0B2545]">
                  02. {t.booking.journeyInfo}
                </h2>
                <span className="text-[11px] font-semibold text-[#11827E] bg-[#EAF4FF] px-2.5 py-1 rounded">
                  Powered by Google Maps
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['Airport', 'Railway Station', 'Bus Station'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTravelType(type)}
                    className={`py-2.5 px-3 rounded-lg border text-xs sm:text-sm font-semibold transition-colors ${
                      travelType === type
                        ? 'bg-[#123B67] text-white border-[#123B67]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <GoogleMapsLocationSelector
                language={language}
                pickup={pickupLocation}
                destination={dropoffLocation}
                confirmed={locationsConfirmed}
                onPickupChange={setPickupLocation}
                onDestinationChange={setDropoffLocation}
                onRouteMetricsChange={handleRouteMetricsChange}
                onConfirmChange={handleLocationsConfirmed}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Travel Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Travel Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={travelTime}
                    onChange={(e) => setTravelTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>
            </section>

            {/* Assistance Requirements */}
            <section
              ref={assistanceSectionRef}
              className="pa-card p-6 space-y-4"
            >
              <h2 className="font-display text-lg font-bold text-[#0B2545]">
                03. {t.booking.assistanceInfo}
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Number of Bags
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={numBags}
                    onChange={(e) => setNumBags(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Luggage Weight (kg)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={luggageWeightKg}
                    onChange={(e) => setLuggageWeightKg(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Passengers
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={numPassengers}
                    onChange={(e) => setNumPassengers(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={180}
                    step={10}
                    value={estimatedDurationMin}
                    onChange={(e) => setEstimatedDurationMin(Math.max(20, Number(e.target.value)))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={mobilityAssistance}
                    onChange={(e) => setMobilityAssistance(e.target.checked)}
                    className="w-4 h-4 accent-[#16A6A1]"
                  />
                  <span className="text-sm font-medium text-slate-800">
                    Mobility Escort Required (+₹80)
                  </span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={wheelchairAssistance}
                    onChange={(e) => setWheelchairAssistance(e.target.checked)}
                    className="w-4 h-4 accent-[#16A6A1]"
                  />
                  <span className="text-sm font-medium text-slate-800">
                    Wheelchair Assistance (+₹100)
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preferred Helper Language
                  </label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value as Language)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    <option value="en">English</option>
                    <option value="kn">ಕನ್ನಡ (Kannada)</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Special Requirements
                  </label>
                  <input
                    type="text"
                    value={specialRequirements}
                    onChange={(e) => setSpecialRequirements(e.target.value)}
                    placeholder="Senior citizen support, fragile medical bag..."
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Right 5 columns: Fare Breakdown, Payment & Smart Helper Matching */}
          <div className="lg:col-span-5 space-y-6">
            {/* Dynamic Fare Card */}
            <section className="pa-card p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#0B2545]">
                {t.booking.fareBreakdown}
              </h2>

              {fare ? (
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>{t.booking.baseFare} ({travelType})</span>
                    <span className="font-mono tabular-nums">₹{fare.baseFare}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{t.booking.distanceCharge} ({fare.distanceKm} km)</span>
                    <span className="font-mono tabular-nums">₹{fare.distanceCharge}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{t.booking.luggageCharge} ({numBags} bags, {luggageWeightKg} kg)</span>
                    <span className="font-mono tabular-nums">₹{fare.luggageCharge}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{t.booking.mobilityCharge}</span>
                    <span className="font-mono tabular-nums">₹{fare.mobilityCharge}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{t.booking.durationCharge} ({estimatedDurationMin} min)</span>
                    <span className="font-mono tabular-nums">₹{fare.durationCharge}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center font-bold text-[#123B67] text-base">
                    <span>{t.booking.estimatedTotal}</span>
                    <span className="font-mono text-xl tabular-nums">₹{fare.totalFare}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Select pickup and destination locations on Google Maps to calculate your transparent fare.
                </p>
              )}

              {/* Payment Method */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Payment Method (Simulated Demo Flow)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    className={`py-2.5 px-3 rounded-lg border text-sm font-semibold ${
                      paymentMethod === 'UPI'
                        ? 'bg-[#EAF4FF] border-[#123B67] text-[#123B67]'
                        : 'bg-white border-slate-300 text-slate-700'
                    }`}
                  >
                    UPI (Simulated)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`py-2.5 px-3 rounded-lg border text-sm font-semibold ${
                      paymentMethod === 'CASH'
                        ? 'bg-[#EAF4FF] border-[#123B67] text-[#123B67]'
                        : 'bg-white border-slate-300 text-slate-700'
                    }`}
                  >
                    Cash at Handover
                  </button>
                </div>
                {paymentMethod === 'UPI' && (
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      UPI ID (for simulated payment receipt)
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="yourname@okicici"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Smart Helper Matching Preview */}
            <section className="pa-card p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-[#0B2545] inline-flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#16A6A1]" />
                  Smart Helper Match
                </h2>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#123B67] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoAssign}
                    onChange={(e) => setAutoAssign(e.target.checked)}
                    className="accent-[#16A6A1]"
                  />
                  Auto-Assign Best
                </label>
              </div>

              {matches.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No helpers currently online; booking will enter priority dispatch queue.
                </p>
              ) : (
                <div className="space-y-3">
                  {matches.slice(0, 3).map((m, idx) => {
                    const isPicked = autoAssign ? idx === 0 : selectedHelperId === m.helperId;
                    return (
                      <div
                        key={m.helperId}
                        onClick={() => {
                          setAutoAssign(false);
                          setSelectedHelperId(m.helperId);
                        }}
                        className={`p-3 rounded-lg border transition-colors cursor-pointer flex items-center gap-3 ${
                          isPicked
                            ? 'border-[#16A6A1] bg-[#EAF4FF]/55'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <img
                          src={m.avatarUrl}
                          alt={m.fullName}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-[#123B67] truncate">
                              {m.fullName}
                            </p>
                            <span className="font-mono text-xs font-semibold text-[#11827E] tabular-nums shrink-0">
                              {m.matchScore}% match
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 tabular-nums mt-0.5">
                            <Star className="w-3 h-3 inline text-amber-500 fill-current mr-0.5" />
                            {m.rating} · {m.distanceKm} km away · ETA {m.etaMinutes} min
                          </p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {m.languagesKnown} · Max {m.maxBags} bags
                          </p>
                        </div>
                        {isPicked && <CheckCircle2 className="w-4 h-4 text-[#16A6A1] shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-lg bg-[#16A6A1] hover:bg-[#11827E] text-white font-semibold text-base transition-colors disabled:opacity-60"
              >
                {submitting ? 'Confirming Booking...' : t.booking.confirmBooking}
              </button>
            </section>
          </div>
        </form>
      </div>
    </div>
  );
};
