import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Clock, MapPin, Navigation, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../api';
import { I18N } from '../i18n';
import type { BookingRecord, BookingStatus, Language } from '../types';

interface TrackingMapProps {
  booking: BookingRecord;
  language: Language;
  showOtpPanel?: boolean;
  onRetryMatch?: () => void;
}

export const TrackingMap: React.FC<TrackingMapProps> = ({
  booking,
  language,
  showOtpPanel = true,
  onRetryMatch,
}) => {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const helperMarkerRef = useRef<L.CircleMarker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const t = I18N[language];

  // Fetch backend-generated QR code for this booking
  useEffect(() => {
    let active = true;
    if (!showOtpPanel || !booking.id) return;
    apiRequest<{ qrDataUrl: string }>(`/api/bookings/${booking.id}/qr`)
      .then((res) => {
        if (active) setQrDataUrl(res.qrDataUrl);
      })
      .catch(() => {
        // ignore if unauthorized
      });
    return () => {
      active = false;
    };
  }, [booking.id, showOtpPanel]);

  // Initialize Leaflet OpenStreetMap
  useEffect(() => {
    if (!mapElRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapElRef.current, {
        center: [booking.pickup_lat, booking.pickup_lng],
        zoom: 16,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous layers except base tile layer
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    const pickupLatLng: L.LatLngExpression = [booking.pickup_lat, booking.pickup_lng];
    const dropoffLatLng: L.LatLngExpression = [booking.dropoff_lat, booking.dropoff_lng];

    const pickupMarker = L.circleMarker(pickupLatLng, {
      radius: 9,
      color: '#123B67',
      weight: 3,
      fillColor: '#FFFFFF',
      fillOpacity: 1,
    })
      .addTo(map)
      .bindPopup(`<strong>Pickup:</strong> ${booking.pickup_location}`);

    const dropoffMarker = L.circleMarker(dropoffLatLng, {
      radius: 9,
      color: '#0F172A',
      weight: 3,
      fillColor: '#EAF4FF',
      fillOpacity: 1,
    })
      .addTo(map)
      .bindPopup(`<strong>Drop-off:</strong> ${booking.dropoff_location}`);

    const points: L.LatLngExpression[] = [pickupLatLng, dropoffLatLng];

    if (booking.assignment) {
      const hLatLng: L.LatLngExpression = [
        booking.assignment.helper_lat,
        booking.assignment.helper_lng,
      ];
      points.push(hLatLng);

      helperMarkerRef.current = L.circleMarker(hLatLng, {
        radius: 11,
        color: '#FFFFFF',
        weight: 3,
        fillColor: '#16A6A1',
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup(
          `<strong>Helper: ${booking.assignment.helper_name}</strong><br/>ETA: ${booking.assignment.eta_minutes} min`
        );

      routeLineRef.current = L.polyline([hLatLng, pickupLatLng, dropoffLatLng], {
        color: '#16A6A1',
        weight: 3.5,
        dashArray: '6 6',
      }).addTo(map);
    } else {
      routeLineRef.current = L.polyline([pickupLatLng, dropoffLatLng], {
        color: '#123B67',
        weight: 3,
        dashArray: '6 6',
      }).addTo(map);
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [45, 45], maxZoom: 17 });
    pickupMarker.openPopup();
    void dropoffMarker;
  }, [
    booking.id,
    booking.pickup_lat,
    booking.pickup_lng,
    booking.dropoff_lat,
    booking.dropoff_lng,
    booking.pickup_location,
    booking.dropoff_location,
    booking.assignment?.helper_lat,
    booking.assignment?.helper_lng,
    booking.assignment?.helper_name,
    booking.assignment?.eta_minutes,
  ]);

  useEffect(() => {
    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const displayStages: BookingStatus[] = [
    booking.status === 'Searching for Helper' ? 'Searching for Helper' : 'Booking Requested',
    'Helper Assigned',
    'Helper Accepted',
    'Helper On the Way',
    'Assistance Started',
    'Assistance Completed',
  ];
  const currentStageIndex = displayStages.indexOf(booking.status);
  const isCancelled = booking.status === 'Booking Cancelled';

  return (
    <div className="space-y-6">
      {/* Status Timeline */}
      <div className="pa-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-mono text-[#526174]">{booking.booking_code}</p>
            <h3 className="font-display text-lg font-bold text-[#0B2545]">
              {t.statuses[booking.status] || booking.status}
            </h3>
          </div>
          {booking.assignment && !isCancelled && (
            <div className="flex items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium tabular-nums">
                <Clock className="w-4 h-4 text-[#16A6A1]" />
                ETA {booking.assignment.eta_minutes} min
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium tabular-nums">
                <Navigation className="w-4 h-4 text-[#123B67]" />
                {booking.assignment.distance_km} km away
              </span>
            </div>
          )}
        </div>

        {isCancelled ? (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 font-medium">
            This booking was cancelled.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {displayStages.map((stage, idx) => {
              const reached = currentStageIndex >= idx;
              const isCurrent = currentStageIndex === idx;
              return (
                <div
                  key={stage}
                  className={`p-2.5 rounded-lg border text-xs transition-colors ${
                    isCurrent
                      ? 'border-[#16A6A1] bg-[#EAF4FF] text-[#123B67] font-semibold'
                      : reached
                      ? 'border-teal-200 bg-teal-50/60 text-teal-900 font-medium'
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  <span className="block font-mono text-[11px] mb-0.5">0{idx + 1}</span>
                  {t.statuses[stage] || stage}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Leaflet Map + Legend + OTP/QR Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 pa-card overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs text-[#526174]">
            <span className="font-semibold text-[#0B2545] inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#16A6A1]" />
              Live OpenStreetMap Route View
            </span>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-[#123B67] bg-white inline-block" />
                Pickup
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#16A6A1] inline-block" />
                Helper
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-slate-900 bg-[#EAF4FF] inline-block" />
                Drop-off
              </span>
            </div>
          </div>
          <div ref={mapElRef} className="w-full h-[340px] lg:h-[380px] bg-slate-100" />
          <div className="px-4 py-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Pickup Point</span>
              <span className="font-medium text-slate-900">{booking.pickup_location}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Drop-off Point</span>
              <span className="font-medium text-slate-900">{booking.dropoff_location}</span>
            </div>
          </div>
        </div>

        {/* Helper & Secure Handover OTP/QR Card */}
        <div className="pa-card p-5 flex flex-col justify-between space-y-5">
          {booking.assignment ? (
            <div className="flex items-start gap-3 pb-4 border-b border-slate-200">
              <img
                src={booking.assignment.helper_avatar}
                alt={booking.assignment.helper_name}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Assigned Helper</p>
                <h4 className="font-display font-bold text-[#123B67] truncate">
                  {booking.assignment.helper_name}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                  {booking.assignment.helper_rating} ★ · {booking.assignment.helper_experience} yrs exp
                </p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {booking.assignment.helper_languages}
                </p>
                <p className="text-xs font-mono text-[#123B67] mt-1">
                  {booking.assignment.helper_phone}
                </p>
              </div>
            </div>
          ) : (
            <div className="pb-4 border-b border-slate-200 space-y-2.5">
              <p className="text-sm font-semibold text-[#123B67]">
                {booking.status === 'Searching for Helper'
                  ? 'Searching for Nearby Helper'
                  : 'Matching Nearby Helper'}
              </p>
              <p className="text-xs text-slate-600">
                No helper has accepted yet. Our automated matching engine connects with nearby online helpers automatically.
              </p>
              {onRetryMatch && !isCancelled && booking.status !== 'Assistance Completed' && (
                <button
                  type="button"
                  onClick={onRetryMatch}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#16A6A1] hover:bg-[#11827E] text-white text-xs font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Helper Search
                </button>
              )}
            </div>
          )}

          {showOtpPanel && booking.otp && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#123B67]">
                <ShieldCheck className="w-5 h-5 text-[#16A6A1]" />
                <h4 className="font-display font-bold text-sm">Secure Handover OTP / QR</h4>
              </div>
              <p className="text-xs text-slate-600">
                Share this OTP or QR code with your helper only when your luggage handover is complete.
              </p>

              <div className="bg-[#EAF4FF] border border-blue-200 rounded-lg p-3 text-center">
                <span className="text-[11px] font-medium text-slate-600 block">Handover OTP</span>
                <span className="font-mono text-2xl font-bold tracking-[0.2em] text-[#123B67] tabular-nums">
                  {booking.otp.otp_code}
                </span>
                <span className="block text-[11px] mt-1 font-medium text-[#11827E]">
                  {booking.otp.is_verified ? 'Verified & Completed' : 'Awaiting Helper Verification'}
                </span>
              </div>

              {qrDataUrl && (
                <div className="flex flex-col items-center pt-1">
                  <img
                    src={qrDataUrl}
                    alt={`Handover QR code for ${booking.booking_code}`}
                    className="w-36 h-36 border border-slate-200 rounded-lg p-1 bg-white"
                  />
                  <span className="text-[11px] font-mono text-slate-500 mt-1">
                    {booking.otp.qr_token}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
