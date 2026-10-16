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
import { CharactersView } from '../Characters/CharactersView';

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

interface AIStudioViewProps {
  initialOpenCharactersConfig?: boolean;
}

export const AIStudioView: React.FC<AIStudioViewProps> = ({ initialOpenCharactersConfig = false }) => {
  const { addToast, settings } = useAppStore();

  const [projects, setProjects] = useState<StoryProject[]>([]);
  const [activeProject, setActiveProject] = useState<StoryProject | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isProjectsPanelOpen, setIsProjectsPanelOpen] = useState<boolean>(true);
  const [isInspectorPanelOpen, setIsInspectorPanelOpen] = useState<boolean>(true);
  const [isAutosaving, setIsAutosaving] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [quickConfigStep, setQuickConfigStep] = useState<number | null>(null);
  const [isCharactersModalOpen, setIsCharactersModalOpen] = useState<boolean>(initialOpenCharactersConfig);

  useEffect(() => {
    if (initialOpenCharactersConfig) {
      setIsCharactersModalOpen(true);
    }
  }, [initialOpenCharactersConfig]);

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
    const char = characters.find((c) => c.id === charId);
    if (!char) return;

    const current = activeProject.selectedCharacterIds || [];
    const isCurrentlySelected = current.includes(charId);

    if (!isCurrentlySelected) {
      // Enforce: Character must have a generated image or uploaded image to be used
      if (!char.references || char.references.length === 0) {
        addToast({
          type: 'warn',
          title: 'Character Image Required',
          message: `Only characters with a generated image or uploaded image can be used. Please generate or upload a photo for "${char.name}".`,
        });
        return;
      }
    }

    let updatedIds: string[];
    if (isCurrentlySelected) {
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

      const selected = characters.filter((c) => activeProject.selectedCharacterIds?.includes(c.id));
      const missingImage = selected.find((c) => !c.references || c.references.length === 0);
      if (missingImage) {
        return {
          valid: false,
          reason: `Character "${missingImage.name}" has no image. Only characters with a generated image or uploaded image can be used.`,
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
        targetDuration: data.targetDuration || settings?.defaultVideoDuration || 30,
        language: data.language || 'en',
        voice: data.voice || 'en-US-Standard-C',
        status: 'draft',
        currentStep: 1,
        selectedCharacterIds: data.selectedCharacterIds || (defaultChar ? [defaultChar] : []),
        storyIdea: data.storyIdea || '',
        hook: data.hook || '',
        endingHook: data.endingHook || '',
      });

      // Auto-initialize 5 starter scene templates for a 30s short-form story
      try {
        await window.api.createScene({
          projectId: created.id,
          sceneNumber: 1,
          title: 'Scene 1: Hook & Incident',
          scriptText: '[SCENE 1]\nOpening viral hook establishes the incident and grabs attention immediately.',
          narration: 'Something unexplainable was unfolding in the shadows.',
          generationPrompt: `Cinematic visual scene in ${created.genre} style. Dramatic cinematic lighting, high-contrast, ultra-detailed 8k.`,
          duration: 6,
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
          duration: 6,
          characterId: defaultChar,
          status: 'draft',
        });
        await window.api.createScene({
          projectId: created.id,
          sceneNumber: 3,
          title: 'Scene 3: The Complication',
          scriptText: '[SCENE 3]\nThe stakes heighten as unexpected resistance emerges.',
          narration: 'There was no turning back now.',
          generationPrompt: `High-tension dramatic shot in ${created.genre} style. Volumetric lighting and moody shadows.`,
          duration: 6,
          characterId: defaultChar,
          status: 'draft',
        });
        await window.api.createScene({
          projectId: created.id,
          sceneNumber: 4,
          title: 'Scene 4: The Turning Point',
          scriptText: '[SCENE 4]\nA key breakthrough reverses the balance of power.',
          narration: 'The missing piece was finally uncovered.',
          generationPrompt: `Cinematic Dutch angle close-up in ${created.genre} style. Cold cyan spotlight, 35mm lens.`,
          duration: 6,
          characterId: defaultChar,
          status: 'draft',
        });
        await window.api.createScene({
          projectId: created.id,
          sceneNumber: 5,
          title: 'Scene 5: Climax & Cliffhanger',
          scriptText: '[SCENE 5]\nDecisive revelation that leaves viewers eager for the next chapter.',
          narration: 'And then, the impossible happened. Follow for part two.',
          generationPrompt: `Cinematic climactic shot in ${created.genre} style. Golden hour dramatic lighting, heroic framing.`,
          duration: 6,
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

  const handleDuplicateProject = async (proj: StoryProject) => {
    if (!window.api) return;
    try {
      const duplicated = await window.api.createProject({
        title: `${proj.title} (Copy)`,
        genre: proj.genre,
        aspectRatio: proj.aspectRatio,
        targetDuration: proj.targetDuration,
        language: proj.language,
        voice: proj.voice,
        status: 'draft',
        currentStep: 1,
        selectedCharacterIds: proj.selectedCharacterIds,
        storyIdea: proj.storyIdea,
        hook: proj.hook,
        endingHook: proj.endingHook,
      });

      // Duplicate existing scenes if any
      if (proj.scenes && proj.scenes.length > 0) {
        for (const sc of proj.scenes) {
          await window.api.createScene({
            projectId: duplicated.id,
            sceneNumber: sc.sceneNumber,
            title: sc.title,
            scriptText: sc.scriptText,
            narration: sc.narration,
            generationPrompt: sc.generationPrompt,
            duration: sc.duration,
            characterId: sc.characterId,
            status: 'draft',
          });
        }
      }

      await loadStudioData(duplicated.id);
      addToast({ type: 'success', title: 'Project Duplicated', message: duplicated.title });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to Duplicate Project', message: err.message });
    }
  };

  const handleRenameProject = async (id: string, newTitle: string) => {
    if (!window.api) return;
    try {
      await window.api.updateProject(id, { title: newTitle });
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, title: newTitle } : p)));
      if (activeProject?.id === id) {
        setActiveProject((prev) => (prev ? { ...prev, title: newTitle } : prev));
      }
      addToast({ type: 'success', title: 'Project Renamed', message: newTitle });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Rename Failed', message: err.message });
    }
  };

  const stepsConfig = [
    { num: 1, title: 'Character', icon: <Users size={13} /> },
    { num: 2, title: 'Story', icon: <Sparkles size={13} /> },
    { num: 3, title: 'Prompts', icon: <Film size={13} /> },
    { num: 4, title: 'Voice', icon: <Mic size={13} /> },
    { num: 5, title: 'Music', icon: <Music size={13} /> },
    { num: 6, title: 'Sound FX', icon: <Volume2 size={13} /> },
    { num: 7, title: 'Export', icon: <Video size={13} /> },
  ];

  const selectedChars = characters.filter((c) =>
    activeProject?.selectedCharacterIds?.includes(c.id)
  );

  return (
    <div className="flex h-full select-none overflow-hidden bg-[#050B1D]">
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
        onDuplicateProject={handleDuplicateProject}
        onRenameProject={handleRenameProject}
        isOpen={isProjectsPanelOpen}
        onToggle={() => setIsProjectsPanelOpen(!isProjectsPanelOpen)}
      />

      {/* 2. Main Guided Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#050B1D]">
        {/* Step Progress Stepper Bar - Matching Design Reference */}
        <div className="px-5 py-3 border-b border-[#18345C] bg-[#07122A] shrink-0">
          <div className="flex items-center justify-between gap-3">
            {/* Steps Workflow Track */}
            <div className="flex-1 flex items-center gap-1.5 min-w-0 overflow-x-auto scrollbar-none py-0.5">
              {stepsConfig.map((s, idx) => {
                const isActive = currentStep === s.num;
                const isPassed = currentStep > s.num;

                return (
                  <React.Fragment key={s.num}>
                    <button
                      type="button"
                      onClick={() => handleStepClick(s.num)}
                      className={`px-3 py-1.5 rounded-full text-xs transition-all border select-none shrink-0 flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-gradient-to-r from-[#00C8F5] to-[#087BFF] border-[#00C8F5] text-white font-bold shadow-[0_0_16px_rgba(0,200,245,0.45)] ring-1 ring-[#00C8F5]/60'
                          : isPassed
                          ? 'bg-[#0B1D3B] border-[#18345C] text-[#F1F5FF] hover:border-[#00C8F5]/50 hover:bg-[#0D2040]'
                          : 'bg-[#0A1933]/70 border-[#18345C]/60 text-[#91A4C5] hover:text-[#F1F5FF] hover:border-[#18345C]'
                      }`}
                      title={`Go to Step ${s.num}: ${s.title}`}
                    >
                      <span className="shrink-0">
                        {isPassed ? (
                          <CheckCircle2 size={13} className="text-[#00C8F5] stroke-[2.5]" />
                        ) : (
                          <span className={isActive ? 'text-white' : 'text-[#91A4C5]'}>{s.icon}</span>
                        )}
                      </span>
                      <span className="truncate text-xs tracking-tight font-medium">
                        {s.num}. {s.title}
                      </span>
                      <Settings
                        size={11}
                        className={`ml-0.5 shrink-0 transition-opacity ${
                          isActive
                            ? 'text-white/90'
                            : isPassed
                            ? 'text-[#546F96] hover:text-[#00C8F5]'
                            : 'text-[#546F96]/40'
                        }`}
                      />
                    </button>

                    {idx < stepsConfig.length - 1 && (
                      <div className="w-2 h-[1px] bg-[#18345C] shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Quick Actions & Autosave */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                icon={<Users size={13} className="text-[#00C8F5]" />}
                onClick={() => setIsCharactersModalOpen(true)}
                className="h-8 text-xs px-3 bg-[#0A1933] border border-[#18345C] text-[#F1F5FF] hover:text-white hover:border-[#00C8F5] transition-all shadow-subtle flex items-center gap-1.5 shrink-0 rounded-full"
                title="Manage AI Characters"
              >
                <span>AI Characters</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#00C8F5]/20 border border-[#00C8F5]/30 text-[#00C8F5] text-[10px] font-mono font-bold">
                  {characters.length}
                </span>
              </Button>

              <button
                onClick={() => setQuickConfigStep(currentStep)}
                className="h-8 text-xs px-3 bg-[#0A1933] border border-[#18345C] text-[#F1F5FF] hover:text-[#00C8F5] hover:border-[#00C8F5] transition-all rounded-full flex items-center gap-1.5 font-mono shadow-subtle shrink-0"
                title="Open Studio Configuration Dialog"
              >
                <Settings size={12} className="text-[#00C8F5]" />
                <span>Config Step {currentStep}</span>
              </button>

              <div className="flex items-center gap-1.5 text-xs text-[#91A4C5] font-mono shrink-0 pl-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isAutosaving
                      ? 'bg-[#FFB84D] animate-ping'
                      : 'bg-[#00D6A0] shadow-[0_0_8px_#00D6A0]'
                  }`}
                />
                <span>{isAutosaving ? 'Saving...' : 'Autosaved'}</span>
              </div>
            </div>
          </div>

          {/* Thin Progress Track under the Stepper Bar */}
          <div className="w-full h-1 bg-[#0A1933] rounded-full overflow-hidden mt-3 border border-[#18345C]/40">
            <div
              className="h-full bg-gradient-to-r from-[#087BFF] to-[#00C8F5] rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(0,200,245,0.4)]"
              style={{ width: `${(currentStep / 7) * 100}%` }}
            />
          </div>

          {/* Validation Warning Notice */}
          {validationError && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-[#FFB84D]/10 border border-[#FFB84D]/30 flex items-center justify-between text-xs text-[#FFB84D]">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} className="text-[#FFB84D] shrink-0" />
                <span>{validationError}</span>
              </div>
              <button
                onClick={() => setValidationError(null)}
                className="text-[#FFB84D] hover:text-white font-bold ml-3"
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
                  onOpenCharactersConfig={() => setIsCharactersModalOpen(true)}
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
          <div className="h-16 px-6 border-t border-[#18345C] bg-[#07122A] flex items-center justify-between shrink-0 select-none">
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
                icon={<Save size={14} className="text-[#00C8F5]" />}
                onClick={() => {
                  handleUpdateActiveProject({});
                  addToast({ type: 'success', title: 'Project Draft Saved' });
                }}
              >
                Save Draft
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs text-[#91A4C5] font-mono">
                Step <span className="text-[#00C8F5] font-bold">{currentStep}</span> of 7:{' '}
                <span className="text-[#F1F5FF] font-semibold">
                  {stepsConfig[currentStep - 1]?.title}
                </span>
              </span>

              {currentStep < 7 ? (
                <Button
                  variant="cyan"
                  size="sm"
                  icon={<ArrowRight size={14} />}
                  onClick={handleGoNext}
                  className="font-bold shadow-[0_0_14px_rgba(0,200,245,0.35)]"
                >
                  Continue to Next Step
                </Button>
              ) : (
                <Button
                  variant="cyan"
                  size="sm"
                  icon={<CheckCircle2 size={14} />}
                  onClick={() => {
                    addToast({
                      type: 'success',
                      title: 'Story Workflow Complete',
                      message: 'Render and export your final story video.',
                    });
                  }}
                  className="font-bold shadow-[0_0_14px_rgba(0,200,245,0.35)]"
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
        isOpen={isInspectorPanelOpen}
        onToggle={() => setIsInspectorPanelOpen(!isInspectorPanelOpen)}
      />

      {/* Step Quick Configuration Modal */}
      {quickConfigStep !== null && activeProject && (
        <Modal
          isOpen={quickConfigStep !== null}
          onClose={() => setQuickConfigStep(null)}
          title="Studio Configuration"
          subtitle="Adjust AI parameters, story hooks, prompts, and audio presets across all workflow steps"
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
                Go to Step {quickConfigStep} in Workspace
              </Button>
              <Button variant="primary" size="sm" onClick={() => setQuickConfigStep(null)}>
                Done
              </Button>
            </div>
          }
        >
          {/* Step Selector Tabs inside Modal - All in One Friendly Dialog */}
          <div className="flex items-center gap-1.5 p-1.5 bg-[#050B1D] rounded-2xl border border-[#18345C] mb-4 overflow-x-auto scrollbar-none">
            {stepsConfig.map((s) => (
              <button
                key={s.num}
                onClick={() => setQuickConfigStep(s.num)}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-medium transition-all text-center truncate ${
                  quickConfigStep === s.num
                    ? 'bg-[#00C8F5] text-[#050B1D] font-bold shadow-[0_0_10px_rgba(0,200,245,0.4)]'
                    : 'text-[#91A4C5] hover:text-[#F1F5FF] hover:bg-[#0A1933]'
                }`}
              >
                {s.num}. {s.title}
              </button>
            ))}
          </div>

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
                      onChange={(e) => handleUpdateActiveProject({ targetDuration: parseInt(e.target.value) || 30 })}
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

      {/* AI Characters Studio & Configuration Popup Modal */}
      <Modal
        isOpen={isCharactersModalOpen}
        onClose={() => setIsCharactersModalOpen(false)}
        title="AI Characters Configuration"
        subtitle="Manage persistent AI characters, generate keyframe angles, upload reference photos, and lock visual continuity"
        maxWidth="3xl"
        noPadding
      >
        <CharactersView
          isModal={true}
          onClose={() => setIsCharactersModalOpen(false)}
          onCharactersChange={async () => {
            await loadStudioData(activeProject?.id);
          }}
          onSelectCharacterForProject={async (char) => {
            if (activeProject) {
              await handleToggleCharacter(char.id);
            }
          }}
          selectedCharacterIds={activeProject?.selectedCharacterIds || []}
          activeProjectId={activeProject?.id}
        />
      </Modal>
    </div>
  );
};
