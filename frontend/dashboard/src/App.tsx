import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ViewType, UserRole } from './types';

import { DiscoveryView } from './views/DiscoveryView';
import { FeedView } from './views/FeedView';
import { StoryDetailView } from './views/StoryDetailView';
import { MediaViewerView } from './views/MediaViewerView';
import { EntitiesView } from './views/EntitiesView';
import { RulesView } from './views/RulesView';
import { FactCheckQueueView } from './views/FactCheckQueueView';
import { WhatsAppBotView } from './views/WhatsAppBotView';
import { ReportingView } from './views/ReportingView';
import { AdminUsersView } from './views/AdminUsersView';
import { AuditLogView } from './views/AuditLogView';
import { ExecutiveBriefsView } from './views/ExecutiveBriefsView';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('feed');
  const [currentRole, setCurrentRole] = useState<UserRole>('Admin');
  const [selectedStoryId, setSelectedStoryId] = useState<string>('art-001');

  const handleSelectStory = (id: string) => {
    setSelectedStoryId(id);
    setCurrentView('story-detail');
  };

  const renderActiveView = () => {
    switch (currentView) {
      case 'discovery':
        return <DiscoveryView />;
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
        return <FeedView onSelectStory={handleSelectStory} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onRefresh={() => console.log('Refreshing pipeline state')}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          pendingFactCheckCount={2}
          pendingWhatsAppCount={2}
        />

        <main className="flex-1 overflow-y-auto bg-slate-950 pb-16">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
};
export default App;
