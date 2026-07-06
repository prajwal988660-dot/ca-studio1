'use client';

import { Link } from 'react-router-dom';
import { EntityBadge } from './EntityBadge';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import type { Company } from '@/types/company';
import * as LucideIcons from 'lucide-react';

export function CompanyCard({ company }: { company: Company }) {
  const entityConfig = ENTITY_TYPES[company.entity_type as keyof typeof ENTITY_TYPES];
  const iconName = entityConfig?.icon || 'Building2';
  const Icon = (LucideIcons as any)[iconName] || LucideIcons.Building2;

  return (
    <Link to={`/company/${company.id}`}
      className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-200 transition-all group">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
          <Icon className="h-4.5 w-4.5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate text-sm group-hover:text-blue-700 transition-colors">
            {company.name}
          </h3>
          <EntityBadge entityType={company.entity_type} />
        </div>
      </div>
      <div className="text-xs text-gray-500 space-y-1">
        {company.entity_details?.pan && (
          <p><span className="text-gray-400">PAN</span> <span className="font-mono text-gray-700">{company.entity_details.pan}</span></p>
        )}
        {company.gst_status !== 'unregistered' && company.gst_details?.gstin && (
          <p><span className="text-gray-400">GSTIN</span> <span className="font-mono text-gray-700">{company.gst_details.gstin}</span></p>
        )}
        <p className="text-gray-400">{entityConfig?.itrForm} · {company.accounting_method === 'mercantile' ? 'Accrual' : 'Cash'}</p>
      </div>
    </Link>
  );
}
