import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import {
  Building2,
  ShieldCheck,
  ChevronDown,
  LogOut,
  User,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Crown
} from 'lucide-react';

interface NavbarProps {
  onOpenPublicSite: () => void;
  onOpenSystemTest: () => void;
  onOpenPublicFormModal: () => void;
  activeHandoffsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenPublicSite,
  onOpenSystemTest,
  onOpenPublicFormModal,
  activeHandoffsCount
}) => {
  const { user, organization, logout, switchOrganization } = useAuth();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [availableOrgs, setAvailableOrgs] = useState<Array<{ id: string; name: string; slug: string; plan: string; user_count: number }>>([]);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    api.auth.getOrganizations().then(res => {
      setAvailableOrgs(res.organizations || []);
    }).catch(console.error);
  }, [organization?.id]);

  const handleSwitch = async (orgId: string) => {
    if (orgId === organization?.id) {
      setOrgDropdownOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await switchOrganization(orgId);
      setOrgDropdownOpen(false);
    } catch (err: any) {
      alert('Failed to switch workspace: ' + err.message);
    } finally {
      setSwitching(false);
    }
  };

  const roleColors: Record<string, string> = {
    owner: 'bg-[#fca311] text-[#000000] font-bold',
    admin: 'bg-[#29447e] text-white font-medium',
    manager: 'bg-[#3e67bf] text-white',
    sales_agent: 'bg-[#10b981] text-white',
    operations: 'bg-[#8b5cf6] text-white'
  };

  const roleLabels: Record<string, string> = {
    owner: 'Organization Owner',
    admin: 'Administrator',
    manager: 'Sales Manager',
    sales_agent: 'Sales Agent',
    operations: 'Operations / CS'
  };

  return (
    <header className="h-16 bg-[#14213d] border-b border-[#29447e] px-4 sm:px-6 flex items-center justify-between z-30 sticky top-0 shadow-md">
      {/* Brand & Workspace Switcher */}
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={onOpenPublicSite}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#fca311] to-[#d68502] flex items-center justify-center text-[#000000] shadow-sm">
            <Crown className="w-5 h-5 fill-black stroke-black" />
          </div>
          <div className="hidden sm:block">
            <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
              EMPEROR <span className="text-[#fca311]">CRM</span>
            </span>
            <span className="text-[10px] tracking-wider uppercase text-[#beccea] font-mono block -mt-1">
              Multi-Tenant SaaS
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-[#29447e] hidden md:block" />

        {/* Organization / Tenant Switcher */}
        <div className="relative">
          <button
            onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#080d19]/80 border border-[#29447e] hover:border-[#fca311]/60 text-xs sm:text-sm text-white transition-all max-w-[200px] sm:max-w-[280px]"
          >
            <Building2 className="w-4 h-4 text-[#fca311] shrink-0" />
            <span className="font-semibold truncate text-left">{organization?.name || 'Select Business'}</span>
            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#14213d] text-[#fca311] font-mono shrink-0">
              {organization?.plan || 'PRO'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#beccea] shrink-0" />
          </button>

          {orgDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 bg-[#0c1425] border border-[#29447e] rounded-xl shadow-2xl p-2 z-50">
              <div className="text-[11px] font-semibold text-[#beccea] uppercase tracking-wider px-2 py-1.5 border-b border-[#29447e]/50 mb-1 flex justify-between items-center">
                <span>Switch Tenant Workspace</span>
                {switching && <RefreshCw className="w-3 h-3 animate-spin text-[#fca311]" />}
              </div>
              <div className="space-y-1">
                {availableOrgs.map(org => {
                  const isCurrent = org.id === organization?.id;
                  return (
                    <button
                      key={org.id}
                      onClick={() => handleSwitch(org.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                        isCurrent
                          ? 'bg-[#14213d] border border-[#fca311]/50 text-white font-semibold'
                          : 'hover:bg-[#14213d]/60 text-[#e5e5e5]'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <div className="truncate">{org.name}</div>
                        <div className="text-[10px] text-[#beccea] font-mono">ID: {org.id}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] uppercase px-1 rounded bg-[#080d19] text-[#fca311]">
                          {org.plan}
                        </span>
                        {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-[#fca311]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 pt-2 border-t border-[#29447e]/50 px-2 text-[10px] text-[#beccea]">
                Tenant data is strictly isolated by database constraints.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action shortcuts & User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Public Web Form preview trigger */}
        <button
          onClick={onOpenPublicFormModal}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[#29447e]/50 hover:bg-[#29447e] text-white border border-[#3e67bf]/50 transition-colors"
          title="Open customer-facing lead capture form"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#fca311]" />
          <span>Customer Form</span>
        </button>

        {/* Automated System Security Tests */}
        <button
          onClick={onOpenSystemTest}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[#080d19] hover:bg-[#04070c] text-white border border-[#29447e] hover:border-[#fca311] transition-all"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Verify Tenant Security</span>
        </button>

        {/* Public Marketing Site Link */}
        <button
          onClick={onOpenPublicSite}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-[#beccea] hover:text-white transition-colors"
        >
          <span>Marketing Site</span>
        </button>

        {/* User Role Badge & Profile */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-[#29447e]/30 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-[#29447e] border border-[#fca311]/50 flex items-center justify-center text-xs font-bold text-white uppercase">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-white leading-tight truncate max-w-[120px]">
                {user?.fullName || 'User'}
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded ${roleColors[user?.role || 'sales_agent']}`}>
                {roleLabels[user?.role || 'sales_agent']}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#beccea]" />
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#0c1425] border border-[#29447e] rounded-xl shadow-2xl p-2 z-50">
              <div className="p-2 border-b border-[#29447e]/50">
                <div className="font-bold text-sm text-white">{user?.fullName}</div>
                <div className="text-xs text-[#beccea] truncate">{user?.email}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded ${roleColors[user?.role || 'sales_agent']}`}>
                    {roleLabels[user?.role || 'sales_agent']}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">Active</span>
                </div>
              </div>

              <div className="p-2 text-xs text-[#beccea] border-b border-[#29447e]/50">
                <div className="font-semibold text-white mb-0.5">Assigned Workspace:</div>
                <div className="text-white truncate">{organization?.name}</div>
                <div className="text-[10px] text-[#beccea] font-mono mt-0.5">
                  Plan: {organization?.plan?.toUpperCase()} (Limit: {organization?.planLimits?.maxLeads} leads)
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
