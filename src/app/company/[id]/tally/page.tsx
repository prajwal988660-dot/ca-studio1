'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { PageHeader } from '@/components/layout/PageHeader';
import { toast } from 'sonner';
import { Upload, FileText, Scale, Building2, TrendingUp, BookOpen, RefreshCw } from 'lucide-react';
import {
  parseTallyJson,
  decodeTallyText,
  mergeTallyDatasets,
  saveTallyDataset,
  loadTallyDataset,
  clearTallyDataset,
  computeTallyTrialBalance,
  computeTallyBalanceSheet,
  computeTallyProfitLoss,
  computeTallyLedger,
  type TallyDataset,
} from '@/lib/tally/tallyParser';

function inr(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type ReportKey = 'balance-sheet' | 'profit-loss' | 'trial-balance' | 'ledgers';
const REPORTS: { key: ReportKey; label: string; icon: typeof Scale }[] = [
  { key: 'balance-sheet', label: 'Balance Sheet', icon: Building2 },
  { key: 'profit-loss', label: 'Profit & Loss', icon: TrendingUp },
  { key: 'trial-balance', label: 'Trial Balance', icon: Scale },
  { key: 'ledgers', label: 'Ledgers', icon: BookOpen },
];

export default function TallyViewerPage() {
  const { company, companyId, loading } = useCompany();
  const fileRef = useRef<HTMLInputElement>(null);
  const [ds, setDs] = useState<TallyDataset | null>(null);
  const [report, setReport] = useState<ReportKey>('balance-sheet');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedLedger, setSelectedLedger] = useState('');
  const [importing, setImporting] = useState(false);

  // Load any previously imported dataset for this company.
  useEffect(() => {
    if (!companyId) return;
    const existing = loadTallyDataset(companyId);
    if (existing) {
      setDs(existing);
      setFromDate(existing.minDate);
      setToDate(existing.maxDate);
    }
  }, [companyId]);

  const handleFiles = async (files: FileList) => {
    if (!companyId || !files.length) return;
    setImporting(true);
    try {
      let merged: TallyDataset | null = null;
      for (const file of Array.from(files)) {
        const lower = file.name.toLowerCase();
        const isJson = file.type === 'application/json' || lower.endsWith('.json');
        if (!isJson) {
          throw new Error(`"${file.name}" is not a JSON file. Only Tally JSON exports can be imported — in Tally, Export → File Format → JSON.`);
        }
        const parsed = parseTallyJson(decodeTallyText(await file.arrayBuffer()), file.name);
        merged = merged ? mergeTallyDatasets(merged, parsed) : parsed;
      }
      if (!merged || (!merged.ledgers.length && !merged.vouchers.length)) {
        throw new Error('No ledgers or vouchers found — is this a Tally XML export?');
      }
      const stored = saveTallyDataset(companyId, merged);
      setDs(merged);
      setFromDate(merged.minDate);
      setToDate(merged.maxDate);
      setSelectedLedger('');
      toast.success(
        `Imported ${merged.ledgers.length} ledgers, ${merged.vouchers.length} vouchers` +
          (stored ? '' : ' (too large to save — kept for this session only)'),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to import Tally file');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const reImport = () => fileRef.current?.click();
  const handleClear = () => {
    if (!companyId) return;
    clearTallyDataset(companyId);
    setDs(null);
    setSelectedLedger('');
  };

  const trialBalance = useMemo(() => (ds ? computeTallyTrialBalance(ds, toDate) : null), [ds, toDate]);
  const balanceSheet = useMemo(() => (ds ? computeTallyBalanceSheet(ds, toDate) : null), [ds, toDate]);
  const profitLoss = useMemo(() => (ds ? computeTallyProfitLoss(ds, fromDate, toDate) : null), [ds, fromDate, toDate]);
  const ledgerNames = useMemo(() => (ds ? ds.ledgers.map((l) => l.name).sort((a, b) => a.localeCompare(b)) : []), [ds]);
  const ledgerReport = useMemo(
    () => (ds && selectedLedger ? computeTallyLedger(ds, selectedLedger, fromDate, toDate) : null),
    [ds, selectedLedger, fromDate, toDate],
  );

  if (loading || !company || !companyId) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Tally" description="Import a Tally JSON export and view its Balance Sheet, P&L, Trial Balance and Ledgers">
        {ds && (
          <button
            onClick={reImport}
            className="inline-flex items-center gap-2 h-9 px-3.5 text-xs font-bold border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5 text-gray-500" /> Re-import
          </button>
        )}
      </PageHeader>

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        multiple
        className="hidden"
        onChange={(e) => { const fs = e.target.files; if (fs && fs.length) handleFiles(fs); }}
      />

      {/* ── Empty state / import ── */}
      {!ds ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <FileText className="h-7 w-7 text-blue-600" />
          </div>
          <h2 className="text-base font-bold text-gray-900">Import a Tally JSON file</h2>
          <p className="mx-auto mt-1.5 max-w-lg text-xs leading-relaxed text-gray-500">
            Accepts Tally <span className="font-semibold">JSON</span> exports only (in Tally: Export → <span className="font-semibold">File Format → JSON</span>).
            For full reports select <span className="font-semibold">both</span> the
            <span className="font-semibold"> List of Accounts</span> (masters) and the <span className="font-semibold">Day Book</span> (all dates) together.
          </p>
          <p className="mx-auto mt-2 max-w-lg text-[11px] leading-relaxed text-amber-600">
            Note: XML and PDF are not accepted here — export to <b>JSON</b> from inside Tally. A Tally <b>company data folder</b> (the <code className="rounded bg-amber-50 px-1">.1800</code> / <code className="rounded bg-amber-50 px-1">.TSF</code> files, or a zip of them) cannot be read either — those are Tally's binary database.
          </p>
          <button
            onClick={reImport}
            disabled={importing}
            className="mx-auto mt-5 inline-flex items-center gap-2 h-11 px-6 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {importing ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing…</> : <><Upload className="h-4 w-4" /> Import Tally JSON</>}
          </button>
        </div>
      ) : (
        <>
          {/* ── Import summary ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50"><FileText className="h-4 w-4 text-blue-600" /></div>
              <div>
                <p className="text-sm font-bold text-gray-800">{ds.fileName}</p>
                <p className="text-[11px] text-gray-500">
                  {ds.ledgers.length} ledgers · {ds.vouchers.length} vouchers · {ds.minDate || '—'} to {ds.maxDate || '—'}
                </p>
              </div>
            </div>
            <button onClick={handleClear} className="text-[11px] font-bold text-red-500 hover:text-red-600 hover:underline">Remove import</button>
          </div>

          {/* ── Period + report selector ── */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">From</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                  className="h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">To</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                  className="h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <p className="text-[11px] text-gray-400 pb-2">Balance Sheet &amp; Trial Balance are shown <b>as at To</b>; P&amp;L &amp; Ledger use the full range.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {REPORTS.map((r) => {
                const active = report === r.key;
                return (
                  <button
                    key={r.key}
                    onClick={() => setReport(r.key)}
                    className={`inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs font-bold border transition-colors ${
                      active ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <r.icon className="h-3.5 w-3.5" /> {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Report output ── */}
          {report === 'trial-balance' && trialBalance && (
            <ReportCard title={`Trial Balance — as at ${toDate || ds.maxDate}`}>
              <table className="w-full min-w-[520px] text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Ledger</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Debit (₹)</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {trialBalance.rows.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-10 text-center text-gray-400">No balances in this period.</td></tr>
                  ) : trialBalance.rows.map((r) => (
                    <tr key={r.name} className="border-t border-gray-50 hover:bg-gray-50/60">
                      <td className="px-4 py-2 text-[11px] font-medium text-gray-800">{r.name}</td>
                      <td className="px-4 py-2 text-right font-mono text-[11px] text-gray-700">{r.debit ? inr(r.debit) : '-'}</td>
                      <td className="px-4 py-2 text-right font-mono text-[11px] text-gray-700">{r.credit ? inr(r.credit) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                    <td className="px-4 py-2.5 text-[11px] text-gray-800">Total</td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] text-gray-900">{inr(trialBalance.totalDebit)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] text-gray-900">{inr(trialBalance.totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
              <p className={`px-4 py-2 text-[11px] font-semibold ${Math.abs(trialBalance.totalDebit - trialBalance.totalCredit) < 1 ? 'text-emerald-600' : 'text-red-600'}`}>
                {Math.abs(trialBalance.totalDebit - trialBalance.totalCredit) < 1 ? '✓ Debit and Credit tally.' : `⚠ Difference: ₹${inr(Math.abs(trialBalance.totalDebit - trialBalance.totalCredit))}`}
              </p>
            </ReportCard>
          )}

          {report === 'profit-loss' && profitLoss && (
            <ReportCard title={`Profit & Loss — ${fromDate || ds.minDate} to ${toDate || ds.maxDate}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-gray-100">
                <TwoColList heading="Expenses" lines={profitLoss.expenses} total={profitLoss.totalExpense}
                  tail={profitLoss.netProfit >= 0 ? { label: 'Net Profit', value: profitLoss.netProfit } : undefined} />
                <TwoColList heading="Income" lines={profitLoss.income} total={profitLoss.totalIncome}
                  tail={profitLoss.netProfit < 0 ? { label: 'Net Loss', value: -profitLoss.netProfit } : undefined} />
              </div>
              <p className={`px-4 py-2.5 border-t border-gray-100 text-xs font-bold ${profitLoss.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {profitLoss.netProfit >= 0 ? `Net Profit: ₹${inr(profitLoss.netProfit)}` : `Net Loss: ₹${inr(-profitLoss.netProfit)}`}
              </p>
            </ReportCard>
          )}

          {report === 'balance-sheet' && balanceSheet && (
            <ReportCard title={`Balance Sheet — as at ${toDate || ds.maxDate}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-gray-100">
                <TwoColList heading="Liabilities" lines={balanceSheet.liabilities} total={balanceSheet.totalLiabilities} />
                <TwoColList heading="Assets" lines={balanceSheet.assets} total={balanceSheet.totalAssets} />
              </div>
              <p className={`px-4 py-2.5 border-t border-gray-100 text-[11px] font-semibold ${balanceSheet.balanced ? 'text-emerald-600' : 'text-amber-600'}`}>
                {balanceSheet.balanced ? '✓ Balance Sheet tallies.' : `⚠ Assets and Liabilities differ by ₹${inr(Math.abs(balanceSheet.totalAssets - balanceSheet.totalLiabilities))} (check group classification / completeness of the export).`}
              </p>
            </ReportCard>
          )}

          {report === 'ledgers' && (
            <ReportCard title="Ledger">
              <div className="px-4 py-3 border-b border-gray-100">
                <select
                  value={selectedLedger}
                  onChange={(e) => setSelectedLedger(e.target.value)}
                  className="h-9 w-full max-w-sm px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Select a ledger…</option>
                  {ledgerNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              {!ledgerReport ? (
                <p className="px-4 py-10 text-center text-xs text-gray-400">Choose a ledger to view its statement.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/80">
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Voucher</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Particulars</th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Debit</th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Credit</th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-gray-50 bg-gray-50/40">
                        <td className="px-4 py-2 text-[11px] text-gray-500" colSpan={5}>Opening Balance</td>
                        <td className="px-4 py-2 text-right font-mono text-[11px] font-semibold text-gray-700">
                          {inr(Math.abs(ledgerReport.opening))} {ledgerReport.opening >= 0 ? 'Dr' : 'Cr'}
                        </td>
                      </tr>
                      {ledgerReport.transactions.map((t, i) => (
                        <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/60">
                          <td className="px-4 py-2 font-mono text-[11px] text-gray-600">{t.date}</td>
                          <td className="px-4 py-2 text-[11px] text-gray-600">{t.type}{t.number ? ` #${t.number}` : ''}</td>
                          <td className="px-4 py-2 text-[11px] text-gray-500 max-w-[220px] truncate">{t.narration || '-'}</td>
                          <td className="px-4 py-2 text-right font-mono text-[11px] text-gray-700">{t.debit ? inr(t.debit) : '-'}</td>
                          <td className="px-4 py-2 text-right font-mono text-[11px] text-gray-700">{t.credit ? inr(t.credit) : '-'}</td>
                          <td className="px-4 py-2 text-right font-mono text-[11px] text-gray-700">{inr(Math.abs(t.running))} {t.running >= 0 ? 'Dr' : 'Cr'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                        <td className="px-4 py-2.5 text-[11px] text-gray-800" colSpan={5}>Closing Balance</td>
                        <td className="px-4 py-2.5 text-right font-mono text-[11px] text-gray-900">
                          {inr(Math.abs(ledgerReport.closing))} {ledgerReport.closing >= 0 ? 'Dr' : 'Cr'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </ReportCard>
          )}
        </>
      )}
    </div>
  );
}

function ReportCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-2.5">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function TwoColList({
  heading, lines, total, tail,
}: { heading: string; lines: { name: string; amount: number }[]; total: number; tail?: { label: string; value: number } }) {
  const grand = total + (tail ? tail.value : 0);
  return (
    <div>
      <div className="px-4 py-2 bg-gray-50/60 border-b border-gray-100">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{heading}</span>
      </div>
      <table className="w-full text-xs">
        <tbody>
          {lines.length === 0 && !tail ? (
            <tr><td className="px-4 py-6 text-center text-gray-400">—</td></tr>
          ) : (
            <>
              {lines.map((l) => (
                <tr key={l.name} className="border-b border-gray-50">
                  <td className="px-4 py-2 text-[11px] text-gray-700">{l.name}</td>
                  <td className="px-4 py-2 text-right font-mono text-[11px] text-gray-700">{inr(l.amount)}</td>
                </tr>
              ))}
              {tail && (
                <tr className="border-b border-gray-50">
                  <td className="px-4 py-2 text-[11px] font-semibold text-gray-800">{tail.label}</td>
                  <td className="px-4 py-2 text-right font-mono text-[11px] font-semibold text-gray-800">{inr(tail.value)}</td>
                </tr>
              )}
            </>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
            <td className="px-4 py-2.5 text-[11px] text-gray-800">Total</td>
            <td className="px-4 py-2.5 text-right font-mono text-[11px] text-gray-900">{inr(grand)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
