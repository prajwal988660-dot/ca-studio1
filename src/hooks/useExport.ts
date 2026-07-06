'use client';

import { useCallback } from 'react';
import { exportToPDF, exportToExcel, exportToCSV, type ExportColumn } from '@/components/export/exportUtils';

interface UseExportOptions {
  title: string;
  companyName: string;
  entityType: string;
  dateRange: string;
  columns: ExportColumn[];
  data: Record<string, any>[];
  pdfOrientation?: 'portrait' | 'landscape';
  includeSignatureBlock?: boolean;
}

export function useExport(options: UseExportOptions) {
  const { title, companyName, entityType, dateRange, columns, data, pdfOrientation, includeSignatureBlock } = options;

  const downloadPDF = useCallback(() => {
    exportToPDF(title, companyName, entityType, dateRange, columns, data, {
      orientation: pdfOrientation,
      includeSignatureBlock,
    });
  }, [title, companyName, entityType, dateRange, columns, data, pdfOrientation, includeSignatureBlock]);

  const downloadExcel = useCallback(() => {
    exportToExcel(title, columns, data);
  }, [title, columns, data]);

  const downloadCSV = useCallback(() => {
    exportToCSV(columns, data, title.replace(/\s+/g, '_'));
  }, [columns, data, title]);

  return { downloadPDF, downloadExcel, downloadCSV };
}
