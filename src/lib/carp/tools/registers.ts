/**
 * CARP Tools — Registers & Audit (4 tools)
 */

import {
  getEntityData,
  upsertEntityData,
  listEntityData,
  listJournalEntries,
} from '@/lib/offlineDb';
import { computePurchaseRegister, computeSalesRegister, computePurchaseReturnsRegister, computeSalesReturnsRegister } from '@/lib/accounting/registers';
import type { ToolDeclaration, ToolResult, ToolExecutor } from './types';

/* ── Declarations ── */

export const registersDeclarations: ToolDeclaration[] = [
  {
    name: 'get_register_data',
    description: 'Get register data: purchase_register, sales_register, expense_register, statutory_registers (MBP/MGT company law registers), or any entity_data register section.',
    parameters: {
      type: 'object',
      properties: {
        register_type: {
          type: 'string',
          enum: ['purchase_register', 'sales_register', 'purchase_returns', 'sales_returns', 'statutory_registers', 'fixed_assets', 'investments'],
          description: 'Type of register to retrieve',
        },
        from_date: { type: 'string' },
        to_date: { type: 'string' },
      },
      required: ['register_type'],
    },
  },
  {
    name: 'update_register_entry',
    description: 'Update an entity-data register entry (e.g. mark a statutory register as maintained, update fixed asset details).',
    parameters: {
      type: 'object',
      properties: {
        register_type: { type: 'string', description: 'Register section key' },
        data: { type: 'object', description: 'Updated data for the register' },
      },
      required: ['register_type', 'data'],
    },
  },
  {
    name: 'get_audit_data',
    description: 'Get audit-related data: DRS (Director Responsibility Statement) flags, CARO applicability, audit observations, and audit report sections.',
    parameters: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          enum: ['drs', 'caro', 'observations', 'all'],
          description: 'Which audit section to retrieve',
        },
      },
    },
  },
  {
    name: 'get_compliance_status',
    description: 'Get compliance calendar with due dates and status for the current financial year. Shows overdue items.',
    parameters: {
      type: 'object',
      properties: {
        as_of_date: { type: 'string', description: 'Date to check compliance against (YYYY-MM-DD). Defaults to today.' },
      },
    },
  },
];

/* ── Helpers ── */

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ── Executors ── */

export const registersExecutors: Record<string, ToolExecutor> = {
  get_register_data(args, companyId) {
    const regType = args.register_type as string;

    // Computed registers from journal entries
    if (regType === 'purchase_register') {
      const data = computePurchaseRegister(companyId, args.from_date as string | undefined, args.to_date as string | undefined);
      return { success: true, data, displayType: 'table' };
    }
    if (regType === 'sales_register') {
      const data = computeSalesRegister(companyId, args.from_date as string | undefined, args.to_date as string | undefined);
      return { success: true, data, displayType: 'table' };
    }
    if (regType === 'purchase_returns') {
      const data = computePurchaseReturnsRegister(companyId, args.from_date as string | undefined, args.to_date as string | undefined);
      return { success: true, data, displayType: 'table' };
    }
    if (regType === 'sales_returns') {
      const data = computeSalesReturnsRegister(companyId, args.from_date as string | undefined, args.to_date as string | undefined);
      return { success: true, data, displayType: 'table' };
    }

    // Entity-data based registers
    const record = getEntityData(companyId, 'pvt_ltd', regType === 'statutory_registers' ? 'registers' : regType);
    if (!record) return { success: true, data: { message: `No ${regType} data found.` }, displayType: 'text' };
    return { success: true, data: record.data, displayType: 'json' };
  },

  update_register_entry(args, companyId) {
    const regType = args.register_type as string;
    upsertEntityData(companyId, 'pvt_ltd', regType, args.data);
    return { success: true, data: { register: regType, updated: true }, displayType: 'confirmation' };
  },

  get_audit_data(args, companyId) {
    const section = (args.section as string) || 'all';

    if (section === 'all') {
      const allData = listEntityData(companyId, 'pvt_ltd')
        .filter((d) => ['audit', 'drs', 'caro'].includes(d.section));
      const result: Record<string, unknown> = {};
      for (const d of allData) result[d.section] = d.data;
      return { success: true, data: result, displayType: 'json' };
    }

    const record = getEntityData(companyId, 'pvt_ltd', section);
    if (!record) return { success: true, data: { message: `No ${section} audit data found.` }, displayType: 'text' };
    return { success: true, data: record.data, displayType: 'json' };
  },

  get_compliance_status(args, companyId) {
    const calendarData = getEntityData(companyId, 'pvt_ltd', 'compliance_calendar');
    if (!calendarData) {
      return { success: true, data: { message: 'No compliance calendar initialized' }, displayType: 'text' };
    }

    const calendar = calendarData.data as { items: Array<{ code: string; name: string; dueDate: string; status: string }> };
    const asOf = (args.as_of_date as string) || new Date().toISOString().slice(0, 10);
    const overdue = calendar.items.filter(
      (item) => item.dueDate < asOf && item.status !== 'filed' && item.status !== 'not_applicable',
    );
    const upcoming = calendar.items.filter(
      (item) => item.dueDate >= asOf && item.dueDate <= addDaysStr(asOf, 30),
    );

    return {
      success: true,
      data: {
        totalItems: calendar.items.length,
        overdue: overdue.length,
        overdueItems: overdue.slice(0, 10),
        upcomingIn30Days: upcoming.length,
        upcomingItems: upcoming.slice(0, 10),
      },
      displayType: 'table',
    };
  },
};
