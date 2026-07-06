import { useState } from 'react';
import { User, Phone, Mail, MapPin, Briefcase, Award, Lock, Sparkles, AlertCircle, Rocket, ShieldCheck, Target } from 'lucide-react';
import { storeProfileInSupabase } from '@/lib/supabase';

export interface UserRegistration {
  name: string;
  phone: string;
  email: string;
  state: string;
  city: string;
  profession: string;
  expertise: string[];
}

interface SignUpFormProps {
  onSuccess: (data: UserRegistration) => void;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Other'
];

const PROFESSIONS = [
  { value: 'ca', label: 'Chartered Accountant (CA)' },
  { value: 'tax_consultant', label: 'Tax Consultant' },
  { value: 'cma', label: 'Certified Management Accountant (CMA)' },
  { value: 'cs', label: 'Company Secretary (CS)' },
  { value: 'bookkeeper', label: 'Bookkeeper / Accountant' },
  { value: 'business_owner', label: 'Business Owner / Entrepreneur' },
  { value: 'student_other', label: 'Student / Other' }
];

const EXPERTISE_OPTIONS = [
  'Income Tax & ITR Filing',
  'GST & Indirect Taxation',
  'Statutory Audit & Assurance',
  'Corporate Law & MCA Compliance',
  'Financial Reporting (GAAP/Ind AS)',
  'Bookkeeping & Management Accounts',
  'Business Advisory & Valuation'
];

export default function SignUpForm({ onSuccess }: SignUpFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [profession, setProfession] = useState('');
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleExpertise = (option: string) => {
    setSelectedExpertise(prev =>
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    );
  };

  const validate = (): Record<string, string> => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Full Name is required';

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      nextErrors.phone = 'Phone number is required';
    } else if (cleanPhone.length < 10) {
      nextErrors.phone = 'Phone number must be at least 10 digits';
    }

    if (!email.trim()) {
      nextErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Please enter a valid email address';
    }

    if (!state) nextErrors.state = 'Please select your state';
    if (!city.trim()) nextErrors.city = 'City is required';
    if (!profession) nextErrors.profession = 'Please select your profession';
    if (selectedExpertise.length === 0) nextErrors.expertise = 'Select at least one expertise';

    setErrors(nextErrors);
    return nextErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentErrors = validate();
    if (Object.keys(currentErrors).length > 0) {
      // Scroll to the first error field immediately (using fresh errors, not stale state)
      const firstErrorKey = Object.keys(currentErrors)[0];
      const element = document.getElementById(`field-${firstErrorKey}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    const registrationData: UserRegistration = {
      name: name.trim(),
      phone: phone.replace(/\D/g, ''),
      email: email.trim(),
      state,
      city: city.trim(),
      profession,
      expertise: selectedExpertise
    };

    try {
      await storeProfileInSupabase(registrationData);
    } catch (err) {
      console.error('Error writing to Supabase:', err);
    }

    // Persist full data + a lightweight sentinel flag.
    // The sentinel ('ca_studio_registered') means the form will never show again
    // on this browser even if the JSON data somehow gets corrupted.
    localStorage.setItem('ca_user_registration', JSON.stringify(registrationData));
    localStorage.setItem('ca_studio_registered', '1');
    setIsSubmitting(false);
    onSuccess(registrationData);
  };

  const fieldClass = "w-full h-11 px-3.5 pl-10 text-sm bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 transition-all duration-200 focus:outline-none focus:ring-[3px] focus:ring-blue-600/15 focus:border-blue-600 focus:bg-white placeholder:text-slate-400 hover:border-slate-300 shadow-sm";
  const labelClass = "block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5";

  const HERO_FEATURES = [
    { Icon: Rocket, title: 'Instant activation', desc: 'Your workspace is ready the moment you continue.' },
    { Icon: ShieldCheck, title: 'Private & secure', desc: 'Details are kept in secured offline storage.' },
    { Icon: Target, title: 'Tailored to you', desc: 'Personalized around your areas of expertise.' },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden">
      {/* Visual background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-400/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-5xl grid lg:grid-cols-[0.85fr_1.15fr] gap-5 items-stretch relative z-10 animate-in fade-in zoom-in-95 duration-500">

        {/* Branding hero panel */}
        <div className="hero p-8 sm:p-10 flex flex-col justify-between gap-10 overflow-hidden">
          <div className="absolute -bottom-20 -right-16 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute top-8 right-10 w-28 h-28 rounded-full bg-[#5B9BFF]/15 blur-2xl pointer-events-none" />

          <div className="relative">
            <span className="icon-badge mb-6">
              <Sparkles className="h-5 w-5" />
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.1]">
              Welcome to <span className="hero-accent">CA Studio</span>
            </h1>
            <p className="hero-muted text-sm mt-4 leading-relaxed max-w-xs">
              Share a few contact details so we can reach you and activate your personalized accounting workspace.
            </p>
          </div>

          <div className="relative space-y-5">
            {HERO_FEATURES.map(({ Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <span className="icon-badge icon-badge-sm mt-0.5">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="hero-muted text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Registration form */}
        <form onSubmit={handleSubmit} className="page-card p-8 sm:p-10 space-y-8">
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b border-gray-100 pb-2">
              01. Basic Contact Details
            </h3>

            {/* Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div id="field-name" className="space-y-1">
                <label className={labelClass}>Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={e => {
                      setName(e.target.value);
                      if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                    }}
                    className={`${fieldClass} ${errors.name ? 'border-red-400 focus:ring-red-150 focus:border-red-500' : ''}`}
                  />
                </div>
                {errors.name && (
                  <p className="text-[11px] text-red-500 font-bold flex items-center gap-1 mt-1 animate-in fade-in duration-200">
                    <AlertCircle className="h-3 w-3" /> {errors.name}
                  </p>
                )}
              </div>

              <div id="field-phone" className="space-y-1">
                <label className={labelClass}>Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={e => {
                      setPhone(e.target.value);
                      if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                    }}
                    className={`${fieldClass} ${errors.phone ? 'border-red-400 focus:ring-red-150 focus:border-red-500' : ''}`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-[11px] text-red-500 font-bold flex items-center gap-1 mt-1 animate-in fade-in duration-200">
                    <AlertCircle className="h-3 w-3" /> {errors.phone}
                  </p>
                )}
              </div>

              <div id="field-email" className="sm:col-span-2 space-y-1">
                <label className={labelClass}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="name@organization.com"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                    }}
                    className={`${fieldClass} ${errors.email ? 'border-red-400 focus:ring-red-150 focus:border-red-500' : ''}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-red-500 font-bold flex items-center gap-1 mt-1 animate-in fade-in duration-200">
                    <AlertCircle className="h-3 w-3" /> {errors.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b border-gray-100 pb-2">
              02. Professional Profile
            </h3>

            {/* Profile Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div id="field-state" className="space-y-1">
                <label className={labelClass}>State</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                  <select
                    value={state}
                    onChange={e => {
                      setState(e.target.value);
                      if (errors.state) setErrors(prev => ({ ...prev, state: '' }));
                    }}
                    className={`${fieldClass} pl-10 pr-8 appearance-none bg-white ${errors.state ? 'border-red-400 focus:ring-red-150 focus:border-red-500' : ''}`}
                  >
                    <option value="">— Select State —</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                  </div>
                </div>
                {errors.state && (
                  <p className="text-[11px] text-red-500 font-bold flex items-center gap-1 mt-1 animate-in fade-in duration-200">
                    <AlertCircle className="h-3 w-3" /> {errors.state}
                  </p>
                )}
              </div>

              <div id="field-city" className="space-y-1">
                <label className={labelClass}>City</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Enter your city"
                    value={city}
                    onChange={e => {
                      setCity(e.target.value);
                      if (errors.city) setErrors(prev => ({ ...prev, city: '' }));
                    }}
                    className={`${fieldClass} ${errors.city ? 'border-red-400 focus:ring-red-150 focus:border-red-500' : ''}`}
                  />
                </div>
                {errors.city && (
                  <p className="text-[11px] text-red-500 font-bold flex items-center gap-1 mt-1 animate-in fade-in duration-200">
                    <AlertCircle className="h-3 w-3" /> {errors.city}
                  </p>
                )}
              </div>

              <div id="field-profession" className="sm:col-span-2 space-y-1">
                <label className={labelClass}>Profession</label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                  <select
                    value={profession}
                    onChange={e => {
                      setProfession(e.target.value);
                      if (errors.profession) setErrors(prev => ({ ...prev, profession: '' }));
                    }}
                    className={`${fieldClass} pl-10 pr-8 appearance-none bg-white ${errors.profession ? 'border-red-400 focus:ring-red-150 focus:border-red-500' : ''}`}
                  >
                    <option value="">— Select Profession —</option>
                    {PROFESSIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                  </div>
                </div>
                {errors.profession && (
                  <p className="text-[11px] text-red-500 font-bold flex items-center gap-1 mt-1 animate-in fade-in duration-200">
                    <AlertCircle className="h-3 w-3" /> {errors.profession}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div id="field-expertise" className="space-y-6">
            <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                03. Areas of Expertise
              </h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Select all that apply</span>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {EXPERTISE_OPTIONS.map(opt => {
                const active = selectedExpertise.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      toggleExpertise(opt);
                      if (errors.expertise) setErrors(prev => ({ ...prev, expertise: '' }));
                    }}
                    className={`h-9 px-4 text-xs font-semibold rounded-full border transition-all duration-300 flex items-center gap-2 cursor-pointer
                      ${active
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100/50'}`}
                  >
                    <Award className="h-3.5 w-3.5 shrink-0" />
                    {opt}
                  </button>
                );
              })}
            </div>
            {errors.expertise && (
              <p className="text-[11px] text-red-500 font-bold flex items-center gap-1 animate-in fade-in duration-200">
                <AlertCircle className="h-3 w-3" /> {errors.expertise}
              </p>
            )}
          </div>

          {/* Footer Submit Button */}
          <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              <Lock className="h-3.5 w-3.5" /> Secured offline storage
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-pill-primary w-full sm:w-auto h-11 px-8 hover:scale-[1.01] disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4.5 w-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
                  Activating Workspace...
                </>
              ) : (
                <>
                  Continue to Dashboard
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
