/**
 * SchoolMapPicker — Select school address via interactive map + geocoding.
 * Uses Leaflet.js (OpenStreetMap tiles) + Nominatim for free geocoding.
 * No API keys required.
 *
 * Props:
 *   value     — { address, latitude, longitude, geofence_radius }
 *   onChange  — (newValue) => void
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, Navigation, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

const DEFAULT_CENTER = [20.5937, 78.9629]; // India
const DEFAULT_ZOOM_OVERVIEW = 5;
const DEFAULT_ZOOM_DETAIL = 14;
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse?format=json&';

export function SchoolMapPicker({ value = {}, onChange }) {
  const [mapExpanded, setMapExpanded] = useState(false);
  const [searchText, setSearchText] = useState(value.address || '');
  const [searching, setSearching] = useState(false);
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

  // Notify parent on change
  const notifyChange = useCallback((address, lat, lng, radius) => {
    onChange({ address, latitude: lat, longitude: lng, geofence_radius: radius });
  }, [onChange]);

  // Geocode: text → coordinates
  const geocode = async (query) => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${NOMINATIM_SEARCH}${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newCoords = { lat: parseFloat(lat), lng: parseFloat(lon) };
        setCoords(newCoords);
        setSearchText(display_name);
        notifyChange(display_name, newCoords.lat, newCoords.lng, geofenceRadius);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([newCoords.lat, newCoords.lng], DEFAULT_ZOOM_DETAIL);
          placeMarker(newCoords.lat, newCoords.lng);
        }
      } else {
        alert('Location not found. Please try a more specific address.');
      }
    } catch {
      alert('Geocoding failed. Please check your connection.');
    } finally {
      setSearching(false);
    }
  };

  // Reverse geocode: coordinates → address
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`${NOMINATIM_REVERSE}lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.display_name) {
        setSearchText(data.display_name);
        notifyChange(data.display_name, lat, lng, geofenceRadius);
      } else {
        notifyChange(searchText, lat, lng, geofenceRadius);
      }
    } catch {
      notifyChange(searchText, lat, lng, geofenceRadius);
    }
  };

  // Place / move marker and circle
  const placeMarker = useCallback((lat, lng) => {
    if (!mapInstanceRef.current) return;

    const icon = L.divIcon({
      html: '<div style="background:#1E3A5F;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.5);cursor:pointer"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      className: '',
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      circleRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(mapInstanceRef.current);
      circleRef.current = L.circle([lat, lng], {
        radius: geofenceRadius,
        color: '#1E3A5F',
        weight: 2,
        fillColor: '#1E3A5F',
        fillOpacity: 0.1,
      }).addTo(mapInstanceRef.current);

      markerRef.current.on('dragend', (e) => {
        const { lat: dlat, lng: dlng } = e.target.getLatLng();
        setCoords({ lat: dlat, lng: dlng });
        circleRef.current.setLatLng([dlat, dlng]);
        reverseGeocode(dlat, dlng);
      });
    }
    setCoords({ lat, lng });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geofenceRadius]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapExpanded || !containerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    const center = coords ? [coords.lat, coords.lng] : DEFAULT_CENTER;
    const zoom = coords ? DEFAULT_ZOOM_DETAIL : DEFAULT_ZOOM_OVERVIEW;
    const map = L.map(containerRef.current).setView(center, zoom);

    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION }).addTo(map);

    // Existing pin
    if (coords) placeMarker(coords.lat, coords.lng);

    // Click to place
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      placeMarker(lat, lng);
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

  // Update circle radius when slider changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(geofenceRadius);
    }
    if (coords) {
      notifyChange(searchText, coords.lat, coords.lng, geofenceRadius);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geofenceRadius]);

  // GPS location
  const handleGPS = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setGpsLoading(false);
        if (!mapExpanded) setMapExpanded(true);
        setCoords({ lat, lng });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], DEFAULT_ZOOM_DETAIL);
          placeMarker(lat, lng);
        }
        reverseGeocode(lat, lng);
      },
      () => { setGpsLoading(false); alert('Could not get GPS location.'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearchKey = (e) => { if (e.key === 'Enter') geocode(searchText); };

  const handleAddressChange = (e) => {
    setSearchText(e.target.value);
    // Update parent's address without changing coords
    onChange({ ...value, address: e.target.value });
  };

  return (
    <div className="space-y-2">
      {/* Address input row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchText}
            onChange={handleAddressChange}
            onKeyDown={handleSearchKey}
            placeholder="Enter full school address"
            className="pl-9 h-10 text-sm"
            data-testid="map-address-input"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => geocode(searchText)}
          disabled={searching}
          className="px-3 border-slate-300 text-slate-600 hover:bg-slate-50 shrink-0"
          data-testid="map-search-btn"
          title="Search address"
        >
          <Search className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGPS}
          disabled={gpsLoading}
          className="px-3 border-slate-300 text-slate-600 hover:bg-slate-50 shrink-0"
          data-testid="map-gps-btn"
          title="Use current GPS location"
        >
          <Navigation className={`w-4 h-4 ${gpsLoading ? 'animate-pulse text-blue-600' : ''}`} />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMapExpanded(v => !v)}
          className="px-3 border-indigo-200 text-indigo-600 hover:bg-indigo-50 shrink-0 text-xs gap-1"
          data-testid="map-toggle-btn"
        >
          <MapPin className="w-3.5 h-3.5" />
          {mapExpanded ? 'Hide' : 'Map'}
          {mapExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
      </div>

      {/* Coordinates display */}
      {coords && (
        <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
            {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          </span>
          <button
            type="button"
            onClick={() => {
              setCoords(null);
              setSearchText('');
              markerRef.current?.remove(); markerRef.current = null;
              circleRef.current?.remove(); circleRef.current = null;
              onChange({ address: '', latitude: null, longitude: null, geofence_radius: geofenceRadius });
            }}
            className="text-red-400 hover:text-red-600"
            title="Clear location"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Map panel */}
      {mapExpanded && (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div
            ref={containerRef}
            style={{ height: 300, width: '100%' }}
            data-testid="school-map-container"
          />
          {/* Geofence slider */}
          <div className="bg-slate-50 border-t border-slate-200 px-3 py-2 flex items-center gap-3">
            <span className="text-xs text-slate-600 whitespace-nowrap font-medium">
              Geofence Radius
            </span>
            <input
              type="range"
              min={100}
              max={5000}
              step={100}
              value={geofenceRadius}
              onChange={(e) => setGeofenceRadius(Number(e.target.value))}
              className="flex-1 accent-indigo-600"
              data-testid="geofence-slider"
            />
            <span className="text-xs font-mono text-slate-700 whitespace-nowrap w-16 text-right">
              {geofenceRadius >= 1000 ? `${(geofenceRadius / 1000).toFixed(1)} km` : `${geofenceRadius} m`}
            </span>
          </div>
          <p className="text-xs text-slate-400 text-center py-1 bg-slate-50">
            Click map to place pin · Drag pin to adjust
          </p>
        </div>
      )}
    </div>
  );
}
