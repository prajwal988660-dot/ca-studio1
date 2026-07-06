import { listJournalEntries } from '@/lib/offlineDb';
import type { JournalEntry } from '@/lib/accounting/computeEngine';
import {
  computeMSMEDisclosure,
  MSME_APPOINTED_DAYS,
  DEFAULT_BANK_RATE_PERCENT,
  type MSMEDisclosureData,
} from '@/lib/accounting/msmeCompute';

export interface MsmeAgeingBucket {
  label: string;
  fromDays: number;
  toDays: number | null;
}

export interface MsmeAgeingRow {
  partyName: string;
  principalOutstanding: number;
  bucketLabel: string;
}

export interface MsmeAgeingResult {
  disclosure: MSMEDisclosureData;
  buckets: MsmeAgeingBucket[];
  rows: MsmeAgeingRow[];
}

const DEFAULT_BUCKETS: MsmeAgeingBucket[] = [
  { label: `0-${MSME_APPOINTED_DAYS} days`, fromDays: 0, toDays: MSME_APPOINTED_DAYS },
  { label: `${MSME_APPOINTED_DAYS + 1}-90 days`, fromDays: MSME_APPOINTED_DAYS + 1, toDays: 90 },
  { label: '91-180 days', fromDays: 91, toDays: 180 },
  { label: '181-365 days', fromDays: 181, toDays: 365 },
  { label: '>365 days', fromDays: 366, toDays: null },
];

function pickBucket(
  daysBeyond: number | undefined,
  buckets: MsmeAgeingBucket[]
): MsmeAgeingBucket {
  const d = daysBeyond ?? 0;
  for (const b of buckets) {
    if (b.toDays == null) {
      if (d >= b.fromDays) return b;
    } else if (d >= b.fromDays && d <= b.toDays) {
      return b;
    }
  }
  return buckets[buckets.length - 1];
}

export function computeMsmeAgeing(
  companyId: string,
  asOfDate: string,
  buckets: MsmeAgeingBucket[] = DEFAULT_BUCKETS
): MsmeAgeingResult {
  const entries = listJournalEntries(companyId, {
    toDate: asOfDate,
  });

  const disclosure = computeMSMEDisclosure(entries, {
    bankRatePercent: DEFAULT_BANK_RATE_PERCENT,
    appointedDayDays: MSME_APPOINTED_DAYS,
  });

  const rows: MsmeAgeingRow[] = [];

  for (const party of disclosure.parties) {
    const bucket = pickBucket(party.daysBeyondAppointedDay, buckets);
    rows.push({
      partyName: party.name,
      principalOutstanding: party.principalOutstanding,
      bucketLabel: bucket.label,
    });
  }

  return {
    disclosure,
    buckets,
    rows,
  };
}

