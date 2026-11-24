/// <reference types="@types/google.maps" />
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  LocateFixed,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Search,
  Sparkles,
} from 'lucide-react';
import { apiRequest } from '../api';
import {
  areLocationsIdentical,
  haversineDistanceKm,
  resolveGoogleMapsConfig,
  type GoogleMapsConfig,
} from '../config/googleMaps';
import type { Language, SelectedLocation } from '../types';

interface GoogleMapsLocationSelectorProps {
  language: Language;
  pickup: SelectedLocation | null;
  destination: SelectedLocation | null;
  confirmed: boolean;
  onPickupChange: (loc: SelectedLocation | null) => void;
  onDestinationChange: (loc: SelectedLocation | null) => void;
  onRouteMetricsChange: (distanceKm: number | null, durationMin: number | null) => void;
  onConfirmChange: (confirmed: boolean) => void;
}

const DEFAULT_MAP_CENTER = { lat: 12.9716, lng: 77.5946 };

function isQuotaError(err: unknown): boolean {
  const text = String((err as { message?: string; status?: string })?.message || err || '');
  return (
    text.includes('429') ||
    text.includes('RESOURCE_EXHAUSTED') ||
    text.includes('OVER_QUERY_LIMIT') ||
    text.includes('OverQuota')
  );
}

function dispatchQuotaExceeded() {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
}

async function reverseGeocodeViaProxy(
  lat: number,
  lng: number,
  languageCode: string
): Promise<SelectedLocation> {
  try {
    const data = await apiRequest<{
      formattedAddress: string;
      placeId: string;
      lat: number;
      lng: number;
    }>('/api/maps/reverse-geocode', {
      method: 'POST',
      body: JSON.stringify({ lat, lng, languageCode }),
    });
    return {
      formattedAddress: data.formattedAddress,
      placeId: data.placeId || '',
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      verified: true,
    };
  } catch (err: any) {
    if (isQuotaError(err)) {
      dispatchQuotaExceeded();
    }
    throw err;
  }
}

async function geocodeAddressViaProxy(
  address: string,
  languageCode: string
): Promise<SelectedLocation> {
  try {
    const data = await apiRequest<{
      formattedAddress: string;
      placeId: string;
      lat: number;
      lng: number;
    }>('/api/maps/geocode', {
      method: 'POST',
      body: JSON.stringify({ address, languageCode }),
    });
    return {
      formattedAddress: data.formattedAddress,
      placeId: data.placeId || '',
      lat: Number(data.lat.toFixed(6)),
      lng: Number(data.lng.toFixed(6)),
      verified: true,
    };
  } catch (err: any) {
    if (isQuotaError(err)) {
      dispatchQuotaExceeded();
    }
    throw err;
  }
}

function useAutocompleteSuggestions(inputString: string, enabled: boolean) {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!placesLib || !enabled) return;
    const trimmed = inputString.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }
        const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmed,
          sessionToken: sessionTokenRef.current,
        });
        if (!cancelled) {
          setSuggestions(res.suggestions || []);
        }
      } catch (err) {
        if (!cancelled) {
          setSuggestions([]);
        }
        if (isQuotaError(err)) {
          dispatchQuotaExceeded();
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [placesLib, inputString, enabled]);

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
    setSuggestions([]);
  }, []);

  return { placesLib, suggestions, isLoading, resetSession };
}

interface PlacesAutocompleteFieldProps {
  id: string;
  label: string;
  badgeText: string;
  badgeTone: 'green' | 'red';
  placeholder: string;
  selectedLocation: SelectedLocation | null;
  language: Language;
  onSelectLocation: (loc: SelectedLocation | null) => void;
  onError: (msg: string) => void;
}

const PlacesAutocompleteField: React.FC<PlacesAutocompleteFieldProps> = ({
  id,
  label,
  badgeText,
  badgeTone,
  placeholder,
  selectedLocation,
  language,
  onSelectLocation,
  onError,
}) => {
  const [query, setQuery] = useState(selectedLocation?.formattedAddress || '');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const skipNextFetchRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nextText = selectedLocation?.formattedAddress || '';
    if (nextText !== query && selectedLocation?.verified) {
      skipNextFetchRef.current = true;
      setQuery(nextText);
      setDropdownOpen(false);
    }
  }, [selectedLocation?.formattedAddress, selectedLocation?.lat, selectedLocation?.lng, selectedLocation?.verified]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const shouldSearch = dropdownOpen && !skipNextFetchRef.current;
  const { placesLib, suggestions, isLoading, resetSession } = useAutocompleteSuggestions(
    query,
    shouldSearch
  );

  const handleInputChange = (value: string) => {
    skipNextFetchRef.current = false;
    setQuery(value);
    setDropdownOpen(true);
    onError('');
    if (!value.trim()) {
      onSelectLocation(null);
    } else if (selectedLocation && value.trim() !== selectedLocation.formattedAddress) {
      onSelectLocation({
        ...selectedLocation,
        formattedAddress: value,
        verified: false,
      });
    }
  };

  const handlePickSuggestion = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    if (!placesLib || !suggestion.placePrediction) return;
    setResolving(true);
    onError('');
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'viewport'],
      });

      const loc = place.location;
      if (!loc) {
        onError('Could not retrieve exact coordinates for this place. Please choose another.');
        return;
      }

      const lat = typeof loc.lat === 'function' ? loc.lat() : Number((loc as any).lat);
      const lng = typeof loc.lng === 'function' ? loc.lng() : Number((loc as any).lng);
      const address =
        place.formattedAddress ||
        place.displayName ||
        suggestion.placePrediction.text.text;

      skipNextFetchRef.current = true;
      setQuery(address);
      setDropdownOpen(false);
      resetSession();
      onSelectLocation({
        formattedAddress: address,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        placeId: place.id || '',
        verified: true,
      });
    } catch (err: any) {
      if (isQuotaError(err)) {
        dispatchQuotaExceeded();
      }
      onError(err?.message || 'Could not load place details. Please try another suggestion.');
    } finally {
      setResolving(false);
    }
  };

  const handleGeocodeFallback = async () => {
    if (!query.trim()) {
      onError(`Please enter a ${label.toLowerCase()} to search.`);
      return;
    }
    setResolving(true);
    onError('');
    try {
      const resolved = await geocodeAddressViaProxy(query, language);
      skipNextFetchRef.current = true;
      setQuery(resolved.formattedAddress);
      setDropdownOpen(false);
      resetSession();
      onSelectLocation(resolved);
    } catch (err: any) {
      onError(err?.message || 'Location not found. Please select from Google Maps suggestions.');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-bold text-[#123B67] uppercase tracking-wide">
          {label} *
        </label>
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded ${
            badgeTone === 'green'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              badgeTone === 'green' ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          />
          {badgeText}
        </span>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id={id}
            type="text"
            autoComplete="off"
            value={query}
            onFocus={() => {
              if (query.trim().length >= 2) setDropdownOpen(true);
            }}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (suggestions.length > 0 && dropdownOpen) {
                  void handlePickSuggestion(suggestions[0]);
                } else {
                  void handleGeocodeFallback();
                }
              }
            }}
            placeholder={placeholder}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#16A6A1]"
          />
        </div>
        <button
          type="button"
          onClick={handleGeocodeFallback}
          disabled={resolving || !query.trim()}
          className="px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-[#123B67] disabled:opacity-50 shrink-0"
          title="Locate typed address on Google Maps"
        >
          {resolving ? 'Locating...' : 'Find'}
        </button>
      </div>

      {dropdownOpen && query.trim().length >= 2 && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100"
        >
          {isLoading && (
            <div className="px-3.5 py-2.5 text-xs text-slate-500">
              Searching Google Maps places...
            </div>
          )}
          {!isLoading && suggestions.length === 0 && (
            <div className="px-3.5 py-2.5 text-xs text-slate-500 flex items-center justify-between gap-2">
              <span>No instant suggestions. Press &quot;Find&quot; to geocode address.</span>
            </div>
          )}
          {suggestions.map((suggestion, idx) => {
            const prediction = suggestion.placePrediction;
            if (!prediction) return null;
            const main = prediction.mainText?.text || prediction.text.text;
            const secondary = prediction.secondaryText?.text || '';
            return (
              <button
                key={`${prediction.placeId || idx}`}
                type="button"
                role="option"
                onClick={() => void handlePickSuggestion(suggestion)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-[#EAF4FF]/60 transition-colors flex items-start gap-2.5"
              >
                <MapPin className="w-4 h-4 text-[#16A6A1] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-[#123B67] truncate">
                    {main}
                  </p>
                  {secondary && (
                    <p className="text-[11px] text-slate-500 truncate">{secondary}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedLocation?.verified && (
        <p className="text-[11px] text-slate-600 flex items-start gap-1.5 pt-0.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-800">Selected:</strong>{' '}
            {selectedLocation.formattedAddress}{' '}
            <span className="font-mono text-slate-400">
              ({selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)})
            </span>
          </span>
        </p>
      )}
    </div>
  );
};

interface MapWorkspaceProps {
  language: Language;
  pickup: SelectedLocation | null;
  destination: SelectedLocation | null;
  onPickupUpdate: (loc: SelectedLocation) => void;
  onDestinationUpdate: (loc: SelectedLocation) => void;
  onRouteMetrics: (distanceKm: number | null, durationMin: number | null) => void;
  onRouteMessage: (msg: string) => void;
}

const MapWorkspace: React.FC<MapWorkspaceProps> = ({
  language,
  pickup,
  destination,
  onPickupUpdate,
  onDestinationUpdate,
  onRouteMetrics,
  onRouteMessage,
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  const [pickupMarkerRef, pickupMarker] = useAdvancedMarkerRef();
  const [destMarkerRef, destMarker] = useAdvancedMarkerRef();
  const [openInfo, setOpenInfo] = useState<'pickup' | 'destination' | null>(null);
  const [draggingNote, setDraggingNote] = useState('');

  const hasValidPickup = Boolean(pickup && pickup.verified && Number.isFinite(pickup.lat));
  const hasValidDest = Boolean(destination && destination.verified && Number.isFinite(destination.lat));

  // Auto-zoom & fit bounds when markers update
  useEffect(() => {
    if (!map) return;
    if (hasValidPickup && hasValidDest && pickup && destination) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: pickup.lat, lng: pickup.lng });
      bounds.extend({ lat: destination.lat, lng: destination.lng });
      map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
    } else if (hasValidPickup && pickup) {
      map.panTo({ lat: pickup.lat, lng: pickup.lng });
      map.setZoom(15);
    } else if (hasValidDest && destination) {
      map.panTo({ lat: destination.lat, lng: destination.lng });
      map.setZoom(15);
    }
  }, [map, hasValidPickup, hasValidDest, pickup?.lat, pickup?.lng, destination?.lat, destination?.lng]);

  // Calculate route & draw polyline using modern Google Maps Routes API SDK
  useEffect(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (!hasValidPickup || !hasValidDest || !pickup || !destination) {
      onRouteMetrics(null, null);
      onRouteMessage('');
      return;
    }

    if (
      areLocationsIdentical(
        pickup.lat,
        pickup.lng,
        pickup.formattedAddress,
        destination.lat,
        destination.lng,
        destination.formattedAddress
      )
    ) {
      onRouteMetrics(0, 0);
      onRouteMessage('Pickup and destination appear to be the same location.');
      return;
    }

    const fallbackKm = haversineDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng);
    const fallbackMins = Math.max(5, Math.round(fallbackKm * 2.5 + 8));

    if (!routesLib || !map) {
      onRouteMetrics(fallbackKm, fallbackMins);
      return;
    }

    let cancelled = false;
    onRouteMessage('Calculating optimal route via Google Routes API...');

    const runComputeRoutes = async () => {
      try {
        const travelMode = routesLib.TravelMode?.DRIVING ?? ('DRIVING' as any);
        const request: any = {
          origin: { lat: pickup.lat, lng: pickup.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          travelMode,
          fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
        };

        const RouteCtor = routesLib.Route as any;
        let response: { routes?: any[] } | null = null;
        if (typeof RouteCtor?.computeRoutes === 'function') {
          response = await RouteCtor.computeRoutes(request);
        } else if (typeof RouteCtor === 'function') {
          const service = new RouteCtor();
          response = await service.computeRoutes(request);
        }

        if (cancelled) return;

        const primaryRoute = response?.routes?.[0];
        if (!primaryRoute) {
          onRouteMetrics(fallbackKm, fallbackMins);
          onRouteMessage('Using direct distance estimate (no driving road route returned).');
          return;
        }

        let createdLines: google.maps.Polyline[] = [];
        if (typeof primaryRoute.createPolylines === 'function') {
          createdLines = primaryRoute.createPolylines();
          createdLines.forEach((poly: google.maps.Polyline) => {
            poly.setOptions({
              strokeColor: '#123B67',
              strokeOpacity: 0.9,
              strokeWeight: 5,
            });
            poly.setMap(map);
          });
        } else if (primaryRoute.polyline?.encodedPolyline && typeof RouteCtor?.decode === 'function') {
          const decodedPath = RouteCtor.decode(primaryRoute.polyline.encodedPolyline);
          const poly = new google.maps.Polyline({
            path: decodedPath,
            geodesic: true,
            strokeColor: '#123B67',
            strokeOpacity: 0.9,
            strokeWeight: 5,
            map,
          });
          createdLines = [poly];
        } else if (Array.isArray(primaryRoute.path) && primaryRoute.path.length > 0) {
          const poly = new google.maps.Polyline({
            path: primaryRoute.path,
            geodesic: true,
            strokeColor: '#123B67',
            strokeOpacity: 0.9,
            strokeWeight: 5,
            map,
          });
          createdLines = [poly];
        }

        polylinesRef.current = createdLines;

        if (primaryRoute.viewport) {
          if (typeof primaryRoute.viewport.getNorthEast === 'function') {
            map.fitBounds(primaryRoute.viewport, { top: 48, right: 48, bottom: 48, left: 48 });
          } else if (primaryRoute.viewport.southwest && primaryRoute.viewport.northeast) {
            const bounds = new google.maps.LatLngBounds(
              primaryRoute.viewport.southwest,
              primaryRoute.viewport.northeast
            );
            map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
          }
        }

        const distKm =
          typeof primaryRoute.distanceMeters === 'number' && primaryRoute.distanceMeters > 0
            ? Number((primaryRoute.distanceMeters / 1000).toFixed(2))
            : fallbackKm;

        const durMin =
          typeof primaryRoute.durationMillis === 'number' && primaryRoute.durationMillis > 0
            ? Math.max(5, Math.round(primaryRoute.durationMillis / 60000))
            : fallbackMins;

        onRouteMetrics(distKm, durMin);
        onRouteMessage('');
      } catch (err: any) {
        if (cancelled) return;
        if (isQuotaError(err)) {
          dispatchQuotaExceeded();
        }
        // Fallback straight-line geodesic path so visual corridor remains clear
        const fallbackLine = new google.maps.Polyline({
          path: [
            { lat: pickup.lat, lng: pickup.lng },
            { lat: destination.lat, lng: destination.lng },
          ],
          geodesic: true,
          strokeColor: '#16A6A1',
          strokeOpacity: 0.85,
          strokeWeight: 4,
          map,
        });
        polylinesRef.current = [fallbackLine];
        onRouteMetrics(fallbackKm, fallbackMins);
        onRouteMessage('Estimated direct distance shown (route service unavailable for this path).');
      }
    };

    void runComputeRoutes();

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [
    routesLib,
    map,
    hasValidPickup,
    hasValidDest,
    pickup?.lat,
    pickup?.lng,
    destination?.lat,
    destination?.lng,
  ]);

  const handleMarkerDragEnd = async (
    kind: 'pickup' | 'destination',
    event: google.maps.MapMouseEvent
  ) => {
    const lat = event.latLng?.lat();
    const lng = event.latLng?.lng();
    if (typeof lat !== 'number' || typeof lng !== 'number') return;

    setDraggingNote(
      `Updating ${kind === 'pickup' ? 'pickup' : 'destination'} address from moved pin...`
    );
    try {
      const updated = await reverseGeocodeViaProxy(lat, lng, language);
      if (kind === 'pickup') {
        onPickupUpdate(updated);
      } else {
        onDestinationUpdate(updated);
      }
      setDraggingNote('');
    } catch {
      const fallbackLoc: SelectedLocation = {
        formattedAddress: `Pinned Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        placeId: '',
        verified: true,
      };
      if (kind === 'pickup') {
        onPickupUpdate(fallbackLoc);
      } else {
        onDestinationUpdate(fallbackLoc);
      }
      setDraggingNote('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative w-full h-[380px] rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={DEFAULT_MAP_CENTER}
          defaultZoom={12}
          gestureHandling="greedy"
          streetViewControl={false}
          mapTypeControl={false}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          className="w-full h-full"
        >
          {hasValidPickup && pickup && (
            <AdvancedMarker
              ref={pickupMarkerRef}
              position={{ lat: pickup.lat, lng: pickup.lng }}
              draggable={true}
              title="Pickup Location (Drag to adjust)"
              onClick={() => setOpenInfo('pickup')}
              onDragEnd={(e) => void handleMarkerDragEnd('pickup', e)}
            >
              <Pin
                background="#16A34A"
                borderColor="#14532D"
                glyphColor="#FFFFFF"
                glyphText="P"
                scale={1.2}
              />
            </AdvancedMarker>
          )}

          {openInfo === 'pickup' && pickupMarker && pickup && (
            <InfoWindow
              anchor={pickupMarker}
              maxWidth={240}
              onCloseClick={() => setOpenInfo(null)}
            >
              <div className="text-xs space-y-1 p-0.5">
                <p className="font-bold text-emerald-800">Pickup Location</p>
                <p className="text-slate-700">{pickup.formattedAddress}</p>
                <p className="font-mono text-[10px] text-slate-500">
                  {pickup.lat.toFixed(5)}, {pickup.lng.toFixed(5)}
                </p>
              </div>
            </InfoWindow>
          )}

          {hasValidDest && destination && (
            <AdvancedMarker
              ref={destMarkerRef}
              position={{ lat: destination.lat, lng: destination.lng }}
              draggable={true}
              title="Destination Location (Drag to adjust)"
              onClick={() => setOpenInfo('destination')}
              onDragEnd={(e) => void handleMarkerDragEnd('destination', e)}
            >
              <Pin
                background="#DC2626"
                borderColor="#7F1D1D"
                glyphColor="#FFFFFF"
                glyphText="D"
                scale={1.2}
              />
            </AdvancedMarker>
          )}

          {openInfo === 'destination' && destMarker && destination && (
            <InfoWindow
              anchor={destMarker}
              maxWidth={240}
              onCloseClick={() => setOpenInfo(null)}
            >
              <div className="text-xs space-y-1 p-0.5">
                <p className="font-bold text-red-800">Destination Location</p>
                <p className="text-slate-700">{destination.formattedAddress}</p>
                <p className="font-mono text-[10px] text-slate-500">
                  {destination.lat.toFixed(5)}, {destination.lng.toFixed(5)}
                </p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>

        {draggingNote && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-lg bg-[#123B67]/95 text-white text-xs font-medium shadow">
            {draggingNote}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 px-1">
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Green Pin:
            Pickup (Draggable)
          </span>
          <span className="inline-flex items-center gap-1 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Red Pin:
            Destination (Draggable)
          </span>
        </span>
        <span className="text-slate-500">Drag any marker to refine exact entrance or gate</span>
      </div>
    </div>
  );
};

// Fallback selector when Google Maps API key is not configured in env
const UnconfiguredMapsFallback: React.FC<{
  pickup: SelectedLocation | null;
  destination: SelectedLocation | null;
  onPickupChange: (loc: SelectedLocation | null) => void;
  onDestinationChange: (loc: SelectedLocation | null) => void;
  onRouteMetricsChange: (distanceKm: number | null, durationMin: number | null) => void;
  onConfirmChange: (confirmed: boolean) => void;
  confirmed: boolean;
}> = ({
  pickup,
  destination,
  onPickupChange,
  onDestinationChange,
  onRouteMetricsChange,
  onConfirmChange,
  confirmed,
}) => {
  const [pickupQuery, setPickupQuery] = useState(pickup?.formattedAddress || '');
  const [destQuery, setDestQuery] = useState(destination?.formattedAddress || '');
  const [statusMsg, setStatusMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (pickup?.verified && destination?.verified) {
      const dist = haversineDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng);
      const mins = Math.max(5, Math.round(dist * 2.5 + 8));
      onRouteMetricsChange(dist, mins);
    } else {
      onRouteMetricsChange(null, null);
    }
  }, [pickup?.lat, pickup?.lng, destination?.lat, destination?.lng, pickup?.verified, destination?.verified]);

  const searchNominatim = async (query: string, kind: 'pickup' | 'destination') => {
    setErrMsg('');
    if (!query.trim()) {
      setErrMsg(`Please enter a ${kind} address.`);
      return;
    }
    setStatusMsg(`Searching ${kind} location...`);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          query.trim()
        )}`
      );
      const items = (await res.json()) as Array<{
        display_name: string;
        lat: string;
        lon: string;
      }>;
      if (!items.length) {
        setErrMsg(`Location not found for "${query}". Try adding a city or landmark.`);
        setStatusMsg('');
        return;
      }
      const loc: SelectedLocation = {
        formattedAddress: items[0].display_name,
        lat: Number(Number(items[0].lat).toFixed(6)),
        lng: Number(Number(items[0].lon).toFixed(6)),
        placeId: '',
        verified: true,
      };
      onConfirmChange(false);
      if (kind === 'pickup') {
        setPickupQuery(loc.formattedAddress);
        onPickupChange(loc);
      } else {
        setDestQuery(loc.formattedAddress);
        onDestinationChange(loc);
      }
      setStatusMsg('');
    } catch {
      setErrMsg('Unable to geocode location right now.');
      setStatusMsg('');
    }
  };

  const handleGps = () => {
    setErrMsg('');
    if (!navigator.geolocation) {
      setErrMsg('Browser geolocation is unavailable.');
      return;
    }
    setStatusMsg('Retrieving your GPS position...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        let formattedAddress = `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = (await r.json()) as { display_name?: string };
          if (data.display_name) formattedAddress = data.display_name;
        } catch {
          // keep coordinate label
        }
        onConfirmChange(false);
        setPickupQuery(formattedAddress);
        onPickupChange({ formattedAddress, lat, lng, placeId: '', verified: true });
        setStatusMsg('');
      },
      () => {
        setStatusMsg('');
        setErrMsg('Location permission denied. Please search your pickup location manually.');
      }
    );
  };

  const handleConfirm = () => {
    setErrMsg('');
    if (!pickup?.verified) {
      setErrMsg('Please locate and verify a valid Pickup Location.');
      return;
    }
    if (!destination?.verified) {
      setErrMsg('Please locate and verify a valid Destination Location.');
      return;
    }
    if (
      areLocationsIdentical(
        pickup.lat,
        pickup.lng,
        pickup.formattedAddress,
        destination.lat,
        destination.lng,
        destination.formattedAddress
      )
    ) {
      setErrMsg('Pickup and destination cannot be the exact same location.');
      return;
    }
    onConfirmChange(true);
  };

  return (
    <div className="space-y-4">
      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
        <p className="font-bold">Google Maps API Key Not Yet Loaded in Runtime</p>
        <p>
          Configure <code className="font-mono bg-amber-100 px-1 rounded">GOOGLE_MAPS_API_KEY</code>{' '}
          or <code className="font-mono bg-amber-100 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code>{' '}
          per <code className="font-mono">GOOGLE_MAPS_SETUP.md</code> to enable Google Places
          Autocomplete &amp; interactive Google Map pins. Fallback geocoding search is active below.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#123B67]">PICKUP LOCATION *</span>
            <button
              type="button"
              onClick={handleGps}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16A6A1] hover:underline"
            >
              <LocateFixed className="w-3.5 h-3.5" />
              Use My Current Location
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={pickupQuery}
              onChange={(e) => setPickupQuery(e.target.value)}
              placeholder="Search pickup airport, station, or street address"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
            />
            <button
              type="button"
              onClick={() => void searchNominatim(pickupQuery, 'pickup')}
              className="px-3 py-2 rounded-lg bg-[#123B67] text-white text-xs font-semibold"
            >
              Locate
            </button>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
          <span className="text-xs font-bold text-[#123B67] block">DESTINATION LOCATION *</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={destQuery}
              onChange={(e) => setDestQuery(e.target.value)}
              placeholder="Search destination station, hotel, hospital, or address"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
            />
            <button
              type="button"
              onClick={() => void searchNominatim(destQuery, 'destination')}
              className="px-3 py-2 rounded-lg bg-[#123B67] text-white text-xs font-semibold"
            >
              Locate
            </button>
          </div>
        </div>
      </div>

      {statusMsg && <p className="text-xs text-[#11827E] font-medium">{statusMsg}</p>}
      {errMsg && <p className="text-xs text-red-700 font-medium">{errMsg}</p>}

      <button
        type="button"
        onClick={handleConfirm}
        className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${
          confirmed
            ? 'bg-emerald-600 text-white'
            : 'bg-[#123B67] hover:bg-[#0d2d50] text-white'
        }`}
      >
        {confirmed ? 'Locations Confirmed' : 'Confirm Locations and Continue'}
      </button>
    </div>
  );
};

export const GoogleMapsLocationSelector: React.FC<GoogleMapsLocationSelectorProps> = ({
  language,
  pickup,
  destination,
  confirmed,
  onPickupChange,
  onDestinationChange,
  onRouteMetricsChange,
  onConfirmChange,
}) => {
  const [mapsConfig, setMapsConfig] = useState<GoogleMapsConfig | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');
  const [pickupError, setPickupError] = useState('');
  const [destError, setDestError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [routeMessage, setRouteMessage] = useState('');
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);

  useEffect(() => {
    void resolveGoogleMapsConfig().then(setMapsConfig);
  }, []);

  const handlePickupUpdate = (loc: SelectedLocation | null) => {
    onConfirmChange(false);
    setValidationError('');
    onPickupChange(loc);
  };

  const handleDestinationUpdate = (loc: SelectedLocation | null) => {
    onConfirmChange(false);
    setValidationError('');
    onDestinationChange(loc);
  };

  const handleRouteMetrics = useCallback(
    (km: number | null, mins: number | null) => {
      setDistanceKm(km);
      setDurationMin(mins);
      onRouteMetricsChange(km, mins);
    },
    [onRouteMetricsChange]
  );

  const handleUseMyCurrentLocation = () => {
    setPickupError('');
    setValidationError('');
    if (!navigator.geolocation) {
      setPickupError(
        'Your browser does not support GPS geolocation. Please use Search Pickup Location instead.'
      );
      return;
    }

    setGpsLoading(true);
    setGpsStatus('Requesting GPS permission and detecting your exact location...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        try {
          const resolved = await reverseGeocodeViaProxy(lat, lng, language);
          handlePickupUpdate(resolved);
          setGpsStatus('Current GPS location verified on Google Maps.');
        } catch (err: any) {
          handlePickupUpdate({
            formattedAddress: `Current GPS Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
            lat,
            lng,
            placeId: '',
            verified: true,
          });
          setGpsStatus(
            err?.message
              ? `GPS pin placed (${err.message}). Drag green marker to refine.`
              : 'GPS pin placed on map. Drag green marker to refine.'
          );
        } finally {
          setGpsLoading(false);
        }
      },
      (geoErr) => {
        setGpsLoading(false);
        setGpsStatus('');
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setPickupError(
            'GPS permission was denied. Please allow location access or search your pickup location below.'
          );
        } else if (geoErr.code === geoErr.TIMEOUT) {
          setPickupError('GPS lookup timed out. Please try again or search your pickup location.');
        } else {
          setPickupError('Unable to detect current GPS position. Please search manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const handleConfirmLocations = () => {
    setValidationError('');
    if (!pickup || !pickup.formattedAddress.trim() || !pickup.verified) {
      setValidationError(
        'Pickup location cannot be empty. Use Current Location or select a Google Maps suggestion.'
      );
      return;
    }
    if (!destination || !destination.formattedAddress.trim() || !destination.verified) {
      setValidationError(
        'Destination location cannot be empty. Select a valid Google Maps destination.'
      );
      return;
    }
    if (
      !Number.isFinite(pickup.lat) ||
      !Number.isFinite(pickup.lng) ||
      !Number.isFinite(destination.lat) ||
      !Number.isFinite(destination.lng)
    ) {
      setValidationError('Location coordinates are invalid. Please re-select from suggestions.');
      return;
    }
    if (
      areLocationsIdentical(
        pickup.lat,
        pickup.lng,
        pickup.formattedAddress,
        destination.lat,
        destination.lng,
        destination.formattedAddress
      )
    ) {
      setValidationError(
        'Pickup and destination cannot be the same location. Please choose a different destination.'
      );
      return;
    }

    onConfirmChange(true);
  };

  if (!mapsConfig) {
    return (
      <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600 animate-pulse">
        Initializing Google Maps location selector...
      </div>
    );
  }

  if (!mapsConfig.configured) {
    return (
      <UnconfiguredMapsFallback
        pickup={pickup}
        destination={destination}
        onPickupChange={handlePickupUpdate}
        onDestinationChange={handleDestinationUpdate}
        onRouteMetricsChange={handleRouteMetrics}
        onConfirmChange={onConfirmChange}
        confirmed={confirmed}
      />
    );
  }

  return (
    <APIProvider
      apiKey={mapsConfig.apiKey}
      libraries={['places', 'routes', 'marker']}
      language={language}
    >
      <div className="space-y-4">
        {/* PICKUP LOCATION SECTION */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-[#123B67] uppercase tracking-wider">
                Pickup Location
              </h3>
              <p className="text-[11px] text-slate-500">
                Option A: Use GPS current location · Option B: Search any transit hub or address
              </p>
            </div>
            <button
              type="button"
              onClick={handleUseMyCurrentLocation}
              disabled={gpsLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#16A6A1] hover:bg-[#11827E] text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-60"
            >
              <LocateFixed className="w-3.5 h-3.5" />
              {gpsLoading ? 'Detecting GPS...' : 'Use My Current Location'}
            </button>
          </div>

          {gpsStatus && (
            <p className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 shrink-0" />
              {gpsStatus}
            </p>
          )}

          <PlacesAutocompleteField
            id="google-pickup-search"
            label="Search Pickup Location"
            badgeText="Green Pin (Pickup)"
            badgeTone="green"
            placeholder="Search airport, railway station, metro, gate, terminal, or address..."
            selectedLocation={pickup}
            language={language}
            onSelectLocation={handlePickupUpdate}
            onError={setPickupError}
          />

          {pickupError && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{pickupError}</span>
            </div>
          )}
        </div>

        {/* DESTINATION LOCATION SECTION */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
          <div>
            <h3 className="text-xs font-bold text-[#123B67] uppercase tracking-wider">
              Destination Location
            </h3>
            <p className="text-[11px] text-slate-500">
              Search any airport, station, metro, hotel, hospital, building, or custom address
            </p>
          </div>

          <PlacesAutocompleteField
            id="google-destination-search"
            label="Search Destination Location"
            badgeText="Red Pin (Destination)"
            badgeTone="red"
            placeholder="Search any destination worldwide via Google Maps..."
            selectedLocation={destination}
            language={language}
            onSelectLocation={handleDestinationUpdate}
            onError={setDestError}
          />

          {destError && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{destError}</span>
            </div>
          )}
        </div>

        {/* INTERACTIVE GOOGLE MAP */}
        <MapWorkspace
          language={language}
          pickup={pickup}
          destination={destination}
          onPickupUpdate={(loc) => handlePickupUpdate(loc)}
          onDestinationUpdate={(loc) => handleDestinationUpdate(loc)}
          onRouteMetrics={handleRouteMetrics}
          onRouteMessage={setRouteMessage}
        />

        {/* DISTANCE, DURATION & CONFIRMATION BAR */}
        <div className="p-4 rounded-xl border border-blue-200 bg-[#EAF4FF]/60 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-lg border border-slate-200 px-3.5 py-2.5 flex items-center gap-3">
              <RouteIcon className="w-5 h-5 text-[#123B67] shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase">
                  Estimated Travel Distance
                </p>
                <p className="text-sm font-bold text-[#123B67] tabular-nums">
                  {distanceKm !== null ? `${distanceKm} km` : 'Select pickup & destination'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 px-3.5 py-2.5 flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#16A6A1] shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase">
                  Estimated Travel Duration
                </p>
                <p className="text-sm font-bold text-[#123B67] tabular-nums">
                  {durationMin !== null ? `${durationMin} mins` : 'Waiting for route'}
                </p>
              </div>
            </div>
          </div>

          {routeMessage && (
            <p className="text-xs text-[#123B67] font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#16A6A1] shrink-0" />
              {routeMessage}
            </p>
          )}

          {validationError && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleConfirmLocations}
            className={`w-full py-3 px-4 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              confirmed
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-[#123B67] hover:bg-[#0d2d50] text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {confirmed
              ? 'Locations Verified & Confirmed (Click to Re-verify)'
              : 'Confirm Locations and Continue'}
          </button>
        </div>
      </div>
    </APIProvider>
  );
};
