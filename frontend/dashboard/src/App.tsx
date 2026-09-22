import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DiscoverySidebar, InquirySession } from './components/DiscoverySidebar';
import { ViewType, UserRole } from './types';

import { LoginView } from './views/LoginView';
import { DiscoveryChatView } from './views/DiscoveryChatView';
import { FeedView } from './views/FeedView';
import { StoryDetailView } from './views/StoryDetailView';
import { MediaViewerView } from './views/MediaViewerView';
import { EntitiesView } from './views/EntitiesView';
import { RulesView } from './views/RulesView';
import { SettingsView } from './views/SettingsView';
import { FactCheckQueueView } from './views/FactCheckQueueView';
import { WhatsAppBotView } from './views/WhatsAppBotView';
import { ReportingView } from './views/ReportingView';
import { AdminUsersView } from './views/AdminUsersView';
import { AuditLogView } from './views/AuditLogView';
import { ExecutiveBriefsView } from './views/ExecutiveBriefsView';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
    organization?: string;
    designation?: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('discovery_auth_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error reading auth state', e);
    }
    return null;
  });

  const [currentView, setCurrentView] = useState<ViewType>('discovery');
  const [selectedStoryId, setSelectedStoryId] = useState<string>('art-001');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [activeSessionId, setActiveSessionId] = useState<string>('sess-1');
  const [newInquiryTrigger, setNewInquiryTrigger] = useState<number>(0);

  const [sessions, setSessions] = useState<InquirySession[]>(() => {
    try {
      const emailKey = currentUser?.email ? currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'default';
      const saved = localStorage.getItem(`discovery_history_${emailKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading search history', e);
    }
    return [];
  });

  useEffect(() => {
    const emailKey = currentUser?.email ? currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'default';
    const localSaved = localStorage.getItem(`discovery_history_${emailKey}`);
    if (localSaved) {
      try {
        const parsed = JSON.parse(localSaved);
        if (Array.isArray(parsed)) setSessions(parsed);
      } catch (e) {}
    } else {
      setSessions([]);
    }

    if (currentUser?.email) {
      fetch(`/api/discovery/history?email=${encodeURIComponent(currentUser.email)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.history) && data.history.length > 0) {
            setSessions(data.history);
            localStorage.setItem(`discovery_history_${emailKey}`, JSON.stringify(data.history));
          }
        })
        .catch(() => {});
    }
  }, [currentUser?.email]);

  useEffect(() => {
    const emailKey = currentUser?.email ? currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'default';
    try {
      localStorage.setItem(`discovery_history_${emailKey}`, JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save search history', e);
    }
  }, [sessions, currentUser?.email]);

  const handleLoginSuccess = (
    user: { id: string; name: string; email: string; role: UserRole; organization?: string; designation?: string },
    token: string
  ) => {
    try {
      localStorage.setItem('discovery_auth_user', JSON.stringify(user));
      localStorage.setItem('discovery_auth_token', token);
    } catch (e) {
      console.error('Failed to save auth state', e);
    }
    setCurrentUser(user);
    setCurrentView('discovery');
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('discovery_auth_user');
      localStorage.removeItem('discovery_auth_token');
    } catch (e) {
      console.error('Failed to clear auth state', e);
    }
    setCurrentUser(null);
  };

  const handleSelectStory = (id: string) => {
    setSelectedStoryId(id);
    setCurrentView('story-detail');
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    if (currentUser?.email) {
      fetch(`/api/discovery/history?email=${encodeURIComponent(currentUser.email)}&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
    if (activeSessionId === id) {
      setActiveSessionId(`sess-${Date.now()}`);
      setNewInquiryTrigger((prev) => prev + 1);
    }
  };

  const handleClearHistory = () => {
    setSessions([]);
    const emailKey = currentUser?.email ? currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'default';
    localStorage.removeItem(`discovery_history_${emailKey}`);
    if (currentUser?.email) {
      fetch(`/api/discovery/history?email=${encodeURIComponent(currentUser.email)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
    setActiveSessionId(`sess-${Date.now()}`);
    setNewInquiryTrigger((prev) => prev + 1);
  };

  const handleNewInquiry = () => {
    setActiveSessionId(`sess-${Date.now()}`);
    setNewInquiryTrigger((prev) => prev + 1);
    setCurrentView('discovery');
  };

  // If user is not logged in, display the Login View first
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const handleUpdateUser = (updated: { id: string; name: string; email: string; role: UserRole; organization?: string; designation?: string }) => {
    setCurrentUser(updated);
    try {
      localStorage.setItem('discovery_auth_user', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to update user preferences', e);
    }
  };

  const renderActiveView = () => {
    switch (currentView) {
      case 'discovery':
        return (
          <DiscoveryChatView
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            activeSessionId={activeSessionId}
            sessions={sessions}
            onUpdateSessions={(updated) => setSessions(updated)}
            newInquiryTrigger={newInquiryTrigger}
            onNewInquiry={handleNewInquiry}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={setIsSidebarOpen}
            onOpenSettings={() => setCurrentView('settings')}
            onOpenRules={() => setCurrentView('rules')}
          />
        );
      case 'feed':
        return <FeedView onSelectStory={handleSelectStory} />;
      case 'story-detail':
        return <StoryDetailView storyId={selectedStoryId} onBack={() => setCurrentView('feed')} />;
      case 'media-viewer':
        return <MediaViewerView />;
      case 'entities':
        return <EntitiesView />;
      case 'rules':
        return (
          <RulesView
            onBack={() => setCurrentView('discovery')}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={setIsSidebarOpen}
          />
        );
      case 'settings':
        return (
          <SettingsView
            onBack={() => setCurrentView('discovery')}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={setIsSidebarOpen}
          />
        );
      case 'factcheck-queue':
        return <FactCheckQueueView />;
      case 'whatsapp-moderation':
        return <WhatsAppBotView />;
      case 'reporting':
        return <ReportingView />;
      case 'admin-users':
        return <AdminUsersView />;
      case 'audit-log':
        return <AuditLogView />;
      case 'briefs':
        return <ExecutiveBriefsView />;
      default:
        return (
          <DiscoveryChatView
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            activeSessionId={activeSessionId}
            sessions={sessions}
            onUpdateSessions={(updated) => setSessions(updated)}
            newInquiryTrigger={newInquiryTrigger}
            onNewInquiry={handleNewInquiry}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={setIsSidebarOpen}
            onOpenSettings={() => setCurrentView('settings')}
            onOpenRules={() => setCurrentView('rules')}
          />
        );
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-50 text-slate-900 flex flex-col font-sans overflow-hidden">
      <Navbar
        currentUser={currentUser}
        onRefresh={() => console.log('Refreshing pipeline state')}
        onOpenSettings={() => setCurrentView('settings')}
        onResetToChat={handleNewInquiry}
        onLogout={handleLogout}
      />

      <div className="flex flex-1 h-[calc(100vh-4rem)] overflow-hidden">
        <DiscoverySidebar
          currentView={currentView}
          currentUser={currentUser}
          sessions={sessions}
          activeSessionId={activeSessionId}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={setIsSidebarOpen}
          onSelectSession={(sess) => {
            setActiveSessionId(sess.id);
            setCurrentView('discovery');
          }}
          onDeleteSession={handleDeleteSession}
          onClearHistory={handleClearHistory}
          onNewInquiry={handleNewInquiry}
          onOpenRules={() => setCurrentView('rules')}
          onOpenSettings={() => setCurrentView('settings')}
        />

        <main className="flex-1 h-full overflow-y-auto bg-slate-50 flex flex-col relative custom-scrollbar">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
};
export default App;


