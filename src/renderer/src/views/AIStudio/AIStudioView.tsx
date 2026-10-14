import React, { useEffect, useState, useRef } from 'react';
import { Character, Scene, StoryProject } from '../../../../shared/types';
import { useAppStore } from '../../stores/useAppStore';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';

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
        const target = found || activeProject ? pList.find((p) => p.id === activeProject?.id) || pList[0] : pList[0];
        setActiveProject(target);
        if (target.currentStep) {
          setCurrentStep(target.currentStep);
        }
      } else {
        // If no projects exist, initialize default starter project
        const created = await window.api.createProject({
          title: 'The Silent Signal',
          genre: 'mystery',
          aspectRatio: '9:16',
          targetDuration: 60,
          language: 'en',
          voice: 'en-US-Standard-C',
          status: 'draft',
          currentStep: 1,
        });
        setProjects([created]);
        setActiveProject(created);
        setCurrentStep(1);
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
    const created = await window.api.createProject({
      title: data.title || 'Untitled Story',
      genre: data.genre || 'mystery',
      aspectRatio: data.aspectRatio || '9:16',
      targetDuration: data.targetDuration || 60,
      language: 'en',
      voice: 'en-US-Standard-C',
      status: 'draft',
      currentStep: 1,
    });
    setProjects([created, ...projects]);
    setActiveProject(created);
    setCurrentStep(1);
    addToast({ type: 'success', title: 'Project Created', message: created.title });
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.api) return;
    await window.api.deleteProject(id);
    const remaining = projects.filter((p) => p.id !== id);
    setProjects(remaining);
    if (activeProject?.id === id) {
      setActiveProject(remaining[0] || null);
      setCurrentStep(remaining[0]?.currentStep || 1);
    }
    addToast({ type: 'info', title: 'Project Deleted' });
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
                    <button
                      onClick={() => handleStepClick(s.num)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                        isActive
                          ? 'bg-brand-500 text-white shadow-subtle'
                          : isPassed
                          ? 'bg-studio-850 text-studio-200 hover:bg-studio-800 border border-studio-750'
                          : 'bg-studio-900 text-studio-500 hover:text-studio-300 border border-studio-800/80'
                      }`}
                    >
                      <span className={isActive ? 'text-white' : isPassed ? 'text-emerald-400' : 'text-studio-500'}>
                        {isPassed ? <CheckCircle2 size={13} /> : s.icon}
                      </span>
                      <span>
                        {s.num}. {s.title}
                      </span>
                    </button>

                    {idx < stepsConfig.length - 1 && (
                      <div className="w-4 h-0.5 bg-studio-800 shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Autosave Status */}
            <div className="text-[11px] text-studio-500 flex items-center gap-1.5 shrink-0 ml-4 font-mono">
              <span className={`w-2 h-2 rounded-full ${isAutosaving ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              <span>{isAutosaving ? 'Saving Draft...' : 'Autosaved'}</span>
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
            <EmptyState
              icon={<FolderOpen size={36} />}
              title="No project selected"
              description="Open or create a story project from the sidebar to start creating."
              actionText="Create Project"
              onAction={() => handleCreateNewProject({ title: 'New Story Project' })}
            />
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
      />
    </div>
  );
};
