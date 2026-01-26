import { useState } from 'react';
import { Input } from './ui/input';
import { ChevronDown } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+91', country: 'IN', name: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'US', name: 'United States', flag: '🇺🇸' },
  { code: '+44', country: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+971', country: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: '+61', country: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: '+49', country: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'FR', name: 'France', flag: '🇫🇷' },
  { code: '+81', country: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: '+86', country: 'CN', name: 'China', flag: '🇨🇳' },
  { code: '+82', country: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: '+60', country: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: '+966', country: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+974', country: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: '+968', country: 'OM', name: 'Oman', flag: '🇴🇲' },
  { code: '+973', country: 'BH', name: 'Bahrain', flag: '🇧🇭' },
  { code: '+977', country: 'NP', name: 'Nepal', flag: '🇳🇵' },
  { code: '+94', country: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+880', country: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: '+92', country: 'PK', name: 'Pakistan', flag: '🇵🇰' },
];

const PhoneInput = ({ 
  value, 
  onChange, 
  countryCode = '+91',
  onCountryCodeChange,
  placeholder = 'Enter phone number',
  className = '',
  inputClassName = '',
  disabled = false,
  'data-testid': testId = 'phone-input'
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCode, setSelectedCode] = useState(
    COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0]
  );

  const handleCountrySelect = (country) => {
    setSelectedCode(country);
    setShowDropdown(false);
    if (onCountryCodeChange) {
      onCountryCodeChange(country.code);
    }
  };

  const handlePhoneChange = (e) => {
    // Only allow digits
    const digits = e.target.value.replace(/\D/g, '').slice(0, 15);
    onChange(digits);
  };

  return (
    <div className={`relative flex ${className}`}>
      {/* Country Code Selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setShowDropdown(!showDropdown)}
          className={`flex items-center gap-1 px-3 h-10 bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg hover:bg-slate-200 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          data-testid={`${testId}-country`}
        >
          <span className="text-lg">{selectedCode.flag}</span>
          <span className="text-sm font-medium text-slate-700">{selectedCode.code}</span>
          <ChevronDown className="w-3 h-3 text-slate-500" />
        </button>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 mt-1 w-56 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50">
            {COUNTRY_CODES.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleCountrySelect(country)}
                className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors text-left ${
                  selectedCode.code === country.code ? 'bg-blue-50' : ''
                }`}
              >
                <span className="text-lg">{country.flag}</span>
                <span className="text-sm text-slate-700 flex-1">{country.name}</span>
                <span className="text-sm font-medium text-slate-500">{country.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Phone Number Input */}
      <Input
        type="tel"
        value={value}
        onChange={handlePhoneChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`rounded-l-none flex-1 ${inputClassName}`}
        data-testid={testId}
      />

      {/* Backdrop to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default PhoneInput;
export { COUNTRY_CODES };
