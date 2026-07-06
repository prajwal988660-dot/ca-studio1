/**
 * Excel / CSV upload parser for CARP.
 *
 * Parses .xlsx / .xls / .csv files using SheetJS and stores the
 * parsed workbook in sessionStorage so the AI agent can access it
 * via the read_excel tool across the conversation.
 */

import * as XLSX from 'xlsx';

export interface ExcelSheet {
  name: string;
  headers: string[];
  rows: string[][];
  rowCount: number;
}

export interface ExcelWorkbook {
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  sheets: ExcelSheet[];
  totalRows: number;
}

const STORAGE_KEY = 'carp_excel_upload';

/** Parse a File object into a structured ExcelWorkbook and persist to sessionStorage. */
export function parseExcelFile(file: File): Promise<ExcelWorkbook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Empty file');

        const wb = XLSX.read(data, { type: 'array', cellDates: true });

        const sheets: ExcelSheet[] = wb.SheetNames.map((name) => {
          const ws = wb.Sheets[name];
          // header:1 → returns raw arrays; defval:'', raw:false → stringify everything
          const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, {
            header: 1,
            defval: '',
            raw: false,
          });

          // Drop completely empty rows
          const nonEmpty = raw.filter((row) =>
            (row as string[]).some((c) => String(c).trim() !== ''),
          );

          const headers = ((nonEmpty[0] ?? []) as unknown[]).map(String);
          const rows = (nonEmpty.slice(1) as unknown[][]).map((row) =>
            row.map(String),
          );

          return { name, headers, rows, rowCount: rows.length };
        });

        const workbook: ExcelWorkbook = {
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          sheets,
          totalRows: sheets.reduce((s, sh) => s + sh.rowCount, 0),
        };

        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(workbook));
        } catch {
          // sessionStorage quota — still return the workbook in-memory
        }

        resolve(workbook);
      } catch (err) {
        reject(new Error('Failed to parse file: ' + (err as Error).message));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/** Retrieve the last uploaded workbook from sessionStorage. */
export function getUploadedWorkbook(): ExcelWorkbook | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ExcelWorkbook) : null;
  } catch {
    return null;
  }
}

/** Remove the uploaded workbook from sessionStorage. */
export function clearUploadedWorkbook(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * Compact text summary injected into the CARP system prompt.
 * Keeps token usage low while giving the AI enough context.
 */
export function getWorkbookSummary(wb: ExcelWorkbook): string {
  const fmt = (n: number) =>
    n >= 1024 * 1024
      ? (n / (1024 * 1024)).toFixed(1) + ' MB'
      : (n / 1024).toFixed(0) + ' KB';

  const lines: string[] = [
    `File: "${wb.fileName}" (${fmt(wb.fileSize)}) | ${wb.sheets.length} sheet(s) | ${wb.totalRows} total data rows`,
  ];

  for (const s of wb.sheets) {
    lines.push(`  ▸ Sheet "${s.name}": ${s.rowCount} rows`);
    if (s.headers.length > 0) {
      lines.push(`    Columns: ${s.headers.slice(0, 20).join(' | ')}${s.headers.length > 20 ? ' …' : ''}`);
    }
    if (s.rows.length > 0) {
      lines.push(`    Row 1 sample: ${s.rows[0].slice(0, 8).join(' | ')}${s.rows[0].length > 8 ? ' …' : ''}`);
    }
    if (s.rows.length > 1) {
      lines.push(`    Row 2 sample: ${s.rows[1].slice(0, 8).join(' | ')}${s.rows[1].length > 8 ? ' …' : ''}`);
    }
  }

  return lines.join('\n');
}
