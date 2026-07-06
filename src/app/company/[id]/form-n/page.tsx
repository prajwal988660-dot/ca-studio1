'use client';

import { useCompany } from '@/hooks/useCompany';
import { PageHeader } from '@/components/layout/PageHeader';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import type { EntityType } from '@/types/company';
import { FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FormNPage() {
  const { company, companyId, loading: companyLoading } = useCompany();

  if (companyLoading || !company) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;
  const base = `/company/${companyId}`;

  return (
    <div>
      <PageHeader
        title="Form N (Cooperative)"
        description="State-specific format for P&L and Balance Sheet — audit within 4 months"
      />

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-start gap-4">
        <FileText className="w-10 h-10 text-blue-600 shrink-0" />
        <div>
          <h3 className="font-semibold text-blue-800 mb-1">Form N format</h3>
          <p className="text-sm text-blue-700 mb-3">
            Many state cooperative laws prescribe a Form N (or equivalent) for profit & loss account
            and balance sheet. This page is the entry point for that format when required by your
            state law.
          </p>
          <p className="text-sm text-blue-700 mb-3">
            Use the standard <Link to={`${base}/profit-loss`} className="text-blue-600 underline">Profit & Loss</Link> and{' '}
            <Link to={`${base}/balance-sheet`} className="text-blue-600 underline">Balance Sheet</Link> for
            the underlying data. Form N layout and state-specific line items can be added here in a future update.
          </p>
          <p className="text-xs text-blue-600">
            Cooperative audit is typically required to be completed within 4 months of the close of the financial year.
          </p>
        </div>
      </div>
    </div>
  );
}
