export interface IndianState {
  code: string;
  name: string;
  gstCode: string;
}

/**
 * All 28 states and 8 union territories of India with their
 * 2-digit GST state codes as per GSTN.
 */
export const INDIAN_STATES: IndianState[] = [
  // ── States ────────────────────────────────────
  { code: 'AP', name: 'Andhra Pradesh', gstCode: '37' },
  { code: 'AR', name: 'Arunachal Pradesh', gstCode: '12' },
  { code: 'AS', name: 'Assam', gstCode: '18' },
  { code: 'BR', name: 'Bihar', gstCode: '10' },
  { code: 'CG', name: 'Chhattisgarh', gstCode: '22' },
  { code: 'GA', name: 'Goa', gstCode: '30' },
  { code: 'GJ', name: 'Gujarat', gstCode: '24' },
  { code: 'HR', name: 'Haryana', gstCode: '06' },
  { code: 'HP', name: 'Himachal Pradesh', gstCode: '02' },
  { code: 'JH', name: 'Jharkhand', gstCode: '20' },
  { code: 'KA', name: 'Karnataka', gstCode: '29' },
  { code: 'KL', name: 'Kerala', gstCode: '32' },
  { code: 'MP', name: 'Madhya Pradesh', gstCode: '23' },
  { code: 'MH', name: 'Maharashtra', gstCode: '27' },
  { code: 'MN', name: 'Manipur', gstCode: '14' },
  { code: 'ML', name: 'Meghalaya', gstCode: '17' },
  { code: 'MZ', name: 'Mizoram', gstCode: '15' },
  { code: 'NL', name: 'Nagaland', gstCode: '13' },
  { code: 'OD', name: 'Odisha', gstCode: '21' },
  { code: 'PB', name: 'Punjab', gstCode: '03' },
  { code: 'RJ', name: 'Rajasthan', gstCode: '08' },
  { code: 'SK', name: 'Sikkim', gstCode: '11' },
  { code: 'TN', name: 'Tamil Nadu', gstCode: '33' },
  { code: 'TS', name: 'Telangana', gstCode: '36' },
  { code: 'TR', name: 'Tripura', gstCode: '16' },
  { code: 'UK', name: 'Uttarakhand', gstCode: '05' },
  { code: 'UP', name: 'Uttar Pradesh', gstCode: '09' },
  { code: 'WB', name: 'West Bengal', gstCode: '19' },

  // ── Union Territories ─────────────────────────
  { code: 'AN', name: 'Andaman & Nicobar Islands', gstCode: '35' },
  { code: 'CH', name: 'Chandigarh', gstCode: '04' },
  { code: 'DN', name: 'Dadra & Nagar Haveli and Daman & Diu', gstCode: '26' },
  { code: 'DL', name: 'Delhi', gstCode: '07' },
  { code: 'JK', name: 'Jammu & Kashmir', gstCode: '01' },
  { code: 'LA', name: 'Ladakh', gstCode: '38' },
  { code: 'LD', name: 'Lakshadweep', gstCode: '31' },
  { code: 'PY', name: 'Puducherry', gstCode: '34' },
];

/**
 * Lookup map by state/UT short code (e.g. 'MH' -> Maharashtra).
 */
export const INDIAN_STATES_BY_CODE: Record<string, IndianState> = Object.fromEntries(
  INDIAN_STATES.map((state) => [state.code, state]),
);

/**
 * Lookup map by GST state code (e.g. '27' -> Maharashtra).
 */
export const INDIAN_STATES_BY_GST_CODE: Record<string, IndianState> = Object.fromEntries(
  INDIAN_STATES.map((state) => [state.gstCode, state]),
);

/**
 * Lookup map by state name (lowercase key for case-insensitive matching).
 */
export const INDIAN_STATES_BY_NAME: Record<string, IndianState> = Object.fromEntries(
  INDIAN_STATES.map((state) => [state.name.toLowerCase(), state]),
);
