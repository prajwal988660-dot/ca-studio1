'use client';

import { useMemo, useState } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PageHeader } from '@/components/layout/PageHeader';
import { computeAllBalances } from '@/lib/accounting/computeEngine';
import { computeLedger } from '@/lib/accounting/ledgerCompute';
import { Landmark, Wallet } from 'lucide-react';

function inr(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** A ledger is a bank/cash account if its group or name says so. */
function isBankCash(group: string, name: string): boolean {
  const g = (group || '').toLowerCase();
  const n = (name || '').toLowerCase();
  return /bank|cash/.test(g) || n.includes('bank') || n.includes('cash');
}
const isBank = (group: string, name: string) => /bank/.test((group + ' ' + name).toLowerCase());

export default function BankAccountsPage() {
  const { company, companyId, loading } = useCompany();
  const { entries, loading: entriesLoading } = useJournalEntries({ companyId: companyId || '', enabled: !!companyId });
  const [selected, setSelected] = useState<string | null>(null);

  const accounts = useMemo(() => {
    return computeAllBalances(entries)
      .filter((b) => isBankCash(b.account_group, b.account_name))
      .map((b) => ({
        name: b.account_name,
        group: b.account_group,
        signed: b.balance_type === 'Dr' ? b.balance : -b.balance,
        isBank: isBank(b.account_group, b.account_name),
      }))
      .sort((a, b) => Math.abs(b.signed) - Math.abs(a.signed));
  }, [entries]);

  const totalBank = accounts.filter((a) => a.isBank).reduce((s, a) => s + a.signed, 0);
  const totalCash = accounts.filter((a) => !a.isBank).reduce((s, a) => s + a.signed, 0);

  const ledgerRows = useMemo(() => (selected ? computeLedger(entries, selected) : []), [entries, selected]);

  if (loading || entriesLoading || !company || !companyId) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Bank Accounts" description="Bank & cash ledgers with balances and transactions" />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Bank Balances</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-gray-900"><span className="text-sm text-gray-400">&#8377;</span>{inr(Math.abs(totalBank))} <span className="text-xs text-gray-400">{totalBank >= 0 ? 'Dr' : 'Cr'}</span></p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Cash in Hand</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-gray-900"><span className="text-sm text-gray-400">&#8377;</span>{inr(Math.abs(totalCash))} <span className="text-xs text-gray-400">{totalCash >= 0 ? 'Dr' : 'Cr'}</span></p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Accounts</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-gray-900">{accounts.length}</p>
        </div>
      </div>

      {/* Account list */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-2.5"><h3 className="text-sm font-bold text-gray-800">Bank &amp; Cash Accounts</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Account</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Type</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Balance</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-12 text-center text-gray-400">No bank or cash accounts found.</td></tr>
              ) : accounts.map((a) => (
                <tr key={a.name} onClick={() => setSelected(a.name)}
                  className={`cursor-pointer border-t border-gray-50 transition-colors ${selected === a.name ? 'bg-blue-50/60' : 'hover:bg-gray-50/60'}`}>
                  <td className="px-4 py-2.5 text-[11px] font-semibold text-gray-800">
                    <span className="inline-flex items-center gap-1.5">
                      {a.isBank ? <Landmark className="h-3.5 w-3.5 text-blue-500" /> : <Wallet className="h-3.5 w-3.5 text-emerald-500" />}
                      {a.name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[11px] text-gray-500">{a.isBank ? 'Bank' : 'Cash'}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-[11px] font-bold text-gray-900">{inr(Math.abs(a.signed))} {a.signed >= 0 ? 'Dr' : 'Cr'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected account bank book */}
      {selected && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <h3 className="text-sm font-bold text-gray-800">{selected} — Transactions</h3>
            <button onClick={() => setSelected(null)} className="text-[11px] font-bold text-gray-400 hover:text-gray-600">Close</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Particulars</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Voucher</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Deposit (Dr)</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Withdrawal (Cr)</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No transactions for this account.</td></tr>
                ) : ledgerRows.map((r, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/60">
                    <td className="px-4 py-2 font-mono text-[11px] text-gray-600">{r.date}</td>
                    <td className="px-4 py-2 text-[11px] text-gray-700 max-w-[260px] truncate">{r.particulars}</td>
                    <td className="px-4 py-2 text-[11px] text-gray-500">{r.voucher_type}</td>
                    <td className="px-4 py-2 text-right font-mono text-[11px] text-gray-700">{r.debit ? inr(r.debit) : '-'}</td>
                    <td className="px-4 py-2 text-right font-mono text-[11px] text-gray-700">{r.credit ? inr(r.credit) : '-'}</td>
                    <td className="px-4 py-2 text-right font-mono text-[11px] font-semibold text-gray-800">{inr(r.running_balance)} {r.balance_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
