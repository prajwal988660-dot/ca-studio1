'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { AccountComboBox } from '@/components/entries/AccountComboBox';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import { listBookPeriods } from '@/lib/offlineDb';
import { parseBankStatement } from '@/lib/bankImport/csvParser';
import { groupByPayee } from '@/lib/bankImport/groupingEngine';
import { saveBatch, getPendingTransactions, listBatches, updateNarration, deleteBatch } from '@/lib/bankImport/bankImportDb';
import { journalizeTransactions } from '@/lib/bankImport/journalizer';
import type { BankTransaction, PaymentMode } from '@/lib/bankImport/types';
import type { VoucherType } from '@/types/journal';
import type { PrimaryGroup, JournalNature } from '@/lib/coa';
import {
  Upload, ChevronDown, ChevronRight, Check, CheckSquare, Square,
  FileUp, AlertCircle, Loader2, Trash2, Info, X, Download, FileSpreadsheet,
  HelpCircle, Lock,
} from 'lucide-react';

type Stage = 'upload' | 'review' | 'transferring';

// ── Payment mode badge colors ─────────────────────────────────────────────────

const MODE_COLORS: Record<PaymentMode, string> = {
  UPI: 'bg-purple-100 text-purple-700',
  NEFT: 'bg-blue-100 text-blue-700',
  IMPS: 'bg-cyan-100 text-cyan-700',
  RTGS: 'bg-indigo-100 text-indigo-700',
  ATM: 'bg-orange-100 text-orange-700',
  POS: 'bg-pink-100 text-pink-700',
  CHQ: 'bg-yellow-100 text-yellow-700',
  CASH: 'bg-green-100 text-green-700',
  OTHER: 'bg-gray-100 text-gray-600',
};

// ── How to Import Modal ───────────────────────────────────────────────────────

function HowToImportModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-bold text-gray-900">How to Import Your Bank Statement</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Direct upload note */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-blue-900 mb-1">📂 Direct Upload — Works for most banks</p>
            <p className="text-sm text-blue-800 leading-relaxed">
              Our software recognises <strong>every type of Excel / CSV bank statement</strong> automatically.
              Simply download your statement from net banking and upload it directly — no changes needed!
            </p>
            <p className="text-sm text-blue-700 mt-2 leading-relaxed">
              Even if the file has extra bank details at the top or footnotes at the bottom —
              <strong> that&apos;s fine, we auto-detect and skip them.</strong>
            </p>
          </div>

          {/* Cleanup steps */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              If your file is not being accepted, clean it up:
            </p>
            <ol className="space-y-2.5">
              {[
                { n: 1, text: <><strong>Remove top rows</strong> — bank name, branch, address, account number, etc. that appear before the transaction table.</> },
                { n: 2, text: <><strong>Row 1 must be the column header</strong> row — Date, Description/Particulars, Debit, Credit, Balance, etc.</> },
                { n: 3, text: <><strong>Remove footer rows</strong> — closing balance summaries, disclaimers, or bank notes at the bottom.</> },
                { n: 4, text: <>Save and upload — only the transaction rows should remain below the header row.</> },
              ].map(({ n, text }) => (
                <li key={n} className="flex gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{n}</span>
                  <span className="text-sm text-gray-700">{text}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Sample downloads */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Still not working? Use one of our sample templates:
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="/sample-bank-statement-1.csv"
                download="CA-Studio-Sample-Bank-Statement.csv"
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 font-medium transition-colors shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                Sample Format 1 (.csv)
              </a>
              <a
                href="/sample-bank-statement-2.xls"
                download="CA-Studio-Sample-Bank-Statement.xls"
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 font-medium transition-colors shadow-sm"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Sample Format 2 (.xls)
              </a>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Fill in your transactions following the same column structure, then upload.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Upload Zone ───────────────────────────────────────────────────────────────

function UploadZone({ onFile }: { onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
        dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
      }`}
    >
      <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
      <p className="text-sm font-medium text-gray-700">Drop bank statement file here, or click to browse</p>
      <p className="text-xs text-gray-400 mt-1">.csv, .xlsx, .xls</p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }}
      />
    </div>
  );
}

// ── Transaction Row ───────────────────────────────────────────────────────────

function TransactionRow({
  txn,
  selected,
  onToggle,
  onNarrationChange,
}: {
  txn: BankTransaction;
  selected: boolean;
  onToggle: () => void;
  onNarrationChange: (val: string) => void;
}) {
  const isDebit = txn.debit > 0;
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 text-sm">
      <button onClick={onToggle} className="shrink-0">
        {selected
          ? <CheckSquare className="h-4 w-4 text-blue-600" />
          : <Square className="h-4 w-4 text-gray-300" />
        }
      </button>
      <span className="w-24 shrink-0 text-gray-500 font-mono text-xs">{txn.date}</span>
      <input
        value={txn.narration_clean}
        onChange={(e) => onNarrationChange(e.target.value)}
        className="flex-1 min-w-0 text-xs border border-transparent hover:border-gray-200 focus:border-blue-400 rounded px-1.5 py-0.5 focus:outline-none truncate"
        title={txn.narration_raw}
      />
      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${MODE_COLORS[txn.payment_mode]}`}>
        {txn.payment_mode}
      </span>
      <span className={`w-28 text-right font-mono text-xs shrink-0 ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
        {isDebit ? `-${formatIndianCurrency(txn.debit)}` : formatIndianCurrency(txn.credit)}
      </span>
    </div>
  );
}

// ── Payee Group Card ──────────────────────────────────────────────────────────

function PayeeGroupCard({
  payee,
  transactions,
  totalDebit,
  totalCredit,
  count,
  selectedIds,
  onToggle,
  onToggleAll,
  onNarrationChange,
}: {
  payee: string;
  transactions: BankTransaction[];
  totalDebit: number;
  totalCredit: number;
  count: number;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (txnIds: string[], select: boolean) => void;
  onNarrationChange: (txnId: string, val: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const allSelected = transactions.length > 0 && transactions.every((t) => selectedIds.has(t.id));
  const someSelected = transactions.some((t) => selectedIds.has(t.id));

  return (
    <div className="border border-gray-200 rounded-lg mb-2 overflow-hidden">
      {/* Group header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 cursor-pointer hover:bg-gray-100"
        onClick={() => setExpanded(!expanded)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            const ids = transactions.map((t) => t.id);
            onToggleAll(ids, !allSelected);
          }}
          className="shrink-0"
        >
          {allSelected
            ? <CheckSquare className="h-4 w-4 text-blue-600" />
            : someSelected
              ? <CheckSquare className="h-4 w-4 text-blue-300" />
              : <Square className="h-4 w-4 text-gray-300" />
          }
        </button>
        {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        <span className="font-medium text-sm text-gray-800 truncate flex-1">{payee}</span>
        <span className="text-xs text-gray-500 bg-gray-200 rounded-full px-2 py-0.5 shrink-0">{count}</span>
        {totalDebit > 0 && (
          <span className="text-xs font-mono text-red-600 shrink-0">-{formatIndianCurrency(totalDebit)}</span>
        )}
        {totalCredit > 0 && (
          <span className="text-xs font-mono text-green-600 shrink-0">+{formatIndianCurrency(totalCredit)}</span>
        )}
      </div>

      {/* Expanded transactions */}
      {expanded && (
        <div className="bg-white">
          {transactions.map((txn) => (
            <TransactionRow
              key={txn.id}
              txn={txn}
              selected={selectedIds.has(txn.id)}
              onToggle={() => onToggle(txn.id)}
              onNarrationChange={(val) => onNarrationChange(txn.id, val)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Progress Overlay ──────────────────────────────────────────────────────────

function ProgressOverlay({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 text-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-800">Creating journal entries...</p>
        <p className="text-lg font-bold text-blue-700 mt-1">{done} / {total}</p>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
          <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BankImportPage() {
  const { company, companyId } = useCompany();
  const [showHowTo, setShowHowTo] = useState(false);

  // Stage
  const [stage, setStage] = useState<Stage>('upload');

  // Upload state
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountMeta, setBankAccountMeta] = useState<{ primaryGroup: string; subGroup: string; nature: string } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Review state
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Contra account for bulk transfer
  const [contraName, setContraName] = useState('');
  const [contraMeta, setContraMeta] = useState<{ primaryGroup: string; subGroup: string; nature: string } | null>(null);
  const [voucherType, setVoucherType] = useState<VoucherType>('JRN');

  // Transfer state
  const [transferDone, setTransferDone] = useState(0);
  const [transferTotal, setTransferTotal] = useState(0);
  const [transferResult, setTransferResult] = useState<{ created: number; errors: string[] } | null>(null);

  // Batch management
  const batches = useMemo(() => companyId ? listBatches(companyId) : [], [companyId, transactions]);

  // Load existing transactions when moving to review
  const loadTransactions = useCallback(() => {
    if (!companyId) return;
    const all = getPendingTransactions(companyId);
    setTransactions(all);
    if (all.length > 0) {
      const dates = all.map((t) => t.date).sort();
      setFromDate(dates[0]);
      setToDate(dates[dates.length - 1]);
    }
  }, [companyId]);

  // ── Handle file upload ──────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    if (!companyId || !bankAccountName.trim()) {
      setUploadError('Please select a bank account first.');
      return;
    }
    setUploadError(null);
    setImporting(true);
    try {
      const { batch, transactions: parsed } = await parseBankStatement(file, companyId, bankAccountName);
      saveBatch(batch, parsed);
      setTransactions((prev) => [...prev, ...parsed]);
      if (parsed.length > 0) {
        const dates = parsed.map((t) => t.date).sort();
        setFromDate((f) => !f || dates[0] < f ? dates[0] : f);
        setToDate((t) => !t || dates[dates.length - 1] > t ? dates[dates.length - 1] : t);
      }
      setStage('review');
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Failed to parse file.');
    } finally {
      setImporting(false);
    }
  }, [companyId, bankAccountName]);

  // ── Filtered & grouped transactions ─────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = transactions;
    if (fromDate) list = list.filter((t) => t.date >= fromDate);
    if (toDate) list = list.filter((t) => t.date <= toDate);
    return list;
  }, [transactions, fromDate, toDate]);

  const groups = useMemo(() => groupByPayee(filtered), [filtered]);

  const stats = useMemo(() => {
    let totalDr = 0;
    let totalCr = 0;
    for (const t of filtered) { totalDr += t.debit; totalCr += t.credit; }
    return { pending: filtered.length, totalDr, totalCr };
  }, [filtered]);

  const selectedCount = selectedIds.size;

  // ── Selection handlers ──────────────────────────────────────────────────────

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((ids: string[], select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (select) ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  // ── Narration edit handler ──────────────────────────────────────────────────

  const handleNarrationChange = useCallback((txnId: string, val: string) => {
    updateNarration(txnId, val);
    setTransactions((prev) => prev.map((t) => t.id === txnId ? { ...t, narration_clean: val } : t));
  }, []);

  // ── Transfer to Books ───────────────────────────────────────────────────────

  const handleTransfer = useCallback(async () => {
    if (!companyId || !contraName.trim() || !contraMeta || !bankAccountMeta) return;

    const selected = transactions.filter((t) => selectedIds.has(t.id));
    if (selected.length === 0) return;

    const periods = listBookPeriods(companyId);
    const bookPeriod = periods.length > 0 ? periods[periods.length - 1].period_label : 'FY 2024-25';

    setStage('transferring');
    setTransferDone(0);
    setTransferTotal(selected.length);
    setTransferResult(null);

    const result = await journalizeTransactions(
      {
        transactions: selected,
        companyId,
        bankAccountName,
        bankAccountMeta: bankAccountMeta,
        contraAccountName: contraName,
        contraAccountMeta: contraMeta,
        voucherType,
        bookPeriod,
      },
      (done, total) => { setTransferDone(done); setTransferTotal(total); },
    );

    setTransferResult(result);
    // Reload transactions from storage to get updated journalized flags
    const updated = getPendingTransactions(companyId);
    setTransactions(updated);
    setSelectedIds(new Set());
    setStage('review');
  }, [companyId, selectedIds, transactions, contraName, contraMeta, bankAccountName, bankAccountMeta, voucherType]);

  // ── Delete batch ────────────────────────────────────────────────────────────

  const handleDeleteBatch = useCallback((batchId: string) => {
    deleteBatch(batchId);
    if (companyId) {
      const updated = getPendingTransactions(companyId);
      setTransactions(updated);
    }
  }, [companyId]);

  // ── Load existing on mount if we have data ─────────────────────────────────

  const initialized = useRef(false);
  if (!initialized.current && companyId) {
    initialized.current = true;
    const existing = getPendingTransactions(companyId);
    if (existing.length > 0) {
      setTransactions(existing);
      const dates = existing.map((t) => t.date).sort();
      setFromDate(dates[0]);
      setToDate(dates[dates.length - 1]);
      setStage('review');
    }
  }

  if (!company || !companyId) return null;

  return (
    <div className="p-4 max-w-5xl">
      {/* How to import modal */}
      {showHowTo && <HowToImportModal onClose={() => setShowHowTo(false)} />}

      {/* Page header with "How to import?" button top-right */}
      <div className="flex items-start justify-between mb-4">
        <PageHeader title="Bank Statement Import" description="Import bank CSV/Excel, review by payee, and transfer to journal.">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider">PRO</span>
        </PageHeader>
        <button
          onClick={() => setShowHowTo(true)}
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors mt-1"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          How to import?
        </button>
      </div>

      {/* Lock overlay wrapper — shows UI but blocks all interaction */}
      <div className="relative">
        {/* Lock badge */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm pointer-events-none">
          <Lock className="h-3.5 w-3.5" />
          Feature locked — contact us to activate
        </div>
        {/* Transparent click blocker */}
        <div className="absolute inset-0 z-10 cursor-not-allowed" />

        {/* ── Stage: Upload ──────────────────────────────────────────────── */}
        {stage === 'upload' && (
          <>
            {/* Bank account selector */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Bank Account
              </label>
              <AccountComboBox
                companyId={companyId}
                value={bankAccountName}
                onChange={(name, meta) => {
                  setBankAccountName(name);
                  if (meta) setBankAccountMeta({ primaryGroup: meta.primaryGroup, subGroup: meta.subGroup, nature: meta.nature });
                }}
                placeholder="e.g., HDFC Bank A/c"
                className="h-9 text-sm"
              />
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {uploadError}
              </div>
            )}

            {importing ? (
              <div className="text-center py-10">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600">Parsing file...</p>
              </div>
            ) : (
              <UploadZone onFile={handleFile} />
            )}

            {/* Existing batches */}
            {batches.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Previous Imports</h3>
                {batches.map((b) => (
                  <div key={b.id} className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg mb-1.5 text-sm">
                    <div>
                      <span className="font-medium text-gray-800">{b.file_name}</span>
                      <span className="text-gray-400 ml-2">{b.row_count} rows</span>
                      <span className="text-gray-400 ml-2">{new Date(b.imported_at).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { loadTransactions(); setStage('review'); }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Review
                      </button>
                      <button
                        onClick={() => handleDeleteBatch(b.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Stage: Review ──────────────────────────────────────────────── */}
        {stage === 'review' && (
          <>
            {/* Controls bar */}
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <DateRangeFilter
                fromDate={fromDate}
                toDate={toDate}
                onDateChange={(f, t) => { setFromDate(f); setToDate(t); }}
              />
              <button
                onClick={() => setStage('upload')}
                className="ml-auto flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <FileUp className="h-3.5 w-3.5" />
                Import more
              </button>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-4 text-xs bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 mb-4 flex-wrap">
              <span><strong>{stats.pending}</strong> pending transactions</span>
              <span className="text-red-600">DR {formatIndianCurrency(stats.totalDr)}</span>
              <span className="text-green-600">CR {formatIndianCurrency(stats.totalCr)}</span>
            </div>

            {/* Transfer result banner */}
            {transferResult && (
              <div className={`rounded-lg mb-4 text-sm ${
                transferResult.errors.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className={transferResult.errors.length > 0 ? 'text-yellow-800' : 'text-green-800'}>
                    {transferResult.created} journal entries created.
                    {transferResult.errors.length > 0 && ` ${transferResult.errors.length} failed.`}
                  </span>
                  <button onClick={() => setTransferResult(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {transferResult.errors.length > 0 && (
                  <div className="px-4 pb-2.5 space-y-0.5">
                    {transferResult.errors.slice(0, 10).map((e, i) => (
                      <p key={i} className="text-xs text-yellow-700">{e}</p>
                    ))}
                    {transferResult.errors.length > 10 && (
                      <p className="text-xs text-yellow-600">...and {transferResult.errors.length - 10} more</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Payee groups */}
            {groups.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-sm">No transactions to show.</p>
              </div>
            ) : (
              <div className="mb-24">
                {groups.map((g) => (
                  <PayeeGroupCard
                    key={g.payee}
                    payee={g.payee}
                    transactions={g.transactions}
                    totalDebit={g.totalDebit}
                    totalCredit={g.totalCredit}
                    count={g.count}
                    selectedIds={selectedIds}
                    onToggle={toggleOne}
                    onToggleAll={toggleAll}
                    onNarrationChange={handleNarrationChange}
                  />
                ))}
              </div>
            )}

            {/* Sticky bottom bulk action bar */}
            {selectedCount > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg px-4 py-3 z-40">
                <div className="max-w-5xl mx-auto flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-semibold text-blue-700">
                    {selectedCount} selected
                  </span>
                  <div className="flex-1 min-w-[200px] max-w-xs">
                    <AccountComboBox
                      companyId={companyId}
                      value={contraName}
                      onChange={(name, meta) => {
                        setContraName(name);
                        if (meta) setContraMeta({ primaryGroup: meta.primaryGroup, subGroup: meta.subGroup, nature: meta.nature });
                      }}
                      placeholder="Contra account..."
                      className="h-8 text-sm"
                    />
                  </div>
                  <select
                    value={voucherType}
                    onChange={(e) => setVoucherType(e.target.value as VoucherType)}
                    className="h-8 px-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="JRN">Auto (PMT/RCT)</option>
                    <option value="PMT">Payment</option>
                    <option value="RCT">Receipt</option>
                    <option value="JRN">Journal</option>
                  </select>
                  <button
                    onClick={handleTransfer}
                    disabled={!contraName.trim() || !contraMeta}
                    className="h-8 px-4 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Transfer to Books
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Stage: Transferring overlay ────────────────────────────────── */}
        {stage === 'transferring' && (
          <ProgressOverlay done={transferDone} total={transferTotal} />
        )}
      </div>
    </div>
  );
}
