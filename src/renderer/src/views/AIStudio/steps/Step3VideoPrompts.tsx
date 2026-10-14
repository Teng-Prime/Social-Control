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
  Image as ImageIcon,
  FolderOpen,
  UserCheck,
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
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [flowPackage, setFlowPackage] = useState<any>(null);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState<string | null>(null);

  const activeScene = scenes.find((s) => s.id === activeSceneId) || scenes[0];
  const primaryChar = selectedCharacters[0];
  const defaultRefPhoto = primaryChar?.references.find((r) => r.isPrimary)?.imagePath || primaryChar?.references[0]?.imagePath;

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
      title: `Scene ${nextNum}: Narrative Climax`,
      scriptText: `[SCENE ${nextNum}]\nCamera moves steadily as protagonist encounters decisive event.`,
      narration: 'Every choice had led to this moment. There was no turning back.',
      generationPrompt: primaryChar
        ? `Cinematic scene in ${project.genre} style. Protagonist ${primaryChar.name} (${primaryChar.appearance}, wearing ${primaryChar.clothing}). Visual style: ${primaryChar.visualStyle}. Exact face consistency matching reference photo.`
        : `Cinematic scene in ${project.genre} style. Hyper-realistic, dramatic lighting, 8k.`,
      duration: 5,
      characterId: primaryChar?.id || undefined,
      referenceImagePath: defaultRefPhoto || undefined,
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
      const currentRefPhoto = scene.referenceImagePath || defaultRefPhoto;

      const promptPkg = `
=========================================
GOOGLE FLOW / AI VIDEO GENERATION PACKAGE
Project: ${project.title}
Scene Number: ${scene.sceneNumber} (${scene.title || 'Scene'})
Target Duration: ${scene.duration}s
=========================================

[IMAGE-TO-VIDEO / CHARACTER CONSISTENCY SEED]
Character Name: ${primaryChar ? primaryChar.name : 'Protagonist'}
Reference Photo Path: ${currentRefPhoto || 'None attached'}
Instruction: Upload this exact character reference photo into Google Flow / Kling / Runway / Midjourney as the Image Prompt or Initial Keyframe to lock facial geometry, hair, skin, and wardrobe identical to other scenes.

[POSITIVE PROMPT]
${scene.generationPrompt}

[NEGATIVE PROMPT / CONSTRAINTS]
${scene.negativePrompt || 'blurry face, morphing features, mutated hands, inconsistent clothing, extra limbs, cartoonish, low quality, artifacts'}

[CHARACTER SPECS]
${primaryChar ? `Face: ${primaryChar.appearance}\nClothing: ${primaryChar.clothing}\nStyle: ${primaryChar.visualStyle}` : 'Standard cinematic consistency'}

[NARRATION]
${scene.narration}
`.trim();

      setFlowPackage({
        scene,
        connectionInfo: status,
        promptPackage: promptPkg,
        referencePhoto: currentRefPhoto,
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
      const asset = await window.api.importMediaAsset(file, 'Drafts');
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

  // Copy photo to clipboard
  const handleCopyPhotoToClipboard = async (imagePath?: string) => {
    if (!imagePath || !window.api) return;
    const success = await window.api.copyImageToClipboard(imagePath);
    if (success) {
      addToast({ type: 'success', title: 'Character Photo Copied to Clipboard', message: 'Ready to paste into video generation tools.' });
    } else {
      navigator.clipboard.writeText(imagePath);
      addToast({ type: 'info', title: 'Image Path Copied to Clipboard' });
    }
  };

  // Regenerate prompt for single scene
  const handleRegeneratePrompt = async (scene: Scene) => {
    setIsGeneratingPrompt(scene.id);
    const charName = primaryChar ? primaryChar.name : 'Protagonist';
    const charStyle = primaryChar ? primaryChar.visualStyle : 'Cinematic 8k photorealistic';
    const charWardrobe = primaryChar ? primaryChar.clothing : 'Charcoal bomber jacket';
    const newPrompt = `Scene ${scene.sceneNumber}: ${charName} (${primaryChar?.appearance || 'athletic build'}, wearing ${charWardrobe}). ${scene.visualDescription || scene.scriptText}. Dynamic camera tracking shot, atmospheric volumetric lighting, ${charStyle}. Strict face and clothing consistency matching character reference photo.`;

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
            Step 3: Scene Prompts & Character Photo Binding
          </h2>
          <p className="text-xs text-studio-400 mt-0.5">
            Every scene is locked to the character's reference photo so the exact same face is generated in every video clip.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={handleAddScene}>
            Add Scene
          </Button>
        </div>
      </div>

      {/* Continuity Tags & Keyframe Photo Banner */}
      {primaryChar && (
        <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-studio-950 border border-brand-500/50 overflow-hidden shrink-0 flex items-center justify-center relative shadow-subtle">
              {defaultRefPhoto ? (
                <img
                  src={`file://${defaultRefPhoto.replace(/\\/g, '/')}`}
                  alt="Reference Keyframe"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera size={20} className="text-studio-600" />
              )}
              <span className="absolute bottom-0 inset-x-0 bg-brand-500 text-white text-[8px] font-bold text-center">
                KEY
              </span>
            </div>

            <div className="min-w-0">
              <span className="text-studio-200 block truncate">
                Locked Face Continuity: <strong className="text-brand-300 font-bold">{primaryChar.name}</strong>
              </span>
              <span className="text-[11px] text-studio-400 block truncate mt-0.5">
                Using reference photo as initial keyframe seed • {primaryChar.references.length} available photo angle{primaryChar.references.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {defaultRefPhoto && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Copy size={12} />}
                onClick={() => handleCopyPhotoToClipboard(defaultRefPhoto)}
              >
                Copy Keyframe Photo
              </Button>
            )}
            <Badge variant="primary" size="sm">
              {scenes.length} Scenes
            </Badge>
          </div>
        </div>
      )}

      {/* Scenes Storyboard List */}
      <div className="space-y-4">
        {scenes.map((sc, index) => {
          const isSelected = activeScene?.id === sc.id;
          const hasVideo = Boolean(sc.videoPath);
          const currentRefPhoto = sc.referenceImagePath || defaultRefPhoto;

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

              {/* Character Reference Keyframe Binding Bar */}
              <div className="mt-3 p-2.5 rounded-xl bg-studio-950/70 border border-studio-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-studio-900 border border-brand-500/40 overflow-hidden shrink-0 relative">
                    {currentRefPhoto ? (
                      <img
                        src={`file://${currentRefPhoto.replace(/\\/g, '/')}`}
                        alt="Character Seed"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera size={16} className="text-studio-600 m-auto mt-2.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-studio-200 block truncate text-[11px]">
                      Locked Character Photo Seed: <span className="text-brand-300">{primaryChar ? primaryChar.name : 'None'}</span>
                    </span>
                    <span className="text-[10px] text-studio-500 block truncate">
                      Used as input keyframe in Flow to guarantee exact same face
                    </span>
                  </div>
                </div>

                {primaryChar && primaryChar.references.length > 1 && (
                  <div className="shrink-0 flex items-center gap-1.5">
                    <span className="text-[10px] text-studio-500">Photo Angle:</span>
                    <select
                      value={sc.referenceImagePath || defaultRefPhoto}
                      onChange={(e) => handleUpdateScene(sc.id, { referenceImagePath: e.target.value })}
                      className="bg-studio-900 border border-studio-750 text-studio-200 text-[11px] rounded-lg px-2 py-1 focus:outline-none"
                    >
                      {primaryChar.references.map((r, i) => (
                        <option key={r.id} value={r.imagePath}>
                          {r.isPrimary ? '★ Primary Front Photo' : `Reference Angle ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
                        AI Video Generation Prompt (Character Face & Style Injected) *
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
                          Generate with Flow or import from PC
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

      {/* Google Flow Assisted Modal with Character Photo Preview */}
      {isFlowModalOpen && flowPackage && (
        <Modal
          isOpen={isFlowModalOpen}
          onClose={() => setIsFlowModalOpen(false)}
          title={`Generate Scene ${flowPackage.scene.sceneNumber} in Google Flow`}
          subtitle="Use the character reference photo as input to lock character consistency"
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

            {/* Character Reference Photo Keyframe Card */}
            {flowPackage.referencePhoto && (
              <div className="p-3 bg-studio-950 rounded-xl border border-brand-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera size={14} className="text-brand-400" />
                    <span className="font-bold text-studio-100 text-xs">
                      Character Reference Photo (Keyframe Input)
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Copy size={12} />}
                      onClick={() => handleCopyPhotoToClipboard(flowPackage.referencePhoto)}
                    >
                      Copy Photo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<FolderOpen size={12} />}
                      onClick={() => window.api?.revealInFileExplorer(flowPackage.referencePhoto)}
                    >
                      Reveal in Folder
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-studio-900 border border-brand-500 overflow-hidden shrink-0 shadow-subtle">
                    <img
                      src={`file://${flowPackage.referencePhoto.replace(/\\/g, '/')}`}
                      alt="Character Seed"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-[11px] text-studio-300">
                    <strong className="text-brand-300 block">Crucial for Same Character Across Videos:</strong>
                    <p>
                      In Google Flow, upload or drag this reference photo as the <strong>Image Prompt / Starting Frame</strong>.
                      This locks the facial geometry, skin tone, hair, and wardrobe identical across every generated scene.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Prompt Package Box */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-studio-300">
                  Prepared Flow Prompt Package & Continuity Tags
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
