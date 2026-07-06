'use client';

import { useState, useEffect, useRef } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { ENTITY_TYPES } from '@/lib/constants/entityTypes';
import type { EntityType } from '@/types/company';
import { Calculator, FileText, CheckCircle, Shield, Lock, LockKeyhole } from 'lucide-react';

// ITR form applicable per entity type
const ENTITY_ITR_MAP: Record<string, string> = {
  llp:          'ITR-5',
  partnership:  'ITR-5',
  aop:          'ITR-5',
  boi:          'ITR-5',
  trust:        'ITR-7',
  society:      'ITR-7',
  section8:     'ITR-7',
  huf:          'ITR-2 / ITR-3',
  sole_prop:    'ITR-3 / ITR-4',
  ngo:          'ITR-7',
  cooperative:  'ITR-5',
};

// Entity types that use ITR-6 (company returns)
const COMPANY_ENTITY_TYPES = ['pvt_ltd', 'bulk_pvt_ltd', 'opc', 'public_ltd'];

export default function IncomeTaxDashboard() {
  const { company, loading } = useCompany();
  const [activeTab, setActiveTab] = useState<'calc' | 'itr'>('itr');
  const [itrForm, setItrForm] = useState<'itr1' | 'itr2'>('itr1');
  const [taxPayload, setTaxPayload] = useState<Record<string, number> | null>(null);
  const [showLetter, setShowLetter] = useState(false);

  const itr1Ref = useRef<HTMLIFrameElement>(null);
  const itr2Ref = useRef<HTMLIFrameElement>(null);
  const itr6Ref = useRef<HTMLIFrameElement>(null);

  const isCompany = company ? COMPANY_ENTITY_TYPES.includes(company.entity_type) : false;

  // Show letter once per company on first visit
  useEffect(() => {
    if (!company?.id || !isCompany) return;
    const key = `ca_itr6_notice_${company.id}`;
    if (!localStorage.getItem(key)) setShowLetter(true);
  }, [company?.id, isCompany]);

  // Write company data bridge so iframes can auto-fill
  useEffect(() => {
    if (!company) return;
    const bridge = {
      companyName: company.name,
      pan: (company as unknown as Record<string, string>).pan || '',
      gstin: company.gst_details?.gstin || '',
      address: company.entity_details?.address || '',
      fy: '2024-25',
      ay: '2025-26',
    };
    localStorage.setItem('ca_tax_bridge', JSON.stringify(bridge));
  }, [company]);

  // Listen for tax data from IT Calculator iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'TAX_DATA_UPDATED') setTaxPayload(event.data.payload);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Push tax data into ITR iframe when switching to ITR tab
  useEffect(() => {
    if (!taxPayload || activeTab !== 'itr') return;
    const msg = { type: 'HYDRATE_ITR', payload: taxPayload };
    if (isCompany) {
      itr6Ref.current?.contentWindow?.postMessage(msg, '*');
    } else {
      const ref = itrForm === 'itr1' ? itr1Ref : itr2Ref;
      ref.current?.contentWindow?.postMessage(msg, '*');
    }
  }, [activeTab, itrForm, taxPayload, isCompany]);

  const dismissLetter = () => {
    if (company?.id) localStorage.setItem(`ca_itr6_notice_${company.id}`, '1');
    setShowLetter(false);
  };

  if (loading || !company) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const entityType = company.entity_type as EntityType;

  // All other entity types — locked screen
  if (!isCompany && entityType !== 'individual') {
    const entityLabel = ENTITY_TYPES[entityType]?.label || entityType;
    const applicableItr = ENTITY_ITR_MAP[entityType] || 'ITR-5 / ITR-7';
    return (
      <div className="flex h-[calc(100vh-60px)] flex-col">
        <div className="border-b border-gray-100 bg-white px-4 py-2 flex items-center gap-2">
          <LockKeyhole className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-800">Income Tax Returns</span>
          <span className="text-xs text-gray-400">· {entityLabel}</span>
        </div>

        <div className="flex flex-1 items-center justify-center bg-gray-50 p-8">
          <div className="w-full max-w-lg text-center">

            {/* Lock icon */}
            <div className="mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 border-2 border-amber-200">
              <LockKeyhole className="h-9 w-9 text-amber-500" />
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {applicableItr} — Coming Soon
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Applicable for <strong>{entityLabel}</strong>
            </p>

            {/* Notice box */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-5 text-left space-y-3 mb-6">
              <p className="text-sm text-amber-900 leading-relaxed">
                The Income Tax computation and ITR filing module for <strong>{entityLabel}</strong> is
                currently under development and will be available in the upcoming release.
              </p>
              <ul className="space-y-2">
                {[
                  `${applicableItr} filing with full schedule support`,
                  'Auto-import from your financial statements and company records',
                  'AI-assisted form filling — zero manual entry required',
                  'Real-time validation before submission',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-amber-800">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-amber-400 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Security note */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Shield className="h-3.5 w-3.5" />
              <span>128-bit encrypted · Stored locally · Only accessible by you</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-60px)] flex-col">

      {/* ── First-visit formal letter ─────────────────────────────────────────── */}
      {showLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">

            {/* Letter header */}
            <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-8 py-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-blue-200" />
                <span className="text-xs font-semibold uppercase tracking-widest text-blue-200">
                  Income Tax &amp; ITR Filing Module
                </span>
              </div>
              <h2 className="text-xl font-bold text-white">Important Notice</h2>
              <p className="text-sm text-blue-200 mt-0.5">
                Assessment Year 2025-26 &nbsp;·&nbsp; ITR-6 &nbsp;·&nbsp; Private Limited Company
              </p>
            </div>

            {/* Letter body */}
            <div className="max-h-[58vh] overflow-y-auto px-8 py-6 space-y-4 text-sm text-gray-700 leading-relaxed">
              <p className="font-medium text-gray-900 text-base">Dear Sir / Madam,</p>

              <p>
                We extend our warmest greetings and welcome you to the{' '}
                <strong>Income Tax &amp; ITR Filing</strong> module. This module is currently in its{' '}
                <strong>final stages of deployment</strong>, and our development team is diligently working
                towards the timely integration of all applicable ITR forms covering the last three assessment
                years — <strong>AY 2023-24, AY 2024-25, and AY 2025-26</strong>.
              </p>

              {/* Auto-import + AI highlight — prominent */}
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-2">
                  Zero Manual Data Entry — Fully Automated
                </p>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2 text-sm text-green-900">
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                    <span>
                      <strong>All your data will be automatically imported</strong> — company details,
                      financial statements, P&amp;L, balance sheet, TDS records, and more will be pulled
                      directly into the ITR form. There is absolutely no need for manual re-entry or integration.
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-green-900">
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                    <span>
                      <strong>In the second version, our AI will handle all manual work</strong> — it will
                      intelligently fill, review, validate, and optimise every schedule and section of your
                      ITR form on your behalf, with zero effort from your side.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Preview notice */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1.5">
                  You are currently visualising
                </p>
                <p className="font-semibold text-blue-900">
                  ITR-6 &nbsp;·&nbsp; Tax Year 2024-25 &nbsp;·&nbsp; Assessment Year 2025-26
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Applicable for Private Limited Companies not claiming exemption under Section 11 of
                  the Income Tax Act, 1961.
                </p>
              </div>

              {/* What to expect */}
              <div>
                <p className="font-semibold text-gray-900 mb-2">
                  In the final launch of this product, you can expect:
                </p>
                <ul className="space-y-2">
                  {[
                    'All ITR forms simplified and restructured for effortless and guided data entry',
                    'Our AI assistant will be more supportive and actively help in creating and reviewing your returns',
                    'Smart auto-population of data directly from your financial statements, balance sheet, P&L, and company records — significantly reducing manual entry',
                    'Comprehensive real-time validation and cross-checking before submission',
                    'Export-ready XML / JSON in the format accepted by the Income Tax e-filing portal',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Security */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5 flex gap-3">
                <Shield className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-800 text-xs uppercase tracking-wide mb-1">
                    Your Data Security &amp; Privacy
                  </p>
                  <p className="text-gray-600">
                    All your financial data is encoded using <strong>128-bit encryption</strong> and is stored
                    exclusively on your device and only with you. No data is ever transmitted to external
                    servers or shared with any third party. Your records remain entirely private and under
                    your control at all times.
                  </p>
                </div>
              </div>

              {/* Coming soon */}
              <div>
                <p className="font-semibold text-gray-900 mb-1.5">Coming Soon — All ITR Forms:</p>
                <p className="text-gray-600">
                  ITR-1 (Sahaj) &nbsp;·&nbsp; ITR-2 &nbsp;·&nbsp; ITR-3 &nbsp;·&nbsp; ITR-4 (Sugam)
                  &nbsp;·&nbsp; ITR-5 &nbsp;·&nbsp; <strong className="text-blue-700">ITR-6</strong>
                  &nbsp;·&nbsp; ITR-7
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  for Assessment Years 2022-23 &nbsp;·&nbsp; 2023-24 &nbsp;·&nbsp; 2024-25 &nbsp;·&nbsp; 2025-26
                </p>
              </div>

              <p className="text-gray-500">
                We sincerely appreciate your patience and thank you for placing your trust in this platform.
              </p>

              <div>
                <p className="text-gray-900">Warm regards,</p>
                <p className="font-bold text-blue-700 text-base mt-0.5">The Development Team</p>
                <p className="text-xs text-gray-400">Your trusted partner in financial compliance</p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 bg-gray-50 px-8 py-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Lock className="h-3.5 w-3.5" />
                128-bit encrypted &nbsp;·&nbsp; Stored locally &nbsp;·&nbsp; Fully private
              </div>
              <button
                onClick={dismissLetter}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                I Understand, Proceed →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Compact header strip ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-1.5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">Income Tax</span>
          <span className="text-xs text-gray-400">
            {isCompany ? '· AY 2025-26 · ITR-6 · Private Limited' : '· AY 2026-27 · IT Calculator & ITR Filing'}
          </span>
        </div>
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('calc')}
            className={`flex items-center gap-1.5 border-b-2 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'calc'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calculator className="h-3.5 w-3.5" />
            IT Calculator
          </button>
          <button
            onClick={() => setActiveTab('itr')}
            className={`flex items-center gap-1.5 border-b-2 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'itr'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            {isCompany ? 'ITR-6 Form' : 'ITR Filing'}
          </button>
        </div>

        {/* ITR-1 / ITR-2 switcher — individual only */}
        {activeTab === 'itr' && !isCompany && (
          <div className="flex overflow-hidden rounded border border-gray-300">
            <button
              type="button"
              onClick={() => setItrForm('itr1')}
              className={`px-3 py-1 text-[11px] font-semibold transition-colors ${
                itrForm === 'itr1' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              ITR-1 Sahaj
            </button>
            <button
              type="button"
              onClick={() => setItrForm('itr2')}
              className={`border-l border-gray-300 px-3 py-1 text-[11px] font-semibold transition-colors ${
                itrForm === 'itr2' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              ITR-2
            </button>
          </div>
        )}

        {/* AY / form badges — company type */}
        {isCompany && (
          <div className="flex items-center gap-1.5">
            <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
              AY 2025-26
            </span>
            <span className="rounded border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
              ITR-6
            </span>
          </div>
        )}
      </div>

      {/* ── Tax data sync bar ─────────────────────────────────────────────────── */}
      {taxPayload && (
        <div className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50 px-4 py-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700">
            <CheckCircle className="h-3 w-3" />
            Tax data synced
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-gray-500">
              Total Income: <b className="font-mono text-gray-900">₹{(taxPayload.totalIncome || 0).toLocaleString('en-IN')}</b>
            </span>
            <span className="text-gray-500">
              Tax Payable: <b className="font-mono text-red-600">₹{(taxPayload.taxPayable || 0).toLocaleString('en-IN')}</b>
            </span>
          </div>
        </div>
      )}

      {/* ── Iframe containers ─────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden bg-gray-50">

        {/* IT Calculator (both entity types use this) */}
        <iframe
          src={isCompany ? '/tax-utilities/it-calculator.html' : '/tax-utilities/calculator.html'}
          className={`absolute inset-0 h-full w-full border-none ${
            activeTab === 'calc' ? 'z-10' : 'pointer-events-none z-0 opacity-0'
          }`}
          title="IT Calculator"
        />

        {/* Individual: ITR-1 & ITR-2 */}
        {!isCompany && (
          <>
            <iframe
              ref={itr1Ref}
              src="/tax-utilities/itr1.html"
              className={`absolute inset-0 h-full w-full border-none ${
                activeTab === 'itr' && itrForm === 'itr1' ? 'z-10' : 'pointer-events-none z-0 opacity-0'
              }`}
              title="ITR-1 Sahaj"
            />
            <iframe
              ref={itr2Ref}
              src="/tax-utilities/itr2.html"
              className={`absolute inset-0 h-full w-full border-none ${
                activeTab === 'itr' && itrForm === 'itr2' ? 'z-10' : 'pointer-events-none z-0 opacity-0'
              }`}
              title="ITR-2"
            />
          </>
        )}

        {/* Company: ITR-6 */}
        {isCompany && (
          <iframe
            ref={itr6Ref}
            src="/tax-utilities/itr6.html"
            className={`absolute inset-0 h-full w-full border-none ${
              activeTab === 'itr' ? 'z-10' : 'pointer-events-none z-0 opacity-0'
            }`}
            title="ITR-6"
          />
        )}
      </div>
    </div>
  );
}
