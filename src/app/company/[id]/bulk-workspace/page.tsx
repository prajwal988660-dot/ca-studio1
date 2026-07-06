/**
 * Bulk Workspace — Main page for the Bulk Private Limited entity workflow.
 *
 * Flow:
 * 1. Upload CSV → populates suspense + bank ledger
 * 2. View/filter/select suspense rows in the data grid
 * 3. Right-click → Move to Ledger (manual) or Unallocate (ALLOCATED rows)
 * 4. Use CARP AI for keyword-based bulk classification
 * 5. When suspense = 0 → trial balance auto-generated
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Upload, RefreshCw, BarChart3, HelpCircle, X, Download, FileSpreadsheet, Info } from 'lucide-react';
import { useCompany } from '@/hooks/useCompany';
import { useNavigate } from 'react-router-dom';
import { BulkDataGrid } from '@/components/bulk/BulkDataGrid';
import { BulkProgressBar } from '@/components/bulk/BulkProgressBar';
import { ImportCSVModal } from '@/components/bulk/ImportCSVModal';
import { UnifiedLedgerPickerModal } from '@/components/bulk/UnifiedLedgerPickerModal';
import { getSuspenseTransactions, getLedgerAccounts, deleteSuspenseRows } from '@/lib/bulk/bulkDb';
import {
  getProgress,
  moveIdsToLedger,
  createLedger,
  flagSuspenseRows,
  unallocateRows,
} from '@/lib/bulk/bulkLedger';
import type { ImportResult, BulkProgress } from '@/lib/bulk/types';
import { getCurrentFY } from '@/lib/utils/dateUtils';

function getFYLabel(): string {
  const fyObj = getCurrentFY();
  if (fyObj.label) return fyObj.label;
  const start = new Date(fyObj.start);
  const end = new Date(fyObj.end);
  return `${start.getFullYear()}-${String(end.getFullYear()).slice(-2)}`;
}

type Modal = null | 'import' | 'ledger-picker';

// ── How to Import Modal ────────────────────────────────────────────────────────

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

export default function BulkWorkspacePage() {
  const { company, companyId } = useCompany();
  const navigate = useNavigate();

  const fy = getFYLabel();

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const transactions = useMemo(
    () => (companyId ? getSuspenseTransactions(companyId, fy) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companyId, fy, refreshKey],
  );

  const ledgerAccounts = useMemo(
    () => (companyId ? getLedgerAccounts(companyId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companyId, refreshKey],
  );

  const progress: BulkProgress = useMemo(
    () =>
      companyId
        ? getProgress(companyId, fy)
        : { totalRows: 0, allocated: 0, remaining: 0, completionPct: 0, nextKeywords: [] },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companyId, fy, refreshKey],
  );

  // Modal state
  const [modal, setModal] = useState<Modal>(null);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [showHowTo, setShowHowTo] = useState(false);

  // Import success handler
  const handleImportSuccess = useCallback(
    (_result: ImportResult) => {
      setModal(null);
      refresh();
    },
    [refresh],
  );

  // Move to ledger (from grid or context menu)
  const handleMoveRequest = useCallback((ids: string[]) => {
    setPendingIds(ids);
    setModal('ledger-picker');
  }, []);

  // Flag rows
  const handleFlagRows = useCallback(
    (ids: string[]) => {
      if (!companyId) return;
      flagSuspenseRows(companyId, ids);
      refresh();
    },
    [companyId, refresh],
  );

  // Delete rows
  const handleDeleteRows = useCallback(
    (ids: string[]) => {
      if (!companyId) return;
      deleteSuspenseRows(companyId, ids);
      refresh();
    },
    [companyId, refresh],
  );

  // Unallocate rows (ALLOCATED → UNALLOCATED)
  const handleUnallocateRows = useCallback(
    (ids: string[]) => {
      if (!companyId) return;
      unallocateRows(companyId, ids);
      refresh();
    },
    [companyId, refresh],
  );

  // Unified pick/create handler — works for both existing COA accounts and new ones.
  // createLedger() is idempotent: returns existing BulkLedgerAccount if name already exists.
  const handlePick = useCallback(
    (name: string, group: string, accountType: string) => {
      if (!companyId) return;
      const { ledgerAccount } = createLedger(companyId, name, group, accountType, 'MANUAL');
      if (pendingIds.length > 0) {
        moveIdsToLedger(companyId, fy, pendingIds, ledgerAccount.id, 'MANUAL');
        setPendingIds([]);
      }
      setModal(null);
      refresh();
    },
    [companyId, fy, pendingIds, refresh],
  );

  if (!company || !companyId) return null;

  const isEmpty = transactions.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50">
      {/* How to import modal */}
      {showHowTo && <HowToImportModal onClose={() => setShowHowTo(false)} />}

      {/* Header */}
      {isEmpty ? (
        <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Bulk Workspace</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {company.name} · FY {fy} · Bank statement importer
              </p>
            </div>
            <button
              onClick={() => setShowHowTo(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              How to import?
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border-b border-gray-200 px-4 py-2 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-bold text-gray-900">Bulk Importer</h1>
              <div className="h-4 w-px bg-gray-300" />
              <div className="flex-1 min-w-[200px] max-w-[300px]">
                <BulkProgressBar progress={progress} compact />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {progress.completionPct === 100 && (
                <button
                  onClick={() => navigate(`/company/${companyId}/trial-balance`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  View Trial Balance
                </button>
              )}
              <button
                onClick={() => setShowHowTo(true)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded transition-colors"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                How to import?
              </button>
              <button
                onClick={refresh}
                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                title="Refresh"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setModal('import')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
              >
                <Upload className="h-3.5 w-3.5" />
                Import CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-center max-w-lg w-full px-4">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Start with a Bank Statement
            </h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Upload your client&apos;s bank statement (CSV or Excel). The system automatically
              parses every row into suspense, then you classify them into ledger accounts —
              manually or using the AI assistant.
            </p>
            <button
              onClick={() => setModal('import')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium mb-6"
            >
              <Upload className="h-4 w-4" />
              Import Bank Statement
            </button>

            {/* Quick instructions card */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left mb-4">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Before you upload</p>
              <ul className="space-y-1.5 text-sm text-blue-700">
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">•</span><span>Our software recognises <strong>every bank&apos;s Excel/CSV format</strong> automatically.</span></li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">•</span><span>If not accepted: ensure <strong>Row 1 has column headers</strong> (Date, Description, Debit, Credit).</span></li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">•</span><span>Remove unnecessary bank info at the top and footnotes at the bottom.</span></li>
              </ul>
              <div className="mt-3 pt-3 border-t border-blue-100">
                <p className="text-xs text-blue-600 font-semibold mb-2">Still not working? Download a sample template:</p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/sample-bank-statement-1.csv"
                    download="CA-Studio-Sample-Bank-Statement.csv"
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 font-medium transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Sample Format 1 (.csv)
                  </a>
                  <a
                    href="/sample-bank-statement-2.xls"
                    download="CA-Studio-Sample-Bank-Statement.xls"
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-100 font-medium transition-colors"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Sample Format 2 (.xls)
                  </a>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHowTo(true)}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              View detailed import guide
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 mx-6 mb-4 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
          <BulkDataGrid
            transactions={transactions}
            ledgerAccounts={ledgerAccounts}
            onMoveToLedger={handleMoveRequest}
            onCreateAndMove={handleMoveRequest}
            onFlagRows={handleFlagRows}
            onDeleteRows={handleDeleteRows}
            onUnallocateRows={handleUnallocateRows}
            onCreateNewLedger={() => {
              setPendingIds([]);
              setModal('ledger-picker');
            }}
          />
        </div>
      )}

      {/* Modals */}
      {modal === 'import' && (
        <ImportCSVModal
          companyId={companyId}
          fy={fy}
          onSuccess={handleImportSuccess}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'ledger-picker' && (
        <UnifiedLedgerPickerModal
          companyId={companyId}
          rowCount={pendingIds.length}
          onPick={handlePick}
          onClose={() => { setModal(null); setPendingIds([]); }}
        />
      )}

    </div>
  );
}
