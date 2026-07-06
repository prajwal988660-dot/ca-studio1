/**
 * CARP Tools — Navigation (1 tool)
 */

import type { ToolDeclaration, ToolResult, ToolExecutor } from './types';

/* ── Declarations ── */

export const navigationDeclarations: ToolDeclaration[] = [
  {
    name: 'navigate_to_page',
    description: 'Navigate the user to a specific page in the software (e.g. journal, balance-sheet, trial-balance, gst, settings, etc.).',
    parameters: {
      type: 'object',
      properties: {
        page: { type: 'string', description: 'Page path (e.g. "journal", "balance-sheet", "trial-balance", "gst", "income-tax", "settings")' },
      },
      required: ['page'],
    },
  },
];

/* ── Executors ── */

export const navigationExecutors: Record<string, ToolExecutor> = {
  navigate_to_page(args, companyId, onNavigate) {
    const page = args.page as string;
    if (onNavigate) {
      onNavigate(`/company/${companyId}/${page}`);
    }
    return { success: true, data: { navigated_to: page }, displayType: 'navigation' };
  },
};
