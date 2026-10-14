import React, { useEffect, useState } from 'react';
import { SoundEffectItem, StoryProject } from '../../../../../shared/types';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Select } from '../../../components/common/Select';
import { useAppStore } from '../../../stores/useAppStore';
import {
  Volume2,
  Play,
  Pause,
  Upload,
  Plus,
  Trash2,
  Sparkles,
  Search,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

interface Step6SoundEffectsProps {
  project: StoryProject;
  onRefreshProject: () => Promise<void>;
  onUpdateProject: (updates: Partial<StoryProject>) => Promise<void>;
}

export const Step6SoundEffects: React.FC<Step6SoundEffectsProps> = ({
  project,
  onRefreshProject,
  onUpdateProject,
}) => {
  const { addToast } = useAppStore();

  const [availableSfx, setAvailableSfx] = useState<any[]>([]);
  const [playingSfxId, setPlayingSfxId] = useState<string | null>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);

  const assignedEffects: SoundEffectItem[] = project.soundEffects || [];

  const handleAutoAssignSfx = async () => {
    if (!window.api) return;
    setIsAutoAssigning(true);
    try {
      const res = await window.api.autoAssignSceneSoundEffects(project.id);
      await onRefreshProject();
      addToast({
        type: 'success',
        title: 'AI Sound Effects Generated',
        message: `Auto-assigned ${res.assignedEffects?.length || 0} foley cues to scenes based on script analysis.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'SFX auto-generation failed', message: err.message });
    } finally {
      setIsAutoAssigning(false);
    }
  };

  useEffect(() => {
    const fetchSfx = async () => {
      if (window.api) {
        const lib = await window.api.getBuiltinAudioLibrary();
        setAvailableSfx(lib.soundEffects);
      }
    };
    fetchSfx();

    return () => {
      if (audioEl) audioEl.pause();
    };
  }, []);

  const handleTogglePlay = (sfx: any) => {
    if (playingSfxId === sfx.id) {
      audioEl?.pause();
      setPlayingSfxId(null);
    } else {
      if (audioEl) audioEl.pause();
      const newAudio = new Audio(`file://${sfx.path.replace(/\\/g, '/')}`);
      newAudio.play().catch(() => {});
      newAudio.onended = () => setPlayingSfxId(null);
      setAudioEl(newAudio);
      setPlayingSfxId(sfx.id);
    }
  };

  const handleAddEffectToScene = async (sfx: any, sceneId?: string) => {
    const newItem: SoundEffectItem = {
      id: 'sfx_' + Math.random().toString(36).substring(2, 9),
      sceneId: sceneId || project.scenes[0]?.id,
      name: sfx.name,
      category: sfx.category,
      audioPath: sfx.path,
      volume: 80,
      startTime: 0,
      duration: sfx.duration || 3,
    };

    const updated = [...assignedEffects, newItem];
    await onUpdateProject({ soundEffects: updated });
    addToast({ type: 'success', title: 'Sound Effect Attached', message: sfx.name });
  };

  const handleRemoveEffect = async (effectId: string) => {
    const updated = assignedEffects.filter((e) => e.id !== effectId);
    await onUpdateProject({ soundEffects: updated });
    addToast({ type: 'info', title: 'Sound Effect Removed' });
  };

  const handleUpdateEffectParam = async (effectId: string, updates: Partial<SoundEffectItem>) => {
    const updated = assignedEffects.map((e) => (e.id === effectId ? { ...e, ...updates } : e));
    await onUpdateProject({ soundEffects: updated });
  };

  const handleImportCustomSfx = async () => {
    if (!window.api) return;
    const file = await window.api.openFileDialog(['wav', 'mp3', 'ogg']);
    if (file) {
      const fileName = file.split(/[\\/]/).pop() || 'Custom SFX';
      const newItem: SoundEffectItem = {
        id: 'sfx_custom_' + Date.now(),
        sceneId: project.scenes[0]?.id,
        name: fileName,
        category: 'custom',
        audioPath: file,
        volume: 85,
        startTime: 0,
        duration: 3,
      };
      await onUpdateProject({ soundEffects: [...assignedEffects, newItem] });
      addToast({ type: 'success', title: 'Custom Sound Effect Imported', message: fileName });
    }
  };

  // Extract AI recommended sound effects from Step 3 scenes
  const aiRecommendedEffects = project.scenes
    .filter((s) => s.soundEffectSuggestion)
    .map((s) => ({
      sceneNumber: s.sceneNumber,
      sceneId: s.id,
      suggestion: s.soundEffectSuggestion,
    }));

  const categories = ['all', 'impacts', 'suspense', 'footsteps', 'rain', 'doors', 'transitions', 'ambient'];

  const filteredSfx = availableSfx.filter((s) => {
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory;
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex items-center justify-between pb-4 border-b border-studio-800">
        <div>
          <h2 className="text-base font-bold text-studio-100 flex items-center gap-2">
            <Volume2 size={18} className="text-brand-400" />
            Step 6: Sound Effects (Foley & Ambience)
          </h2>
          <p className="text-xs text-studio-400 mt-0.5">
            Attach targeted impacts, footfalls, rain, and transitions to heighten scene immersion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles size={13} />}
            loading={isAutoAssigning}
            onClick={handleAutoAssignSfx}
            className="bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-subtle"
          >
            ✨ AI Auto-Assign SFX
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Upload size={13} />}
            onClick={handleImportCustomSfx}
          >
            Import Local SFX
          </Button>
        </div>
      </div>

      {/* AI Suggestions Bar */}
      {aiRecommendedEffects.length > 0 && (
        <Card
          title="AI Scene Foley Suggestions"
          subtitle="Identified from approved scene actions and atmosphere"
          action={
            <Button
              variant="secondary"
              size="sm"
              icon={<Sparkles size={12} />}
              loading={isAutoAssigning}
              onClick={handleAutoAssignSfx}
            >
              Auto-Assign All
            </Button>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {aiRecommendedEffects.map((rec) => (
              <div
                key={rec.sceneId}
                className="p-2.5 rounded-xl bg-studio-950 border border-brand-500/20 flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] text-brand-400 font-mono block">
                    Scene {rec.sceneNumber}
                  </span>
                  <span className="font-semibold text-studio-200">{rec.suggestion}</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Plus size={12} />}
                  onClick={() => {
                    const matched = availableSfx.find(
                      (s) => s.name.toLowerCase() === rec.suggestion?.toLowerCase()
                    ) || availableSfx[0];
                    if (matched) {
                      handleAddEffectToScene(matched, rec.sceneId);
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Preset SFX Library */}
        <div className="lg:col-span-6 space-y-4">
          <Card title="Sound Effects Library" subtitle="High-impact audio cues">
            {/* Search & Categories */}
            <div className="space-y-2 mb-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-studio-500" />
                <input
                  type="text"
                  placeholder="Search footsteps, rain, boom, door..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-studio-950 border border-studio-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-studio-200 placeholder-studio-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium capitalize transition-all ${
                      selectedCategory === c
                        ? 'bg-brand-500 text-white'
                        : 'bg-studio-950 text-studio-400 hover:text-studio-200 border border-studio-800'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {filteredSfx.map((sfx) => {
                const isPlaying = playingSfxId === sfx.id;
                return (
                  <div
                    key={sfx.id}
                    className="p-2.5 rounded-xl bg-studio-950/80 border border-studio-800 flex items-center justify-between text-xs hover:border-studio-700 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleTogglePlay(sfx)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          isPlaying
                            ? 'bg-brand-500 text-white animate-pulse'
                            : 'bg-studio-800 text-studio-300 hover:bg-studio-750'
                        }`}
                        title={isPlaying ? 'Pause' : 'Preview'}
                      >
                        {isPlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                      </button>
                      <div>
                        <span className="font-semibold text-studio-200 block truncate">{sfx.name}</span>
                        <span className="text-[10px] text-studio-500 capitalize">{sfx.category}</span>
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Plus size={12} />}
                      onClick={() => handleAddEffectToScene(sfx)}
                    >
                      Attach
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right: Assigned Timeline Effects */}
        <div className="lg:col-span-6 space-y-4">
          <Card
            title={`Assigned Effects (${assignedEffects.length})`}
            subtitle="Scene timeline placement & volume levels"
          >
            {assignedEffects.length === 0 ? (
              <div className="text-center py-10 px-4 text-xs text-studio-500">
                No sound effects attached yet. Select cues from the library or use the AI suggestions above.
              </div>
            ) : (
              <div className="space-y-3">
                {assignedEffects.map((item) => {
                  const targetScene = project.scenes.find((s) => s.id === item.sceneId);

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-studio-950 border border-studio-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Volume2 size={14} className="text-brand-400" />
                          <span className="font-bold text-studio-100">{item.name}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveEffect(item.id)}
                          className="text-studio-500 hover:text-rose-400 p-1"
                          title="Remove effect"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[11px]">
                        <div>
                          <label className="text-studio-500 block mb-1">Target Scene</label>
                          <select
                            value={item.sceneId || ''}
                            onChange={(e) => handleUpdateEffectParam(item.id, { sceneId: e.target.value })}
                            className="w-full bg-studio-900 border border-studio-800 rounded-lg px-2 py-1 text-studio-200 focus:outline-none"
                          >
                            {project.scenes.map((sc) => (
                              <option key={sc.id} value={sc.id}>
                                Scene {sc.sceneNumber}: {sc.title || 'Scene'}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <div className="flex justify-between text-studio-400 mb-1">
                            <span>Volume:</span>
                            <span className="text-brand-400 font-bold">{item.volume}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={item.volume}
                            onChange={(e) =>
                              handleUpdateEffectParam(item.id, { volume: parseInt(e.target.value, 10) })
                            }
                            className="w-full accent-brand-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
