/**
 * CARP Tools — Document Drafting (1 dispatcher tool → 16 document types)
 */

import { getCompany } from '@/lib/offlineDb';
import type { ToolDeclaration, ToolResult, ToolExecutor } from './types';

/* ── Declarations ── */

export const documentsDeclarations: ToolDeclaration[] = [
  {
    name: 'draft_document',
    description: 'Draft a CA/legal/corporate document. Dispatcher — specify document_type. The AI generates the content using company data and Indian legal format. Supported types: board_resolution, minutes_of_meeting, directors_report, auditor_report, tax_computation, caro_report, compliance_certificate, engagement_letter, management_letter, declaration, notice, consent_letter, undertaking, certificate, affidavit, power_of_attorney.',
    parameters: {
      type: 'object',
      properties: {
        document_type: {
          type: 'string',
          enum: [
            'board_resolution', 'minutes_of_meeting', 'directors_report',
            'auditor_report', 'tax_computation', 'caro_report',
            'compliance_certificate', 'engagement_letter', 'management_letter',
            'declaration', 'notice', 'consent_letter', 'undertaking',
            'certificate', 'affidavit', 'power_of_attorney',
          ],
          description: 'Type of document to draft',
        },
        title: { type: 'string', description: 'Document title/heading' },
        context: { type: 'object', description: 'Additional context: meeting_date, agenda, resolution_text, parties, amount, purpose, etc.' },
      },
      required: ['document_type'],
    },
  },
];

/* ── Executors ── */

export const documentsExecutors: Record<string, ToolExecutor> = {
  draft_document(args, companyId) {
    const company = getCompany(companyId);
    const docType = args.document_type as string;
    const label = docType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    return {
      success: true,
      data: {
        document_type: docType,
        title: (args.title as string) || label,
        company_name: company?.name || 'Unknown',
        entity_type: company?.entity_type || 'pvt_ltd',
        context: args.context || {},
        instruction: `Draft a professional ${label} for "${company?.name || 'the company'}". Use proper Indian legal/accounting format, cite applicable sections of Companies Act 2013 / Income Tax Act where relevant. Include date, place, signature blocks.`,
      },
      displayType: 'document',
    };
  },
};
