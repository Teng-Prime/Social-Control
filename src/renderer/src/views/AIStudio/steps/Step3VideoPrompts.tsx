import React, { useState } from 'react';
import { Character, Scene, StoryProject, FlowConnectionInfo } from '../../../../../shared/types';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Modal } from '../../../components/common/Modal';
import { EmptyState } from '../../../components/common/EmptyState';
import { useAppStore } from '../../../stores/useAppStore';
import {
  Film,
  Plus,
  Play,
  RotateCcw,
  CheckCircle,
  ExternalLink,
  Upload,
  ArrowUp,
  ArrowDown,
  Trash2,
  Copy,
  Layers,
  Sparkles,
  Camera,
  Sun,
  Volume2,
  Lock,
} from 'lucide-react';

interface Step3VideoPromptsProps {
  project: StoryProject;
  scenes: Scene[];
  selectedCharacters: Character[];
  onRefreshProject: () => Promise<void>;
  onUpdateProject: (updates: Partial<StoryProject>) => Promise<void>;
}

export const Step3VideoPrompts: React.FC<Step3VideoPromptsProps> = ({
  project,
  scenes,
  selectedCharacters,
  onRefreshProject,
  onUpdateProject,
}) => {
  const { addToast } = useAppStore();

  const [activeSceneId, setActiveSceneId] = useState<string | null>(scenes[0]?.id || null);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [flowPackage, setFlowPackage] = useState<any>(null);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState<string | null>(null);

  const activeScene = scenes.find((s) => s.id === activeSceneId) || scenes[0];
  const primaryChar = selectedCharacters[0];

  // Reorder Scenes
  const handleMoveScene = async (index: number, direction: 'up' | 'down') => {
    if (!window.api) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= scenes.length) return;

    const newScenes = [...scenes];
    const temp = newScenes[index];
    newScenes[index] = newScenes[targetIndex];
    newScenes[targetIndex] = temp;

    const sceneIds = newScenes.map((s) => s.id);
    await window.api.reorderScenes(project.id, sceneIds);
    await onRefreshProject();
    addToast({ type: 'info', title: 'Scene Order Updated' });
  };

  // Add Scene
  const handleAddScene = async () => {
    if (!window.api) return;
    const nextNum = scenes.length + 1;
    const created = await window.api.createScene({
      projectId: project.id,
      sceneNumber: nextNum,
      title: `Scene ${nextNum}: Narrative Development`,
      scriptText: `[SCENE ${nextNum}]\nCamera pans slowly as protagonist observes surroundings.`,
      narration: 'They moved forward carefully, knowing the stakes were now higher than ever.',
      generationPrompt: primaryChar
        ? `${primaryChar.name} (${primaryChar.appearance}, wearing ${primaryChar.clothing}). Cinematic scene in ${project.genre} style. Hyper-realistic, dramatic lighting, 8k.`
        : `Cinematic scene in ${project.genre} style. Hyper-realistic, dramatic lighting, 8k.`,
      duration: 5,
      characterId: primaryChar?.id || undefined,
      status: 'draft',
    });

    await onRefreshProject();
    setActiveSceneId(created.id);
    addToast({ type: 'success', title: 'New Scene Added', message: created.title });
  };

  // Delete Scene
  const handleDeleteScene = async (sceneId: string) => {
    if (scenes.length <= 1) {
      addToast({ type: 'warn', title: 'Cannot Delete', message: 'A story video must have at least one scene.' });
      return;
    }
    if (window.confirm('Delete this scene from storyboard?')) {
      if (window.api) {
        await window.api.deleteScene(sceneId);
        await onRefreshProject();
        addToast({ type: 'info', title: 'Scene Deleted' });
      }
    }
  };

  // Update Scene Field
  const handleUpdateScene = async (sceneId: string, updates: Partial<Scene>) => {
    if (window.api) {
      await window.api.updateScene(sceneId, updates);
      await onRefreshProject();
    }
  };

  // Flow Assistant Modal Launcher
  const handleOpenFlowModal = async (scene: Scene) => {
    if (!window.api) return;
    try {
      const status: FlowConnectionInfo = await window.api.getFlowConnectionStatus();
      const promptPkg = `[POSITIVE PROMPT]\n${scene.generationPrompt}\n\n[NEGATIVE PROMPT]\n${scene.negativePrompt || 'blurry, distorted, inconsistent clothing, extra limbs'}\n\n[CHARACTER CONTINUITY]\n${primaryChar ? `${primaryChar.name}: ${primaryChar.appearance}, wearing ${primaryChar.clothing}` : 'Standard cinematic consistency'}\n\n[NARRATION]\n${scene.narration}`;

      setFlowPackage({
        scene,
        connectionInfo: status,
        promptPackage: promptPkg,
      });
      setIsFlowModalOpen(true);
    } catch (e: any) {
      addToast({ type: 'error', title: 'Flow Check Failed', message: e.message });
    }
  };

  // Import Video directly into Scene & Library
  const handleImportSceneVideo = async (sceneId: string) => {
    if (!window.api) return;
    const file = await window.api.openFileDialog(['mp4', 'mov', 'webm']);
    if (file) {
      // Index into video library Drafts
      const asset = await window.api.importMediaAsset(file, 'Drafts');
      // Assign to scene
      await window.api.updateScene(sceneId, {
        videoPath: asset.filePath,
        duration: asset.duration,
        status: 'ready',
      });
      await onRefreshProject();
      addToast({ type: 'success', title: 'Scene Video Bound', message: asset.fileName });
      if (isFlowModalOpen) setIsFlowModalOpen(false);
    }
  };

  // Regenerate prompt for single scene
  const handleRegeneratePrompt = async (scene: Scene) => {
    setIsGeneratingPrompt(scene.id);
    const charName = primaryChar ? primaryChar.name : 'Protagonist';
    const charStyle = primaryChar ? primaryChar.visualStyle : 'Cinematic 8k photorealistic';
    const charWardrobe = primaryChar ? primaryChar.clothing : 'Charcoal bomber jacket';
    const newPrompt = `Scene ${scene.sceneNumber}: ${charName} (${primaryChar?.appearance || 'athletic build'}, wearing ${charWardrobe}). ${scene.visualDescription || scene.scriptText}. Dynamic camera tracking shot, atmospheric volumetric lighting, ${charStyle}, strict character continuity.`;

    await handleUpdateScene(scene.id, { generationPrompt: newPrompt });
    setIsGeneratingPrompt(null);
    addToast({ type: 'success', title: 'Scene Prompt Regenerated' });
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex items-center justify-between pb-4 border-b border-studio-800">
        <div>
          <h2 className="text-base font-bold text-studio-100 flex items-center gap-2">
            <Film size={18} className="text-brand-400" />
            Step 3: Scene Prompts & Storyboard Breakdown
          </h2>
          <p className="text-xs text-studio-400 mt-0.5">
            Review scene durations, camera movements, lighting, and prompt continuity constraints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={handleAddScene}>
            Add Scene
          </Button>
        </div>
      </div>

      {/* Continuity Tags Alert */}
      {primaryChar && (
        <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Lock size={14} className="text-brand-400 shrink-0" />
            <span className="text-studio-200">
              Injected Continuity: <strong className="text-brand-300">{primaryChar.name}</strong> •{' '}
              <span className="text-studio-400">{primaryChar.clothing}</span> •{' '}
              <span className="text-studio-400">{primaryChar.visualStyle}</span>
            </span>
          </div>
          <Badge variant="primary" size="sm">
            {scenes.length} Scenes
          </Badge>
        </div>
      )}

      {/* Scenes Storyboard List */}
      <div className="space-y-4">
        {scenes.map((sc, index) => {
          const isSelected = activeScene?.id === sc.id;
          const hasVideo = Boolean(sc.videoPath);

          return (
            <div
              key={sc.id}
              onClick={() => setActiveSceneId(sc.id)}
              className={`p-4 rounded-2xl border transition-all ${
                isSelected
                  ? 'bg-studio-850 border-brand-500/50 shadow-subtle'
                  : 'bg-studio-900/80 border-studio-800 hover:border-studio-700'
              }`}
            >
              {/* Scene Title Bar */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-studio-800">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-300 font-mono text-xs font-bold flex items-center justify-center">
                    {sc.sceneNumber}
                  </span>
                  <input
                    type="text"
                    value={sc.title || `Scene ${sc.sceneNumber}`}
                    onChange={(e) => handleUpdateScene(sc.id, { title: e.target.value })}
                    className="bg-transparent font-bold text-sm text-studio-100 focus:outline-none focus:border-b border-brand-500"
                  />
                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="text-[11px] text-studio-400 font-mono">
                      {sc.duration}s duration
                    </span>
                    <span className="text-studio-600">•</span>
                    <Badge
                      variant={sc.status === 'ready' ? 'success' : 'neutral'}
                      size="sm"
                    >
                      {sc.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveScene(index, 'up');
                    }}
                    disabled={index === 0}
                    className="p-1.5 rounded hover:bg-studio-800 text-studio-400 disabled:opacity-30"
                    title="Move Scene Up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveScene(index, 'down');
                    }}
                    disabled={index === scenes.length - 1}
                    className="p-1.5 rounded hover:bg-studio-800 text-studio-400 disabled:opacity-30"
                    title="Move Scene Down"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteScene(sc.id);
                    }}
                    className="p-1.5 rounded hover:bg-studio-800 text-studio-500 hover:text-rose-400"
                    title="Delete Scene"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Scene Content Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-3 text-xs">
                {/* Left: Script & Narration */}
                <div className="lg:col-span-7 space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-studio-400 block mb-1">
                      Narration Voiceover (Spoken Audio)
                    </label>
                    <textarea
                      rows={2}
                      value={sc.narration}
                      onChange={(e) => handleUpdateScene(sc.id, { narration: e.target.value })}
                      placeholder="Spoken words for this scene..."
                      className="w-full bg-studio-950 border border-studio-800 rounded-xl p-2.5 text-xs text-studio-200 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-studio-400">
                        Flow AI Generation Prompt *
                      </label>
                      <button
                        onClick={() => handleRegeneratePrompt(sc)}
                        disabled={isGeneratingPrompt === sc.id}
                        className="text-[10px] text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
                      >
                        <RotateCcw size={10} />
                        {isGeneratingPrompt === sc.id ? 'Regenerating...' : 'Regenerate Prompt'}
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={sc.generationPrompt}
                      onChange={(e) => handleUpdateScene(sc.id, { generationPrompt: e.target.value })}
                      placeholder="Prompt sent to Google Flow or AI video engine..."
                      className="w-full bg-studio-950 border border-studio-800 rounded-xl p-2.5 text-xs text-brand-200 font-mono text-[11px] focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* Metadata Chips: Camera, Lighting, SFX */}
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div className="p-2 rounded-lg bg-studio-950 border border-studio-800/80">
                      <span className="text-studio-500 block">Camera:</span>
                      <span className="text-studio-300 truncate block">
                        {sc.cameraAngle || 'Dynamic tracking'}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-studio-950 border border-studio-800/80">
                      <span className="text-studio-500 block">Lighting:</span>
                      <span className="text-studio-300 truncate block">
                        {sc.lighting || 'Volumetric cinematic'}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-studio-950 border border-studio-800/80">
                      <span className="text-studio-500 block">Suggested SFX:</span>
                      <span className="text-studio-300 truncate block">
                        {sc.soundEffectSuggestion || 'Footsteps / Impact'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Video Clip Preview & Generation Actions */}
                <div className="lg:col-span-5 flex flex-col justify-between p-3 rounded-xl bg-studio-950/70 border border-studio-800">
                  <div className="aspect-video bg-studio-900 rounded-lg overflow-hidden border border-studio-800 relative flex items-center justify-center">
                    {hasVideo ? (
                      <video
                        src={`file://${sc.videoPath!.replace(/\\/g, '/')}`}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-3 text-studio-500">
                        <Film size={24} className="mx-auto mb-1 opacity-50" />
                        <span className="text-[11px] block">No video clip attached</span>
                        <span className="text-[9px] text-studio-600">
                          Generate in Flow or import from PC
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      icon={<Sparkles size={13} />}
                      onClick={() => handleOpenFlowModal(sc)}
                    >
                      Generate with Flow
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Upload size={13} />}
                      onClick={() => handleImportSceneVideo(sc.id)}
                      title="Import local clip directly"
                    >
                      Import
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Google Flow Assisted Modal */}
      {isFlowModalOpen && flowPackage && (
        <Modal
          isOpen={isFlowModalOpen}
          onClose={() => setIsFlowModalOpen(false)}
          title={`Generate Scene ${flowPackage.scene.sceneNumber} in Google Flow`}
          subtitle="Assisted workflow: prepared prompt and continuity parameters"
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] text-studio-400">
                Official Google Flow website: https://flow.google/
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setIsFlowModalOpen(false)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Upload size={14} />}
                  onClick={() => handleImportSceneVideo(flowPackage.scene.id)}
                >
                  Import Downloaded Video
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Status notice */}
            <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-studio-100 block">Browser-Assisted Flow Mode</span>
                <span className="text-[11px] text-studio-400">
                  Google Flow operates at flow.google without a public third-party REST API.
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={<ExternalLink size={12} />}
                onClick={() => window.api?.openExternalUrl('https://flow.google/')}
              >
                Open Flow Web
              </Button>
            </div>

            {/* Step-by-step instructions */}
            <div className="p-3 bg-studio-950 rounded-xl border border-studio-800 space-y-1.5 text-[11px] text-studio-300">
              <p className="font-semibold text-brand-300">Quick Flow Instructions:</p>
              <p>1. Click <strong>"Copy Prompt Package"</strong> below.</p>
              <p>2. In your browser at <strong>https://flow.google/</strong>, paste the prompt into the scene generation box.</p>
              <p>3. Generate the video clip in Flow and download the resulting MP4.</p>
              <p>4. Click <strong>"Import Downloaded Video"</strong> to bind it directly to this scene and library.</p>
            </div>

            {/* Prompt Package Box */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-studio-300">
                  Prepared Prompt Package & Continuity Tags
                </label>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Copy size={12} />}
                  onClick={() => {
                    navigator.clipboard.writeText(flowPackage.promptPackage);
                    addToast({ type: 'success', title: 'Prompt Package Copied to Clipboard' });
                  }}
                >
                  Copy Prompt
                </Button>
              </div>
              <textarea
                rows={6}
                readOnly
                value={flowPackage.promptPackage}
                className="w-full bg-studio-950 font-mono text-[11px] text-studio-200 border border-studio-800 rounded-xl p-3 focus:outline-none"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
