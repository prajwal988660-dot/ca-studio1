import { z } from 'zod';

/**
 * Validation schemas for journal lines and journal entries
 * (matches `JournalLine` / `NewJournalEntry` in src/types/journal.ts).
 */

/* -------------------------------------------------------------------------- */
/*  Enums                                                                     */
/* -------------------------------------------------------------------------- */

export const natureEnum = z.enum([
  'asset',
  'liability',
  'capital',
  'revenue',
  'expense',
]);

export const voucherTypeEnum = z.enum([
  'PMT',
  'RCT',
  'CNT',
  'JRN',
  'SLS',
  'PUR',
  'DN',
  'CN',
  'PAY',
]);

/* -------------------------------------------------------------------------- */
/*  ISO date (YYYY-MM-DD) helper                                              */
/* -------------------------------------------------------------------------- */

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

const isoDateSchema = z
  .string()
  .trim()
  .refine(isValidIsoDate, 'Invalid date — expected format YYYY-MM-DD');

/* -------------------------------------------------------------------------- */
/*  Nested schema                                                             */
/* -------------------------------------------------------------------------- */

const inventorySubLineSchema = z
  .object({
    inventory_name: z.string(),
    hsn_sac: z.string(),
    unit: z.string(),
    qty: z.number(),
    rate: z.number(),
    discount_percent: z.number(),
    cgst_percent: z.number(),
    sgst_percent: z.number(),
    igst_percent: z.number(),
  })
  .passthrough();

/* -------------------------------------------------------------------------- */
/*  Journal line                                                              */
/* -------------------------------------------------------------------------- */

export const journalLineSchema = z
  .object({
    account_name: z.string().trim().min(1, 'Account name is required'),
    account_group: z.string(),
    nature: natureEnum,
    debit: z.number().min(0, 'Debit cannot be negative'),
    credit: z.number().min(0, 'Credit cannot be negative'),
    inventory_sub_lines: z.array(inventorySubLineSchema).optional(),
    tds_section: z.string().optional(),
    tds_rate: z.number().optional(),
    tcs_section: z.string().optional(),
    tcs_rate: z.number().optional(),
  })
  .superRefine((line, ctx) => {
    const hasDebit = line.debit > 0;
    const hasCredit = line.credit > 0;
    if (hasDebit && hasCredit) {
      ctx.addIssue({
        code: 'custom',
        path: ['debit'],
        message: 'A line cannot have both a debit and a credit amount',
      });
    } else if (!hasDebit && !hasCredit) {
      ctx.addIssue({
        code: 'custom',
        path: ['debit'],
        message: 'A line must have exactly one of debit or credit greater than 0',
      });
    }
  });

/* -------------------------------------------------------------------------- */
/*  Journal entry                                                             */
/* -------------------------------------------------------------------------- */

const sumField = (
  lines: Array<{ debit: number; credit: number }>,
  field: 'debit' | 'credit',
) => lines.reduce((total, line) => total + (line[field] || 0), 0);

export const journalEntryCreateSchema = z
  .object({
    company_id: z.string().min(1, 'Company is required'),
    entry_code: z.string().min(1, 'Entry code is required'),
    entry_date: isoDateSchema,
    voucher_type: voucherTypeEnum,
    voucher_number: z.string().optional(),
    lines: z
      .array(journalLineSchema)
      .min(2, 'A journal entry must have at least 2 lines'),
    narration: z.string(),
    book_period: z.string(),
    is_opening: z.boolean().optional(),
    is_closing: z.boolean().optional(),
  })
  .superRefine((entry, ctx) => {
    const totalDebit = sumField(entry.lines, 'debit');
    const totalCredit = sumField(entry.lines, 'credit');
    if (Math.abs(totalDebit - totalCredit) > 0.05) {
      ctx.addIssue({
        code: 'custom',
        path: ['lines'],
        message: `Debits and credits must balance (Dr ${totalDebit.toFixed(2)} ≠ Cr ${totalCredit.toFixed(2)})`,
      });
    }
  });

export type JournalLineInput = z.infer<typeof journalLineSchema>;
export type JournalEntryCreateInput = z.infer<typeof journalEntryCreateSchema>;
