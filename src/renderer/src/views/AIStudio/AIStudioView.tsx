import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Sparkles,
  Film,
  Plus,
  Play,
  RotateCcw,
  CheckCircle,
  ExternalLink,
  Upload,
  ArrowRight,
  Layers,
  Wand2,
  Trash2,
  Copy,
  ChevronDown,
  Users,
} from 'lucide-react';
import { Character, Scene, StoryProject } from '../../../shared/types';

export const AIStudioView: React.FC = () => {
  const { addToast, setCurrentSection } = useAppStore();

  const [projects, setProjects] = useState<StoryProject[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeProject, setActiveProject] = useState<StoryProject | null>(null);
  const [activeScene, setActiveScene] = useState<Scene | null>(null);

  // Script Generator Modal
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [flowPackage, setFlowPackage] = useState<any>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  // Form State
  const [newProjectForm, setNewProjectForm] = useState({
    title: 'Mystery of the Midnight Signal',
    genre: 'mystery' as const,
    aspectRatio: '9:16' as const,
    targetDuration: 60,
    language: 'en',
    voice: 'en-US-Standard-C',
    hook: '',
    intro: '',
    climax: '',
    ending: '',
    continuityNotes: 'Protagonist wears charcoal bomber jacket. Dim neon lighting.',
  });

  const [scriptPrompt, setScriptPrompt] = useState('An urban explorer finds an encrypted drive in an abandoned underground research lab');
  const [scriptGenre, setScriptGenre] = useState('mystery');
  const [selectedCharId, setSelectedCharId] = useState<string>('');

  const loadData = async () => {
    if (window.api) {
      const pList = await window.api.getProjects();
      const cList = await window.api.getCharacters();
      setProjects(pList);
      setCharacters(cList);

      if (pList.length > 0 && !activeProject) {
        setActiveProject(pList[0]);
        if (pList[0].scenes.length > 0) {
          setActiveScene(pList[0].scenes[0]);
        }
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProject = async () => {
    if (window.api) {
      const created = await window.api.createProject(newProjectForm);
      addToast({ type: 'success', title: 'Project Created', message: created.title });
      setIsNewProjectModalOpen(false);
      await loadData();
      setActiveProject(created);
    }
  };

  const handleRunScriptGenerator = async () => {
    if (!activeProject || !window.api) return;
    setIsGeneratingScript(true);
    try {
      const script = await window.api.generateScript(scriptPrompt, scriptGenre, activeProject.targetDuration);

      // Update project story outline
      const updated = await window.api.updateProject(activeProject.id, {
        hook: script.hook,
        intro: script.intro,
        climax: script.climax,
        ending: script.ending,
        status: 'scripted',
      });

      // Clear old scenes and insert generated ones
      for (const oldScene of activeProject.scenes) {
        await window.api.deleteScene(oldScene.id);
      }

      for (let i = 0; i < script.scenes.length; i++) {
        const s = script.scenes[i];
        await window.api.createScene({
          projectId: activeProject.id,
          sceneNumber: i + 1,
          scriptText: s.scriptText,
          narration: s.narration,
          generationPrompt: s.prompt,
          duration: s.duration,
          status: 'draft',
          characterId: selectedCharId || undefined,
        });
      }

      const refreshed = await window.api.getProjectById(activeProject.id);
      setActiveProject(refreshed);
      if (refreshed?.scenes.length) setActiveScene(refreshed.scenes[0]);

      addToast({
        type: 'success',
        title: 'Story Script Generated',
        message: `Created ${script.scenes.length} cinematic storyboard scenes.`,
      });
      setIsScriptModalOpen(false);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Script generation failed', message: err.message });
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleOpenFlowAssistant = (scene: Scene) => {
    if (!activeProject) return;
    const char = characters.find((c) => c.id === scene.characterId);
    const flowText = `
[GOOGLE FLOW SCENE PROMPT]
Project: ${activeProject.title}
Scene: ${scene.sceneNumber} (${scene.duration}s)

${scene.generationPrompt}

[CONTINUITY]
${activeProject.continuityNotes}
${char ? `Character Continuity: ${char.name} (${char.appearance}, ${char.clothing})` : ''}

[NARRATION]
${scene.narration}
`.trim();

    setFlowPackage({
      url: 'https://flow.google.com',
      prompt: flowText,
      sceneId: scene.id,
    });
    setIsFlowModalOpen(true);
  };

  const handleImportSceneVideo = async (sceneId: string) => {
    if (window.api) {
      const file = await window.api.openFileDialog(['mp4', 'mov', 'webm']);
      if (file) {
        await window.api.updateScene(sceneId, {
          videoPath: file,
          status: 'ready',
        });
        addToast({ type: 'success', title: 'Scene Clip Bound', message: 'Ready for final assembly.' });
        const refreshed = await window.api.getProjectById(activeProject!.id);
        setActiveProject(refreshed);
        const updatedScene = refreshed?.scenes.find((s) => s.id === sceneId);
        if (updatedScene) setActiveScene(updatedScene);
      }
    }
  };

  const handleRenderFinalVideo = async () => {
    if (!activeProject || !window.api) return;

    const readyClips = activeProject.scenes.filter((s) => s.videoPath);
    if (readyClips.length === 0) {
      addToast({
        type: 'warn',
        title: 'No Scene Clips Ready',
        message: 'Import or generate video clips for your scenes before assembling the final story.',
      });
      return;
    }

    setIsRendering(true);
    try {
      const res = await window.api.renderProjectVideo(activeProject.id);
      addToast({
        type: 'info',
        title: 'Rendering Queued',
        message: `Assembling ${readyClips.length} clips with FFmpeg in task queue.`,
      });
      setCurrentSection('automation-queue');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Render Failed', message: err.message });
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="flex h-full select-none overflow-hidden">
      {/* Panel 1 (Left): Project & Configuration Settings */}
      <div className="w-80 border-r border-studio-800 bg-studio-900/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-studio-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-studio-100 flex items-center gap-2">
              <Film size={16} className="text-brand-400" />
              Story Project
            </h3>
            <p className="text-[11px] text-studio-400">Configuration & Outline</p>
          </div>
          <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => setIsNewProjectModalOpen(true)}>
            New
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {projects.length > 0 && (
            <div>
              <label className="text-studio-400 block mb-1">Active Project</label>
              <select
                className="w-full bg-studio-850 border border-studio-750 rounded-lg p-2 text-studio-100 text-xs"
                value={activeProject?.id || ''}
                onChange={(e) => {
                  const p = projects.find((proj) => proj.id === e.target.value);
                  if (p) {
                    setActiveProject(p);
                    if (p.scenes.length) setActiveScene(p.scenes[0]);
                  }
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.genre})
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeProject ? (
            <>
              <div className="grid grid-cols-2 gap-2 p-3 bg-studio-850 rounded-lg border border-studio-800 text-[11px]">
                <div>
                  <span className="text-studio-500 block">Genre</span>
                  <span className="text-studio-200 capitalize font-medium">{activeProject.genre}</span>
                </div>
                <div>
                  <span className="text-studio-500 block">Aspect Ratio</span>
                  <span className="text-studio-200 font-mono">{activeProject.aspectRatio}</span>
                </div>
                <div>
                  <span className="text-studio-500 block">Target Duration</span>
                  <span className="text-studio-200 font-mono">{activeProject.targetDuration}s</span>
                </div>
                <div>
                  <span className="text-studio-500 block">Status</span>
                  <span className="text-brand-400 uppercase font-semibold">{activeProject.status}</span>
                </div>
              </div>

              {/* Story Pipeline Step Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  icon={<Wand2 size={14} />}
                  onClick={() => setIsScriptModalOpen(true)}
                >
                  Generate AI Story Script
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  icon={<Layers size={14} />}
                  loading={isRendering}
                  onClick={handleRenderFinalVideo}
                >
                  Assemble & Render Full Video
                </Button>
              </div>

              {/* Story Outline Summary */}
              <div className="space-y-2 pt-3 border-t border-studio-800">
                <span className="text-studio-400 font-semibold block text-[11px] uppercase tracking-wider">
                  Story Outline Arc
                </span>
                <div className="p-2.5 bg-studio-850/70 rounded-lg border border-studio-800 text-[11px] space-y-1.5">
                  <div>
                    <span className="text-brand-400 font-semibold">Hook:</span>{' '}
                    <span className="text-studio-300">{activeProject.hook || 'Not generated yet'}</span>
                  </div>
                  <div>
                    <span className="text-cyan-400 font-semibold">Climax:</span>{' '}
                    <span className="text-studio-300">{activeProject.climax || 'Not generated yet'}</span>
                  </div>
                  <div>
                    <span className="text-emerald-400 font-semibold">Ending:</span>{' '}
                    <span className="text-studio-300">{activeProject.ending || 'Not generated yet'}</span>
                  </div>
                </div>
              </div>

              {/* Continuity Guard */}
              <div className="space-y-1 pt-2">
                <label className="text-studio-400 font-semibold text-[11px] uppercase tracking-wider block">
                  Continuity Guard Notes
                </label>
                <textarea
                  rows={3}
                  className="w-full bg-studio-850 border border-studio-750 rounded-lg p-2 text-studio-200 text-xs"
                  value={activeProject.continuityNotes}
                  onChange={async (e) => {
                    const val = e.target.value;
                    setActiveProject({ ...activeProject, continuityNotes: val });
                    if (window.api) await window.api.updateProject(activeProject.id, { continuityNotes: val });
                  }}
                  placeholder="Keep clothing, lighting, and face consistent..."
                />
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-studio-500">Create a project to begin.</div>
          )}
        </div>
      </div>

      {/* Panel 2 (Center): Storyboard Scenes & Pipeline */}
      <div className="flex-1 flex flex-col overflow-hidden bg-studio-950">
        <div className="px-6 py-4 border-b border-studio-800 bg-studio-900/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-studio-100 flex items-center gap-2">
              <Layers size={16} className="text-brand-400" />
              Storyboard Timeline ({activeProject?.scenes.length ?? 0} Scenes)
            </h3>
            <p className="text-[11px] text-studio-400">
              Story → Script → Character Continuity → Flow Generation → FFmpeg Assembly
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={async () => {
                if (activeProject && window.api) {
                  const s = await window.api.createScene({
                    projectId: activeProject.id,
                    sceneNumber: activeProject.scenes.length + 1,
                    scriptText: 'New storyboard scene',
                    narration: 'Narration voiceover line...',
                    generationPrompt: 'Cinematic shot, character in focus',
                    duration: 5.0,
                    status: 'draft',
                  });
                  const refreshed = await window.api.getProjectById(activeProject.id);
                  setActiveProject(refreshed);
                  setActiveScene(s);
                }
              }}
            >
              Add Scene
            </Button>
          </div>
        </div>

        {/* Storyboard Cards Flow */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeProject?.scenes && activeProject.scenes.length > 0 ? (
            activeProject.scenes.map((scene) => {
              const isSelected = activeScene?.id === scene.id;
              const hasVideo = Boolean(scene.videoPath);

              return (
                <div
                  key={scene.id}
                  onClick={() => setActiveScene(scene)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row gap-4 ${
                    isSelected
                      ? 'bg-studio-850 border-brand-500/50 shadow-subtle'
                      : 'bg-studio-900 border-studio-800 hover:border-studio-700'
                  }`}
                >
                  {/* Scene Preview Box */}
                  <div className="w-36 h-28 bg-studio-950 rounded-lg overflow-hidden shrink-0 border border-studio-800 relative flex items-center justify-center">
                    {hasVideo ? (
                      <div className="relative w-full h-full">
                        <video
                          src={`file://${scene.videoPath?.replace(/\\/g, '/')}`}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-emerald-500/90 text-white text-[9px] font-semibold flex items-center gap-1">
                          <CheckCircle size={10} /> Ready
                        </span>
                      </div>
                    ) : (
                      <div className="text-center p-2">
                        <Film size={22} className="text-studio-600 mx-auto mb-1" />
                        <span className="text-[10px] text-studio-500 block">Pending Clip</span>
                      </div>
                    )}
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-studio-200 text-[10px] font-mono">
                      #{scene.sceneNumber}
                    </span>
                  </div>

                  {/* Scene Content Details */}
                  <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-studio-100">Scene {scene.sceneNumber}</span>
                        <Badge variant={hasVideo ? 'success' : 'neutral'} size="sm">
                          {hasVideo ? 'Clip Ready' : 'Prompt Prepared'}
                        </Badge>
                        <span className="text-studio-400 font-mono text-[11px]">{scene.duration}s</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Sparkles size={13} className="text-brand-400" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFlowAssistant(scene);
                          }}
                        >
                          Flow Prompt Assistant
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Upload size={13} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImportSceneVideo(scene.id);
                          }}
                        >
                          Import Clip
                        </Button>
                      </div>
                    </div>

                    <p className="text-studio-300 line-clamp-1">{scene.scriptText}</p>

                    <div className="p-2 bg-studio-950/80 rounded border border-studio-800 text-[11px] text-studio-400 font-mono line-clamp-2">
                      <span className="text-brand-400 font-sans font-semibold">Prompt: </span>
                      {scene.generationPrompt}
                    </div>

                    {scene.narration && (
                      <div className="text-[11px] text-studio-400 italic">
                        🎙️ Voiceover: "{scene.narration}"
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState
              icon={<Film size={32} />}
              title="Storyboard is empty"
              description="Click 'Generate AI Story Script' on the left panel to auto-generate a structured multi-scene narrative tailored to your chosen duration and character."
              actionText="Generate Story Script"
              onAction={() => setIsScriptModalOpen(true)}
            />
          )}
        </div>
      </div>

      {/* Panel 3 (Right): Scene Inspector & Continuity Refiner */}
      <div className="w-80 border-l border-studio-800 bg-studio-900/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-studio-800">
          <h3 className="text-sm font-semibold text-studio-100">Scene Inspector</h3>
          <p className="text-[11px] text-studio-400">Fine-tune prompts & character links</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {activeScene ? (
            <>
              <div>
                <label className="text-studio-400 block mb-1">Assigned Character</label>
                <select
                  className="w-full bg-studio-850 border border-studio-750 rounded-lg p-2 text-studio-100 text-xs"
                  value={activeScene.characterId || ''}
                  onChange={async (e) => {
                    const charId = e.target.value;
                    setActiveScene({ ...activeScene, characterId: charId });
                    if (window.api) {
                      await window.api.updateScene(activeScene.id, { characterId: charId || undefined });
                      const refreshed = await window.api.getProjectById(activeProject!.id);
                      setActiveProject(refreshed);
                    }
                  }}
                >
                  <option value="">No Character Assigned</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.isLocked ? '(Locked Profile)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-studio-400 block mb-1">Duration (Seconds)</label>
                <Input
                  type="number"
                  min={2}
                  max={30}
                  value={activeScene.duration}
                  onChange={async (e) => {
                    const d = parseFloat(e.target.value) || 5;
                    setActiveScene({ ...activeScene, duration: d });
                    if (window.api) await window.api.updateScene(activeScene.id, { duration: d });
                  }}
                />
              </div>

              <div>
                <label className="text-studio-400 block mb-1">Script & Visual Direction</label>
                <textarea
                  rows={3}
                  className="w-full bg-studio-850 border border-studio-750 rounded-lg p-2 text-studio-200 text-xs"
                  value={activeScene.scriptText}
                  onChange={async (e) => {
                    const txt = e.target.value;
                    setActiveScene({ ...activeScene, scriptText: txt });
                    if (window.api) await window.api.updateScene(activeScene.id, { scriptText: txt });
                  }}
                />
              </div>

              <div>
                <label className="text-studio-400 block mb-1">Narration Voiceover</label>
                <textarea
                  rows={2}
                  className="w-full bg-studio-850 border border-studio-750 rounded-lg p-2 text-studio-200 text-xs"
                  value={activeScene.narration}
                  onChange={async (e) => {
                    const n = e.target.value;
                    setActiveScene({ ...activeScene, narration: n });
                    if (window.api) await window.api.updateScene(activeScene.id, { narration: n });
                  }}
                />
              </div>

              <div>
                <label className="text-studio-400 block mb-1">AI Video Generation Prompt</label>
                <textarea
                  rows={4}
                  className="w-full bg-studio-850 border border-studio-750 rounded-lg p-2 text-studio-200 text-xs font-mono"
                  value={activeScene.generationPrompt}
                  onChange={async (e) => {
                    const p = e.target.value;
                    setActiveScene({ ...activeScene, generationPrompt: p });
                    if (window.api) await window.api.updateScene(activeScene.id, { generationPrompt: p });
                  }}
                />
              </div>

              <div className="pt-2">
                <Button
                  variant="danger"
                  size="sm"
                  className="w-full"
                  icon={<Trash2 size={13} />}
                  onClick={async () => {
                    if (window.api && window.confirm('Delete this scene from storyboard?')) {
                      await window.api.deleteScene(activeScene.id);
                      const refreshed = await window.api.getProjectById(activeProject!.id);
                      setActiveProject(refreshed);
                      setActiveScene(refreshed?.scenes[0] || null);
                    }
                  }}
                >
                  Delete Scene
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-studio-500">Select a scene to inspect.</div>
          )}
        </div>
      </div>

      {/* Script Generator Modal */}
      <Modal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
        title="AI Story Script Architect"
        subtitle="Generate a complete multi-scene video narrative tailored to your character and genre"
        maxWidth="lg"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsScriptModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isGeneratingScript}
              icon={<Sparkles size={14} />}
              onClick={handleRunScriptGenerator}
            >
              Generate Script & Storyboard
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-medium text-studio-300 mb-1.5">
              Story Premise & Core Idea
            </label>
            <textarea
              rows={3}
              className="w-full bg-studio-900 border border-studio-700/80 rounded-lg p-2.5 text-sm text-studio-100"
              value={scriptPrompt}
              onChange={(e) => setScriptPrompt(e.target.value)}
              placeholder="Describe your story idea or plot twist..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Genre"
              value={scriptGenre}
              onChange={(e) => setScriptGenre(e.target.value)}
              options={[
                { value: 'mystery', label: 'Mystery / Suspense' },
                { value: 'comedy', label: 'Comedy / Satire' },
                { value: 'romance', label: 'Romance / Drama' },
                { value: 'adventure', label: 'Adventure / Action' },
                { value: 'emotional', label: 'Emotional / Heartfelt' },
                { value: 'horror', label: 'Horror / Thriller' },
                { value: 'educational', label: 'Educational / Explainer' },
              ]}
            />

            <Select
              label="Assign Consistent Character"
              value={selectedCharId}
              onChange={(e) => setSelectedCharId(e.target.value)}
              options={[
                { value: '', label: 'None (Dynamic AI character)' },
                ...characters.map((c) => ({ value: c.id, label: `${c.name} (${c.isLocked ? 'Locked' : 'Unlocked'})` })),
              ]}
            />
          </div>

          <div className="p-3 bg-studio-900 rounded-lg border border-studio-800 text-studio-400">
            <p className="font-semibold text-studio-200 mb-1">Story Arc Pipeline:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              <li>High-retention 3-second hook</li>
              <li>Rising tension & scene-by-scene character action</li>
              <li>Climactic revelation</li>
              <li>Call to action engagement ending</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* Flow AI Guided Assistant Modal */}
      {isFlowModalOpen && flowPackage && (
        <Modal
          isOpen={isFlowModalOpen}
          onClose={() => setIsFlowModalOpen(false)}
          title="Google Flow AI Guided Generation"
          subtitle="Prepare prompts, reference assets, and import generated video clips"
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                icon={<Copy size={14} />}
                onClick={() => {
                  navigator.clipboard.writeText(flowPackage.prompt);
                  addToast({ type: 'success', title: 'Prompt Copied to Clipboard' });
                }}
              >
                Copy Prompt Package
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ExternalLink size={14} />}
                  onClick={async () => {
                    if (window.api) await window.api.openExternalUrl('https://flow.google.com');
                  }}
                >
                  Open Google Flow Web
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  icon={<Upload size={14} />}
                  onClick={async () => {
                    setIsFlowModalOpen(false);
                    await handleImportSceneVideo(flowPackage.sceneId);
                  }}
                >
                  Import Generated Clip
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-studio-900 rounded-xl border border-studio-800 space-y-2">
              <span className="font-semibold text-brand-400 block">Step-by-Step Flow Instructions:</span>
              <ol className="list-decimal list-inside space-y-1 text-studio-300">
                <li>Click <strong>Copy Prompt Package</strong> below.</li>
                <li>Click <strong>Open Google Flow Web</strong> to launch the official Flow interface.</li>
                <li>Paste the prompt and attach your character reference image.</li>
                <li>Download the completed video clip from Flow.</li>
                <li>Click <strong>Import Generated Clip</strong> to bind it directly to this scene.</li>
              </ol>
            </div>

            <div>
              <label className="text-studio-400 font-medium block mb-1">Prepared Flow Prompt Package</label>
              <textarea
                readOnly
                rows={8}
                className="w-full bg-studio-950 border border-studio-800 rounded-lg p-3 text-studio-200 font-mono text-xs"
                value={flowPackage.prompt}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* New Project Modal */}
      <Modal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        title="Create Story Project"
        subtitle="Start a new multi-scene AI video production"
        maxWidth="md"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsNewProjectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateProject}>
              Create Project
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <Input
            label="Project Title"
            value={newProjectForm.title}
            onChange={(e) => setNewProjectForm({ ...newProjectForm, title: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Genre"
              value={newProjectForm.genre}
              onChange={(e) => setNewProjectForm({ ...newProjectForm, genre: e.target.value as any })}
              options={[
                { value: 'mystery', label: 'Mystery' },
                { value: 'comedy', label: 'Comedy' },
                { value: 'romance', label: 'Romance' },
                { value: 'adventure', label: 'Adventure' },
                { value: 'emotional', label: 'Emotional' },
                { value: 'horror', label: 'Horror' },
                { value: 'educational', label: 'Educational' },
              ]}
            />

            <Select
              label="Target Aspect Ratio"
              value={newProjectForm.aspectRatio}
              onChange={(e) => setNewProjectForm({ ...newProjectForm, aspectRatio: e.target.value as any })}
              options={[
                { value: '9:16', label: 'Vertical 9:16' },
                { value: '16:9', label: 'Horizontal 16:9' },
                { value: '1:1', label: 'Square 1:1' },
              ]}
            />
          </div>

          <Input
            label="Target Duration (Seconds)"
            type="number"
            value={newProjectForm.targetDuration}
            onChange={(e) => setNewProjectForm({ ...newProjectForm, targetDuration: parseInt(e.target.value, 10) || 60 })}
          />
        </div>
      </Modal>
    </div>
  );
};
