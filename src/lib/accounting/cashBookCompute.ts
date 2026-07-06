import type { JournalEntry } from './computeEngine';

export interface CashBookRow {
  date: string;
  entry_code: string;
  particulars: string;
  voucher_type: string;
  lf: string;
  cashAmount: number;
  bankAmount: number;
  discountAmount?: number;
  isContra: boolean;
}

function isCashLine(line: { account_name: string; account_group: string }) {
  if (line.account_group === 'Cash & Cash Equivalents') return true;
  // Legacy fallback
  const name = line.account_name.toLowerCase();
  if (line.account_group === 'Cash & Bank' && !name.includes('bank')) return true;
  return name === 'cash' || name === 'cash a/c' || name === 'cash account' || name.includes('petty cash');
}

function isBankLine(line: { account_name: string; account_group: string }) {
  if (line.account_group === 'Bank Balances') return true;
  // Legacy fallback
  const name = line.account_name.toLowerCase();
  if (line.account_group === 'Cash & Bank' && name.includes('bank')) return true;
  return name === 'bank' || name === 'bank a/c' || name === 'bank account' || name.includes('bank (');
}

export function computeCashBook(
  entries: JournalEntry[],
  type: 'single' | 'double' | 'triple'
): {
  receipts: CashBookRow[];
  payments: CashBookRow[];
  openingCash: number;
  openingBank: number;
  closingCash: number;
  closingBank: number;
  totalDiscountAllowed: number;
  totalDiscountReceived: number;
} {
  const receipts: CashBookRow[] = [];
  const payments: CashBookRow[] = [];
  let cashBalance = 0;
  let bankBalance = 0;
  let totalDiscountAllowed = 0;
  let totalDiscountReceived = 0;

  // Find opening balances from opening entries
  const openingEntries = entries.filter((e) => e.is_opening);
  for (const entry of openingEntries) {
    for (const line of entry.lines) {
      if (isCashLine(line)) {
        cashBalance += (line.debit || 0) - (line.credit || 0);
      }
      if (isBankLine(line)) {
        bankBalance += (line.debit || 0) - (line.credit || 0);
      }
    }
  }

  const openingCash = cashBalance;
  const openingBank = bankBalance;

  // Build Ledger Folio map per Indian accounting standards (L/F = page ref in ledger)
  const allAccounts = new Set<string>();
  for (const e of entries) {
    for (const l of e.lines) {
      if (!isCashLine(l) && !isBankLine(l)) {
        allAccounts.add(l.account_name);
      }
    }
  }
  const sortedAccounts = [...allAccounts].sort((a, b) => a.localeCompare(b));
  const folioMap = new Map<string, number>();
  sortedAccounts.forEach((acc, i) => folioMap.set(acc, i + 1));

  function getLf(particulars: string, isContra: boolean, otherLines: { account_name: string }[]): string {
    if (isContra) return 'C';
    if (otherLines.length === 0) return '';
    const folios = otherLines
      .map((l) => folioMap.get(l.account_name))
      .filter((f): f is number => f != null);
    if (folios.length === 0) return '';
    return folios.length === 1 ? String(folios[0]) : folios.join(',');
  }

  // Process non-opening entries
  const regularEntries = entries.filter((e) => !e.is_opening);

  for (const entry of regularEntries) {
    const cashLines = entry.lines.filter((l) => isCashLine(l));
    const bankLines = entry.lines.filter((l) => isBankLine(l));

    if (cashLines.length === 0 && bankLines.length === 0) continue;

    const otherLines = entry.lines.filter(
      (l) => !isCashLine(l) && !isBankLine(l)
    );

    const baseParticulars = otherLines.map(l => l.account_name).join(', ') || 'Contra';

    let cashDebit = 0, cashCredit = 0, bankDebit = 0, bankCredit = 0;
    for (const l of cashLines) { cashDebit += l.debit || 0; cashCredit += l.credit || 0; }
    for (const l of bankLines) { bankDebit += l.debit || 0; bankCredit += l.credit || 0; }

    // Check if contra entry (Cash to Bank or Bank to Cash)
    const isContra = cashLines.length > 0 && bankLines.length > 0;

    // For contra entries, show the opposite ledger name instead of "Contra"
    // so that withdrawals/deposits read clearly in the cash book.
    let receiptParticulars = baseParticulars;
    let paymentParticulars = baseParticulars;

    if (isContra) {
      const cashNames = [...new Set(cashLines.map((l) => l.account_name))].join(', ') || 'Cash A/c';
      const bankNames = [...new Set(bankLines.map((l) => l.account_name))].join(', ') || 'Bank A/c';

      if (cashDebit > 0 && bankCredit > 0) {
        // Bank -> Cash (withdrawal)
        receiptParticulars = bankNames;
        paymentParticulars = cashNames;
      } else if (bankDebit > 0 && cashCredit > 0) {
        // Cash -> Bank (deposit)
        receiptParticulars = cashNames;
        paymentParticulars = bankNames;
      } else {
        // Complex contra (multiple movements): show the opposite-side ledger names instead of "Contra".
        // Receipts side corresponds to debit into cash/bank; particulars should show the credited side.
        // Payments side corresponds to credit out of cash/bank; particulars should show the debited side.
        receiptParticulars = bankCredit > 0 ? bankNames : cashNames;
        paymentParticulars = bankDebit > 0 ? bankNames : cashNames;
      }
    }

    // Check for discount
    let discountAllowed = 0, discountReceived = 0;
    if (type === 'triple') {
      for (const l of otherLines) {
        if (l.account_name.toLowerCase().includes('discount allowed')) discountAllowed += l.debit || 0;
        if (l.account_name.toLowerCase().includes('discount received')) discountReceived += l.credit || 0;
      }
      totalDiscountAllowed += discountAllowed;
      totalDiscountReceived += discountReceived;
    }

    // Receipts side (debit to cash/bank)
    if (cashDebit > 0 || bankDebit > 0) {
      receipts.push({
        date: entry.entry_date,
        entry_code: entry.entry_code,
        particulars: isContra ? receiptParticulars : baseParticulars,
        voucher_type: entry.voucher_type,
        lf: getLf(isContra ? receiptParticulars : baseParticulars, isContra, otherLines),
        cashAmount: type === 'single' ? cashDebit + bankDebit : cashDebit,
        bankAmount: type === 'double' || type === 'triple' ? bankDebit : 0,
        discountAmount: type === 'triple' ? discountReceived : undefined,
        isContra,
      });
      cashBalance += cashDebit;
      bankBalance += bankDebit;
    }

    // Payments side (credit from cash/bank)
    if (cashCredit > 0 || bankCredit > 0) {
      payments.push({
        date: entry.entry_date,
        entry_code: entry.entry_code,
        particulars: isContra ? paymentParticulars : baseParticulars,
        voucher_type: entry.voucher_type,
        lf: getLf(isContra ? paymentParticulars : baseParticulars, isContra, otherLines),
        cashAmount: type === 'single' ? cashCredit + bankCredit : cashCredit,
        bankAmount: type === 'double' || type === 'triple' ? bankCredit : 0,
        discountAmount: type === 'triple' ? discountAllowed : undefined,
        isContra,
      });
      cashBalance -= cashCredit;
      bankBalance -= bankCredit;
    }
  }

  return {
    receipts,
    payments,
    openingCash,
    openingBank,
    closingCash: cashBalance,
    closingBank: bankBalance,
    totalDiscountAllowed,
    totalDiscountReceived,
  };
}
