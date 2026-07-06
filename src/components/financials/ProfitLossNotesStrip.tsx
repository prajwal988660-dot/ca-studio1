'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight, MoveRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import type { LedgerBreakdown } from '@/lib/accounting/profitLossCompute';

interface ProfitLossNotesStripProps {
  companyId: string;
  companyName: string;
  entityLabel: string;
  period: string;
  visible: boolean;
  revenueFromOperations: number;
  revenueBreakdown?: LedgerBreakdown[];
  otherIncomeBreakdown?: LedgerBreakdown[];
  costOfMaterialsBreakdown?: LedgerBreakdown[];
  changesInInventoriesBreakdown?: LedgerBreakdown[];
  employeeBenefitsBreakdown?: LedgerBreakdown[];
  financeCostsBreakdown?: LedgerBreakdown[];
  depreciationBreakdown?: LedgerBreakdown[];
  otherExpensesBreakdown?: LedgerBreakdown[];
}

interface NoteConfig {
  no: number;
  title: string;
  type: 'income' | 'expense';
}

const INCOME_NOTES: NoteConfig[] = [
  { no: 1, title: 'Revenue from Operations', type: 'income' },
  { no: 2, title: 'Other Income', type: 'income' },
];

const EXPENSE_NOTES: NoteConfig[] = [
  { no: 3, title: 'Cost of Materials Consumed', type: 'expense' },
  { no: 4, title: 'Changes in Inventories', type: 'expense' },
  { no: 5, title: 'Employee Benefits Expense', type: 'expense' },
  { no: 6, title: 'Finance Costs', type: 'expense' },
  { no: 7, title: 'Depreciation & Amortisation', type: 'expense' },
  { no: 8, title: 'Other Expenses', type: 'expense' },
];

function fmtAmt(n: number) {
  return n < 0
    ? `(${formatIndianCurrency(Math.abs(n))})`
    : formatIndianCurrency(n);
}

interface NoteRowProps {
  note: NoteConfig;
  data: { rows: LedgerBreakdown[]; total: number; totalLabel: string };
  isOpen: boolean;
  onToggle: () => void;
  companyId: string;
  onNavigate: (name: string) => void;
}

function NoteRow({ note, data, isOpen, onToggle, companyId, onNavigate }: NoteRowProps) {
  const isIncome = note.type === 'income';

  return (
    <div>
      {/* Note header row */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors border-l-2 ${
          isOpen
            ? isIncome
              ? 'border-emerald-400 bg-emerald-50/30'
              : 'border-blue-400 bg-blue-50/20'
            : 'border-transparent hover:border-gray-200 hover:bg-gray-50/50'
        }`}
      >
        {/* Note number badge */}
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shrink-0 transition-colors ${
            isOpen
              ? isIncome
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {note.no}
        </span>

        {/* Title */}
        <span className={`flex-1 text-[13px] font-medium transition-colors ${isOpen ? 'text-gray-900' : 'text-gray-600'}`}>
          {note.title}
        </span>

        {/* Total */}
        <span className={`font-mono text-[13px] tabular-nums mr-2 font-semibold transition-colors ${
          isOpen
            ? isIncome ? 'text-emerald-700' : 'text-blue-700'
            : 'text-gray-700'
        }`}>
          {fmtAmt(data.total)}
        </span>

        {/* Chevron */}
        {isOpen
          ? <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-colors ${isIncome ? 'text-emerald-400' : 'text-blue-400'}`} />
          : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
        }
      </button>

      {/* Expanded breakdown table */}
      {isOpen && (
        <div className={`mx-5 mb-4 rounded-xl overflow-hidden border ${isIncome ? 'border-emerald-100' : 'border-blue-100'}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${isIncome ? 'border-emerald-100 bg-emerald-50/60' : 'border-blue-100 bg-blue-50/40'}`}>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Particulars
                </th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-44">
                  Current Year (₹)
                </th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-40">
                  Previous Year (₹)
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-[12px] text-gray-400">
                    No accounts posted under this head yet.
                  </td>
                </tr>
              ) : (
                data.rows.map((r, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100/80 group hover:bg-white/70 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => onNavigate(r.name)}
                        className="text-blue-600 hover:text-blue-800 text-left font-medium flex items-center gap-1.5 group-hover:underline text-[13px]"
                      >
                        {r.name}
                        <MoveRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[13px] tabular-nums text-gray-800">
                      {fmtAmt(r.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[13px] tabular-nums text-gray-400">—</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className={`border-t-2 ${isIncome ? 'border-emerald-200 bg-emerald-50/40' : 'border-blue-200 bg-blue-50/30'}`}>
                <td className="px-4 py-3 font-semibold text-gray-900 text-[13px]">{data.totalLabel}</td>
                <td className={`px-4 py-3 text-right font-mono font-bold text-[13px] tabular-nums ${isIncome ? 'text-emerald-800' : 'text-blue-800'}`}>
                  {fmtAmt(data.total)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums text-gray-400">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export function ProfitLossNotesStrip(props: ProfitLossNotesStripProps) {
  const navigate = useNavigate();
  const [openNotes, setOpenNotes] = React.useState<Set<number>>(new Set());

  if (!props.visible) return null;

  const toggleNote = (no: number) => {
    setOpenNotes(prev => {
      const next = new Set(prev);
      if (next.has(no)) next.delete(no);
      else next.add(no);
      return next;
    });
  };

  const handleNavigate = (accountName: string) => {
    navigate(`/company/${props.companyId}/ledger?account=${encodeURIComponent(accountName)}&view=running`);
  };

  function getBreakdown(no: number): { rows: LedgerBreakdown[]; total: number; totalLabel: string } {
    switch (no) {
      case 1: return {
        rows: props.revenueBreakdown ?? [],
        total: props.revenueFromOperations,
        totalLabel: 'Revenue from Operations (Net)',
      };
      case 2: {
        const r = props.otherIncomeBreakdown ?? [];
        return { rows: r, total: r.reduce((s, x) => s + x.amount, 0), totalLabel: 'Total Other Income' };
      }
      case 3: {
        const r = props.costOfMaterialsBreakdown ?? [];
        return { rows: r, total: r.reduce((s, x) => s + x.amount, 0), totalLabel: 'Total Cost of Materials Consumed' };
      }
      case 4: {
        const r = props.changesInInventoriesBreakdown ?? [];
        return { rows: r, total: r.reduce((s, x) => s + x.amount, 0), totalLabel: 'Net Change in Inventories' };
      }
      case 5: {
        const r = props.employeeBenefitsBreakdown ?? [];
        return { rows: r, total: r.reduce((s, x) => s + x.amount, 0), totalLabel: 'Total Employee Benefits Expense' };
      }
      case 6: {
        const r = props.financeCostsBreakdown ?? [];
        return { rows: r, total: r.reduce((s, x) => s + x.amount, 0), totalLabel: 'Total Finance Costs' };
      }
      case 7: {
        const r = props.depreciationBreakdown ?? [];
        return { rows: r, total: r.reduce((s, x) => s + x.amount, 0), totalLabel: 'Depreciation & Amortisation' };
      }
      case 8: {
        const r = props.otherExpensesBreakdown ?? [];
        return { rows: r, total: r.reduce((s, x) => s + x.amount, 0), totalLabel: 'Total Other Expenses' };
      }
      default: return { rows: [], total: 0, totalLabel: '' };
    }
  }

  const renderGroup = (notes: NoteConfig[], label: string, colorClass: string, textClass: string) => (
    <div>
      {/* Group label */}
      <div className={`px-5 py-2 ${colorClass} border-b border-gray-100`}>
        <span className={`text-[10px] font-bold uppercase tracking-widest ${textClass}`}>{label}</span>
      </div>
      {notes.map((note, i) => (
        <div key={note.no} className={i < notes.length - 1 ? 'border-b border-gray-100' : ''}>
          <NoteRow
            note={note}
            data={getBreakdown(note.no)}
            isOpen={openNotes.has(note.no)}
            onToggle={() => toggleNote(note.no)}
            companyId={props.companyId}
            onNavigate={handleNavigate}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="mt-8 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 bg-gray-50/60">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Annexure</p>
          <h3 className="text-sm font-bold text-gray-900 mt-0.5">Notes to the Statement of Profit and Loss</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">{props.companyName} · {props.period}</p>
        </div>
        <div className="flex gap-1 mt-1">
          <button
            type="button"
            onClick={() => setOpenNotes(new Set([1, 2, 3, 4, 5, 6, 7, 8]))}
            className="h-6 px-2.5 text-[10px] font-semibold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => setOpenNotes(new Set())}
            className="h-6 px-2.5 text-[10px] font-semibold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Collapse
          </button>
        </div>
      </div>

      {/* Income notes */}
      {renderGroup(INCOME_NOTES, 'Income', 'bg-emerald-50/60', 'text-emerald-700')}

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Expense notes */}
      {renderGroup(EXPENSE_NOTES, 'Expenses', 'bg-blue-50/40', 'text-blue-700')}

      {/* Footer hint */}
      <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/40">
        <p className="text-[10px] text-gray-400">Click any account name to open its running ledger.</p>
      </div>
    </div>
  );
}
