import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Lead, PipelineStage, User } from '../types/crm.js';
import {
  Kanban,
  Plus,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  DollarSign,
  UserCheck,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  Settings
} from 'lucide-react';

export const PipelineView: React.FC = () => {
  const { user, organization } = useAuth();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Transition Reason Modal state
  const [transitionPrompt, setTransitionPrompt] = useState<{
    leadId: string;
    leadName: string;
    targetStageId: string;
    targetStageName: string;
    isLost: boolean;
    isWon: boolean;
  } | null>(null);
  const [transitionReason, setTransitionReason] = useState('');

  // Add custom stage modal
  const [isAddStageOpen, setIsAddStageOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#fca311');

  const loadPipeline = async () => {
    try {
      const [stagesRes, leadsRes] = await Promise.all([
        api.pipeline.getStages(),
        api.leads.list({ limit: 100, status: 'active' })
      ]);
      setStages(stagesRes.stages || []);
      setLeads(leadsRes.leads || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPipeline();
  }, [organization?.id]);

  const handleInitiateTransition = (lead: Lead, targetStage: PipelineStage) => {
    if (lead.pipeline_stage_id === targetStage.id) return;

    // Check if stage is Won or Lost to require reason
    if (targetStage.is_lost === 1 || targetStage.is_won === 1) {
      setTransitionPrompt({
        leadId: lead.id,
        leadName: `${lead.first_name} ${lead.last_name}`,
        targetStageId: targetStage.id,
        targetStageName: targetStage.name,
        isLost: targetStage.is_lost === 1,
        isWon: targetStage.is_won === 1
      });
      setTransitionReason('');
      return;
    }

    // Direct transition for standard stages
    executeTransition(lead.id, targetStage.id);
  };

  const executeTransition = async (leadId: string, targetStageId: string, reason?: string) => {
    try {
      await api.pipeline.transitionLead(leadId, targetStageId, reason);
      setTransitionPrompt(null);
      setTransitionReason('');
      loadPipeline();
    } catch (err: any) {
      alert('Transition failed: ' + err.message);
    }
  };

  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;
    try {
      await api.pipeline.createStage({
        name: newStageName.trim(),
        color: newStageColor
      });
      setIsAddStageOpen(false);
      setNewStageName('');
      loadPipeline();
    } catch (err: any) {
      alert('Failed to create stage: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-[#beccea]">
        <div className="w-8 h-8 border-2 border-[#fca311] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading sales pipeline board...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-full overflow-x-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <Kanban className="w-6 h-6 text-[#fca311]" />
            <span>Interactive Sales Pipeline</span>
          </h1>
          <p className="text-xs text-[#beccea] mt-0.5">
            Real-time visual Kanban with stage transition rules and won/lost audit logging.
          </p>
        </div>

        {['owner', 'admin'].includes(user?.role || '') && (
          <button
            onClick={() => setIsAddStageOpen(true)}
            className="px-3 py-2 bg-[#14213d] hover:bg-[#29447e] text-white text-xs font-semibold rounded-xl border border-[#29447e] transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-[#fca311]" />
            <span>Add Pipeline Stage</span>
          </button>
        )}
      </div>

      {/* Kanban Board Horizontal Scroll */}
      <div className="flex gap-4 pb-6 min-h-[650px] items-start">
        {stages.map(stage => {
          const stageLeads = leads.filter(l => l.pipeline_stage_id === stage.id);
          const stageTotalValue = stageLeads.reduce((acc, curr) => acc + (curr.estimated_value || 0), 0);
          const currentIndex = stages.findIndex(s => s.id === stage.id);
          const prevStage = currentIndex > 0 ? stages[currentIndex - 1] : null;
          const nextStage = currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;

          return (
            <div
              key={stage.id}
              className="w-72 sm:w-80 shrink-0 bg-[#080d19] rounded-2xl border border-[#29447e]/60 flex flex-col max-h-[800px] shadow-lg"
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-[#29447e]/50 flex justify-between items-center bg-[#0c1425] rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="font-bold text-xs sm:text-sm text-white truncate max-w-[140px]">
                    {stage.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-[#14213d]">
                    {stageLeads.length}
                  </span>
                  <div className="text-[10px] text-[#beccea] font-mono mt-0.5">
                    ${stageTotalValue.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Column Cards */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1">
                {stageLeads.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#beccea]/60 italic border border-dashed border-[#29447e]/40 rounded-xl">
                    No leads in this stage
                  </div>
                ) : (
                  stageLeads.map(lead => (
                    <div
                      key={lead.id}
                      className="p-3.5 bg-[#0c1425] hover:bg-[#14213d] border border-[#29447e]/60 rounded-xl shadow transition-all space-y-2 group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-xs text-white group-hover:text-[#fca311] transition-colors">
                            {lead.first_name} {lead.last_name}
                          </div>
                          {lead.company && (
                            <div className="text-[11px] text-[#beccea] truncate max-w-[170px]">
                              {lead.company}
                            </div>
                          )}
                        </div>
                        <div className="font-mono text-xs font-extrabold text-white">
                          ${(lead.estimated_value || 0).toLocaleString()}
                        </div>
                      </div>

                      {/* AI Intent Tag */}
                      {lead.ai_intent && (
                        <div className="p-1.5 bg-[#080d19] rounded-lg text-[10px] text-[#beccea] flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#fca311] shrink-0" />
                          <span className="truncate">{lead.ai_intent}</span>
                        </div>
                      )}

                      {/* Assignee & Urgency */}
                      <div className="flex justify-between items-center text-[10px] text-[#beccea] pt-1 border-t border-[#29447e]/30">
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-emerald-400" />
                          {lead.assigned_user_name ? lead.assigned_user_name.split(' ')[0] : 'Unassigned'}
                        </span>
                        <span className="text-[10px] font-mono uppercase text-[#fca311]">
                          {lead.source}
                        </span>
                      </div>

                      {/* Quick Transition Arrows */}
                      <div className="pt-2 flex justify-between gap-1.5">
                        {prevStage ? (
                          <button
                            onClick={() => handleInitiateTransition(lead, prevStage)}
                            className="p-1 px-2 text-[10px] rounded bg-[#080d19] hover:bg-[#29447e] text-[#beccea] hover:text-white flex items-center gap-1"
                            title={`Move back to ${prevStage.name}`}
                          >
                            <ArrowLeft className="w-3 h-3" />
                            <span className="truncate max-w-[60px]">{prevStage.name}</span>
                          </button>
                        ) : <div />}

                        {nextStage && (
                          <button
                            onClick={() => handleInitiateTransition(lead, nextStage)}
                            className="p-1 px-2 text-[10px] rounded bg-[#fca311]/20 hover:bg-[#fca311] text-[#fca311] hover:text-black font-semibold flex items-center gap-1 ml-auto"
                            title={`Advance to ${nextStage.name}`}
                          >
                            <span className="truncate max-w-[80px]">{nextStage.name}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* WON / LOST REASON MODAL */}
      {transitionPrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1425] border border-[#29447e] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-[#29447e]/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {transitionPrompt.isLost ? (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                  <span>
                    Mark Lead as {transitionPrompt.isLost ? 'Lost' : 'Won'}
                  </span>
                </h3>
                <p className="text-xs text-[#beccea] mt-1">
                  Moving "{transitionPrompt.leadName}" to stage "{transitionPrompt.targetStageName}".
                </p>
              </div>
              <button onClick={() => setTransitionPrompt(null)} className="text-[#beccea] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block text-[#beccea] font-semibold">
                {transitionPrompt.isLost ? 'Reason for Closing Lead as Lost *' : 'Winning Reason / Contract Details'}
              </label>
              <textarea
                rows={3}
                required={transitionPrompt.isLost}
                placeholder={
                  transitionPrompt.isLost
                    ? 'e.g. Budget constraints, opted for competitor, project cancelled, unresponsive...'
                    : 'e.g. Annual service contract signed, discount approved, project scope agreed...'
                }
                value={transitionReason}
                onChange={e => setTransitionReason(e.target.value)}
                className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTransitionPrompt(null)}
                  className="px-4 py-2 rounded-lg bg-[#14213d] hover:bg-[#29447e] text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (transitionPrompt.isLost && !transitionReason.trim()) {
                      alert('Please provide a reason before marking this deal as lost.');
                      return;
                    }
                    executeTransition(transitionPrompt.leadId, transitionPrompt.targetStageId, transitionReason);
                  }}
                  className={`px-5 py-2 rounded-lg font-bold shadow-md ${
                    transitionPrompt.isLost ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  Confirm Transition
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD STAGE MODAL */}
      {isAddStageOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1425] border border-[#29447e] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#29447e]/60 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#fca311]" />
                <span>Create Pipeline Stage</span>
              </h3>
              <button onClick={() => setIsAddStageOpen(false)} className="text-[#beccea] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStage} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Stage Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deposit Received, Engineering Review"
                  value={newStageName}
                  onChange={e => setNewStageName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                />
              </div>

              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Color Tag</label>
                <input
                  type="color"
                  value={newStageColor}
                  onChange={e => setNewStageColor(e.target.value)}
                  className="w-16 h-8 bg-[#080d19] border border-[#29447e] rounded cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddStageOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#14213d] text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#fca311] hover:bg-[#d68502] text-black font-bold"
                >
                  Add Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
