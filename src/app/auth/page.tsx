import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2, Briefcase, Check, ArrowRight, ArrowLeft, User, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

// Access mode is chosen here and persisted; the sidebar reads it (no selector there).
const ACCESS_MODE_KEY = 'ca_access_mode';
type AccessMode = 'professional' | 'business';

const PROFESSIONAL_FEATURES = [
  'Journal, Cash Book & Ledger Accounts',
  'Trial Balance & Schedule III financials',
  'Profit & Loss, Balance Sheet & Notes',
  'Cash Flow & Funds Flow statements',
  'GST — GSTR-1, GSTR-3B, ITC, E-way Bill',
  'Income Tax, TDS & TCS registers',
  'Advance Tax & Deferred Tax',
  'Depreciation & Fixed Assets',
  'Audit, CARO & Directors’ Report',
  'Bank Reconciliation & Bank Import',
  'Tally import (JSON)',
  'Ratio Analysis & special accounts',
];

const BUSINESS_FEATURES = [
  'Sales & Purchase Registers',
  'Sales & Purchase Returns',
  'Bills Receivable & Bills Payable',
  'GST filing & summaries',
  'Bank Accounts',
  'Bank Statement Importer',
  'Cash Flow Statement',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'sign' | 'profile'>('sign');
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  // If a Google OAuth redirect lands back here with a session, advance.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    supabase.auth.getSession().then(({ data }) => { if (data.session) setStep('profile'); });
  }, []);

  // Email sign-in / sign-up — every required field must be filled before continuing.
  const handleSignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && !name.trim()) return toast.error('Please enter your full name.');
    if (!email.trim()) return toast.error('Please enter your email.');
    if (!EMAIL_RE.test(email.trim())) return toast.error('Please enter a valid email address.');
    if (!password) return toast.error('Please enter your password.');
    if (mode === 'signup') {
      if (password.length < 6) return toast.error('Password must be at least 6 characters.');
      if (!confirm) return toast.error('Please confirm your password.');
      if (password !== confirm) return toast.error('Passwords do not match.');
    }
    toast.success(mode === 'login' ? 'Signed in' : 'Account created');
    setStep('profile');
  };

  const signInWithGoogle = async () => {
    if (isSupabaseConfigured && supabase) {
      setBusy(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth` },
      });
      if (error) { toast.error(error.message); setBusy(false); }
      // success → browser redirects to Google; useEffect picks up the session on return
    } else {
      toast.success('Signed in with Google');
      setStep('profile');
    }
  };

  const selectProfile = (m: AccessMode) => {
    try { localStorage.setItem(ACCESS_MODE_KEY, m); } catch { /* ignore */ }
    toast.success(`Continuing as ${m === 'professional' ? 'Professional' : 'Business'}`);
    navigate('/companies');
  };

  // ── Step 2: choose profile ─────────────────────────────────────────────────
  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-5xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Choose your workspace</h2>
              <p className="text-sm text-gray-500 mt-0.5">Select the profile that fits you — it tailors the menu to what you need.</p>
            </div>
            <button onClick={() => setStep('sign')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-blue-600 transition-colors shrink-0">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <ProfileCard icon={<Building2 className="h-5 w-5" />} title="Professional"
              subtitle="For Chartered Accountants & accountants" features={PROFESSIONAL_FEATURES}
              onSelect={() => selectProfile('professional')} />
            <ProfileCard icon={<Briefcase className="h-5 w-5" />} title="Businessman"
              subtitle="For business owners & traders" features={BUSINESS_FEATURES}
              onSelect={() => selectProfile('business')} />
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1: sign in / sign up (split card) ─────────────────────────────────
  const inp = "w-full h-11 pl-11 pr-4 text-sm bg-gray-100 border border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400 transition-colors";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-600 via-blue-600 to-blue-800">
      <div className="w-full max-w-4xl grid md:grid-cols-2 rounded-3xl bg-white overflow-hidden shadow-[0_40px_80px_-20px_rgba(8,40,80,0.45)]">

        {/* ── Left: WELCOME panel ── */}
        <div className="relative hidden md:flex flex-col justify-center p-10 text-white overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700">
          {/* floating bubbles */}
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute bottom-10 left-24 h-32 w-32 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -top-12 -right-10 h-48 w-48 rounded-full bg-blue-400/30" />
          <div className="relative">
            <h2 className="text-4xl font-extrabold tracking-tight leading-none">WELCOME</h2>
            <p className="mt-3 text-sm font-bold uppercase tracking-[0.2em] text-white/90">CA Studio</p>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/80">
              Your complete accounting workspace — ledgers, GST, financial statements and Tally import, all in one place.
            </p>
          </div>
        </div>

        {/* ── Right: form ── */}
        <div className="p-8 sm:p-10">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {mode === 'login' ? 'Welcome back — please enter your details.' : 'Fill in all details to create your account.'}
          </p>

          <form onSubmit={handleSignSubmit} className="mt-6 space-y-3.5">
            {mode === 'signup' && (
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
              </div>
            )}
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className={`${inp} pr-16`} type={showPwd ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
              <button type="button" onClick={() => setShowPwd((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700">
                {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {showPwd ? 'HIDE' : 'SHOW'}
              </button>
            </div>
            {mode === 'signup' && (
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input className={inp} type={showPwd ? 'text' : 'password'} value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" required />
              </div>
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-between text-xs">
                <label className="inline-flex items-center gap-2 text-gray-600 cursor-pointer select-none">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  Remember me
                </label>
                <button type="button" onClick={() => toast.info('Password reset is not available in offline mode.')}
                  className="font-bold text-blue-600 hover:text-blue-700">Forgot Password?</button>
              </div>
            )}

            <button type="submit" disabled={busy}
              className="btn-pill-primary w-full h-11 mt-1 disabled:opacity-60">
              {mode === 'login' ? 'Sign in' : 'Create account'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Or divider */}
          <div className="flex items-center gap-3 my-4">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Or</span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Google */}
          <button type="button" onClick={signInWithGoogle} disabled={busy}
            className="w-full h-11 inline-flex items-center justify-center gap-2.5 rounded-full border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60">
            <GoogleIcon /> Continue with Google
          </button>

          {/* toggle */}
          <p className="text-center text-xs text-gray-500 mt-5">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="font-bold text-blue-600 hover:text-blue-700">
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function ProfileCard({
  icon, title, subtitle, features, onSelect,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  features: string[];
  onSelect: () => void;
}) {
  return (
    <div className="stat-card !p-0 flex flex-col h-[460px] overflow-hidden">
      <div className="flex items-center gap-3 p-5 border-b border-gray-100">
        <span className="icon-badge"><span className="text-white">{icon}</span></span>
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold tracking-tight text-gray-900 leading-tight">{title}</h3>
          <p className="text-xs text-gray-500 truncate">{subtitle}</p>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">What you get</p>
        <ul className="space-y-2.5">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Check className="h-3 w-3" />
              </span>
              <span className="leading-snug">{f}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-4 border-t border-gray-100">
        <button onClick={onSelect} className="btn-pill-primary w-full">
          Select
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
