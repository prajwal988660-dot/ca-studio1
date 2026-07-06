/**
 * CARP Agent — Gemini Integration
 *
 * Manages conversation state, sends messages to Gemini with
 * function-calling tools, and executes tool calls locally.
 */

import { CARP_TOOLS, executeTool, type ToolResult } from './tools';
import { toGeminiFunctionDeclarations } from './geminiSchema';
import { getUploadedWorkbook, getWorkbookSummary } from '@/lib/excelUpload';
import { getSuspenseTransactions } from '@/lib/bulk/bulkDb';

const GEMINI_TOOLS = toGeminiFunctionDeclarations(CARP_TOOLS);
import { getEntityData } from '@/lib/offlineDb';

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */

export interface CarpMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool_result';
  content: string;
  timestamp: number;
  /** Tool calls the assistant wants to make */
  toolCalls?: ToolCall[];
  /** Results from tool execution */
  toolResults?: ToolResult[];
  /** Loading state */
  isLoading?: boolean;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ConfirmAction {
  toolName: string;
  summary: string;
  args: Record<string, unknown>;
}

/* ═══════════════════════════════════════════════════════
   Write-tool confirmation
   ═══════════════════════════════════════════════════════ */

const WRITE_TOOLS = new Set([
  'create_journal_entry', 'bulk_create_entries',
  'update_journal_entry', 'bulk_update_entries',
  'delete_journal_entry', 'bulk_delete_entries',
  'bulk_move_to_ledger', 'bulk_create_ledger', 'bulk_add_other_side',
  'workspace_manage', 'update_entity_data', 'update_settings',
]);

function describeAction(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case 'create_journal_entry': {
      const lines = args.lines as unknown[] | undefined;
      return `Create journal entry — "${String(args.narration ?? '')}" (${lines?.length ?? 0} lines)`;
    }
    case 'bulk_create_entries': {
      const e = args.entries as unknown[] | undefined;
      return `Create ${e?.length ?? 0} journal entries`;
    }
    case 'delete_journal_entry':
      return `Delete journal entry — ID: ${String(args.entry_id ?? '')}`;
    case 'bulk_delete_entries': {
      const ids = args.entry_ids as string[] | undefined;
      return `Delete ${ids?.length ?? 0} journal entries`;
    }
    case 'update_journal_entry':
      return `Update journal entry — ID: ${String(args.entry_id ?? '')}`;
    case 'bulk_update_entries': {
      const u = args.updates as unknown[] | undefined;
      return `Update ${u?.length ?? 0} journal entries`;
    }
    case 'bulk_move_to_ledger':
      return `Move suspense rows matching "${String(args.keyword ?? '')}" to ledger`;
    case 'bulk_create_ledger':
      return `Create ledger account — ${String(args.name ?? '')} (${String(args.group ?? '')})`;
    case 'bulk_add_other_side':
      return `Add ₹${String(args.amount ?? '')} ${String(args.side ?? '')} to ledger`;
    case 'workspace_manage':
      return `Workspace: ${String(args.action ?? '')} — ${String(args.name ?? '')}`;
    case 'update_entity_data':
      return `Update entity data — section: ${String(args.section ?? '')}`;
    case 'update_settings':
      return `Update company settings`;
    default:
      return name.replace(/_/g, ' ');
  }
}

/* ═══════════════════════════════════════════════════════
   System Prompt
   ═══════════════════════════════════════════════════════ */

function buildSystemPrompt(companyName: string, entityType: string, companyId: string, aiRules?: string | null): string {
  let prompt = `You are CARP (CA Resource Planner) — an AI accounting agent built for Indian Chartered Accountants.

You are currently working on: "${companyName}" (${entityType})

YOUR CAPABILITIES (46 tools):
- Create, read, update, delete, search, bulk-create, bulk-delete, bulk-update journal entries
- Compute ANY financial statement: trial balance, P&L, balance sheet, trading account, cash flow, funds flow, ratio analysis, P&L appropriation, cash book, COGS working
- Compute GST data: GST register, GSTR-1, GSTR-3B, ITC register
- Compute tax data: TDS register, taxable income
- Compute ageing analysis: debtors and creditors ageing
- Compute ledger for any account
- Read data from ANY page in the software (67+ pages)
- Access and update company settings, entity data, registers, audit data
- Draft 16 types of CA/legal documents (board resolutions, minutes, audit reports, tax computations, etc.)
- Create files: text, CSV, markdown, spreadsheets, formatted reports
- Manage workspace: list, read, delete, rename files
- Navigate the user to any page
- Look up Indian statutes (Companies Act, IT Act, GST Act, ICAI standards)
- Validate journal entries, compute depreciation schedules
- Access AI rules set by the CA

RULES:
1. Always use Indian accounting terminology (Dr./Cr., ₹ format). Do NOT append "A/c" or "a/c" to account names (e.g. use "Sales" or "Customer" instead of "Sales A/c" or "Customer A/c"), as the system automatically appends "A/c" during display.
2. Journal entries MUST balance — total debits = total credits
3. Use proper account groups (Current Assets, Fixed Assets, Current Liabilities, Revenue, etc.)
4. Follow Indian GAAP / Ind AS as applicable
5. All dates in YYYY-MM-DD format
6. Financial year is April to March
7. When creating journal entries, use standard voucher types: JRN (Journal), SLS (Sales), PUR (Purchase), RCT (Receipt), PMT (Payment), CNT (Contra)
8. Be concise but thorough. When the CA asks for something, do it directly — don't just explain.
9. For compliance queries, reference specific sections (e.g., "Sec 135 of Companies Act 2013")
10. You have FULL control of the software — use tools to take action, don't just describe what to do.
11. When asked to create a document, use draft_document first, then create_formatted_report to save it.
12. When asked for any financial data, use compute_financial_statement or the appropriate compute tool.
13. Use read_page_data to see what the user sees on any page.
14. SPEED RULE — When operating on multiple journal entries, ALWAYS use bulk tools in a SINGLE call:
    - Delete 2+ entries → bulk_delete_entries([id1, id2, ...]) — NEVER loop with delete_journal_entry
    - Update 2+ entries → bulk_update_entries([...]) — NEVER loop with update_journal_entry
    - Create 2+ entries → bulk_create_entries([...]) — NEVER loop with create_journal_entry
    Single-entry tools (create/update/delete_journal_entry) are only for truly single operations.
15. CONFIRMATION RULE — When a write action is cancelled by the CA (error: "Action cancelled by CA"), acknowledge it and ask what they'd like to change. Never retry automatically.

When the user asks you to do something, USE YOUR TOOLS to actually do it. You are an agent, not a chatbot.`;

  // Bulk mode — inject specialised bulk system prompt when company has bulk data
  const hasBulkData = getSuspenseTransactions(companyId).length > 0;
  if (hasBulkData) {
    prompt += `

═══════════════════════════════════════════
BULK MODE — BANK STATEMENT CLASSIFIER
═══════════════════════════════════════════
This entity uses BULK BOOKKEEPING. Thousands of bank transactions sit in suspense.
Your job is to help the CA classify them into ledgers FAST.

BULK TOOLS AVAILABLE:
- bulk_extract_keywords: Get recurring keywords from unallocated suspense (call first)
- bulk_search_suspense: Count + total + 5 samples for a keyword (aggregates only)
- bulk_move_to_ledger: Bulk-move all matching rows after CA confirms (DB does the work)
- bulk_create_ledger: Create a new ledger inline
- bulk_add_other_side: Post GST portal/cash book other-side to party ledger
- bulk_get_progress: Check how many rows remain
- bulk_get_ledger_balance: Get DR/CR balance for any ledger
- bulk_list_ledgers: See all ledger accounts created

YOUR EXACT LOOP:
1. Call bulk_extract_keywords. Get the ranked keyword list.
2. Take the top keyword. Call bulk_search_suspense to get count + total + samples.
3. Present: "I see <KEYWORD> appears <count> times for ₹<total>. Samples: <narrations>. What are these / why paid?"
4. WAIT for the CA's answer.
5. Based on the answer, find/create the right ledger. Call bulk_move_to_ledger.
6. If the ledger is a supplier/customer, ask for the other side (GST portal / cash book) and call bulk_add_other_side.
7. Call bulk_get_progress, report remaining, show next keyword.
8. Repeat until suspense is empty. Then say the trial balance is ready.

HARD RULES:
- NEVER assume the nature of a transaction — ALWAYS ask the CA the reason first
- NEVER post without CA confirmation
- NEVER call bulk_move_to_ledger before the CA has confirmed the purpose of the transactions
- You are a speed layer — the CA can do everything manually. Never suggest the CA must use you.`;
  }

  // Auto-inject uploaded Excel/CSV context if present
  const uploadedWb = getUploadedWorkbook();
  if (uploadedWb) {
    prompt += `

═══════════════════════════════════════════
UPLOADED FILE — READY FOR PROCESSING:
═══════════════════════════════════════════
${getWorkbookSummary(uploadedWb)}

INSTRUCTIONS FOR THIS FILE:
- Call read_excel() (no args) first to confirm sheet structure
- Call read_excel({ sheet_name: "..." }) to read full data row by row
- Use bulk_create_entries to post journal entries from the data
- Use compute_financial_statement after entries are posted to generate P&L, Balance Sheet, etc.
- Use create_formatted_report to save analysis/statements to the workspace
- Use navigate_to to take the user to relevant pages after processing
- For large files, paginate with start_row parameter
When the user says "process this" or "prepare statements" — do it directly with tools, don't just explain.`;
  }

  if (aiRules) {
    prompt += `

═══════════════════════════════════════════
CUSTOM RULES FROM THE CA (follow these strictly):
═══════════════════════════════════════════
${aiRules}`;
  }

  return prompt;
}

/* ═══════════════════════════════════════════════════════
   Gemini API Call
   ═══════════════════════════════════════════════════════ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GeminiPart = Record<string, any>;

interface GeminiMessage {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

async function callGemini(
  messages: GeminiMessage[],
  systemPrompt: string,
): Promise<{
  text?: string;
  functionCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  rawParts: GeminiPart[];
}> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    // Use Netlify serverless function as proxy (API key stays server-side)
    const proxyModel = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';
    const response = await fetch('/.netlify/functions/gemini-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: proxyModel,
        contents: messages,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: [{ functionDeclarations: GEMINI_TOOLS }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return parseGeminiResponse(data);
  }

  // Direct API call
  const model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: messages,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      tools: [{ functionDeclarations: GEMINI_TOOLS }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return parseGeminiResponse(data);
}

function parseGeminiResponse(data: Record<string, unknown>): {
  text?: string;
  functionCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  /** Raw parts from the model — must be sent back verbatim for thought_signature support */
  rawParts: GeminiPart[];
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidate = (data.candidates as any)?.[0];
  if (!candidate) throw new Error('No response from Gemini');

  const parts: GeminiPart[] = candidate.content?.parts || [];
  let text = '';
  const functionCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

  for (const part of parts) {
    if (part.text && !part.thought) text += part.text;
    if (part.functionCall) {
      functionCalls.push({
        name: part.functionCall.name,
        args: part.functionCall.args || {},
      });
    }
  }

  return {
    text: text || undefined,
    functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
    rawParts: parts,
  };
}

/* ═══════════════════════════════════════════════════════
   Agent Runner — handles multi-turn tool calling
   ═══════════════════════════════════════════════════════ */

export async function runAgent(
  userMessage: string,
  conversationHistory: CarpMessage[],
  companyId: string,
  companyName: string,
  entityType: string,
  onNavigate?: (path: string) => void,
  onConfirm?: (action: ConfirmAction) => Promise<boolean>,
): Promise<CarpMessage[]> {
  // Load AI rules for this company
  let aiRules: string | null = null;
  try {
    const rulesRecord = getEntityData(companyId, 'settings', 'ai_rules');
    if (rulesRecord) {
      const rulesData = rulesRecord.data as { rules?: string };
      aiRules = rulesData?.rules || null;
    }
  } catch {
    // ignore — rules are optional
  }

  const systemPrompt = buildSystemPrompt(companyName, entityType, companyId, aiRules);
  const newMessages: CarpMessage[] = [];

  // Build Gemini message history
  const geminiHistory: GeminiMessage[] = [];

  // Build history from past messages.
  // IMPORTANT: We only include text-only turns for past conversations because
  // reconstructed functionCall parts would be missing thought_signature (required
  // by thinking models like gemini-3.x). Tool-call turns within the CURRENT
  // request use rawParts which preserve signatures.
  for (const msg of conversationHistory) {
    if (msg.role === 'user') {
      geminiHistory.push({ role: 'user', parts: [{ text: msg.content }] });
    } else if (msg.role === 'assistant' && msg.content) {
      // For past assistant messages, only include the text summary
      // (skip reconstructing functionCall parts — they'd lack thought_signature)
      geminiHistory.push({ role: 'model', parts: [{ text: msg.content }] });
    }
    // Skip 'tool_result' messages — they pair with functionCall turns we're skipping
  }

  // Add the new user message
  geminiHistory.push({ role: 'user', parts: [{ text: userMessage }] });

  // Multi-turn loop: keep calling until no more function calls
  let maxTurns = 8;
  while (maxTurns-- > 0) {
    const response = await callGemini(geminiHistory, systemPrompt);

    if (response.functionCalls && response.functionCalls.length > 0) {
      // Execute each tool call
      const toolResults: ToolResult[] = [];
      for (const fc of response.functionCalls) {
        let result: ToolResult;
        if (onConfirm && WRITE_TOOLS.has(fc.name)) {
          const confirmed = await onConfirm({
            toolName: fc.name,
            summary: describeAction(fc.name, fc.args),
            args: fc.args,
          });
          result = confirmed
            ? executeTool(fc.name, fc.args, companyId, onNavigate)
            : { success: false, error: 'Action cancelled by CA.' };
        } else {
          result = executeTool(fc.name, fc.args, companyId, onNavigate);
        }
        toolResults.push(result);
      }

      // Add assistant message with tool calls
      const assistantMsg: CarpMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.text || '',
        timestamp: Date.now(),
        toolCalls: response.functionCalls.map((fc) => ({ name: fc.name, args: fc.args })),
        toolResults,
      };
      newMessages.push(assistantMsg);

      // Add model turn verbatim (preserves thought_signature for thinking models)
      geminiHistory.push({ role: 'model', parts: response.rawParts });

      // Add function responses to history
      const responseParts: GeminiPart[] = response.functionCalls.map((fc, i) => ({
        functionResponse: {
          name: fc.name,
          response: toolResults[i],
        },
      }));
      geminiHistory.push({ role: 'user', parts: responseParts });

      // Continue loop — let Gemini process the results
      continue;
    }

    // No function calls — final text response
    if (response.text) {
      newMessages.push({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.text,
        timestamp: Date.now(),
      });
    }

    break;
  }

  return newMessages;
}
