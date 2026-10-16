import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Lead, PipelineStage, User, Task, Activity, HumanHandoff } from '../types/crm.js';
import {
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  AlertTriangle,
  Sparkles,
  Phone,
  Mail,
  Building,
  CheckCircle2,
  Clock,
  ArrowRight,
  UserCheck,
  Send,
  X,
  FileSpreadsheet,
  AlertOctagon,
  Trash2
} from 'lucide-react';

export const LeadsView: React.FC = () => {
  const { user, organization } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedAssignee, setSelectedAssignee] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('active');

  // Modals & Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [leadDetails, setLeadDetails] = useState<{
    lead: Lead;
    tasks: Task[];
    activities: Activity[];
    handoffs: HumanHandoff[];
  } | null>(null);

  // Duplicate warning state
  const [duplicateWarning, setDuplicateWarning] = useState<Lead[]>([]);
  const [newNote, setNewNote] = useState('');
  const [aiQualifying, setAiQualifying] = useState(false);

  // Form inputs for new lead
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    source: 'Direct Entry',
    pipelineStageId: '',
    estimatedValue: 0,
    assignedUserId: '',
    enquiryText: ''
  });

  const loadData = async () => {
    try {
      const [leadsRes, stagesRes, usersRes] = await Promise.all([
        api.leads.list({
          search,
          stageId: selectedStage,
          source: selectedSource,
          assignedTo: selectedAssignee,
          status: selectedStatus
        }),
        api.pipeline.getStages(),
        api.auth.getUsers()
      ]);
      setLeads(leadsRes.leads || []);
      setStages(stagesRes.stages || []);
      setUsers(usersRes.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedStage, selectedSource, selectedAssignee, selectedStatus, organization?.id]);

  // Live duplicate check while typing in Create Lead modal
  useEffect(() => {
    if (!isCreateOpen) {
      setDuplicateWarning([]);
      return;
    }
    const timer = setTimeout(async () => {
      if (formData.email.trim() || formData.phone.trim()) {
        try {
          const res = await api.leads.checkDuplicate(formData.email.trim(), formData.phone.trim());
          setDuplicateWarning(res.duplicates || []);
        } catch (e) {
          console.error(e);
        }
      } else {
        setDuplicateWarning([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [formData.email, formData.phone, isCreateOpen]);

  // Load single lead details
  const openLeadDetails = async (id: string) => {
    setActiveLeadId(id);
    try {
      const details = await api.leads.get(id);
      setLeadDetails(details);
    } catch (err: any) {
      alert('Error loading lead details: ' + err.message);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.leads.create(formData);
      setIsCreateOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        source: 'Direct Entry',
        pipelineStageId: '',
        estimatedValue: 0,
        assignedUserId: '',
        enquiryText: ''
      });
      loadData();
    } catch (err: any) {
      alert('Failed to create lead: ' + err.message);
    }
  };

  const handleRunAiQualify = async () => {
    if (!activeLeadId) return;
    setAiQualifying(true);
    try {
      const res = await api.leads.qualifyAi(activeLeadId);
      // Reload lead details
      const details = await api.leads.get(activeLeadId);
      setLeadDetails(details);
      loadData();
      alert(`AI Qualification complete! Intent: "${res.qualification.intent}". Confidence: ${Math.round(res.qualification.confidenceScore * 100)}%`);
    } catch (err: any) {
      alert('AI Qualification error: ' + err.message);
    } finally {
      setAiQualifying(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLeadId || !newNote.trim()) return;
    try {
      await api.leads.addNote(activeLeadId, newNote.trim());
      setNewNote('');
      const details = await api.leads.get(activeLeadId);
      setLeadDetails(details);
    } catch (err: any) {
      alert('Failed to add note: ' + err.message);
    }
  };

  const handleStageChange = async (targetStageId: string) => {
    if (!activeLeadId) return;
    try {
      await api.pipeline.transitionLead(activeLeadId, targetStageId);
      const details = await api.leads.get(activeLeadId);
      setLeadDetails(details);
      loadData();
    } catch (err: any) {
      alert('Stage transition error: ' + err.message);
    }
  };

  const handleArchive = async () => {
    if (!activeLeadId || !confirm('Are you sure you want to archive this lead?')) return;
    try {
      await api.leads.archive(activeLeadId);
      setActiveLeadId(null);
      setLeadDetails(null);
      loadData();
    } catch (err: any) {
      alert('Failed to archive: ' + err.message);
    }
  };

  const handleExportCsv = () => {
    if (!['owner', 'admin', 'manager'].includes(user?.role || '')) {
      alert('Permission Denied: Your role does not allow CSV exports.');
      return;
    }
    const token = api.getToken();
    window.location.href = `/api/leads/export/csv?token=${token}`;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <span>Leads & Customer Pipeline</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#14213d] text-[#fca311] font-mono border border-[#29447e]">
              {leads.length} Records
            </span>
          </h1>
          <p className="text-xs text-[#beccea] mt-0.5">
            Manage inquiries, contact preferences, duplicate tracking, and AI qualification history.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-[#fca311] hover:bg-[#d68502] text-black font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>

          {['owner', 'admin', 'manager'].includes(user?.role || '') && (
            <button
              onClick={handleExportCsv}
              className="px-3 py-2 bg-[#14213d] hover:bg-[#29447e] text-white text-xs rounded-xl border border-[#29447e] transition-colors flex items-center gap-1.5"
              title="Download CSV export"
            >
              <Download className="w-3.5 h-3.5 text-[#beccea]" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}

          {['owner', 'admin'].includes(user?.role || '') && (
            <button
              onClick={() => setIsImportOpen(true)}
              className="px-3 py-2 bg-[#14213d] hover:bg-[#29447e] text-white text-xs rounded-xl border border-[#29447e] transition-colors flex items-center gap-1.5"
              title="Batch import leads"
            >
              <Upload className="w-3.5 h-3.5 text-[#beccea]" />
              <span className="hidden sm:inline">Import</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#080d19] p-4 rounded-xl border border-[#29447e]/60 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#beccea] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search leads by name, email, phone, company, or AI intent..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#0c1425] border border-[#29447e] rounded-lg text-xs text-white placeholder-[#beccea]/60 focus:outline-none focus:border-[#fca311]"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Stage Filter */}
          <select
            value={selectedStage}
            onChange={e => setSelectedStage(e.target.value)}
            className="px-3 py-2 bg-[#0c1425] border border-[#29447e] rounded-lg text-xs text-white focus:outline-none focus:border-[#fca311]"
          >
            <option value="all">All Stages</option>
            {stages.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={selectedSource}
            onChange={e => setSelectedSource(e.target.value)}
            className="px-3 py-2 bg-[#0c1425] border border-[#29447e] rounded-lg text-xs text-white focus:outline-none focus:border-[#fca311]"
          >
            <option value="all">All Sources</option>
            <option value="Website Form">Website Form</option>
            <option value="Google Ads">Google Ads</option>
            <option value="Referral">Referral</option>
            <option value="Local Walk-in">Local Walk-in</option>
            <option value="Direct Entry">Direct Entry</option>
          </select>

          {/* Assignee Filter */}
          <select
            value={selectedAssignee}
            onChange={e => setSelectedAssignee(e.target.value)}
            className="px-3 py-2 bg-[#0c1425] border border-[#29447e] rounded-lg text-xs text-white focus:outline-none focus:border-[#fca311]"
          >
            <option value="all">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-[#0c1425] border border-[#29447e] rounded-lg text-xs text-white focus:outline-none focus:border-[#fca311]"
          >
            <option value="active">Active Leads</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-[#080d19] rounded-xl border border-[#29447e]/60 overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#beccea]">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#beccea] space-y-2">
            <p className="text-sm font-semibold text-white">No leads match your filter criteria.</p>
            <p>Try clearing filters or click "Add Lead" to register a new customer inquiry.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#14213d] text-[#beccea] uppercase font-semibold text-[11px] border-b border-[#29447e]">
                <tr>
                  <th className="py-3 px-4">Contact & Company</th>
                  <th className="py-3 px-4">Pipeline Stage</th>
                  <th className="py-3 px-4">Est. Value</th>
                  <th className="py-3 px-4">AI Qualification</th>
                  <th className="py-3 px-4">Owner / Assignee</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#29447e]/30 text-[#e5e5e5]">
                {leads.map(lead => (
                  <tr
                    key={lead.id}
                    onClick={() => openLeadDetails(lead.id)}
                    className="hover:bg-[#14213d]/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white group-hover:text-[#fca311] transition-colors">
                        {lead.first_name} {lead.last_name}
                      </div>
                      <div className="text-[11px] text-[#beccea] flex items-center gap-1.5 mt-0.5">
                        {lead.company && <span className="font-medium text-white">{lead.company}</span>}
                        {lead.email && <span>• {lead.email}</span>}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                        style={{
                          backgroundColor: `${lead.stage_color || '#3e67bf'}20`,
                          borderColor: `${lead.stage_color || '#3e67bf'}50`,
                          color: lead.stage_color || '#3e67bf'
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: lead.stage_color || '#3e67bf' }} />
                        {lead.stage_name || 'Stage'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      ${(lead.estimated_value || 0).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4">
                      {lead.ai_intent ? (
                        <div className="max-w-[200px]">
                          <div className="truncate text-white font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#fca311] shrink-0" />
                            <span className="truncate">{lead.ai_intent}</span>
                          </div>
                          {lead.ai_confidence && (
                            <span className="text-[10px] text-[#beccea] font-mono">
                              {Math.round(lead.ai_confidence * 100)}% match
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#14213d] text-[#beccea]">
                          Pending AI Review
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {lead.assigned_user_name ? (
                        <span className="text-xs text-white flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                          {lead.assigned_user_name}
                        </span>
                      ) : (
                        <span className="text-xs text-[#beccea]/60 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-[#beccea] text-[11px]">
                      {lead.source}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          openLeadDetails(lead.id);
                        }}
                        className="px-2.5 py-1 rounded bg-[#14213d] text-white hover:bg-[#29447e] text-xs font-semibold"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE LEAD MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1425] border border-[#29447e] rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#29447e]/60 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#fca311]" />
                <span>Capture New Lead</span>
              </h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-[#beccea] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Duplicate Warning */}
            {duplicateWarning.length > 0 && (
              <div className="p-3 bg-amber-950/60 border border-amber-500/50 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Possible Duplicate Contact Found!</div>
                  <p className="mt-0.5 text-[11px] text-amber-200/90 leading-tight">
                    A lead named "{duplicateWarning[0].first_name} {duplicateWarning[0].last_name}" ({duplicateWarning[0].email || duplicateWarning[0].phone}) already exists in your workspace.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#beccea] mb-1 font-semibold">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                  />
                </div>
                <div>
                  <label className="block text-[#beccea] mb-1 font-semibold">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#beccea] mb-1 font-semibold">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                  />
                </div>
                <div>
                  <label className="block text-[#beccea] mb-1 font-semibold">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#beccea] mb-1 font-semibold">Company / Property</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                  />
                </div>
                <div>
                  <label className="block text-[#beccea] mb-1 font-semibold">Estimated Deal Value ($)</label>
                  <input
                    type="number"
                    value={formData.estimatedValue}
                    onChange={e => setFormData({ ...formData, estimatedValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#beccea] mb-1 font-semibold">Lead Source</label>
                  <select
                    value={formData.source}
                    onChange={e => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                  >
                    <option value="Direct Entry">Direct Entry</option>
                    <option value="Website Form">Website Form</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="Referral">Referral</option>
                    <option value="Local Walk-in">Local Walk-in</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#beccea] mb-1 font-semibold">Initial Pipeline Stage</label>
                  <select
                    value={formData.pipelineStageId}
                    onChange={e => setFormData({ ...formData, pipelineStageId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                  >
                    <option value="">Default (First Stage)</option>
                    {stages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Inquiry Description / Notes</label>
                <textarea
                  rows={3}
                  value={formData.enquiryText}
                  onChange={e => setFormData({ ...formData, enquiryText: e.target.value })}
                  placeholder="Describe the customer's request, equipment needed, or service quote requirement..."
                  className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#14213d] hover:bg-[#29447e] text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#fca311] hover:bg-[#d68502] text-black font-bold shadow-md"
                >
                  Save Lead Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAD DETAILS DRAWER */}
      {activeLeadId && leadDetails && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-[#0c1425] border-l border-[#29447e] w-full max-w-2xl h-full flex flex-col p-6 overflow-y-auto space-y-6 shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-[#29447e]/60 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-white">
                    {leadDetails.lead.first_name} {leadDetails.lead.last_name}
                  </h2>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: `${leadDetails.lead.stage_color || '#fca311'}20`,
                      color: leadDetails.lead.stage_color || '#fca311'
                    }}
                  >
                    {leadDetails.lead.stage_name}
                  </span>
                </div>
                <p className="text-xs text-[#beccea] mt-1 flex items-center gap-2">
                  <span>ID: {leadDetails.lead.id}</span>
                  <span>•</span>
                  <span>Created {new Date(leadDetails.lead.created_at).toLocaleDateString()}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {['owner', 'admin', 'manager'].includes(user?.role || '') && (
                  <button
                    onClick={handleArchive}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10"
                    title="Archive Lead"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setActiveLeadId(null);
                    setLeadDetails(null);
                  }}
                  className="p-1.5 rounded-lg text-[#beccea] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Pipeline Stage Transition Dropdown */}
            <div className="p-3 bg-[#080d19] rounded-xl border border-[#29447e] flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Move Pipeline Stage:</span>
              <select
                value={leadDetails.lead.pipeline_stage_id}
                onChange={e => handleStageChange(e.target.value)}
                className="px-3 py-1.5 bg-[#14213d] border border-[#29447e] rounded-lg text-white font-medium focus:outline-none focus:border-[#fca311]"
              >
                {stages.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* AI-Assisted Qualification Card */}
            <div className="p-4 bg-gradient-to-br from-[#14213d] to-[#0c1425] rounded-xl border border-[#3e67bf]/50 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Sparkles className="w-4 h-4 text-[#fca311]" />
                  <span>AI Qualification & Intent Classification</span>
                </div>
                <button
                  onClick={handleRunAiQualify}
                  disabled={aiQualifying}
                  className="px-3 py-1.5 bg-[#fca311] hover:bg-[#d68502] text-black font-bold text-xs rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {aiQualifying ? 'Analyzing...' : 'Run Gemini AI Analysis'}
                </button>
              </div>

              {leadDetails.lead.ai_intent ? (
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-[#080d19]/80 rounded-lg border border-[#29447e]">
                    <span className="text-[#beccea] block text-[10px] uppercase font-semibold">Identified Intent:</span>
                    <span className="text-white font-bold text-sm">{leadDetails.lead.ai_intent}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 bg-[#080d19] rounded-lg">
                      <span className="text-[#beccea] block">Urgency:</span>
                      <span className="font-bold text-[#fca311] uppercase">{leadDetails.lead.ai_urgency || 'Medium'}</span>
                    </div>
                    <div className="p-2 bg-[#080d19] rounded-lg">
                      <span className="text-[#beccea] block">Confidence:</span>
                      <span className="font-bold text-emerald-400">
                        {leadDetails.lead.ai_confidence ? `${Math.round(leadDetails.lead.ai_confidence * 100)}%` : '85%'}
                      </span>
                    </div>
                  </div>

                  {leadDetails.lead.ai_summary && (
                    <div className="p-2.5 bg-[#080d19]/60 rounded-lg text-xs text-[#e5e5e5] leading-relaxed">
                      {leadDetails.lead.ai_summary}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#beccea]">
                  Run Gemini AI to classify customer urgency, extract service specifications, and check for dispute/human handoff triggers.
                </p>
              )}
            </div>

            {/* Contact Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-[#080d19] p-4 rounded-xl border border-[#29447e]">
              <div>
                <span className="text-[#beccea] block">Phone:</span>
                <span className="text-white font-semibold flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-[#fca311]" />
                  {leadDetails.lead.phone || 'None provided'}
                </span>
              </div>
              <div>
                <span className="text-[#beccea] block">Email:</span>
                <span className="text-white font-semibold flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-[#fca311]" />
                  {leadDetails.lead.email || 'None provided'}
                </span>
              </div>
              <div>
                <span className="text-[#beccea] block">Company / Property:</span>
                <span className="text-white font-semibold flex items-center gap-1.5 mt-0.5">
                  <Building className="w-3.5 h-3.5 text-[#fca311]" />
                  {leadDetails.lead.company || 'Private Customer'}
                </span>
              </div>
              <div>
                <span className="text-[#beccea] block">Lead Value:</span>
                <span className="text-white font-semibold font-mono mt-0.5 block">
                  ${(leadDetails.lead.estimated_value || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Associated Tasks */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#fca311]" />
                <span>Scheduled Tasks & Next Actions</span>
              </h3>
              {leadDetails.tasks.length === 0 ? (
                <p className="text-xs text-[#beccea]">No tasks assigned to this lead.</p>
              ) : (
                <div className="space-y-2">
                  {leadDetails.tasks.map(t => (
                    <div key={t.id} className="p-3 bg-[#080d19] rounded-lg border border-[#29447e] text-xs flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-white">{t.title}</div>
                        <div className="text-[11px] text-[#beccea] mt-0.5">
                          Due: {t.due_date || 'No date'} • Assignee: {t.assigned_user_name || 'Unassigned'}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${t.status === 'completed' ? 'bg-emerald-950 text-emerald-400' : 'bg-[#14213d] text-[#fca311]'}`}>
                        {t.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity History & Note Adding */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Activity History & Team Notes
              </h3>

              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add note or call summary to timeline..."
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-xs text-white focus:outline-none focus:border-[#fca311]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#29447e] hover:bg-[#3e67bf] text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post</span>
                </button>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {leadDetails.activities.map(act => (
                  <div key={act.id} className="p-2.5 bg-[#080d19] rounded-lg border border-[#29447e]/50 text-xs">
                    <p className="text-white leading-relaxed">{act.description}</p>
                    <div className="text-[10px] text-[#beccea] font-mono mt-1">
                      {new Date(act.created_at).toLocaleString()} • {act.user_name || 'System'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
