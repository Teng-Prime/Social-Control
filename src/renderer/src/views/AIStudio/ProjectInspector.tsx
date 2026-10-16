import React, { useState } from 'react';
import { Character, StoryProject } from '../../../../shared/types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Music,
  Mic,
  Video,
  FileText,
  Users,
  Play,
  Film,
  Image as ImageIcon,
  Settings,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Check,
} from 'lucide-react';

interface ProjectInspectorProps {
  project: StoryProject | null;
  selectedCharacters: Character[];
  currentStep: number;
  onOpenStepConfig?: (step: number) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

export const ProjectInspector: React.FC<ProjectInspectorProps> = ({
  project,
  selectedCharacters,
  currentStep,
  onOpenStepConfig,
  isOpen = true,
  onToggle,
}) => {
  const [previewMode, setPreviewMode] = useState<'video' | 'thumbnail'>('video');
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);

  if (!isOpen) {
    return (
      <div className="border-l border-[#18345C] bg-[#07122A] p-2 flex flex-col items-center shrink-0 w-12 select-none justify-between h-full">
        <button
          onClick={onToggle}
          title="Expand Project Inspector"
          className="p-2.5 rounded-xl bg-[#0A1933] hover:bg-[#0D2040] text-[#91A4C5] hover:text-[#00C8F5] transition-all border border-[#18345C] hover:border-[#00C8F5]/50 shadow-subtle group"
        >
          <Sliders size={18} className="group-hover:scale-110 transition-transform" />
        </button>
        <button
          onClick={onToggle}
          title="Expand Inspector"
          className="p-2 rounded-lg text-[#91A4C5] hover:text-[#F1F5FF] hover:bg-[#0A1933] transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <aside className="w-80 border-l border-[#18345C] bg-[#07122A] p-6 text-xs text-[#91A4C5] flex flex-col items-center justify-center text-center space-y-3 shrink-0 h-full">
        <div className="w-12 h-12 rounded-2xl bg-[#0A1933] border border-[#18345C] flex items-center justify-center text-[#546F96]">
          <Film size={22} />
        </div>
        <p className="font-medium text-[#F1F5FF]">No Active Story Project</p>
        <p className="text-[11px] text-[#91A4C5]">
          Select or create a story project to view inspector details and preview scenes.
        </p>
      </aside>
    );
  }

  const primaryChar = selectedCharacters[0];
  const activeScene = project.scenes[selectedSceneIndex] || project.scenes[0];

  // Determine active sample video and thumbnail
  const sampleVideoSrc =
    activeScene?.videoPath ||
    project.finalVideoPath ||
    project.scenes.find((s) => s.videoPath)?.videoPath;
  const sampleThumbnailSrc =
    activeScene?.referenceImagePath ||
    primaryChar?.references.find((r) => r.isPrimary)?.imagePath ||
    primaryChar?.references[0]?.imagePath;

  const stepChecklist = [
    {
      step: 1,
      title: 'Character Consistency',
      ready: selectedCharacters.length > 0 && selectedCharacters.every((c) => c.references && c.references.length > 0),
      detail: selectedCharacters.length > 0 ? `${selectedCharacters.length} protagonist assigned` : 'None selected',
    },
    {
      step: 2,
      title: 'Story & Viral Hook',
      ready: Boolean(project.hook && (project.intro || project.scenes.length > 0)),
      detail: project.hook ? 'Approved' : 'Pending hook',
    },
    {
      step: 3,
      title: 'Scene Prompts & Video',
      ready: project.scenes.length > 0,
      detail: `${project.scenes.length} scenes structured`,
    },
    {
      step: 4,
      title: 'Voice-over Narration',
      ready: Boolean(project.voiceSettings?.audioPath),
      detail: project.voiceSettings?.audioPath ? 'Generated' : 'Not generated',
    },
    {
      step: 5,
      title: 'Background Music',
      ready: Boolean(project.musicSettings?.trackId || project.musicSettings?.audioPath),
      detail: project.musicSettings?.trackTitle || 'Default ambient',
    },
    {
      step: 6,
      title: 'Sound Effects (SFX)',
      ready: Boolean(project.soundEffects && project.soundEffects.length > 0),
      detail: `${project.soundEffects?.length || 0} active SFX`,
    },
    {
      step: 7,
      title: 'Final Video Export',
      ready: project.status === 'exported' && Boolean(project.finalVideoPath),
      detail: project.finalVideoPath ? 'Rendered & Exported' : 'Ready to assemble',
    },
  ];

  return (
    <aside className="w-84 border-l border-[#18345C] bg-[#07122A] flex flex-col shrink-0 overflow-y-auto p-4 space-y-4 select-none h-full">
      {/* Top Header with Collapse Button */}
      <div className="pb-3 border-b border-[#18345C] flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-[#00C8F5] tracking-wider uppercase font-mono">
              Project Inspector
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C8F5] shadow-[0_0_6px_#00C8F5]" />
          </div>
          <h3 className="text-sm font-bold text-[#F1F5FF] truncate mt-1" title={project.title}>
            {project.title}
          </h3>

          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00C8F5]/10 border border-[#00C8F5]/30 text-[#00C8F5] font-mono font-bold uppercase">
              {project.genre}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0A1933] border border-[#18345C] text-[#91A4C5] font-mono">
              {project.aspectRatio}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0A1933] border border-[#18345C] text-[#00C8F5] font-mono font-bold">
              {project.targetDuration}s
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0A1933] border border-[#18345C] text-[#91A4C5] font-mono uppercase">
              {project.platform || 'TIKTOK'}
            </span>
          </div>
        </div>

        {onToggle && (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-[#0A1933] text-[#91A4C5] hover:text-[#F1F5FF] transition-colors border border-transparent hover:border-[#18345C] ml-2 shrink-0"
            title="Collapse Inspector"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Media Player Box: Sample Video & Thumbnail */}
      <Card
        title="Sample Video & Preview"
        subtitle={
          activeScene
            ? `Scene ${activeScene.sceneNumber}: ${activeScene.title || 'Untitled'}`
            : 'Visual Storyboard Preview'
        }
        action={
          <div className="flex items-center gap-1 bg-[#050B1D] p-0.5 rounded-lg border border-[#18345C]">
            <button
              onClick={() => setPreviewMode('video')}
              className={`p-1 rounded text-[10px] font-medium transition-colors ${
                previewMode === 'video'
                  ? 'bg-[#00C8F5] text-[#050B1D] font-bold shadow-[0_0_8px_rgba(0,200,245,0.4)]'
                  : 'text-[#91A4C5] hover:text-[#F1F5FF]'
              }`}
              title="Preview Video"
            >
              <Film size={12} />
            </button>
            <button
              onClick={() => setPreviewMode('thumbnail')}
              className={`p-1 rounded text-[10px] font-medium transition-colors ${
                previewMode === 'thumbnail'
                  ? 'bg-[#00C8F5] text-[#050B1D] font-bold shadow-[0_0_8px_rgba(0,200,245,0.4)]'
                  : 'text-[#91A4C5] hover:text-[#F1F5FF]'
              }`}
              title="Preview Thumbnail Keyframe"
            >
              <ImageIcon size={12} />
            </button>
          </div>
        }
      >
        <div className="space-y-2.5">
          {/* Media Player Container */}
          <div className="aspect-video bg-[#050B1D] rounded-xl overflow-hidden border border-[#18345C] relative flex items-center justify-center shadow-inner">
            {previewMode === 'video' ? (
              sampleVideoSrc ? (
                <video
                  key={sampleVideoSrc}
                  src={`file://${sampleVideoSrc.replace(/\\/g, '/')}`}
                  controls
                  poster={
                    sampleThumbnailSrc ? `file://${sampleThumbnailSrc.replace(/\\/g, '/')}` : undefined
                  }
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-3 text-[#546F96] space-y-1">
                  <Film size={22} className="mx-auto opacity-50 text-[#00C8F5]" />
                  <span className="text-[11px] block font-semibold text-[#91A4C5]">
                    No sample video yet
                  </span>
                  <span className="text-[9px] text-[#546F96] block">
                    Generate scene in Step 3 or export in Step 7
                  </span>
                </div>
              )
            ) : sampleThumbnailSrc ? (
              <img
                src={`file://${sampleThumbnailSrc.replace(/\\/g, '/')}`}
                alt="Keyframe Thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-3 text-[#546F96] space-y-1">
                <ImageIcon size={22} className="mx-auto opacity-50 text-[#00C8F5]" />
                <span className="text-[11px] block font-semibold text-[#91A4C5]">
                  No thumbnail keyframe
                </span>
                <span className="text-[9px] text-[#546F96] block">
                  Select character in Step 1
                </span>
              </div>
            )}
          </div>

          {/* Scene Selector Pills */}
          {project.scenes.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
              {project.scenes.map((sc, idx) => (
                <button
                  key={sc.id}
                  onClick={() => setSelectedSceneIndex(idx)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono shrink-0 transition-all ${
                    selectedSceneIndex === idx
                      ? 'bg-[#00C8F5] text-[#050B1D] font-bold shadow-[0_0_10px_rgba(0,200,245,0.4)]'
                      : 'bg-[#050B1D] text-[#91A4C5] hover:text-[#F1F5FF] border border-[#18345C]'
                  }`}
                >
                  S{sc.sceneNumber}
                </button>
              ))}
              {project.finalVideoPath && (
                <button
                  onClick={() => {
                    setPreviewMode('video');
                  }}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-mono shrink-0 bg-[#00D6A0]/15 text-[#00D6A0] border border-[#00D6A0]/30 hover:bg-[#00D6A0]/25 font-bold"
                >
                  Final Render
                </button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Selected Protagonist Identity Card */}
      <Card
        title="Protagonist Identity"
        subtitle={primaryChar ? primaryChar.name : 'No character assigned'}
      >
        {primaryChar ? (
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-[#050B1D] border border-[#18345C] overflow-hidden shrink-0 flex items-center justify-center shadow-subtle relative">
                {primaryChar.references[0] ? (
                  <img
                    src={`file://${primaryChar.references[0].imagePath.replace(/\\/g, '/')}`}
                    alt={primaryChar.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users size={24} className="text-[#546F96]" />
                )}
                {primaryChar.isLocked && (
                  <div className="absolute bottom-0.5 right-0.5 bg-[#FFB84D] text-[#050B1D] p-0.5 rounded shadow">
                    <Lock size={9} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-[#F1F5FF] truncate">{primaryChar.name}</h4>
                  <Badge variant="success" size="sm" dot>
                    Active
                  </Badge>
                </div>
                <p className="text-[11px] text-[#91A4C5] line-clamp-2 mt-0.5">
                  {primaryChar.description || primaryChar.appearance}
                </p>
                <span className="text-[10px] text-[#00C8F5] font-mono font-bold mt-1 block">
                  {primaryChar.references.length} reference photos
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#050B1D] border border-[#18345C] space-y-1.5 text-[11px]">
              <div>
                <span className="text-[#546F96] font-medium font-mono text-[10px] uppercase">
                  Appearance:{' '}
                </span>
                <span className="text-[#F1F5FF]">{primaryChar.appearance}</span>
              </div>
              <div>
                <span className="text-[#546F96] font-medium font-mono text-[10px] uppercase">
                  Wardrobe:{' '}
                </span>
                <span className="text-[#F1F5FF]">{primaryChar.clothing}</span>
              </div>
              <div>
                <span className="text-[#546F96] font-medium font-mono text-[10px] uppercase">
                  Style:{' '}
                </span>
                <span className="text-[#00C8F5]">{primaryChar.visualStyle}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-[#91A4C5] space-y-1">
            <Users size={20} className="mx-auto text-[#546F96] opacity-60" />
            <p className="font-medium text-[#F1F5FF]">No Protagonist Assigned</p>
            <p className="text-[10px] text-[#91A4C5]">
              Select a saved character in Step 1 to inject consistent appearance tags into scenes.
            </p>
          </div>
        )}
      </Card>

      {/* Production Pipeline Checklist */}
      <Card title="Production Checklist" subtitle="7-Step Readiness Verification">
        <div className="space-y-1.5 text-xs">
          {stepChecklist.map((item) => {
            const isCurrent = item.step === currentStep;
            return (
              <div
                key={item.step}
                className={`p-2 rounded-xl flex items-center justify-between transition-all ${
                  isCurrent
                    ? 'bg-[#087BFF]/15 border border-[#00C8F5]/50 shadow-[0_0_10px_rgba(0,200,245,0.15)]'
                    : 'bg-[#0A1933] border border-[#18345C] hover:border-[#18345C]/90'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.ready ? (
                    <div className="w-4 h-4 rounded-full bg-[#00D6A0]/15 border border-[#00D6A0]/40 flex items-center justify-center shrink-0">
                      <Check size={11} className="text-[#00D6A0] stroke-[3]" />
                    </div>
                  ) : (
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-mono shrink-0 ${
                        isCurrent
                          ? 'border-[#00C8F5] text-[#00C8F5] font-bold'
                          : 'border-[#546F96] text-[#546F96]'
                      }`}
                    >
                      {item.step}
                    </div>
                  )}

                  <div className="min-w-0">
                    <span
                      className={`text-xs font-semibold block leading-tight truncate ${
                        isCurrent ? 'text-[#00C8F5]' : 'text-[#F1F5FF]'
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="text-[10px] text-[#91A4C5] truncate block">
                      {item.detail}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {onOpenStepConfig && (
                    <button
                      onClick={() => onOpenStepConfig(item.step)}
                      className="p-1 rounded-lg hover:bg-[#07122A] text-[#91A4C5] hover:text-[#00C8F5] transition-colors"
                      title={`Configure Step ${item.step}`}
                    >
                      <Settings size={12} />
                    </button>
                  )}
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold ${
                      item.ready
                        ? 'bg-[#00D6A0]/10 text-[#00D6A0] border border-[#00D6A0]/30'
                        : isCurrent
                        ? 'bg-[#00C8F5]/10 text-[#00C8F5] border border-[#00C8F5]/30'
                        : 'bg-[#07122A] text-[#91A4C5] border border-[#18345C]'
                    }`}
                  >
                    {item.ready ? 'Ready' : isCurrent ? 'Active' : 'Pending'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </aside>
  );
};
