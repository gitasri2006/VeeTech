import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
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
  const [showAdminSidebar, setShowAdminSidebar] = useState<boolean>(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string>('art-001');

  const handleLoginSuccess = (
    user: { id: string; name: string; email: string; role: UserRole },
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
    setShowAdminSidebar(false);
  };

  const handleSelectStory = (id: string) => {
    setSelectedStoryId(id);
    setCurrentView('story-detail');
  };

  // If user is not logged in, display the Login View first
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const renderActiveView = () => {
    switch (currentView) {
      case 'discovery':
        return <DiscoveryChatView currentUser={currentUser} />;
      case 'feed':
        return <FeedView onSelectStory={handleSelectStory} />;
      case 'story-detail':
        return <StoryDetailView storyId={selectedStoryId} onBack={() => setCurrentView('feed')} />;
      case 'media-viewer':
        return <MediaViewerView />;
      case 'entities':
        return <EntitiesView />;
      case 'rules':
        return <RulesView />;
      case 'settings':
        return <SettingsView />;
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
        return <DiscoveryChatView currentUser={currentUser} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar
        currentUser={currentUser}
        onRefresh={() => console.log('Refreshing pipeline state')}
        showAdminSidebar={showAdminSidebar}
        onToggleAdminSidebar={() => setShowAdminSidebar(!showAdminSidebar)}
        onOpenSettings={() => {
          setCurrentView('settings');
          setShowAdminSidebar(true);
        }}
        onResetToChat={() => setCurrentView('discovery')}
        onLogout={handleLogout}
      />

      <div className="flex flex-1 overflow-hidden">
        {showAdminSidebar && (
          <Sidebar
            currentView={currentView}
            onSelectView={setCurrentView}
            pendingFactCheckCount={2}
            pendingWhatsAppCount={2}
          />
        )}

        <main className="flex-1 overflow-y-auto bg-slate-50">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
};
export default App;


