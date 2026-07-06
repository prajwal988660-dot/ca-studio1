import { Link } from 'react-router-dom';
import { ChevronRight, Settings, Menu, Layers } from 'lucide-react';
import { useCompany } from '@/hooks/useCompany';
import { ENTITY_TYPES, type EntityType } from '@/lib/constants/entityTypes';

interface HeaderProps {
  onMenuToggle?: () => void;
  onAlezaToggle?: () => void;
  alezaOpen?: boolean;
}

export function Header({ onMenuToggle, onAlezaToggle, alezaOpen }: HeaderProps) {
  const { company, loading } = useCompany();

  if (loading) {
    return (
      <header className="h-9 bg-white border-b border-gray-200 flex items-center px-3 shrink-0 z-30">
        <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
      </header>
    );
  }

  if (!company) return null;

  const meta = ENTITY_TYPES[company.entity_type as EntityType];

  return (
    <header className="h-9 bg-white border-b border-gray-200 flex items-center px-3 gap-2 shrink-0 z-30 sticky top-0 select-none">
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
          title="Toggle sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}

      <Link
        to="/companies"
        className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
        title="All Companies"
      >
        <Layers className="h-3.5 w-3.5" />
      </Link>

      <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />

      <span className="text-xs font-semibold text-gray-800 truncate max-w-[150px] sm:max-w-[260px]">
        {company.name}
      </span>

      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold shrink-0 border border-blue-100 leading-tight">
        {meta?.shortLabel ?? company.entity_type}
      </span>

      <div className="flex-1" />

      {onAlezaToggle && (
        <button
          onClick={onAlezaToggle}
          className={`h-6 px-3.5 rounded-full text-xs font-semibold transition-all ${
            alezaOpen
              ? 'bg-[var(--hero)] text-white'
              : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50 border border-gray-200'
          }`}
          title="Aleza AI Agent"
        >
          Aleza
        </button>
      )}

      <Link
        to={`/company/${company.id}/settings`}
        className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        title="Settings"
      >
        <Settings className="h-3.5 w-3.5" />
      </Link>
    </header>
  );
}
