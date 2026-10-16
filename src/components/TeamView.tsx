import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { User } from '../types/crm.js';
import {
  UserCheck,
  Plus,
  Shield,
  Mail,
  CheckCircle2,
  Lock,
  Crown,
  X
} from 'lucide-react';

export const TeamView: React.FC = () => {
  const { user, organization } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'sales_agent'
  });

  const loadUsers = async () => {
    try {
      const res = await api.auth.getUsers();
      setUsers(res.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [organization?.id]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim()) return;
    try {
      await api.auth.inviteUser(formData);
      setIsInviteOpen(false);
      setFormData({ fullName: '', email: '', role: 'sales_agent' });
      loadUsers();
      alert(`User ${formData.fullName} added successfully. Default temporary password: Emperor2026!`);
    } catch (err: any) {
      alert('Failed to invite user: ' + err.message);
    }
  };

  const roleLabels: Record<string, string> = {
    owner: 'Organization Owner',
    admin: 'Administrator',
    manager: 'Sales Manager',
    sales_agent: 'Sales Agent',
    operations: 'Operations / CS'
  };

  const roleColors: Record<string, string> = {
    owner: 'bg-[#fca311] text-black font-bold',
    admin: 'bg-[#29447e] text-white',
    manager: 'bg-[#3e67bf] text-white',
    sales_agent: 'bg-[#10b981] text-white',
    operations: 'bg-[#8b5cf6] text-white'
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#fca311]" />
            <span>Team Members & Role-Based Access Control</span>
          </h1>
          <p className="text-xs text-[#beccea] mt-0.5">
            Manage employee access, role permissions, and tenant privileges.
          </p>
        </div>

        {['owner', 'admin'].includes(user?.role || '') && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="px-4 py-2 bg-[#fca311] hover:bg-[#d68502] text-black font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        )}
      </div>

      {/* Role Permission Matrix Card */}
      <div className="bg-[#080d19] p-5 rounded-2xl border border-[#29447e]/60 shadow-lg space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#fca311]" />
          <span>Role Capability & Security Matrix</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="p-3 bg-[#0c1425] rounded-xl border border-[#29447e]/40 space-y-1">
            <span className="font-bold text-[#fca311] block">Owner</span>
            <p className="text-[#beccea] text-[11px] leading-tight">
              Full workspace rights: subscription billing, team invites, workspace deletion, all data exports.
            </p>
          </div>
          <div className="p-3 bg-[#0c1425] rounded-xl border border-[#29447e]/40 space-y-1">
            <span className="font-bold text-white block">Administrator</span>
            <p className="text-[#beccea] text-[11px] leading-tight">
              Manage pipeline stages, team invites, custom forms, CSV data exports/imports, all leads.
            </p>
          </div>
          <div className="p-3 bg-[#0c1425] rounded-xl border border-[#29447e]/40 space-y-1">
            <span className="font-bold text-white block">Manager</span>
            <p className="text-[#beccea] text-[11px] leading-tight">
              Full pipeline transitions, CSV export, task assignment, resolve human handoffs.
            </p>
          </div>
          <div className="p-3 bg-[#0c1425] rounded-xl border border-[#29447e]/40 space-y-1">
            <span className="font-bold text-white block">Sales Agent</span>
            <p className="text-[#beccea] text-[11px] leading-tight">
              Manage assigned leads, transition stages, complete tasks. Export & stage settings restricted.
            </p>
          </div>
          <div className="p-3 bg-[#0c1425] rounded-xl border border-[#29447e]/40 space-y-1">
            <span className="font-bold text-white block">Operations / CS</span>
            <p className="text-[#beccea] text-[11px] leading-tight">
              Review and resolve human handoff queue, customer notes, task completions.
            </p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#080d19] rounded-2xl border border-[#29447e]/60 overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#beccea]">Loading team members...</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-[#14213d] text-[#beccea] uppercase font-semibold text-[11px] border-b border-[#29447e]">
              <tr>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Joined Workspace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#29447e]/30 text-[#e5e5e5]">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-[#14213d]/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#14213d] border border-[#fca311]/40 flex items-center justify-center text-xs text-white uppercase">
                      {u.fullName.charAt(0)}
                    </div>
                    <span>{u.fullName}</span>
                    {u.id === user?.id && <span className="text-[10px] text-[#fca311] font-mono">(You)</span>}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#beccea]">
                    {u.email}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${roleColors[u.role] || 'bg-[#14213d]'}`}>
                      {roleLabels[u.role] || u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#beccea] text-[11px]">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active Member'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* INVITE USER MODAL */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1425] border border-[#29447e] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#29447e]/60 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#fca311]" />
                <span>Add Team Member</span>
              </h3>
              <button onClick={() => setIsInviteOpen(false)} className="text-[#beccea] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jason Taylor"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                />
              </div>

              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. jason@business.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                />
              </div>

              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Role *</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                >
                  <option value="sales_agent">Sales Agent (Lead & Task management)</option>
                  <option value="manager">Sales Manager (Pipeline & Exports)</option>
                  <option value="operations">Operations / CS (Handoffs & Notes)</option>
                  <option value="admin">Administrator (Settings & Teams)</option>
                </select>
              </div>

              <div className="p-3 bg-[#080d19] rounded-xl border border-[#29447e]/50 text-[11px] text-[#beccea]">
                A temporary password (<code className="text-[#fca311]">Emperor2026!</code>) will be assigned.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#14213d] text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#fca311] hover:bg-[#d68502] text-black font-bold"
                >
                  Add Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
