import React, { useEffect } from 'react';
import { useAppStore } from './stores/useAppStore';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { WindowFrame } from './components/layout/WindowFrame';
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
        return <AIStudioView />;
      case 'characters':
        return <AIStudioView initialOpenCharactersConfig={true} />;
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
    <div className="flex flex-col h-screen w-screen bg-[#050B1F] text-studio-100 overflow-hidden font-sans relative">
      {/* Background ambient lighting for deep glassmorphism depth */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-brand-500/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-purple-500/10 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute top-1/2 right-10 w-[400px] h-[250px] bg-cyan-500/8 blur-[130px] pointer-events-none rounded-full" />

      <WindowFrame />
      <div className="flex-1 flex overflow-hidden relative z-0">
        <Sidebar />
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <Header />
          <main className="flex-1 overflow-hidden relative bg-[#050B1F]/60 backdrop-blur-sm">
            {renderActiveView()}
          </main>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default App;
