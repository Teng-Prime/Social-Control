import React, { useEffect } from 'react';
import { useAppStore } from './stores/useAppStore';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/common/Toast';

// Views
import { DashboardView } from './views/Dashboard/DashboardView';
import { AIStudioView } from './views/AIStudio/AIStudioView';
import { CharactersView } from './views/Characters/CharactersView';
import { StoryProjectsView } from './views/StoryProjects/StoryProjectsView';
import { VideoLibraryView } from './views/VideoLibrary/VideoLibraryView';
import { PublishCenterView } from './views/PublishCenter/PublishCenterView';
import { ContentCalendarView } from './views/ContentCalendar/ContentCalendarView';
import { PhoneControlView } from './views/PhoneControl/PhoneControlView';
import { AnalyticsView } from './views/Analytics/AnalyticsView';
import { AutomationQueueView } from './views/AutomationQueue/AutomationQueueView';
import { SocialAccountsView } from './views/SocialAccounts/SocialAccountsView';
import { LogsErrorsView } from './views/LogsErrors/LogsErrorsView';
import { SettingsView } from './views/Settings/SettingsView';

export const App: React.FC = () => {
  const { currentSection, fetchSystemHealth, fetchDashboardStats, fetchSettings } = useAppStore();

  useEffect(() => {
    fetchSystemHealth();
    fetchDashboardStats();
    fetchSettings();
  }, []);

  const renderActiveView = () => {
    switch (currentSection) {
      case 'dashboard':
        return <DashboardView />;
      case 'ai-studio':
      case 'characters':
        return <AIStudioView />;
      case 'story-projects':
        return <StoryProjectsView />;
      case 'video-library':
        return <VideoLibraryView />;
      case 'publish-center':
        return <PublishCenterView />;
      case 'calendar':
        return <ContentCalendarView />;
      case 'phone-control':
        return <PhoneControlView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'automation-queue':
        return <AutomationQueueView />;
      case 'accounts':
        return <SocialAccountsView />;
      case 'logs':
        return <LogsErrorsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-studio-900 text-studio-200 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden relative bg-studio-900/90">
          {renderActiveView()}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
};

export default App;
