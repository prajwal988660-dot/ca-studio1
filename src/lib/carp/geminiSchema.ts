/**
 * Gemini function-calling requires strict OpenAPI 3.0 subset:
 * - Every `type: "array"` must have `items` with a `type`
 * - Every `type: "object"` must have non-empty `properties`
 */

import type { ToolDeclaration } from './tools/types';

type JsonSchema = Record<string, unknown>;

const JOURNAL_LINE_PROPERTIES: JsonSchema = {
  account_name: { type: 'string', description: 'Account name' },
  account_group: { type: 'string', description: 'Account group' },
  account_nature: {
    type: 'string',
    enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
    description: 'Account nature',
  },
  debit: { type: 'number', description: 'Debit amount' },
  credit: { type: 'number', description: 'Credit amount' },
};

export const JOURNAL_LINE_ARRAY_SCHEMA: JsonSchema = {
  type: 'array',
  description: 'Journal lines (debits must equal credits)',
  items: {
    type: 'object',
    description: 'Single journal line',
    properties: JOURNAL_LINE_PROPERTIES,
    required: ['account_name', 'account_group', 'account_nature', 'debit', 'credit'],
  },
};

export const PARTNER_ARRAY_SCHEMA: JsonSchema = {
  type: 'array',
  description: 'Partner details for P&L appropriation',
  items: {
    type: 'object',
    description: 'Partner profit-sharing details',
    properties: {
      name: { type: 'string', description: 'Partner name' },
      capitalAmount: { type: 'number', description: 'Capital balance' },
      profitSharingRatio: { type: 'number', description: 'Profit sharing ratio (%)' },
      salary: { type: 'number', description: 'Salary to partner' },
      commission: { type: 'number', description: 'Commission' },
      interestOnCapitalRate: { type: 'number', description: 'Interest on capital rate (%)' },
      interestOnDrawingsRate: { type: 'number', description: 'Interest on drawings rate (%)' },
    },
    required: ['name', 'profitSharingRatio'],
  },
};

function fixSchemaNode(node: JsonSchema): JsonSchema {
  const out: JsonSchema = { ...node };

  if (out.type === 'array') {
    const items = out.items as JsonSchema | undefined;
    if (!items || typeof items !== 'object' || !('type' in items)) {
      out.items = { type: 'string', description: 'Array element' };
    } else {
      out.items = fixSchemaNode(items);
    }
  }

  if (out.type === 'object') {
    const props = out.properties as Record<string, JsonSchema> | undefined;
    if (!props || Object.keys(props).length === 0) {
      out.properties = { value: { type: 'string', description: 'Value' } };
    } else {
      const fixed: Record<string, JsonSchema> = {};
      for (const [key, val] of Object.entries(props)) {
        fixed[key] = fixSchemaNode(val);
      }
      out.properties = fixed;
    }
  }

  return out;
}

function fixParameters(params: ToolDeclaration['parameters']): ToolDeclaration['parameters'] {
  const properties = params.properties as Record<string, JsonSchema>;
  const fixed: Record<string, JsonSchema> = {};
  for (const [key, val] of Object.entries(properties)) {
    fixed[key] = fixSchemaNode(val);
  }
  return { ...params, properties: fixed };
}

/** Tool declarations safe for Gemini generateContent functionDeclarations */
export function toGeminiFunctionDeclarations(tools: ToolDeclaration[]): ToolDeclaration[] {
  return tools.map((tool) => ({
    ...tool,
    parameters: fixParameters(tool.parameters),
  }));
}
