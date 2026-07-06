'use client';

import { useState, useRef, useEffect } from 'react';
import { FileText, FileSpreadsheet, FileDown, Loader2, Download } from 'lucide-react';
import { exportToPDF, exportToExcel, exportToCSV, type ExportColumn } from './exportUtils';

interface ExportButtonsProps {
  title: string;
  companyName: string;
  entityType: string;
  dateRange: string;
  columns: ExportColumn[];
  data: Record<string, any>[];
  pdfOrientation?: 'portrait' | 'landscape';
  includeSignatureBlock?: boolean;
  /** When true (default), export options are locked behind Pro version. */
  locked?: boolean;
  /** Optional custom PDF handler (accepted for callers that supply their own). */
  onPdf?: () => Promise<void> | void;
}

const LOCK_SVG = (
  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
);

export function ExportButtons({
  title, companyName, entityType, dateRange,
  columns, data, pdfOrientation, includeSignatureBlock,
  locked = true,
}: ExportButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onEscape);
    };
  }, [isOpen]);

  const handle = async (type: string, fn: () => Promise<void> | void) => {
    setLoading(type);
    setIsOpen(false);
    try { await fn(); } finally { setLoading(null); }
  };

  const btnClass = "w-full h-8 px-2 text-left text-xs text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2 disabled:opacity-40";
  const lockedBtnClass = "w-full h-8 px-2 text-left text-xs text-gray-400 rounded flex items-center gap-2 cursor-not-allowed";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className="relative inline-flex items-center justify-center h-7 w-7 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-300 bg-white transition-colors"
        title={locked ? 'Export — Pro version' : 'Download / Export'}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {locked && (
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-white border border-gray-200 flex items-center justify-center">
            <svg className="h-2 w-2 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-1">
          {locked && (
            <div className="px-2 py-1.5 mb-1 border-b border-gray-100">
              <p className="text-[10px] text-gray-400 font-medium">🔒 Export available in Pro version</p>
            </div>
          )}
          {locked ? (
            <>
              <div className={lockedBtnClass}>{LOCK_SVG} PDF</div>
              <div className={lockedBtnClass}>{LOCK_SVG} Excel</div>
              <div className={lockedBtnClass}>{LOCK_SVG} CSV</div>
            </>
          ) : (
            <>
              <button
                className={btnClass}
                disabled={!!loading}
                onClick={() => handle('pdf', () => exportToPDF(title, companyName, entityType, dateRange, columns, data, { orientation: pdfOrientation, includeSignatureBlock }))}
              >
                {loading === 'pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                PDF
              </button>
              <button
                className={btnClass}
                disabled={!!loading}
                onClick={() => handle('excel', () => exportToExcel(title, columns, data))}
              >
                {loading === 'excel' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                Excel
              </button>
              <button
                className={btnClass}
                disabled={!!loading}
                onClick={() => handle('csv', () => exportToCSV(columns, data, title.replace(/\s+/g, '_')))}
              >
                {loading === 'csv' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                CSV
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
