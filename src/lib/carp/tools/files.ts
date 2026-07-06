/**
 * CARP Tools — File Creation (3 tools)
 *
 * Files are stored in localStorage workspace keyed by company.
 */

import type { ToolDeclaration, ToolExecutor, WorkspaceFile } from './types';
import { addFile } from '@/lib/workspaceDb';

/* ── Declarations ── */

export const filesDeclarations: ToolDeclaration[] = [
  {
    name: 'create_text_file',
    description: 'Create a text file (plain text, CSV, or markdown) in the workspace. The user can download it later.',
    parameters: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'File name with extension (e.g. "report.md", "data.csv", "notes.txt")' },
        content: { type: 'string', description: 'Full file content' },
        file_type: { type: 'string', enum: ['text', 'csv', 'markdown', 'json'], description: 'File type' },
      },
      required: ['filename', 'content'],
    },
  },
  {
    name: 'create_spreadsheet',
    description: 'Generate structured tabular data (for Excel/CSV download). Provide headers and rows. The user can then download the result.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Spreadsheet title' },
        headers: { type: 'array', items: { type: 'string' }, description: 'Column headers' },
        rows: { type: 'array', items: { type: 'array', items: { type: 'string' } }, description: 'Array of row arrays (each row matches headers)' },
        save_to_workspace: { type: 'boolean', description: 'Also save as CSV in workspace (default true)' },
      },
      required: ['title', 'headers', 'rows'],
    },
  },
  {
    name: 'create_formatted_report',
    description: 'Create a formatted report document (markdown) and save to workspace. Use for board resolutions, audit reports, computations, etc.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Report title' },
        content: { type: 'string', description: 'Report content in markdown format' },
        report_type: { type: 'string', enum: ['legal', 'financial', 'compliance', 'audit', 'general'], description: 'Report category' },
      },
      required: ['title', 'content'],
    },
  },
];

/* ── Executors ── */

export const filesExecutors: Record<string, ToolExecutor> = {
  create_text_file(args, companyId) {
    const filename = args.filename as string;
    const content = args.content as string;
    const ext = filename.split('.').pop()?.toLowerCase() || 'txt';
    const typeMap: Record<string, WorkspaceFile['type']> = { csv: 'csv', md: 'markdown', json: 'json' };
    const fileType = (args.file_type as WorkspaceFile['type']) || typeMap[ext] || 'text';

    const file = addFile(companyId, { name: filename, type: fileType, content });
    return {
      success: true,
      data: { file_id: file.id, name: file.name, type: file.type, size: file.size },
      displayType: 'file',
    };
  },

  create_spreadsheet(args, companyId) {
    const headers = args.headers as string[];
    const rows = args.rows as unknown[][];
    const saveToWs = args.save_to_workspace !== false;

    // Build CSV content
    const csvLines = [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map((row) =>
        row.map((cell) => {
          const s = String(cell ?? '');
          return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(','),
      ),
    ];
    const csvContent = csvLines.join('\n');

    if (saveToWs) {
      const title = args.title as string;
      const safeName = title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
      addFile(companyId, { name: `${safeName}.csv`, type: 'csv', content: csvContent });
    }

    return {
      success: true,
      data: {
        title: args.title,
        headers,
        rows,
        csv_content: csvContent,
        downloadable: true,
      },
      displayType: 'table',
    };
  },

  create_formatted_report(args, companyId) {
    const title = args.title as string;
    const content = args.content as string;
    const safeName = title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);

    const file = addFile(companyId, {
      name: `${safeName}.md`,
      type: 'markdown',
      content: `# ${title}\n\n${content}`,
    });

    return {
      success: true,
      data: {
        file_id: file.id,
        title,
        report_type: args.report_type || 'general',
        size: file.size,
        downloadable: true,
      },
      displayType: 'file',
    };
  },
};
