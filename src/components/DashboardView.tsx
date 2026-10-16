import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import {
  DollarSign,
  Users,
  Trophy,
  AlertOctagon,
  Clock,
  TrendingUp,
  Activity,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { PipelineStage, Activity as ActivityType, IntegrationLog } from '../types/crm.js';

interface DashboardViewProps {
  onNavigateTab: (tab: any) => void;
  onOpenNewLead: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTab, onOpenNewLead }) => {
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    metrics: {
      totalLeads: number;
      totalPipelineValue: number;
      wonValue: number;
      wonCount: number;
      lostCount: number;
      conversionRate: number;
      overdueTasks: number;
      pendingTasks: number;
      activeHandoffs: number;
    };
    stageBreakdown: PipelineStage[];
    sourceBreakdown: Array<{ source: string; count: number; total_value: number }>;
    recentActivities: ActivityType[];
    recentIntegrations: IntegrationLog[];
  } | null>(null);

  const loadStats = async () => {
    try {
      const data = await api.dashboard.getStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [organization?.id]);

  if (loading || !stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3 text-[#beccea]">
          <div className="w-8 h-8 border-2 border-[#fca311] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading workspace intelligence...</p>
        </div>
      </div>
    );
  }

  const { metrics, stageBreakdown, sourceBreakdown, recentActivities, recentIntegrations } = stats;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#14213d] p-5 rounded-2xl border border-[#29447e] shadow-lg">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <span>Workspace Operations: {organization?.name}</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#beccea] mt-1">
            Real-time lead flow, stage progression, human handoffs, and deterministic automations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenNewLead}
            className="px-4 py-2 bg-[#fca311] hover:bg-[#d68502] text-black font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Users className="w-4 h-4" />
            <span>Capture New Lead</span>
          </button>

          <button
            onClick={() => onNavigateTab('pipeline')}
            className="px-3.5 py-2 bg-[#29447e] hover:bg-[#3e67bf] text-white text-xs sm:text-sm rounded-xl border border-[#3e67bf]/50 transition-colors flex items-center gap-1.5"
          >
            <span>Visual Pipeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pipeline Value */}
        <div className="bg-[#080d19] p-5 rounded-xl border border-[#29447e]/60 shadow-sm">
          <div className="flex items-center justify-between text-[#beccea] text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Pipeline Value</span>
            <div className="p-2 rounded-lg bg-[#14213d] text-[#fca311]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            ${metrics.totalPipelineValue.toLocaleString()}
          </div>
          <div className="text-xs text-[#beccea] mt-1 flex items-center gap-1">
            <span className="font-semibold text-white">{metrics.totalLeads}</span> total leads active
          </div>
        </div>

        {/* Won Value & Deals */}
        <div className="bg-[#080d19] p-5 rounded-xl border border-[#29447e]/60 shadow-sm">
          <div className="flex items-center justify-between text-[#beccea] text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Closed Won</span>
            <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            ${metrics.wonValue.toLocaleString()}
          </div>
          <div className="text-xs text-[#beccea] mt-1 flex items-center gap-1.5">
            <span className="font-semibold text-white">{metrics.wonCount} signed</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">{metrics.conversionRate}% conversion</span>
          </div>
        </div>

        {/* Overdue Follow-ups */}
        <div
          onClick={() => onNavigateTab('tasks')}
          className="bg-[#080d19] p-5 rounded-xl border border-[#29447e]/60 shadow-sm cursor-pointer hover:border-rose-500/50 transition-all"
        >
          <div className="flex items-center justify-between text-[#beccea] text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Tasks & Follow-ups</span>
            <div className={`p-2 rounded-lg ${metrics.overdueTasks > 0 ? 'bg-rose-950/60 text-rose-400 animate-pulse' : 'bg-[#14213d] text-[#beccea]'}`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white flex items-center gap-2">
            <span>{metrics.pendingTasks}</span>
            {metrics.overdueTasks > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                {metrics.overdueTasks} Overdue
              </span>
            )}
          </div>
          <div className="text-xs text-[#beccea] mt-1">
            {metrics.overdueTasks > 0 ? 'Requires immediate sales attention' : 'All follow-ups currently on schedule'}
          </div>
        </div>

        {/* Human Handoffs Awaiting Action */}
        <div
          onClick={() => onNavigateTab('handoffs')}
          className="bg-[#080d19] p-5 rounded-xl border border-[#29447e]/60 shadow-sm cursor-pointer hover:border-[#fca311]/50 transition-all"
        >
          <div className="flex items-center justify-between text-[#beccea] text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Human Handoffs</span>
            <div className={`p-2 rounded-lg ${metrics.activeHandoffs > 0 ? 'bg-[#fca311]/20 text-[#fca311]' : 'bg-[#14213d] text-[#beccea]'}`}>
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white flex items-center gap-2">
            <span>{metrics.activeHandoffs}</span>
            {metrics.activeHandoffs > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#fca311]/20 text-[#fca311] border border-[#fca311]/30">
                Active Cases
              </span>
            )}
          </div>
          <div className="text-xs text-[#beccea] mt-1">
            {metrics.activeHandoffs > 0 ? 'Escalations pending human review' : 'No active human escalations'}
          </div>
        </div>
      </div>

      {/* Grid: Pipeline Stages Distribution & Lead Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Stage Breakdown */}
        <div className="lg:col-span-2 bg-[#080d19] p-5 rounded-xl border border-[#29447e]/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#fca311]" />
              <span>Pipeline Stage Progression</span>
            </h2>
            <button
              onClick={() => onNavigateTab('pipeline')}
              className="text-xs text-[#fca311] hover:underline"
            >
              Open Kanban
            </button>
          </div>

          <div className="space-y-3">
            {stageBreakdown.map(stage => {
              const count = stage.lead_count || 0;
              const value = stage.total_value || 0;
              const percent = metrics.totalLeads > 0 ? Math.round((count / metrics.totalLeads) * 100) : 0;

              return (
                <div key={stage.id} className="space-y-1">
                  <div className="flex justify-between text-xs text-[#e5e5e5]">
                    <span className="font-semibold flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                      {stage.name}
                      {stage.is_won === 1 && <span className="text-[10px] text-emerald-400 font-mono">(Won)</span>}
                      {stage.is_lost === 1 && <span className="text-[10px] text-rose-400 font-mono">(Lost)</span>}
                    </span>
                    <span className="font-mono text-[#beccea]">
                      {count} leads • <span className="text-white font-bold">${value.toLocaleString()}</span> ({percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#14213d] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(4, percent)}%`, backgroundColor: stage.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Sources Distribution */}
        <div className="bg-[#080d19] p-5 rounded-xl border border-[#29447e]/60">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#fca311]" />
            <span>Lead Acquisition Channels</span>
          </h2>

          <div className="space-y-3">
            {sourceBreakdown.length === 0 ? (
              <p className="text-xs text-[#beccea]">No leads recorded yet.</p>
            ) : (
              sourceBreakdown.map(src => (
                <div key={src.source} className="p-3 rounded-lg bg-[#14213d]/50 border border-[#29447e]/40 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-semibold text-white">{src.source}</div>
                    <div className="text-[11px] text-[#beccea] font-mono">
                      ${(src.total_value || 0).toLocaleString()} pipeline
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded bg-[#0c1425] text-xs font-bold text-[#fca311]">
                    {src.count} leads
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Grid: Recent Activity Timeline & Integration Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2 bg-[#080d19] p-5 rounded-xl border border-[#29447e]/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#fca311]" />
              <span>Real-Time Audit Trail & Activities</span>
            </h2>
            <button
              onClick={() => onNavigateTab('leads')}
              className="text-xs text-[#fca311] hover:underline"
            >
              View All Leads
            </button>
          </div>

          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-[#beccea]">No recent activities logged.</p>
            ) : (
              recentActivities.map(act => (
                <div key={act.id} className="p-3 rounded-lg bg-[#0c1425] border border-[#29447e]/40 text-xs flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#fca311] mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-white leading-relaxed">{act.description}</p>
                    <div className="text-[10px] text-[#beccea] font-mono mt-1 flex items-center gap-2">
                      <span>{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span>User: {act.user_name || 'System'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Integration Health Monitor */}
        <div className="bg-[#080d19] p-5 rounded-xl border border-[#29447e]/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Integration Status</span>
            </h2>
            <button
              onClick={() => onNavigateTab('forms')}
              className="text-xs text-[#fca311] hover:underline"
            >
              Webhooks & API
            </button>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-lg bg-[#14213d]/60 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Lead Capture Webhooks</div>
                  <div className="text-[10px] text-[#beccea]">Make.com / Zapier / n8n ready</div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400">
                ACTIVE
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#14213d]/60 border border-[#29447e] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Gemini AI Qualification</div>
                  <div className="text-[10px] text-[#beccea]">Human-in-the-loop guardrailed</div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#14213d] text-[#fca311]">
                ONLINE
              </span>
            </div>

            {recentIntegrations.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#29447e]/40">
                <div className="text-[11px] font-semibold text-[#beccea] mb-2 uppercase tracking-wider">
                  Recent Integration Invocations
                </div>
                <div className="space-y-1.5">
                  {recentIntegrations.map(int => (
                    <div key={int.id} className="text-[11px] flex justify-between items-center p-2 rounded bg-[#0c1425]">
                      <span className="text-white truncate max-w-[140px]">{int.integration_name}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${int.status === 'success' ? 'text-emerald-400 bg-emerald-950' : 'text-rose-400 bg-rose-950'}`}>
                        {int.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
