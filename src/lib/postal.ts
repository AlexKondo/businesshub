// Postal-code formatting per region. The active locale reflects the visitor's
// region (set by geo detection, overridable by the language toggle), so the
// mask, validation and placeholder follow that. Address auto-fill is only
// available for Brazil (ViaCEP), so `autofill` is true only there.
export type PostalConfig = {
  format: (raw: string) => string;
  isValid: (raw: string) => boolean;
  placeholder: string;
  autofill: boolean;
};

function digits(raw: string, max: number) {
  return raw.replace(/\D/g, "").slice(0, max);
}

const POSTAL: Record<string, PostalConfig> = {
  // Brazil — CEP: 00000-000
  "pt-BR": {
    format: (r) => {
      const d = digits(r, 8);
      return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
    },
    isValid: (r) => r.replace(/\D/g, "").length === 8,
    placeholder: "00000-000",
    autofill: true,
  },
  // United States — ZIP: 12345 or 12345-6789
  "en-US": {
    format: (r) => {
      const d = digits(r, 9);
      return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
    },
    isValid: (r) => {
      const len = r.replace(/\D/g, "").length;
      return len === 5 || len === 9;
    },
    placeholder: "12345",
    autofill: false,
  },
  // Japan — 〒: 000-0000
  ja: {
    format: (r) => {
      const d = digits(r, 7);
      return d.length <= 3 ? d : `${d.slice(0, 3)}-${d.slice(3)}`;
    },
    isValid: (r) => r.replace(/\D/g, "").length === 7,
    placeholder: "000-0000",
    autofill: false,
  },
  // China — 6 digits
  "zh-CN": {
    format: (r) => digits(r, 6),
    isValid: (r) => r.replace(/\D/g, "").length === 6,
    placeholder: "000000",
    autofill: false,
  },
  // Spanish-speaking regions — commonly 5 digits (Spain, Mexico, etc.)
  es: {
    format: (r) => digits(r, 5),
    isValid: (r) => r.replace(/\D/g, "").length === 5,
    placeholder: "00000",
    autofill: false,
  },
};

export function postalConfig(locale: string): PostalConfig {
  return POSTAL[locale] ?? POSTAL["en-US"];
}
