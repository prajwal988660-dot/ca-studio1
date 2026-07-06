import { z } from 'zod';

/**
 * India-specific format validators (PAN, GSTIN, TAN, CIN, IFSC, Pincode, Aadhaar).
 *
 * Each identifier exposes:
 *  - a boolean checker  (e.g. `isPan`)   — strict test of a raw string
 *  - a zod schema       (e.g. `panSchema`) — trims + uppercases input, then validates
 */

/* -------------------------------------------------------------------------- */
/*  Regular expressions                                                       */
/* -------------------------------------------------------------------------- */

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]$/;
export const CIN_REGEX = /^[LUu][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
export const AADHAAR_REGEX = /^[0-9]{12}$/;

/* -------------------------------------------------------------------------- */
/*  GSTIN checksum (official algorithm)                                       */
/* -------------------------------------------------------------------------- */

const GSTIN_CODE_POINTS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Compute the official GSTIN check digit (15th char) from the first 14 chars.
 *
 * Each of the first 14 characters is mapped to its base-36 value. Walking the
 * string right-to-left, an alternating factor (2, 1, 2, 1, ...) is applied; the
 * product is "folded" (floor(p/36) + p%36) and summed. The check character is
 * `(36 - (sum mod 36)) mod 36` mapped back to 0-9A-Z.
 */
export function gstinCheckDigit(first14: string): string {
  const mod = GSTIN_CODE_POINTS.length; // 36
  let factor = 2;
  let sum = 0;

  for (let i = first14.length - 1; i >= 0; i--) {
    const codePoint = GSTIN_CODE_POINTS.indexOf(first14[i]);
    if (codePoint < 0) return ''; // unexpected char -> no valid check digit
    let addend = factor * codePoint;
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / mod) + (addend % mod);
    sum += addend;
  }

  const checkCodePoint = (mod - (sum % mod)) % mod;
  return GSTIN_CODE_POINTS[checkCodePoint];
}

/* -------------------------------------------------------------------------- */
/*  Boolean checkers                                                          */
/* -------------------------------------------------------------------------- */

export function isPan(value: string): boolean {
  return PAN_REGEX.test(value);
}

/** Valid GSTIN: matches the structural regex AND has a correct checksum digit. */
export function isGstin(value: string): boolean {
  if (!GSTIN_REGEX.test(value)) return false;
  return value.charAt(14) === gstinCheckDigit(value.slice(0, 14));
}

export function isTan(value: string): boolean {
  return TAN_REGEX.test(value);
}

export function isCin(value: string): boolean {
  return CIN_REGEX.test(value);
}

export function isIfsc(value: string): boolean {
  return IFSC_REGEX.test(value);
}

export function isPincode(value: string): boolean {
  return PINCODE_REGEX.test(value);
}

export function isAadhaar(value: string): boolean {
  return AADHAAR_REGEX.test(value);
}

/* -------------------------------------------------------------------------- */
/*  Zod schemas (trim + uppercase, then validate)                             */
/* -------------------------------------------------------------------------- */

/** Trim + uppercase a string, then apply a regex with a clear error message. */
function formatSchema(regex: RegExp, message: string) {
  return z.string().trim().toUpperCase().regex(regex, message);
}

export const panSchema = formatSchema(
  PAN_REGEX,
  'Invalid PAN — format AAAAA9999A',
);

export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(isGstin, 'Invalid GSTIN — format 22AAAAA0000A1Z5 (with valid checksum)');

export const tanSchema = formatSchema(
  TAN_REGEX,
  'Invalid TAN — format AAAA99999A',
);

export const cinSchema = formatSchema(
  CIN_REGEX,
  'Invalid CIN — format U99999AA9999AAA999999',
);

export const ifscSchema = formatSchema(
  IFSC_REGEX,
  'Invalid IFSC — format AAAA0999999',
);

export const pincodeSchema = z
  .string()
  .trim()
  .regex(PINCODE_REGEX, 'Invalid Pincode — 6 digits, cannot start with 0');

export const aadhaarSchema = z
  .string()
  .trim()
  .regex(AADHAAR_REGEX, 'Invalid Aadhaar — 12 digits');
