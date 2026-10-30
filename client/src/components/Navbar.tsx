import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Sparkles,
  ShieldCheck,
  Zap,
  BrainCircuit,
  UserCheck,
  KeyRound,
  X,
  Lock,
  LogOut,
  LogIn,
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const Navbar: React.FC = () => {
  const {
    session,
    strictnessMode,
    setStrictnessMode,
    authModalOpen,
    setAuthModalOpen,
    setSession,
    logoutSession,
  } = useAppStore();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [orgInput, setOrgInput] = useState('Apex Global Enterprises');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthFeedback(null);

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput,
          password: passwordInput,
          fullName: nameInput,
          orgName: orgInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setSession(data.session);
      setAuthFeedback({
        type: 'success',
        text: data.message || 'Authenticated with Supabase Cloud!',
      });
      setTimeout(() => {
        setAuthModalOpen(false);
        setAuthFeedback(null);
      }, 900);
    } catch (err) {
      setAuthFeedback({
        type: 'error',
        text: (err as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'x-org-id': session.orgId,
        },
      });
    } catch {
      // ignore
    }
    logoutSession();
    setAuthMode('login');
    setAuthModalOpen(true);
  };

  const isSignedOut = session.isAuthenticated === false || !session.token;

  return (
    <>
      <header className="sticky top-0 z-30 h-16 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between">
        {/* Left: Brand & Organization RLS Badge */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-base">AetherIDP</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Enterprise v2.5
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Gemini Multimodal Extraction & pgvector RAG
              </p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-800">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-medium">{session.orgName}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                RLS Isolated
              </span>
            </span>
          </div>
        </div>

        {/* Right: AI Strictness Switcher & Authenticated Profile */}
        <div className="flex items-center gap-2.5">
          {/* Fast vs Deep Strictness Toggle */}
          <div className="hidden sm:flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setStrictnessMode('fast')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                strictnessMode === 'fast'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Fast Extraction using gemini-2.5-flash"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>2.5 Flash</span>
            </button>
            <button
              type="button"
              onClick={() => setStrictnessMode('deep')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                strictnessMode === 'deep'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Deep Financial/Legal Analysis using gemini-2.5-pro"
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>2.5 Pro Deep</span>
            </button>
          </div>

          {isSignedOut ? (
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-2.5 pl-2.5 pr-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-semibold text-xs">
                  {session.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-semibold text-slate-200 leading-none">
                    {session.fullName}
                  </div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3 h-3" />
                    {session.email}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                title="Terminate Session (Logout)"
                className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Supabase Auth Registration / Login Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-white text-sm">
                  Supabase Cloud Authentication & RLS
                </h3>
              </div>
              <button
                onClick={() => setAuthModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 p-2 bg-slate-950 border-b border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthFeedback(null);
                }}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  authMode === 'register'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register New Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthFeedback(null);
                }}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  authMode === 'login'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In Existing User
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="p-6 space-y-4">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="e.g., Surya Prakash"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      value={orgInput}
                      onChange={(e) => setOrgInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Email Address (Supabase Auth)
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="analyst@enterprise.com"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Password (min 6 characters)
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {authFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                    authFeedback.type === 'success'
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                  }`}
                >
                  {authFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{authFeedback.text}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2">
                <KeyRound className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  Creates a real user in <strong>Supabase Dashboard → Authentication</strong> and
                  provisions your linked record in `public.profiles`.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5" />
                  )}
                  <span>{authMode === 'register' ? 'Create Account' : 'Sign In'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
