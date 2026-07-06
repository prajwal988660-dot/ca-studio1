'use client';

import { useCompany } from '@/hooks/useCompany';
import { PageHeader } from '@/components/layout/PageHeader';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import type { EntityType } from '@/types/company';
import { FileSpreadsheet } from 'lucide-react';

export default function CostRecordsPage() {
  const { company, loading: companyLoading } = useCompany();

  if (companyLoading || !company) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const entityLabel = ENTITY_TYPES[company.entity_type as EntityType]?.label || company.entity_type;

  return (
    <div>
      <PageHeader
        title="Cost Records & Cost Audit"
        description="Companies (Cost Records and Audit) Rules — specified industries, turnover ≥ ₹35 cr"
      />

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-4">
        <FileSpreadsheet className="w-10 h-10 text-amber-600 shrink-0" />
        <div>
          <h3 className="font-semibold text-amber-800 mb-1">Cost records module (optional)</h3>
          <p className="text-sm text-amber-700 mb-2">
            Cost records (e.g. CRA-1) and cost audit are required for companies in specified industries
            (e.g. sugar, cement, tyres, steel) when turnover from the product is ₹35 crore or more.
          </p>
          <p className="text-sm text-amber-700">
            This module is a placeholder. You can maintain cost records offline or in a separate system
            and use this page as a reminder. When implemented, it will support industry-specific formats
            and cost audit report linkage.
          </p>
        </div>
      </div>
    </div>
  );
}
