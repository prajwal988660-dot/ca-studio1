// Shared shape for an AI-proposed journal entry (used by the journal preview
// components). Kept minimal and dependency-free so any AI/agent layer can
// produce this structure and hand it to the UI.

export interface ProposedLine {
  /** Ledger / account name, e.g. "Conveyance A/c". */
  account: string;
  /** Debit amount (0 when this is a credit line). */
  debit: number;
  /** Credit amount (0 when this is a debit line). */
  credit: number;
}

export interface ProposedEntry {
  /** Voucher date (yyyy-mm-dd or any Date-parseable string). */
  date: string;
  /** Optional narration / description. */
  narration?: string;
  /** Debit and credit lines; debits and credits should net to zero. */
  lines: ProposedLine[];
}

/** True when the entry has lines and its debits equal its credits. */
export function isBalanced(entry: ProposedEntry): boolean {
  if (!entry.lines?.length) return false;
  const debit = entry.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const credit = entry.lines.reduce((s, l) => s + (l.credit || 0), 0);
  return Math.abs(debit - credit) < 0.005;
}
