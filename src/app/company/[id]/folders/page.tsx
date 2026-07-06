import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCompany } from '@/hooks/useCompany';
import { getWorkspace, updateFile, deleteFile } from '@/lib/workspaceDb';
import type { WorkspaceFile } from '@/lib/carp/tools/types';
import { Download, Trash2, Eye, Code, FolderOpen, FileText } from 'lucide-react';

/* ── A4 dimensions at 96dpi ── */
const A4_W = 794;
const A4_H = 1123;
const A4_PAD = 80; // px margin inside page

/* ── helpers ── */
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function inferType(name: string): WorkspaceFile['type'] {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'csv') return 'csv';
  if (ext === 'md') return 'markdown';
  if (ext === 'json') return 'json';
  return 'text';
}

/* ── CSV viewer ── */
function CsvTable({ content }: { content: string }) {
  const rows = useMemo(() => {
    const lines = content.split('\n').filter(Boolean);
    return lines.map((line) => {
      const cells: string[] = [];
      let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
        else if (c === ',' && !inQ) { cells.push(cur); cur = ''; }
        else cur += c;
      }
      cells.push(cur);
      return cells;
    });
  }, [content]);

  if (!rows.length) return <p className="text-sm text-gray-400 italic">Empty CSV</p>;
  const [headers, ...body] = rows;
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-300">
            {headers.map((h, i) => <th key={i} className="text-left px-3 py-2 font-semibold text-gray-700">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="border-b border-gray-100">
              {row.map((cell, ci) => <td key={ci} className="px-3 py-1.5 text-gray-600">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Markdown viewer ── */
function MdPreview({ content }: { content: string }) {
  const html = useMemo(() => {
    let o = content
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;margin:16px 0 6px">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 style="font-size:17px;font-weight:700;margin:20px 0 8px">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 style="font-size:22px;font-weight:800;margin:24px 0 10px">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:#f3f4f6;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:12px">$1</code>')
      .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">')
      .replace(/^- (.+)$/gm, '<li style="margin-left:20px;list-style-type:disc;margin-bottom:2px">$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li style="margin-left:20px;list-style-type:decimal;margin-bottom:2px">$1</li>')
      .replace(/\n\n/g, '</p><p style="margin:0 0 12px;line-height:1.7;color:#374151">')
      .replace(/\n/g, '<br/>');
    return `<p style="margin:0 0 12px;line-height:1.7;color:#374151">${o}</p>`;
  }, [content]);
  return <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px' }} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ── A4 Page wrapper ── */
function A4Page({ children, pageNum, totalPages }: { children: React.ReactNode; pageNum: number; totalPages: number }) {
  return (
    <div
      style={{
        width: A4_W,
        minHeight: A4_H,
        background: '#fff',
        boxShadow: '0 2px 20px rgba(0,0,0,0.13)',
        position: 'relative',
        padding: A4_PAD,
        boxSizing: 'border-box',
        marginBottom: 24,
      }}
    >
      {children}
      {/* Page number */}
      <div
        style={{
          position: 'absolute',
          bottom: 28,
          right: 36,
          fontSize: 10,
          color: '#9ca3af',
          fontFamily: 'system-ui',
          userSelect: 'none',
        }}
      >
        {pageNum} / {totalPages}
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function FoldersPage() {
  const { companyId } = useCompany();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileId = searchParams.get('file');

  const [file, setFile] = useState<WorkspaceFile | null>(null);
  const [content, setContent] = useState('');
  const [savedStatus, setSavedStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showRaw, setShowRaw] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* load file when fileId or companyId changes */
  useEffect(() => {
    if (!companyId || !fileId) { setFile(null); return; }
    const files = getWorkspace(companyId);
    const f = files.find((x) => x.id === fileId) ?? null;
    setFile(f);
    setContent(f?.content ?? '');
    setSavedStatus('saved');
    setShowRaw(false);
  }, [companyId, fileId]);

  /* auto-save: debounce 800ms */
  const handleContentChange = useCallback((val: string) => {
    setContent(val);
    setSavedStatus('unsaved');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!companyId || !fileId) return;
      setSavedStatus('saving');
      updateFile(companyId, fileId, { content: val });
      setFile((prev) => prev ? { ...prev, content: val, size: new Blob([val]).size } : prev);
      setSavedStatus('saved');
    }, 800);
  }, [companyId, fileId]);

  /* cleanup timer on unmount */
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const handleDownload = () => {
    if (!file) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = file.name; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = () => {
    if (!file || !companyId) return;
    deleteFile(companyId, file.id);
    navigate(`/company/${companyId}/folders`);
  };

  /* calculate pages from content length */
  const charsPerPage = 2800; // approximate
  const totalPages = Math.max(1, Math.ceil((content.length || 1) / charsPerPage));

  /* split content into pages for display */
  const pages = useMemo(() => {
    if (!file || file.type === 'csv') return [content];
    if (file.type === 'markdown' && !showRaw) return [content];
    // For text/json/raw-md: split into A4 chunks
    const result: string[] = [];
    for (let i = 0; i < Math.max(1, totalPages); i++) {
      result.push(content.slice(i * charsPerPage, (i + 1) * charsPerPage));
    }
    return result;
  }, [content, file, showRaw, totalPages, charsPerPage]);

  /* ── No file selected ── */
  if (!fileId || !file) {
    return (
      <div className="-m-4 sm:-m-6 flex items-center justify-center" style={{ minHeight: 'calc(100vh - 56px)', background: '#e8eaed' }}>
        <div className="text-center">
          <FolderOpen className="h-14 w-14 text-gray-300 mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-500 mb-1">No file open</p>
          <p className="text-xs text-gray-400">
            Right-click <strong>WORKSPACE</strong> in the sidebar to create a file,<br />
            or ask CARP to generate a report.
          </p>
        </div>
      </div>
    );
  }

  const isEditable = file.type !== 'csv';

  return (
    <div className="flex flex-col -m-4 sm:-m-6" style={{ minHeight: 'calc(100vh - 56px)', background: '#e8eaed' }}>
      {/* Toolbar bar — slim, above the A4 canvas */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <FileText className="h-4 w-4 text-gray-400 shrink-0" />
        <span className="text-sm font-semibold text-gray-800 truncate flex-1">{file.name}</span>
        <span className="text-[11px] text-gray-400 hidden sm:block">{formatDate(file.created_at)}</span>

        {/* Save status */}
        <span className={`text-[11px] font-medium transition-colors ${
          savedStatus === 'saved' ? 'text-green-500' :
          savedStatus === 'saving' ? 'text-amber-500' : 'text-gray-400'
        }`}>
          {savedStatus === 'saved' ? '✓ Saved' : savedStatus === 'saving' ? 'Saving…' : '● Unsaved'}
        </span>

        {/* Markdown raw/preview toggle */}
        {file.type === 'markdown' && (
          <button
            onClick={() => setShowRaw(!showRaw)}
            title={showRaw ? 'Preview' : 'Edit source'}
            className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {showRaw ? <Eye className="h-3.5 w-3.5" /> : <Code className="h-3.5 w-3.5" />}
          </button>
        )}

        <button onClick={handleDownload} title="Download" className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
          <Download className="h-3.5 w-3.5" />
        </button>
        <button onClick={handleDelete} title="Delete file" className="p-1.5 rounded text-red-300 hover:text-red-600 hover:bg-red-50 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* A4 canvas scroll area */}
      <div className="flex-1 overflow-auto py-8 flex flex-col items-center">

        {/* CSV: single A4 page with table */}
        {file.type === 'csv' && (
          <A4Page pageNum={1} totalPages={1}>
            <CsvTable content={content} />
          </A4Page>
        )}

        {/* Markdown preview (multi-page is handled by wrapping) */}
        {file.type === 'markdown' && !showRaw && (
          <A4Page pageNum={1} totalPages={1}>
            <MdPreview content={content} />
          </A4Page>
        )}

        {/* Text / JSON / markdown-raw: paginated textarea */}
        {(file.type !== 'csv' && (file.type !== 'markdown' || showRaw)) && (
          pages.map((chunk, idx) => (
            <A4Page key={idx} pageNum={idx + 1} totalPages={totalPages}>
              {idx === 0 ? (
                /* first page: editable textarea */
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  spellCheck={false}
                  placeholder={file.type === 'json' ? '{}' : 'Start typing…'}
                  style={{
                    width: '100%',
                    minHeight: A4_H - A4_PAD * 2 - 30,
                    height: Math.max(A4_H - A4_PAD * 2 - 30, content.split('\n').length * 20),
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: file.type === 'json' ? 'monospace' : 'Georgia, serif',
                    fontSize: file.type === 'json' ? 13 : 14,
                    lineHeight: 1.75,
                    color: '#1f2937',
                    background: 'transparent',
                    padding: 0,
                  }}
                />
              ) : (
                /* overflow pages: read-only display */
                <pre style={{
                  fontFamily: file.type === 'json' ? 'monospace' : 'Georgia, serif',
                  fontSize: 14, lineHeight: 1.75, color: '#1f2937',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                }}>
                  {chunk}
                </pre>
              )}
            </A4Page>
          ))
        )}
      </div>
    </div>
  );
}
