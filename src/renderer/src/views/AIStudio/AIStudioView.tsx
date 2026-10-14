import React, { useEffect, useState, useRef } from 'react';
import { Character, Scene, StoryProject } from '../../../../shared/types';
import { useAppStore } from '../../stores/useAppStore';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';

// Studio Layout Sub-components
import { ProjectSidebar } from './ProjectSidebar';
import { ProjectInspector } from './ProjectInspector';

// 7 Guided Creation Steps
import { Step1Character } from './steps/Step1Character';
import { Step2StoryHook } from './steps/Step2StoryHook';
import { Step3VideoPrompts } from './steps/Step3VideoPrompts';
import { Step4Voiceover } from './steps/Step4Voiceover';
import { Step5BackgroundMusic } from './steps/Step5BackgroundMusic';
import { Step6SoundEffects } from './steps/Step6SoundEffects';
import { Step7FinalExport } from './steps/Step7FinalExport';

import {
  Users,
  Sparkles,
  Film,
  Mic,
  Music,
  Volume2,
  Video,
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Settings,
} from 'lucide-react';

export const AIStudioView: React.FC = () => {
  const { addToast } = useAppStore();

  const [projects, setProjects] = useState<StoryProject[]>([]);
  const [activeProject, setActiveProject] = useState<StoryProject | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isProjectsPanelOpen, setIsProjectsPanelOpen] = useState<boolean>(true);
  const [isAutosaving, setIsAutosaving] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [quickConfigStep, setQuickConfigStep] = useState<number | null>(null);

  // Load all projects and characters on mount
  const loadStudioData = async (preferredProjectId?: string) => {
    if (!window.api) return;
    try {
      const pList = await window.api.getProjects();
      const cList = await window.api.getCharacters();
      setProjects(pList);
      setCharacters(cList);

      if (pList.length > 0) {
        const found = preferredProjectId ? pList.find((p) => p.id === preferredProjectId) : null;
        const target = found || (activeProject ? pList.find((p) => p.id === activeProject.id) : null) || pList[0];
        setActiveProject(target);
        if (target && target.currentStep) {
          setCurrentStep(target.currentStep);
        }
      } else {
        // When all projects are deleted, keep state empty cleanly so user can create their own!
        setActiveProject(null);
      }
    } catch (e: any) {
      console.error('Failed to load studio data', e);
    }
  };

  useEffect(() => {
    loadStudioData();
  }, []);

  // Update active project in database and state
  const handleUpdateActiveProject = async (updates: Partial<StoryProject>) => {
    if (!activeProject || !window.api) return;
    setIsAutosaving(true);
    try {
      const updated = await window.api.updateProject(activeProject.id, {
        ...updates,
        currentStep,
      });
      setActiveProject(updated);
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      addToast({ type: 'error', title: 'Autosave Failed', message: err.message });
    } finally {
      setIsAutosaving(false);
    }
  };

  // Toggle Character Selection
  const handleToggleCharacter = async (charId: string) => {
    if (!activeProject) return;
    const current = activeProject.selectedCharacterIds || [];
    let updatedIds: string[];
    if (current.includes(charId)) {
      updatedIds = current.filter((id) => id !== charId);
    } else {
      updatedIds = [...current, charId];
    }
    await handleUpdateActiveProject({ selectedCharacterIds: updatedIds });
  };

  // Step Validation Check
  const validateStep = (stepNumber: number): { valid: boolean; reason?: string } => {
    if (!activeProject) return { valid: false, reason: 'No active project' };

    if (stepNumber === 1) {
      // Step 1: Character
      if (!activeProject.selectedCharacterIds || activeProject.selectedCharacterIds.length === 0) {
        return {
          valid: false,
          reason: 'No character selected. Please select or create an AI protagonist to continue.',
        };
      }
    } else if (stepNumber === 2) {
      // Step 2: Story Idea & Hook
      if (!activeProject.hook?.trim()) {
        return {
          valid: false,
          reason: 'Opening hook is missing. Click "Generate Hook" or write an approved hook to proceed.',
        };
      }
    } else if (stepNumber === 3) {
      // Step 3: Video Prompts
      if (!activeProject.scenes || activeProject.scenes.length === 0) {
        return {
          valid: false,
          reason: 'No story scenes defined. Click "Add Scene" or "Generate Full Story" in Step 2.',
        };
      }
    }

    return { valid: true };
  };

  // Navigation handlers
  const handleGoNext = () => {
    const check = validateStep(currentStep);
    if (!check.valid) {
      setValidationError(check.reason || 'Please complete current step requirements.');
      addToast({ type: 'warn', title: 'Step Incomplete', message: check.reason });
      return;
    }
    setValidationError(null);
    if (currentStep < 7) {
      const next = currentStep + 1;
      setCurrentStep(next);
      handleUpdateActiveProject({ currentStep: next });
    }
  };

  const handleGoBack = () => {
    setValidationError(null);
    if (currentStep > 1) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      handleUpdateActiveProject({ currentStep: prev });
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setValidationError(null);
    setCurrentStep(stepIndex);
    handleUpdateActiveProject({ currentStep: stepIndex });
  };

  const handleCreateNewProject = async (data: Partial<StoryProject>) => {
    if (!window.api) return;
    try {
      const defaultChar = characters[0]?.id;
      const created = await window.api.createProject({
        title: data.title?.trim() || 'New Story Adventure',
        genre: data.genre || 'mystery',
        aspectRatio: data.aspectRatio || '9:16',
        targetDuration: data.targetDuration || 60,
        language: data.language || 'en',
        voice: data.voice || 'en-US-Standard-C',
        status: 'draft',
        currentStep: 1,
        selectedCharacterIds: data.selectedCharacterIds || (defaultChar ? [defaultChar] : []),
        storyIdea: data.storyIdea || '',
        hook: data.hook || '',
        endingHook: data.endingHook || '',
      });

      // Auto-initialize 3 starter scene templates for story continuity
      try {
        await window.api.createScene({
          projectId: created.id,
          sceneNumber: 1,
          title: 'Scene 1: Hook & Incident',
          scriptText: '[SCENE 1]\nOpening scene establishes mystery and grabs attention.',
          narration: 'Something unexplainable was unfolding in the shadows.',
          generationPrompt: `Cinematic visual scene in ${created.genre} style. Dramatic cinematic lighting, high-contrast, ultra-detailed 8k.`,
          duration: 5,
          characterId: defaultChar,
          status: 'draft',
        });
        await window.api.createScene({
          projectId: created.id,
          sceneNumber: 2,
          title: 'Scene 2: Discovery & Escalation',
          scriptText: '[SCENE 2]\nProtagonist investigates the anomaly and uncovers an unexpected lead.',
          narration: 'Every clue pointed toward a truth nobody was prepared to accept.',
          generationPrompt: `Cinematic tracking shot in ${created.genre} style. Intense atmosphere, dynamic camera motion.`,
          duration: 5,
          characterId: defaultChar,
          status: 'draft',
        });
        await window.api.createScene({
          projectId: created.id,
          sceneNumber: 3,
          title: 'Scene 3: Climax & Cliffhanger',
          scriptText: '[SCENE 3]\nDecisive revelation that leaves viewers eager for the next chapter.',
          narration: 'And then, the impossible happened. Follow for part two.',
          generationPrompt: `Cinematic climactic shot in ${created.genre} style. Volumetric lighting, high tension.`,
          duration: 5,
          characterId: defaultChar,
          status: 'draft',
        });
      } catch (sceneErr) {
        console.warn('Initial scene template notice:', sceneErr);
      }

      await loadStudioData(created.id);
      setCurrentStep(1);
      setValidationError(null);
      addToast({ type: 'success', title: 'New Story Project Created', message: created.title });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to Create Project', message: err.message });
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.api) return;
    try {
      await window.api.deleteProject(id);
      const remaining = projects.filter((p) => p.id !== id);
      setProjects(remaining);
      if (activeProject?.id === id) {
        const next = remaining[0] || null;
        setActiveProject(next);
        setCurrentStep(next?.currentStep || 1);
      }
      addToast({ type: 'info', title: 'Project Deleted' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to Delete Project', message: err.message });
    }
  };

  const stepsConfig = [
    { num: 1, title: 'Character', icon: <Users size={14} /> },
    { num: 2, title: 'Story & Hook', icon: <Sparkles size={14} /> },
    { num: 3, title: 'Prompts', icon: <Film size={14} /> },
    { num: 4, title: 'Voice-over', icon: <Mic size={14} /> },
    { num: 5, title: 'Music', icon: <Music size={14} /> },
    { num: 6, title: 'Sound FX', icon: <Volume2 size={14} /> },
    { num: 7, title: 'Final Video', icon: <Video size={14} /> },
  ];

  const selectedChars = characters.filter((c) =>
    activeProject?.selectedCharacterIds?.includes(c.id)
  );

  return (
    <div className="flex h-full select-none overflow-hidden bg-studio-900">
      {/* 1. Left Project Navigation Panel */}
      <ProjectSidebar
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(p) => {
          setActiveProject(p);
          setCurrentStep(p.currentStep || 1);
          setValidationError(null);
        }}
        onCreateProject={handleCreateNewProject}
        onDeleteProject={handleDeleteProject}
        isOpen={isProjectsPanelOpen}
        onToggle={() => setIsProjectsPanelOpen(!isProjectsPanelOpen)}
      />

      {/* 2. Main Guided Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Step Progress Stepper Bar */}
        <div className="px-6 py-3 border-b border-studio-800 bg-studio-950/70 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              {stepsConfig.map((s, idx) => {
                const isActive = currentStep === s.num;
                const isPassed = currentStep > s.num;

                return (
                  <React.Fragment key={s.num}>
                    <div
                      className={`flex items-center rounded-xl transition-all shrink-0 border ${
                        isActive
                          ? 'bg-brand-500 border-brand-400 text-white shadow-subtle'
                          : isPassed
                          ? 'bg-studio-850 border-studio-750 text-studio-200'
                          : 'bg-studio-900 border-studio-800 text-studio-500'
                      }`}
                    >
                      <button
                        onClick={() => handleStepClick(s.num)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold hover:opacity-90"
                      >
                        <span className={isActive ? 'text-white' : isPassed ? 'text-emerald-400' : 'text-studio-500'}>
                          {isPassed ? <CheckCircle2 size={13} /> : s.icon}
                        </span>
                        <span>
                          {s.num}. {s.title}
                        </span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickConfigStep(s.num);
                        }}
                        className={`p-1 mr-1.5 rounded-md text-[10px] flex items-center gap-1 transition-colors ${
                          isActive
                            ? 'hover:bg-white/20 text-white/90'
                            : 'hover:bg-studio-800 text-studio-400 hover:text-studio-200'
                        }`}
                        title={`Configure Step ${s.num}: ${s.title}`}
                      >
                        <Settings size={12} />
                      </button>
                    </div>

                    {idx < stepsConfig.length - 1 && (
                      <div className="w-3 h-0.5 bg-studio-800 shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Quick Config Button & Autosave Status */}
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <Button
                variant="secondary"
                size="sm"
                icon={<Settings size={12} />}
                onClick={() => setQuickConfigStep(currentStep)}
                className="h-7 text-xs px-2.5 bg-studio-900 border border-studio-800 text-studio-300 hover:text-white"
              >
                Config Step {currentStep}
              </Button>

              <div className="text-[11px] text-studio-500 flex items-center gap-1.5 font-mono">
                <span className={`w-2 h-2 rounded-full ${isAutosaving ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                <span>{isAutosaving ? 'Saving Draft...' : 'Autosaved'}</span>
              </div>
            </div>
          </div>

          {/* Validation Warning Notice */}
          {validationError && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-400 shrink-0" />
                <span>{validationError}</span>
              </div>
              <button
                onClick={() => setValidationError(null)}
                className="text-amber-400 hover:text-amber-200 font-bold ml-3"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Guided Step Active Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeProject ? (
            <>
              {currentStep === 1 && (
                <Step1Character
                  characters={characters}
                  selectedCharacterIds={activeProject.selectedCharacterIds || []}
                  onToggleCharacter={handleToggleCharacter}
                  onRefreshCharacters={() => loadStudioData(activeProject.id)}
                  project={activeProject}
                  onUpdateProject={handleUpdateActiveProject}
                />
              )}

              {currentStep === 2 && (
                <Step2StoryHook
                  project={activeProject}
                  selectedCharacters={selectedChars}
                  onUpdateProject={handleUpdateActiveProject}
                  onGenerateFullScenes={async () => {
                    await loadStudioData(activeProject.id);
                  }}
                />
              )}

              {currentStep === 3 && (
                <Step3VideoPrompts
                  project={activeProject}
                  scenes={activeProject.scenes || []}
                  selectedCharacters={selectedChars}
                  onRefreshProject={() => loadStudioData(activeProject.id)}
                  onUpdateProject={handleUpdateActiveProject}
                />
              )}

              {currentStep === 4 && (
                <Step4Voiceover
                  project={activeProject}
                  onRefreshProject={() => loadStudioData(activeProject.id)}
                  onUpdateProject={handleUpdateActiveProject}
                />
              )}

              {currentStep === 5 && (
                <Step5BackgroundMusic
                  project={activeProject}
                  onRefreshProject={() => loadStudioData(activeProject.id)}
                  onUpdateProject={handleUpdateActiveProject}
                />
              )}

              {currentStep === 6 && (
                <Step6SoundEffects
                  project={activeProject}
                  onRefreshProject={() => loadStudioData(activeProject.id)}
                  onUpdateProject={handleUpdateActiveProject}
                />
              )}

              {currentStep === 7 && (
                <Step7FinalExport
                  project={activeProject}
                  onRefreshProject={() => loadStudioData(activeProject.id)}
                  onUpdateProject={handleUpdateActiveProject}
                  onResetToNewProject={() => {
                    handleCreateNewProject({ title: 'New Story Adventure' });
                  }}
                />
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-6">
              <EmptyState
                icon={<FolderOpen size={36} />}
                title="No story project selected"
                description="Start fresh by creating a new story project, or select an existing one from the sidebar."
                actionText="+ Create New Story Project"
                onAction={() => handleCreateNewProject({ title: 'New Story Adventure' })}
              />
            </div>
          )}
        </div>

        {/* 3. Bottom Action Bar (Back, Save Draft, Continue) */}
        {activeProject && (
          <div className="h-16 px-6 border-t border-studio-800 bg-studio-950 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<ArrowLeft size={14} />}
                onClick={handleGoBack}
                disabled={currentStep === 1}
              >
                Back
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Save size={14} />}
                onClick={() => {
                  handleUpdateActiveProject({});
                  addToast({ type: 'success', title: 'Project Draft Saved' });
                }}
              >
                Save Draft
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-studio-500 font-mono">
                Step {currentStep} of 7: {stepsConfig[currentStep - 1]?.title}
              </span>

              {currentStep < 7 ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<ArrowRight size={14} />}
                  onClick={handleGoNext}
                >
                  Continue to Next Step
                </Button>
              ) : (
                <Button
                  variant="success"
                  size="sm"
                  icon={<CheckCircle2 size={14} />}
                  onClick={() => {
                    addToast({
                      type: 'success',
                      title: 'Story Workflow Complete',
                      message: 'Render and export your final story video.',
                    });
                  }}
                >
                  Workflow Finished
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Right Inspector & Continuity Assistant */}
      <ProjectInspector
        project={activeProject}
        selectedCharacters={selectedChars}
        currentStep={currentStep}
        onOpenStepConfig={(st) => setQuickConfigStep(st)}
      />

      {/* Step Quick Configuration Modal */}
      {quickConfigStep !== null && activeProject && (
        <Modal
          isOpen={quickConfigStep !== null}
          onClose={() => setQuickConfigStep(null)}
          title={`Configure Step ${quickConfigStep}: ${stepsConfig[quickConfigStep - 1]?.title}`}
          subtitle="Adjust AI parameters, story hooks, prompts, and audio presets for this workflow stage"
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentStep(quickConfigStep);
                  setQuickConfigStep(null);
                }}
              >
                Go to Step {quickConfigStep} Page
              </Button>
              <Button variant="primary" size="sm" onClick={() => setQuickConfigStep(null)}>
                Done
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {quickConfigStep === 1 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-studio-400 block mb-1">Project Title</label>
                    <input
                      type="text"
                      value={activeProject.title}
                      onChange={(e) => handleUpdateActiveProject({ title: e.target.value })}
                      className="w-full bg-studio-900 border border-studio-750 rounded-lg px-2.5 py-1.5 text-studio-200"
                    />
                  </div>
                  <div>
                    <label className="text-studio-400 block mb-1">Genre</label>
                    <select
                      value={activeProject.genre}
                      onChange={(e) => handleUpdateActiveProject({ genre: e.target.value as any })}
                      className="w-full bg-studio-900 border border-studio-750 rounded-lg px-2.5 py-1.5 text-studio-200"
                    >
                      {['mystery', 'horror', 'sci-fi', 'thriller', 'action', 'romance', 'comedy', 'fantasy'].map(
                        (g) => (
                          <option key={g} value={g}>
                            {g.toUpperCase()}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-studio-950 rounded-xl border border-studio-800">
                  <span className="text-xs font-semibold text-studio-200 block mb-1">
                    Protagonist Identity & Consistency
                  </span>
                  <p className="text-studio-400 text-[11px]">
                    {selectedChars.length > 0
                      ? `Active character: ${selectedChars.map((c) => c.name).join(', ')}. Face consistency seed locked across all Flow video scenes.`
                      : 'No character selected yet. Select or generate a character in Step 1.'}
                  </p>
                </div>
              </div>
            )}

            {quickConfigStep === 2 && (
              <div className="space-y-3">
                <div>
                  <label className="text-studio-400 block mb-1 font-medium">
                    Story Premise / Prompt
                  </label>
                  <textarea
                    rows={2}
                    value={activeProject.storyIdea || ''}
                    onChange={(e) => handleUpdateActiveProject({ storyIdea: e.target.value })}
                    placeholder="Enter core story premise or prompt..."
                    className="w-full bg-studio-900 border border-studio-750 rounded-lg px-2.5 py-1.5 text-studio-200"
                  />
                </div>

                <div>
                  <label className="text-studio-400 block mb-1 font-medium">
                    Opening Hook (First 3 Seconds)
                  </label>
                  <textarea
                    rows={2}
                    value={activeProject.hook || ''}
                    onChange={(e) => handleUpdateActiveProject({ hook: e.target.value })}
                    placeholder="First 3-second attention grabber..."
                    className="w-full bg-studio-900 border border-studio-750 rounded-lg px-2.5 py-1.5 text-studio-200"
                  />
                </div>

                <div>
                  <label className="text-studio-400 block mb-1 font-medium text-brand-300">
                    Ending Hook & Cliffhanger (Compel Viewer to Watch Next Video / Part 2)
                  </label>
                  <textarea
                    rows={2}
                    value={activeProject.endingHook || ''}
                    onChange={(e) => handleUpdateActiveProject({ endingHook: e.target.value })}
                    placeholder="Sequel cliffhanger to compel viewers to watch next video..."
                    className="w-full bg-studio-900 border border-brand-500/40 rounded-lg px-2.5 py-1.5 text-studio-200"
                  />
                </div>
              </div>
            )}

            {quickConfigStep === 3 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-studio-400 block mb-1">Aspect Ratio</label>
                    <select
                      value={activeProject.aspectRatio}
                      onChange={(e) => handleUpdateActiveProject({ aspectRatio: e.target.value as any })}
                      className="w-full bg-studio-900 border border-studio-750 rounded-lg px-2.5 py-1.5 text-studio-200"
                    >
                      <option value="9:16">9:16 (TikTok / Shorts / Reels)</option>
                      <option value="16:9">16:9 (YouTube Widescreen)</option>
                      <option value="1:1">1:1 (Square Feed)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-studio-400 block mb-1">Target Duration (Seconds)</label>
                    <input
                      type="number"
                      min={10}
                      max={300}
                      value={activeProject.targetDuration}
                      onChange={(e) => handleUpdateActiveProject({ targetDuration: parseInt(e.target.value) || 60 })}
                      className="w-full bg-studio-900 border border-studio-750 rounded-lg px-2.5 py-1.5 text-studio-200"
                    />
                  </div>
                </div>

                <div className="p-3 bg-studio-950 rounded-xl border border-studio-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-studio-200 block">
                      Scenes Count: {activeProject.scenes?.length || 0} Scenes
                    </span>
                    <span className="text-[11px] text-studio-400">
                      Assemble AI scene video clips maintaining character face consistency
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Sparkles size={13} />}
                    onClick={async () => {
                      if (!window.api) return;
                      try {
                        const res = await window.api.generateAllSceneVideos(activeProject.id);
                        await loadStudioData(activeProject.id);
                        addToast({
                          type: 'success',
                          title: 'AI Scenes Generated',
                          message: `Assembled ${res.generatedCount} AI scene video clips.`,
                        });
                      } catch (e: any) {
                        addToast({ type: 'error', title: 'Generation failed', message: e.message });
                      }
                    }}
                  >
                    Generate All AI Scene Videos
                  </Button>
                </div>
              </div>
            )}

            {quickConfigStep === 4 && (
              <div className="space-y-3">
                <div>
                  <label className="text-studio-400 block mb-1">Voiceover Persona</label>
                  <select
                    value={activeProject.voice}
                    onChange={(e) => handleUpdateActiveProject({ voice: e.target.value })}
                    className="w-full bg-studio-900 border border-studio-750 rounded-lg px-2.5 py-1.5 text-studio-200"
                  >
                    <option value="en-US-Standard-C">Adam (Dramatic Cinematic Narrator - Male)</option>
                    <option value="en-US-Standard-E">Rachel (Crisp Energetic Storyteller - Female)</option>
                    <option value="en-US-Standard-D">Marcus (Deep Thriller & Mystery - Male)</option>
                    <option value="en-US-Standard-F">Sophia (Smooth Calm Documentary - Female)</option>
                  </select>
                </div>
              </div>
            )}

            {quickConfigStep === 5 && (
              <div className="space-y-3">
                <div className="p-3 bg-studio-950 rounded-xl border border-studio-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-studio-200 block">
                      Background Music Auto-Match
                    </span>
                    <span className="text-[11px] text-studio-400">
                      Automatically select music matching genre: {activeProject.genre}
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Sparkles size={13} />}
                    onClick={async () => {
                      if (!window.api) return;
                      try {
                        const res = await window.api.autoMatchBackgroundMusic(activeProject.id);
                        await loadStudioData(activeProject.id);
                        addToast({
                          type: 'success',
                          title: 'Music Auto-Matched',
                          message: `Matched ${res.matchedTrack?.title || 'soundtrack'} (${res.genre} / ${res.mood}).`,
                        });
                      } catch (e: any) {
                        addToast({ type: 'error', title: 'Auto-match failed', message: e.message });
                      }
                    }}
                  >
                    ✨ AI Auto-Match Music
                  </Button>
                </div>

                <div>
                  <label className="text-studio-400 block mb-1">Music Volume ({activeProject.musicSettings?.volume ?? 30}%)</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={activeProject.musicSettings?.volume ?? 30}
                    onChange={(e) => {
                      const vol = parseInt(e.target.value);
                      handleUpdateActiveProject({
                        musicSettings: {
                          ...(activeProject.musicSettings || {
                            trackId: 'mus_cinematic',
                            mood: 'cinematic',
                            loop: true,
                            ducking: true,
                          }),
                          volume: vol,
                        },
                      });
                    }}
                    className="w-full accent-brand-500"
                  />
                </div>
              </div>
            )}

            {quickConfigStep === 6 && (
              <div className="space-y-3">
                <div className="p-3 bg-studio-950 rounded-xl border border-studio-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-studio-200 block">
                      AI Sound Effects Foley
                    </span>
                    <span className="text-[11px] text-studio-400">
                      Scan scene actions and auto-attach footsteps, rain, boom, and transitions
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Sparkles size={13} />}
                    onClick={async () => {
                      if (!window.api) return;
                      try {
                        const res = await window.api.autoAssignSceneSoundEffects(activeProject.id);
                        await loadStudioData(activeProject.id);
                        addToast({
                          type: 'success',
                          title: 'AI Sound Effects Generated',
                          message: `Attached ${res.assignedEffects?.length || 0} foley cues to scenes.`,
                        });
                      } catch (e: any) {
                        addToast({ type: 'error', title: 'SFX auto-assign failed', message: e.message });
                      }
                    }}
                  >
                    ✨ AI Auto-Assign SFX
                  </Button>
                </div>
              </div>
            )}

            {quickConfigStep === 7 && (
              <div className="space-y-3">
                <div className="p-3 bg-studio-950 rounded-xl border border-studio-800">
                  <span className="text-xs font-semibold text-studio-200 block mb-1">
                    Final Render & Export Ready
                  </span>
                  <p className="text-studio-400 text-[11px]">
                    Target Resolution: {activeProject.aspectRatio === '9:16' ? '1080x1920' : '1920x1080'} • 60 FPS • Subtitle Burn-in Enabled
                  </p>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
