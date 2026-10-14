import React from 'react';
import { Character, StoryProject } from '../../../../shared/types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
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
} from 'lucide-react';

interface ProjectInspectorProps {
  project: StoryProject | null;
  selectedCharacters: Character[];
  currentStep: number;
}

export const ProjectInspector: React.FC<ProjectInspectorProps> = ({
  project,
  selectedCharacters,
  currentStep,
}) => {
  if (!project) {
    return (
      <aside className="w-80 border-l border-studio-800 bg-studio-900/60 p-4 text-xs text-studio-500 flex items-center justify-center text-center">
        Select or create a story project to view inspector details
      </aside>
    );
  }

  const primaryChar = selectedCharacters[0];

  const stepChecklist = [
    {
      step: 1,
      title: 'Character Consistency',
      ready: selectedCharacters.length > 0,
      detail: selectedCharacters.length > 0 ? `${selectedCharacters.length} selected` : 'None selected',
    },
    {
      step: 2,
      title: 'Story & Hook',
      ready: Boolean(project.hook && (project.intro || project.scenes.length > 0)),
      detail: project.hook ? 'Approved' : 'Pending approval',
    },
    {
      step: 3,
      title: 'Scene Prompts',
      ready: project.scenes.length > 0,
      detail: `${project.scenes.length} scenes defined`,
    },
    {
      step: 4,
      title: 'Voice-over',
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
      title: 'Sound Effects',
      ready: Boolean(project.soundEffects && project.soundEffects.length > 0),
      detail: `${project.soundEffects?.length || 0} active`,
    },
    {
      step: 7,
      title: 'Final Export',
      ready: project.status === 'exported' && Boolean(project.finalVideoPath),
      detail: project.finalVideoPath ? 'Rendered' : 'Ready to assemble',
    },
  ];

  return (
    <aside className="w-80 border-l border-studio-800 bg-studio-900/80 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4 select-none">
      {/* Active Project Meta */}
      <div className="pb-3 border-b border-studio-800">
        <span className="text-[10px] font-bold text-brand-400 tracking-wider uppercase">
          Project Inspector
        </span>
        <h3 className="text-sm font-bold text-studio-100 truncate mt-0.5">{project.title}</h3>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Badge variant="primary" size="sm">
            {project.genre.toUpperCase()}
          </Badge>
          <Badge variant="neutral" size="sm">
            {project.aspectRatio}
          </Badge>
          <Badge variant="neutral" size="sm">
            {project.targetDuration}s
          </Badge>
          <Badge variant="neutral" size="sm">
            {project.platform?.toUpperCase() || 'TIKTOK'}
          </Badge>
        </div>
      </div>

      {/* Selected Character Card */}
      <Card
        title="Protagonist Identity"
        subtitle={primaryChar ? primaryChar.name : 'No character assigned'}
      >
        {primaryChar ? (
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-studio-950 border border-studio-750 overflow-hidden shrink-0 flex items-center justify-center shadow-subtle">
                {primaryChar.references[0] ? (
                  <img
                    src={`file://${primaryChar.references[0].imagePath.replace(/\\/g, '/')}`}
                    alt={primaryChar.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users size={24} className="text-studio-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-studio-100 truncate">{primaryChar.name}</h4>
                  {primaryChar.isLocked ? (
                    <Lock size={12} className="text-amber-400" title="Locked Appearance" />
                  ) : (
                    <Unlock size={12} className="text-studio-500" />
                  )}
                </div>
                <p className="text-[11px] text-studio-400 line-clamp-2 mt-0.5">
                  {primaryChar.description || primaryChar.appearance}
                </p>
                <span className="text-[10px] text-brand-400 font-mono">
                  {primaryChar.references.length} ref photos
                </span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-studio-950/70 border border-studio-800 space-y-1 text-[11px]">
              <div>
                <span className="text-studio-500 font-medium">Appearance: </span>
                <span className="text-studio-300">{primaryChar.appearance}</span>
              </div>
              <div>
                <span className="text-studio-500 font-medium">Wardrobe: </span>
                <span className="text-studio-300">{primaryChar.clothing}</span>
              </div>
              <div>
                <span className="text-studio-500 font-medium">Rendering Style: </span>
                <span className="text-studio-300">{primaryChar.visualStyle}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-studio-500">
            No character selected yet. Select a saved character in Step 1 to inject consistent appearance tags into scenes.
          </div>
        )}
      </Card>

      {/* Production Pipeline Checklist */}
      <Card title="Production Checklist" subtitle="7-Step Creation Readiness">
        <div className="space-y-2 text-xs">
          {stepChecklist.map((item) => {
            const isCurrent = item.step === currentStep;
            return (
              <div
                key={item.step}
                className={`p-2 rounded-lg flex items-center justify-between transition-all ${
                  isCurrent
                    ? 'bg-brand-500/15 border border-brand-500/30'
                    : 'bg-studio-850/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.ready ? (
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  ) : (
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] ${
                        isCurrent
                          ? 'border-brand-400 text-brand-400'
                          : 'border-studio-600 text-studio-600'
                      }`}
                    >
                      {item.step}
                    </div>
                  )}
                  <div>
                    <span
                      className={`text-xs font-medium block leading-tight ${
                        isCurrent ? 'text-brand-300 font-semibold' : 'text-studio-300'
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="text-[10px] text-studio-500">{item.detail}</span>
                  </div>
                </div>

                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${
                    item.ready
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : isCurrent
                      ? 'bg-brand-500/20 text-brand-400'
                      : 'bg-studio-800 text-studio-500'
                  }`}
                >
                  {item.ready ? 'Ready' : isCurrent ? 'Active' : 'Pending'}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </aside>
  );
};
