'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { migrateOldLedgerNames, type MigrationResult } from '@/lib/dev/migrateLedgerNames';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';

export default function MigrateLedgerNamesPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress({ done: 0, total: 0 });
    try {
      const res = await migrateOldLedgerNames((done, total) => setProgress({ done, total }));
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/companies">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Migrate Ledger Names</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Fix Sub-Group Names in Journal Entries</CardTitle>
            <CardDescription>
              Scans all journal entries across all companies. Where <code>account_name</code> is a COA sub-group
              (e.g. "Other Income", "Employee Benefits Expense", "Suspense &amp; Clearing"),
              it derives the correct ledger name from the narration
              (e.g. "Interest on FD / Deposits", "Salary &amp; Wages", "Trade Receivables").
              <br /><br />
              <strong>account_name</strong> = what shows in journal, ledger, cash book (original name).
              <br />
              <strong>account_group</strong> = sub-group for TB / P&amp;L / BS routing (unchanged).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleRun} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running... {progress.total > 0 ? `${progress.done}/${progress.total}` : ''}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Run Migration
                </>
              )}
            </Button>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {result && !error && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-100 px-3 py-2 text-sm text-green-800">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Fixed <span className="font-semibold">{result.updated}</span> entries
                    {' '}out of <span className="font-semibold">{result.scanned}</span> scanned.
                  </span>
                </div>
                {result.sampleFixes.length > 0 && (
                  <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 max-h-64 overflow-y-auto">
                    <p className="text-xs font-medium text-blue-700 mb-2">Sample fixes (first 20):</p>
                    <ul className="text-xs text-blue-800 space-y-1 font-mono">
                      {result.sampleFixes.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
