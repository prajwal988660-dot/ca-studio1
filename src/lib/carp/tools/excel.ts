/**
 * CARP Excel Tools
 *
 * Gives the AI agent access to data from an uploaded Excel / CSV file.
 * The file is parsed by excelUpload.ts and stored in sessionStorage.
 */

import type { ToolDeclaration, ToolExecutor } from './types';
import { getUploadedWorkbook } from '@/lib/excelUpload';

export const excelDeclarations: ToolDeclaration[] = [
  {
    name: 'read_excel',
    description:
      'Read data from the uploaded Excel or CSV file. ' +
      'Call with no arguments to get a summary of all sheets and their columns. ' +
      'Pass sheet_name to read that sheet\'s full data row by row. ' +
      'Use start_row + max_rows to paginate through large sheets. ' +
      'After reading, you can create journal entries, financial statements, or workspace reports from the data.',
    parameters: {
      type: 'object',
      properties: {
        sheet_name: {
          type: 'string',
          description:
            'Name of the sheet to read in full. Omit to get a summary of all sheets.',
        },
        start_row: {
          type: 'number',
          description: 'Row index to start reading from (0-based, default 0).',
        },
        max_rows: {
          type: 'number',
          description:
            'Maximum number of rows to return (default 200, max 500). Use pagination for large datasets.',
        },
      },
      required: [],
    },
  },
];

export const excelExecutors: Record<string, ToolExecutor> = {
  read_excel(args) {
    const wb = getUploadedWorkbook();

    if (!wb) {
      return {
        success: false,
        error:
          'No file uploaded yet. Ask the user to upload an Excel or CSV file using the 📎 button in the chat input area.',
      };
    }

    const sheetName = args.sheet_name as string | undefined;
    const startRow = Math.max(0, Number(args.start_row ?? 0));
    const maxRows = Math.min(Number(args.max_rows ?? 200), 500);

    // ── No sheet name → return summary of all sheets ──────────────────────
    if (!sheetName) {
      return {
        success: true,
        data: {
          fileName: wb.fileName,
          uploadedAt: wb.uploadedAt,
          totalRows: wb.totalRows,
          sheets: wb.sheets.map((s) => ({
            name: s.name,
            rowCount: s.rowCount,
            headers: s.headers,
            sampleRows: s.rows.slice(0, 3),
          })),
          instructions:
            'Call read_excel({ sheet_name: "SheetName" }) to read a full sheet. ' +
            'Use bulk_create_entries to create journal entries from the data. ' +
            'Use create_formatted_report to save a processed summary to workspace.',
        },
      };
    }

    // ── Read specific sheet ────────────────────────────────────────────────
    const sheet = wb.sheets.find(
      (s) => s.name.toLowerCase() === sheetName.toLowerCase(),
    );

    if (!sheet) {
      const available = wb.sheets.map((s) => `"${s.name}"`).join(', ');
      return {
        success: false,
        error: `Sheet "${sheetName}" not found. Available sheets: ${available}`,
      };
    }

    const slicedRows = sheet.rows.slice(startRow, startRow + maxRows);
    const hasMore = startRow + maxRows < sheet.rowCount;

    return {
      success: true,
      data: {
        fileName: wb.fileName,
        sheet: sheet.name,
        headers: sheet.headers,
        rows: slicedRows,
        totalRows: sheet.rowCount,
        returnedRows: slicedRows.length,
        startRow,
        hasMore,
        nextStartRow: hasMore ? startRow + maxRows : null,
        paginationHint: hasMore
          ? `There are more rows. Call read_excel({ sheet_name: "${sheet.name}", start_row: ${startRow + maxRows} }) for the next batch.`
          : 'All rows returned.',
      },
      displayType: 'table',
    };
  },
};
