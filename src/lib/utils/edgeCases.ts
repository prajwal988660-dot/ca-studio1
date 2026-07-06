import type { Company } from '@/types/company';
import type { JournalEntry } from '@/lib/accounting/computeEngine';

/**
 * Check if a journal entry date is back-dated (before the current FY)
 */
export function isBackDated(entryDate: string, fyStart: string): boolean {
  return new Date(entryDate) < new Date(fyStart);
}

/**
 * Check if GST registration happened mid-year
 * Returns the registration date if mid-year, null otherwise
 */
export function getGSTMidYearDate(company: Company): string | null {
  if (company.gst_status === 'unregistered') return null;
  const regDate = company.gst_details?.registrationDate;
  if (!regDate) return null;
  const fyStart = company.financial_year_start;
  if (!fyStart) return null;
  const fy = new Date(fyStart);
  const reg = new Date(regDate);
  // If registration date is after FY start, it's a mid-year registration
  if (reg > fy) return regDate;
  return null;
}

/**
 * Detect partner admission/retirement during the year
 * Returns partners who joined or left during the current FY
 */
export function detectPartnerChanges(
  entries: JournalEntry[],
  fyStart: string,
  fyEnd: string
): { admissions: string[]; retirements: string[] } {
  const admissions: string[] = [];
  const retirements: string[] = [];

  entries.forEach(entry => {
    const date = entry.entry_date;
    if (date >= fyStart && date <= fyEnd) {
      const narration = (entry.narration || '').toLowerCase();
      entry.lines.forEach(line => {
        const account = line.account_name.toLowerCase();
        if (account.includes('capital') && (narration.includes('admission') || narration.includes('new partner'))) {
          admissions.push(line.account_name.replace(/capital|a\/c|account/gi, '').trim());
        }
        if (account.includes('capital') && (narration.includes('retirement') || narration.includes('retiring'))) {
          retirements.push(line.account_name.replace(/capital|a\/c|account/gi, '').trim());
        }
      });
    }
  });

  return {
    admissions: [...new Set(admissions)],
    retirements: [...new Set(retirements)],
  };
}

/**
 * Check if the entity type matches the current page
 * Returns warning message if page is not applicable for this entity
 */
export function getEntityMismatchWarning(
  entityType: string,
  pageName: string
): string | null {
  const companyOnlyPages = ['share-capital', 'debentures', 'deferred-tax'];
  const partnershipOnlyPages = ['partners-capital', 'pl-appropriation', 'revaluation', 'realisation'];
  const hufOnlyPages = ['karta-capital'];
  const npoOnlyPages = ['income-expenditure', 'receipts-payments', 'fund-accounts', 'fcra', 'application-check', 'form-10b'];
  const llpOnlyPages = ['llp-forms'];

  const companyTypes = ['pvt_ltd', 'public_ltd', 'opc', 'section8'];
  const partnershipTypes = ['partnership', 'llp'];
  const npoTypes = ['trust', 'society', 'section8'];

  if (companyOnlyPages.includes(pageName) && !companyTypes.includes(entityType)) {
    return `This page is designed for Company entities (Pvt Ltd, Public Ltd, OPC, Section 8). Your entity type is "${entityType}".`;
  }
  if (partnershipOnlyPages.includes(pageName) && !partnershipTypes.includes(entityType)) {
    return `This page is designed for Partnership/LLP entities. Your entity type is "${entityType}".`;
  }
  if (hufOnlyPages.includes(pageName) && entityType !== 'huf') {
    return `This page is designed for HUF entities. Your entity type is "${entityType}".`;
  }
  if (npoOnlyPages.includes(pageName) && !npoTypes.includes(entityType)) {
    return `This page is designed for Trust/Society/Section 8 entities. Your entity type is "${entityType}".`;
  }
  if (llpOnlyPages.includes(pageName) && entityType !== 'llp') {
    return `This page is designed for LLP entities. Your entity type is "${entityType}".`;
  }
  return null;
}

/**
 * Validate financial year dates
 */
export function validateFYDates(fromDate: string, toDate: string, fyStart: string): {
  valid: boolean;
  warning?: string;
} {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const fy = new Date(fyStart);

  if (from > to) {
    return { valid: false, warning: 'From date cannot be after To date.' };
  }
  if (from < fy) {
    return { valid: true, warning: 'Selected date range starts before the current financial year.' };
  }
  return { valid: true };
}

/**
 * Check for duplicate journal entry (same date, same narration, same amount)
 */
export function checkDuplicateEntry(
  newEntry: { date: string; narration: string; totalDebit: number },
  existingEntries: JournalEntry[]
): boolean {
  return existingEntries.some(entry => {
    if (entry.entry_date !== newEntry.date) return false;
    if ((entry.narration || '').toLowerCase() !== newEntry.narration.toLowerCase()) return false;
    const entryTotal = entry.lines.reduce((sum, l) => sum + l.debit, 0);
    return Math.abs(entryTotal - newEntry.totalDebit) < 0.01;
  });
}
