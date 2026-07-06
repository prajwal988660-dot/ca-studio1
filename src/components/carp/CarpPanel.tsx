'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/hooks/useCompany';
import { ENTITY_TYPES, type EntityType } from '@/lib/constants/entityTypes';
import { runAgent, type CarpMessage, type ConfirmAction } from '@/lib/carp/agent';
import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import {
  parseExcelFile,
  clearUploadedWorkbook,
  type ExcelWorkbook,
} from '@/lib/excelUpload';
import {
  X, Send, Loader2, ChevronDown, Wrench,
  Check, AlertCircle, ArrowRight, RotateCcw,
  FileText, Download, Paperclip, FileSpreadsheet, Bot, LockKeyhole,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════ */

const MIN_WIDTH = 300;
const MAX_WIDTH = 420;

/* ═══════════════════════════════════════════════════════
   CarpPanel
   ═══════════════════════════════════════════════════════ */

interface CarpPanelProps {
  open: boolean;
  onClose: () => void;
  width: number;
  onWidthChange: (w: number) => void;
}

export function CarpPanel({ open, onClose, width, onWidthChange }: CarpPanelProps) {
  const { company, companyId } = useCompany();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<CarpMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<ExcelWorkbook | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmPending, setConfirmPending] = useState<{
    action: ConfirmAction;
    resolve: (v: boolean) => void;
  } | null>(null);
  const [panelResizing, setPanelResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isResizing = useRef(false);

  // Desktop detection
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false,
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-focus
  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  /* ── Resize handler ── */
  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      setPanelResizing(true);
      const startX = e.clientX;
      const startW = width;

      const onMove = (ev: MouseEvent) => {
        if (!isResizing.current) return;
        const newW = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW + (startX - ev.clientX)));
        onWidthChange(newW);
      };
      const onUp = () => {
        isResizing.current = false;
        setPanelResizing(false);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width, onWidthChange],
  );

  /* ── File upload handler ── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset so same file can be re-uploaded

    setUploading(true);
    try {
      const wb = await parseExcelFile(file);
      setUploadedFile(wb);

      // Inject a friendly assistant message in the chat
      const sheetSummary = wb.sheets
        .map((s) => `"${s.name}" (${s.rowCount} rows)`)
        .join(', ');
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: `📊 File uploaded: **${wb.fileName}**\n${wb.sheets.length} sheet(s): ${sheetSummary} · ${wb.totalRows} total rows\n\nTell me what to do — e.g. "prepare journal entries and financial statements from this data"`,
          timestamp: Date.now(),
        },
      ]);

      // Pre-fill input with a helpful prompt
      if (!input.trim()) {
        setInput('Please read the uploaded file and prepare journal entries and financial statements from this data, then save a copy to workspace.');
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: `Could not read "${file.name}": ${(err as Error).message}\n\nSupported formats: .xlsx, .xls, .csv`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setUploading(false);
    }
  };

  const removeUploadedFile = () => {
    clearUploadedWorkbook();
    setUploadedFile(null);
  };

  /* ── Confirmation handler ── */
  const handleConfirm = useCallback((action: ConfirmAction): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmPending({ action, resolve });
    });
  }, []);

  /* ── Send message ── */
  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || !company) return;

    const userMsg: CarpMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const loadingMsg: CarpMessage = {
      id: 'loading',
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMsg]);

    try {
      const entityLabel =
        ENTITY_TYPES[company.entity_type as EntityType]?.label ?? company.entity_type;
      const newMessages = await runAgent(
        text,
        messages,
        companyId,
        company.name,
        entityLabel,
        (path) => navigate(path),
        handleConfirm,
      );
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'loading'),
        ...newMessages,
      ]);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message.toLowerCase() : '';
      const friendlyError = raw.includes('quota') || raw.includes('rate') || raw.includes('limit') || raw.includes('429')
        ? 'Hey CA, you\'ve reached the usage limit for now. Please wait a minute and try again.'
        : raw.includes('api key') || raw.includes('auth') || raw.includes('401') || raw.includes('403')
        ? 'There\'s a connection issue with the AI service. Please check your API key in Settings.'
        : raw.includes('network') || raw.includes('fetch') || raw.includes('offline')
        ? 'Looks like there\'s a network issue. Please check your connection and try again.'
        : 'Something went wrong on our end. Please try again in a moment.';
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'loading'),
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: friendlyError,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => setMessages([]);

  /* ── Shared panel content ── */
  const panelContent = (
    <>
      {/* ── Header ── */}
      <div className="h-8 border-b border-gray-100 flex items-center px-3 gap-2 shrink-0 bg-white">
        <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
          <span className="text-[11px] font-bold text-gray-900 tracking-tight">Aleza</span>
          <span className="text-[9px] text-gray-400 truncate">
            {company?.name ?? ''}
          </span>
        </div>
        <button
          onClick={clearChat}
          className="p-1 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
          title="Clear chat"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
        <button
          onClick={onClose}
          className="p-1 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-sm font-bold text-gray-300 mb-1 tracking-tight">Aleza</p>
            <p className="text-[11px] text-gray-400 mb-4 max-w-[220px] leading-relaxed">
              Your CA accounting agent. Create entries, compute statements, upload data, check compliance.
            </p>
            <div className="space-y-1.5 w-full max-w-[260px]">
              {[
                'Create a sales entry for ₹1,00,000',
                'Show trial balance for this FY',
                'What compliance is overdue?',
                'Generate board resolution for dividend',
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setInput(s);
                    inputRef.current?.focus();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-md border border-gray-100 text-[11px] text-gray-500
                    hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-600 transition-colors"
                >
                  {s}
                </button>
              ))}
              {/* Upload shortcut — locked */}
              <div
                className="w-full text-left px-2.5 py-1.5 rounded-md border border-dashed border-gray-200 text-[11px] text-gray-400
                  bg-gray-50 flex items-center gap-1.5 cursor-not-allowed select-none"
                title="Upload disabled for security"
              >
                <LockKeyhole className="h-3 w-3 shrink-0 text-amber-400" />
                <span>Upload disabled — <span className="text-amber-600">security restriction</span></span>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Confirm card ── */}
      {confirmPending && (
        <ConfirmCard
          action={confirmPending.action}
          onYes={() => { confirmPending.resolve(true); setConfirmPending(null); }}
          onNo={() => { confirmPending.resolve(false); setConfirmPending(null); }}
        />
      )}

      {/* ── Input area ── */}
      <div className="border-t border-gray-100 p-2.5 shrink-0 bg-white">

        {/* Uploaded file badge */}
        {uploadedFile && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-2 py-1 flex-1 min-w-0">
              <FileSpreadsheet className="h-3 w-3 text-green-600 shrink-0" />
              <span className="text-[11px] text-green-700 font-medium truncate">
                {uploadedFile.fileName}
              </span>
              <span className="text-[10px] text-green-500 shrink-0 ml-auto">
                {uploadedFile.totalRows} rows
              </span>
            </div>
            <button
              onClick={removeUploadedFile}
              className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
              title="Remove uploaded file"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-1.5">
          {/* Upload button — locked for security */}
          <button
            disabled
            title="Upload disabled for security reasons"
            className="h-8 w-8 rounded-lg border border-amber-200 bg-amber-50 flex items-center justify-center shrink-0 cursor-not-allowed"
          >
            <LockKeyhole className="h-3.5 w-3.5 text-amber-400" />
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? 'Thinking...' : uploadedFile ? 'What should I do with this file?' : 'Ask anything...'}
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs
              focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
              disabled:opacity-50 disabled:bg-gray-50
              placeholder:text-gray-300 min-h-[32px] max-h-[100px]"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 100) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center
              hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </button>
        </div>

        {/* Security notice */}
        <p className="mt-1.5 text-[10px] text-gray-400 flex items-center gap-1">
          <LockKeyhole className="h-2.5 w-2.5 text-amber-400 shrink-0" />
          Upload disabled for security. You can still explore the AI freely.
        </p>

        {/* Hidden file input — disabled */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          disabled
          onChange={handleFileUpload}
        />
      </div>
    </>
  );

  /* ── Render ── */

  if (isDesktop) {
    return (
      <div
        className={`shrink-0 bg-white overflow-hidden relative ${
          open ? 'border-l border-gray-200' : ''
        } ${panelResizing ? '' : 'transition-[width] duration-200'}`}
        style={{ width: open ? width : 0 }}
      >
        {/* Resize handle — 4px wide for easy grabbing */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 hover:bg-blue-400/40 active:bg-blue-400/60 transition-colors"
          onMouseDown={startResize}
        />
        <div className="flex flex-col h-full min-w-0" style={{ width, minWidth: width }}>
          {panelContent}
        </div>
      </div>
    );
  }

  // Mobile: fixed overlay
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/20 z-50" onClick={onClose} />
      )}
      <div
        className={`fixed right-0 top-0 h-full z-50 bg-white border-l border-gray-200 shadow-2xl
          flex flex-col transition-transform duration-300 ease-out
          w-full sm:w-[380px]
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {panelContent}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   Confirm Card — shown before every write tool fires
   ═══════════════════════════════════════════════════════ */

function ConfirmCard({
  action, onYes, onNo,
}: {
  action: ConfirmAction; onYes(): void; onNo(): void;
}) {
  return (
    <div className="mx-3 mb-2 p-3 bg-amber-50 border border-amber-200 rounded-xl shrink-0">
      <p className="text-[10px] font-semibold text-amber-700 mb-1.5">Aleza wants to:</p>
      <p className="text-xs text-gray-800 font-medium mb-3 leading-relaxed">{action.summary}</p>
      <div className="flex gap-2">
        <button
          onClick={onYes}
          className="flex-1 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors"
        >
          ✅ Yes, proceed
        </button>
        <button
          onClick={onNo}
          className="flex-1 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors"
        >
          ❌ Cancel
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Thinking Bubble — animated while Aleza processes
   ═══════════════════════════════════════════════════════ */

const THINKING_PHRASES = [
  'Reading your question…',
  'Checking accounting data…',
  'Processing…',
  'Drafting response…',
  'Crunching numbers…',
  'Consulting the ledger…',
];

function ThinkingBubble() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPhraseIdx((i) => (i + 1) % THINKING_PHRASES.length);
        setVisible(true);
      }, 300);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex gap-2 items-start">
      <div className="h-5 w-5 rounded-md bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="h-3 w-3 text-slate-400" />
      </div>
      <div className="bg-gray-50 rounded-xl rounded-tl-sm px-3 py-2 flex items-center gap-2 min-w-[140px]">
        <div className="flex items-end gap-0.5 h-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1 bg-blue-400 rounded-full animate-bounce"
              style={{ height: 4 + i * 2, animationDelay: `${i * 120}ms`, animationDuration: '0.8s' }}
            />
          ))}
        </div>
        <span
          className="text-[11px] text-gray-500 transition-opacity duration-300"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {THINKING_PHRASES[phraseIdx]}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Message Bubble
   ═══════════════════════════════════════════════════════ */

function MessageBubble({ message }: { message: CarpMessage }) {
  const [toolsOpen, setToolsOpen] = useState(false);

  if (message.isLoading) {
    return <ThinkingBubble />;
  }

  if (message.role === 'user') {
    return (
      <div className="flex gap-2 items-start justify-end">
        <div className="bg-slate-900 text-white rounded-xl rounded-tr-sm px-3 py-1.5 max-w-[85%]">
          <p className="text-xs whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant
  return (
    <div className="flex gap-2 items-start">
      <div className="h-5 w-5 rounded-md bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="h-3 w-3 text-slate-400" />
      </div>
      <div className="max-w-[90%] space-y-1.5">
        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div>
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Wrench className="h-2.5 w-2.5" />
              <span>
                {message.toolCalls.length} tool{message.toolCalls.length > 1 ? 's' : ''}
              </span>
              <ChevronDown
                className={`h-2.5 w-2.5 transition-transform ${toolsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {toolsOpen && (
              <div className="mt-1 space-y-1">
                {message.toolCalls.map((tc, i) => (
                  <ToolCallCard key={i} toolCall={tc} result={message.toolResults?.[i]} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Text content */}
        {message.content && (
          <div className="bg-gray-50 rounded-xl rounded-tl-sm px-3 py-1.5">
            <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Tool Call Card
   ═══════════════════════════════════════════════════════ */

function ToolCallCard({
  toolCall,
  result,
}: {
  toolCall: { name: string; args: Record<string, unknown> };
  result?: import('@/lib/carp/tools').ToolResult;
}) {
  const label = toolCall.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="border border-gray-100 rounded-md bg-white text-[10px] overflow-hidden">
      <div className="px-2 py-1 bg-gray-50/50 flex items-center gap-1.5">
        <Wrench className="h-2.5 w-2.5 text-gray-300" />
        <span className="font-medium text-gray-600">{label}</span>
        {result &&
          (result.success ? (
            <Check className="h-2.5 w-2.5 text-emerald-500 ml-auto" />
          ) : (
            <AlertCircle className="h-2.5 w-2.5 text-red-400 ml-auto" />
          ))}
      </div>
      {result && !result.success && result.error && (
        <div className="px-2 py-1 text-red-500 bg-red-50/50">{result.error}</div>
      )}
      {result?.success && result.displayType === 'journal_entry' && result.data != null && (
        <JournalPreview entry={result.data as Record<string, unknown>} />
      )}
      {result?.success && result.displayType === 'confirmation' && (
        <div className="px-2 py-1 text-emerald-600 bg-emerald-50/50 flex items-center gap-1">
          <Check className="h-2.5 w-2.5" /> Done
        </div>
      )}
      {result?.success && result.displayType === 'navigation' && (
        <div className="px-2 py-1 text-blue-600 bg-blue-50/50 flex items-center gap-1">
          <ArrowRight className="h-2.5 w-2.5" /> Navigated
        </div>
      )}
      {result?.success && result.displayType === 'document' && (
        <div className="px-2 py-1 text-violet-600 bg-violet-50/50 flex items-center gap-1">
          <FileText className="h-2.5 w-2.5" /> Document drafted
        </div>
      )}
      {result?.success && result.displayType === 'file' && (
        <div className="px-2 py-1 text-amber-600 bg-amber-50/50 flex items-center gap-1">
          <Download className="h-2.5 w-2.5" /> File created
          {(() => {
            const d = result.data as Record<string, unknown> | null;
            return d && typeof d === 'object' && d.name ? (
              <span className="font-mono text-[9px] ml-1">{String(d.name)}</span>
            ) : null;
          })()}
        </div>
      )}
      {result?.success && result.displayType === 'table' && result.data != null && (
        <ExcelReadPreview data={result.data as Record<string, unknown>} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Excel Read Preview (compact in tool card)
   ═══════════════════════════════════════════════════════ */

function ExcelReadPreview({ data }: { data: Record<string, unknown> }) {
  const headers = data.headers as string[] | undefined;
  const rows = data.rows as string[][] | undefined;
  if (!headers || !rows) return null;
  const preview = rows.slice(0, 4);

  return (
    <div className="px-2 py-1.5 overflow-x-auto">
      <p className="text-[9px] text-gray-400 mb-1">
        Sheet: {String(data.sheet ?? '')} · {String(data.totalRows ?? '')} rows
        {data.hasMore ? ` (showing first ${String(data.returnedRows)})` : ''}
      </p>
      <table className="text-[9px] border-collapse min-w-full">
        <thead>
          <tr className="border-b border-gray-100">
            {headers.slice(0, 6).map((h, i) => (
              <th key={i} className="text-left px-1 py-0.5 font-semibold text-gray-500 whitespace-nowrap">{h}</th>
            ))}
            {headers.length > 6 && <th className="text-gray-400 px-1">…</th>}
          </tr>
        </thead>
        <tbody>
          {preview.map((row, ri) => (
            <tr key={ri} className="border-b border-gray-50">
              {row.slice(0, 6).map((cell, ci) => (
                <td key={ci} className="px-1 py-0.5 text-gray-600 whitespace-nowrap max-w-[80px] truncate">{cell}</td>
              ))}
              {row.length > 6 && <td className="text-gray-400 px-1">…</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Journal Preview (inline in tool card)
   ═══════════════════════════════════════════════════════ */

function JournalPreview({ entry }: { entry: Record<string, unknown> }) {
  const lines = entry?.lines as Array<Record<string, number | string>> | undefined;
  if (!lines) return null;

  return (
    <div className="px-2 py-1.5 space-y-0.5">
      <div className="flex items-center justify-between text-[9px] text-gray-400">
        <span className="font-mono font-bold text-blue-600">
          {String(entry.entry_code ?? '')}
        </span>
        <span>{String(entry.entry_date ?? '')}</span>
      </div>
      <div className="space-y-px font-mono text-[10px]">
        {lines.map((line, i: number) => (
          <div key={i} className="flex justify-between">
            {Number(line.debit) > 0 ? (
              <>
                <span className="text-gray-700">{String(line.account_name)} Dr.</span>
                <span className="font-semibold text-gray-900 tabular-nums">
                  {formatIndianCurrency(Number(line.debit))}
                </span>
              </>
            ) : (
              <>
                <span className="text-gray-400 pl-3">To {String(line.account_name)}</span>
                <span className="font-semibold text-gray-600 tabular-nums">
                  {formatIndianCurrency(Number(line.credit))}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
      {entry.narration != null && (
        <p className="text-[9px] text-gray-400 italic">({String(entry.narration)})</p>
      )}
    </div>
  );
}
