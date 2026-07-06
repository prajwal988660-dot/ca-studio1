import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { getCompany, updateCompany as updateCompanyLocal } from '@/lib/offlineDb';
import type { Company } from '@/types/company';

export function useCompany() {
  const ctx = useCompanyContext();
  const params = useParams();
  const companyId = (ctx?.companyId || params?.id) as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(!ctx);
  const [error, setError] = useState<string | null>(null);

  // If context provides company, skip fetch entirely
  const hasContext = !!ctx;

  useEffect(() => {
    if (hasContext || !companyId) {
      setLoading(false);
      return;
    }

    const fetchCompany = () => {
      const data = getCompany(companyId);
      if (!data) {
        setError('Company not found');
      } else {
        setCompany(data);
      }
      setLoading(false);
    };

    fetchCompany();
  }, [companyId, hasContext]);

  if (ctx) {
    return ctx;
  }

  const updateCompany = async (updates: Partial<Company>) => {
    if (!companyId) return;
    const updated = await updateCompanyLocal(companyId, updates);
    if (!updated) {
      throw new Error('Company not found');
    }
    setCompany(updated);
    return updated;
  };

  return { company, companyId, loading, error, updateCompany };
}
