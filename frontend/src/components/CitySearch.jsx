import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, ChevronDown, X } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Module-level cache so cities load only once per session
let cachedCities = null;
let fetchPromise = null;

async function loadAllCities() {
  if (cachedCities) return cachedCities;
  if (fetchPromise) return fetchPromise;
  fetchPromise = axios.get(`${API}/api/cities`)
    .then(res => {
      cachedCities = res.data || [];
      fetchPromise = null;
      return cachedCities;
    })
    .catch(() => {
      fetchPromise = null;
      return [];
    });
  return fetchPromise;
}

/**
 * Searchable city combobox.
 * Props: value, onChange(cityName), placeholder, className, disabled, required
 */
export default function CitySearch({
  value = '',
  onChange,
  placeholder = 'Search city...',
  className = '',
  disabled = false,
  required = false,
  'data-testid': testId,
}) {
  const [cities, setCities] = useState([]);
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Sync query when value changes externally
  useEffect(() => { setQuery(value || ''); }, [value]);

  // Load cities once
  useEffect(() => {
    loadAllCities().then(setCities);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.length < 1
    ? cities.slice(0, 12)
    : cities.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        (c.state && c.state.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 12);

  const handleSelect = useCallback((cityName) => {
    setQuery(cityName);
    setOpen(false);
    onChange && onChange(cityName);
  }, [onChange]);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setOpen(true);
    setHighlighted(0);
    // If cleared, notify parent
    if (!e.target.value) onChange && onChange('');
  };

  const handleKeyDown = (e) => {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlighted]) handleSelect(filtered[highlighted].name); }
    else if (e.key === 'Escape') setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setQuery('');
    onChange && onChange('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          data-testid={testId}
          className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
          autoComplete="off"
        />
        {query ? (
          <button type="button" onClick={handleClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-52 overflow-y-auto">
          {filtered.map((city, idx) => (
            <button
              key={city.id || city.name}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(city.name); }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors ${highlighted === idx ? 'bg-slate-100' : ''}`}
            >
              <span className="font-medium text-slate-800">{city.name}</span>
              {city.state && <span className="text-xs text-slate-400 ml-2 truncate max-w-[120px]">{city.state}</span>}
            </button>
          ))}
        </div>
      )}

      {open && query.length > 0 && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg px-3 py-2 text-sm text-slate-500">
          No cities found. Type to enter custom city.
        </div>
      )}
    </div>
  );
}
