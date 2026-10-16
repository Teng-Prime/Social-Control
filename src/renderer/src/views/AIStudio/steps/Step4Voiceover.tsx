import React, { useState } from 'react';
import { StoryProject, VoiceSettings } from '../../../../../shared/types';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Select } from '../../../components/common/Select';
import { Badge } from '../../../components/common/Badge';
import { useAppStore } from '../../../stores/useAppStore';
import {
  Mic,
  Upload,
  Volume2,
  Sparkles,
} from 'lucide-react';

interface Step4VoiceoverProps {
  project: StoryProject;
  onRefreshProject: () => Promise<void>;
  onUpdateProject: (updates: Partial<StoryProject>) => Promise<void>;
}

export const Step4Voiceover: React.FC<Step4VoiceoverProps> = ({
  project,
  onRefreshProject,
  onUpdateProject,
}) => {
  const { addToast } = useAppStore();

  const [isGenerating, setIsGenerating] = useState(false);

  const defaultVoiceSettings: VoiceSettings = {
    provider: 'Neural Studio TTS',
    voice: 'en-US-Neural-Guy',
    language: 'English (US)',
    gender: 'male',
    speed: 1.0,
    pitch: 0,
    volume: 100,
    audioPath: project.voiceSettings?.audioPath,
  };

  const currentSettings: VoiceSettings = {
    ...defaultVoiceSettings,
    ...(project.voiceSettings || {}),
  };

  const fullNarrationText = project.scenes
    .map((s) => s.narration)
    .filter(Boolean)
    .join(' ');

  const voiceOptions = [
    { value: 'en-US-Neural-Guy', label: 'Guy (US Male - Cinematic Deep & Narrative)', gender: 'male' },
    { value: 'en-US-Neural-Jenny', label: 'Jenny (US Female - Clear, Natural & Engaging)', gender: 'female' },
    { value: 'en-US-Neural-Aria', label: 'Aria (US Female - Expressive & Emotional)', gender: 'female' },
    { value: 'en-US-Neural-Davis', label: 'Davis (US Male - Grounded & Authoritative)', gender: 'male' },
    { value: 'en-GB-Neural-Ryan', label: 'Ryan (UK Male - Sophisticated & Dramatic)', gender: 'male' },
    { value: 'en-GB-Neural-Sonia', label: 'Sonia (UK Female - Elegant & Storytelling)', gender: 'female' },
  ];

  const handleUpdateSettings = async (updates: Partial<VoiceSettings>) => {
    const updated = { ...currentSettings, ...updates };
    await onUpdateProject({ voiceSettings: updated });
  };

  const handleGenerateVoiceover = async () => {
    if (!fullNarrationText.trim()) {
      addToast({
        type: 'warn',
        title: 'No Narration Text',
        message: 'Scenes have no narration text. Return to Step 3 and write scene narration first.',
      });
      return;
    }

    if (!window.api) return;
    setIsGenerating(true);
    try {
      const res = await window.api.generateVoiceover(project.id, fullNarrationText, currentSettings);
      await onRefreshProject();
      addToast({
        type: 'success',
        title: 'Voiceover Audio Generated',
        message: `Duration: ${res.duration.toFixed(1)}s`,
      });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Voiceover generation failed', message: e.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportAudio = async () => {
    if (!window.api) return;
    const file = await window.api.openFileDialog(['mp3', 'wav', 'aac', 'm4a']);
    if (file) {
      await handleUpdateSettings({ audioPath: file });
      addToast({ type: 'success', title: 'Custom Voiceover Audio Imported' });
    }
  };

  const hasAudio = Boolean(currentSettings.audioPath);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-studio-800">
        <div>
          <h2 className="text-base font-bold text-studio-100 flex items-center gap-2">
            <Mic size={18} className="text-brand-400" />
            Step 4: Voice-over & Narration Audio
          </h2>
          <p className="text-xs text-studio-400 mt-0.5">
            Configure natural neural voice synthesis or import recorded narration for story scenes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasAudio ? (
            <Badge variant="success" size="sm" dot>
              Voiceover Ready
            </Badge>
          ) : (
            <Badge variant="warning" size="sm" dot>
              Audio Pending
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Configuration Panel */}
        <div className="lg:col-span-7 space-y-4">
          <Card title="Voice Engine & Timbre" subtitle="Realistic TTS narration settings">
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="TTS Provider"
                  value={currentSettings.provider}
                  onChange={(e) => handleUpdateSettings({ provider: e.target.value })}
                  options={[
                    { value: 'Neural Studio TTS', label: 'Neural Studio TTS (Offline High-Quality)' },
                    { value: 'Google Text-to-Speech', label: 'Google Natural Voice Engine' },
                  ]}
                />

                <Select
                  label="Language & Accent"
                  value={currentSettings.language}
                  onChange={(e) => handleUpdateSettings({ language: e.target.value })}
                  options={[
                    { value: 'English (US)', label: 'English (US)' },
                    { value: 'English (UK)', label: 'English (UK)' },
                    { value: 'Spanish (ES)', label: 'Spanish (ES)' },
                    { value: 'French (FR)', label: 'French (FR)' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">
                  Voice Actor Selection
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {voiceOptions.map((v) => {
                    const isSelected = currentSettings.voice === v.value;
                    return (
                      <button
                        key={v.value}
                        type="button"
                        onClick={() =>
                          handleUpdateSettings({
                            voice: v.value,
                            gender: v.gender as any,
                          })
                        }
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-brand-500/20 border-brand-500 ring-1 ring-brand-500/40 text-brand-200'
                            : 'bg-studio-950/70 border-studio-800 hover:border-studio-700 text-studio-300'
                        }`}
                      >
                        <span className="font-bold text-xs block truncate">{v.label}</span>
                        <span className="text-[10px] text-studio-500 capitalize">{v.gender} Voice</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sliders: Speed, Pitch, Volume */}
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-studio-800/80">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-studio-400 font-medium">Speed:</span>
                    <span className="text-brand-400 font-bold">{currentSettings.speed}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.75}
                    max={1.5}
                    step={0.05}
                    value={currentSettings.speed}
                    onChange={(e) => handleUpdateSettings({ speed: parseFloat(e.target.value) })}
                    className="w-full accent-brand-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-studio-400 font-medium">Pitch:</span>
                    <span className="text-brand-400 font-bold">{currentSettings.pitch > 0 ? `+${currentSettings.pitch}` : currentSettings.pitch}</span>
                  </div>
                  <input
                    type="range"
                    min={-5}
                    max={5}
                    step={1}
                    value={currentSettings.pitch}
                    onChange={(e) => handleUpdateSettings({ pitch: parseInt(e.target.value, 10) })}
                    className="w-full accent-brand-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-studio-400 font-medium">Volume:</span>
                    <span className="text-brand-400 font-bold">{currentSettings.volume}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={currentSettings.volume}
                    onChange={(e) => handleUpdateSettings({ volume: parseInt(e.target.value, 10) })}
                    className="w-full accent-brand-500"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Audio Player & Action */}
        <div className="lg:col-span-5 space-y-4">
          <Card
            title="Narration Audio Player"
            subtitle="Preview synchronized vocal track"
            action={
              <Button
                variant="outline"
                size="sm"
                icon={<Upload size={13} />}
                onClick={handleImportAudio}
              >
                Import Audio
              </Button>
            }
          >
            <div className="space-y-4">
              {hasAudio ? (
                <div className="p-4 rounded-xl bg-studio-950 border border-studio-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Mic size={14} className="text-brand-400" />
                      <span className="font-semibold text-studio-200">Active Narration Track</span>
                    </div>
                    <Badge variant="success" size="sm">
                      Ready
                    </Badge>
                  </div>

                  <audio
                    src={`file://${currentSettings.audioPath!.replace(/\\/g, '/')}`}
                    controls
                    className="w-full"
                  />

                  <div className="text-[10px] text-studio-500 font-mono truncate">
                    Path: {currentSettings.audioPath}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-studio-950 border border-dashed border-studio-800 text-center space-y-2">
                  <Volume2 size={28} className="mx-auto text-studio-600" />
                  <p className="text-xs text-studio-400">
                    No narration audio generated yet for this project.
                  </p>
                  <p className="text-[11px] text-studio-500">
                    Click "Generate Narration Audio" below to synthesize speech from all scene scripts.
                  </p>
                </div>
              )}

              <Button
                variant="primary"
                size="md"
                className="w-full"
                icon={<Sparkles size={16} />}
                onClick={handleGenerateVoiceover}
                disabled={isGenerating || !fullNarrationText.trim()}
              >
                {isGenerating
                  ? 'Synthesizing Narration Track...'
                  : hasAudio
                  ? 'Regenerate Narration Audio'
                  : 'Generate Narration Audio'}
              </Button>
            </div>
          </Card>

          {/* Scene Timing Breakdown */}
          <Card title="Scene Audio Timing" subtitle="Synchronized narration distribution">
            <div className="space-y-2 text-xs max-h-48 overflow-y-auto">
              {project.scenes.map((s) => (
                <div
                  key={s.id}
                  className="p-2 rounded-lg bg-studio-950 border border-studio-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-brand-400 text-[10px]">S{s.sceneNumber}</span>
                    <span className="text-[11px] text-studio-300 truncate max-w-[180px]">
                      {s.narration || 'No narration'}
                    </span>
                  </div>
                  <span className="text-[10px] text-studio-500 font-mono shrink-0">{s.duration}s</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
