/**
 * MSME Disclosure Compute Engine.
 *
 * As per Section 22 of MSMED Act, 2006 read with Schedule III of Companies Act, 2013.
 * Section 16: interest for delayed payment at 3x the bank rate (RBI rate).
 * Appointed day: 45 days from acceptance/date of supply for micro and small enterprises.
 */

import type { JournalEntry } from './computeEngine';
import { computeAllBalances, type AccountBalance } from './computeEngine';

/** Appointed day in days (MSMED Act: 45 days for micro/small). */
export const MSME_APPOINTED_DAYS = 45;

/** Default bank rate (RBI repo) for Section 16 interest; override via options. */
export const DEFAULT_BANK_RATE_PERCENT = 6.5;

export interface MSMEParty {
  name: string;
  principalOutstanding: number;
  totalPurchases: number;
  totalPayments: number;
  /** Interest due at 3× bank rate (Section 16) on overdue principal. */
  interestDue?: number;
  /** Days beyond appointed day (45) for disclosure. */
  daysBeyondAppointedDay?: number;
}

export interface MSMEDisclosureData {
  parties: MSMEParty[];
  totalPrincipalUnpaid: number;
  totalInterestDue: number;
  totalInterestPaid: number;
  totalInterestAccruedUnpaid: number;
  totalPurchasesFromMSME: number;
  appointedDayDays: number;
  bankRatePercent: number;
  note: string;
}

const MSME_SUBGROUPS = ['MSME Trade Payables', 'Trade Payables'];

export function computeMSMEDisclosure(
  entries: JournalEntry[],
  options?: { bankRatePercent?: number; appointedDayDays?: number; assumedDaysOverdue?: number }
): MSMEDisclosureData {
  const bankRatePercent = options?.bankRatePercent ?? DEFAULT_BANK_RATE_PERCENT;
  const appointedDayDays = options?.appointedDayDays ?? MSME_APPOINTED_DAYS;
  const assumedDaysOverdue = options?.assumedDaysOverdue ?? appointedDayDays;
  const balances = computeAllBalances(entries);

  const msmeParties = new Map<string, MSMEParty>();

  for (const b of balances) {
    if (!MSME_SUBGROUPS.includes(b.account_group)) continue;

    const name = b.account_name;
    const lname = name.toLowerCase();
    if (!lname.includes('msme') && !lname.includes('micro') && !lname.includes('small enterprise')) continue;

    const existing = msmeParties.get(name) ?? {
      name,
      principalOutstanding: 0,
      totalPurchases: 0,
      totalPayments: 0,
    };
    existing.principalOutstanding = Math.abs(b.balance);
    existing.totalPurchases = b.total_credit;
    existing.totalPayments = b.total_debit;
    msmeParties.set(name, existing);
  }

  if (msmeParties.size === 0) {
    for (const entry of entries) {
      for (const line of entry.lines) {
        const name = (line.account_name ?? '').trim();
        const lname = name.toLowerCase();
        if (!lname.includes('msme') && !lname.includes('micro') && !lname.includes('small enterprise')) continue;
        if (!msmeParties.has(name)) {
          msmeParties.set(name, { name, principalOutstanding: 0, totalPurchases: 0, totalPayments: 0 });
        }
        const p = msmeParties.get(name)!;
        p.totalPurchases += (line.credit ?? 0);
        p.totalPayments += (line.debit ?? 0);
        p.principalOutstanding = p.totalPurchases - p.totalPayments;
      }
    }
  }

  const rate3x = (3 * bankRatePercent) / 100;
  const interestMultiplier = (assumedDaysOverdue / 365) * rate3x;

  const parties = [...msmeParties.values()].map(p => {
    const principal = Math.max(0, p.principalOutstanding);
    const interestDue = principal * interestMultiplier;
    return {
      ...p,
      interestDue: principal > 0 ? Math.round(interestDue * 100) / 100 : 0,
      daysBeyondAppointedDay: principal > 0 ? assumedDaysOverdue : undefined,
    };
  }).sort((a, b) => b.principalOutstanding - a.principalOutstanding);

  const totalPrincipalUnpaid = parties.reduce((s, p) => s + Math.max(0, p.principalOutstanding), 0);
  const totalPurchasesFromMSME = parties.reduce((s, p) => s + p.totalPurchases, 0);
  const totalInterestDue = parties.reduce((s, p) => s + (p.interestDue ?? 0), 0);

  return {
    parties,
    totalPrincipalUnpaid,
    totalInterestDue,
    totalInterestPaid: 0,
    totalInterestAccruedUnpaid: totalInterestDue,
    totalPurchasesFromMSME,
    appointedDayDays,
    bankRatePercent,
    note: parties.length === 0
      ? 'No MSME vendors identified. Tag creditor accounts with "MSME" in their name to enable auto-disclosure.'
      : `${parties.length} MSME vendor(s); interest at 3× bank rate (${bankRatePercent}%) per Section 16; appointed day ${appointedDayDays} days.`,
  };
}
