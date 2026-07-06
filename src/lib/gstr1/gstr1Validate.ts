import { GSTR1_CONFIG } from './config';
import type { GSTR1Filing } from './types';

export interface ValidationError {
  section: string;
  row?: string;
  message: string;
}

function validateGstin(gstin: string): boolean {
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) return false;
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = chars.indexOf(gstin[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(v / 36) + (v % 36);
  }
  const check = (36 - (sum % 36)) % 36;
  return chars[check] === gstin[14];
}

export function validateFiling(filing: GSTR1Filing): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const inv of filing.b2b) {
    if (!validateGstin(inv.ctin)) {
      errors.push({ section: 'B2B', row: inv.inum, message: `Invalid GSTIN: ${inv.ctin}` });
    }
    if (inv.inum.length > 16) {
      errors.push({ section: 'B2B', row: inv.inum, message: 'Invoice number must be ≤ 16 characters' });
    }
    if (!inv.idt.match(/^\d{2}-\d{2}-\d{4}$/)) {
      errors.push({ section: 'B2B', row: inv.inum, message: 'Invoice date must be DD-MM-YYYY' });
    }
  }

  for (const inv of filing.b2cl) {
    const total = inv.itms.reduce((s, i) => s + (i.itm_det.txval || 0), 0);
    if (total <= GSTR1_CONFIG.B2CL_THRESHOLD) {
      errors.push({ section: 'B2CL', row: inv.inum, message: `Taxable value ₹${total} ≤ ₹1,00,000 threshold — should be in B2CS` });
    }
  }

  for (const h of filing.hsn) {
    if (!/^\d{4}(\d{2}(\d{2})?)?$/.test(h.hsn_sc)) {
      errors.push({ section: 'HSN', row: h.hsn_sc, message: `Invalid HSN/SAC code: ${h.hsn_sc}` });
    }
  }

  return errors;
}
