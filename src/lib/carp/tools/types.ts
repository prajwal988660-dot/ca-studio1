/**
 * CARP Tools — Shared Types
 */

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  /** UI hint for how to render the result */
  displayType?: 'journal_entry' | 'table' | 'text' | 'json' | 'navigation' | 'confirmation' | 'document' | 'file';
}

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** A file stored in the CARP workspace (localStorage) */
export interface WorkspaceFile {
  id: string;
  name: string;
  type: 'text' | 'csv' | 'markdown' | 'json';
  content: string;
  created_at: string;
  size: number;
}

export type ToolExecutor = (
  args: Record<string, unknown>,
  companyId: string,
  onNavigate?: (path: string) => void,
) => ToolResult;
