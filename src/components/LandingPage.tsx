import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  Crown,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Kanban,
  AlertOctagon,
  Users,
  Sparkles,
  DollarSign,
  TrendingUp,
  FileText,
  Clock,
  Layers,
  ChevronRight,
  Lock,
  Building,
  X
} from 'lucide-react';

interface LandingPageProps {
  onEnterApp: () => void;
  onOpenRegister: () => void;
  onOpenLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterApp,
  onOpenRegister,
  onOpenLogin
}) => {
  const { user, switchOrganization } = useAuth();

  // ROI Calculator state
  const [monthlyLeads, setMonthlyLeads] = useState(60);
  const [avgDealValue, setAvgDealValue] = useState(2500);

  // Informational modals
  const [modalType, setModalType] = useState<'about' | 'privacy' | 'terms' | null>(null);

  // Calculate estimated saved revenue from 3-minute response automation
  const currentConversion = 0.12; // 12% standard manual conversion
  const improvedConversion = 0.22; // 22% with instant qualification & follow-up
  const additionalDealsPerYear = Math.round((monthlyLeads * (improvedConversion - currentConversion)) * 12);
  const additionalRevenuePerYear = additionalDealsPerYear * avgDealValue;

  const handleLaunchInstantDemo = async () => {
    try {
      await switchOrganization('org_apex_hvac', 'owner');
      onEnterApp();
    } catch (e) {
      onOpenLogin();
    }
  };

  return (
    <div className="min-h-screen bg-[#080d19] text-white flex flex-col selection:bg-[#fca311] selection:text-black">
      {/* Navigation */}
      <header className="h-20 border-b border-[#29447e]/50 px-6 sm:px-12 flex items-center justify-between sticky top-0 bg-[#080d19]/90 backdrop-blur-md z-40">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fca311] to-[#d68502] flex items-center justify-center text-black shadow-lg">
            <Crown className="w-6 h-6 fill-black stroke-black" />
          </div>
          <div>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center gap-1.5">
              EMPEROR <span className="text-[#fca311]">CRM</span>
            </span>
            <span className="text-[10px] tracking-wider uppercase text-[#beccea] font-mono block -mt-1">
              Multi-Tenant SaaS
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#e5e5e5]">
          <a href="#features" className="hover:text-[#fca311] transition-colors">Features</a>
          <a href="#pipeline" className="hover:text-[#fca311] transition-colors">Visual Pipeline</a>
          <a href="#roi-calculator" className="hover:text-[#fca311] transition-colors">ROI Calculator</a>
          <a href="#pricing" className="hover:text-[#fca311] transition-colors">Pricing</a>
          <button onClick={() => setModalType('about')} className="hover:text-[#fca311] transition-colors">About</button>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={onEnterApp}
              className="px-5 py-2.5 bg-[#fca311] hover:bg-[#d68502] text-black font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              <span>Go to Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                onClick={onOpenLogin}
                className="px-4 py-2 text-xs font-semibold text-[#beccea] hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={onOpenRegister}
                className="px-4 py-2 bg-[#fca311] hover:bg-[#d68502] text-black font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-6 sm:px-12 max-w-7xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#14213d] border border-[#29447e] text-xs text-[#beccea]">
          <span className="w-2 h-2 rounded-full bg-[#fca311] animate-pulse" />
          <span>Engineered Exclusively for Local & Small Service Businesses</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Never Lose a High-Value Lead to a <span className="text-[#fca311]">Slow Response</span> Again.
        </h1>

        <p className="text-sm sm:text-lg text-[#beccea] max-w-2xl mx-auto leading-relaxed">
          Small businesses lose over 40% of inquiries due to scattered spreadsheets, forgotten follow-up calls, and unanswered emergency requests. Emperor CRM unifies your pipeline, automates deterministic tasks, and applies AI with strict human-in-the-loop escalation guardrails.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={handleLaunchInstantDemo}
            className="w-full sm:w-auto px-7 py-3.5 bg-[#fca311] hover:bg-[#d68502] text-black font-extrabold text-sm sm:text-base rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <span>Launch Live Interactive Tour</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenRegister}
            className="w-full sm:w-auto px-6 py-3.5 bg-[#14213d] hover:bg-[#29447e] text-white font-bold text-sm sm:text-base rounded-2xl border border-[#29447e] transition-all"
          >
            Register Your Business (14-Day Free Trial)
          </button>
        </div>

        <div className="pt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-[#beccea]">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Strict Tenant Isolation</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#fca311]" />
            <span>Zero Hallucination Guardrails</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-[#fca311]" />
            <span>Make.com & Zapier Native Ingestion</span>
          </span>
          <span className="flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4 text-emerald-400" />
            <span>Dedicated Human Handoff Queue</span>
          </span>
        </div>
      </section>

      {/* Interactive ROI Calculator */}
      <section id="roi-calculator" className="py-16 bg-[#0c1425] border-y border-[#29447e]/60 px-6 sm:px-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono uppercase text-[#fca311] font-bold tracking-wider">
              Quantifiable Business Impact
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Calculate Your Revenue Lift from Fast Response Times
            </h2>
            <p className="text-xs sm:text-sm text-[#beccea] max-w-xl mx-auto">
              Harvard Business Review studies show companies responding to inbound leads within 5 minutes are 7x more likely to qualify the lead than those waiting 1 hour.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-[#080d19] p-6 sm:p-8 rounded-3xl border border-[#29447e] shadow-2xl items-center">
            {/* Controls */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold text-white mb-2">
                  <span>Monthly Inbound Inquiries</span>
                  <span className="text-[#fca311] font-mono text-sm">{monthlyLeads} leads/mo</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="5"
                  value={monthlyLeads}
                  onChange={e => setMonthlyLeads(Number(e.target.value))}
                  className="w-full accent-[#fca311] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-white mb-2">
                  <span>Average Customer Deal / Job Value</span>
                  <span className="text-[#fca311] font-mono text-sm">${avgDealValue.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="20000"
                  step="250"
                  value={avgDealValue}
                  onChange={e => setAvgDealValue(Number(e.target.value))}
                  className="w-full accent-[#fca311] cursor-pointer"
                />
              </div>

              <div className="p-4 bg-[#14213d] rounded-2xl border border-[#29447e] text-xs text-[#beccea] space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#fca311]" />
                  <span>Immediate Lead Velocity Factor</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Automating webhook capture, duplicate detection, and immediate sales task assignment increases win rate from ~12% to ~22%.
                </p>
              </div>
            </div>

            {/* Results Display */}
            <div className="bg-gradient-to-br from-[#14213d] to-[#080d19] p-6 sm:p-8 rounded-2xl border border-[#3e67bf]/50 text-center space-y-4">
              <span className="text-xs uppercase font-bold text-[#beccea] tracking-wider">
                Estimated Annual Revenue Growth
              </span>
              <div className="text-4xl sm:text-5xl font-black text-[#fca311] font-mono">
                +${additionalRevenuePerYear.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-400 font-bold">
                ≈ {additionalDealsPerYear} Additional Closed Deals Per Year
              </div>

              <div className="pt-2">
                <button
                  onClick={onOpenRegister}
                  className="w-full py-3 bg-[#fca311] hover:bg-[#d68502] text-black font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-all"
                >
                  Claim This Revenue Lift
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Breakdown */}
      <section id="features" className="py-20 px-6 sm:px-12 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono uppercase text-[#fca311] font-bold tracking-wider">
            Enterprise Architecture for Small Teams
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Built for Service Businesses That Mean Business
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-[#080d19] p-6 rounded-2xl border border-[#29447e]/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#14213d] border border-[#29447e] flex items-center justify-center text-[#fca311]">
              <Kanban className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Configurable Visual Pipeline</h3>
            <p className="text-xs text-[#beccea] leading-relaxed">
              Track leads across customized stages from Contact Pending to Won. Enforces verified action rules before closing deals, including mandatory lost reason prompts.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#080d19] p-6 rounded-2xl border border-[#29447e]/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#14213d] border border-[#29447e] flex items-center justify-center text-[#fca311]">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Human Handoff & Dispute Queue</h3>
            <p className="text-xs text-[#beccea] leading-relaxed">
              When a customer requests a human, expresses frustration, or presents contradictory data, the system instantly pauses automations and escalates to a human manager.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#080d19] p-6 rounded-2xl border border-[#29447e]/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#14213d] border border-[#29447e] flex items-center justify-center text-[#fca311]">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">AI-Assisted Qualification</h3>
            <p className="text-xs text-[#beccea] leading-relaxed">
              Extract intent, project scope, urgency, and budget signals using server-side Gemini models without risking hallucinated promises or pricing commitments.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-[#080d19] p-6 rounded-2xl border border-[#29447e]/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#14213d] border border-[#29447e] flex items-center justify-center text-[#fca311]">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Embeddable Lead Forms</h3>
            <p className="text-xs text-[#beccea] leading-relaxed">
              Create and publish high-converting contact forms in seconds. Captured leads immediately enter your pipeline with automated task scheduling and auto-assignment.
            </p>
          </div>

          {/* Card 5 */}
          <div className="bg-[#080d19] p-6 rounded-2xl border border-[#29447e]/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#14213d] border border-[#29447e] flex items-center justify-center text-[#fca311]">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Overdue Follow-Up Alerts</h3>
            <p className="text-xs text-[#beccea] leading-relaxed">
              Never miss a scheduled call or estimate. Tasks highlight overdue actions so sales agents stay on schedule and opportunities do not slip through the cracks.
            </p>
          </div>

          {/* Card 6 */}
          <div className="bg-[#080d19] p-6 rounded-2xl border border-[#29447e]/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#14213d] border border-[#29447e] flex items-center justify-center text-[#fca311]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Strict Multi-Tenant Isolation</h3>
            <p className="text-xs text-[#beccea] leading-relaxed">
              Multi-tenant architecture enforces organization boundaries at the database query level. Users from Business A can never access Business B's private customer records.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-[#0c1425] border-t border-[#29447e]/60 px-6 sm:px-12">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono uppercase text-[#fca311] font-bold tracking-wider">
              Transparent SaaS Pricing
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Plans That Scale with Your Lead Flow
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="bg-[#080d19] p-6 rounded-2xl border border-[#29447e]/60 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Starter</h3>
                  <p className="text-xs text-[#beccea]">For solo operators and small local crews</p>
                </div>
                <div className="text-3xl font-black font-mono text-white">$49<span className="text-xs text-[#beccea] font-sans">/mo</span></div>
                <ul className="space-y-2 text-xs text-[#e5e5e5]">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Up to 250 active leads</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 3 team member seats</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Visual Kanban Pipeline</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Embeddable Lead Form</li>
                </ul>
              </div>
              <button onClick={onOpenRegister} className="w-full py-2.5 rounded-xl bg-[#14213d] hover:bg-[#29447e] text-white font-bold text-xs">
                Start 14-Day Trial
              </button>
            </div>

            {/* Growth */}
            <div className="bg-[#14213d] p-6 rounded-2xl border-2 border-[#fca311] shadow-2xl flex flex-col justify-between space-y-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#fca311] text-black text-[10px] font-black uppercase tracking-wider">
                Most Popular
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Growth</h3>
                  <p className="text-xs text-[#beccea]">For growing service businesses & teams</p>
                </div>
                <div className="text-3xl font-black font-mono text-white">$129<span className="text-xs text-[#beccea] font-sans">/mo</span></div>
                <ul className="space-y-2 text-xs text-[#e5e5e5]">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Up to 5,000 active leads</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 15 team member seats</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> AI Qualification & Intent Extraction</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Dedicated Human Handoff Queue</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Make.com & Zapier Webhooks</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> CSV Data Import & Export</li>
                </ul>
              </div>
              <button onClick={onOpenRegister} className="w-full py-2.5 rounded-xl bg-[#fca311] hover:bg-[#d68502] text-black font-black text-xs shadow-lg">
                Start Growth Trial
              </button>
            </div>

            {/* Pro */}
            <div className="bg-[#080d19] p-6 rounded-2xl border border-[#29447e]/60 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Pro Enterprise</h3>
                  <p className="text-xs text-[#beccea]">Multi-location agencies and franchises</p>
                </div>
                <div className="text-3xl font-black font-mono text-white">$299<span className="text-xs text-[#beccea] font-sans">/mo</span></div>
                <ul className="space-y-2 text-xs text-[#e5e5e5]">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Up to 25,000 leads</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 50 team member seats</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Multi-Role RBAC Matrix</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Unlimited Webhook Endpoints</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Priority 24/7 SLA Support</li>
                </ul>
              </div>
              <button onClick={onOpenRegister} className="w-full py-2.5 rounded-xl bg-[#14213d] hover:bg-[#29447e] text-white font-bold text-xs">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#29447e]/40 py-10 px-6 sm:px-12 bg-[#04070c] text-xs text-[#beccea]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <Crown className="w-5 h-5 text-[#fca311]" />
            <span className="font-extrabold text-sm text-white">Emperor CRM Multi-Tenant Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => setModalType('about')} className="hover:text-white transition-colors">About Us</button>
            <button onClick={() => setModalType('privacy')} className="hover:text-white transition-colors">Privacy Policy</button>
            <button onClick={() => setModalType('terms')} className="hover:text-white transition-colors">Terms of Service</button>
          </div>

          <div className="text-[11px] font-mono">
            © 2026 Emperor CRM. All rights reserved.
          </div>
        </div>
      </footer>

      {/* INFORMATIONAL MODALS */}
      {modalType && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1425] border border-[#29447e] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#29447e]/60 pb-3">
              <h3 className="text-base font-bold text-white capitalize">
                {modalType === 'about' ? 'About Emperor CRM' : modalType === 'privacy' ? 'Privacy & Data Protection' : 'Terms of Service'}
              </h3>
              <button onClick={() => setModalType(null)} className="text-[#beccea] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-[#e5e5e5] leading-relaxed space-y-3">
              {modalType === 'about' && (
                <>
                  <p>
                    Emperor CRM is a specialized SaaS lead management system designed specifically for contractors, professional services, healthcare clinics, and local business operators.
                  </p>
                  <p>
                    Our mission is to replace fragile spreadsheets and chaotic inbox threads with structured, database-enforced sales pipelines and human-in-the-loop AI assistance.
                  </p>
                </>
              )}

              {modalType === 'privacy' && (
                <>
                  <p>
                    Emperor CRM operates on a strict multi-tenant architecture. Your customer data, phone numbers, and notes are never commingled or shared across business workspaces.
                  </p>
                  <p>
                    Data export and deletion requests are honored instantaneously through your administrator dashboard. Customer consent tracking is stored with full audit histories.
                  </p>
                </>
              )}

              {modalType === 'terms' && (
                <>
                  <p>
                    By registering for an Emperor CRM organization workspace, you confirm that communications sent to captured leads comply with applicable regional telecommunication and privacy statutes.
                  </p>
                  <p>
                    Plan limits (maximum leads and seats) are enforced on the server. Fair usage policies apply to AI qualification and webhook ingestion.
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-lg bg-[#14213d] hover:bg-[#29447e] text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
