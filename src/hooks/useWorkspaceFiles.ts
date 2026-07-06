import { useState, useEffect } from 'react';
import { getWorkspace } from '@/lib/workspaceDb';
import type { WorkspaceFile } from '@/lib/carp/tools/types';

export function useWorkspaceFiles(companyId: string | undefined): WorkspaceFile[] {
  const [files, setFiles] = useState<WorkspaceFile[]>(() =>
    companyId ? getWorkspace(companyId) : [],
  );

  useEffect(() => {
    if (!companyId) return;
    setFiles(getWorkspace(companyId));

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ companyId: string }>).detail;
      if (detail?.companyId === companyId) {
        setFiles(getWorkspace(companyId));
      }
    };
    window.addEventListener('workspace-changed', handler);
    return () => window.removeEventListener('workspace-changed', handler);
  }, [companyId]);

  return files;
}
