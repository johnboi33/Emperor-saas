import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  Crown,
  X,
  Lock,
  Mail,
  User,
  Building,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface AuthModalProps {
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialMode = 'login',
  onClose,
  onSuccess
}) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('Home Services / Contractors');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({
          businessName,
          email,
          password,
          fullName,
          industry
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCreds = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Emperor2026!');
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0c1425] border border-[#29447e] rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-[#beccea] hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#fca311] to-[#d68502] flex items-center justify-center text-black mx-auto shadow-md">
            <Crown className="w-7 h-7 fill-black stroke-black" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            {mode === 'login' ? 'Sign In to Workspace' : 'Create Organization Workspace'}
          </h2>
          <p className="text-xs text-[#beccea]">
            {mode === 'login'
              ? 'Access your leads, sales pipeline, and human handoff queue.'
              : 'Launch a private, tenant-isolated CRM environment in 10 seconds.'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs">
            {error}
          </div>
        )}

        {/* Demo Fast-Login Strip (Only on login mode) */}
        {mode === 'login' && (
          <div className="p-3 bg-[#080d19] rounded-2xl border border-[#29447e]/50 space-y-2">
            <span className="text-[10px] font-mono uppercase text-[#fca311] font-bold block text-center">
              Instant Demo Workspaces (Click to Fill)
            </span>
            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => fillDemoCreds('marcus@apexhvac.com')}
                className="p-2 rounded-lg bg-[#14213d] hover:bg-[#29447e] text-[11px] text-white font-medium border border-[#29447e] transition-colors"
              >
                <div className="font-bold text-[#fca311] truncate">Apex HVAC (Owner)</div>
                <div className="text-[10px] text-[#beccea] truncate">marcus@apexhvac.com</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemoCreds('elizabeth@summitlegal.com')}
                className="p-2 rounded-lg bg-[#14213d] hover:bg-[#29447e] text-[11px] text-white font-medium border border-[#29447e] transition-colors"
              >
                <div className="font-bold text-[#fca311] truncate">Summit Legal (Partner)</div>
                <div className="text-[10px] text-[#beccea] truncate">elizabeth@summitlegal.com</div>
              </button>
            </div>
            <div className="text-[10px] text-center text-[#beccea]">
              Password for all demo accounts: <code className="text-white font-mono">Emperor2026!</code>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Business / Organization Name *</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-[#beccea] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Blue Ridge Roofing & Solar"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#080d19] border border-[#29447e] rounded-xl text-white focus:outline-none focus:border-[#fca311]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Your Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#beccea] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Daniel Miller"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#080d19] border border-[#29447e] rounded-xl text-white focus:outline-none focus:border-[#fca311]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Industry Focus</label>
                <select
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-xl text-white focus:outline-none focus:border-[#fca311]"
                >
                  <option value="Home Services / Contractors">Home Services / Contractors</option>
                  <option value="Legal & Advisory">Legal & Financial Advisory</option>
                  <option value="Healthcare & Dental">Healthcare & Dental</option>
                  <option value="Commercial Real Estate">Commercial Real Estate</option>
                  <option value="Marketing & Creative Agency">Marketing & Creative Agency</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-[#beccea] mb-1 font-semibold">Work Email Address *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#beccea] absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="you@yourcompany.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#080d19] border border-[#29447e] rounded-xl text-white focus:outline-none focus:border-[#fca311]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#beccea] mb-1 font-semibold">Password *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#beccea] absolute left-3 top-2.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#080d19] border border-[#29447e] rounded-xl text-white focus:outline-none focus:border-[#fca311]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#fca311] hover:bg-[#d68502] text-black font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : mode === 'login' ? 'Sign In to CRM' : 'Launch Workspace'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center pt-2 border-t border-[#29447e]/40 text-xs text-[#beccea]">
          {mode === 'login' ? (
            <span>
              Don't have an organization yet?{' '}
              <button
                onClick={() => setMode('register')}
                className="text-[#fca311] hover:underline font-bold"
              >
                Register Business
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-[#fca311] hover:underline font-bold"
              >
                Sign In
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
