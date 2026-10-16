import React, { useState } from 'react';
import { StoryProject, SubtitleSettings } from '../../../../../shared/types';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Select } from '../../../components/common/Select';
import { useAppStore } from '../../../stores/useAppStore';
import { FlowConnectionCard } from '../FlowConnectionCard';
import {
  Film,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Download,
  FolderOpen,
  Share2,
  Subtitles,
  Sliders,
  Video,
  Cpu,
} from 'lucide-react';

interface Step7FinalExportProps {
  project: StoryProject;
  onRefreshProject: () => Promise<void>;
  onUpdateProject: (updates: Partial<StoryProject>) => Promise<void>;
  onResetToNewProject: () => void;
}

export const Step7FinalExport: React.FC<Step7FinalExportProps> = ({
  project,
  onRefreshProject,
  onUpdateProject,
  onResetToNewProject,
}) => {
  const { addToast, setCurrentSection, health } = useAppStore();

  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatusText, setRenderStatusText] = useState('');
  const [selectedAspect, setSelectedAspect] = useState<'9:16' | '16:9' | '1:1'>(
    project.aspectRatio || '9:16'
  );

  const defaultSubtitles: SubtitleSettings = {
    enabled: true,
    style: 'tiktok',
    text: project.scenes.map((s) => s.narration).filter(Boolean).join('\n'),
  };

  const currentSubtitles: SubtitleSettings = {
    ...defaultSubtitles,
    ...(project.subtitlesSettings || {}),
  };

  const readyClipsCount = project.scenes.filter((s) => Boolean(s.videoPath)).length;
  const isReadyToRender = readyClipsCount > 0;
  const hasVoice = Boolean(project.voiceSettings?.audioPath);
  const hasMusic = Boolean(project.musicSettings?.audioPath || project.musicSettings?.trackId);
  const hasFinalVideo = Boolean(project.finalVideoPath);

  const handleUpdateSubtitles = async (updates: Partial<SubtitleSettings>) => {
    const updated = { ...currentSubtitles, ...updates };
    await onUpdateProject({ subtitlesSettings: updated });
  };

  const handleExecuteRender = async () => {
    if (!isReadyToRender) {
      addToast({
        type: 'error',
        title: 'Missing Scene Clips',
        message: 'At least one scene must have an approved video clip before rendering.',
      });
      return;
    }

    if (!window.api) return;
    setIsRendering(true);
    setRenderProgress(10);
    setRenderStatusText('Concatenating video timeline & scaling to resolution...');

    try {
      const interval = setInterval(() => {
        setRenderProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 15;
        });
      }, 800);

      const res = await window.api.renderFinalVideo(project.id, {
        aspectRatio: selectedAspect,
        resolution: '1080p',
        mixAudio: true,
        burnedSubtitles: currentSubtitles.enabled,
      });

      clearInterval(interval);
      setRenderProgress(100);
      setRenderStatusText('Video assembled and registered in Video Library!');

      await onRefreshProject();
      addToast({
        type: 'success',
        title: 'Story Video Rendered & Saved',
        message: 'Final video registered in Video Library under ReadyToPublish.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Render Failed', message: err.message });
      setRenderStatusText('Render encountered an error: ' + err.message);
    } finally {
      setIsRendering(false);
    }
  };

  const handleOpenInLibrary = () => {
    setCurrentSection('video-library');
  };

  const handleRevealInExplorer = async () => {
    if (project.finalVideoPath && window.api) {
      await window.api.revealInFileExplorer(project.finalVideoPath);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex items-center justify-between pb-4 border-b border-studio-800">
        <div>
          <h2 className="text-base font-bold text-studio-100 flex items-center gap-2">
            <Film size={18} className="text-brand-400" />
            Step 7: Final Assembly, Subtitles & 1080p Export
          </h2>
          <p className="text-xs text-studio-400 mt-0.5">
            Full pipeline assembly: Story → Scene Clips → Voice-over → Background Music → Sound Effects → Subtitles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasFinalVideo && (
            <Badge variant="success" size="sm" dot>
              Final Video Ready
            </Badge>
          )}
        </div>
      </div>

      {/* Embedded Google Flow Connection Panel */}
      <FlowConnectionCard />

      {/* Pipeline Checklist Card */}
      <div className="p-4 rounded-2xl bg-studio-950 border border-studio-800">
        <h3 className="text-xs font-bold text-studio-200 uppercase tracking-wider mb-3">
          Pipeline Asset Verification
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-studio-900 border border-studio-800 flex items-center gap-2.5">
            <CheckCircle2
              size={16}
              className={readyClipsCount > 0 ? 'text-emerald-400' : 'text-studio-600'}
            />
            <div>
              <span className="font-bold text-studio-200 block">Scene Clips</span>
              <span className="text-[10px] text-studio-400">
                {readyClipsCount} of {project.scenes.length} ready
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-studio-900 border border-studio-800 flex items-center gap-2.5">
            <CheckCircle2
              size={16}
              className={hasVoice ? 'text-emerald-400' : 'text-studio-600'}
            />
            <div>
              <span className="font-bold text-studio-200 block">Voice-over Track</span>
              <span className="text-[10px] text-studio-400">
                {hasVoice ? 'Synchronized' : 'None attached'}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-studio-900 border border-studio-800 flex items-center gap-2.5">
            <CheckCircle2
              size={16}
              className={hasMusic ? 'text-emerald-400' : 'text-studio-600'}
            />
            <div>
              <span className="font-bold text-studio-200 block">Music & Ducking</span>
              <span className="text-[10px] text-studio-400">
                {hasMusic ? project.musicSettings?.trackTitle || 'Active' : 'Silent bed'}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-studio-900 border border-studio-800 flex items-center gap-2.5">
            <CheckCircle2
              size={16}
              className={
                project.soundEffects && project.soundEffects.length > 0
                  ? 'text-emerald-400'
                  : 'text-studio-600'
              }
            />
            <div>
              <span className="font-bold text-studio-200 block">Sound Cues</span>
              <span className="text-[10px] text-studio-400">
                {project.soundEffects?.length || 0} Foley items
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Render Settings & Subtitles */}
        <div className="lg:col-span-6 space-y-4">
          <Card title="Export Parameters" subtitle="Resolution and aspect ratio encoding">
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Aspect Ratio Presets"
                  value={selectedAspect}
                  onChange={(e) => {
                    const asp = e.target.value as any;
                    setSelectedAspect(asp);
                    onUpdateProject({ aspectRatio: asp });
                  }}
                  options={[
                    { value: '9:16', label: 'Vertical 9:16 (1080x1920) - Shorts / Reels' },
                    { value: '16:9', label: 'Landscape 16:9 (1920x1080) - YouTube' },
                    { value: '1:1', label: 'Square 1:1 (1080x1080) - Square Posts' },
                  ]}
                />

                <Select
                  label="Target Resolution"
                  value="1080p"
                  onChange={() => {}}
                  options={[{ value: '1080p', label: 'Full HD 1080p (Mastering)' }]}
                />
              </div>

              {/* Hardware Acceleration Indicator */}
              <div className="p-3 bg-studio-900/60 border border-studio-700/50 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Cpu size={16} className="text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-[11px] font-semibold text-white block">
                      Hardware Acceleration Active
                    </span>
                    <span className="text-[10px] text-studio-400">
                      Using GPU ({health?.hardwareEncoder || 'DirectX MFT'}) • {health?.cpuThreads || 32} CPU Cores • High-Speed RAM Buffering
                    </span>
                  </div>
                </div>
                <Badge variant="success" size="sm" dot>Optimized</Badge>
              </div>

              {/* Subtitle Customizer */}
              <div className="p-3 bg-studio-950 border border-studio-800 rounded-xl space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Subtitles size={16} className="text-brand-400" />
                    <div>
                      <span className="font-semibold text-studio-200 block">
                        Burn Animated Subtitles
                      </span>
                      <span className="text-[10px] text-studio-500">
                        Render viral high-contrast captions synced to narration
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={currentSubtitles.enabled}
                    onChange={(e) => handleUpdateSubtitles({ enabled: e.target.checked })}
                    className="rounded border-studio-700 text-brand-500 bg-studio-900"
                  />
                </label>

                {currentSubtitles.enabled && (
                  <div className="space-y-2 pt-2 border-t border-studio-800/60">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-studio-400">Subtitle Style Preset:</span>
                      <select
                        value={currentSubtitles.style}
                        onChange={(e) => handleUpdateSubtitles({ style: e.target.value as any })}
                        className="bg-studio-900 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
                      >
                        <option value="tiktok">TikTok Bold Yellow Highlight</option>
                        <option value="boxed">Cinematic Black Box</option>
                        <option value="minimal">Minimal White Drop Shadow</option>
                      </select>
                    </div>

                    <textarea
                      rows={3}
                      value={currentSubtitles.text}
                      onChange={(e) => handleUpdateSubtitles({ text: e.target.value })}
                      placeholder="Editable subtitle transcript..."
                      className="w-full bg-studio-900 border border-studio-800 rounded-lg p-2 text-xs text-studio-200 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Render Button */}
              <Button
                variant="primary"
                size="lg"
                className="w-full shadow-glow-brand"
                icon={<Sparkles size={16} />}
                onClick={handleExecuteRender}
                disabled={isRendering || !isReadyToRender}
              >
                {isRendering ? 'Rendering Video Assembly...' : 'Render Final Video with FFmpeg'}
              </Button>

              {/* Render Progress Bar */}
              {isRendering && (
                <div className="space-y-1.5 p-3 rounded-xl bg-studio-950 border border-brand-500/20">
                  <div className="flex justify-between text-[11px] font-semibold text-brand-400">
                    <span>{renderStatusText}</span>
                    <span>{renderProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-studio-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 transition-all duration-300"
                      style={{ width: `${renderProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right: Final Video Player & Post-Export Actions */}
        <div className="lg:col-span-6 space-y-4">
          <Card title="Master Video Player" subtitle="Preview assembled final video">
            <div className="space-y-4">
              <div className="aspect-video bg-studio-950 rounded-xl overflow-hidden border border-studio-800 relative flex items-center justify-center">
                {hasFinalVideo ? (
                  <video
                    src={`file://${project.finalVideoPath!.replace(/\\/g, '/')}`}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6 text-studio-500 space-y-2">
                    <Film size={36} className="mx-auto opacity-40 text-studio-400" />
                    <p className="text-xs font-semibold text-studio-300">
                      Final video has not been rendered yet.
                    </p>
                    <p className="text-[11px] text-studio-500 max-w-sm">
                      Click "Render Final Video with FFmpeg" to merge your video clips, voiceover, music, and subtitles.
                    </p>
                  </div>
                )}
              </div>

              {/* Post-Render Quick Actions */}
              {hasFinalVideo && (
                <div className="p-3 bg-studio-950 rounded-xl border border-studio-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      Exported & Indexed in Library
                    </span>
                    <span className="text-[10px] text-studio-500 font-mono">1080p MP4</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<FolderOpen size={13} />}
                      onClick={handleOpenInLibrary}
                    >
                      Open in Library
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Share2 size={13} />}
                      onClick={handleRevealInExplorer}
                    >
                      Reveal File
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<RotateCcw size={13} />}
                      onClick={onResetToNewProject}
                    >
                      New Story
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
