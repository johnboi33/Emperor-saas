import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Settings,
  Shield,
  CreditCard,
  Building,
  CheckCircle2,
  Crown,
  Sparkles,
  Zap,
  Save
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user, organization, refreshSession } = useAuth();
  const [orgData, setOrgData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formSettings, setFormSettings] = useState({
    name: '',
    currency: 'USD',
    industry: 'Local Services',
    phone: '',
    autoAssign: true,
    requireLostReason: true
  });

  const loadOrg = async () => {
    try {
      const res = await api.organization.current();
      setOrgData(res.organization);
      const settings = res.organization.settings || {};
      setFormSettings({
        name: res.organization.name || '',
        currency: settings.currency || 'USD',
        industry: settings.industry || 'Local Services',
        phone: settings.phone || '',
        autoAssign: settings.autoAssign ?? true,
        requireLostReason: settings.requireLostReason ?? true
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrg();
  }, [organization?.id]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.organization.updateSettings(formSettings);
      await refreshSession();
      alert('Organization settings updated successfully.');
    } catch (err: any) {
      alert('Failed to update settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePlanChange = async (planKey: string) => {
    if (planKey === orgData?.plan) return;
    try {
      await api.organization.updatePlan(planKey);
      await refreshSession();
      loadOrg();
      alert(`Subscription plan updated to ${planKey.toUpperCase()}! Limits have been refreshed.`);
    } catch (err: any) {
      alert('Failed to update plan: ' + err.message);
    }
  };

  const planTiers = [
    {
      key: 'starter',
      name: 'Starter Plan',
      price: '$49/mo',
      leads: '250 leads',
      users: '3 users',
      ai: false,
      webhooks: false
    },
    {
      key: 'growth',
      name: 'Growth Plan',
      price: '$129/mo',
      leads: '5,000 leads',
      users: '15 users',
      ai: true,
      webhooks: true,
      popular: true
    },
    {
      key: 'pro',
      name: 'Pro Enterprise',
      price: '$299/mo',
      leads: '25,000 leads',
      users: '50 users',
      ai: true,
      webhooks: true
    }
  ];

  if (loading) {
    return <div className="p-8 text-center text-xs text-[#beccea]">Loading settings...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#fca311]" />
          <span>Organization Configuration & Subscription Tier</span>
        </h1>
        <p className="text-xs text-[#beccea] mt-0.5">
          Workspace parameters, currency, automated assignment rules, and plan limits.
        </p>
      </div>

      {/* Plan Tiers & Limits Section */}
      <div className="bg-[#080d19] p-6 rounded-2xl border border-[#29447e]/60 shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#fca311]" />
              <span>Subscription Tier & Plan Limits</span>
            </h2>
            <p className="text-xs text-[#beccea] mt-0.5">
              Current Tier: <span className="text-[#fca311] font-bold uppercase">{orgData?.plan}</span> • {orgData?.leadCount || 0} / {orgData?.planLimits?.maxLeads} leads used
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {planTiers.map(tier => {
            const isCurrent = orgData?.plan === tier.key;

            return (
              <div
                key={tier.key}
                className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'bg-[#14213d] border-[#fca311] shadow-xl'
                    : 'bg-[#0c1425] border-[#29447e]/50 hover:border-[#29447e]'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-white">{tier.name}</span>
                    {tier.popular && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#fca311] text-black">
                        RECOMMENDED
                      </span>
                    )}
                  </div>

                  <div className="text-2xl font-black text-white font-mono">{tier.price}</div>

                  <ul className="space-y-1.5 text-xs text-[#e5e5e5] pt-2 border-t border-[#29447e]/30">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{tier.leads}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{tier.users}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${tier.ai ? 'text-emerald-400' : 'text-[#beccea]/40'}`} />
                      <span className={tier.ai ? '' : 'text-[#beccea]/50'}>AI Qualification & Intents</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${tier.webhooks ? 'text-emerald-400' : 'text-[#beccea]/40'}`} />
                      <span className={tier.webhooks ? '' : 'text-[#beccea]/50'}>Zapier & Make.com Webhooks</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => handlePlanChange(tier.key)}
                  disabled={isCurrent}
                  className={`mt-5 w-full py-2 text-xs font-bold rounded-xl transition-all ${
                    isCurrent
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40 cursor-default'
                      : 'bg-[#fca311] hover:bg-[#d68502] text-black shadow-md'
                  }`}
                >
                  {isCurrent ? 'Current Active Tier' : `Switch to ${tier.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Organization Settings Form */}
      {['owner', 'admin'].includes(user?.role || '') && (
        <form onSubmit={handleSaveSettings} className="bg-[#080d19] p-6 rounded-2xl border border-[#29447e]/60 shadow-xl space-y-4 text-xs">
          <div className="flex items-center gap-2 text-white font-bold text-base pb-2 border-b border-[#29447e]/50">
            <Building className="w-5 h-5 text-[#fca311]" />
            <span>Workspace Preferences</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#beccea] mb-1 font-semibold">Business Name *</label>
              <input
                type="text"
                required
                value={formSettings.name}
                onChange={e => setFormSettings({ ...formSettings, name: e.target.value })}
                className="w-full px-3 py-2 bg-[#0c1425] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
              />
            </div>

            <div>
              <label className="block text-[#beccea] mb-1 font-semibold">Industry / Domain</label>
              <input
                type="text"
                value={formSettings.industry}
                onChange={e => setFormSettings({ ...formSettings, industry: e.target.value })}
                className="w-full px-3 py-2 bg-[#0c1425] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
              />
            </div>

            <div>
              <label className="block text-[#beccea] mb-1 font-semibold">Currency Code</label>
              <select
                value={formSettings.currency}
                onChange={e => setFormSettings({ ...formSettings, currency: e.target.value })}
                className="w-full px-3 py-2 bg-[#0c1425] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#beccea] mb-1 font-semibold">Support Phone</label>
              <input
                type="text"
                value={formSettings.phone}
                onChange={e => setFormSettings({ ...formSettings, phone: e.target.value })}
                className="w-full px-3 py-2 bg-[#0c1425] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
              />
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer text-white">
              <input
                type="checkbox"
                checked={formSettings.autoAssign}
                onChange={e => setFormSettings({ ...formSettings, autoAssign: e.target.checked })}
                className="w-4 h-4 rounded text-[#fca311] focus:ring-0"
              />
              <span className="font-semibold">Auto-assign new web leads to the primary operator</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-white">
              <input
                type="checkbox"
                checked={formSettings.requireLostReason}
                onChange={e => setFormSettings({ ...formSettings, requireLostReason: e.target.checked })}
                className="w-4 h-4 rounded text-[#fca311] focus:ring-0"
              />
              <span className="font-semibold">Require employees to specify a reason when marking deals as Lost</span>
            </label>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#fca311] hover:bg-[#d68502] text-black font-bold rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Workspace Settings'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
