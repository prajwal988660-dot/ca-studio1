'use client';

import { useMemo, useCallback } from 'react';
import { useCompany } from './useCompany';
import {
  getEntityData,
  listEntityData,
  upsertEntityData,
  type EntityDataRecord,
} from '@/lib/offlineDb';
import { initPrivateLimited, isPvtLtdInitialized } from '@/entities/private-limited/init';
import type { Classification } from '@/entities/private-limited/classification/types';
import type { ComplianceItem } from '@/entities/private-limited/compliance/calendar';
import type { IFCPackage } from '@/entities/private-limited/ifc/types';

const MODULE = 'pvt_ltd';

export interface PvtLtdData {
  classification: Classification | null;
  complianceCalendar: { fyEnd: string; agmDate: string; items: ComplianceItem[] } | null;
  ifcPackage: IFCPackage | null;
  registers: Record<string, unknown[]> | null;
  filingTrackers: unknown[];
  audit: Record<string, unknown> | null;
  scheduleIII: Record<string, unknown> | null;
}

/**
 * Hook to access all Private Limited entity-specific data for the current company.
 * Auto-initializes if data hasn't been bootstrapped yet.
 */
export function usePvtLtdData(): {
  data: PvtLtdData | null;
  loading: boolean;
  isPvtLtd: boolean;
  updateSection: (section: string, value: unknown) => void;
  refresh: () => PvtLtdData | null;
} {
  const { company, loading: companyLoading } = useCompany();

  const isPvtLtd = company?.entity_type === 'pvt_ltd';

  // Auto-init if pvt_ltd but not yet initialized
  if (company && isPvtLtd && !isPvtLtdInitialized(company.id)) {
    initPrivateLimited(company);
  }

  const data = useMemo<PvtLtdData | null>(() => {
    if (!company || !isPvtLtd) return null;

    const get = (section: string) => getEntityData(company.id, MODULE, section)?.data ?? null;

    return {
      classification: get('classification') as Classification | null,
      complianceCalendar: get('compliance_calendar') as PvtLtdData['complianceCalendar'],
      ifcPackage: get('ifc_package') as IFCPackage | null,
      registers: get('registers') as Record<string, unknown[]> | null,
      filingTrackers: (get('filing_trackers') as unknown[]) ?? [],
      audit: get('audit') as Record<string, unknown> | null,
      scheduleIII: get('schedule_iii') as Record<string, unknown> | null,
    };
  }, [company, isPvtLtd]);

  const updateSection = useCallback(
    (section: string, value: unknown) => {
      if (!company) return;
      upsertEntityData(company.id, MODULE, section, value);
    },
    [company],
  );

  const refresh = useCallback((): PvtLtdData | null => {
    if (!company || !isPvtLtd) return null;

    const get = (section: string) => getEntityData(company.id, MODULE, section)?.data ?? null;

    return {
      classification: get('classification') as Classification | null,
      complianceCalendar: get('compliance_calendar') as PvtLtdData['complianceCalendar'],
      ifcPackage: get('ifc_package') as IFCPackage | null,
      registers: get('registers') as Record<string, unknown[]> | null,
      filingTrackers: (get('filing_trackers') as unknown[]) ?? [],
      audit: get('audit') as Record<string, unknown> | null,
      scheduleIII: get('schedule_iii') as Record<string, unknown> | null,
    };
  }, [company, isPvtLtd]);

  return {
    data,
    loading: companyLoading,
    isPvtLtd,
    updateSection,
    refresh,
  };
}
