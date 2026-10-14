import React from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Database, Film, Smartphone, HardDrive, Plus, Upload } from 'lucide-react';
import { Button } from '../common/Button';

export const Header: React.FC = () => {
  const { currentSection, setCurrentSection, health, addToast } = useAppStore();

  const sectionTitles: Record<string, string> = {
    dashboard: 'Dashboard Overview',
    'ai-studio': 'AI Studio — Story & Character Creation',
    characters: 'Character Profiles & Consistency Library',
    'story-projects': 'Story Projects & Scenes',
    'video-library': 'Local Video Library',
    'social-accounts': 'Connected Social Accounts',
    'publish-center': 'Multi-Platform Publish Center',
    calendar: 'Content Calendar & Schedule',
    'phone-control': 'Android Phone Control & ADB',
    analytics: 'Performance & Content Insights',
    'automation-queue': 'Background Task Queue',
    logs: 'Activity & Error Logs',
    settings: 'Studio Preferences & API Settings',
  };

  const handleQuickImport = async () => {
    try {
      if (window.api) {
        const filePath = await window.api.openFileDialog(['mp4', 'mov', 'webm', 'mkv']);
        if (filePath) {
          addToast({
            type: 'info',
            title: 'Importing Video...',
            message: filePath,
          });
          const asset = await window.api.importMediaAsset(filePath, 'Drafts');
          addToast({
            type: 'success',
            title: 'Import Complete',
            message: `Added ${asset.title} to Video Library.`,
          });
          setCurrentSection('video-library');
        }
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Import Failed',
        message: err.message,
      });
    }
  };

  return (
    <header className="h-16 bg-studio-900 border-b border-studio-800 px-6 flex items-center justify-between shrink-0 select-none">
      <div>
        <h2 className="text-base font-semibold text-studio-100">{sectionTitles[currentSection] || 'Studio'}</h2>
        <p className="text-[11px] text-studio-400">Desktop AI Video Production & Social Automation</p>
      </div>

      <div className="flex items-center gap-4">
        {/* System Diagnostics Badges */}
        <div className="flex items-center gap-2 bg-studio-850 px-3 py-1.5 rounded-xl border border-studio-800 text-[11px]">
          {/* SQLite DB */}
          <div className="flex items-center gap-1.5" title="SQLite Database Active">
            <Database size={13} className="text-brand-400" />
            <span className="text-studio-300">SQLite</span>
          </div>

          <span className="text-studio-700">|</span>

          {/* FFmpeg */}
          <div
            className="flex items-center gap-1.5"
            title={health?.ffmpegAvailable ? `FFmpeg Ready: ${health.ffmpegVersion}` : 'FFmpeg Not Detected'}
          >
            <Film size={13} className={health?.ffmpegAvailable ? 'text-emerald-400' : 'text-amber-400'} />
            <span className={health?.ffmpegAvailable ? 'text-studio-300' : 'text-amber-400'}>FFmpeg</span>
          </div>

          <span className="text-studio-700">|</span>

          {/* ADB */}
          <div
            className="flex items-center gap-1.5"
            title={health?.adbAvailable ? `ADB Ready: ${health.adbVersion}` : 'ADB Not Detected'}
          >
            <Smartphone size={13} className={health?.adbAvailable ? 'text-emerald-400' : 'text-amber-400'} />
            <span className={health?.adbAvailable ? 'text-studio-300' : 'text-amber-400'}>ADB</span>
          </div>

          <span className="text-studio-700">|</span>

          {/* Free Disk Space */}
          <div className="flex items-center gap-1.5" title="Available storage on primary drive">
            <HardDrive size={13} className="text-cyan-400" />
            <span className="text-studio-300 font-mono text-[10px]">
              {health?.storageAvailableMb ? `${Math.round(health.storageAvailableMb / 1024)}GB Free` : 'Storage OK'}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Upload size={14} />}
            onClick={handleQuickImport}
          >
            Import Video
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setCurrentSection('ai-studio')}
          >
            Create Video
          </Button>
        </div>
      </div>
    </header>
  );
};
