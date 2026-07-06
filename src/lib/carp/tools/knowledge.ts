/**
 * CARP Tools — Knowledge/Statute Lookup (1 tool)
 */

import type { ToolDeclaration, ToolResult, ToolExecutor } from './types';

/* ── Declarations ── */

export const knowledgeDeclarations: ToolDeclaration[] = [
  {
    name: 'lookup_statute',
    description: 'Look up an Indian statute, section, or accounting standard for reference (Companies Act, IT Act, GST Act, ICAI SA, AS/Ind AS).',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Statute or section to look up (e.g. "Sec 135 CSR", "AS 9 Revenue", "SA 700 Audit Report", "Sec 44AB tax audit")' },
      },
      required: ['query'],
    },
  },
];

/* ── Executors ── */

export const knowledgeExecutors: Record<string, ToolExecutor> = {
  lookup_statute(args) {
    return {
      success: true,
      data: { query: args.query, instruction: 'Use your knowledge of Indian statutes to answer this query.' },
      displayType: 'text',
    };
  },
};
