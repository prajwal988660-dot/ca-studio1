/**
 * Bank Statement CSV/Excel Parser
 *
 * Parses CSV/Excel files using SheetJS, auto-detects columns,
 * extracts payee from narration (UPI/NEFT/IMPS/RTGS/ATM/POS/CHQ),
 * and detects payment mode.
 */

import * as XLSX from 'xlsx';
import type { BankTransaction, ImportBatch, PaymentMode } from './types';

// ── Column detection ──────────────────────────────────────────────────────────

const DATE_ALIASES = ['date', 'txn date', 'transaction date', 'value date', 'posting date', 'tran date'];
const NARRATION_ALIASES = ['narration', 'description', 'particulars', 'remarks', 'details', 'transaction remarks', 'tran remarks'];
const DEBIT_ALIASES = ['debit', 'withdrawal', 'withdrawals', 'debit amount', 'dr amount', 'dr', 'payment'];
const CREDIT_ALIASES = ['credit', 'deposit', 'deposits', 'credit amount', 'cr amount', 'cr', 'receipt'];
const BALANCE_ALIASES = ['balance', 'closing balance', 'running balance', 'available balance'];
const REF_ALIASES = ['reference', 'ref no', 'reference no', 'chq/ref number', 'chq no', 'ref', 'cheque no', 'utr'];

function findCol(headers: string[], aliases: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const alias of aliases) {
    const idx = lower.findIndex((h) => h.includes(alias));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseAmount(val: string | number | null | undefined): number {
  if (val == null || val === '') return 0;
  const str = String(val).replace(/[₹,\s]/g, '').trim();
  const n = parseFloat(str);
  return isNaN(n) ? 0 : Math.round(Math.abs(n) * 100) / 100;
}

function parseDate(val: string | number | null | undefined): string | null {
  if (!val) return null;
  const str = String(val).trim();

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD-Mon-YYYY (e.g., 15-Jan-2024)
  const dmonY = str.match(/^(\d{1,2})[\/\-](\w{3})[\/\-](\d{4})$/i);
  if (dmonY) {
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const [, d, mon, y] = dmonY;
    const m = months[mon.toLowerCase()];
    if (m) return `${y}-${m}-${d.padStart(2, '0')}`;
  }

  // YYYY-MM-DD
  const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;

  // DD/MM/YY
  const dmyShort = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (dmyShort) {
    const [, d, m, yy] = dmyShort;
    const y = parseInt(yy) > 50 ? `19${yy}` : `20${yy}`;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Fallback
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch { /* ignore */ }
  return null;
}

// ── Payee extraction ──────────────────────────────────────────────────────────

function extractPayee(narration: string): { payee: string; mode: PaymentMode; refNo: string } {
  const n = narration.trim();
  let refNo = '';

  // UPI: UPI/CR/123456789/PayeeName/... or UPI-PayeeName-...
  const upi = n.match(/UPI[-\/](?:CR|DR)?[-\/]?\d*[-\/]([^\/]+)/i);
  if (upi) {
    const utrMatch = n.match(/(\d{12,})/);
    if (utrMatch) refNo = utrMatch[1];
    return { payee: upi[1].trim(), mode: 'UPI', refNo };
  }

  // NEFT: NEFT/N123456/PayeeName/...
  const neft = n.match(/NEFT[-\/]\w+[-\/](.+?)(?:[-\/]|$)/i);
  if (neft) {
    const utrMatch = n.match(/NEFT[-\/](\w+)/i);
    if (utrMatch) refNo = utrMatch[1];
    return { payee: neft[1].trim(), mode: 'NEFT', refNo };
  }

  // IMPS: IMPS/P2A/123456/PayeeName/...
  const imps = n.match(/IMPS[-\/]\w+[-\/](.+?)(?:[-\/]|$)/i);
  if (imps) {
    const utrMatch = n.match(/IMPS[-\/](\w+)/i);
    if (utrMatch) refNo = utrMatch[1];
    return { payee: imps[1].trim(), mode: 'IMPS', refNo };
  }

  // RTGS
  const rtgs = n.match(/RTGS[-\/]\w+[-\/](.+?)(?:[-\/]|$)/i);
  if (rtgs) {
    const utrMatch = n.match(/RTGS[-\/](\w+)/i);
    if (utrMatch) refNo = utrMatch[1];
    return { payee: rtgs[1].trim(), mode: 'RTGS', refNo };
  }

  // ATM
  if (/ATM/i.test(n)) {
    const atmMatch = n.match(/ATM[-\/].*?(\w+\s+ATM|\w+\s+BRANCH)/i);
    return { payee: atmMatch ? atmMatch[1].trim() : 'ATM Withdrawal', mode: 'ATM', refNo: '' };
  }

  // POS
  const pos = n.match(/POS\s+\d+\s+(.+?)(?:\s+\d|$)/i);
  if (pos) return { payee: pos[1].trim(), mode: 'POS', refNo: '' };

  // Cheque
  const chq = n.match(/(?:CHQ|CHEQUE)\s*(?:NO)?\.?\s*(\d+)/i);
  if (chq) return { payee: `Cheque #${chq[1]}`, mode: 'CHQ', refNo: chq[1] };

  // CASH
  if (/\bCASH\b/i.test(n)) return { payee: n.slice(0, 40).trim(), mode: 'CASH', refNo: '' };

  // Fallback
  return { payee: n.slice(0, 40).trim() || 'Unknown', mode: 'OTHER', refNo: '' };
}

// ── Main parser ───────────────────────────────────────────────────────────────

export async function parseBankStatement(
  file: File,
  companyId: string,
  bankAccount: string,
): Promise<{ batch: ImportBatch; transactions: BankTransaction[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(arrayBuffer), {
    type: 'array',
    cellDates: false,
    raw: false,
  });

  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '', raw: false }) as string[][];

  // Find header row
  let headerRowIdx = 0;
  let headers: string[] = [];
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    const h = row.map((c) => String(c ?? '').toLowerCase().trim());
    if (findCol(h, DATE_ALIASES) >= 0 || findCol(h, NARRATION_ALIASES) >= 0) {
      headerRowIdx = i;
      headers = row.map((c) => String(c ?? ''));
      break;
    }
  }

  if (headers.length === 0) {
    headers = (rows[0] ?? []).map((c) => String(c ?? ''));
  }

  const dateCol = findCol(headers, DATE_ALIASES);
  const narCol = findCol(headers, NARRATION_ALIASES);
  const drCol = findCol(headers, DEBIT_ALIASES);
  const crCol = findCol(headers, CREDIT_ALIASES);
  const balCol = findCol(headers, BALANCE_ALIASES);
  const refCol = findCol(headers, REF_ALIASES);

  if (narCol < 0 && drCol < 0 && crCol < 0) {
    throw new Error(
      'Could not detect bank statement columns. Ensure your file has Date, Narration/Description, Debit/Withdrawal, Credit/Deposit headers.',
    );
  }

  const batchId = crypto.randomUUID();
  const transactions: BankTransaction[] = [];
  const dataRows = rows.slice(headerRowIdx + 1);

  for (const row of dataRows) {
    if (!row || row.every((c) => String(c ?? '').trim() === '')) continue;

    const narration = narCol >= 0 ? String(row[narCol] ?? '').trim() : '';
    const drAmt = drCol >= 0 ? parseAmount(row[drCol]) : 0;
    const crAmt = crCol >= 0 ? parseAmount(row[crCol]) : 0;
    const dateStr = dateCol >= 0 ? parseDate(row[dateCol]) : null;
    const balance = balCol >= 0 ? parseAmount(row[balCol]) : 0;
    const refFromCol = refCol >= 0 ? String(row[refCol] ?? '').trim() : '';

    if (drAmt === 0 && crAmt === 0) continue;
    if (!dateStr) continue;

    const { payee, mode, refNo } = extractPayee(narration);

    transactions.push({
      id: crypto.randomUUID(),
      company_id: companyId,
      import_batch: batchId,
      date: dateStr,
      narration_raw: narration,
      narration_clean: narration,
      payee,
      payment_mode: mode,
      debit: drAmt,
      credit: crAmt,
      balance,
      ref_no: refFromCol || refNo,
      journalized_id: null,
      journalized_at: null,
    });
  }

  if (transactions.length === 0) {
    throw new Error('No valid transaction rows found. Check that the file has Date, Narration, Debit/Credit columns with data.');
  }

  const batch: ImportBatch = {
    id: batchId,
    company_id: companyId,
    bank_account: bankAccount,
    file_name: file.name,
    imported_at: new Date().toISOString(),
    row_count: transactions.length,
  };

  return { batch, transactions };
}
