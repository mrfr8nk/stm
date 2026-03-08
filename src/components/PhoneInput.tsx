import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ChevronDown, Search } from "lucide-react";

const COUNTRY_CODES = [
  { code: "+93", country: "AF", name: "Afghanistan", flag: "🇦🇫" },
  { code: "+355", country: "AL", name: "Albania", flag: "🇦🇱" },
  { code: "+213", country: "DZ", name: "Algeria", flag: "🇩🇿" },
  { code: "+376", country: "AD", name: "Andorra", flag: "🇦🇩" },
  { code: "+244", country: "AO", name: "Angola", flag: "🇦🇴" },
  { code: "+54", country: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "+61", country: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "+43", country: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "+880", country: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "+32", country: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "+267", country: "BW", name: "Botswana", flag: "🇧🇼" },
  { code: "+55", country: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "+237", country: "CM", name: "Cameroon", flag: "🇨🇲" },
  { code: "+1", country: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "+86", country: "CN", name: "China", flag: "🇨🇳" },
  { code: "+243", country: "CD", name: "Congo (DRC)", flag: "🇨🇩" },
  { code: "+242", country: "CG", name: "Congo (Republic)", flag: "🇨🇬" },
  { code: "+45", country: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "+20", country: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "+251", country: "ET", name: "Ethiopia", flag: "🇪🇹" },
  { code: "+358", country: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "+33", country: "FR", name: "France", flag: "🇫🇷" },
  { code: "+233", country: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "+49", country: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "+30", country: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "+91", country: "IN", name: "India", flag: "🇮🇳" },
  { code: "+62", country: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "+98", country: "IR", name: "Iran", flag: "🇮🇷" },
  { code: "+353", country: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "+972", country: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "+39", country: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "+81", country: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "+254", country: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "+266", country: "LS", name: "Lesotho", flag: "🇱🇸" },
  { code: "+231", country: "LR", name: "Liberia", flag: "🇱🇷" },
  { code: "+265", country: "MW", name: "Malawi", flag: "🇲🇼" },
  { code: "+60", country: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "+52", country: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "+258", country: "MZ", name: "Mozambique", flag: "🇲🇿" },
  { code: "+264", country: "NA", name: "Namibia", flag: "🇳🇦" },
  { code: "+31", country: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "+64", country: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "+234", country: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "+47", country: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "+92", country: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "+63", country: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "+48", country: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "+351", country: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "+7", country: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "+250", country: "RW", name: "Rwanda", flag: "🇷🇼" },
  { code: "+966", country: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+27", country: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "+82", country: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "+34", country: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "+46", country: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "+41", country: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "+255", country: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "+66", country: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "+90", country: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "+256", country: "UG", name: "Uganda", flag: "🇺🇬" },
  { code: "+380", country: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "+971", country: "AE", name: "UAE", flag: "🇦🇪" },
  { code: "+44", country: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+1", country: "US", name: "United States", flag: "🇺🇸" },
  { code: "+260", country: "ZM", name: "Zambia", flag: "🇿🇲" },
  { code: "+263", country: "ZW", name: "Zimbabwe", flag: "🇿🇼" },
];

// Normalize phone: strip leading 0, spaces, dashes
export const normalizePhone = (phone: string, countryCode: string): string => {
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  // Remove leading + and country code if already present
  if (cleaned.startsWith(countryCode)) {
    cleaned = cleaned.slice(countryCode.length);
  } else if (cleaned.startsWith(countryCode.replace("+", ""))) {
    cleaned = cleaned.slice(countryCode.replace("+", "").length);
  }
  // Remove leading 0
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }
  return `${countryCode}${cleaned}`;
};

interface PhoneInputProps {
  value: string;
  onChange: (fullNumber: string) => void;
  placeholder?: string;
  defaultCountry?: string;
  disabled?: boolean;
}

const PhoneInput = ({ value, onChange, placeholder, defaultCountry = "ZW", disabled = false }: PhoneInputProps) => {
  const defaultCC = COUNTRY_CODES.find(c => c.country === defaultCountry) || COUNTRY_CODES.find(c => c.country === "ZW")!;
  const [selectedCountry, setSelectedCountry] = useState(defaultCC);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Extract local number from value
  const getLocalNumber = () => {
    if (!value) return "";
    let v = value;
    // Strip known country code prefix
    for (const cc of COUNTRY_CODES) {
      if (v.startsWith(cc.code) && v.length > cc.code.length) {
        if (cc.code === selectedCountry.code) {
          return v.slice(cc.code.length);
        }
      }
    }
    // If starts with + but doesn't match, return as-is minus the +
    if (v.startsWith("+")) {
      const digits = v.replace(/\D/g, "");
      return digits;
    }
    // Strip leading 0
    if (v.startsWith("0")) return v.slice(1);
    return v;
  };

  const [localNumber, setLocalNumber] = useState(getLocalNumber());

  useEffect(() => {
    setLocalNumber(getLocalNumber());
  }, [value]);

  useEffect(() => {
    if (dropdownOpen && searchRef.current) searchRef.current.focus();
  }, [dropdownOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search
    ? COUNTRY_CODES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.includes(search) || c.country.toLowerCase().includes(search.toLowerCase()))
    : COUNTRY_CODES;

  const handleLocalChange = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, "");
    setLocalNumber(digits);
    if (digits) {
      onChange(normalizePhone(digits, selectedCountry.code));
    } else {
      onChange("");
    }
  };

  const handleCountrySelect = (country: typeof COUNTRY_CODES[0]) => {
    setSelectedCountry(country);
    setDropdownOpen(false);
    setSearch("");
    if (localNumber) {
      onChange(normalizePhone(localNumber, country.code));
    }
  };

  return (
    <div className="relative flex" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-1 px-2 py-2 border border-input border-r-0 rounded-l-md bg-muted/50 text-sm hover:bg-muted transition-colors min-w-[90px] disabled:opacity-50"
      >
        <span className="text-base">{selectedCountry.flag}</span>
        <span className="text-xs font-medium text-foreground">{selectedCountry.code}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>

      {dropdownOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-64 max-h-64 overflow-hidden rounded-lg border bg-popover shadow-lg">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search country..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.map(c => (
              <button
                key={`${c.country}-${c.code}`}
                type="button"
                onClick={() => handleCountrySelect(c)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left ${c.country === selectedCountry.country ? "bg-primary/10 font-medium" : ""}`}
              >
                <span className="text-base">{c.flag}</span>
                <span className="flex-1 text-foreground">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.code}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">No countries found</p>
            )}
          </div>
        </div>
      )}

      <Input
        type="tel"
        disabled={disabled}
        placeholder={placeholder || "7X XXX XXXX"}
        value={localNumber}
        onChange={e => handleLocalChange(e.target.value)}
        className="rounded-l-none flex-1"
      />
    </div>
  );
};

export default PhoneInput;
