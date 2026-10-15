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
    'publish-center': 'Multi-Platform Publish Center',
    calendar: 'Content Calendar & Schedule',
    'phone-control': 'Android Phone Control & ADB',
    analytics: 'Performance & Content Insights',
    'automation-queue': 'Background Task Queue',
    accounts: 'Connected Accounts & Google Sign-In',
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
    <header className="h-16 bg-[#050B1F]/90 backdrop-blur-md border-b border-[rgba(91,145,255,0.18)] px-6 flex items-center justify-between shrink-0 select-none z-10">
      <div>
        <h2 className="text-sm font-semibold text-studio-100 tracking-tight flex items-center gap-2">
          {sectionTitles[currentSection] || 'Studio'}
        </h2>
        <p className="text-[11px] text-studio-400 mt-0.5">Desktop AI Video Production & Social Automation</p>
      </div>

      <div className="flex items-center gap-4">
        {/* System Diagnostics Badges */}
        <div className="flex items-center gap-2.5 bg-[#081633]/80 px-3.5 py-1.5 rounded-xl border border-[rgba(91,145,255,0.2)] text-[11px] shadow-subtle backdrop-blur-md">
          {/* SQLite DB */}
          <div className="flex items-center gap-1.5" title="SQLite Database Active">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00C8FF]" />
            <Database size={13} className="text-cyan-400" />
            <span className="text-studio-200 font-medium">SQLite</span>
          </div>

          <span className="text-studio-700">|</span>

          {/* FFmpeg */}
          <div
            className="flex items-center gap-1.5"
            title={health?.ffmpegAvailable ? `FFmpeg Ready: ${health.ffmpegVersion}` : 'FFmpeg Not Detected'}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                health?.ffmpegAvailable
                  ? 'bg-emerald-400 shadow-[0_0_8px_#16D9A0]'
                  : 'bg-amber-400 shadow-[0_0_8px_#FFBE55]'
              }`}
            />
            <Film size={13} className={health?.ffmpegAvailable ? 'text-emerald-400' : 'text-amber-400'} />
            <span className={health?.ffmpegAvailable ? 'text-studio-200' : 'text-amber-400 font-medium'}>
              FFmpeg
            </span>
          </div>

          <span className="text-studio-700">|</span>

          {/* ADB */}
          <div
            className="flex items-center gap-1.5"
            title={health?.adbAvailable ? `ADB Ready: ${health.adbVersion}` : 'ADB Not Detected'}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                health?.adbAvailable
                  ? 'bg-emerald-400 shadow-[0_0_8px_#16D9A0]'
                  : 'bg-amber-400 shadow-[0_0_8px_#FFBE55]'
              }`}
            />
            <Smartphone size={13} className={health?.adbAvailable ? 'text-emerald-400' : 'text-amber-400'} />
            <span className={health?.adbAvailable ? 'text-studio-200' : 'text-amber-400 font-medium'}>ADB</span>
          </div>

          <span className="text-studio-700">|</span>

          {/* Free Disk Space */}
          <div className="flex items-center gap-1.5" title="Available storage on primary drive">
            <HardDrive size={13} className="text-brand-400" />
            <span className="text-studio-200 font-mono text-[10px]">
              {health?.storageAvailableMb ? `${Math.round(health.storageAvailableMb / 1024)}GB Free` : 'Storage OK'}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Upload size={14} className="text-cyan-400" />}
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
