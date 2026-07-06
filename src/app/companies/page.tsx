import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listCompanies, deleteCompany } from '@/lib/offlineDb';
import { ENTITY_TYPES, type EntityType } from '@/lib/constants/entityTypes';
import { Plus, Search, Trash2, ArrowRight, Building2, PhoneCall, Phone, Award, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { Company } from '@/types/company';
import SignUpForm, { type UserRegistration } from './SignUpForm';

const ENTITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  sole_proprietorship: { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-100' },
  partnership:        { bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-100' },
  llp:                { bg: 'bg-indigo-50',  text: 'text-indigo-700', border: 'border-indigo-100' },
  opc:                { bg: 'bg-sky-50',     text: 'text-sky-700',    border: 'border-sky-100' },
  pvt_ltd:            { bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-100' },
  public_ltd:         { bg: 'bg-teal-50',    text: 'text-teal-700',   border: 'border-teal-100' },
  huf:                { bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-100' },
  trust:              { bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-100' },
  society:            { bg: 'bg-rose-50',    text: 'text-rose-700',   border: 'border-rose-100' },
  section8:           { bg: 'bg-pink-50',    text: 'text-pink-700',   border: 'border-pink-100' },
  aop_boi:            { bg: 'bg-lime-50',    text: 'text-lime-700',   border: 'border-lime-100' },
  cooperative:        { bg: 'bg-cyan-50',    text: 'text-cyan-700',   border: 'border-cyan-100' },
};

// Read registration status synchronously — runs once before the very first render.
// This means the form can NEVER appear if the user has already registered,
// regardless of navigation method (browser back, direct URL, refresh, etc.).
function readRegistration(): UserRegistration | null {
  if (typeof window === 'undefined') return null;
  try {
    const alreadyRegistered = localStorage.getItem('ca_studio_registered') === '1';
    const raw = localStorage.getItem('ca_user_registration');
    if (raw) {
      return JSON.parse(raw) as UserRegistration;
    }
    if (alreadyRegistered) {
      // Sentinel flag set but full JSON missing — treat as registered with placeholder
      return { name: '', phone: '', email: '', state: '', city: '', profession: '', expertise: [] };
    }
  } catch {
    // If anything goes wrong, fall back to showing the form
  }
  return null;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  // Lazy initializer: localStorage is read synchronously on first render — no async delay.
  const [registrationData, setRegistrationData] = useState<UserRegistration | null>(readRegistration);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Load companies list whenever we have registration data
  useEffect(() => {
    if (registrationData) {
      setCompanies(listCompanies());
      setLoading(false);
    }
  }, [registrationData]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return companies.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (ENTITY_TYPES[c.entity_type as EntityType]?.label ?? '').toLowerCase().includes(q) ||
      (c.entity_details?.pan ?? '').toLowerCase().includes(q)
    );
  }, [companies, search]);

  // Guard: if not registered, show the form. Because readRegistration() runs
  // synchronously, this decision is made on the very first render — no spinner,
  // no flash, no way for a registered user to ever see this form again.
  if (!registrationData) {
    return <SignUpForm onSuccess={(data) => setRegistrationData(data)} />;
  }

  const handleDelete = (e: React.MouseEvent, company: Company) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${company.name}"?\n\nAll journal entries for this company will be permanently deleted.`)) return;
    deleteCompany(company.id);
    setCompanies(listCompanies());
    setLoading(false);
    toast.success(`${company.name} deleted`);
  };

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return ''; }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero header ── */}
      <header className="px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="hero max-w-6xl mx-auto px-6 sm:px-8 py-7 flex items-center justify-between gap-4">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border border-white/10" />
          <div className="relative">
            <p className="hero-muted text-xs font-semibold mb-1.5">Professional accounting software for India</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              <span className="hero-accent">CA</span> Studio Workspace
            </h1>
          </div>
          <Link
            to="/companies/create"
            className="btn-pill-primary relative shrink-0"
          >
            <Plus className="h-4 w-4" />
            New Company
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>

        ) : companies.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="icon-badge mb-5" style={{ width: '4rem', height: '4rem' }}>
              <Building2 className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">No companies yet</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">
              Create your first company to start managing journal entries and financial statements.
            </p>
            <Link to="/companies/create" className="btn-pill-primary">
              <Plus className="h-4 w-4" />
              Create First Company
            </Link>
          </div>

        ) : (
          <>
            {/* ── Toolbar ── */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {filtered.length} {filtered.length === 1 ? 'Company' : 'Companies'}
                </p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, entity type, PAN…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-full w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 shadow-sm"
                />
              </div>
            </div>

            {/* ── Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(company => {
                const meta   = ENTITY_TYPES[company.entity_type as EntityType];
                const colors = ENTITY_COLORS[company.entity_type] ?? { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };
                return (
                  <Link
                    key={company.id}
                    to={`/company/${company.id}`}
                    className="stat-card group hover:border-blue-200 !p-5 block"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="icon-badge icon-badge-sm mt-0.5"><Building2 className="h-4 w-4" /></span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 truncate group-hover:text-blue-700 transition-colors text-sm">
                            {company.name}
                          </h3>
                          <span className={`inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
                            {meta?.shortLabel ?? company.entity_type}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={e => handleDelete(e, company)}
                        className="ml-2 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete company"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1 text-xs text-gray-500">
                      {company.entity_details?.pan && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 w-12 shrink-0">PAN</span>
                          <span className="font-mono font-medium text-gray-700">{company.entity_details.pan}</span>
                        </div>
                      )}
                      {company.gst_status !== 'unregistered' && company.gst_details?.gstin && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 w-12 shrink-0">GSTIN</span>
                          <span className="font-mono font-medium text-gray-700 truncate">{company.gst_details.gstin}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400 w-12 shrink-0">Method</span>
                        <span>{company.accounting_method === 'mercantile' ? 'Accrual (Mercantile)' : 'Cash Basis'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <span className="text-[11px] text-gray-400">
                        {fmtDate(company.created_at)}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* ── Contact Us Banner ── */}
        <footer className="mt-12 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm shadow-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 bg-gradient-to-b from-blue-600 to-indigo-600 h-full" />
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Questions or need assistance?</h3>
              <p className="text-xs text-slate-550 mt-0.5 leading-relaxed font-medium">
                You can pre-register for upcoming modules or get support from our activation agents immediately.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button onClick={() => setShowDetailsModal(true)} className="flex-1 md:flex-none inline-flex items-center justify-center h-10 px-5 text-xs font-bold text-slate-650 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm cursor-pointer">
              View Registered Profile
            </button>
            <div className="flex-1 md:flex-none inline-flex flex-col items-center justify-center gap-0.5 h-10 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-[0_3px_10px_0_rgba(37,99,235,0.25)]">
              <span className="text-[10px] font-semibold opacity-80 leading-none">Pre-register / Contact Us</span>
              <span className="text-xs font-bold tracking-wide leading-none">9740018205 &nbsp;·&nbsp; 87222 51178</span>
            </div>
          </div>
        </footer>

        {/* ── Registered Profile Details Modal ── */}
        {showDetailsModal && registrationData && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowDetailsModal(false)}>
            <div className="bg-white border border-slate-200 rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">User Settings</p>
                  <p className="text-base font-black text-slate-900 mt-0.5">Registered Profile Details</p>
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</span>
                    <span className="text-sm font-bold text-slate-800 mt-0.5 block">{registrationData.name}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</span>
                    <span className="text-sm font-bold text-slate-800 mt-0.5 block font-mono">{registrationData.phone}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</span>
                    <span className="text-sm font-bold text-slate-800 mt-0.5 block font-mono">{registrationData.email}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">State</span>
                    <span className="text-sm font-bold text-slate-800 mt-0.5 block">{registrationData.state}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">City</span>
                    <span className="text-sm font-bold text-slate-800 mt-0.5 block">{registrationData.city}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Profession</span>
                    <span className="text-sm font-bold text-slate-800 mt-0.5 block capitalize">
                      {registrationData.profession.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Areas of Expertise</span>
                  <div className="flex flex-wrap gap-1.5">
                    {registrationData.expertise.map(exp => (
                      <span key={exp} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-xs font-bold text-blue-700">
                        <Award className="h-3 w-3 shrink-0" />
                        {exp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <button onClick={() => {
                  setShowDetailsModal(false);
                  localStorage.removeItem('ca_user_registration');
                  setRegistrationData(null);
                }} className="w-full h-11 text-xs font-bold text-red-650 hover:bg-red-50 hover:border-red-200 border border-transparent rounded-xl transition-all cursor-pointer">
                  Update Registered Info
                </button>
                <button onClick={() => setShowDetailsModal(false)} className="w-full h-11 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
