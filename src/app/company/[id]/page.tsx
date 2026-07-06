import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Scale, TrendingUp, TrendingDown, Building2, Calculator,
  Receipt, Wallet, ArrowRight, ShieldCheck, FileText,
  Users, Package, ArrowRightLeft,
} from 'lucide-react';
import { QuickOpen } from '@/components/company/QuickOpen';
import { useCompany } from '@/hooks/useCompany';
import { useEntityConfig } from '@/hooks/useEntityConfig';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { ENTITY_TYPES, type EntityType } from '@/lib/constants/entityTypes';
import { computeAllBalances } from '@/lib/accounting/computeEngine';
import { computeTradingAccount } from '@/lib/accounting/tradingAccountCompute';
import { computeProfitLoss } from '@/lib/accounting/profitLossCompute';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { getCurrentFY } from '@/lib/utils/dateUtils';

function shortINR(num: number): string {
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)} Cr`;
  if (abs >= 1_00_000)    return `${sign}₹${(abs / 1_00_000).toFixed(2)} L`;
  if (abs >= 1_000)       return `${sign}₹${(abs / 1_000).toFixed(1)} K`;
  return `${sign}₹${abs.toFixed(0)}`;
}

export default function CompanyOverviewPage() {
  const { company, companyId, loading } = useCompany();
  const { config } = useEntityConfig();
  const fy = getCurrentFY();

  const { entries, loading: entriesLoading } = useJournalEntries({
    companyId: companyId || '',
    fromDate: fy.start,
    toDate: fy.end,
    enabled: !!companyId,
  });

  const balances    = useMemo(() => computeAllBalances(entries), [entries]);
  const trading     = useMemo(() => computeTradingAccount(entries), [entries]);
  const pl          = useMemo(() => computeProfitLoss(entries, trading.grossProfit), [entries, trading.grossProfit]);

  const cashBalance = useMemo(() => {
    const cashAndBank = balances.filter(b =>
      b.account_group === 'cash_and_bank' ||
      b.account_name.toLowerCase().includes('cash') ||
      b.account_name.toLowerCase().includes('bank')
    );
    return cashAndBank.reduce((sum, b) =>
      sum + (b.balance_type === 'Dr' ? b.balance : -b.balance), 0
    );
  }, [balances]);

  const totalDebtors = useMemo(() =>
    balances
      .filter(b => b.nature === 'asset' && (
        b.account_name.toLowerCase().includes('debtor') ||
        b.account_name.toLowerCase().includes('receivable')
      ))
      .reduce((s, b) => s + b.balance, 0),
  [balances]);

  const totalCreditors = useMemo(() =>
    balances
      .filter(b => b.nature === 'liability' && (
        b.account_name.toLowerCase().includes('creditor') ||
        b.account_name.toLowerCase().includes('payable')
      ))
      .reduce((s, b) => s + b.balance, 0),
  [balances]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!company) {
    return <div className="text-center py-20 text-red-500 text-sm">Company not found</div>;
  }

  const entityMeta = ENTITY_TYPES[company.entity_type as EntityType];
  const netProfit  = pl.netProfit;
  const isProfit   = netProfit >= 0;

  return (
    <div className="space-y-5">

      {/* ── Company hero header ── */}
      <div className="hero p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full border border-white/10" />
        {/* subtle rising-graph motif */}
        <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full opacity-20" viewBox="0 0 600 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points="0,82 60,66 120,72 180,48 240,56 300,36 360,44 420,24 480,32 540,14 600,22"
            fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="relative flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3.5">
            <span className="icon-badge mt-1"><Building2 className="h-5 w-5" /></span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">{company.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <span className="px-2.5 py-0.5 bg-white/10 text-white rounded-full text-[11px] font-semibold border border-white/15">
                  {entityMeta?.label ?? company.entity_type}
                </span>
                <span className="px-2.5 py-0.5 bg-white/10 text-white rounded-full text-[11px] font-semibold border border-white/15">
                  {entityMeta?.itrForm}
                </span>
                <span className="px-2.5 py-0.5 bg-white/10 text-white rounded-full text-[11px] font-semibold border border-white/15">
                  {company.accounting_method === 'mercantile' ? 'Accrual' : 'Cash'} Basis
                </span>
                {company.gst_status !== 'unregistered' && (
                  <span className="px-2.5 py-0.5 bg-emerald-400/15 text-emerald-200 rounded-full text-[11px] font-semibold border border-emerald-300/25">
                    GST {company.gst_status === 'composition' ? 'Composition' : 'Regular'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Link
            to={`/company/${companyId}/settings`}
            className="btn-pill-outline relative text-white !h-9"
          >
            Settings
          </Link>
        </div>

        {/* Identity details */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-white/10">
          {company.entity_details?.pan && (
            <div>
              <p className="text-[10px] hero-muted uppercase tracking-wider mb-0.5">PAN</p>
              <p className="text-sm font-mono font-semibold text-white">{company.entity_details.pan}</p>
            </div>
          )}
          {company.gst_details?.gstin && (
            <div>
              <p className="text-[10px] hero-muted uppercase tracking-wider mb-0.5">GSTIN</p>
              <p className="text-sm font-mono font-semibold text-white">{company.gst_details.gstin}</p>
            </div>
          )}
          {(company.entity_details as any)?.cin && (
            <div>
              <p className="text-[10px] hero-muted uppercase tracking-wider mb-0.5">CIN</p>
              <p className="text-sm font-mono font-semibold text-white">{(company.entity_details as any).cin}</p>
            </div>
          )}
          {company.entity_details?.state && (
            <div>
              <p className="text-[10px] hero-muted uppercase tracking-wider mb-0.5">State</p>
              <p className="text-sm font-semibold text-white">{company.entity_details.state}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick open — type a shortcut (e.g. "tall", "bal") to open a page ── */}
      {companyId && <QuickOpen companyId={companyId} />}

      {/* ── Key metrics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Journal entries */}
        <div className="stat-premium" style={{ '--accent': '#2563EB' } as CSSProperties}>
          <span className="stat-premium-icon"><BookOpen className="h-5 w-5" /></span>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Journal Entries</p>
          <p className="text-[26px] leading-none font-extrabold text-gray-900 font-mono">
            {entriesLoading ? '—' : entries.length}
          </p>
          <p className="text-xs text-gray-400 mt-1.5">This FY</p>
        </div>

        {/* Cash & Bank */}
        <div className="stat-premium" style={{ '--accent': cashBalance < 0 ? '#DC2626' : '#0D9488' } as CSSProperties}>
          <span className="stat-premium-icon"><Wallet className="h-5 w-5" /></span>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Cash &amp; Bank</p>
          <p className={`text-[26px] leading-none font-extrabold font-mono ${cashBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {entriesLoading ? '—' : shortINR(cashBalance)}
          </p>
          <p className="text-xs text-gray-400 mt-1.5">Net balance</p>
        </div>

        {/* Net Profit / Loss */}
        <div className="stat-premium" style={{ '--accent': isProfit ? '#16A34A' : '#DC2626' } as CSSProperties}>
          <span className="stat-premium-icon">{isProfit ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}</span>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            {isProfit ? 'Net Profit' : 'Net Loss'}
          </p>
          <p className={`text-[26px] leading-none font-extrabold font-mono ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
            {entriesLoading ? '—' : shortINR(Math.abs(netProfit))}
          </p>
          <p className="text-xs text-gray-400 mt-1.5">This FY</p>
        </div>

        {/* Accounts */}
        <div className="stat-premium" style={{ '--accent': '#7C3AED' } as CSSProperties}>
          <span className="stat-premium-icon"><Scale className="h-5 w-5" /></span>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Active Accounts</p>
          <p className="text-[26px] leading-none font-extrabold text-gray-900 font-mono">
            {entriesLoading ? '—' : balances.length}
          </p>
          <p className="text-xs text-gray-400 mt-1.5">Ledger accounts</p>
        </div>
      </div>

      {/* ── Debtors / Creditors (only if non-zero) ── */}
      {(totalDebtors > 0 || totalCreditors > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-premium" style={{ '--accent': '#2563EB' } as CSSProperties}>
            <span className="stat-premium-icon"><Users className="h-5 w-5" /></span>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Debtors (Receivable)</p>
            <p className="text-[22px] leading-none font-extrabold text-blue-600 font-mono">{shortINR(totalDebtors)}</p>
          </div>
          <div className="stat-premium" style={{ '--accent': '#D97706' } as CSSProperties}>
            <span className="stat-premium-icon"><Receipt className="h-5 w-5" /></span>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Creditors (Payable)</p>
            <p className="text-[22px] leading-none font-extrabold text-amber-600 font-mono">{shortINR(totalCreditors)}</p>
          </div>
        </div>
      )}

    </div>
  );
}
