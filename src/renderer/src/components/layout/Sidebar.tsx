import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Users,
  Film,
  Video,
  Share2,
  Send,
  Calendar,
  Smartphone,
  BarChart3,
  ListTodo,
  FileText,
  Settings,
} from 'lucide-react';
import { NavigationSection, useAppStore } from '../../stores/useAppStore';

interface NavItem {
  id: NavigationSection;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
}

export const Sidebar: React.FC = () => {
  const { currentSection, setCurrentSection, stats } = useAppStore();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'ai-studio', label: 'AI Studio', icon: <Sparkles size={18} /> },
    { id: 'story-projects', label: 'Story Projects', icon: <Film size={18} /> },
    { id: 'video-library', label: 'Video Library', icon: <Video size={18} />, badge: stats?.totalGeneratedVideos },
    { id: 'social-accounts', label: 'Social Accounts', icon: <Share2 size={18} />, badge: stats?.connectedAccountsCount },
    { id: 'publish-center', label: 'Publish Center', icon: <Send size={18} />, badge: stats?.videosReadyToPublish },
    { id: 'calendar', label: 'Content Calendar', icon: <Calendar size={18} />, badge: stats?.scheduledPosts },
    { id: 'phone-control', label: 'Phone Control', icon: <Smartphone size={18} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
    {
      id: 'automation-queue',
      label: 'Automation Queue',
      icon: <ListTodo size={18} />,
      badge: stats?.queueSummary?.pending ? `${stats.queueSummary.pending}` : undefined,
    },
    { id: 'logs', label: 'Logs & Errors', icon: <FileText size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  return (
    <aside className="w-64 bg-studio-900 border-r border-studio-800 flex flex-col h-screen select-none shrink-0">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-studio-800/80">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-cyan-400 flex items-center justify-center shadow-glow-brand">
          <Sparkles className="text-white" size={18} />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-wide text-studio-100 flex items-center gap-1.5">
            Social Earnings
          </h1>
          <p className="text-[10px] text-brand-400 font-medium tracking-wider uppercase">Studio Desktop</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentSection(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-brand-500/15 text-brand-400 font-semibold shadow-subtle border border-brand-500/20'
                  : 'text-studio-400 hover:text-studio-200 hover:bg-studio-850/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-brand-400' : 'text-studio-500 group-hover:text-studio-300'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && Number(item.badge) > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    isActive ? 'bg-brand-500 text-white' : 'bg-studio-800 text-studio-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-studio-800/80 bg-studio-950/40">
        <div className="flex items-center justify-between text-[11px] text-studio-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Studio Engine Active</span>
          </div>
          <span className="font-mono text-[10px] text-studio-600">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};
