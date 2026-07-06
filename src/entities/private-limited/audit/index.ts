export type {
  AuditOpinion,
  EOMType,
  AuditorReport,
  KeyAuditMatter,
  CAROReport,
  CAROClause,
  TaxAuditReport,
  TaxAuditClause,
  BoardReport,
  DirectorsResponsibilityStatement,
} from './types';

export {
  CARO_CLAUSE_TITLES,
  TAX_AUDIT_KEY_CLAUSES,
  DRS_STANDARD_TEXT,
} from './types';

export {
  buildCAROTemplate,
  buildTaxAuditTemplate,
  CARO_DETAILED_STRUCTURE,
  TAX_AUDIT_CRITICAL_DETAILS,
  DPT3_CATEGORIES,
} from './templates';
export type { DPT3WorkingPaper, MSME1WorkingPaper } from './templates';
