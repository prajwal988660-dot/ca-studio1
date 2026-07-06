/**
 * Migration: Fix old journal entries where account_name was set to a COA sub-group
 * (e.g. "Other Income", "Employee Benefits Expense", "Suspense & Clearing")
 * instead of the actual ledger name.
 *
 * account_name = what appears in journal, ledger, cash book (original name)
 * account_group = sub-group for TB / P&L / BS routing (classification)
 *
 * This scans ALL entries across ALL companies and rewrites account_name
 * based on the narration, while keeping account_group intact.
 */

import { listCompanies, listJournalEntries, updateJournalEntry } from '@/lib/offlineDb';
import { getAllSubGroups } from '@/lib/masterCOA';
import { invalidateEntriesCache } from '@/lib/accounting/computeEngine';

const SUB_GROUP_SET = new Set(getAllSubGroups());

/** Derive a proper ledger name from narration text */
function ledgerNameFromNarration(narration: string, oldName: string): string {
  const n = narration.toLowerCase();

  // --- Income patterns ---
  if (/debtor|collection|received from customer/i.test(n)) return 'Trade Receivables';
  if (/interest.*fd|interest.*deposit|interest.*received|interest.*income/i.test(n)) return 'Interest on FD / Deposits';
  if (/rent.*received|rental.*income|subletting/i.test(n)) return 'Rental Income';
  if (/dividend.*received|dividend.*income/i.test(n)) return 'Dividend Income';
  if (/commission.*received|commission.*income/i.test(n)) return 'Commission Received';
  if (/royalty.*received|royalty.*income/i.test(n)) return 'Royalty Income';
  if (/insurance.*claim|claim.*received|claim.*settled/i.test(n)) return 'Insurance Claim Received';
  if (/scrap.*sale|sale.*scrap|old newspaper/i.test(n)) return 'Scrap Sales';
  if (/exchange.*gain|forex.*gain/i.test(n)) return 'Foreign Exchange Gain';
  if (/profit.*sale.*asset|profit.*sale.*investment|profit.*sale.*machinery|profit.*sale.*vehicle|capital gain/i.test(n)) return 'Profit on Sale of Assets';
  if (/discount.*received/i.test(n)) return 'Discount Received';
  if (/miscellaneous.*income|sundry.*income/i.test(n)) return 'Sundry Income';
  if (/grant.*received|subsidy.*received|government.*grant/i.test(n)) return 'Government Grant Income';
  if (/bad debt.*recovered|previously written off.*recovered/i.test(n)) return 'Bad Debts Recovered';

  // --- Expense patterns ---
  if (/trade licence|registration|udyam/i.test(n)) return 'Trade Licence / Registration';
  if (/stamp duty/i.test(n)) return 'Stamp Duty';
  if (/ca fee|chartered accountant|audit fee|professional fee/i.test(n)) return 'Professional Fees';
  if (/gst.*registration|gst.*filing|gst.*audit/i.test(n)) return 'GST Filing / Registration';
  if (/rubber stamp|visiting card|printing|stationery/i.test(n)) return 'Printing & Stationery';
  if (/security deposit|advance.*rent/i.test(n)) return 'Security Deposit';
  if (/computer|it equipment|desktop|server|laptop/i.test(n)) return 'Computers & IT Equipment';
  if (/furniture|featherlite|fixture/i.test(n)) return 'Furniture & Fixtures';
  if (/plant|machinery|factory equipment/i.test(n)) return 'Plant & Machinery';
  if (/vehicle|van|car|dzire|delivery/i.test(n)) return 'Motor Vehicles';
  if (/office.*rent|factory.*rent|shop.*rent|rent.*paid|rent.*premises/i.test(n)) return 'Rent';
  if (/electricity|power|energy/i.test(n)) return 'Power & Fuel';
  if (/salary|wage|basic.*salary|gross.*salary|net.*salary|hra|conveyance|special allowance/i.test(n)) return 'Salary & Wages';
  if (/pf.*remit|epfo|esi.*remit|esic|provident fund.*employer|esi.*employer/i.test(n)) return 'PF & ESI Contribution';
  if (/pf.*deduct|esi.*deduct|professional tax.*deduct/i.test(n)) return 'Salary Deductions Payable';
  if (/gratuity/i.test(n)) return 'Gratuity';
  if (/bonus.*paid|diwali.*bonus|performance.*bonus/i.test(n)) return 'Bonus';
  if (/leave.*encashment/i.test(n)) return 'Leave Encashment';
  if (/overtime/i.test(n)) return 'Overtime Wages';
  if (/director.*remuneration|sitting fee/i.test(n)) return 'Director Remuneration';
  if (/staff.*welfare|tea|snack|meal|uniform/i.test(n)) return 'Staff Welfare';
  if (/group.*insurance|medical.*insurance|keyman.*insurance/i.test(n)) return 'Staff Insurance';
  if (/insurance.*premium|fire.*insurance|stock.*insurance/i.test(n)) return 'Insurance';
  if (/depreciation/i.test(n)) return 'Depreciation';
  if (/amortisation/i.test(n)) return 'Amortisation';
  if (/raw material|purchase.*material/i.test(n)) return 'Raw Materials';
  if (/purchase.*invoice|purchase.*supplier|cash.*purchase/i.test(n)) return 'Purchases';
  if (/purchase.*return|defective.*return/i.test(n)) return 'Purchase Returns';
  if (/freight.*inward|carriage.*inward|transport.*inward/i.test(n)) return 'Freight Inward';
  if (/freight.*outward|shipping|export.*freight/i.test(n)) return 'Freight Outward';
  if (/advertisement|digital.*marketing|newspaper.*ad/i.test(n)) return 'Advertisement';
  if (/legal.*fee|advocate|consultancy.*fee/i.test(n)) return 'Legal & Professional Fees';
  if (/repair|maintenance/i.test(n)) return 'Repairs & Maintenance';
  if (/interest.*loan|interest.*term|bank.*interest|interest.*overdraft|loan.*interest|interest.*borrowing/i.test(n)) return 'Interest on Borrowings';
  if (/processing.*fee|loan.*processing/i.test(n)) return 'Loan Processing Fees';
  if (/bank.*charge|neft.*charge|rtgs.*charge/i.test(n)) return 'Bank Charges';
  if (/telephone|internet|broadband/i.test(n)) return 'Telephone & Internet';
  if (/postage|courier/i.test(n)) return 'Postage & Courier';
  if (/office.*maintenance|cleaning/i.test(n)) return 'Office Maintenance';
  if (/travel|conveyance|local.*travel|outstation/i.test(n)) return 'Travelling Expenses';
  if (/fuel.*expense|petrol|diesel/i.test(n)) return 'Vehicle Fuel';
  if (/vehicle.*maintenance|vehicle.*service/i.test(n)) return 'Vehicle Maintenance';
  if (/sales.*promotion|free.*sample/i.test(n)) return 'Sales Promotion';
  if (/software.*subscription|microsoft|domain|hosting/i.test(n)) return 'Software & Subscriptions';
  if (/books|periodical|newspaper.*subscription/i.test(n)) return 'Books & Periodicals';
  if (/training|development|staff.*training/i.test(n)) return 'Training & Development';
  if (/membership|subscription.*fee|trade.*association/i.test(n)) return 'Membership & Subscriptions';
  if (/donation|pm.*relief|csr/i.test(n)) return 'Donations & CSR';
  if (/research|development.*expense|r&d/i.test(n)) return 'Research & Development';
  if (/miscellaneous.*expense|petty.*item|sundry.*expense/i.test(n)) return 'Sundry Expenses';
  if (/prior.*period/i.test(n)) return 'Prior Period Expenses';
  if (/deferred.*revenue.*expenditure/i.test(n)) return 'Deferred Revenue Expenditure';
  if (/security.*service|housekeeping|sub.*contract|civil.*work|contractor/i.test(n)) return 'Contract & Service Charges';
  if (/generator|diesel.*generator/i.test(n)) return 'Generator Maintenance';
  if (/water.*charge|municipality.*water/i.test(n)) return 'Water Charges';
  if (/customs.*duty|import.*duty/i.test(n)) return 'Customs Duty';

  // --- Tax patterns ---
  if (/tds.*deducted|tds.*u\/s|tds.*remit|tds.*challan/i.test(n)) return 'TDS Payable';
  if (/tds.*receivable|26as|tds.*on.*our/i.test(n)) return 'TDS Receivable';
  if (/tcs.*collected|tcs.*remit/i.test(n)) return 'TCS Payable';
  if (/advance.*tax|self.*assessment.*tax/i.test(n)) return 'Advance Tax';
  if (/income.*tax.*provision|tax.*provision|income.*tax.*paid/i.test(n)) return 'Income Tax';
  if (/deferred.*tax.*asset/i.test(n)) return 'Deferred Tax Asset';
  if (/deferred.*tax.*liability/i.test(n)) return 'Deferred Tax Liability';
  if (/mat.*credit/i.test(n)) return 'MAT Credit';
  if (/penalty|interest.*234|late.*fee/i.test(n)) return 'Penalty & Interest on Tax';
  if (/professional.*tax.*remit|professional.*tax.*paid/i.test(n)) return 'Professional Tax';

  // --- GST patterns ---
  if (/input.*cgst|cgst.*input|cgst.*claimed/i.test(n)) return 'Input CGST';
  if (/input.*sgst|sgst.*input|sgst.*claimed/i.test(n)) return 'Input SGST';
  if (/input.*igst|igst.*input|igst.*import/i.test(n)) return 'Input IGST';
  if (/output.*cgst|cgst.*output|cgst.*on.*sales/i.test(n)) return 'Output CGST';
  if (/output.*sgst|sgst.*output|sgst.*on.*sales/i.test(n)) return 'Output SGST';
  if (/output.*igst|igst.*output|igst.*on.*interstate/i.test(n)) return 'Output IGST';
  if (/gst.*paid|gst.*payable|gstr.*3b|pmt.*06|gst.*net/i.test(n)) return 'GST Payable';
  if (/gst.*refund/i.test(n)) return 'GST Refund Receivable';
  if (/rcm.*gst|reverse.*charge/i.test(n)) return 'RCM – GST Payable';
  if (/itc.*reversal|blocked.*credit/i.test(n)) return 'ITC Reversal';
  if (/gst.*late.*fee|gst.*interest|gst.*demand/i.test(n)) return 'GST Penalty & Interest';
  if (/composition.*scheme/i.test(n)) return 'Composition Tax';
  if (/e-way.*bill|e-invoice|hsn.*summary/i.test(n)) return oldName; // system entry, keep as-is

  // --- Banking patterns ---
  if (/fixed.*deposit|fd.*created|fd.*matured/i.test(n)) return 'Fixed Deposit';
  if (/overdraft|od.*availed|od.*repaid|cash.*credit/i.test(n)) return 'Bank OD / Cash Credit';
  if (/cheque.*deposited|cheque.*cleared/i.test(n)) return 'Cheque Clearing';
  if (/cheque.*dishonoured|cheque.*bounced/i.test(n)) return 'Cheque Dishonoured';
  if (/locker.*rent/i.test(n)) return 'Locker Rent';
  if (/demand.*draft/i.test(n)) return 'Demand Draft';

  // --- Loan patterns ---
  if (/term.*loan.*sanctioned|term.*loan.*disburs|term.*loan.*received/i.test(n)) return 'Term Loan';
  if (/term.*loan.*emi|emi.*paid/i.test(n)) return 'Term Loan EMI';
  if (/unsecured.*loan.*from|director.*loan.*received/i.test(n)) return 'Unsecured Loan from Director';
  if (/unsecured.*loan.*repaid|director.*loan.*repaid/i.test(n)) return 'Unsecured Loan from Director';
  if (/vehicle.*loan/i.test(n)) return 'Vehicle Loan';

  // --- Investment patterns ---
  if (/equity.*share.*purchased|shares.*purchased/i.test(n)) return 'Equity Investments';
  if (/equity.*share.*sold|shares.*sold/i.test(n)) return 'Equity Investments';
  if (/mutual.*fund.*purchased|sip/i.test(n)) return 'Mutual Fund Investments';
  if (/mutual.*fund.*redeem/i.test(n)) return 'Mutual Fund Investments';
  if (/government.*bond|bond.*purchased/i.test(n)) return 'Government Bonds';
  if (/debenture.*issued/i.test(n)) return 'Debentures';
  if (/debenture.*interest|debenture.*redemption/i.test(n)) return 'Debenture Interest / DRR';

  // --- Capital / Reserve patterns ---
  if (/general.*reserve/i.test(n)) return 'General Reserve';
  if (/capital.*reserve/i.test(n)) return 'Capital Reserve';
  if (/securities.*premium/i.test(n)) return 'Securities Premium';
  if (/dividend.*declared|dividend.*paid|interim.*dividend/i.test(n)) return 'Dividend Payable';
  if (/net.*profit.*transferred|retained.*earning/i.test(n)) return 'Retained Earnings';
  if (/proprietor.*personal|proprietor.*withdraw|drawings/i.test(n)) return 'Drawings';

  // --- Asset sale / disposal patterns ---
  if (/loss.*scrap|loss.*disposal|loss.*write.*off/i.test(n)) return 'Loss on Disposal of Assets';
  if (/impairment.*loss/i.test(n)) return 'Impairment Loss';
  if (/revaluation.*reserve|revaluation.*land/i.test(n)) return 'Revaluation Reserve';
  if (/cwip|capital.*work.*in.*progress|advance.*contractor/i.test(n)) return 'Capital Work-in-Progress';
  if (/leasehold.*improvement|interior.*work/i.test(n)) return 'Leasehold Improvements';
  if (/right.*of.*use|rou.*asset|lease.*liability/i.test(n)) return 'Right-of-Use Asset';
  if (/lease.*payment|lease.*interest|lease.*expense/i.test(n)) return 'Lease Payments';
  if (/goodwill/i.test(n)) return 'Goodwill';
  if (/patent|trademark/i.test(n)) return 'Patents & Trademarks';
  if (/software.*licence|tally/i.test(n)) return 'Computer Software';

  // --- Creditor patterns ---
  if (/creditor.*paid|supplier.*paid|creditor.*settlement/i.test(n)) return 'Trade Payables';
  if (/advance.*supplier|advance.*vendor/i.test(n)) return 'Advance to Suppliers';
  if (/creditor.*written.*back|no.*claim/i.test(n)) return 'Creditor Balance Written Back';

  // --- Debtor patterns ---
  if (/bad.*debt.*written.*off|irrecoverable/i.test(n)) return 'Bad Debts';
  if (/provision.*bad.*debt|provision.*doubtful/i.test(n)) return 'Provision for Bad Debts';
  if (/factoring|factor.*proceed/i.test(n)) return 'Factoring Charges';
  if (/bills.*receivable/i.test(n)) return 'Bills Receivable';
  if (/bills.*payable/i.test(n)) return 'Bills Payable';

  // --- Sales patterns ---
  if (/sales.*invoice.*raised|credit.*sales|cash.*sales/i.test(n)) return 'Sales';
  if (/export.*sales|zero.*rated/i.test(n)) return 'Export Sales';
  if (/service.*revenue|it.*service|consultancy.*fee.*received/i.test(n)) return 'Service Revenue';
  if (/sales.*return|goods.*returned.*by/i.test(n)) return 'Sales Returns';
  if (/credit.*note.*issued|short.*delivery/i.test(n)) return 'Credit Note – Sales';
  if (/trade.*discount.*allowed/i.test(n)) return 'Discount Allowed';
  if (/cash.*discount.*allowed/i.test(n)) return 'Discount Allowed';
  if (/advance.*from.*customer|advance.*received/i.test(n)) return 'Advance from Customers';

  // --- Inventory patterns ---
  if (/raw.*material.*issued|issued.*to.*production/i.test(n)) return 'Raw Materials Issued';
  if (/work.*in.*progress|wip/i.test(n)) return 'Work-in-Progress';
  if (/finished.*goods.*completed|transferred.*from.*wip/i.test(n)) return 'Finished Goods';
  if (/closing.*stock.*raw/i.test(n)) return 'Closing Stock – Raw Materials';
  if (/closing.*stock.*wip/i.test(n)) return 'Closing Stock – WIP';
  if (/closing.*stock.*finished/i.test(n)) return 'Closing Stock – Finished Goods';
  if (/opening.*stock/i.test(n)) return 'Opening Stock';
  if (/stock.*write.*off|damaged.*goods/i.test(n)) return 'Stock Write-off';
  if (/stock.*shortage/i.test(n)) return 'Stock Shortage';
  if (/inventory.*excess|stock.*surplus/i.test(n)) return 'Stock Surplus';
  if (/nrv|write.*down.*inventory/i.test(n)) return 'Inventory Write-down';
  if (/goods.*in.*transit|git/i.test(n)) return 'Goods-in-Transit';
  if (/consignment/i.test(n)) return 'Consignment Stock';
  if (/packing.*material/i.test(n)) return 'Packing Materials';
  if (/stores.*spare/i.test(n)) return 'Stores & Spares';

  // --- Payroll patterns ---
  if (/full.*final.*settlement|f&f|resigned.*employee/i.test(n)) return 'Full & Final Settlement';
  if (/employee.*loan|loan.*recovery|salary.*advance/i.test(n)) return 'Employee Advances';
  if (/maternity.*benefit|paternity.*leave/i.test(n)) return 'Employee Benefits';
  if (/labour.*welfare|lwf/i.test(n)) return 'Labour Welfare Fund';
  if (/reimbursement|internet.*allowance|lta|medical.*reimbursement/i.test(n)) return 'Employee Reimbursements';
  if (/increment|arrears/i.test(n)) return 'Salary Arrears';
  if (/vpf|voluntary.*pf|edli|pension.*contribution/i.test(n)) return 'PF & Pension Contributions';

  // --- Compliance / licence ---
  if (/shops.*establishment|factory.*licence|pollution.*control|clra|iso.*certification|bis.*licence|fssai|dgft|trademark.*renewal|patent.*annuity|roc.*filing|din.*kyc|nsic|legal.*metrology|fire.*noc/i.test(n)) return 'Licence & Compliance Fees';

  // --- Winding up ---
  if (/liquidator|winding.*up/i.test(n)) return 'Liquidation Expenses';
  if (/realisation.*account/i.test(n)) return 'Realisation Account';

  // --- Petty cash ---
  if (/petty.*cash.*fund|imprest/i.test(n)) return 'Petty Cash';
  if (/petty.*cash.*tea|petty.*cash.*courier|petty.*cash.*newspaper|petty.*cash.*cleaning|petty.*cash.*auto|petty.*cash.*stamps|petty.*cash.*repair|petty.*cash.*replenish/i.test(n)) return 'Petty Cash Expenses';

  // --- Fallback: just keep it (better than a sub-group) ---
  return oldName;
}

export interface MigrationResult {
  updated: number;
  scanned: number;
  sampleFixes: string[];
}

export async function migrateOldLedgerNames(onProgress?: (done: number, total: number) => void): Promise<MigrationResult> {
  const companies = listCompanies();
  let updated = 0;
  let scanned = 0;
  const sampleFixes: string[] = [];

  let totalEntries = 0;
  const allEntries: Array<{ companyId: string; entries: ReturnType<typeof listJournalEntries> }> = [];
  for (const company of companies) {
    const entries = listJournalEntries(company.id);
    allEntries.push({ companyId: company.id, entries });
    totalEntries += entries.length;
  }

  for (const { companyId, entries } of allEntries) {
    for (const entry of entries) {
      scanned++;
      let changed = false;
      const narration = entry.narration || '';

      const newLines = entry.lines.map(line => {
        const name = line.account_name;

        if (!SUB_GROUP_SET.has(name)) return line;

        const betterName = ledgerNameFromNarration(narration, name);
        if (betterName === name) return line;

        changed = true;
        if (sampleFixes.length < 20) {
          sampleFixes.push(`"${name}" → "${betterName}" (${entry.entry_code}: ${narration.slice(0, 60)})`);
        }
        return { ...line, account_name: betterName };
      });

      if (changed) {
        updateJournalEntry(entry.id, { lines: newLines });
        updated++;
      }

      if (onProgress && scanned % 100 === 0) {
        onProgress(scanned, totalEntries);
        await new Promise<void>(r => setTimeout(r, 0));
      }
    }
    invalidateEntriesCache(companyId);
  }

  if (onProgress) onProgress(scanned, totalEntries);
  return { updated, scanned, sampleFixes };
}
