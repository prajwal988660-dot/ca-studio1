/**
 * Entity configs aligned with Indian law:
 * - Sole/Partnership/HUF/AOP/Cooperative: traditional BS/PL; no Schedule III.
 * - LLP: traditional BS, LLP forms; no share capital.
 * - OPC/Pvt/Public/Section 8: Schedule III mandatory; audit mandatory for companies.
 * - Trust/Society: Income & Expenditure, Receipts & Payments; Form 10B for trust audit.
 */

import type { EntityType } from '@/types/company';

export interface EntityConfig {
  entityType: string;
  label: string;
  itrForm: string;
  taxAuditForm: string;

  nav: {
    // Primary Books
    journal: boolean;
    cashBook: boolean;
    pettyCash: boolean;
    purchaseRegister: 'always' | 'conditional' | 'never';
    salesRegister: 'always' | 'conditional' | 'never';
    purchaseReturns: 'always' | 'conditional' | 'never';
    salesReturns: 'always' | 'conditional' | 'never';
    billsReceivable: boolean;
    billsPayable: boolean;

    // Ledgers
    ledger: boolean;
    debtors: boolean;
    creditors: boolean;
    fixedAssets: boolean;
    investments: 'always' | 'conditional' | 'never';
    loans: 'always' | 'conditional' | 'never';

    // Financial Statements
    trialBalance: boolean;
    tradingAccount: 'always' | 'conditional' | 'never';
    profitLoss: boolean;
    profitLossFormat: 'traditional' | 'schedule_iii';
    plAppropriation: boolean;
    balanceSheet: boolean;
    balanceSheetFormat: 'traditional' | 'schedule_iii';
    cashFlowStatement: 'always' | 'conditional' | 'never';
    fundsFlowStatement: 'always' | 'conditional' | 'never';
    incomeExpenditure: boolean;
    receiptsPayments: boolean;

    // Special Accounts
    partnersCapital: boolean;
    revaluation: boolean;
    realisation: boolean;
    shareCapital: boolean;
    debentures: 'always' | 'conditional' | 'never';
    kartaCapital: boolean;
    fundAccounts: boolean;
    incompleteRecords: boolean;
    memberRegister: boolean;

    // Tax & Compliance
    gst: 'always' | 'conditional' | 'never';
    incomeTax: boolean;
    tdsRegister: 'always' | 'conditional' | 'never';
    tcsRegister: 'always' | 'conditional' | 'never';
    advanceTax: boolean;
    deferredTax: boolean;
    brs: boolean;
    depreciation: boolean;

    // Audit
    audit: 'always' | 'conditional' | 'never';
    auditForm: '3CA' | '3CB' | '10B' | 'none';

    // Inventory
    inventory: 'always' | 'conditional' | 'never';

    // Misc
    payroll: 'always' | 'conditional' | 'never';
    segmentReporting: boolean;
    relatedParty: boolean;
    /** When true, show for non-corporate when entity_details.disclosureLevel is I or II */
    relatedPartyByLevel?: boolean;
    accountingPolicies: boolean;
    accountingPoliciesByLevel?: boolean;
    asChecklist: boolean;
    asChecklistByLevel?: boolean;
    fcra: 'always' | 'conditional' | 'never';
    applicationCheck: boolean;
    form10b: boolean;
    llpForms: boolean;

    // Analysis & Disclosure
    ratioAnalysis: boolean;
    bsNotes: boolean;
    taxComputation: boolean;
    msmeDisclosure: boolean;
    contingentLiabilities: boolean;

    // Company-only (Schedule III / Companies Act)
    directorsReport: boolean;
    caro: boolean;
    costRecords: 'always' | 'conditional' | 'never';

    // Cooperative state formats
    formN: boolean;

    // Voucher Entry
    salesInvoice: boolean;
    purchaseVoucher: boolean;
    paymentVoucher: boolean;
    receiptVoucher: boolean;
    debitNote: boolean;
    creditNote: boolean;

    /** Bank statement import → review → journalize workflow */
    bankImport?: boolean;
  };
}

// Lazy imports for all entity configs
import { soleProprietorshipConfig } from './soleProprietorship';
import { partnershipConfig } from './partnership';
import { llpConfig } from './llp';
import { opcConfig } from './opc';
import { pvtLtdConfig } from './pvtLtd';
import { publicLtdConfig } from './publicLtd';
import { hufConfig } from './huf';
import { trustConfig } from './trust';
import { societyConfig } from './society';
import { section8Config } from './section8';
import { aopBoiConfig } from './aopBoi';
import { cooperativeConfig } from './cooperative';
import { individualConfig } from './individual';

const configs: Record<string, EntityConfig> = {
  individual: individualConfig,
  sole_proprietorship: soleProprietorshipConfig,
  partnership: partnershipConfig,
  llp: llpConfig,
  opc: opcConfig,
  pvt_ltd: pvtLtdConfig,
  public_ltd: publicLtdConfig,
  huf: hufConfig,
  trust: trustConfig,
  society: societyConfig,
  section8: section8Config,
  aop_boi: aopBoiConfig,
  cooperative: cooperativeConfig,
};

/**
 * Return a copy of the config with every gated nav feature unlocked:
 * booleans → true, tri-state 'never' → 'always'. Format selectors
 * (profitLossFormat, balanceSheetFormat, auditForm) and other non-gate values
 * are left untouched. (Requested: unlock all locked features for every entity.)
 */
function unlockAllFeatures(config: EntityConfig): EntityConfig {
  const nav = { ...config.nav } as Record<string, unknown>;
  for (const key of Object.keys(nav)) {
    if (nav[key] === false) nav[key] = true;
    else if (nav[key] === 'never') nav[key] = 'always';
  }
  return { ...config, nav: nav as EntityConfig['nav'] };
}

export function getEntityConfig(entityType: EntityType | string): EntityConfig {
  const config = configs[entityType];
  if (!config) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }
  return unlockAllFeatures(config);
}

export function getAllEntityConfigs(): Record<string, EntityConfig> {
  return configs;
}
