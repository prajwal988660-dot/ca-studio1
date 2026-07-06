import { useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { MASTER_COA, type MasterAccount } from '@/lib/masterCOA';

type Issue =
  | { kind: 'missing_primaryGroup' | 'missing_subGroup' | 'missing_nature'; account: MasterAccount }
  | { kind: 'invalid_primaryGroup' | 'invalid_nature'; account: MasterAccount; value: string }
  | { kind: 'duplicate_name_case_insensitive'; canonical: string; names: string[] };

const VALID_PRIMARY_GROUPS = new Set(['Capital & Liabilities', 'Assets', 'Income', 'Expenses']);
const VALID_NATURES = new Set(['asset', 'liability', 'capital', 'revenue', 'expense']);

function keyOf(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function auditMasterCoa(): { total: number; issues: Issue[] } {
  const issues: Issue[] = [];

  const seen = new Map<string, string[]>();
  for (const a of MASTER_COA) {
    if (!a.primaryGroup) issues.push({ kind: 'missing_primaryGroup', account: a });
    if (!a.subGroup) issues.push({ kind: 'missing_subGroup', account: a });
    if (!a.nature) issues.push({ kind: 'missing_nature', account: a });

    if (a.primaryGroup && !VALID_PRIMARY_GROUPS.has(a.primaryGroup)) {
      issues.push({ kind: 'invalid_primaryGroup', account: a, value: String(a.primaryGroup) });
    }
    if (a.nature && !VALID_NATURES.has(a.nature)) {
      issues.push({ kind: 'invalid_nature', account: a, value: String(a.nature) });
    }

    const k = keyOf(a.name);
    if (!k) continue;
    const arr = seen.get(k) ?? [];
    arr.push(a.name);
    seen.set(k, arr);
  }

  for (const [k, names] of seen.entries()) {
    if (names.length > 1) {
      issues.push({ kind: 'duplicate_name_case_insensitive', canonical: k, names });
    }
  }

  return { total: MASTER_COA.length, issues };
}

export default function CoaAuditPage() {
  const result = useMemo(() => auditMasterCoa(), []);

  return (
    <div>
      <PageHeader
        title="COA Audit (Master)"
        description="Checks that every MASTER_COA account is rooted and unique (case-insensitive)."
      />

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total accounts</p>
            <p className="text-lg font-bold text-gray-900">{result.total}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Issues</p>
            <p className={`text-lg font-bold ${result.issues.length === 0 ? 'text-green-700' : 'text-red-700'}`}>
              {result.issues.length}
            </p>
          </div>
        </div>
      </div>

      {result.issues.length === 0 ? (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
          All master accounts are rooted (primaryGroup/subGroup/nature present and valid) and there are no
          case-insensitive duplicate names.
        </div>
      ) : (
        <div className="mt-4 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-bold text-gray-900">Flagged items</p>
            <p className="text-xs text-gray-500 mt-0.5">Fix the underlying COA data if any are unexpected.</p>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Issue
                  </th>
                  <th className="text-left px-3 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="text-left px-3 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Root
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.issues.map((it, idx) => {
                  if (it.kind === 'duplicate_name_case_insensitive') {
                    return (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="px-3 py-2 text-red-700 font-semibold">Duplicate (case-insensitive)</td>
                        <td className="px-3 py-2 font-mono text-xs">{it.names.join(' | ')}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">key: {it.canonical}</td>
                      </tr>
                    );
                  }

                  const a = it.account;
                  return (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="px-3 py-2 text-red-700 font-semibold">{it.kind}</td>
                      <td className="px-3 py-2">{a.name}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {a.primaryGroup || '—'} / {a.subGroup || '—'} / {a.nature || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

