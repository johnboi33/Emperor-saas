import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { LeadForm, PipelineStage, User } from '../types/crm.js';
import {
  FileText,
  Plus,
  ExternalLink,
  Copy,
  Check,
  Send,
  Zap,
  ShieldCheck,
  Code2,
  CheckCircle2,
  XCircle,
  X
} from 'lucide-react';

interface FormsViewProps {
  onOpenPublicFormModal: () => void;
}

export const FormsView: React.FC<FormsViewProps> = ({ onOpenPublicFormModal }) => {
  const { user, organization } = useAuth();
  const [forms, setForms] = useState<LeadForm[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Webhook Simulator state
  const [simWebhookPayload, setSimWebhookPayload] = useState(JSON.stringify({
    firstName: 'Marcus',
    lastName: 'Brody',
    email: 'm.brody@archeotech.io',
    phone: '+1 (555) 302-9911',
    company: 'ArcheoTech Labs',
    estimatedValue: 12500,
    provider: 'Make.com Scenario 4',
    eventId: 'evt_make_sample_' + Date.now().toString().slice(-4)
  }, null, 2));
  const [webhookResult, setWebhookResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  // Create Form modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStageId, setNewStageId] = useState('');
  const [newAssigneeId, setNewAssigneeId] = useState('');

  const loadForms = async () => {
    try {
      const [formsRes, stagesRes, usersRes] = await Promise.all([
        api.forms.list(),
        api.pipeline.getStages(),
        api.auth.getUsers()
      ]);
      setForms(formsRes.forms || []);
      setStages(stagesRes.stages || []);
      setUsers(usersRes.users || []);
      if (stagesRes.stages?.length > 0 && !newStageId) {
        setNewStageId(stagesRes.stages[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, [organization?.id]);

  const handleCopy = (slug: string) => {
    const url = `${window.location.origin}?form=${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newStageId) return;
    try {
      await api.forms.create({
        title: newTitle.trim(),
        defaultPipelineStageId: newStageId,
        autoAssignUserId: newAssigneeId || undefined,
        fieldsConfig: [
          { name: 'firstName', label: 'First Name', type: 'text', required: true },
          { name: 'lastName', label: 'Last Name', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'phone', label: 'Phone', type: 'tel', required: true },
          { name: 'company', label: 'Company / Project', type: 'text', required: false },
          { name: 'enquiry', label: 'Details of Project', type: 'textarea', required: true }
        ]
      });
      setIsCreateOpen(false);
      setNewTitle('');
      loadForms();
    } catch (err: any) {
      alert('Failed to create form: ' + err.message);
    }
  };

  const handleSimulateWebhook = async () => {
    setSimulating(true);
    setWebhookResult(null);
    try {
      const parsed = JSON.parse(simWebhookPayload);
      const res = await api.public.simulateWebhook(organization!.id, parsed, parsed.eventId);
      setWebhookResult(res);
    } catch (err: any) {
      setWebhookResult({ error: err.message });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#fca311]" />
            <span>Customer Forms & Webhook Ingestion</span>
          </h1>
          <p className="text-xs text-[#beccea] mt-0.5">
            Embeddable lead capture forms, Make.com/Zapier webhook URLs, and idempotency protection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenPublicFormModal}
            className="px-3.5 py-2 bg-[#29447e] hover:bg-[#3e67bf] text-white text-xs font-semibold rounded-xl border border-[#3e67bf]/50 transition-colors flex items-center gap-1.5"
          >
            <ExternalLink className="w-4 h-4 text-[#fca311]" />
            <span>Launch Live Test Form</span>
          </button>

          {['owner', 'admin'].includes(user?.role || '') && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 bg-[#fca311] hover:bg-[#d68502] text-black font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Form</span>
            </button>
          )}
        </div>
      </div>

      {/* Forms List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#beccea]">Loading forms...</div>
        ) : forms.length === 0 ? (
          <div className="col-span-2 bg-[#080d19] p-8 rounded-xl border border-[#29447e]/60 text-center text-xs text-[#beccea]">
            No forms created yet. Click "Create Form" to generate an embeddable lead capture form.
          </div>
        ) : (
          forms.map(form => (
            <div key={form.id} className="bg-[#080d19] p-5 rounded-2xl border border-[#29447e]/60 shadow-lg space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    {form.title}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400">
                      LIVE
                    </span>
                  </h2>
                  <p className="text-xs text-[#beccea] mt-0.5">
                    Default Pipeline Stage: <span className="text-white font-semibold">{form.default_stage_name}</span>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-[#fca311] px-2 py-1 rounded bg-[#14213d]">
                    {form.submissions_count || 0} Submissions
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[#0c1425] rounded-xl border border-[#29447e]/40 text-xs space-y-2">
                <div className="text-[10px] font-mono text-[#beccea] uppercase">Form Public Link:</div>
                <div className="flex items-center gap-2">
                  <code className="text-[11px] text-[#fca311] font-mono truncate flex-1 bg-[#080d19] px-2.5 py-1.5 rounded border border-[#29447e]/50">
                    /forms/{form.slug}
                  </code>
                  <button
                    onClick={() => handleCopy(form.slug)}
                    className="p-1.5 rounded-lg bg-[#14213d] hover:bg-[#29447e] text-white flex items-center gap-1 text-xs shrink-0"
                    title="Copy direct share link"
                  >
                    {copiedSlug === form.slug ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs text-[#beccea]">
                <span>Auto-Assignee: {form.auto_assign_user_name || 'Organization Default'}</span>
                <button
                  onClick={onOpenPublicFormModal}
                  className="text-xs text-[#fca311] hover:underline font-semibold flex items-center gap-1"
                >
                  <span>Test in Browser</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Webhook Endpoint & Interactive Simulator */}
      <div className="bg-[#080d19] p-6 rounded-2xl border border-[#29447e]/60 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-white">
          <Zap className="w-5 h-5 text-[#fca311]" />
          <h2 className="text-base font-bold">External Webhook Ingestion (Make.com, n8n, Zapier)</h2>
        </div>
        <p className="text-xs text-[#beccea] leading-relaxed">
          Post JSON payloads directly to your unique workspace webhook URL. Every invocation is automatically protected against duplicate runs via <code className="text-[#fca311]">X-Idempotency-Key</code> header or <code className="text-[#fca311]">eventId</code>.
        </p>

        <div className="p-3 bg-[#0c1425] rounded-xl border border-[#29447e] text-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#beccea]">Your Workspace Ingestion URL:</span>
          <div className="font-mono text-white font-semibold text-xs bg-[#080d19] p-2.5 rounded border border-[#29447e]/60 break-all">
            POST {window.location.origin}/api/public/webhook/{organization?.id}
          </div>
        </div>

        {/* Live Simulator Test Box */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-[#beccea]">Simulate Live Webhook Transmission:</span>
          <textarea
            rows={7}
            value={simWebhookPayload}
            onChange={e => setSimWebhookPayload(e.target.value)}
            className="w-full font-mono text-xs p-3 bg-[#0c1425] border border-[#29447e] rounded-xl text-white focus:outline-none focus:border-[#fca311]"
          />

          <div className="flex items-center justify-between">
            <button
              onClick={handleSimulateWebhook}
              disabled={simulating}
              className="px-4 py-2 bg-[#fca311] hover:bg-[#d68502] text-black font-bold text-xs rounded-xl shadow transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{simulating ? 'Processing...' : 'Send Test Webhook'}</span>
            </button>

            <span className="text-[11px] text-[#beccea]">
              Tip: Re-send with the same eventId to observe idempotency deduplication!
            </span>
          </div>

          {webhookResult && (
            <div className={`p-4 rounded-xl border text-xs font-mono space-y-1 ${
              webhookResult.error ? 'bg-rose-950/60 border-rose-500/50 text-rose-200' : 'bg-[#0c1425] border-emerald-500/50 text-emerald-200'
            }`}>
              <div className="font-bold flex items-center gap-1.5">
                {webhookResult.error ? <XCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                <span>Webhook Ingestion Response:</span>
              </div>
              <pre className="text-[11px] overflow-x-auto text-white">
                {JSON.stringify(webhookResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* CREATE FORM MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1425] border border-[#29447e] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#29447e]/60 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#fca311]" />
                <span>Create Lead Capture Form</span>
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-[#beccea] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateForm} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Form Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Free Emergency Estimate Form"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                />
              </div>

              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Default Pipeline Stage *</label>
                <select
                  required
                  value={newStageId}
                  onChange={e => setNewStageId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                >
                  {stages.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Auto-Assign Employee</label>
                <select
                  value={newAssigneeId}
                  onChange={e => setNewAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                >
                  <option value="">Default (First Available)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#14213d] text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#fca311] hover:bg-[#d68502] text-black font-bold"
                >
                  Create Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
