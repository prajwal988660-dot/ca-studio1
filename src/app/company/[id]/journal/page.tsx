'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Search, Download, FileDown, FileText, FileSpreadsheet, Loader2, SlidersHorizontal } from 'lucide-react';
import { useCompany } from '@/hooks/useCompany';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { PageHeader } from '@/components/layout/PageHeader';
import { JournalFormat } from '@/components/formats/JournalFormat';
import { DateRangeFilter } from '@/components/export/DateRangeFilter';
import { exportToPDF, exportToExcel, exportToCSV } from '@/components/export/exportUtils';
import { ManualEntryDialog } from '@/components/entries/ManualEntryDialog';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import { AlertBanner } from '@/components/layout/AlertBanner';
import { getJournalDateRange, deleteJournalEntry, listJournalEntries } from '@/lib/offlineDb';
import { generateUniqueEntryCode } from '@/lib/utils/entryCodeGenerator';
import type { EntityType } from '@/types/company';
import type { JournalLine } from '@/types/journal';
import type { JournalEntry as ComputeJournalEntry } from '@/lib/accounting/computeEngine';


export default function JournalPage() {
  const [searchParams] = useSearchParams();
  const { company, companyId, loading: companyLoading } = useCompany();
  const fy = getCurrentFY();
  const voucherFromUrl = searchParams.get('voucherType') ?? '';
  const entryCodeFromUrl = searchParams.get('entryCode') ?? '';
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate, setToDate] = useState(fy.end);
  const [voucherFilter, setVoucherFilter] = useState<string>(voucherFromUrl);
  const [accountFilter, setAccountFilter] = useState<string>('');
  const [entryCodeFilter, setEntryCodeFilter] = useState<string>(entryCodeFromUrl);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [showTransferMenu, setShowTransferMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState<string | null>(null);
  const transferMenuRef = useRef<HTMLDivElement | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const dateRangeInitialized = useRef(false);

  // On first load, expand date range to include ALL stored entries (not just current FY).
  // This ensures previously-imported entries with old dates are always visible.
  useEffect(() => {
    if (!companyId || dateRangeInitialized.current) return;
    dateRangeInitialized.current = true;
    const range = getJournalDateRange(companyId);
    if (!range) return;
    setFromDate((d) => (range.from < d ? range.from : d));
    setToDate((d) => (range.to > d ? range.to : d));
  }, [companyId]);

  useEffect(() => {
    setVoucherFilter(voucherFromUrl);
  }, [voucherFromUrl]);

  useEffect(() => {
    setEntryCodeFilter(entryCodeFromUrl);
  }, [entryCodeFromUrl]);

  useEffect(() => {
    if (!showTransferMenu) return undefined;

    const onPointerDown = (event: MouseEvent) => {
      if (!transferMenuRef.current) return;
      if (!transferMenuRef.current.contains(event.target as Node)) {
        setShowTransferMenu(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowTransferMenu(false);
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onEscape);
    };
  }, [showTransferMenu]);

  useEffect(() => {
    if (!showFilters) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      if (!filterRef.current) return;
      if (!filterRef.current.contains(event.target as Node)) setShowFilters(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowFilters(false);
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onEscape);
    };
  }, [showFilters]);

  const JOURNAL_PAGE_LIMIT = 5000;
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 100;

  const entryCodeQuery = entryCodeFilter.trim() || undefined;
  const { entries, loading, createEntry, deleteEntry, refresh } = useJournalEntries({
    companyId: companyId || '',
    fromDate,
    toDate,
    voucherType: voucherFilter || undefined,
    accountName: accountFilter || undefined,
    entryCode: entryCodeQuery,
    limit: JOURNAL_PAGE_LIMIT,
    enabled: !!companyId,
  });

  const allRange = useMemo(() => getJournalDateRange(companyId || ''), [companyId]);

  if (companyLoading || !company) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  const journalEntries = entries.map(e => ({
    entryCode: e.entry_code,
    date: e.entry_date,
    lines: e.lines.map(l => ({
      accountName: l.account_name,
      isDebit: (l.debit || 0) > 0,
      amount: (l.debit || 0) > 0 ? l.debit : l.credit,
      inventorySubLines: l.inventory_sub_lines,
      tdsSection: l.tds_section,
      tdsRate: l.tds_rate,
      tcsSection: l.tcs_section,
      tcsRate: l.tcs_rate,
    })),
    narration: e.narration,
    voucherType: e.voucher_type,
  }));

  const totalPages = Math.ceil(journalEntries.length / PAGE_SIZE);
  const paginatedEntries = journalEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Export data (without JE codes)
  const exportData = entries.flatMap(e =>
    e.lines.map(l => ({
      date: e.entry_date,
      particulars: l.account_name,
      voucher_type: e.voucher_type,
      debit: l.debit || 0,
      credit: l.credit || 0,
      narration: e.narration,
    }))
  );

  const exportColumns = [
    { header: 'Date', key: 'date' },
    { header: 'Particulars', key: 'particulars' },
    { header: 'Voucher Type', key: 'voucher_type' },
    { header: 'Debit (₹)', key: 'debit', align: 'right' as const },
    { header: 'Credit (₹)', key: 'credit', align: 'right' as const },
    { header: 'Narration', key: 'narration' },
  ];

  const downloadJsonFromObject = (filename: string, data: unknown) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJournalJson = () => {
    if (!companyId) return;
    // Export full visible journal data WITHOUT entry_code.
    const exportedEntries = entries.map((e) => ({
      entry_date: e.entry_date,
      voucher_type: e.voucher_type,
      voucher_number: e.voucher_number,
      lines: e.lines,
      narration: e.narration,
      book_period: e.book_period,
      is_opening: e.is_opening,
      is_closing: e.is_closing,
    }));

    const payload = {
      schema: 'vaarta_journal_import_v1',
      company_id: companyId,
      exported_at: new Date().toISOString(),
      count: exportedEntries.length,
      entries: exportedEntries,
    };

    const filename = `journal_export_${(company.name || 'company').replace(/\s+/g, '_')}_${fromDate}_to_${toDate}.json`;
    downloadJsonFromObject(filename, payload);
    setShowTransferMenu(false);
  };

  const handleDownload = async (type: 'pdf' | 'excel' | 'csv') => {
    setDownloadLoading(type);
    setShowTransferMenu(false);
    try {
      if (type === 'pdf') await exportToPDF('Journal', company.name, entityLabel, `${fromDate} to ${toDate}`, exportColumns, exportData);
      else if (type === 'excel') await exportToExcel('Journal', exportColumns, exportData);
      else exportToCSV(exportColumns, exportData, 'Journal');
    } finally {
      setDownloadLoading(null);
    }
  };

  const computeBookPeriodFromDate = (entryDate: string): string => {
    const d = new Date(`${entryDate}T00:00:00`);
    const month = d.getMonth();
    const year = d.getFullYear();
    const fyStartYear = month < 3 ? year - 1 : year;
    return `${fyStartYear}-${fyStartYear + 1}`;
  };

  const readTextFromFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });

  type ImportedPayload = {
    schema?: string;
    company_id?: string;
    entries?: ImportedEntry[];
  };
  type ImportedEntry = {
    entry_date?: string;
    voucher_type?: string;
    voucher_number?: string | null;
    lines?: ImportedLine[];
    narration?: string;
    book_period?: string;
    is_opening?: boolean;
    is_closing?: boolean;
  };
  type ImportedLine = Partial<JournalLine>;

  const normalizeImportedLines = (lines: ImportedLine[]): JournalLine[] =>
    lines
      .map((line) => {
        const account_name = String(line.account_name || '').trim();
        const account_group = String(line.account_group || '').trim();
        const nature = line.nature;
        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);

        if (
          !account_name ||
          !account_group ||
          (nature !== 'asset' &&
            nature !== 'liability' &&
            nature !== 'capital' &&
            nature !== 'revenue' &&
            nature !== 'expense')
        ) {
          return null;
        }

        return {
          account_name,
          account_group,
          nature,
          debit: Number.isFinite(debit) ? debit : 0,
          credit: Number.isFinite(credit) ? credit : 0,
          inventory_sub_lines: line.inventory_sub_lines,
          tds_section: line.tds_section,
          tds_rate: line.tds_rate,
          tcs_section: line.tcs_section,
          tcs_rate: line.tcs_rate,
        } as JournalLine;
      })
      .filter((line): line is JournalLine => !!line);

  const handleImportJournalJson = async (file: File) => {
    if (!companyId) return;
    setShowTransferMenu(false);
    setImporting(true);
    try {
      const raw = await readTextFromFile(file);
      const parsed = JSON.parse(raw) as ImportedPayload;

      if (parsed.schema && parsed.schema !== 'vaarta_journal_import_v1') {
        window.alert('Unsupported journal JSON schema.');
        return;
      }
      if (parsed.company_id && parsed.company_id !== companyId) {
        const proceed = window.confirm(
          'This JSON belongs to a different company. Import entries into the current company anyway?',
        );
        if (!proceed) return;
      }

      const importEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
      if (importEntries.length === 0) {
        window.alert('No entries found in JSON file.');
        return;
      }

      let importedCount = 0;
      let invalidCount = 0;
      let failedCount = 0;
      const importedDates: string[] = [];
      for (const item of importEntries) {
        if (
          !item?.entry_date ||
          !item?.voucher_type ||
          !Array.isArray(item.lines) ||
          item.lines.length === 0
        ) {
          invalidCount += 1;
          continue;
        }
        const normalizedLines = normalizeImportedLines(item.lines);
        if (normalizedLines.length === 0) {
          invalidCount += 1;
          continue;
        }
        try {
          // eslint-disable-next-line no-await-in-loop
          await createEntry({
            company_id: companyId,
            entry_code: generateUniqueEntryCode(companyId),
            entry_date: item.entry_date,
            voucher_type: item.voucher_type,
            voucher_number:
              item.voucher_number === null || item.voucher_number === undefined
                ? undefined
                : item.voucher_number,
            lines: normalizedLines,
            narration: item.narration ?? '',
            book_period: item.book_period || computeBookPeriodFromDate(item.entry_date),
            is_opening: item.is_opening ?? false,
            is_closing: item.is_closing ?? false,
          });
          importedCount += 1;
          importedDates.push(item.entry_date);
        } catch {
          failedCount += 1;
        }
      }

      // Auto-expand the visible date range so imported entries are not filtered out
      if (importedDates.length > 0) {
        const minDate = importedDates.reduce((a, b) => (a < b ? a : b));
        const maxDate = importedDates.reduce((a, b) => (a > b ? a : b));
        if (minDate < fromDate) setFromDate(minDate);
        if (maxDate > toDate) setToDate(maxDate);
      }

      if (importedCount === 0) {
        window.alert('No entries were imported. Check JSON format and entry balances.');
      } else {
        const suffix: string[] = [];
        if (invalidCount > 0) suffix.push(`${invalidCount} invalid skipped`);
        if (failedCount > 0) suffix.push(`${failedCount} failed validation`);
        window.alert(
          `Imported ${importedCount} journal entr${importedCount === 1 ? 'y' : 'ies'} successfully with new JE codes.` +
            (suffix.length ? ` (${suffix.join(', ')})` : ''),
        );
      }
    } catch (err: any) {
      window.alert(err?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleSave = async (entry: Parameters<typeof createEntry>[0]) => {
    const created = await createEntry(entry);
    // Ensure the new entry is visible by expanding the date range if needed
    if (entry.entry_date < fromDate) setFromDate(entry.entry_date);
    if (entry.entry_date > toDate) setToDate(entry.entry_date);
    return created;
  };

  const handleEditEntry = (entryCode: string) => {
    const entry = entries.find(e => e.entry_code === entryCode);
    if (entry) setEditingEntry(entry);
  };

  const handleDeleteEntry = async (entryCode: string) => {
    if (!companyId) return;
    const entry = entries.find(e => e.entry_code === entryCode);
    if (!entry) return;
    const confirmed = window.confirm(`Delete journal entry ${entryCode}?\n\nThis cannot be undone. The account names will still exist in the ledger.`);
    if (!confirmed) return;
    deleteJournalEntry(entry.id);
    await refresh();
  };

  const handleDeleteSelected = async () => {
    if (!companyId || selectedCodes.size === 0) return;
    const n = selectedCodes.size;
    const confirmed = window.confirm(
      `Permanently delete ${n} selected journal entr${n === 1 ? 'y' : 'ies'}?\n\nThis cannot be undone.`,
    );
    if (!confirmed) return;
    for (const code of selectedCodes) {
      const entry = entries.find(e => e.entry_code === code);
      if (entry) deleteJournalEntry(entry.id);
    }
    setSelectedCodes(new Set());
    await refresh();
  };

  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [editingEntry, setEditingEntry] = useState<ComputeJournalEntry | null>(null);

  // Clear selection and pagination when filters or company change
  useEffect(() => {
    setSelectedCodes(new Set());
    setCurrentPage(1);
  }, [voucherFilter, accountFilter, entryCodeFilter, fromDate, toDate, companyId]);

  const hasActiveFilter =
    voucherFilter !== '' ||
    accountFilter !== '' ||
    entryCodeFilter !== '' ||
    fromDate !== fy.start ||
    toDate !== fy.end;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="shrink-0 mb-3">
        <PageHeader title="Journal" description={`${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} in view`}>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowNewEntry(true)}
              className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-3 w-3" /> New Entry
            </button>
            {selectedCodes.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={loading}
                className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors"
              >
                <Trash2 className="h-3 w-3" /> Delete ({selectedCodes.size})
              </button>
            )}

            {/* Date Filters */}
            <DateRangeFilter
              fromDate={fromDate}
              toDate={toDate}
              onDateChange={(from, to) => { setFromDate(from); setToDate(to); }}
              allRange={allRange}
            />

            {/* Download dropdown */}
            <div className="relative" ref={transferMenuRef}>
              <button
                type="button"
                onClick={() => setShowTransferMenu(v => !v)}
                className="inline-flex items-center justify-center h-7 w-7 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
                title="Download / Export"
              >
                {downloadLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              </button>
              {showTransferMenu && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-1">
                  <button type="button" onClick={() => handleDownload('pdf')} disabled={!!downloadLoading}
                    className="w-full h-8 px-2 text-left text-xs text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2 disabled:opacity-40">
                    <FileText className="h-3.5 w-3.5" /> PDF
                  </button>
                  <button type="button" onClick={() => handleDownload('excel')} disabled={!!downloadLoading}
                    className="w-full h-8 px-2 text-left text-xs text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2 disabled:opacity-40">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                  </button>
                  <button type="button" onClick={() => handleDownload('csv')} disabled={!!downloadLoading}
                    className="w-full h-8 px-2 text-left text-xs text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2 disabled:opacity-40">
                    <FileDown className="h-3.5 w-3.5" /> CSV
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button type="button" onClick={handleExportJournalJson}
                    className="w-full h-8 px-2 text-left text-xs text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2">
                    <FileDown className="h-3.5 w-3.5" /> Export JSON
                  </button>
                  <label className="w-full h-8 px-2 text-left text-xs text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2 cursor-pointer">
                    <FileText className="h-3.5 w-3.5" />
                    {importing ? 'Importing...' : 'Import JSON'}
                    <input
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      disabled={importing}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        await handleImportJournalJson(file);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Filter toggle */}
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setShowFilters(v => !v)}
                className={`inline-flex items-center justify-center h-7 w-7 border rounded-lg transition-colors ${
                  showFilters
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                title="Filters"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>

              {showFilters && (
                <div className="absolute right-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-4 space-y-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">Filters</span>
                    {hasActiveFilter && (
                      <button
                        type="button"
                        onClick={() => {
                          setFromDate(fy.start);
                          setToDate(fy.end);
                          setVoucherFilter('');
                          setAccountFilter('');
                          setEntryCodeFilter('');
                        }}
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        Reset all
                      </button>
                    )}
                  </div>

                  {/* Search */}
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Search</p>
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                        <input
                          value={entryCodeFilter}
                          onChange={e => setEntryCodeFilter(e.target.value)}
                          placeholder="JE code…"
                          maxLength={8}
                          className="w-full h-7 pl-7 pr-2 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                        <input
                          value={accountFilter}
                          onChange={e => setAccountFilter(e.target.value)}
                          placeholder="Account name…"
                          className="w-full h-7 pl-7 pr-2 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </PageHeader>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-auto flex flex-col">
        {entries.length === JOURNAL_PAGE_LIMIT && (
          <div className="shrink-0">
            <AlertBanner type="info" title="Showing latest entries only" message={`Display is capped at ${JOURNAL_PAGE_LIMIT} entries. Narrow the date range or use filters to see a specific set.`} />
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 min-h-0 relative">
            <JournalFormat
              companyName={company.name}
              period={`${fromDate} to ${toDate}`}
              entries={paginatedEntries}
              highlightEntryCode={entryCodeQuery}
              emptyMessage="No journal entries yet. Use New Entry to create your first journal."
              selectedCodes={selectedCodes}
              onSelectionChange={setSelectedCodes}
              onEditEntry={handleEditEntry}
              onDeleteEntry={handleDeleteEntry}
            />
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)]">
            <div className="text-xs text-gray-500 font-medium">
              Showing <span className="font-bold text-gray-900">{(currentPage - 1) * PAGE_SIZE + 1}</span> to <span className="font-bold text-gray-900">{Math.min(currentPage * PAGE_SIZE, journalEntries.length)}</span> of <span className="font-bold text-gray-900">{journalEntries.length}</span> entries
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-3 text-xs font-semibold border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                Previous
              </button>
              <div className="h-8 px-3 flex items-center justify-center text-xs font-bold text-gray-900 bg-gray-100 rounded-md">
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-3 text-xs font-semibold border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ManualEntryDialog
        open={showNewEntry}
        onOpenChange={setShowNewEntry}
        companyId={companyId || ''}
        onSave={handleSave}
      />

      {/* Edit dialog */}
      {editingEntry && (
        <ManualEntryDialog
          open={!!editingEntry}
          onOpenChange={(open) => { if (!open) setEditingEntry(null); }}
          companyId={companyId || ''}
          onSave={handleSave}
          initialEntry={editingEntry}
        />
      )}
    </div>
  );
}
