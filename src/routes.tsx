import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Layouts
const CompanyLayout = lazy(() => import('@/app/company/[id]/layout').then(m => ({ default: m.default })));

// Top-level pages
const AuthPage = lazy(() => import('@/app/auth/page').then(m => ({ default: m.default })));
const CompaniesPage = lazy(() => import('@/app/companies/page').then(m => ({ default: m.default })));
const CreateCompanyPage = lazy(() => import('@/app/companies/create/page').then(m => ({ default: m.default })));
const MigrateLedgerNamesPage = lazy(() => import('@/app/dev/migrate-ledger-names/page').then(m => ({ default: m.default })));
const CoaAuditPage = lazy(() => import('./app/dev/coa-audit/page').then(m => ({ default: m.default })));
const NotFoundPage = lazy(() => import('@/app/not-found').then(m => ({ default: m.default })));

// Company pages
const CompanyOverviewPage = lazy(() => import('@/app/company/[id]/page').then(m => ({ default: m.default })));
const JournalPage = lazy(() => import('@/app/company/[id]/journal/page').then(m => ({ default: m.default })));
const CashBookPage = lazy(() => import('@/app/company/[id]/cash-book/page').then(m => ({ default: m.default })));

const TrialBalancePage = lazy(() => import('@/app/company/[id]/trial-balance/page').then(m => ({ default: m.default })));
const TradingAccountPage = lazy(() => import('@/app/company/[id]/trading-account/page').then(m => ({ default: m.default })));
const ProfitLossPage = lazy(() => import('@/app/company/[id]/profit-loss/page').then(m => ({ default: m.default })));
const PLAppropriationPage = lazy(() => import('@/app/company/[id]/pl-appropriation/page').then(m => ({ default: m.default })));
const BalanceSheetPage = lazy(() => import('@/app/company/[id]/balance-sheet/page').then(m => ({ default: m.default })));
const CashFlowPage = lazy(() => import('@/app/company/[id]/cash-flow/page').then(m => ({ default: m.default })));
const FundsFlowPage = lazy(() => import('@/app/company/[id]/funds-flow/page').then(m => ({ default: m.default })));
const IncomeExpenditurePage = lazy(() => import('@/app/company/[id]/income-expenditure/page').then(m => ({ default: m.default })));
const ReceiptsPaymentsPage = lazy(() => import('@/app/company/[id]/receipts-payments/page').then(m => ({ default: m.default })));
const LedgerPage = lazy(() => import('@/app/company/[id]/ledger/page').then(m => ({ default: m.default })));
const PurchaseRegisterPage = lazy(() => import('@/app/company/[id]/purchase-register/page').then(m => ({ default: m.default })));
const SalesRegisterPage = lazy(() => import('@/app/company/[id]/sales-register/page').then(m => ({ default: m.default })));
const PurchaseReturnsPage = lazy(() => import('@/app/company/[id]/purchase-returns/page').then(m => ({ default: m.default })));
const SalesReturnsPage = lazy(() => import('@/app/company/[id]/sales-returns/page').then(m => ({ default: m.default })));
const BillsReceivablePage = lazy(() => import('@/app/company/[id]/bills-receivable/page').then(m => ({ default: m.default })));
const BillsPayablePage = lazy(() => import('@/app/company/[id]/bills-payable/page').then(m => ({ default: m.default })));
const DebtorsPage = lazy(() => import('@/app/company/[id]/debtors/page').then(m => ({ default: m.default })));
const CreditorsPage = lazy(() => import('@/app/company/[id]/creditors/page').then(m => ({ default: m.default })));
const PartnersCapitalPage = lazy(() => import('@/app/company/[id]/partners-capital/page').then(m => ({ default: m.default })));
const RevaluationPage = lazy(() => import('@/app/company/[id]/revaluation/page').then(m => ({ default: m.default })));
const RealisationPage = lazy(() => import('@/app/company/[id]/realisation/page').then(m => ({ default: m.default })));
const ShareCapitalPage = lazy(() => import('@/app/company/[id]/share-capital/page').then(m => ({ default: m.default })));
const DebenturesPage = lazy(() => import('@/app/company/[id]/debentures/page').then(m => ({ default: m.default })));
const KartaCapitalPage = lazy(() => import('@/app/company/[id]/karta-capital/page').then(m => ({ default: m.default })));
const FundAccountsPage = lazy(() => import('@/app/company/[id]/fund-accounts/page').then(m => ({ default: m.default })));
const IncompleteRecordsPage = lazy(() => import('@/app/company/[id]/incomplete-records/page').then(m => ({ default: m.default })));
const MemberRegisterPage = lazy(() => import('@/app/company/[id]/member-register/page').then(m => ({ default: m.default })));
const FixedAssetsPage = lazy(() => import('@/app/company/[id]/fixed-assets/page').then(m => ({ default: m.default })));
const InvestmentsPage = lazy(() => import('@/app/company/[id]/investments/page').then(m => ({ default: m.default })));
const LoansPage = lazy(() => import('@/app/company/[id]/loans/page').then(m => ({ default: m.default })));
const DepreciationPage = lazy(() => import('@/app/company/[id]/depreciation/page').then(m => ({ default: m.default })));
const GstPage = lazy(() => import('@/app/company/[id]/gst/page').then(m => ({ default: m.default })));
const Gstr1Page = lazy(() => import('@/app/company/[id]/gst/gstr1/page').then(m => ({ default: m.default })));
const Gstr3bPage = lazy(() => import('@/app/company/[id]/gst/gstr3b/page').then(m => ({ default: m.default })));
const ItcRegisterPage = lazy(() => import('@/app/company/[id]/gst/itc-register/page').then(m => ({ default: m.default })));
const EwayBillPage = lazy(() => import('@/app/company/[id]/gst/eway-bill/page').then(m => ({ default: m.default })));
const IncomeTaxPage = lazy(() => import('@/app/company/[id]/income-tax/page').then(m => ({ default: m.default })));
const TdsRegisterPage = lazy(() => import('@/app/company/[id]/tds-register/page').then(m => ({ default: m.default })));
const TcsRegisterPage = lazy(() => import('@/app/company/[id]/tcs-register/page').then(m => ({ default: m.default })));
const AdvanceTaxPage = lazy(() => import('@/app/company/[id]/advance-tax/page').then(m => ({ default: m.default })));
const DeferredTaxPage = lazy(() => import('@/app/company/[id]/deferred-tax/page').then(m => ({ default: m.default })));
const BrsPage = lazy(() => import('@/app/company/[id]/brs/page').then(m => ({ default: m.default })));
const AuditPage = lazy(() => import('@/app/company/[id]/audit/page').then(m => ({ default: m.default })));
const FcraPage = lazy(() => import('@/app/company/[id]/fcra/page').then(m => ({ default: m.default })));
const ApplicationCheckPage = lazy(() => import('@/app/company/[id]/application-check/page').then(m => ({ default: m.default })));
const Form10bPage = lazy(() => import('@/app/company/[id]/form-10b/page').then(m => ({ default: m.default })));
const LlpFormsPage = lazy(() => import('@/app/company/[id]/llp-forms/page').then(m => ({ default: m.default })));
const SegmentReportingPage = lazy(() => import('@/app/company/[id]/segment-reporting/page').then(m => ({ default: m.default })));
const RelatedPartyPage = lazy(() => import('@/app/company/[id]/related-party/page').then(m => ({ default: m.default })));
const AccountingPoliciesPage = lazy(() => import('@/app/company/[id]/accounting-policies/page').then(m => ({ default: m.default })));
const AsChecklistPage = lazy(() => import('@/app/company/[id]/as-checklist/page').then(m => ({ default: m.default })));
const ContingentLiabilitiesPage = lazy(() => import('@/app/company/[id]/contingent-liabilities/page').then(m => ({ default: m.default })));
const DirectorsReportPage = lazy(() => import('@/app/company/[id]/directors-report/page').then(m => ({ default: m.default })));
const CAROPage = lazy(() => import('@/app/company/[id]/caro/page').then(m => ({ default: m.default })));
const CostRecordsPage = lazy(() => import('@/app/company/[id]/cost-records/page').then(m => ({ default: m.default })));
const FormNPage = lazy(() => import('@/app/company/[id]/form-n/page').then(m => ({ default: m.default })));
const InventoryPage = lazy(() => import('@/app/company/[id]/inventory/page').then(m => ({ default: m.default })));

const RatioAnalysisPage = lazy(() => import('@/app/company/[id]/ratio-analysis/page').then(m => ({ default: m.default })));
const BSNotesPage = lazy(() => import('@/app/company/[id]/bs-notes/page').then(m => ({ default: m.default })));

const BinCardPage = lazy(() => import('@/app/company/[id]/inventory/bin-card/page').then(m => ({ default: m.default })));
const StoresLedgerPage = lazy(() => import('@/app/company/[id]/inventory/stores-ledger/page').then(m => ({ default: m.default })));
const CostSheetPage = lazy(() => import('@/app/company/[id]/inventory/cost-sheet/page').then(m => ({ default: m.default })));
const PayrollPage = lazy(() => import('@/app/company/[id]/payroll/page').then(m => ({ default: m.default })));
const FoldersPage = lazy(() => import('@/app/company/[id]/folders/page').then(m => ({ default: m.default })));
const BulkWorkspacePage = lazy(() => import('@/app/company/[id]/bulk-workspace/page').then(m => ({ default: m.default })));
const BankImportPage = lazy(() => import('@/app/company/[id]/bank-import/page').then(m => ({ default: m.default })));
const TallyViewerPage = lazy(() => import('@/app/company/[id]/tally/page').then(m => ({ default: m.default })));
const BankAccountsPage = lazy(() => import('@/app/company/[id]/bank-accounts/page').then(m => ({ default: m.default })));
const SettingsPage = lazy(() => import('@/app/company/[id]/settings/page').then(m => ({ default: m.default })));

const PageLoader = () => (
  <div className="flex items-center justify-center py-20">
    <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

export const router = createBrowserRouter([
  { index: true, element: <Navigate to="/auth" replace /> },
  { path: '/auth', element: <Suspense fallback={<PageLoader />}><AuthPage /></Suspense> },
  { path: '/companies', element: <Suspense fallback={<PageLoader />}><CompaniesPage /></Suspense> },
  { path: '/companies/create', element: <Suspense fallback={<PageLoader />}><CreateCompanyPage /></Suspense> },
  { path: '/dev/migrate-ledger-names', element: <Suspense fallback={<PageLoader />}><MigrateLedgerNamesPage /></Suspense> },
  { path: '/dev/coa-audit', element: <Suspense fallback={<PageLoader />}><CoaAuditPage /></Suspense> },
  {
    path: '/company/:id',
    element: <Suspense fallback={<PageLoader />}><CompanyLayout /></Suspense>,
    children: [
      { index: true, element: <Suspense fallback={<PageLoader />}><CompanyOverviewPage /></Suspense> },
      { path: 'journal', element: <Suspense fallback={<PageLoader />}><JournalPage /></Suspense> },
      { path: 'cash-book', element: <Suspense fallback={<PageLoader />}><CashBookPage /></Suspense> },

      { path: 'trial-balance', element: <Suspense fallback={<PageLoader />}><TrialBalancePage /></Suspense> },
      { path: 'trading-account', element: <Suspense fallback={<PageLoader />}><TradingAccountPage /></Suspense> },
      { path: 'profit-loss', element: <Suspense fallback={<PageLoader />}><ProfitLossPage /></Suspense> },
      { path: 'pl-appropriation', element: <Suspense fallback={<PageLoader />}><PLAppropriationPage /></Suspense> },
      { path: 'balance-sheet', element: <Suspense fallback={<PageLoader />}><BalanceSheetPage /></Suspense> },
      { path: 'cash-flow', element: <Suspense fallback={<PageLoader />}><CashFlowPage /></Suspense> },
      { path: 'funds-flow', element: <Suspense fallback={<PageLoader />}><FundsFlowPage /></Suspense> },

      { path: 'ratio-analysis', element: <Suspense fallback={<PageLoader />}><RatioAnalysisPage /></Suspense> },
      { path: 'bs-notes', element: <Suspense fallback={<PageLoader />}><BSNotesPage /></Suspense> },
      { path: 'income-expenditure', element: <Suspense fallback={<PageLoader />}><IncomeExpenditurePage /></Suspense> },
      { path: 'receipts-payments', element: <Suspense fallback={<PageLoader />}><ReceiptsPaymentsPage /></Suspense> },
      { path: 'ledger', element: <Suspense fallback={<PageLoader />}><LedgerPage /></Suspense> },
      { path: 'purchase-register', element: <Suspense fallback={<PageLoader />}><PurchaseRegisterPage /></Suspense> },
      { path: 'sales-register', element: <Suspense fallback={<PageLoader />}><SalesRegisterPage /></Suspense> },
      { path: 'purchase-returns', element: <Suspense fallback={<PageLoader />}><PurchaseReturnsPage /></Suspense> },
      { path: 'sales-returns', element: <Suspense fallback={<PageLoader />}><SalesReturnsPage /></Suspense> },
      { path: 'bills-receivable', element: <Suspense fallback={<PageLoader />}><BillsReceivablePage /></Suspense> },
      { path: 'bills-payable', element: <Suspense fallback={<PageLoader />}><BillsPayablePage /></Suspense> },
      { path: 'debtors', element: <Suspense fallback={<PageLoader />}><DebtorsPage /></Suspense> },
      { path: 'creditors', element: <Suspense fallback={<PageLoader />}><CreditorsPage /></Suspense> },
      { path: 'partners-capital', element: <Suspense fallback={<PageLoader />}><PartnersCapitalPage /></Suspense> },
      { path: 'revaluation', element: <Suspense fallback={<PageLoader />}><RevaluationPage /></Suspense> },
      { path: 'realisation', element: <Suspense fallback={<PageLoader />}><RealisationPage /></Suspense> },
      { path: 'share-capital', element: <Suspense fallback={<PageLoader />}><ShareCapitalPage /></Suspense> },
      { path: 'debentures', element: <Suspense fallback={<PageLoader />}><DebenturesPage /></Suspense> },
      { path: 'karta-capital', element: <Suspense fallback={<PageLoader />}><KartaCapitalPage /></Suspense> },
      { path: 'fund-accounts', element: <Suspense fallback={<PageLoader />}><FundAccountsPage /></Suspense> },
      { path: 'incomplete-records', element: <Suspense fallback={<PageLoader />}><IncompleteRecordsPage /></Suspense> },
      { path: 'member-register', element: <Suspense fallback={<PageLoader />}><MemberRegisterPage /></Suspense> },
      { path: 'fixed-assets', element: <Suspense fallback={<PageLoader />}><FixedAssetsPage /></Suspense> },
      { path: 'investments', element: <Suspense fallback={<PageLoader />}><InvestmentsPage /></Suspense> },
      { path: 'loans', element: <Suspense fallback={<PageLoader />}><LoansPage /></Suspense> },
      { path: 'depreciation', element: <Suspense fallback={<PageLoader />}><DepreciationPage /></Suspense> },
      { path: 'gst', element: <Suspense fallback={<PageLoader />}><GstPage /></Suspense> },
      { path: 'gst/gstr1', element: <Suspense fallback={<PageLoader />}><Gstr1Page /></Suspense> },
      { path: 'gst/gstr3b', element: <Suspense fallback={<PageLoader />}><Gstr3bPage /></Suspense> },
      { path: 'gst/itc-register', element: <Suspense fallback={<PageLoader />}><ItcRegisterPage /></Suspense> },
      { path: 'gst/eway-bill', element: <Suspense fallback={<PageLoader />}><EwayBillPage /></Suspense> },
      { path: 'income-tax', element: <Suspense fallback={<PageLoader />}><IncomeTaxPage /></Suspense> },
      { path: 'tds-register', element: <Suspense fallback={<PageLoader />}><TdsRegisterPage /></Suspense> },
      { path: 'tcs-register', element: <Suspense fallback={<PageLoader />}><TcsRegisterPage /></Suspense> },
      { path: 'advance-tax', element: <Suspense fallback={<PageLoader />}><AdvanceTaxPage /></Suspense> },
      { path: 'deferred-tax', element: <Suspense fallback={<PageLoader />}><DeferredTaxPage /></Suspense> },

      { path: 'brs', element: <Suspense fallback={<PageLoader />}><BrsPage /></Suspense> },
      { path: 'audit', element: <Suspense fallback={<PageLoader />}><AuditPage /></Suspense> },
      { path: 'fcra', element: <Suspense fallback={<PageLoader />}><FcraPage /></Suspense> },
      { path: 'application-check', element: <Suspense fallback={<PageLoader />}><ApplicationCheckPage /></Suspense> },
      { path: 'form-10b', element: <Suspense fallback={<PageLoader />}><Form10bPage /></Suspense> },
      { path: 'llp-forms', element: <Suspense fallback={<PageLoader />}><LlpFormsPage /></Suspense> },
      { path: 'segment-reporting', element: <Suspense fallback={<PageLoader />}><SegmentReportingPage /></Suspense> },
      { path: 'related-party', element: <Suspense fallback={<PageLoader />}><RelatedPartyPage /></Suspense> },
      { path: 'accounting-policies', element: <Suspense fallback={<PageLoader />}><AccountingPoliciesPage /></Suspense> },
      { path: 'as-checklist', element: <Suspense fallback={<PageLoader />}><AsChecklistPage /></Suspense> },
      { path: 'contingent-liabilities', element: <Suspense fallback={<PageLoader />}><ContingentLiabilitiesPage /></Suspense> },
      { path: 'directors-report', element: <Suspense fallback={<PageLoader />}><DirectorsReportPage /></Suspense> },
      { path: 'caro', element: <Suspense fallback={<PageLoader />}><CAROPage /></Suspense> },
      { path: 'cost-records', element: <Suspense fallback={<PageLoader />}><CostRecordsPage /></Suspense> },
      { path: 'form-n', element: <Suspense fallback={<PageLoader />}><FormNPage /></Suspense> },
      { path: 'inventory', element: <Suspense fallback={<PageLoader />}><InventoryPage /></Suspense> },
      { path: 'inventory/bin-card', element: <Suspense fallback={<PageLoader />}><BinCardPage /></Suspense> },
      { path: 'inventory/stores-ledger', element: <Suspense fallback={<PageLoader />}><StoresLedgerPage /></Suspense> },
      { path: 'inventory/cost-sheet', element: <Suspense fallback={<PageLoader />}><CostSheetPage /></Suspense> },
      { path: 'payroll', element: <Suspense fallback={<PageLoader />}><PayrollPage /></Suspense> },
      { path: 'folders', element: <Suspense fallback={<PageLoader />}><FoldersPage /></Suspense> },
      { path: 'bulk-workspace', element: <Suspense fallback={<PageLoader />}><BulkWorkspacePage /></Suspense> },
      { path: 'bank-import', element: <Suspense fallback={<PageLoader />}><BankImportPage /></Suspense> },
      { path: 'tally', element: <Suspense fallback={<PageLoader />}><TallyViewerPage /></Suspense> },
      { path: 'bank-accounts', element: <Suspense fallback={<PageLoader />}><BankAccountsPage /></Suspense> },
      { path: 'settings', element: <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense> },
      { path: 'ai', element: <Navigate to=".." replace /> },
    ],
  },
  { path: '*', element: <Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense> },
]);
