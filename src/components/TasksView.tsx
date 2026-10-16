import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Task, User, Lead } from '../types/crm.js';
import {
  CheckSquare,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  UserCheck,
  X,
  Filter
} from 'lucide-react';

export const TasksView: React.FC = () => {
  const { user, organization } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [counts, setCounts] = useState<{ total: number; pending_count: number; overdue_count: number; completed_count: number }>({
    total: 0,
    pending_count: 0,
    overdue_count: 0,
    completed_count: 0
  });
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('pending');
  const [assignedFilter, setAssignedFilter] = useState('all');

  // Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    leadId: '',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    priority: 'medium',
    assignedUserId: ''
  });

  const loadTasks = async () => {
    try {
      const [tasksRes, usersRes, leadsRes] = await Promise.all([
        api.tasks.list({
          status: statusFilter === 'overdue' ? 'pending' : statusFilter === 'all' ? undefined : statusFilter,
          overdueOnly: statusFilter === 'overdue',
          assignedTo: assignedFilter !== 'all' ? assignedFilter : undefined
        }),
        api.auth.getUsers(),
        api.leads.list({ limit: 100, status: 'active' })
      ]);
      setTasks(tasksRes.tasks || []);
      setCounts(tasksRes.counts || { total: 0, pending_count: 0, overdue_count: 0, completed_count: 0 });
      setUsers(usersRes.users || []);
      setLeads(leadsRes.leads || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [statusFilter, assignedFilter, organization?.id]);

  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await api.tasks.update(task.id, { status: newStatus });
      loadTasks();
    } catch (err: any) {
      alert('Failed to update task: ' + err.message);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    try {
      await api.tasks.create({
        title: formData.title.trim(),
        description: formData.description,
        leadId: formData.leadId || undefined,
        dueDate: formData.dueDate || undefined,
        priority: formData.priority,
        assignedUserId: formData.assignedUserId || undefined
      });
      setIsCreateOpen(false);
      setFormData({
        title: '',
        description: '',
        leadId: '',
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        priority: 'medium',
        assignedUserId: ''
      });
      loadTasks();
    } catch (err: any) {
      alert('Failed to create task: ' + err.message);
    }
  };

  const priorityColors: Record<string, string> = {
    urgent: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
    high: 'bg-[#fca311]/20 text-[#fca311] border-[#fca311]/40',
    medium: 'bg-[#29447e]/40 text-[#beccea] border-[#29447e]',
    low: 'bg-[#14213d] text-[#beccea] border-transparent'
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-[#fca311]" />
            <span>Tasks & Follow-up Scheduling</span>
          </h1>
          <p className="text-xs text-[#beccea] mt-0.5">
            Deterministic follow-ups scheduled for customer outreach with overdue alerts.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-[#fca311] hover:bg-[#d68502] text-black font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Task</span>
        </button>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-3 rounded-xl border text-left transition-all ${
            statusFilter === 'all' ? 'bg-[#14213d] border-[#fca311]' : 'bg-[#080d19] border-[#29447e]/60'
          }`}
        >
          <div className="text-[11px] font-semibold text-[#beccea] uppercase">Total Tasks</div>
          <div className="text-xl font-black text-white mt-0.5">{counts.total || 0}</div>
        </button>

        <button
          onClick={() => setStatusFilter('pending')}
          className={`p-3 rounded-xl border text-left transition-all ${
            statusFilter === 'pending' ? 'bg-[#14213d] border-[#fca311]' : 'bg-[#080d19] border-[#29447e]/60'
          }`}
        >
          <div className="text-[11px] font-semibold text-[#beccea] uppercase">Pending</div>
          <div className="text-xl font-black text-[#fca311] mt-0.5">{counts.pending_count || 0}</div>
        </button>

        <button
          onClick={() => setStatusFilter('overdue')}
          className={`p-3 rounded-xl border text-left transition-all ${
            statusFilter === 'overdue' ? 'bg-[#14213d] border-rose-500' : 'bg-[#080d19] border-[#29447e]/60'
          }`}
        >
          <div className="text-[11px] font-semibold text-rose-400 uppercase flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Overdue</span>
          </div>
          <div className="text-xl font-black text-rose-400 mt-0.5">{counts.overdue_count || 0}</div>
        </button>

        <button
          onClick={() => setStatusFilter('completed')}
          className={`p-3 rounded-xl border text-left transition-all ${
            statusFilter === 'completed' ? 'bg-[#14213d] border-emerald-500' : 'bg-[#080d19] border-[#29447e]/60'
          }`}
        >
          <div className="text-[11px] font-semibold text-emerald-400 uppercase">Completed</div>
          <div className="text-xl font-black text-emerald-400 mt-0.5">{counts.completed_count || 0}</div>
        </button>
      </div>

      {/* Task List */}
      <div className="bg-[#080d19] rounded-xl border border-[#29447e]/60 overflow-hidden shadow-lg p-4 space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#beccea]">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#beccea]">
            No tasks found matching your filter.
          </div>
        ) : (
          <div className="space-y-2.5">
            {tasks.map(task => {
              const isOverdue = task.status === 'pending' && task.due_date && task.due_date < new Date().toISOString().split('T')[0];
              const isDone = task.status === 'completed';

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                    isDone
                      ? 'bg-[#0c1425]/50 border-[#29447e]/30 opacity-70'
                      : isOverdue
                      ? 'bg-[#14213d] border-rose-500/50 shadow-md'
                      : 'bg-[#0c1425] border-[#29447e]/70'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleStatus(task)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 transition-colors ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-500 text-black'
                          : 'border-[#beccea] hover:border-[#fca311]'
                      }`}
                    >
                      {isDone && <CheckCircle2 className="w-4 h-4 text-black stroke-[3]" />}
                    </button>

                    <div className="space-y-1">
                      <div className={`text-sm font-bold ${isDone ? 'line-through text-[#beccea]' : 'text-white'}`}>
                        {task.title}
                      </div>

                      {task.description && (
                        <p className="text-xs text-[#beccea] leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-[#beccea] pt-1">
                        {task.lead_first_name && (
                          <span className="font-semibold text-white">
                            Lead: {task.lead_first_name} {task.lead_last_name} {task.lead_company ? `(${task.lead_company})` : ''}
                          </span>
                        )}

                        {task.due_date && (
                          <span className={`flex items-center gap-1 font-mono ${isOverdue ? 'text-rose-400 font-bold' : ''}`}>
                            <Calendar className="w-3 h-3" />
                            {task.due_date} {isOverdue && '(Overdue)'}
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-emerald-400" />
                          {task.assigned_user_name || 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${priorityColors[task.priority] || priorityColors.medium}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE TASK MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1425] border border-[#29447e] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#29447e]/60 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#fca311]" />
                <span>Schedule Follow-up Task</span>
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-[#beccea] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call regarding revised quote, Site inspection..."
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                />
              </div>

              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Related Lead (Optional)</label>
                <select
                  value={formData.leadId}
                  onChange={e => setFormData({ ...formData, leadId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                >
                  <option value="">General Workspace Task</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.first_name} {l.last_name} {l.company ? `(${l.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#beccea] mb-1 font-semibold">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                  />
                </div>

                <div>
                  <label className="block text-[#beccea] mb-1 font-semibold">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Assign Employee</label>
                <select
                  value={formData.assignedUserId}
                  onChange={e => setFormData({ ...formData, assignedUserId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                >
                  <option value="">Assign to Me ({user?.fullName})</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Description / Notes</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Instructions or context for this task..."
                  className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                />
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
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
