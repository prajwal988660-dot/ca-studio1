/**
 * Private Limited — Internal Financial Controls (IFC/ICFR) Types
 *
 * Sec 134(5)(e) — Directors' Responsibility Statement
 * Sec 143(3)(i) — Auditor's report on IFCoFR
 *
 * COSO-aligned framework per ICAI Guidance Note on IFCoFR.
 */

/** Assertion mapped to each control */
export type FinancialAssertion =
  | 'existence'
  | 'completeness'
  | 'valuation'
  | 'rights_and_obligations'
  | 'presentation_and_disclosure';

/** Control type classification */
export type ControlType = 'preventive' | 'detective';
export type ControlNature = 'manual' | 'automated' | 'it_dependent_manual';
export type ControlFrequency = 'per_transaction' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

/** Business process cycle */
export type ProcessCycle =
  | 'procure_to_pay'     // P2P
  | 'order_to_cash'      // O2C
  | 'payroll'
  | 'fixed_assets'
  | 'treasury'
  | 'inventory'
  | 'close_and_reporting'
  | 'tax_compliance'
  | 'related_party';

/** Risk & Control Matrix (RCM) row */
export interface RCMEntry {
  id: string;
  process: ProcessCycle;
  subProcess: string;
  riskDescription: string;
  riskRating: 'high' | 'medium' | 'low';
  controlObjective: string;
  controlDescription: string;
  controlType: ControlType;
  controlNature: ControlNature;
  frequency: ControlFrequency;
  assertion: FinancialAssertion[];
  owner: string;
  testOfDesign: string;
  testOfOperatingEffectiveness: string;
  sampleSize?: number;
  deviationsFound?: number;
  remediation?: string;
  status: 'designed' | 'tested' | 'effective' | 'deficiency' | 'material_weakness';
}

/** Process narrative for a cycle */
export interface ProcessNarrative {
  process: ProcessCycle;
  title: string;
  description: string;
  keySteps: string[];
  systemsUsed: string[];
  keyControls: string[];  // references to RCM entry IDs
  flowchartNotes: string;
}

/** IT General Controls (ITGC) matrix entry */
export interface ITGCEntry {
  id: string;
  domain: 'access_management' | 'change_management' | 'operations' | 'backup_recovery';
  controlDescription: string;
  system: string;
  frequency: ControlFrequency;
  owner: string;
  testProcedure: string;
  status: 'effective' | 'deficiency' | 'not_tested';
}

/** Entity-level control */
export interface EntityLevelControl {
  id: string;
  category: 'tone_at_top' | 'delegation_of_authority' | 'code_of_conduct' | 'whistleblower' | 'risk_assessment' | 'monitoring';
  description: string;
  evidence: string;
  status: 'in_place' | 'partial' | 'not_in_place';
}

/** Complete IFC documentation package */
export interface IFCPackage {
  companyId: string;
  financialYear: string;
  entityLevelControls: EntityLevelControl[];
  rcm: RCMEntry[];
  processNarratives: ProcessNarrative[];
  itgc: ITGCEntry[];
  coverageMatrix: CoverageMatrix;
  overallAssessment: 'effective' | 'material_weakness' | 'significant_deficiency';
}

/** Coverage matrix — maps assertions to controls per process */
export interface CoverageMatrix {
  /** process → assertion → control IDs covering it */
  coverage: Record<string, Record<string, string[]>>;
  /** Assertions not covered by any control */
  gaps: Array<{ process: string; assertion: string }>;
}
