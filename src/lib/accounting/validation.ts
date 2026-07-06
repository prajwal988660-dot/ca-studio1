import type { JournalEntry } from '@/types/journal';

export interface JournalValidationError {
  code: string;
  message: string;
  lineIndex?: number;
  field?: string;
}

export interface JournalValidationResult {
  ok: boolean;
  errors: JournalValidationError[];
}

function isValidNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validateJournalEntry(entry: JournalEntry): JournalValidationResult {
  const errors: JournalValidationError[] = [];

  if (!entry.entry_date || typeof entry.entry_date !== 'string') {
    errors.push({
      code: 'invalid_date',
      field: 'entry_date',
      message: 'Entry date is missing or invalid.',
    });
  }

  if (!Array.isArray(entry.lines) || entry.lines.length === 0) {
    errors.push({
      code: 'no_lines',
      field: 'lines',
      message: 'Journal entry must have at least one line.',
    });
  }

  let totalDebit = 0;
  let totalCredit = 0;

  entry.lines.forEach((line, index) => {
    if (!line.account_name || !line.account_name.trim()) {
      errors.push({
        code: 'missing_account_name',
        field: 'account_name',
        lineIndex: index,
        message: 'Account name is required for each line.',
      });
    }

    if (!isValidNumber(line.debit) || !isValidNumber(line.credit)) {
      errors.push({
        code: 'invalid_amount',
        field: 'debit/credit',
        lineIndex: index,
        message: 'Debit and credit must be valid numbers.',
      });
      return;
    }

    if (line.debit < 0 || line.credit < 0) {
      errors.push({
        code: 'negative_amount',
        field: 'debit/credit',
        lineIndex: index,
        message: 'Debit and credit cannot be negative.',
      });
    }

    if (line.debit > 0 && line.credit > 0) {
      errors.push({
        code: 'both_sides_nonzero',
        field: 'debit/credit',
        lineIndex: index,
        message: 'A line cannot have both debit and credit greater than zero.',
      });
    }

    totalDebit += line.debit || 0;
    totalCredit += line.credit || 0;
  });

  const diff = Math.abs(totalDebit - totalCredit);
  /** Allow small rounding drift from split lines / display (manual entry UI uses the same band). */
  const TOLERANCE = 0.05;
  if (diff > TOLERANCE) {
    errors.push({
      code: 'unbalanced_entry',
      field: 'lines',
      message: 'Total debit must equal total credit for the entry.',
    });
  }

  return { ok: errors.length === 0, errors };
}

