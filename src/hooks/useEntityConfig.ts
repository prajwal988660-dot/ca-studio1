'use client';

import { useMemo } from 'react';
import { getEntityConfig, type EntityConfig } from '@/lib/entityConfig';
import { useCompany } from './useCompany';

export function useEntityConfig(): {
  config: EntityConfig | null;
  loading: boolean;
} {
  const { company, loading } = useCompany();

  const config = useMemo(() => {
    if (!company) return null;
    try {
      return getEntityConfig(company.entity_type);
    } catch {
      return null;
    }
  }, [company]);

  return { config, loading };
}
