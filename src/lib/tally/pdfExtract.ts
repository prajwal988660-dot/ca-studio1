// Best-effort import of a Tally report exported as PDF.
//
// PDFs are visual, not structured, so this targets a Trial-Balance / list-style
// report: each line is "<Ledger Name> <amount> [Dr|Cr]" (or two amount columns).
// We extract text with pdf.js, parse those lines into ledger balances, and return
// a balances-only TallyDataset (no vouchers). The report engine then shows Trial
// Balance / Ledgers directly and groups them into Balance Sheet / P&L by name.

import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { keywordNature, type TallyDataset, type TallyLedger } from './tallyParser';

/** Extract the PDF as an array of text lines (top-to-bottom, left-to-right). */
async function extractPdfLines(file: File): Promise<string[]> {
  const pdfjs: any = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const lines: string[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const rows = new Map<number, { x: number; s: string }[]>();
    for (const item of content.items as any[]) {
      if (typeof item.str !== 'string' || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]); // group items sharing a baseline
      const x = item.transform[4];
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x, s: item.str });
    }
    for (const y of Array.from(rows.keys()).sort((a, b) => b - a)) {
      const line = rows.get(y)!.sort((a, b) => a.x - b.x).map((r) => r.s).join(' ').replace(/\s+/g, ' ').trim();
      if (line) lines.push(line);
    }
  }
  return lines;
}

const toNum = (s: string) => parseFloat(s.replace(/,/g, '')) || 0;

const SKIP = /^(particulars|trial balance|balance sheet|profit|grand total|total|opening|closing|page \d|as on|as at|for the|liabilities|assets|capital account$|current )/i;

/** Parse extracted lines into ledger balances (internal signed: +Dr / −Cr). */
function parseBalanceLines(lines: string[]): TallyLedger[] {
  const ledgers: TallyLedger[] = [];
  const seen = new Set<string>();
  const AMT = /\d[\d,]*\.\d{2}/g;

  for (const raw of lines) {
    const line = raw.trim();
    const amounts = line.match(AMT);
    if (!amounts || !amounts.length) continue;

    const firstIdx = line.search(AMT);
    const name = line.slice(0, firstIdx).replace(/[.\s:|-]+$/, '').trim();
    if (!name || name.length < 2 || SKIP.test(name) || /^\d/.test(name)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;

    const hasDr = /\bDr\.?\b/i.test(line);
    const hasCr = /\bCr\.?\b/i.test(line);
    let signed: number;
    if (amounts.length >= 2 && !hasDr && !hasCr) {
      signed = toNum(amounts[0]) - toNum(amounts[1]); // Debit col − Credit col
    } else {
      const amt = toNum(amounts[0]);
      if (hasCr) signed = -amt;
      else if (hasDr) signed = amt;
      else {
        const nat = keywordNature(name);
        signed = nat === 'liability' || nat === 'income' ? -amt : amt;
      }
    }
    if (Math.abs(signed) < 0.005) continue;
    seen.add(key);
    ledgers.push({ name, parent: '', opening: signed });
  }
  return ledgers;
}

/** Read a Tally PDF export into a balances-only dataset. */
export async function parseTallyPdf(file: File): Promise<TallyDataset> {
  const lines = await extractPdfLines(file);
  const ledgers = parseBalanceLines(lines);
  if (!ledgers.length) {
    throw new Error(`No ledger balances could be read from "${file.name}". For reliable results, import the Tally XML export instead.`);
  }
  return {
    fileName: file.name,
    importedAt: new Date().toISOString(),
    groups: [],
    ledgers,
    vouchers: [],
    minDate: '',
    maxDate: '',
  };
}
