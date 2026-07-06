import { useState, useMemo, useCallback } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import {
  computeInventoryFromRegisters,
  issueToProduction,
  type InventoryMovement,
  type MovementType,
} from '@/lib/accounting/inventoryEngine';

const MOVEMENT_LABELS: Record<MovementType, string> = {
  INWARD: 'Purchase In',
  OUTWARD: 'Sales Out',
  RETURN_IN: 'Sales Return In',
  RETURN_OUT: 'Purchase Return Out',
  ISSUE_PRODUCTION: 'Issued to Production',
};

const MOVEMENT_COLORS: Record<MovementType, string> = {
  INWARD: 'bg-emerald-50 text-emerald-700',
  OUTWARD: 'bg-red-50 text-red-700',
  RETURN_IN: 'bg-blue-50 text-blue-700',
  RETURN_OUT: 'bg-amber-50 text-amber-700',
  ISSUE_PRODUCTION: 'bg-purple-50 text-purple-700',
};

function inr(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InventoryPage() {
  const { company, companyId, loading: companyLoading } = useCompany();
  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Issue to Production form state
  const [issueItemName, setIssueItemName] = useState('');
  const [issueItemHsn, setIssueItemHsn] = useState('');
  const [issueQty, setIssueQty] = useState('');
  const [issueRate, setIssueRate] = useState('');
  const [issueNarration, setIssueNarration] = useState('');

  const summary = useMemo(() => {
    if (!companyId) return null;
    return computeInventoryFromRegisters(companyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, tick]);

  const handleIssue = useCallback(() => {
    if (!companyId || !issueItemName.trim() || !issueQty || Number(issueQty) <= 0) return;
    issueToProduction(
      companyId,
      issueItemName.trim(),
      issueItemHsn.trim(),
      Number(issueQty),
      Number(issueRate || 0),
      issueNarration.trim()
    );
    setShowIssueModal(false);
    setIssueItemName('');
    setIssueItemHsn('');
    setIssueQty('');
    setIssueRate('');
    setIssueNarration('');
    setTick(t => t + 1);
  }, [companyId, issueItemName, issueItemHsn, issueQty, issueRate, issueNarration]);

  if (companyLoading || !company || !companyId) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!summary) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const filteredMovements = selectedItem
    ? summary.movements.filter(m => m.itemName.toLowerCase().trim() === selectedItem)
    : summary.movements;

  return (
    <div className="space-y-4">
      <PageHeader title="Inventory" description="Stock tracker — Inward, Outward, Production, Returns">
        <button
          onClick={() => setShowIssueModal(true)}
          className="inline-flex items-center gap-1 h-8 px-3 text-xs font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          + Issue to Production
        </button>
      </PageHeader>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Total Inward</p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-emerald-800">₹{inr(summary.totalInwardValue)}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">Total Outward</p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-red-800">₹{inr(summary.totalOutwardValue)}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Sales Returns In</p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-blue-800">₹{inr(summary.totalReturnInValue)}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Purchase Returns Out</p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-amber-800">₹{inr(summary.totalReturnOutValue)}</p>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600">In Production</p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-purple-800">₹{inr(summary.totalIssuedValue)}</p>
        </div>
        <div className="rounded-xl border border-gray-300 bg-gray-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Net Stock</p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-gray-900">₹{inr(summary.totalNetStockValue)}</p>
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
        {(['stock', 'movements'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'stock' ? 'Stock Levels' : 'Movement Log'}
          </button>
        ))}
      </div>

      {/* ── Stock Levels Tab ── */}
      {activeTab === 'stock' && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <h3 className="text-sm font-bold text-gray-800">Stock Items</h3>
            <span className="text-[11px] text-gray-400">{summary.items.length} items</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Item</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">HSN</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">In (Qty)</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">In (₹)</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Out (Qty)</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Out (₹)</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">In Prod.</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-emerald-600">Net Qty</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-emerald-600">Net Value</th>
                </tr>
              </thead>
              <tbody>
                {summary.items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-xs text-gray-400">
                      No items in inventory. Purchase goods through the Purchase Register to populate.
                    </td>
                  </tr>
                ) : (
                  summary.items.map(item => (
                    <tr
                      key={item.itemName}
                      onClick={() => {
                        setSelectedItem(item.itemName.toLowerCase().trim());
                        setActiveTab('movements');
                      }}
                      className="border-t border-gray-50 hover:bg-gray-50/60 cursor-pointer"
                    >
                      <td className="px-4 py-2.5 text-[11px] font-medium text-gray-800">{item.itemName}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-gray-500">{item.itemHsn || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[11px] text-emerald-700">{item.totalInwardQty + item.totalReturnInQty}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[11px] text-emerald-700">{inr(item.totalInwardValue + item.totalReturnInValue)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[11px] text-red-600">{item.totalOutwardQty + item.totalReturnOutQty}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[11px] text-red-600">{inr(item.totalOutwardValue + item.totalReturnOutValue)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[11px] text-purple-600">{item.totalIssuedQty}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[11px] font-bold text-gray-900">{item.netStockQty}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[11px] font-bold text-gray-900">{inr(item.netStockValue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Movement Log Tab ── */}
      {activeTab === 'movements' && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-800">Movement Log</h3>
              {selectedItem && (
                <button
                  onClick={() => setSelectedItem(null)}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-100"
                >
                  {selectedItem} ✕
                </button>
              )}
            </div>
            <span className="text-[11px] text-gray-400">{filteredMovements.length} movements</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Type</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Item</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Qty</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Rate</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Value</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Party / Ref</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-xs text-gray-400">
                      No movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((mv, i) => (
                    <tr key={`${mv.id}-${i}`} className="border-t border-gray-50 hover:bg-gray-50/60">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-gray-600">{mv.date}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${MOVEMENT_COLORS[mv.type]}`}>
                          {MOVEMENT_LABELS[mv.type]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[11px] font-medium text-gray-800 max-w-[200px] truncate">{mv.itemName}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[11px] font-semibold text-gray-900">{mv.qty}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[11px] text-gray-600">{inr(mv.rate)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[11px] font-bold text-gray-900">{inr(mv.value)}</td>
                      <td className="px-4 py-2.5 text-[11px] text-gray-500 max-w-[200px] truncate">{mv.partyName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Issue to Production Modal ── */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <span className="text-sm font-semibold text-gray-800">Issue to Production</span>
              <button onClick={() => setShowIssueModal(false)} className="rounded-md p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-3">
              <label>
                <span className="mb-1 block text-[11px] font-semibold text-gray-500">Item Name *</span>
                <select
                  value={issueItemName}
                  onChange={(e) => {
                    setIssueItemName(e.target.value);
                    const item = summary.items.find(i => i.itemName === e.target.value);
                    if (item) {
                      setIssueItemHsn(item.itemHsn);
                      if (item.totalInwardQty > 0) {
                        setIssueRate(String((item.totalInwardValue / item.totalInwardQty).toFixed(2)));
                      }
                    }
                  }}
                  className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm"
                >
                  <option value="">Select item from inventory...</option>
                  {summary.items.filter(i => i.netStockQty > 0).map(item => (
                    <option key={item.itemName} value={item.itemName}>
                      {item.itemName} (Stock: {item.netStockQty})
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="mb-1 block text-[11px] font-semibold text-gray-500">Quantity *</span>
                  <input type="number" value={issueQty} onChange={(e) => setIssueQty(e.target.value)} className="h-9 w-full rounded-lg border border-gray-300 px-3 font-mono text-sm text-right" min={1} />
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-semibold text-gray-500">Rate (₹)</span>
                  <input type="number" value={issueRate} onChange={(e) => setIssueRate(e.target.value)} className="h-9 w-full rounded-lg border border-gray-300 px-3 font-mono text-sm text-right" />
                </label>
              </div>
              <label>
                <span className="mb-1 block text-[11px] font-semibold text-gray-500">Narration</span>
                <input value={issueNarration} onChange={(e) => setIssueNarration(e.target.value)} className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm" placeholder="e.g. Issued for Batch #42" />
              </label>
              <button
                onClick={handleIssue}
                disabled={!issueItemName.trim() || !issueQty || Number(issueQty) <= 0}
                className="w-full h-9 rounded-lg bg-purple-600 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Issue to Production
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
