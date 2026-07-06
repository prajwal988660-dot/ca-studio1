/**
 * Shared workspace CRUD for CARP files stored in localStorage.
 *
 * Dispatches 'workspace-changed' CustomEvent after every mutation
 * so the Sidebar and Folders page can react without polling.
 */

import type { WorkspaceFile } from '@/lib/carp/tools/types';
import { mirrorUpsert, mirrorDelete } from '@/lib/sync/cloudSync';

const WORKSPACE_KEY_PREFIX = 'carp_workspace_';

function notify(companyId: string) {
  window.dispatchEvent(new CustomEvent('workspace-changed', { detail: { companyId } }));
}

export function getWorkspace(companyId: string): WorkspaceFile[] {
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY_PREFIX + companyId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWorkspace(companyId: string, files: WorkspaceFile[]) {
  localStorage.setItem(WORKSPACE_KEY_PREFIX + companyId, JSON.stringify(files));
  notify(companyId);
}

export function addFile(
  companyId: string,
  file: Omit<WorkspaceFile, 'id' | 'created_at' | 'size'>,
): WorkspaceFile {
  const files = getWorkspace(companyId);
  const newFile: WorkspaceFile = {
    id: crypto.randomUUID(),
    ...file,
    created_at: new Date().toISOString(),
    size: new Blob([file.content]).size,
  };
  files.push(newFile);
  saveWorkspace(companyId, files);
  // Fire-and-forget cloud mirror (best-effort, never throws, no-op when offline).
  // WorkspaceFile carries no company_id, so stamp it onto the mirrored row.
  try { mirrorUpsert('workspace_files', { ...newFile, company_id: companyId }); } catch { /* best-effort */ }
  return newFile;
}

export function updateFile(
  companyId: string,
  fileId: string,
  updates: Partial<Pick<WorkspaceFile, 'name' | 'content' | 'type'>>,
): WorkspaceFile | null {
  const files = getWorkspace(companyId);
  const file = files.find((f) => f.id === fileId);
  if (!file) return null;
  if (updates.name !== undefined) file.name = updates.name;
  if (updates.type !== undefined) file.type = updates.type;
  if (updates.content !== undefined) {
    file.content = updates.content;
    file.size = new Blob([updates.content]).size;
  }
  saveWorkspace(companyId, files);
  // Fire-and-forget cloud mirror (best-effort, never throws, no-op when offline).
  try { mirrorUpsert('workspace_files', { ...file, company_id: companyId }); } catch { /* best-effort */ }
  return file;
}

export function deleteFile(companyId: string, fileId: string): WorkspaceFile | null {
  const files = getWorkspace(companyId);
  const idx = files.findIndex((f) => f.id === fileId);
  if (idx === -1) return null;
  const deleted = files.splice(idx, 1)[0];
  saveWorkspace(companyId, files);
  // Fire-and-forget cloud mirror (best-effort, never throws, no-op when offline).
  try { mirrorDelete('workspace_files', fileId); } catch { /* best-effort */ }
  return deleted;
}
