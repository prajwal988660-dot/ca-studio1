/**
 * Private Limited — Initialization
 *
 * Called once when a new Pvt Ltd company is created.
 * Bootstraps classification, compliance calendar, IFC defaults,
 * empty statutory registers, and filing trackers.
 */

import { upsertEntityData, getEntityData } from '@/lib/offlineDb';
import type { Company } from '@/types/company';

// Classification
import { classify } from './classification/engine';
import type { ClassificationInput } from './classification/types';

// Compliance
import { generateComplianceCalendar } from './compliance/calendar';

// IFC
import {
  DEFAULT_ENTITY_CONTROLS,
  RCM_TEMPLATES,
  PROCESS_NARRATIVES,
  DEFAULT_ITGC,
} from './ifc/templates';
import type {
  EntityLevelControl,
  RCMEntry,
  ITGCEntry,
  IFCPackage,
  ProcessNarrative,
} from './ifc/types';

// Registers
import { REGISTER_METADATA } from './registers/metadata';

// Audit
import { DRS_STANDARD_TEXT } from './audit/types';

const MODULE = 'pvt_ltd';

/**
 * Initialize all Private Limited entity data for a newly created company.
 */
export function initPrivateLimited(company: Company): void {
  const companyId = company.id;
  const now = new Date();
  const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyEnd = `${fyYear + 1}-03-31`;
  const agmDate = `${fyYear + 1}-09-30`; // default: last date for AGM

  // ─── 1. Classification ───────────────────────────────────────
  const paidUp = company.entity_details?.shareCapital?.paidUpCapital ?? 0;
  const classInput: ClassificationInput = {
    fyEndDate: fyEnd,
    paidUpShareCapital: paidUp,
    turnover: 0,
    isHolding: false,
    isSubsidiary: false,
    netWorth: paidUp,
    isListed: false,
    isIndAsRelated: false,
    priorIndAsAdoption: false,
    cashReceiptsPercent: 0,
    cashPaymentsPercent: 0,
    isCostAuditIndustry: false,
    peakBorrowings: 0,
    reserves: 0,
    revenue: 0,
    avgNetProfit3Years: 0,
    priorXbrlFiling: false,
  };

  const classification = classify(classInput);
  upsertEntityData(companyId, MODULE, 'classification', classification);

  // ─── 2. Compliance Calendar ──────────────────────────────────
  const calendar = generateComplianceCalendar(
    fyEnd,
    agmDate,
    classification,
    company.created_at.slice(0, 10),
  );
  upsertEntityData(companyId, MODULE, 'compliance_calendar', {
    fyEnd,
    agmDate,
    items: calendar,
  });

  // ─── 3. IFC Package ─────────────────────────────────────────
  // Entity-level controls with default status
  const entityControls: EntityLevelControl[] = DEFAULT_ENTITY_CONTROLS.map((c) => ({
    ...c,
    status: 'not_in_place' as const,
  }));

  // RCM entries with IDs and default status
  let rcmId = 0;
  const rcm: RCMEntry[] = [];
  for (const [, entries] of Object.entries(RCM_TEMPLATES)) {
    for (const entry of entries) {
      rcm.push({
        ...entry,
        id: `RCM-${String(++rcmId).padStart(3, '0')}`,
        status: 'designed',
      });
    }
  }

  // Process narratives with key control references
  const narratives: ProcessNarrative[] = PROCESS_NARRATIVES.map((n) => ({
    ...n,
    keyControls: rcm
      .filter((r) => r.process === n.process)
      .map((r) => r.id),
  }));

  // ITGC with IDs and default status
  let itgcId = 0;
  const itgc: ITGCEntry[] = DEFAULT_ITGC.map((entry) => ({
    ...entry,
    id: `ITGC-${String(++itgcId).padStart(3, '0')}`,
    status: 'not_tested' as const,
  }));

  // Coverage matrix — map assertions to controls per process
  const coverageMap: Record<string, Record<string, string[]>> = {};
  const gaps: Array<{ process: string; assertion: string }> = [];

  for (const r of rcm) {
    if (!coverageMap[r.process]) coverageMap[r.process] = {};
    for (const a of r.assertion) {
      if (!coverageMap[r.process][a]) coverageMap[r.process][a] = [];
      coverageMap[r.process][a].push(r.id);
    }
  }

  const ifcPackage: IFCPackage = {
    companyId,
    financialYear: `FY ${fyYear}-${String(fyYear + 1).slice(2)}`,
    entityLevelControls: entityControls,
    rcm,
    processNarratives: narratives,
    itgc,
    coverageMatrix: { coverage: coverageMap, gaps },
    overallAssessment: 'effective',
  };

  upsertEntityData(companyId, MODULE, 'ifc_package', ifcPackage);

  // ─── 4. Statutory Registers (empty initial state) ────────────
  const registers: Record<string, unknown[]> = {};
  for (const meta of REGISTER_METADATA) {
    registers[meta.type] = [];
  }
  upsertEntityData(companyId, MODULE, 'registers', registers);

  // ─── 5. Filing Trackers (empty) ──────────────────────────────
  upsertEntityData(companyId, MODULE, 'filing_trackers', []);

  // ─── 6. Audit Defaults ──────────────────────────────────────
  upsertEntityData(companyId, MODULE, 'audit', {
    drsTemplate: DRS_STANDARD_TEXT,
    caroApplicable: classification.auditFlags.caro,
    taxAuditApplicable: classification.auditFlags.taxAudit,
    secretarialAuditApplicable: classification.auditFlags.secretarialAudit,
  });

  // ─── 7. Schedule III Config ─────────────────────────────────
  upsertEntityData(companyId, MODULE, 'schedule_iii', {
    division: classification.accountingFramework === 'ind_as' ? 'division_ii' : 'division_i',
    ratioDisclosures: [],
    additionalDisclosures: {
      hasBenamiProperty: false,
      hasCryptoAssets: false,
      hasUndisclosedIncome: false,
      hasStruckOffRelationship: false,
      isWilfulDefaulter: false,
    },
  });
}

/**
 * Check if Private Limited module data has been initialized for a company.
 */
export function isPvtLtdInitialized(companyId: string): boolean {
  return getEntityData(companyId, MODULE, 'classification') !== null;
}
