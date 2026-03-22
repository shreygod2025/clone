/**
 * SchoolMapPicker — Select school address via interactive map + fast geocoding.
 * Search: Photon (photon.komoot.io) — free, no API key, fast typeahead
 * Map:    Leaflet.js + OpenStreetMap tiles
 * Reverse geocode: Nominatim (triggered only on map click, not typing)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, Navigation, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

const DEFAULT_CENTER = [20.5937, 78.9629]; // India center
const DEFAULT_ZOOM_OVERVIEW = 5;
const DEFAULT_ZOOM_DETAIL = 15;
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';

// Photon: fast, free, no API key, excellent for India
const PHOTON_URL = 'https://photon.komoot.io/api/?q=';
// Nominatim: only for reverse geocode (map click) — called rarely, slow is OK
const NOMINATIM_REV = 'https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&';

const DEBOUNCE_MS = 350;

function formatPhotonLabel(props) {
  const parts = [
    props.name,
    props.street && props.housenumber ? `${props.street} ${props.housenumber}` : props.street,
    props.city || props.town || props.village,
    props.state,
    props.country,
  ].filter(Boolean);
  // deduplicate adjacent
  const deduped = parts.filter((p, i) => p !== parts[i - 1]);
  return deduped.join(', ');
}

export function SchoolMapPicker({ value = {}, onChange }) {
  const [mapExpanded, setMapExpanded] = useState(false);
  const [inputText, setInputText] = useState(value.address || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [geofenceRadius, setGeofenceRadius] = useState(value.geofence_radius || 500);
  const [coords, setCoords] = useState(
    value.latitude && value.longitude
      ? { lat: parseFloat(value.latitude), lng: parseFloat(value.longitude) }
      : null
  );

  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // ── Notify parent ──────────────────────────────────────────────────────────
  const notifyChange = useCallback((address, lat, lng, radius) => {
    onChange({ address, latitude: lat, longitude: lng, geofence_radius: radius });
  }, [onChange]);

  // ── Photon typeahead (fast) ────────────────────────────────────────────────
  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.trim().length < 3) { setSuggestions([]); return; }
    setLoadingSuggestions(true);
    try {
      // Bias to India bounding box for relevance
      const url = `${PHOTON_URL}${encodeURIComponent(query)}&limit=6&lang=en`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      const data = await res.json();
      const features = (data.features || []).map(f => ({
        label: formatPhotonLabel(f.properties),
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      })).filter(f => f.label && f.lat && f.lng);
      setSuggestions(features);
      setShowSuggestions(features.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  // Debounced input change
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);
    setShowSuggestions(false);
    onChange({ ...value, address: val }); // keep parent in sync while typing
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), DEBOUNCE_MS);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Pick a suggestion ──────────────────────────────────────────────────────
  const selectSuggestion = useCallback((s) => {
    setInputText(s.label);
    setSuggestions([]);
    setShowSuggestions(false);
    const newCoords = { lat: s.lat, lng: s.lng };
    setCoords(newCoords);
    notifyChange(s.label, s.lat, s.lng, geofenceRadius);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([s.lat, s.lng], DEFAULT_ZOOM_DETAIL);
    }
    placeMarkerOnMap(s.lat, s.lng);
    if (!mapExpanded) setMapExpanded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geofenceRadius, mapExpanded, notifyChange]);

  // ── Explicit search button ─────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!inputText.trim()) return;
    setLoadingSuggestions(true);
    setShowSuggestions(false);
    try {
      const url = `${PHOTON_URL}${encodeURIComponent(inputText)}&limit=1&lang=en`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      const f = data.features?.[0];
      if (f) {
        const label = formatPhotonLabel(f.properties);
        const lat = f.geometry.coordinates[1];
        const lng = f.geometry.coordinates[0];
        setInputText(label);
        const newCoords = { lat, lng };
        setCoords(newCoords);
        notifyChange(label, lat, lng, geofenceRadius);
        if (!mapExpanded) setMapExpanded(true);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], DEFAULT_ZOOM_DETAIL);
        }
        placeMarkerOnMap(lat, lng);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // ── Nominatim reverse geocode (only on map click/drag) ────────────────────
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(`${NOMINATIM_REV}lat=${lat}&lon=${lng}`, { signal: AbortSignal.timeout(6000) });
      const data = await res.json();
      if (data?.display_name) {
        setInputText(data.display_name);
        notifyChange(data.display_name, lat, lng, geofenceRadius);
      } else {
        notifyChange(inputText, lat, lng, geofenceRadius);
      }
    } catch {
      notifyChange(inputText, lat, lng, geofenceRadius);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geofenceRadius, notifyChange]);

  // ── Marker helper (separated from state update) ───────────────────────────
  const placeMarkerOnMap = useCallback((lat, lng) => {
    if (!mapInstanceRef.current) return;
    const icon = L.divIcon({
      html: '<div style="background:#1E3A5F;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,.5)"></div>',
      iconSize: [22, 22], iconAnchor: [11, 11], className: '',
    });
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      circleRef.current?.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(mapInstanceRef.current);
      circleRef.current = L.circle([lat, lng], {
        radius: geofenceRadius, color: '#1E3A5F', weight: 2, fillColor: '#1E3A5F', fillOpacity: 0.12,
      }).addTo(mapInstanceRef.current);
      markerRef.current.on('dragend', (e) => {
        const { lat: dlat, lng: dlng } = e.target.getLatLng();
        setCoords({ lat: dlat, lng: dlng });
        circleRef.current?.setLatLng([dlat, dlng]);
        reverseGeocode(dlat, dlng);
      });
    }
    setCoords({ lat, lng });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geofenceRadius]);

  // ── Initialize Leaflet map ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapExpanded || !containerRef.current || mapInstanceRef.current) return;

    const center = coords ? [coords.lat, coords.lng] : DEFAULT_CENTER;
    const zoom = coords ? DEFAULT_ZOOM_DETAIL : DEFAULT_ZOOM_OVERVIEW;
    const map = L.map(containerRef.current, { zoomControl: true }).setView(center, zoom);

    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);

    if (coords) placeMarkerOnMap(coords.lat, coords.lng);

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      placeMarkerOnMap(lat, lng);
      reverseGeocode(lat, lng);
    });

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapExpanded]);

  // Update geofence circle when slider changes
  useEffect(() => {
    circleRef.current?.setRadius(geofenceRadius);
    if (coords) notifyChange(inputText, coords.lat, coords.lng, geofenceRadius);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geofenceRadius]);

  // ── GPS ────────────────────────────────────────────────────────────────────
  const handleGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => {
        setGpsLoading(false);
        setCoords({ lat, lng });
        if (!mapExpanded) setMapExpanded(true);
        mapInstanceRef.current?.setView([lat, lng], DEFAULT_ZOOM_DETAIL);
        placeMarkerOnMap(lat, lng);
        reverseGeocode(lat, lng);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const clearLocation = () => {
    setCoords(null);
    setInputText('');
    setSuggestions([]);
    markerRef.current?.remove(); markerRef.current = null;
    circleRef.current?.remove(); circleRef.current = null;
    onChange({ address: '', latitude: null, longitude: null, geofence_radius: geofenceRadius });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-2" ref={wrapperRef}>
      {/* Address input row */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
            <Input
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } if (e.key === 'Escape') setShowSuggestions(false); }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Enter school address..."
              className="pl-9 h-10 text-sm"
              autoComplete="off"
              data-testid="map-address-input"
            />
            {loadingSuggestions && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
            )}
          </div>

          <Button type="button" variant="outline" size="sm" onClick={handleSearch}
            className="px-3 border-slate-300 text-slate-600 hover:bg-slate-50 shrink-0"
            data-testid="map-search-btn" title="Search">
            <Search className="w-4 h-4" />
          </Button>

          <Button type="button" variant="outline" size="sm" onClick={handleGPS} disabled={gpsLoading}
            className="px-3 border-slate-300 text-slate-600 hover:bg-slate-50 shrink-0"
            data-testid="map-gps-btn" title="Use current location">
            <Navigation className={`w-4 h-4 ${gpsLoading ? 'animate-pulse text-blue-600' : ''}`} />
          </Button>

          <Button type="button" variant="outline" size="sm"
            onClick={() => setMapExpanded(v => !v)}
            className="px-3 border-indigo-200 text-indigo-600 hover:bg-indigo-50 shrink-0 text-xs gap-1"
            data-testid="map-toggle-btn">
            <MapPin className="w-3.5 h-3.5" />
            {mapExpanded ? 'Hide' : 'Map'}
            {mapExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"
            style={{ maxHeight: 220, overflowY: 'auto' }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 flex items-start gap-2 border-b border-slate-100 last:border-0 transition-colors"
                data-testid={`map-suggestion-${i}`}
              >
                <MapPin className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                <span className="text-sm text-slate-700 leading-snug">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Coordinates badge */}
      {coords && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
            {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          </span>
          <button type="button" onClick={clearLocation}
            className="text-red-400 hover:text-red-600 transition-colors" title="Clear location">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Map panel */}
      {mapExpanded && (
        <div className="rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <div ref={containerRef} style={{ height: 300, width: '100%' }} data-testid="school-map-container" />
          <div className="bg-slate-50 border-t border-slate-200 px-3 py-2 flex items-center gap-3">
            <span className="text-xs text-slate-600 whitespace-nowrap font-medium">Geofence</span>
            <input type="range" min={100} max={5000} step={100} value={geofenceRadius}
              onChange={(e) => setGeofenceRadius(Number(e.target.value))}
              className="flex-1 accent-indigo-600" data-testid="geofence-slider" />
            <span className="text-xs font-mono text-slate-700 whitespace-nowrap w-14 text-right">
              {geofenceRadius >= 1000 ? `${(geofenceRadius / 1000).toFixed(1)} km` : `${geofenceRadius} m`}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 text-center py-1 bg-slate-50">
            Click map to place pin · Drag pin to adjust
          </p>
        </div>
      )}
    </div>
  );
}
