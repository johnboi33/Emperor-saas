import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { HumanHandoff } from '../types/crm.js';
import {
  AlertOctagon,
  CheckCircle2,
  UserCheck,
  Clock,
  ShieldAlert,
  Lock,
  ArrowRight,
  MessageSquare,
  X,
  Phone,
  Mail
} from 'lucide-react';

export const HandoffsView: React.FC = () => {
  const { user, organization } = useAuth();
  const [handoffs, setHandoffs] = useState<HumanHandoff[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewStatus, setViewStatus] = useState<'active' | 'resolved'>('active');

  // Resolve modal state
  const [resolvingHandoff, setResolvingHandoff] = useState<HumanHandoff | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const loadHandoffs = async () => {
    try {
      const res = await api.handoffs.list(viewStatus);
      setHandoffs(res.handoffs || []);
      setActiveCount(res.activeCount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHandoffs();
  }, [viewStatus, organization?.id]);

  const handleClaim = async (id: string) => {
    try {
      await api.handoffs.claim(id);
      loadHandoffs();
    } catch (err: any) {
      alert('Failed to claim case: ' + err.message);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingHandoff || !resolutionNotes.trim()) return;
    try {
      await api.handoffs.resolve(resolvingHandoff.id, resolutionNotes.trim());
      setResolvingHandoff(null);
      setResolutionNotes('');
      loadHandoffs();
    } catch (err: any) {
      alert('Failed to resolve handoff: ' + err.message);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-[#fca311]" />
            <span>Human Handoff & Exception Queue</span>
            {activeCount > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#fca311] text-black font-extrabold">
                {activeCount} Action Required
              </span>
            )}
          </h1>
          <p className="text-xs text-[#beccea] mt-0.5">
            Safeguards and escalation protocols when AI or automated workflows require human intervention.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewStatus('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewStatus === 'active'
                ? 'bg-[#fca311] text-black font-bold shadow'
                : 'bg-[#14213d] text-[#beccea] hover:text-white'
            }`}
          >
            Active Escalations ({activeCount})
          </button>
          <button
            onClick={() => setViewStatus('resolved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewStatus === 'resolved'
                ? 'bg-[#29447e] text-white font-bold shadow'
                : 'bg-[#14213d] text-[#beccea] hover:text-white'
            }`}
          >
            Resolved Cases
          </button>
        </div>
      </div>

      {/* Safety Policy Notice */}
      <div className="p-4 bg-[#14213d]/60 border border-[#29447e] rounded-xl text-xs text-[#e5e5e5] flex items-start gap-3">
        <Lock className="w-4 h-4 text-[#fca311] shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-white">Automations Safety Policy Active</div>
          <p className="text-[11px] text-[#beccea] mt-0.5 leading-relaxed">
            While a lead is in this queue, all conflicting automated stage transitions and outbound messages are paused to prevent customer confusion. Only authorized human employees may handle the case until resolution.
          </p>
        </div>
      </div>

      {/* Handoff Cards List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#beccea]">Loading escalations...</div>
        ) : handoffs.length === 0 ? (
          <div className="bg-[#080d19] p-12 rounded-xl border border-[#29447e]/60 text-center text-xs text-[#beccea] space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-white">All Clear! No Pending Human Escalations.</p>
            <p>Every lead is proceeding normally through standard pipeline stages and automations.</p>
          </div>
        ) : (
          handoffs.map(handoff => {
            const isResolved = handoff.status === 'resolved';

            return (
              <div
                key={handoff.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isResolved
                    ? 'bg-[#080d19]/60 border-[#29447e]/40 opacity-75'
                    : 'bg-[#0c1425] border-[#fca311]/50 shadow-xl'
                }`}
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-[#29447e]/40 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                        handoff.priority === 'urgent' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-[#fca311]/20 text-[#fca311] border border-[#fca311]/30'
                      }`}>
                        {handoff.priority} priority
                      </span>
                      <h2 className="text-sm font-bold text-white">
                        Reason: {handoff.reason}
                      </h2>
                    </div>
                    <div className="text-xs text-[#beccea] mt-1 flex items-center gap-2">
                      <span className="font-semibold text-white">
                        Lead: {handoff.first_name} {handoff.last_name} {handoff.lead_company ? `(${handoff.lead_company})` : ''}
                      </span>
                      <span>•</span>
                      <span>Escalated {new Date(handoff.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {!isResolved && (
                    <div className="flex items-center gap-2 shrink-0">
                      {handoff.assigned_user_id !== user?.id && (
                        <button
                          onClick={() => handleClaim(handoff.id)}
                          className="px-3 py-1.5 bg-[#14213d] hover:bg-[#29447e] text-white text-xs font-semibold rounded-lg border border-[#29447e]"
                        >
                          Take Ownership
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setResolvingHandoff(handoff);
                          setResolutionNotes('');
                        }}
                        className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs rounded-lg shadow"
                      >
                        Resolve & Resume Automation
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs">
                  <div className="p-3 bg-[#080d19] rounded-xl border border-[#29447e]/60 space-y-1">
                    <span className="text-[10px] text-[#beccea] uppercase font-bold tracking-wider">
                      Incident Summary & Context
                    </span>
                    <p className="text-white leading-relaxed">{handoff.summary}</p>
                  </div>

                  <div className="p-3 bg-[#080d19] rounded-xl border border-[#29447e]/60 space-y-1">
                    <span className="text-[10px] text-[#fca311] uppercase font-bold tracking-wider">
                      Required Next Human Action
                    </span>
                    <p className="text-white leading-relaxed font-medium">{handoff.next_action}</p>
                    <div className="pt-2 flex items-center gap-3 text-[11px] text-[#beccea]">
                      {handoff.lead_phone && (
                        <span className="flex items-center gap-1 text-white">
                          <Phone className="w-3 h-3 text-[#fca311]" />
                          {handoff.lead_phone}
                        </span>
                      )}
                      {handoff.lead_email && (
                        <span className="flex items-center gap-1 text-white">
                          <Mail className="w-3 h-3 text-[#fca311]" />
                          {handoff.lead_email}
                        </span>
                      )}
                      <span className="flex items-center gap-1 ml-auto">
                        <UserCheck className="w-3 h-3 text-emerald-400" />
                        Owner: {handoff.assigned_user_name || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>

                {isResolved && handoff.resolution_notes && (
                  <div className="mt-3 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-200">
                    <span className="font-bold block">Resolution Notes:</span>
                    <p className="text-[11px] mt-0.5 text-emerald-200/90">{handoff.resolution_notes}</p>
                    <div className="text-[10px] text-emerald-400/80 mt-1">
                      Resolved {handoff.resolved_at ? new Date(handoff.resolved_at).toLocaleString() : ''}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* RESOLVE HANDOFF MODAL */}
      {resolvingHandoff && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1425] border border-[#29447e] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#29447e]/60 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Resolve Human Handoff Case</span>
              </h3>
              <button onClick={() => setResolvingHandoff(null)} className="text-[#beccea] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolve} className="space-y-3 text-xs">
              <p className="text-[#beccea] leading-relaxed">
                Explain how the customer situation was addressed (e.g. phone call made, revised quote sent, agreement confirmed). Resolving safely resumes normal automation workflows.
              </p>

              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Resolution Summary & Outcome *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Called lead directly, clarified installation warranty terms, customer satisfied and booked site measurement..."
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingHandoff(null)}
                  className="px-4 py-2 rounded-lg bg-[#14213d] text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold shadow-md"
                >
                  Submit & Resume
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
