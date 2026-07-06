import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { importBankCSV } from '@/lib/bulk/bulkImport';
import type { ImportResult } from '@/lib/bulk/types';

interface Props {
  companyId: string;
  fy: string;
  onSuccess: (result: ImportResult) => void;
  onClose: () => void;
}

export function ImportCSVModal({ companyId, fy, onSuccess, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setError('');
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const res = await importBankCSV(companyId, fy, file);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <h2 className="font-semibold text-gray-900">Import Bank Statement</h2>
            <p className="text-xs text-gray-500 mt-0.5">FY {fy} · CSV / Excel format</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!result ? (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  file
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                {file ? (
                  <>
                    <FileSpreadsheet className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-blue-700">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(file.size / 1024).toFixed(0)} KB · Click to change
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Drop your bank statement here, or click to browse
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Supports .csv, .xlsx, .xls</p>
                  </>
                )}
              </div>

              {/* Format hint */}
              <div className="text-xs text-gray-500 bg-gray-50 rounded-md px-3 py-2 space-y-0.5">
                <p className="font-medium text-gray-600 mb-1">Supported column names:</p>
                <p>Date: <span className="font-mono">Date, Txn Date, Value Date, Posting Date</span></p>
                <p>Narration: <span className="font-mono">Narration, Description, Particulars, Remarks</span></p>
                <p>Debit: <span className="font-mono">Debit, Withdrawal, Dr Amount, Payment</span></p>
                <p>Credit: <span className="font-mono">Credit, Deposit, Cr Amount, Receipt</span></p>
                <p>Amount: <span className="font-mono">Amount, Txn Amount</span></p>
                <p>Indicator: <span className="font-mono">Dr / Cr, Type</span></p>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={!file || loading}
                  onClick={handleImport}
                  className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Importing…
                    </>
                  ) : (
                    'Import'
                  )}
                </button>
              </div>
            </>
          ) : (
            /* Success state */
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Import Successful!</p>
                  <p className="text-xs mt-0.5">
                    {result.rowsImported.toLocaleString()} rows imported
                    {result.rowsSkipped > 0 && (
                      <span className="text-amber-600"> · {result.rowsSkipped.toLocaleString()} duplicates skipped</span>
                    )}
                  </p>
                </div>
              </div>

              {result.truncated && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <span className="text-amber-500 text-base leading-none mt-0.5">⚠</span>
                  <div className="text-xs text-amber-800">
                    <p className="font-semibold">Only first 4,000 transactions imported</p>
                    <p className="mt-0.5">Your file has more rows. Re-upload the <strong>same file</strong> to import the next batch — already-imported rows are automatically skipped.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Total Payments</p>
                  <p className="font-semibold text-gray-800">{fmt(result.totalPayments)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Total Receipts</p>
                  <p className="font-semibold text-gray-800">{fmt(result.totalReceipts)}</p>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center">
                All rows are in suspense. Use the workspace below to classify them.
              </p>

              <button
                onClick={() => onSuccess(result)}
                className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Open Workspace
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
