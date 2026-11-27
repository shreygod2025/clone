import { useEffect, useState } from 'react';
import axios from 'axios';
import { ChevronDown, Check, MapPin } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '../../components/ui/command';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
let citiesCache = null;

const useCities = () => {
  const [cities, setCities] = useState(citiesCache || []);
  useEffect(() => {
    if (citiesCache) return;
    axios.get(`${API}/cities`).then((r) => {
      citiesCache = (r.data || []).filter((c) => c.is_active !== false).map((c) => ({ name: c.name, state: c.state }));
      setCities(citiesCache);
    }).catch(() => {});
  }, []);
  return cities;
};

// Searchable city picker backed by the cities database; typed names not in the list are allowed.
export const CityCombobox = ({ value, onChange, testid = 'city-combobox' }) => {
  const cities = useCities();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const pick = (v) => { onChange(v); setOpen(false); setQ(''); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={`fr-select ${value ? '' : 'ph'}`} data-testid={testid}>
          <MapPin size={15} /> <span>{value || 'Select your city'}</span> <ChevronDown size={15} style={{ marginLeft: 'auto', opacity: 0.6 }} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[260px] z-[100]" align="start">
        <Command>
          <CommandInput placeholder="Search city…" value={q} onValueChange={setQ} data-testid={`${testid}-search`} />
          <CommandList className="max-h-64">
            <CommandEmpty>
              {q.trim().length > 1 ? (
                <button type="button" className="w-full text-left px-3 py-2 text-sm font-semibold text-blue-700" onClick={() => pick(q.trim())} data-testid={`${testid}-use-typed`}>
                  Use &ldquo;{q.trim()}&rdquo;
                </button>
              ) : 'No city found.'}
            </CommandEmpty>
            <CommandGroup>
              {cities.map((c) => {
                const label = `${c.name}, ${c.state}`;
                return (
                  <CommandItem key={label} value={label} onSelect={() => pick(label)} data-testid={`${testid}-option-${c.name.toLowerCase().replace(/\s+/g, '-')}`}>
                    <Check className={`w-3.5 h-3.5 mr-2 ${value === label ? 'opacity-100' : 'opacity-0'}`} />
                    <span className="font-semibold">{c.name}</span><span className="ml-1.5 text-xs text-slate-400">{c.state}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
