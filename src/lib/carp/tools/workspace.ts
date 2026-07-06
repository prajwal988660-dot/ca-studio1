/**
 * CARP Tools — Workspace Management (1 dispatcher tool)
 *
 * Manages files created by the agent in localStorage.
 */

import type { ToolDeclaration, ToolResult, ToolExecutor } from './types';
import { getWorkspace, updateFile, deleteFile } from '@/lib/workspaceDb';

/* ── Declarations ── */

export const workspaceDeclarations: ToolDeclaration[] = [
  {
    name: 'workspace_manage',
    description: 'Manage workspace files. Actions: list_files, read_file, delete_file, rename_file, update_file. The workspace stores files you created (CSV, markdown, text reports).',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list_files', 'read_file', 'delete_file', 'rename_file', 'update_file'],
          description: 'Action to perform',
        },
        file_id: { type: 'string', description: 'File ID (for read/delete/rename/update)' },
        new_name: { type: 'string', description: 'New filename (for rename)' },
        new_content: { type: 'string', description: 'New file content (for update_file)' },
      },
      required: ['action'],
    },
  },
];

/* ── Executors ── */

export const workspaceExecutors: Record<string, ToolExecutor> = {
  workspace_manage(args, companyId) {
    const action = args.action as string;
    const files = getWorkspace(companyId);

    switch (action) {
      case 'list_files': {
        const listing = files.map((f) => ({
          id: f.id,
          name: f.name,
          type: f.type,
          size: f.size,
          created_at: f.created_at,
        }));
        return {
          success: true,
          data: { count: listing.length, files: listing },
          displayType: 'table',
        };
      }

      case 'read_file': {
        const file = files.find((f) => f.id === args.file_id);
        if (!file) return { success: false, error: 'File not found' };
        return {
          success: true,
          data: { name: file.name, type: file.type, content: file.content, size: file.size },
          displayType: 'text',
        };
      }

      case 'delete_file': {
        const deleted = deleteFile(companyId, args.file_id as string);
        if (!deleted) return { success: false, error: 'File not found' };
        return { success: true, data: { deleted: deleted.name }, displayType: 'confirmation' };
      }

      case 'rename_file': {
        const renamed = updateFile(companyId, args.file_id as string, { name: (args.new_name as string) });
        if (!renamed) return { success: false, error: 'File not found' };
        return { success: true, data: { renamed: renamed.name }, displayType: 'confirmation' };
      }

      case 'update_file': {
        const updated = updateFile(companyId, args.file_id as string, { content: (args.new_content as string) });
        if (!updated) return { success: false, error: 'File not found' };
        return { success: true, data: { name: updated.name, size: updated.size }, displayType: 'confirmation' };
      }

      default:
        return { success: false, error: `Unknown workspace action: ${action}` };
    }
  },
};
