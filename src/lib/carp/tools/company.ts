/**
 * CARP Tools — Company & Entity Data (6 tools)
 */

import {
  getCompany,
  getEntityData,
  upsertEntityData,
  listEntityData,
  updateCompany,
  listBookPeriods,
} from '@/lib/offlineDb';
import type { ToolDeclaration, ToolResult, ToolExecutor } from './types';

/* ── Declarations ── */

export const companyDeclarations: ToolDeclaration[] = [
  {
    name: 'get_company_info',
    description: 'Get the current company details including entity type, GST status, PAN, address, share capital, and all configuration.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_entity_data',
    description: 'Get entity-specific data sections for the current company (classification, compliance calendar, IFC package, registers, filings, audit, schedule III, ai_rules, etc.).',
    parameters: {
      type: 'object',
      properties: {
        section: { type: 'string', description: 'Section to fetch: classification, compliance_calendar, ifc_package, registers, filing_trackers, audit, schedule_iii, ai_rules' },
      },
      required: ['section'],
    },
  },
  {
    name: 'update_entity_data',
    description: 'Update a specific entity data section (e.g. update a register entry, filing tracker status, IFC control status).',
    parameters: {
      type: 'object',
      properties: {
        section: { type: 'string', description: 'Section to update' },
        data: { type: 'object', description: 'New data for the section (replaces existing)' },
      },
      required: ['section', 'data'],
    },
  },
  {
    name: 'update_company_settings',
    description: 'Update company-level settings like name, address, PAN, GSTIN, accounting method, tax audit flag, etc.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Company name' },
        address: { type: 'string', description: 'Registered address' },
        pan: { type: 'string', description: 'PAN (10 chars)' },
        gstin: { type: 'string', description: 'GSTIN (15 chars)' },
        tax_audit_applicable: { type: 'boolean' },
        accounting_method: { type: 'string', enum: ['mercantile', 'cash'] },
      },
    },
  },
  {
    name: 'get_ai_rules',
    description: 'Get the custom AI rules set by the CA for this company. These rules guide your behaviour.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_book_periods',
    description: 'Get all book/financial year periods for this company with their status (open/closed).',
    parameters: { type: 'object', properties: {} },
  },
];

/* ── Executors ── */

export const companyExecutors: Record<string, ToolExecutor> = {
  get_company_info(_args, companyId) {
    const company = getCompany(companyId);
    if (!company) return { success: false, error: 'Company not found' };
    return { success: true, data: company, displayType: 'json' };
  },

  get_entity_data(args, companyId) {
    const section = args.section as string;
    // Try entity-specific module first, then 'settings' module
    const record = getEntityData(companyId, 'pvt_ltd', section)
      || getEntityData(companyId, 'settings', section);
    if (!record) return { success: true, data: null, displayType: 'text' };
    return { success: true, data: record.data, displayType: 'json' };
  },

  update_entity_data(args, companyId) {
    upsertEntityData(companyId, 'pvt_ltd', args.section as string, args.data);
    return { success: true, data: { section: args.section, updated: true }, displayType: 'confirmation' };
  },

  update_company_settings(args, companyId) {
    const company = getCompany(companyId);
    if (!company) return { success: false, error: 'Company not found' };

    const updates: Record<string, unknown> = {};
    if (args.name) updates.name = args.name;
    if (args.tax_audit_applicable !== undefined) updates.tax_audit_applicable = args.tax_audit_applicable;
    if (args.accounting_method) updates.accounting_method = args.accounting_method;

    // Entity details fields
    if (args.address || args.pan) {
      updates.entity_details = {
        ...company.entity_details,
        ...(args.address ? { address: args.address } : {}),
        ...(args.pan ? { pan: args.pan } : {}),
      };
    }
    if (args.gstin) {
      updates.gst_details = { ...company.gst_details, gstin: args.gstin };
    }

    // updateCompany is async but we call it fire-and-forget style since offlineDb is sync internally
    updateCompany(companyId, updates);
    return { success: true, data: { updated: Object.keys(updates) }, displayType: 'confirmation' };
  },

  get_ai_rules(_args, companyId) {
    const record = getEntityData(companyId, 'settings', 'ai_rules');
    if (!record) return { success: true, data: { rules: null, message: 'No custom AI rules set. The CA can add rules in Settings → AI Rules.' }, displayType: 'text' };
    return { success: true, data: record.data, displayType: 'text' };
  },

  get_book_periods(_args, companyId) {
    const periods = listBookPeriods(companyId);
    return { success: true, data: periods, displayType: 'table' };
  },
};
