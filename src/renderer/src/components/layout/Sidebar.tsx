import React, { useState } from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Users,
  Film,
  Video,
  Send,
  Calendar,
  Smartphone,
  BarChart3,
  ListTodo,
  FileText,
  Share2,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NavigationSection, useAppStore } from '../../stores/useAppStore';
import { AppLogo } from '../common/AppLogo';

interface NavItem {
  id: NavigationSection;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { currentSection, setCurrentSection, stats } = useAppStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sections: NavSection[] = [
    {
      title: 'CREATION & STUDIO',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        { id: 'ai-studio', label: 'AI Studio', icon: <Sparkles size={18} /> },
        { id: 'characters', label: 'AI Characters', icon: <Users size={18} /> },
        { id: 'story-projects', label: 'Story Projects', icon: <Film size={18} /> },
        { id: 'video-library', label: 'Video Library', icon: <Video size={18} />, badge: stats?.totalGeneratedVideos },
      ],
    },
    {
      title: 'PUBLISH & DEVICES',
      items: [
        { id: 'publish-center', label: 'Publish Center', icon: <Send size={18} />, badge: stats?.videosReadyToPublish },
        { id: 'calendar', label: 'Content Calendar', icon: <Calendar size={18} />, badge: stats?.scheduledPosts },
        { id: 'phone-control', label: 'Phone Control', icon: <Smartphone size={18} /> },
      ],
    },
    {
      title: 'OPERATIONS & SYSTEM',
      items: [
        { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
        {
          id: 'automation-queue',
          label: 'Task Queue',
          icon: <ListTodo size={18} />,
          badge: stats?.queueSummary?.pending ? `${stats.queueSummary.pending}` : undefined,
        },
        { id: 'accounts', label: 'Accounts', icon: <Share2 size={18} /> },
        { id: 'logs', label: 'Activity Logs', icon: <FileText size={18} /> },
      ],
    },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-[#07112A] border-r border-[rgba(91,145,255,0.18)] flex flex-col h-full select-none shrink-0 transition-all duration-300 relative`}
    >
      {/* Brand Header */}
      <div className={`h-16 px-4 flex items-center border-b border-[rgba(91,145,255,0.14)] ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <AppLogo size={32} showText={!isCollapsed} />
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded-lg text-studio-400 hover:text-studio-100 hover:bg-[#102A50]/60 transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!isCollapsed && (
              <h4 className="px-3 text-[10px] font-semibold text-studio-500 uppercase tracking-wider mb-2">
                {section.title}
              </h4>
            )}
            {section.items.map((item) => {
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentSection(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'
                  } rounded-xl text-xs font-medium transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-500/25 via-brand-500/15 to-transparent text-white font-semibold shadow-[0_0_20px_rgba(8,123,255,0.2)] border-l-2 border-brand-500'
                      : 'text-studio-400 hover:text-studio-100 hover:bg-[#0B1D3B]/60'
                  }`}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <span
                      className={`transition-colors shrink-0 ${
                        isActive ? 'text-cyan-400 drop-shadow-[0_0_8px_#00C8FF]' : 'text-studio-400 group-hover:text-studio-200'
                      }`}
                    >
                      {item.icon}
                    </span>
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && item.badge !== undefined && Number(item.badge) > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isActive ? 'bg-gradient-to-r from-brand-500 to-cyan-500 text-white shadow-[0_0_10px_rgba(8,123,255,0.5)]' : 'bg-studio-800 text-studio-300 border border-[rgba(91,145,255,0.18)]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isCollapsed && item.badge !== undefined && Number(item.badge) > 0 && (
                    <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Settings & Bottom Bar */}
      <div className="p-3 border-t border-[rgba(91,145,255,0.14)] bg-[#050B1F]/60 space-y-2">
        <button
          onClick={() => setCurrentSection('settings')}
          title={isCollapsed ? 'Settings' : undefined}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2'
          } rounded-xl text-xs font-medium transition-all ${
            currentSection === 'settings'
              ? 'bg-gradient-to-r from-brand-500/25 via-brand-500/15 to-transparent text-white font-semibold border-l-2 border-brand-500 shadow-[0_0_20px_rgba(8,123,255,0.2)]'
              : 'text-studio-400 hover:text-studio-100 hover:bg-[#0B1D3B]/60'
          }`}
        >
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <Settings size={18} className={currentSection === 'settings' ? 'text-cyan-400' : 'text-studio-400'} />
            {!isCollapsed && <span>Studio Settings</span>}
          </div>
        </button>

        {isCollapsed ? (
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full flex items-center justify-center py-2 rounded-lg text-studio-400 hover:text-studio-100 hover:bg-[#102A50]/60 transition-colors"
            title="Expand Sidebar"
          >
            <ChevronRight size={16} />
          </button>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-studio-500 px-2 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#16D9A0]" />
              <span className="text-studio-400 font-medium">Engine Active</span>
            </div>
            <span className="font-mono text-[10px] text-cyan-400/80">v1.0.0</span>
          </div>
        )}
      </div>
    </aside>
  );
};
