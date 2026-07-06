/**
 * Bulk Private Limited — Core Types
 *
 * All money values are stored as numbers rounded to 2 decimal places.
 * No float arithmetic in any balance computation — always use round2().
 */

export type SuspenseDirection = 'RECEIPT' | 'PAYMENT';
export type SuspenseStatus = 'UNALLOCATED' | 'ALLOCATED' | 'FLAGGED';
export type LedgerSide = 'DR' | 'CR';
export type LedgerEntrySource =
  | 'BULK_CSV'
  | 'MANUAL'
  | 'GST_OTHER_SIDE'
  | 'CASH'
  | 'ADJUSTMENT';
export type AllocatedBy = 'AI' | 'MANUAL';

// ── Ledger Accounts (COA for bulk mode) ─────────────────────────────────────

export interface BulkLedgerAccount {
  id: string;
  companyId: string;
  name: string;
  /** e.g. 'Sundry Creditors', 'Indirect Expenses', 'Bank Accounts' */
  group: string;
  /** 'asset' | 'liability' | 'capital' | 'revenue' | 'expense' */
  accountType: string;
  createdBy: AllocatedBy;
  createdAt: string;
}

// ── Suspense (bank rows awaiting classification) ─────────────────────────────

export interface SuspenseTransaction {
  id: string;
  companyId: string;
  fy: string;
  batchId: string;
  txnDate: string | null;
  narration: string;
  referenceNo: string;
  amount: number;          // always positive; direction tells you the sign
  direction: SuspenseDirection;
  status: SuspenseStatus;
  allocatedLedgerId: string | null;
  allocatedBy: AllocatedBy | null;
  allocationKeyword: string | null;
  allocatedAt: string | null;
  originalRowNumber: number;
  createdAt: string;
}

// ── Ledger entries (classified transactions) ─────────────────────────────────

export interface BulkLedgerEntry {
  id: string;
  companyId: string;
  fy: string;
  ledgerAccountId: string;
  txnDate: string | null;
  narration: string;
  referenceNo: string;
  amount: number;
  side: LedgerSide;        // DR | CR
  source: LedgerEntrySource;
  suspenseId: string | null;
  batchId: string | null;
  allocatedBy: AllocatedBy | null;
  allocationKeyword: string | null;
  createdAt: string;
}

// ── Audit log ────────────────────────────────────────────────────────────────

export interface BulkAuditLog {
  id: string;
  companyId: string;
  actor: string;           // 'AI' | 'MANUAL' | CA-member-id
  action: string;          // 'move_to_ledger' | 'create_ledger' | etc.
  detail: Record<string, unknown>;
  createdAt: string;
}

// ── Service return types ──────────────────────────────────────────────────────

export interface SuspenseSearchResult {
  keyword: string;
  count: number;
  totalAmount: number;
  directionBreakdown: { RECEIPT: number; PAYMENT: number };
  sampleNarrations: string[];
}

export interface MoveToLedgerResult {
  movedCount: number;
  remainingCount: number;
  ledgerName: string;
}

export interface LedgerBalanceResult {
  ledgerAccountId: string;
  ledgerName: string;
  drTotal: number;
  crTotal: number;
  balance: number;
  side: LedgerSide;
}

export interface CandidateKeyword {
  keyword: string;
  count: number;
  totalAmount: number;
}

export interface BulkProgress {
  totalRows: number;
  allocated: number;
  remaining: number;
  completionPct: number;
  nextKeywords: CandidateKeyword[];
}

export interface ImportResult {
  batchId: string;
  rowsImported: number;
  rowsSkipped: number;
  truncated: boolean;   // true if file had more than 4000 valid rows
  totalPayments: number;
  totalReceipts: number;
}
