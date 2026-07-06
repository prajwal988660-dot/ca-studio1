import { listJournalEntries } from '@/lib/offlineDb';
import type { JournalEntry } from './computeEngine';
import {
  computeRatioAnalysis,
  type RatioAnalysisData,
  type RatioResult,
} from './ratioAnalysisCompute';

export interface KeyRatio extends RatioResult {
  id: string;
}

export interface KeyRatiosResult {
  ratios: KeyRatio[];
  components: RatioAnalysisData['components'];
}

export interface ComputeKeyRatiosOptions {
  companyId: string;
  /**
   * Ratios are computed using all entries up to this date (inclusive).
   */
  asOfDate: string;
  /**
   * Optional previous period end date for average-based ratios.
   * When provided, previous-period entries up to this date are also loaded.
   */
  previousAsOfDate?: string;
}

function loadEntriesUpTo(companyId: string, asOfDate: string): JournalEntry[] {
  return listJournalEntries(companyId, {
    toDate: asOfDate,
  });
}

export function computeKeyRatios(options: ComputeKeyRatiosOptions): KeyRatiosResult {
  const { companyId, asOfDate, previousAsOfDate } = options;

  const currentEntries = loadEntriesUpTo(companyId, asOfDate);
  const previousEntries = previousAsOfDate
    ? loadEntriesUpTo(companyId, previousAsOfDate)
    : undefined;

  const analysis = computeRatioAnalysis(currentEntries, previousEntries);

  const ratios: KeyRatio[] = analysis.ratios.map((r, index) => ({
    id: `${r.category}-${index}`,
    ...r,
  }));

  return {
    ratios,
    components: analysis.components,
  };
}

