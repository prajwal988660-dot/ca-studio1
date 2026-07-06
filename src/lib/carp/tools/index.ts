/**
 * CARP Tools — Barrel
 *
 * Collects all tool declarations and executors from modular files
 * into a single CARP_TOOLS array and executeTool() function.
 */

import type { ToolDeclaration, ToolResult, ToolExecutor } from './types';

// Declarations
import { journalDeclarations, journalExecutors } from './journal';
import { companyDeclarations, companyExecutors } from './company';
import { computeDeclarations, computeExecutors } from './compute';
import { registersDeclarations, registersExecutors } from './registers';
import { documentsDeclarations, documentsExecutors } from './documents';
import { filesDeclarations, filesExecutors } from './files';
import { workspaceDeclarations, workspaceExecutors } from './workspace';
import { pageReaderDeclarations, pageReaderExecutors } from './pageReader';
import { navigationDeclarations, navigationExecutors } from './navigation';
import { knowledgeDeclarations, knowledgeExecutors } from './knowledge';
import { queriesDeclarations, queriesExecutors } from './queries';
import { validationDeclarations, validationExecutors } from './validation';
import { excelDeclarations, excelExecutors } from './excel';
import { bulkDeclarations, bulkExecutors } from './bulk';

// Re-export types
export type { ToolResult, ToolDeclaration, WorkspaceFile, ToolExecutor } from './types';

/* ── All tool declarations (35 total) ── */

export const CARP_TOOLS: ToolDeclaration[] = [
  // Journal (6)
  ...journalDeclarations,
  // Company (6)
  ...companyDeclarations,
  // Compute (5)
  ...computeDeclarations,
  // Registers (4)
  ...registersDeclarations,
  // Documents (1 dispatcher)
  ...documentsDeclarations,
  // Files (3)
  ...filesDeclarations,
  // Workspace (1 dispatcher)
  ...workspaceDeclarations,
  // Page Reader (1 universal)
  ...pageReaderDeclarations,
  // Navigation (1)
  ...navigationDeclarations,
  // Knowledge (1)
  ...knowledgeDeclarations,
  // Queries (3)
  ...queriesDeclarations,
  // Validation (2)
  ...validationDeclarations,
  // Excel (1)
  ...excelDeclarations,
  // Bulk Workspace (8)
  ...bulkDeclarations,
];

/* ── Executor map ── */

const executorMap: Record<string, ToolExecutor> = {
  ...journalExecutors,
  ...companyExecutors,
  ...computeExecutors,
  ...registersExecutors,
  ...documentsExecutors,
  ...filesExecutors,
  ...workspaceExecutors,
  ...pageReaderExecutors,
  ...navigationExecutors,
  ...knowledgeExecutors,
  ...queriesExecutors,
  ...validationExecutors,
  ...excelExecutors,
  ...bulkExecutors,
};

/* ── Unified executor ── */

export function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  companyId: string,
  onNavigate?: (path: string) => void,
): ToolResult {
  try {
    const executor = executorMap[toolName];
    if (!executor) return { success: false, error: `Unknown tool: ${toolName}` };
    return executor(args, companyId, onNavigate);
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Tool execution failed',
    };
  }
}
