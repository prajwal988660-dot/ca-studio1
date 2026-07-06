import { useState, useRef, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { BackNav } from '@/components/layout/BackNav';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { CompanyProvider } from '@/contexts/CompanyContext';
import { CarpPanel } from '@/components/carp/CarpPanel';

const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 300;

export default function CompanyLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(210);
  const [alezaOpen, setAlezaOpen] = useState(false);
  const [alezaWidth, setAlezaWidth] = useState(360);
  const sidebarResizing = useRef(false);

  const startSidebarResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      sidebarResizing.current = true;
      const startX = e.clientX;
      const startW = sidebarWidth;

      const onMove = (ev: MouseEvent) => {
        if (!sidebarResizing.current) return;
        const newW = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, startW + (ev.clientX - startX)));
        setSidebarWidth(newW);
      };
      const onUp = () => {
        sidebarResizing.current = false;
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
    [sidebarWidth],
  );

  return (
    <CompanyProvider>
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
        <Header
          onMenuToggle={() => setSidebarOpen((o) => !o)}
          onAlezaToggle={() => setAlezaOpen((o) => !o)}
          alezaOpen={alezaOpen}
        />
        <div className="flex flex-1 min-h-0">
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/30 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <div
            className={`fixed lg:static z-50 lg:z-auto h-full flex flex-col shrink-0 relative
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}
            style={{ width: sidebarOpen ? sidebarWidth : 0, overflow: 'hidden' }}
          >
            <Sidebar onAlezaToggle={() => setAlezaOpen(true)} />
            {/* Resize handle */}
            <div
              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-blue-400/40 transition-colors hidden lg:block"
              onMouseDown={startSidebarResize}
            />
          </div>

          {/* Main content */}
          <main className="flex-1 min-h-0 overflow-auto p-4 min-w-0">
            <BackNav />
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>

          {/* Aleza Panel */}
          <CarpPanel
            open={alezaOpen}
            onClose={() => setAlezaOpen(false)}
            width={alezaWidth}
            onWidthChange={setAlezaWidth}
          />
        </div>
      </div>
    </CompanyProvider>
  );
}
