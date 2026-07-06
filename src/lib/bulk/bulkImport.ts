/**
 * Bulk Private Limited — CSV Import Pipeline (Phase C)
 *
 * Parses bank statement CSVs and seeds:
 *   - suspense_transactions (one per row, status=UNALLOCATED)
 *   - ledger_entries for the bank side (DR on RECEIPT, CR on PAYMENT)
 *
 * Auto-detects common Indian bank statement column layouts.
 * Uses SheetJS (already installed as 'xlsx').
 */

import * as XLSX from 'xlsx';
import type { ImportResult, SuspenseTransaction, BulkLedgerEntry } from './types';
import { bulkInsertSuspense, bulkInsertLedgerEntries, appendAuditLog, upsertLedgerAccount, getSuspenseTransactions } from './bulkDb';
import { round2 } from './bulkLedger';

// ── Column detection ──────────────────────────────────────────────────────────

const DATE_ALIASES = ['value date', 'txn date', 'tran date', 'posting date', 'transaction date', 'date'];
const NARRATION_ALIASES = ['narration', 'description', 'particulars', 'remarks', 'details', 'transaction remarks', 'tran remarks'];
const REF_ALIASES = ['reference', 'ref no', 'reference no', 'chq/ref number', 'chq no', 'ref', 'cheque no', 'utr'];
const DEBIT_ALIASES = ['debit', 'withdrawal', 'withdrawals', 'debit amount', 'dr amount', 'payment']; // removed generic 'dr' to avoid matching 'dr / cr'
const CREDIT_ALIASES = ['credit', 'deposit', 'deposits', 'credit amount', 'cr amount', 'receipt']; // removed generic 'cr'
const AMOUNT_ALIASES = ['amount', 'txn amount', 'transaction amount'];
const DR_CR_ALIASES = ['dr / cr', 'dr/cr', 'type', 'indicator'];

function findCol(headers: string[], aliases: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const alias of aliases) {
    const idx = lower.findIndex((h) => h.includes(alias));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseAmount(val: unknown): number {
  if (val == null || val === '') return 0;
  const str = String(val).replace(/[₹,\s]/g, '').trim();
  const n = parseFloat(str);
  return isNaN(n) ? 0 : round2(Math.abs(n));
}

function parseDate(val: unknown): string | null {
  if (val == null || val === '') return null;

  // Handle JS Date objects (SheetJS returns these when cellDates: true for Excel date cells)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = val.getUTCFullYear();
    const mo = String(val.getUTCMonth() + 1).padStart(2, '0');
    const dy = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${mo}-${dy}`;
  }

  const str = String(val).trim();
  if (!str) return null;

  // Indian-first string parsing — NO JS Date fallback (it is US MM/DD biased)

  // 1. YYYY-MM-DD (ISO) — e.g. 2025-11-07
  const m1 = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m1) return `${m1[1]}-${m1[2].padStart(2, '0')}-${m1[3].padStart(2, '0')}`;

  // 2. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (Indian standard)
  // Handles both 07-11-2025 and 7-11-2025 (with or without leading zero)
  const m2 = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;

  // 3. DD-Mon-YYYY or D-Mon-YYYY (e.g. 15-Jan-2024, 7-Nov-2025)
  const m3 = str.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{4})/);
  if (m3) {
    const months: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const mo = months[m3[2].toLowerCase()];
    if (mo) return `${m3[3]}-${mo}-${m3[1].padStart(2, '0')}`;
  }

  // 4. DD/MM/YY or DD-MM-YY (2-digit year)
  const m4 = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (m4) {
    const yr = parseInt(m4[3]);
    const fullYr = yr < 50 ? 2000 + yr : 1900 + yr;
    return `${fullYr}-${m4[2].padStart(2, '0')}-${m4[1].padStart(2, '0')}`;
  }

  return null; // No JS Date fallback — dangerous for Indian dates
}

// ── Duplicate detection ───────────────────────────────────────────────────────

function txnFingerprintRaw(
  txnDate: string | null,
  amount: number,
  direction: string,
  referenceNo: string,
  narration: string,
): string {
  // If a reference number (UTR/cheque) is present, use it — globally unique in India
  if (referenceNo.trim()) {
    return `${txnDate}|${amount}|${direction}|ref:${referenceNo.trim()}`;
  }
  // Otherwise match on date + amount + direction + first 60 chars of narration (case-insensitive)
  return `${txnDate}|${amount}|${direction}|nar:${narration.trim().slice(0, 60).toLowerCase()}`;
}

function txnFingerprint(t: SuspenseTransaction): string {
  return txnFingerprintRaw(t.txnDate, t.amount, t.direction, t.referenceNo, t.narration);
}

// ── Main import function ──────────────────────────────────────────────────────

export async function importBankCSV(
  companyId: string,
  fy: string,
  file: File,
): Promise<ImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(arrayBuffer), {
    type: 'array',
    cellDates: true, // return Excel date serials as JS Date objects (avoids SheetJS US-bias string formatting)
    raw: true,       // don't auto-coerce CSV strings — prevents "07-11-2025" being re-parsed as July 11
  });

  // Use first sheet
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: '',
    raw: true, // get raw values: Date objects for date cells, numbers for numeric cells, strings as-is
  }) as unknown[][];

  // Find the header row (first row with recognisable column names)
  let headerRowIdx = 0;
  let headers: string[] = [];
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    const h = row.map((c) => String(c ?? '').toLowerCase().trim());
    if (
      findCol(h as string[], DATE_ALIASES) >= 0 ||
      findCol(h as string[], NARRATION_ALIASES) >= 0
    ) {
      headerRowIdx = i;
      headers = row.map((c) => String(c ?? ''));
      break;
    }
  }

  if (headers.length === 0) {
    // Fallback: just use first row as headers
    headers = (rows[0] ?? []).map((c) => String(c ?? ''));
    headerRowIdx = 0;
  }

  const dateCol = findCol(headers, DATE_ALIASES);
  const narCol = findCol(headers, NARRATION_ALIASES);
  const refCol = findCol(headers, REF_ALIASES);
  let drCol = findCol(headers, DEBIT_ALIASES);
  let crCol = findCol(headers, CREDIT_ALIASES);
  const amtCol = findCol(headers, AMOUNT_ALIASES);
  const drCrCol = findCol(headers, DR_CR_ALIASES);

  // Fallback if strict DR/CR aliases fail, sometimes they are just 'dr' and 'cr' exactly
  if (drCol < 0) drCol = headers.findIndex(h => h.toLowerCase().trim() === 'dr');
  if (crCol < 0) crCol = headers.findIndex(h => h.toLowerCase().trim() === 'cr');

  if (narCol < 0 && drCol < 0 && crCol < 0 && amtCol < 0) {
    throw new Error(
      'Could not detect bank statement columns. Please ensure your CSV has headers like Date, Narration/Description, Debit/Credit or Amount + Dr/Cr.',
    );
  }

  // Ensure bank ledger account exists
  const bankAccount = upsertLedgerAccount(companyId, {
    name: 'Bank Account',
    group: 'Bank Accounts',
    accountType: 'asset',
    createdBy: 'MANUAL',
  });

  const MAX_BATCH = 4000; // localStorage safety cap — re-upload same file for next batch (dupes auto-skipped)

  const batchId = crypto.randomUUID();
  const suspenseRows: SuspenseTransaction[] = [];
  const bankEntries: BulkLedgerEntry[] = [];
  const now = new Date().toISOString();

  // Build dedup fingerprint set from already-imported rows for this company+FY
  const existingRows = getSuspenseTransactions(companyId, fy);
  const seen = new Set<string>(existingRows.map(txnFingerprint));

  let rowsImported = 0;
  let rowsSkipped = 0;
  let truncated = false;
  let totalPayments = 0;
  let totalReceipts = 0;

  const dataRows = rows.slice(headerRowIdx + 1);

  let lastSeenDate: string | null = null;

  dataRows.forEach((row, idx) => {
    // Skip completely empty rows
    if (!row || row.every((c) => String(c ?? '').trim() === '')) return;

    const narration = narCol >= 0 ? String(row[narCol] ?? '').trim() : '';

    let drAmt = 0;
    let crAmt = 0;

    if (drCol >= 0 && crCol >= 0) {
      drAmt = parseAmount(row[drCol]);
      crAmt = parseAmount(row[crCol]);
    } else if (amtCol >= 0 && drCrCol >= 0) {
      const amt = parseAmount(row[amtCol]);
      const indicator = String(row[drCrCol] ?? '').trim().toUpperCase();
      if (indicator === 'DR' || indicator === 'DEBIT') {
        drAmt = amt;
      } else if (indicator === 'CR' || indicator === 'CREDIT') {
        crAmt = amt;
      }
    } else if (amtCol >= 0) {
      const raw = String(row[amtCol] ?? '').trim().toUpperCase();
      if (raw.startsWith('-') || raw.includes('DR')) {
        drAmt = parseAmount(raw);
      } else {
        crAmt = parseAmount(raw);
      }
    } else {
      drAmt = drCol >= 0 ? parseAmount(row[drCol]) : 0;
      crAmt = crCol >= 0 ? parseAmount(row[crCol]) : 0;
    }

    let dateStr = dateCol >= 0 ? parseDate(row[dateCol]) : null;

    // Inherit the last seen date if the bank left this row's date blank
    if (dateStr) {
      lastSeenDate = dateStr;
    } else if (!dateStr && lastSeenDate) {
      dateStr = lastSeenDate;
    }

    const refNo = refCol >= 0 ? String(row[refCol] ?? '').trim() : '';

    // Skip rows where both debit and credit are zero (might be balance row etc.)
    if (drAmt === 0 && crAmt === 0) return;

    const amount = drAmt > 0 ? drAmt : crAmt;
    const direction = drAmt > 0 ? 'PAYMENT' : 'RECEIPT';

    // Duplicate check — skip if this exact transaction was already imported
    const fp = txnFingerprintRaw(dateStr, amount, direction, refNo, narration);
    if (seen.has(fp)) { rowsSkipped++; return; }
    seen.add(fp);

    // Batch cap — stop at 4000 new rows; user re-uploads same file for next batch
    if (rowsImported >= MAX_BATCH) { truncated = true; return; }

    const suspenseId = crypto.randomUUID();

    suspenseRows.push({
      id: suspenseId,
      companyId,
      fy,
      batchId,
      txnDate: dateStr,
      narration: narration || `Row ${headerRowIdx + idx + 2}`,
      referenceNo: refNo,
      amount,
      direction,
      status: 'UNALLOCATED',
      allocatedLedgerId: null,
      allocatedBy: null,
      allocationKeyword: null,
      allocatedAt: null,
      originalRowNumber: headerRowIdx + idx + 2,
      createdAt: now,
    });

    // Bank side entry
    // PAYMENT = money out of bank → Bank CR
    // RECEIPT = money into bank → Bank DR
    bankEntries.push({
      id: crypto.randomUUID(),
      companyId,
      fy,
      ledgerAccountId: bankAccount.id,
      txnDate: dateStr,
      narration: narration || `Row ${headerRowIdx + idx + 2}`,
      referenceNo: refNo,
      amount,
      side: direction === 'PAYMENT' ? 'CR' : 'DR',
      source: 'BULK_CSV',
      suspenseId,
      batchId,
      allocatedBy: null,
      allocationKeyword: null,
      createdAt: now,
    });

    if (direction === 'PAYMENT') totalPayments = round2(totalPayments + amount);
    else totalReceipts = round2(totalReceipts + amount);
    rowsImported++;
  });

  if (rowsImported === 0 && rowsSkipped === 0) {
    throw new Error('No valid transaction rows found in the CSV. Please check the file format.');
  }
  if (rowsImported === 0 && rowsSkipped > 0) {
    throw new Error(`All ${rowsSkipped} rows in this file were already imported. No new transactions added.`);
  }

  // Bulk insert
  bulkInsertSuspense(companyId, suspenseRows);
  bulkInsertLedgerEntries(companyId, bankEntries);

  appendAuditLog(companyId, {
    actor: 'MANUAL',
    action: 'import_csv',
    detail: {
      fileName: file.name,
      batchId,
      rowsImported,
      rowsSkipped,
      totalPayments,
      totalReceipts,
      fy,
    },
  });

  return { batchId, rowsImported, rowsSkipped, truncated, totalPayments, totalReceipts };
}
