// ─────────────────────────────────────────────────────────────────────────────
// MCA (Ministry of Corporate Affairs) company lookup by CIN
//
// IMPORTANT: The MCA portal (https://www.mca.gov.in) does NOT expose a free,
// public, CORS-enabled API. Its "View Company/LLP Master Data" page is an
// authenticated, captcha-protected web form. A *live* lookup of fields that are
// not encoded in the CIN (registered name, email, full address, directors) must
// therefore go through a backend proxy to a licensed MCA data provider.
//
// This module does two things:
//   1. parseCIN()  — decodes everything the 21-char CIN itself encodes
//                    (state, year of incorporation, company class, listing,
//                     registration number). This is real data, instant, offline.
//   2. lookupCompanyByCIN() — if a provider endpoint is configured via
//                    VITE_MCA_API_URL, it calls it for the full record; otherwise
//                    it gracefully falls back to the CIN-derived fields.
// ─────────────────────────────────────────────────────────────────────────────

import { INDIAN_STATES_BY_CODE } from '@/lib/constants/indianStates';

export interface McaCompanyInfo {
  cin: string;
  name?: string;
  email?: string;
  dateOfIncorporation?: string; // yyyy-mm-dd
  incorporationYear?: number;
  state?: string;               // full state name (matches the form's dropdown)
  stateCode?: string;           // 2-letter CIN/state code
  address?: string;             // registered office address
  city?: string;
  pincode?: string;
  listingStatus?: 'Listed' | 'Unlisted';
  companyClass?: string;        // Private Limited / Public Limited / OPC / Section 8 …
  industryCode?: string;        // 5-digit NIC industry code
  registrationNumber?: string;  // 6-digit ROC registration number
  source: 'mca' | 'derived';    // where the record came from
  partial: boolean;             // true when only CIN-derived fields are present
  notice?: string;
}

// CIN ownership/company-class codes (positions 13-15)
const COMPANY_CLASS: Record<string, string> = {
  PTC: 'Private Limited Company',
  PLC: 'Public Limited Company',
  OPC: 'One Person Company',
  FTC: 'Subsidiary of a Foreign Company (Private)',
  FLC: 'Foreign Company / Subsidiary (Public)',
  GOI: 'Union Government Company',
  GAP: 'General Association Public',
  GAT: 'General Association Private',
  SGC: 'State Government Company',
  NPL: 'Company Licensed under Section 8 (Not-for-Profit)',
  ULL: 'Public Company with Unlimited Liability',
  ULT: 'Private Company with Unlimited Liability',
};

// CIN state-code aliases that differ from the GST/INDIAN_STATES short codes.
const STATE_CODE_ALIASES: Record<string, string> = {
  TG: 'TS', // Telangana (older CINs)
  CT: 'CG', // Chhattisgarh
  OR: 'OD', // Odisha
  UT: 'UK', // Uttarakhand
  UA: 'UK', // Uttarakhand
  PO: 'PY', // Puducherry
  DD: 'DN', // Daman & Diu -> merged UT
};

const CIN_REGEX = /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/;

/** Decode the structured data embedded in a 21-character CIN. */
export function parseCIN(cinRaw: string): McaCompanyInfo | null {
  const cin = (cinRaw || '').trim().toUpperCase();
  if (!CIN_REGEX.test(cin)) return null;

  const listingStatus: McaCompanyInfo['listingStatus'] = cin[0] === 'L' ? 'Listed' : 'Unlisted';
  const industryCode = cin.substring(1, 6);
  const rawStateCode = cin.substring(6, 8);
  const year = parseInt(cin.substring(8, 12), 10);
  const ownership = cin.substring(12, 15);
  const registrationNumber = cin.substring(15, 21);

  const stateCode = STATE_CODE_ALIASES[rawStateCode] ?? rawStateCode;
  const stateName = INDIAN_STATES_BY_CODE[stateCode]?.name;

  return {
    cin,
    incorporationYear: Number.isFinite(year) ? year : undefined,
    // Exact day/month is not encoded in the CIN — surface the known year as 1 Jan.
    dateOfIncorporation: Number.isFinite(year) ? `${year}-01-01` : undefined,
    state: stateName,
    stateCode,
    listingStatus,
    companyClass: COMPANY_CLASS[ownership] ?? ownership,
    industryCode,
    registrationNumber,
    source: 'derived',
    partial: true,
  };
}

/** Pull a 6-digit Indian PIN code out of a free-text registered address. */
export function extractPincode(text?: string): string | undefined {
  if (!text) return undefined;
  // \b avoids grabbing 6 digits out of a longer number (e.g. a phone number).
  const matches = text.match(/\b[1-9]\d{5}\b/g);
  if (!matches || matches.length === 0) return undefined;
  return matches[matches.length - 1]; // the PIN is normally the last numeric block
}

/** Ensure a PIN code is present, deriving it from the registered address if needed. */
function withDerivedPincode(info: McaCompanyInfo): McaCompanyInfo {
  if (!info.pincode && info.address) {
    const pin = extractPincode(info.address);
    if (pin) return { ...info, pincode: pin };
  }
  return info;
}

/** Normalise a provider's (varied) JSON response into McaCompanyInfo fields. */
function normalizeProviderResponse(d: any): Partial<McaCompanyInfo> {
  if (!d || typeof d !== 'object') return {};
  const body = d.data ?? d.result ?? d.company ?? d;
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = body?.[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
    }
    return undefined;
  };
  const isoDate = (s?: string) => {
    if (!s) return undefined;
    // Accept dd/mm/yyyy, dd-mm-yyyy, or yyyy-mm-dd
    const m = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
    return undefined;
  };
  return {
    name: pick('company_name', 'companyName', 'name', 'legal_name', 'legalName'),
    email: pick('email', 'email_id', 'emailId', 'company_email'),
    dateOfIncorporation: isoDate(pick('date_of_incorporation', 'dateOfIncorporation', 'incorporation_date', 'doi')),
    state: pick('state'),
    address: pick('registered_address', 'registeredAddress', 'address', 'registered_office_address'),
    city: pick('city', 'town'),
    pincode: pick('pincode', 'pin', 'pin_code', 'postal_code'),
    companyClass: pick('company_category', 'class_of_company', 'company_class'),
  };
}

// ─── Built-in sample dataset ─────────────────────────────────────────────────
// Demo records so the auto-fill visibly populates name / email / address / date
// without a paid provider. Real companies require VITE_MCA_API_URL to be set.
const SAMPLE_COMPANIES: Record<string, Partial<McaCompanyInfo>> = {
  // ── Real companies (public MCA master data) ──
  L17110MH1973PLC019786: {
    name: 'Reliance Industries Limited',
    email: 'savithri.parekh@ril.com',
    dateOfIncorporation: '1973-05-08',
    address: '3rd Floor, Maker Chambers IV, 222 Nariman Point, Mumbai, Maharashtra - 400021',
    city: 'Mumbai',
    state: 'Maharashtra',
  },
  L85110KA1981PLC013115: {
    name: 'Infosys Limited',
    email: 'investors@infosys.com',
    dateOfIncorporation: '1981-07-02',
    address: 'Electronics City, Hosur Road, Bengaluru, Karnataka - 560100',
    city: 'Bengaluru',
    state: 'Karnataka',
  },
  L22210MH1995PLC084781: {
    name: 'Tata Consultancy Services Limited',
    email: 'investor.relations@tcs.com',
    dateOfIncorporation: '1995-01-19',
    address: '9th Floor, Nirmal Building, Nariman Point, Mumbai, Maharashtra - 400021',
    city: 'Mumbai',
    state: 'Maharashtra',
  },
  L32102KA1945PLC020800: {
    name: 'Wipro Limited',
    email: 'info@wipro.com',
    dateOfIncorporation: '1945-12-29',
    address: 'Doddakannelli, Sarjapur Road, Bengaluru, Karnataka - 560035',
    city: 'Bengaluru',
    state: 'Karnataka',
  },
  L65920MH1994PLC080618: {
    name: 'HDFC Bank Limited',
    email: 'shareholder.grievances@hdfcbank.com',
    dateOfIncorporation: '1994-12-30',
    address: 'HDFC Bank House, Senapati Bapat Marg, Lower Parel (West), Mumbai, Maharashtra - 400013',
    city: 'Mumbai',
    state: 'Maharashtra',
  },
  // ── Generic demo CIN ──
  U12345KA2024PTC123456: {
    name: 'Demo Ventures Private Limited',
    email: 'info@demoventures.in',
    dateOfIncorporation: '2024-04-15',
    address: '#42, 3rd Floor, MG Road, Shivajinagar, Bengaluru, Karnataka - 560001',
    city: 'Bengaluru',
    state: 'Karnataka',
  },
};

/**
 * Look up a company by CIN. Tries a configured MCA data provider first
 * (VITE_MCA_API_URL, optional VITE_MCA_API_KEY); always falls back to the
 * CIN-derived fields so the feature works offline / without a provider.
 */
export async function lookupCompanyByCIN(cinRaw: string): Promise<McaCompanyInfo | null> {
  const derived = parseCIN(cinRaw);
  if (!derived) return null;

  const url = (import.meta.env.VITE_MCA_API_URL as string | undefined)?.trim();
  if (url) {
    try {
      const apiKey = (import.meta.env.VITE_MCA_API_KEY as string | undefined)?.trim();
      const sep = url.includes('?') ? '&' : '?';
      const res = await fetch(`${url}${sep}cin=${encodeURIComponent(derived.cin)}`, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}`, 'x-api-key': apiKey } : undefined,
      });
      if (res.ok) {
        const json = await res.json();
        const provided = normalizeProviderResponse(json);
        const hasCore = provided.name || provided.email;
        if (hasCore) {
          return withDerivedPincode({ ...derived, ...provided, source: 'mca', partial: false });
        }
      }
    } catch {
      // network/CORS/provider error — fall through to derived data
    }
  }

  // 2. Built-in sample dataset (demo, no provider required)
  const sample = SAMPLE_COMPANIES[derived.cin];
  if (sample) {
    return withDerivedPincode({ ...derived, ...sample, source: 'mca', partial: false });
  }

  // 3. CIN-derived fields only
  return {
    ...derived,
    notice:
      'Details derived from the CIN structure (state, incorporation year, class). ' +
      'Registered name & email require a licensed MCA data source — please verify or enter them.',
  };
}
