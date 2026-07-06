import { classifyAccount } from '@/lib/masterCOA';
import {
  createCompany,
  createInitialBookPeriod,
  createJournalEntry,
  deleteJournalEntry,
  listCompanies,
  listJournalEntries,
  updateCompany,
} from '@/lib/offlineDb';
import {
  createEmptyInvoiceV2Draft,
  createEmptyLineItem,
  createInvoiceV2,
  createPurchaseInvoice,
  createSalesInvoice,
  deleteInvoiceV2,
  deletePurchaseInvoice,
  deleteSalesInvoice,
  listInvoicesV2,
  listPurchaseInvoices,
  listSalesInvoices,
} from '@/lib/accounting/gstInvoices';
import { generateUniqueShortEntryCode } from '@/lib/utils/entryCodeGenerator';
import type { JournalEntry, JournalLine, VoucherType } from '@/types/journal';

const TARGET_COMPANY_NAME = 'Varatax Private Limited';
const START_DATE = '2025-04-01';
const SEED_TAG = '[VARATAX_SEED_V2]';
const TARGET_JOURNAL_ENTRY_COUNT = 500;
const TARGET_LEGACY_SALES_COUNT = 80;
const TARGET_LEGACY_PURCHASE_COUNT = 80;
const TARGET_V2_INVOICE_COUNT = 90;

function toBookPeriod(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const month = d.getMonth();
  const year = d.getFullYear();
  const fyStartYear = month < 3 ? year - 1 : year;
  return `${fyStartYear}-${fyStartYear + 1}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildLine(accountName: string, debit: number, credit: number, extras?: Partial<JournalLine>): JournalLine {
  const classification = classifyAccount(accountName);
  return {
    account_name: accountName,
    account_group: classification?.subGroup ?? 'Suspense & Clearing',
    nature: classification?.nature ?? 'asset',
    debit,
    credit,
    ...extras,
  };
}

function createSeedCompanyIfMissing(): string {
  const existing = listCompanies().find(
    (company) => company.name.trim().toLowerCase() === TARGET_COMPANY_NAME.toLowerCase()
  );

  if (existing) {
    // Keep this company configured to expose data-heavy modules.
    void updateCompany(existing.id, {
      inventory_enabled: true,
      tcs_applicable: true,
      tds_applicable: true,
      gst_status: 'regular',
      business_nature: ['Trading', 'Professional', 'Service'],
      entity_details: {
        ...(existing.entity_details || {}),
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        disclosureLevel: 'I',
      },
      gst_details: {
        ...(existing.gst_details || {}),
        gstin: existing.gst_details?.gstin || '29ABCDE1234F1Z5',
        gstScheme: 'regular',
        stateCode: '29',
        registrationDate: existing.gst_details?.registrationDate || START_DATE,
      },
    });
    return existing.id;
  }

  const company = createCompany({
    name: TARGET_COMPANY_NAME,
    entity_type: 'pvt_ltd',
    entity_details: {
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      disclosureLevel: 'I',
    },
    business_nature: ['Trading', 'Professional', 'Service'],
    inventory_enabled: true,
    inventory_config: {
      valuationMethod: 'weighted_average',
      pettyCashThreshold: 5000,
    },
    gst_status: 'regular',
    gst_details: {
      gstin: '29ABCDE1234F1Z5',
      gstScheme: 'regular',
      stateCode: '29',
      registrationDate: START_DATE,
    },
    tds_applicable: true,
    tcs_applicable: true,
    accounting_method: 'mercantile',
    financial_year_start: 'april',
  });

  createInitialBookPeriod(company.id);
  return company.id;
}

function clearSeededJournalData(companyId: string): void {
  const entries = listJournalEntries(companyId);
  for (const entry of entries) {
    deleteJournalEntry(entry.id);
  }
}

function clearInvoiceData(companyId: string): void {
  for (const row of listSalesInvoices(companyId)) {
    deleteSalesInvoice(row.id);
  }
  for (const row of listPurchaseInvoices(companyId)) {
    deletePurchaseInvoice(row.id);
  }
  for (const row of listInvoicesV2(companyId)) {
    deleteInvoiceV2(row.id);
  }
}

function seedOpeningEntry(companyId: string, usedCodes: Set<string>): void {
  const entryCode = generateUniqueShortEntryCode(usedCodes);
  usedCodes.add(entryCode);
  createJournalEntry({
    company_id: companyId,
    entry_code: entryCode,
    entry_date: START_DATE,
    voucher_type: 'JRN',
    voucher_number: null,
    narration: `${SEED_TAG} Opening balances`,
    book_period: toBookPeriod(START_DATE),
    is_opening: true,
    lines: [
      buildLine('Current Account — Bank 1', 1200000, 0),
      buildLine('Cash in Hand — Main / Head Office', 90000, 0),
      buildLine('Stock-in-Trade (Traded Goods)', 350000, 0),
      buildLine('Debtors — Domestic (Trade)', 210000, 0),
      buildLine('Plant & Machinery', 500000, 0),
      buildLine('Equity Share Capital', 0, 2350000),
    ],
  });
}

function createSalesEntry(companyId: string, index: number, usedCodes: Set<string>): void {
  const taxable = 25000 + (index % 12) * 1800;
  const cgst = Math.round(taxable * 0.09);
  const sgst = Math.round(taxable * 0.09);
  const total = taxable + cgst + sgst;
  const entryDate = addDays(START_DATE, index);
  const entryCode = generateUniqueShortEntryCode(usedCodes);
  usedCodes.add(entryCode);
  createJournalEntry({
    company_id: companyId,
    entry_code: entryCode,
    entry_date: entryDate,
    voucher_type: 'SLS',
    voucher_number: null,
    narration: `${SEED_TAG} Sale invoice posted`,
    book_period: toBookPeriod(entryDate),
    lines: [
      buildLine('Debtors — Domestic (Trade)', total, 0),
      buildLine('Sales — Domestic Products / Goods', 0, taxable, { hsn_code: '8471' } as Partial<JournalLine>),
      buildLine('CGST Output Tax Payable', 0, cgst),
      buildLine('SGST / UTGST Output Tax Payable', 0, sgst),
    ],
  });
}

function createPurchaseEntry(companyId: string, index: number, usedCodes: Set<string>): void {
  const taxable = 18000 + (index % 10) * 1400;
  const cgst = Math.round(taxable * 0.09);
  const sgst = Math.round(taxable * 0.09);
  const total = taxable + cgst + sgst;
  const entryDate = addDays(START_DATE, index);
  const entryCode = generateUniqueShortEntryCode(usedCodes);
  usedCodes.add(entryCode);
  createJournalEntry({
    company_id: companyId,
    entry_code: entryCode,
    entry_date: entryDate,
    voucher_type: 'PUR',
    voucher_number: null,
    narration: `${SEED_TAG} Purchase invoice booked`,
    book_period: toBookPeriod(entryDate),
    lines: [
      buildLine('Purchases — Traded Goods', taxable, 0),
      buildLine('CGST Input Tax Credit Receivable', cgst, 0),
      buildLine('SGST / UTGST Input Tax Credit Receivable', sgst, 0),
      buildLine('Trade Creditors — Domestic (Goods)', 0, total),
    ],
  });
}

function createReceiptEntry(companyId: string, index: number, usedCodes: Set<string>): void {
  const amount = 12000 + (index % 8) * 950;
  const entryDate = addDays(START_DATE, index);
  const entryCode = generateUniqueShortEntryCode(usedCodes);
  usedCodes.add(entryCode);
  createJournalEntry({
    company_id: companyId,
    entry_code: entryCode,
    entry_date: entryDate,
    voucher_type: 'RCT',
    voucher_number: null,
    narration: `${SEED_TAG} Receipt from customer`,
    book_period: toBookPeriod(entryDate),
    lines: [
      buildLine('Current Account — Bank 1', amount, 0),
      buildLine('Debtors — Domestic (Trade)', 0, amount),
    ],
  });
}

function createPaymentEntry(companyId: string, index: number, usedCodes: Set<string>): void {
  const amount = 9000 + (index % 6) * 700;
  const entryDate = addDays(START_DATE, index);
  const entryCode = generateUniqueShortEntryCode(usedCodes);
  usedCodes.add(entryCode);
  createJournalEntry({
    company_id: companyId,
    entry_code: entryCode,
    entry_date: entryDate,
    voucher_type: 'PMT',
    voucher_number: null,
    narration: `${SEED_TAG} Vendor payment`,
    book_period: toBookPeriod(entryDate),
    lines: [
      buildLine('Trade Creditors — Domestic (Goods)', amount, 0),
      buildLine('Current Account — Bank 1', 0, amount),
    ],
  });
}

function createTdsBookingEntry(companyId: string, index: number, usedCodes: Set<string>): void {
  const gross = 60000 + (index % 5) * 3000;
  const tds = Math.round(gross * 0.1);
  const net = gross - tds;
  const entryDate = addDays(START_DATE, index);
  const entryCode = generateUniqueShortEntryCode(usedCodes);
  usedCodes.add(entryCode);
  createJournalEntry({
    company_id: companyId,
    entry_code: entryCode,
    entry_date: entryDate,
    voucher_type: 'JRN',
    voucher_number: null,
    narration: `${SEED_TAG} Professional fee with TDS`,
    book_period: toBookPeriod(entryDate),
    lines: [
      buildLine('Legal & Professional Charges', gross, 0),
      buildLine('Trade Creditors — Domestic (Services)', 0, net),
      buildLine('TDS Payable — Sec 194J (Professional Fees)', 0, tds, {
        tds_section: '194J',
        tds_rate: 10,
      }),
    ],
  });
}

function createTcsSalesEntry(companyId: string, index: number, usedCodes: Set<string>): void {
  const taxable = 80000 + (index % 7) * 2500;
  const tcs = Math.round(taxable * 0.01);
  const totalReceivable = taxable + tcs;
  const entryDate = addDays(START_DATE, index);
  const entryCode = generateUniqueShortEntryCode(usedCodes);
  usedCodes.add(entryCode);
  createJournalEntry({
    company_id: companyId,
    entry_code: entryCode,
    entry_date: entryDate,
    voucher_type: 'SLS',
    voucher_number: null,
    narration: `${SEED_TAG} Sale with TCS collection`,
    book_period: toBookPeriod(entryDate),
    lines: [
      buildLine('Debtors — Domestic (Trade)', totalReceivable, 0),
      buildLine('Sales — Traded Goods', 0, taxable),
      buildLine('TCS Payable', 0, tcs, {
        tcs_section: '206C(1H)',
        tcs_rate: 1,
      }),
    ],
  });
}

function createContraEntry(companyId: string, index: number, usedCodes: Set<string>): void {
  const amount = 15000 + (index % 4) * 1000;
  const entryDate = addDays(START_DATE, index);
  const entryCode = generateUniqueShortEntryCode(usedCodes);
  usedCodes.add(entryCode);
  createJournalEntry({
    company_id: companyId,
    entry_code: entryCode,
    entry_date: entryDate,
    voucher_type: 'CNT',
    voucher_number: null,
    narration: `${SEED_TAG} Cash withdrawn from bank`,
    book_period: toBookPeriod(entryDate),
    lines: [
      buildLine('Cash in Hand — Main / Head Office', amount, 0),
      buildLine('Current Account — Bank 1', 0, amount),
    ],
  });
}

function createDepreciationEntry(companyId: string, index: number, usedCodes: Set<string>): void {
  const amount = 5000 + (index % 6) * 500;
  const entryDate = addDays(START_DATE, index);
  const entryCode = generateUniqueShortEntryCode(usedCodes);
  usedCodes.add(entryCode);
  createJournalEntry({
    company_id: companyId,
    entry_code: entryCode,
    entry_date: entryDate,
    voucher_type: 'JRN',
    voucher_number: null,
    narration: `${SEED_TAG} Monthly depreciation`,
    book_period: toBookPeriod(entryDate),
    lines: [
      buildLine('Depreciation — Tangible Assets', amount, 0),
      buildLine('Accum. Dep — Plant & Machinery', 0, amount),
    ],
  });
}

function createCapitalOrLoanEntry(companyId: string, index: number, usedCodes: Set<string>): void {
  const amount = 300000 + (index % 3) * 50000;
  const entryDate = addDays(START_DATE, index);
  const entryCode = generateUniqueShortEntryCode(usedCodes);
  usedCodes.add(entryCode);
  const isCapital = index % 2 === 0;
  createJournalEntry({
    company_id: companyId,
    entry_code: entryCode,
    entry_date: entryDate,
    voucher_type: 'RCT',
    voucher_number: null,
    narration: isCapital ? `${SEED_TAG} Capital infused` : `${SEED_TAG} Debenture proceeds received`,
    book_period: toBookPeriod(entryDate),
    lines: [
      buildLine('Current Account — Bank 2', amount, 0),
      buildLine(isCapital ? 'Equity Share Capital' : 'Secured Debentures', 0, amount),
    ],
  });
}

function createTaxAndPayrollEntry(companyId: string, index: number, usedCodes: Set<string>): void {
  const payroll = 110000 + (index % 5) * 4000;
  const tdsSalary = Math.round(payroll * 0.06);
  const pf = Math.round(payroll * 0.12);
  const salaryPayable = payroll - tdsSalary - pf;
  const entryDate = addDays(START_DATE, index);
  const entryCode = generateUniqueShortEntryCode(usedCodes);
  usedCodes.add(entryCode);
  createJournalEntry({
    company_id: companyId,
    entry_code: entryCode,
    entry_date: entryDate,
    voucher_type: 'JRN',
    voucher_number: null,
    narration: `${SEED_TAG} Payroll accrual with statutory liabilities`,
    book_period: toBookPeriod(entryDate),
    lines: [
      buildLine('Salaries & Wages', payroll, 0),
      buildLine('PF Payable (Employee + Employer)', 0, pf),
      buildLine('TDS Payable — Sec 192 (Salary)', 0, tdsSalary, {
        tds_section: '192',
        tds_rate: 6,
      }),
      buildLine('Salary Payable', 0, salaryPayable),
    ],
  });
}

function createAdvanceTaxPaymentEntry(companyId: string, index: number, usedCodes: Set<string>): void {
  const amount = 22000 + (index % 5) * 1400;
  const entryDate = addDays(START_DATE, index);
  const entryCode = generateUniqueShortEntryCode(usedCodes);
  usedCodes.add(entryCode);
  createJournalEntry({
    company_id: companyId,
    entry_code: entryCode,
    entry_date: entryDate,
    voucher_type: 'PMT',
    voucher_number: null,
    narration: `${SEED_TAG} Advance income tax paid`,
    book_period: toBookPeriod(entryDate),
    lines: [
      buildLine('Advance Income Tax Paid (Current Year)', amount, 0),
      buildLine('Current Account — Bank 1', 0, amount),
    ],
  });
}

function seedJournalEntries(companyId: string): void {
  const existing = listJournalEntries(companyId);
  const hasCorrectSeed = existing.length >= TARGET_JOURNAL_ENTRY_COUNT && existing.some(
    (entry) => (entry.narration || '').includes(SEED_TAG)
  );
  if (!hasCorrectSeed && existing.length > 0) {
    clearSeededJournalData(companyId);
  }

  const current = listJournalEntries(companyId);
  const usedCodes = new Set(current.map((entry: JournalEntry) => entry.entry_code));

  if (current.length === 0) {
    seedOpeningEntry(companyId, usedCodes);
  }

  const starters = listJournalEntries(companyId).length;
  const toCreate = TARGET_JOURNAL_ENTRY_COUNT - starters;
  if (toCreate <= 0) return;

  for (let i = 0; i < toCreate; i += 1) {
    const index = starters + i;
    const mode = index % 12;
    if (mode === 0) createSalesEntry(companyId, index, usedCodes);
    else if (mode === 1) createPurchaseEntry(companyId, index, usedCodes);
    else if (mode === 2) createReceiptEntry(companyId, index, usedCodes);
    else if (mode === 3) createPaymentEntry(companyId, index, usedCodes);
    else if (mode === 4) createTdsBookingEntry(companyId, index, usedCodes);
    else if (mode === 5) createTcsSalesEntry(companyId, index, usedCodes);
    else if (mode === 6) createContraEntry(companyId, index, usedCodes);
    else if (mode === 7) createDepreciationEntry(companyId, index, usedCodes);
    else if (mode === 8) createCapitalOrLoanEntry(companyId, index, usedCodes);
    else if (mode === 9) createTaxAndPayrollEntry(companyId, index, usedCodes);
    else if (mode === 10) createAdvanceTaxPaymentEntry(companyId, index, usedCodes);
    else createSalesEntry(companyId, index, usedCodes);
  }
}

function seedLegacySales(companyId: string): void {
  const existing = listSalesInvoices(companyId);
  if (existing.length >= TARGET_LEGACY_SALES_COUNT) return;
  const toCreate = TARGET_LEGACY_SALES_COUNT - existing.length;
  const startOffset = existing.length;
  for (let i = 0; i < toCreate; i += 1) {
    const idx = startOffset + i;
    const date = addDays(START_DATE, idx);
    const taxable = 16000 + (idx % 11) * 900;
    createSalesInvoice(companyId, {
      invoice_date: date,
      bucket: 'B2B',
      customer_name: `Customer ${idx + 1}`,
      customer_gstin: `29ABCDE${String(1000 + (idx % 8999)).padStart(4, '0')}F1Z5`,
      place_of_supply_state: 'Karnataka',
      supply_type: 'intra',
      taxable_value: taxable,
      gst_rate: 18,
      narration: `${SEED_TAG} Legacy sales invoice`,
      section_code: 'B2B',
      hsn_code: '8471',
      quantity: 1,
      uqc: 'NOS',
    });
  }
}

function seedLegacyPurchases(companyId: string): void {
  const existing = listPurchaseInvoices(companyId);
  if (existing.length >= TARGET_LEGACY_PURCHASE_COUNT) return;
  const toCreate = TARGET_LEGACY_PURCHASE_COUNT - existing.length;
  const startOffset = existing.length;
  for (let i = 0; i < toCreate; i += 1) {
    const idx = startOffset + i;
    const date = addDays(START_DATE, idx);
    const taxable = 12000 + (idx % 9) * 1100;
    createPurchaseInvoice(companyId, {
      invoice_date: date,
      bucket: 'B2B',
      vendor_name: `Supplier ${idx + 1}`,
      vendor_gstin: `29PQRS${String(1000 + (idx % 8999)).padStart(4, '0')}L1Z5`,
      item_description: `Inventory Item ${(idx % 15) + 1}`,
      item_hsn: '8471',
      item_qty: 2 + (idx % 4),
      item_rate: Math.round(taxable / (2 + (idx % 4))),
      place_of_supply_state: 'Karnataka',
      supply_type: 'intra',
      taxable_value: taxable,
      gst_rate: 18,
      itc_eligible: true,
      narration: `${SEED_TAG} Legacy purchase invoice`,
    });
  }
}

function seedV2Invoices(companyId: string): void {
  const existing = listInvoicesV2(companyId);
  if (existing.length >= TARGET_V2_INVOICE_COUNT) return;
  const toCreate = TARGET_V2_INVOICE_COUNT - existing.length;
  const startOffset = existing.length;

  for (let i = 0; i < toCreate; i += 1) {
    const idx = startOffset + i;
    const date = addDays(START_DATE, idx);
    const taxable = 25000 + (idx % 10) * 2100;
    const baseDraft = createEmptyInvoiceV2Draft('TAX_INVOICE');
    const buyerRegistered = idx % 3 !== 0;
    const itemQty = 1 + (idx % 3);
    const itemRate = Math.round(taxable / itemQty);

    const item = {
      ...createEmptyLineItem(1),
      description: `Service Package ${(idx % 8) + 1}`,
      hsn: '9983',
      qty: itemQty,
      rate: itemRate,
      gst_rate: 18,
      supply_nature: 'TAXABLE' as const,
      uqc: 'NOS',
    };

    const draft = {
      ...baseDraft,
      invoice_date: date,
      period: date.slice(0, 7),
      buyer_type: buyerRegistered ? 'REGISTERED' as const : 'CONSUMER' as const,
      b2c_type: buyerRegistered ? undefined : 'B2CS' as const,
      buyer_name: buyerRegistered ? `B2B Client ${idx + 1}` : `Retail Customer ${idx + 1}`,
      buyer_gstin: buyerRegistered ? `29ABCDE${String(2000 + (idx % 7000)).padStart(4, '0')}F1Z5` : undefined,
      buyer_state: 'Karnataka',
      buyer_state_code: '29',
      place_of_supply: '29',
      supply_type: 'intra' as const,
      is_intra_state: true,
      items: [item],
      notes: `${SEED_TAG} V2 sales document`,
      status: 'SAVED' as const,
    };

    createInvoiceV2(companyId, draft);
  }
}

export function ensureVarataxSeedData(): void {
  if (typeof window === 'undefined') return;

  const companyId = createSeedCompanyIfMissing();
  const journalEntries = listJournalEntries(companyId);
  const legacySales = listSalesInvoices(companyId);
  const legacyPurchases = listPurchaseInvoices(companyId);
  const v2Invoices = listInvoicesV2(companyId);
  const hasOldSeedOnly =
    journalEntries.length >= TARGET_JOURNAL_ENTRY_COUNT &&
    !journalEntries.some((entry) => (entry.narration || '').includes(SEED_TAG));

  if (hasOldSeedOnly) {
    clearSeededJournalData(companyId);
    clearInvoiceData(companyId);
  } else if (
    legacySales.length === 0 &&
    legacyPurchases.length === 0 &&
    v2Invoices.length > 0 &&
    !v2Invoices.some((inv) => (inv.notes || '').includes(SEED_TAG))
  ) {
    clearInvoiceData(companyId);
  }

  seedJournalEntries(companyId);
  seedLegacySales(companyId);
  seedLegacyPurchases(companyId);
  seedV2Invoices(companyId);
}

