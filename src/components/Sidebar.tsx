import React from 'react';
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  AlertOctagon,
  FileText,
  UserCheck,
  Settings,
  ShieldCheck,
  Zap
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'leads'
  | 'pipeline'
  | 'tasks'
  | 'handoffs'
  | 'forms'
  | 'team'
  | 'settings'
  | 'tests';

interface SidebarProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeHandoffsCount: number;
  overdueTasksCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeHandoffsCount,
  overdueTasksCount
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard & KPIs', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads & Contacts', icon: Users },
    { id: 'pipeline', label: 'Visual Pipeline', icon: Kanban },
    { id: 'tasks', label: 'Tasks & Follow-ups', icon: CheckSquare, badge: overdueTasksCount, badgeColor: 'bg-rose-500' },
    { id: 'handoffs', label: 'Human Handoffs', icon: AlertOctagon, badge: activeHandoffsCount, badgeColor: 'bg-[#fca311] text-black font-bold' },
    { id: 'forms', label: 'Lead Forms & API', icon: FileText },
    { id: 'team', label: 'Team & Roles', icon: UserCheck },
    { id: 'settings', label: 'Organization & Plans', icon: Settings },
    { id: 'tests', label: 'Security & QA Suite', icon: ShieldCheck, highlight: true }
  ];

  return (
    <aside className="w-64 bg-[#080d19] border-r border-[#29447e]/60 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 border-b border-[#29447e]/40">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#beccea]">
          <Zap className="w-3.5 h-3.5 text-[#fca311]" />
          <span>Core Modules</span>
        </div>
      </div>

      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as ActiveTab)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all text-left ${
                isActive
                  ? 'bg-[#14213d] text-white border-l-4 border-[#fca311] shadow-inner font-semibold'
                  : 'text-[#e5e5e5] hover:bg-[#14213d]/50 hover:text-white'
              } ${item.highlight ? 'border border-[#29447e]/50 mt-4' : ''}`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#fca311]' : item.highlight ? 'text-emerald-400' : 'text-[#beccea]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-[#29447e] text-white'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 m-3 bg-[#0c1425] border border-[#29447e]/50 rounded-xl text-xs text-[#beccea]">
        <div className="font-semibold text-white flex items-center gap-1.5 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Tenant Enforced</span>
        </div>
        <p className="text-[11px] text-[#beccea]/80 leading-relaxed">
          Queries and automations are constrained strictly to current organization boundaries.
        </p>
      </div>
    </aside>
  );
};
