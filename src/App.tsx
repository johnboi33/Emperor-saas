import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar, ActiveTab } from './components/Sidebar.js';
import { DashboardView } from './components/DashboardView.js';
import { LeadsView } from './components/LeadsView.js';
import { PipelineView } from './components/PipelineView.js';
import { TasksView } from './components/TasksView.js';
import { HandoffsView } from './components/HandoffsView.js';
import { FormsView } from './components/FormsView.js';
import { TeamView } from './components/TeamView.js';
import { SettingsView } from './components/SettingsView.js';
import { SystemTestView } from './components/SystemTestView.js';
import { LandingPage } from './components/LandingPage.js';
import { AuthModal } from './components/AuthModal.js';
import { PublicFormModal } from './components/PublicFormModal.js';
import { api } from './services/api.js';

function MainApp() {
  const { user, organization, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<ActiveTab>('dashboard');
  const [showLandingPage, setShowLandingPage] = useState(!api.getToken());
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'login' | 'register' }>({
    open: false,
    mode: 'login'
  });
  const [isPublicFormModalOpen, setIsPublicFormModalOpen] = useState(false);

  // Badge counts
  const [activeHandoffsCount, setActiveHandoffsCount] = useState(0);
  const [overdueTasksCount, setOverdueTasksCount] = useState(0);

  // Check URL parameters for direct public form testing (e.g. ?form=apex-quote)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('form')) {
      setIsPublicFormModalOpen(true);
    }
  }, []);

  const refreshBadgeCounts = async () => {
    if (!api.getToken() || !organization) return;
    try {
      const [handoffsRes, tasksRes] = await Promise.all([
        api.handoffs.list('active'),
        api.tasks.list({ overdueOnly: true, status: 'pending' })
      ]);
      setActiveHandoffsCount(handoffsRes.activeCount || 0);
      setOverdueTasksCount(tasksRes.counts?.overdue_count || 0);
    } catch (e) {
      // Background count fetch
    }
  };

  useEffect(() => {
    if (user) {
      refreshBadgeCounts();
    }
  }, [user, organization?.id, currentTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080d19] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#fca311] border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-xs text-[#beccea]">Initializing Emperor CRM Engine...</span>
        </div>
      </div>
    );
  }

  // If user is viewing the public marketing site
  if (showLandingPage && !user) {
    return (
      <>
        <LandingPage
          onEnterApp={() => setShowLandingPage(false)}
          onOpenLogin={() => setAuthModal({ open: true, mode: 'login' })}
          onOpenRegister={() => setAuthModal({ open: true, mode: 'register' })}
        />

        {authModal.open && (
          <AuthModal
            initialMode={authModal.mode}
            onClose={() => setAuthModal({ open: false, mode: 'login' })}
            onSuccess={() => {
              setAuthModal({ open: false, mode: 'login' });
              setShowLandingPage(false);
            }}
          />
        )}

        {isPublicFormModalOpen && (
          <PublicFormModal
            onClose={() => setIsPublicFormModalOpen(false)}
          />
        )}
      </>
    );
  }

  // If user is not logged in but navigated to app
  if (!user) {
    return (
      <>
        <LandingPage
          onEnterApp={() => setAuthModal({ open: true, mode: 'login' })}
          onOpenLogin={() => setAuthModal({ open: true, mode: 'login' })}
          onOpenRegister={() => setAuthModal({ open: true, mode: 'register' })}
        />
        <AuthModal
          initialMode="login"
          onClose={() => {}}
          onSuccess={() => setShowLandingPage(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d19] text-white flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        onOpenPublicSite={() => setShowLandingPage(true)}
        onOpenSystemTest={() => setCurrentTab('tests')}
        onOpenPublicFormModal={() => setIsPublicFormModalOpen(true)}
        activeHandoffsCount={activeHandoffsCount}
      />

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          activeHandoffsCount={activeHandoffsCount}
          overdueTasksCount={overdueTasksCount}
        />

        {/* Main Content Area */}
        <main className="flex-1 bg-[#0c1425] min-w-0 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigateTab={setCurrentTab}
              onOpenNewLead={() => setCurrentTab('leads')}
            />
          )}

          {currentTab === 'leads' && <LeadsView />}

          {currentTab === 'pipeline' && <PipelineView />}

          {currentTab === 'tasks' && <TasksView />}

          {currentTab === 'handoffs' && <HandoffsView />}

          {currentTab === 'forms' && (
            <FormsView
              onOpenPublicFormModal={() => setIsPublicFormModalOpen(true)}
            />
          )}

          {currentTab === 'team' && <TeamView />}

          {currentTab === 'settings' && <SettingsView />}

          {currentTab === 'tests' && <SystemTestView />}
        </main>
      </div>

      {/* Public Form Preview Modal */}
      {isPublicFormModalOpen && (
        <PublicFormModal
          onClose={() => setIsPublicFormModalOpen(false)}
          onLeadCaptured={() => refreshBadgeCounts()}
        />
      )}

      {/* Auth Modal (if switching account or registering from within) */}
      {authModal.open && (
        <AuthModal
          initialMode={authModal.mode}
          onClose={() => setAuthModal({ open: false, mode: 'login' })}
          onSuccess={() => setAuthModal({ open: false, mode: 'login' })}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
