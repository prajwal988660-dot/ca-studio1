import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { getCompany, updateCompany as updateCompanyLocal } from '@/lib/offlineDb';
import { runCOAMigration } from '@/lib/migrations/migrateCOAGroups';
import { initEntityData } from '@/entities/initEntity';
import { isPvtLtdInitialized } from '@/entities/private-limited/init';
import type { Company } from '@/types/company';

interface CompanyContextValue {
  company: Company | null;
  companyId: string;
  loading: boolean;
  error: string | null;
  updateCompany: (updates: Partial<Company>) => Promise<any>;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const companyId = params?.id as string;
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    runCOAMigration(companyId);

    const fetchCompany = () => {
      const data = getCompany(companyId);
      if (!data) {
        setError('Company not found');
      } else {
        // Auto-init entity data for pvt_ltd if not yet bootstrapped
        if (data.entity_type === 'pvt_ltd' && !isPvtLtdInitialized(data.id)) {
          initEntityData(data);
        }
        setCompany(data);
      }
      setLoading(false);
    };

    fetchCompany();
  }, [companyId]);

  const updateCompany = async (updates: Partial<Company>) => {
    if (!companyId) return;
    const updated = await updateCompanyLocal(companyId, updates);
    if (!updated) {
      throw new Error('Company not found');
    }
    setCompany(updated);
    return updated;
  };

  return (
    <CompanyContext.Provider value={{ company, companyId, loading, error, updateCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompanyContext() {
  return useContext(CompanyContext);
}
