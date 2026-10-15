import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { AppLogo } from '../common/AppLogo';
import { useAppStore } from '../../stores/useAppStore';

export const WindowFrame: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const { currentSection } = useAppStore();

  useEffect(() => {
    // Check initial maximized state
    if (window.api?.windowControls?.isMaximized) {
      window.api.windowControls.isMaximized().then(setIsMaximized).catch(() => {});
    }

    // Subscribe to window state changes (maximize/unmaximize)
    if (window.api?.windowControls?.onStateChange) {
      const cleanup = window.api.windowControls.onStateChange((maximized) => {
        setIsMaximized(maximized);
      });
      return cleanup;
    }
  }, []);

  const handleMinimize = () => {
    if (window.api?.windowControls?.minimize) {
      window.api.windowControls.minimize();
    }
  };

  const handleMaximize = async () => {
    if (window.api?.windowControls?.maximize) {
      const newState = await window.api.windowControls.maximize();
      setIsMaximized(newState);
    }
  };

  const handleClose = () => {
    if (window.api?.windowControls?.close) {
      window.api.windowControls.close();
    }
  };

  // Section title formatter for center breadcrumb
  const formatSectionTitle = (id: string) => {
    return id
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <div
      className="h-9 w-full bg-[#050B1F] border-b border-[rgba(91,145,255,0.18)] flex items-center justify-between px-3 select-none shrink-0 z-50 text-xs backdrop-blur-md"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left: Generated Logo & App Title */}
      <div className="flex items-center gap-2">
        <AppLogo size={20} />
        <span className="font-bold text-xs text-studio-100 tracking-wide">
          Social Earnings Studio
        </span>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-brand-500/15 text-brand-400 border border-brand-500/25">
          DESKTOP
        </span>
      </div>

      {/* Center: Current Module Breadcrumb / Subtle Branding */}
      <div className="hidden md:flex items-center gap-2 text-[11px] text-studio-400">
        <span className="text-studio-500">Workspace /</span>
        <span className="text-cyan-400 font-medium">{formatSectionTitle(currentSection)}</span>
      </div>

      {/* Right: Custom Native-like Window Controls (No-Drag Region) */}
      <div
        className="flex items-center -mr-3 h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* 1. Minimize Button */}
        <button
          onClick={handleMinimize}
          className="h-9 w-11 flex items-center justify-center text-studio-400 hover:text-studio-100 hover:bg-[#102A50]/70 transition-colors"
          title="Minimize"
          aria-label="Minimize"
        >
          <Minus size={13} />
        </button>

        {/* 2. Maximize / Restore Button */}
        <button
          onClick={handleMaximize}
          className="h-9 w-11 flex items-center justify-center text-studio-400 hover:text-studio-100 hover:bg-[#102A50]/70 transition-colors"
          title={isMaximized ? 'Restore Down' : 'Maximize'}
          aria-label={isMaximized ? 'Restore Down' : 'Maximize'}
        >
          {isMaximized ? (
            <Copy size={11} className="rotate-90" />
          ) : (
            <Square size={11} />
          )}
        </button>

        {/* 3. Close Button */}
        <button
          onClick={handleClose}
          className="h-9 w-12 flex items-center justify-center text-studio-400 hover:text-white hover:bg-rose-600 transition-colors"
          title="Close"
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
