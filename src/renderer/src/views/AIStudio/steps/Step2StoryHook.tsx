import React, { useState } from 'react';
import { Character, StoryGenre, StoryProject } from '../../../../../shared/types';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { Badge } from '../../../components/common/Badge';
import { useAppStore } from '../../../stores/useAppStore';
import {
  Sparkles,
  Wand2,
  Lightbulb,
  RotateCcw,
  Scissors,
  Maximize2,
  FastForward,
  CheckCircle2,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface Step2StoryHookProps {
  project: StoryProject;
  selectedCharacters: Character[];
  onUpdateProject: (updates: Partial<StoryProject>) => Promise<void>;
  onGenerateFullScenes: () => Promise<void>;
}

export const Step2StoryHook: React.FC<Step2StoryHookProps> = ({
  project,
  selectedCharacters,
  onUpdateProject,
  onGenerateFullScenes,
}) => {
  const { addToast } = useAppStore();

  const [isLoadingAction, setIsLoadingAction] = useState<string | null>(null);
  const [storyIdeas, setStoryIdeas] = useState<string[]>([]);
  const [isIdeasOpen, setIsIdeasOpen] = useState(false);

  // Form Fields mapped to project
  const topic = project.storyIdea || '';
  const genre = project.genre || 'mystery';
  const targetAudience = project.targetAudience || 'Young Adults';
  const platform = project.platform || 'tiktok';
  const storyTone = project.storyTone || 'engaging';
  const customInstructions = project.customInstructions || '';
  const hook = project.hook || '';
  const intro = project.intro || '';
  const climax = project.climax || '';
  const ending = project.ending || '';
  const endingHook = project.endingHook || project.ending || '';

  const genrePresets: { value: StoryGenre; label: string; desc: string }[] = [
    { value: 'mystery', label: 'Mystery', desc: 'Curiosity gaps, encrypted clues & hidden secrets' },
    { value: 'emotional', label: 'Emotional', desc: 'Heartfelt human struggles, bonds & redemption' },
    { value: 'drama', label: 'Drama', desc: 'Intense conflict, moral choices & personal stakes' },
    { value: 'comedy', label: 'Comedy', desc: 'Absurd situations, sharp timing & unexpected humor' },
    { value: 'romance', label: 'Romance', desc: 'Chemistry, fateful meetings & emotional connections' },
    { value: 'horror', label: 'Horror', desc: 'Creeping dread, psychological tension & eerie reveals' },
    { value: 'adventure', label: 'Adventure', desc: 'Uncharted terrain, high velocity & epic discovery' },
    { value: 'moral', label: 'Moral Stories', desc: 'Life wisdom, karma & transformative lessons' },
  ];

  // AI Action 1: Generate Story Ideas
  const handleGenerateStoryIdeas = async () => {
    if (!window.api) return;
    setIsLoadingAction('ideas');
    try {
      const charNames = selectedCharacters.map((c) => c.name);
      const ideas = await window.api.generateStoryIdeas(topic, genre, charNames);
      setStoryIdeas(ideas);
      setIsIdeasOpen(true);
      addToast({ type: 'success', title: 'Story Concepts Ready', message: 'Pick one below to auto-fill.' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Idea generation failed', message: e.message });
    } finally {
      setIsLoadingAction(null);
    }
  };

  // AI Action 2: Generate Hook
  const handleGenerateHook = async () => {
    if (!window.api) return;
    setIsLoadingAction('hook');
    try {
      const generatedHook = await window.api.generateHook(topic || `${genre} story`, genre, storyTone);
      await onUpdateProject({ hook: generatedHook });
      addToast({ type: 'success', title: 'Viral Opening Hook Generated' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Hook generation failed', message: e.message });
    } finally {
      setIsLoadingAction(null);
    }
  };

  // AI Action 2b: Generate Ending Hook (Next Video Cliffhanger / Retention)
  const handleGenerateEndingHook = async () => {
    if (!window.api) return;
    setIsLoadingAction('ending_hook');
    try {
      const generated = await window.api.generateNextVideoHook({
        topic: topic || `${genre} story`,
        genre,
        climax,
        hook,
      });
      await onUpdateProject({ endingHook: generated, ending: generated });
      addToast({
        type: 'success',
        title: 'Next Video Cliffhanger Generated',
        message: 'High-retention sequel hook created for Part 2.',
      });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Cliffhanger generation failed', message: e.message });
    } finally {
      setIsLoadingAction(null);
    }
  };

  // AI Action 3: Generate Full Story
  const handleGenerateFullStory = async () => {
    if (!window.api) return;
    setIsLoadingAction('full_story');
    try {
      const story = await window.api.generateFullStory({
        prompt: topic || 'an unexpected discovery that changes everything',
        genre,
        targetDuration: project.targetDuration,
        platform,
        tone: storyTone,
        targetAudience,
        characterIds: selectedCharacters.map((c) => c.id),
        customInstructions,
      });

      await onUpdateProject({
        hook: story.hook,
        intro: story.intro,
        climax: story.climax,
        ending: story.ending,
        status: 'scripted',
      });

      // Clear existing scenes and write new generated scenes with full descriptors
      for (const s of project.scenes) {
        await window.api.deleteScene(s.id);
      }

      for (let i = 0; i < story.scenes.length; i++) {
        const sc = story.scenes[i];
        await window.api.createScene({
          projectId: project.id,
          sceneNumber: i + 1,
          title: sc.title,
          scriptText: sc.scriptText,
          narration: sc.narration,
          generationPrompt: sc.prompt,
          duration: sc.duration,
          visualDescription: sc.visualDescription,
          cameraAngle: sc.cameraAngle,
          lighting: sc.lighting,
          actions: sc.actions,
          environment: sc.environment,
          soundEffectSuggestion: sc.soundEffectSuggestion,
          negativePrompt: sc.negativePrompt,
          characterId: selectedCharacters[0]?.id || undefined,
          referenceImagePath: selectedCharacters[0]?.references[0]?.imagePath || undefined,
          status: 'draft',
        });
      }

      addToast({
        type: 'success',
        title: 'Story & Scenes Generated',
        message: `Created hook, narrative arc, and ${story.scenes.length} cinematic scenes.`,
      });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Story generation failed', message: e.message });
    } finally {
      setIsLoadingAction(null);
    }
  };

  // AI Action: Script Transformations
  const handleTransformScript = async (action: 'rewrite' | 'improve_hook' | 'shorten' | 'expand' | 'continue') => {
    if (!window.api) return;
    setIsLoadingAction(action);
    try {
      const fullScript = `${intro}\n\n${project.scenes.map((s) => s.scriptText).join('\n\n')}\n\n${climax}\n\n${ending}`;
      const res = await window.api.transformStoryScript({
        script: fullScript,
        hook,
        action,
        genre,
      });

      const updates: Partial<StoryProject> = { hook: res.hook };
      if (res.climax) updates.climax = res.climax;
      if (res.ending) updates.ending = res.ending;
      await onUpdateProject(updates);

      addToast({ type: 'success', title: `Script Transformation (${action}) Applied` });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Transformation failed', message: e.message });
    } finally {
      setIsLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex items-center justify-between pb-4 border-b border-studio-800">
        <div>
          <h2 className="text-base font-bold text-studio-100 flex items-center gap-2">
            <Sparkles size={18} className="text-brand-400" />
            Step 2: Story Generator & AI Opening Hook
          </h2>
          <p className="text-xs text-studio-400 mt-0.5">
            Configure topic, genre, platform and tone. Generate and approve a high-retention hook and narrative.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {project.hook ? (
            <Badge variant="success" size="sm" dot>
              Story Approved
            </Badge>
          ) : (
            <Badge variant="warning" size="sm" dot>
              Awaiting Hook & Script
            </Badge>
          )}
        </div>
      </div>

      {/* Selected Protagonist Continuity Alert */}
      <div className="p-3 rounded-xl bg-studio-950/80 border border-studio-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-studio-500 font-medium">Starring Protagonist:</span>
          {selectedCharacters.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="font-bold text-brand-300">
                {selectedCharacters.map((c) => c.name).join(', ')}
              </span>
              <span className="text-[11px] text-studio-400 bg-studio-900 px-2 py-0.5 rounded-full border border-studio-800">
                {selectedCharacters[0].clothing}
              </span>
            </div>
          ) : (
            <span className="text-amber-400 font-medium">
              No character selected. Return to Step 1 to select a protagonist.
            </span>
          )}
        </div>
      </div>

      {/* Inputs Grid */}
      <Card title="Story Parameters" subtitle="Set narrative boundaries and social platform context">
        <div className="space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-studio-300">Story Idea or Premise *</label>
              <button
                onClick={handleGenerateStoryIdeas}
                disabled={isLoadingAction === 'ideas'}
                className="text-[11px] text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
              >
                <Lightbulb size={12} />
                {isLoadingAction === 'ideas' ? 'Generating Ideas...' : 'Suggest Story Ideas'}
              </button>
            </div>
            <textarea
              rows={2}
              value={topic}
              onChange={(e) => onUpdateProject({ storyIdea: e.target.value })}
              placeholder="e.g. An urban explorer discovers a sealed vault beneath an abandoned metro station..."
              className="w-full bg-studio-950 border border-studio-800 rounded-xl p-3 text-xs text-studio-100 placeholder-studio-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Suggested Ideas Drawer */}
          {isIdeasOpen && storyIdeas.length > 0 && (
            <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-brand-300">
                <span>Select a generated concept to populate premise:</span>
                <button
                  onClick={() => setIsIdeasOpen(false)}
                  className="text-studio-400 hover:text-studio-200"
                >
                  Dismiss
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {storyIdeas.map((idea, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onUpdateProject({ storyIdea: idea });
                      setIsIdeasOpen(false);
                      addToast({ type: 'info', title: 'Premise Updated' });
                    }}
                    className="text-left p-2 rounded-lg bg-studio-900/80 hover:bg-studio-850 border border-studio-800 text-[11px] text-studio-200 transition-all hover:border-brand-500"
                  >
                    "{idea}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Genre Presets Selector */}
          <div>
            <label className="block text-xs font-medium text-studio-300 mb-2">
              Genre Preset (Tailors tone, pacing & visual atmosphere)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {genrePresets.map((gp) => {
                const isActive = genre === gp.value;
                return (
                  <button
                    key={gp.value}
                    type="button"
                    onClick={() => onUpdateProject({ genre: gp.value })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'bg-brand-500/20 border-brand-500 shadow-subtle ring-1 ring-brand-500/30'
                        : 'bg-studio-950/60 border-studio-800 hover:border-studio-700'
                    }`}
                  >
                    <span
                      className={`block font-bold text-xs ${
                        isActive ? 'text-brand-300' : 'text-studio-200'
                      }`}
                    >
                      {gp.label}
                    </span>
                    <span className="text-[10px] text-studio-400 line-clamp-1 mt-0.5">
                      {gp.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Audience, Platform, & Tone */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Target Platform"
              value={platform}
              onChange={(e) => onUpdateProject({ platform: e.target.value as any })}
              options={[
                { value: 'tiktok', label: 'TikTok (Fast-Paced Hook)' },
                { value: 'youtube', label: 'YouTube Shorts (1080x1920)' },
                { value: 'facebook', label: 'Facebook Reels (Viral Engagement)' },
              ]}
            />

            <Select
              label="Story Tone"
              value={storyTone}
              onChange={(e) => onUpdateProject({ storyTone: e.target.value })}
              options={[
                { value: 'engaging', label: 'High Energy & Engaging' },
                { value: 'dark', label: 'Dark, Mysterious & Gripping' },
                { value: 'uplifting', label: 'Uplifting & Inspiring' },
                { value: 'humorous', label: 'Witty & Humorous' },
                { value: 'contemplative', label: 'Thought-Provoking' },
              ]}
            />

            <Input
              label="Target Audience"
              value={targetAudience}
              onChange={(e) => onUpdateProject({ targetAudience: e.target.value })}
              placeholder="e.g. Young Adults, Tech Enthusiasts"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-studio-300 mb-1">
              Custom Continuity or Plot Instructions (Optional)
            </label>
            <input
              type="text"
              value={customInstructions}
              onChange={(e) => onUpdateProject({ customInstructions: e.target.value })}
              placeholder="e.g. Must feature a cliffhanger at the end; protagonist never speaks directly to camera"
              className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3 py-2 text-xs text-studio-100 placeholder-studio-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </Card>

      {/* AI Story Action Toolbar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-950/40 via-studio-900 to-studio-900 border border-brand-500/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 size={16} className="text-brand-400" />
            <h3 className="text-xs font-bold text-studio-100 uppercase tracking-wider">
              AI Story Writing Actions
            </h3>
          </div>
          <span className="text-[11px] text-studio-400">
            Click to generate or transform narrative script
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles size={14} />}
            onClick={handleGenerateFullStory}
            disabled={Boolean(isLoadingAction)}
          >
            {isLoadingAction === 'full_story' ? 'Writing Full Story...' : 'Generate Full Story'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Lightbulb size={14} />}
            onClick={handleGenerateHook}
            disabled={Boolean(isLoadingAction)}
          >
            {isLoadingAction === 'hook' ? 'Generating...' : 'Generate Opening Hook'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Sparkles size={14} className="text-amber-400" />}
            onClick={handleGenerateEndingHook}
            disabled={Boolean(isLoadingAction)}
          >
            {isLoadingAction === 'ending_hook' ? 'Generating Cliffhanger...' : 'Generate Part 2 Cliffhanger'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<RotateCcw size={14} />}
            onClick={() => handleTransformScript('rewrite')}
            disabled={Boolean(isLoadingAction)}
          >
            Rewrite Story
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<Sparkles size={14} />}
            onClick={() => handleTransformScript('improve_hook')}
            disabled={Boolean(isLoadingAction)}
          >
            Improve Hook
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<Scissors size={14} />}
            onClick={() => handleTransformScript('shorten')}
            disabled={Boolean(isLoadingAction)}
          >
            Shorten
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<Maximize2 size={14} />}
            onClick={() => handleTransformScript('expand')}
            disabled={Boolean(isLoadingAction)}
          >
            Expand
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<FastForward size={14} />}
            onClick={() => handleTransformScript('continue')}
            disabled={Boolean(isLoadingAction)}
          >
            Continue Story
          </Button>
        </div>
      </div>

      {/* 3 Dedicated Narrative Arc Cards: Opening Hook, Ending Cliffhanger, & Climax */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: 3-Second Viral Opening Hook */}
        <Card
          title="Opening Hook (First 3 Seconds) *"
          subtitle="Captures immediate attention before user scrolls away"
          action={
            <Button
              variant="secondary"
              size="sm"
              icon={<Lightbulb size={12} />}
              onClick={handleGenerateHook}
              disabled={Boolean(isLoadingAction)}
            >
              Suggest Hook
            </Button>
          }
        >
          <div className="space-y-2">
            <textarea
              rows={4}
              value={hook}
              onChange={(e) => onUpdateProject({ hook: e.target.value })}
              placeholder="e.g. Wait until you see what was buried in this archive... You will NOT believe the twist!"
              className="w-full bg-studio-950 border border-studio-800 rounded-xl p-3 text-xs text-brand-300 font-medium placeholder-studio-500 focus:outline-none focus:border-brand-500"
            />
            <div className="flex items-center justify-between text-[10px] text-studio-500">
              <span>Introduces conflict or curiosity gap</span>
              <span>{hook.length} characters</span>
            </div>
          </div>
        </Card>

        {/* Card 2: Ending Hook & Next Video Cliffhanger (Viewer Retention for Part 2) */}
        <Card
          title="Ending Hook & Part 2 Cliffhanger *"
          subtitle="Compels viewer to watch next video (Part 2 / next episode)"
          action={
            <Button
              variant="primary"
              size="sm"
              icon={<Sparkles size={12} />}
              onClick={handleGenerateEndingHook}
              disabled={Boolean(isLoadingAction)}
            >
              {isLoadingAction === 'ending_hook' ? 'Generating...' : 'Generate Cliffhanger'}
            </Button>
          }
        >
          <div className="space-y-2.5">
            <textarea
              rows={4}
              value={endingHook}
              onChange={(e) => onUpdateProject({ endingHook: e.target.value, ending: e.target.value })}
              placeholder="e.g. What they discovered inside the locked chamber will shake everything you believe. Follow now for Part 2 releasing tomorrow!"
              className="w-full bg-studio-950 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 font-medium placeholder-studio-500 focus:outline-none focus:border-amber-400"
            />
            <div className="flex items-center justify-between text-[10px] text-studio-500">
              <span className="text-amber-400/90 font-medium">Leaves suspense for the next video</span>
              <span>{endingHook.length} characters</span>
            </div>

            {/* Quick Cliffhanger Templates */}
            <div className="pt-1 border-t border-studio-800/60">
              <span className="text-[10px] text-studio-400 font-medium block mb-1">
                Quick Part 2 Cliffhanger Templates:
              </span>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateProject({
                      endingHook: `What was uncovered inside changes everything you thought you knew. Part 2 drops tomorrow—follow now so you don't miss the reveal!`,
                      ending: `What was uncovered inside changes everything you thought you knew. Part 2 drops tomorrow—follow now so you don't miss the reveal!`,
                    })
                  }
                  className="px-2 py-0.5 rounded-md bg-studio-900 hover:bg-studio-850 border border-studio-800 text-[10px] text-studio-300"
                >
                  🎬 Part 2 Reveal
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateProject({
                      endingHook: `Did you spot the second figure in the background reflection? Look closer... Part 2 exposes the full footage!`,
                      ending: `Did you spot the second figure in the background reflection? Look closer... Part 2 exposes the full footage!`,
                    })
                  }
                  className="px-2 py-0.5 rounded-md bg-studio-900 hover:bg-studio-850 border border-studio-800 text-[10px] text-studio-300"
                >
                  👁️ Hidden Clue
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateProject({
                      endingHook: `The real danger wasn't outside—it was already in the room. Follow for Part 2 to see what happened next!`,
                      ending: `The real danger wasn't outside—it was already in the room. Follow for Part 2 to see what happened next!`,
                    })
                  }
                  className="px-2 py-0.5 rounded-md bg-studio-900 hover:bg-studio-850 border border-studio-800 text-[10px] text-studio-300"
                >
                  ⚡ Shocking Turn
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateProject({
                      endingHook: `Would you have made the same impossible choice? Drop your thoughts below and subscribe to see the final outcome in Part 2!`,
                      ending: `Would you have made the same impossible choice? Drop your thoughts below and subscribe to see the final outcome in Part 2!`,
                    })
                  }
                  className="px-2 py-0.5 rounded-md bg-studio-900 hover:bg-studio-850 border border-studio-800 text-[10px] text-studio-300"
                >
                  ❓ Viewer Choice
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Card 3: Narrative Arc Climax */}
      <Card
        title="Dramatic Climax & Resolution"
        subtitle="The turning point before the final cliffhanger"
      >
        <div className="space-y-2">
          <textarea
            rows={2}
            value={climax}
            onChange={(e) => onUpdateProject({ climax: e.target.value })}
            placeholder="The decisive turning point where the story reaches maximum tension..."
            className="w-full bg-studio-950 border border-studio-800 rounded-xl p-2.5 text-xs text-studio-100 placeholder-studio-500 focus:outline-none focus:border-brand-500"
          />
          <div className="flex justify-between text-[10px] text-studio-500">
            <span>Resolves initial scene tension before the next video hook triggers</span>
            <span>{climax.length} characters</span>
          </div>
        </div>
      </Card>

      {/* Script Approval Banner */}
      <div className="p-4 rounded-xl bg-studio-850 border border-studio-750 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={18} className={hook ? 'text-emerald-400' : 'text-studio-500'} />
          <div>
            <h4 className="text-xs font-bold text-studio-100">
              {hook ? 'Story & Script Approved' : 'Review & Approve Script'}
            </h4>
            <p className="text-[11px] text-studio-400">
              {hook
                ? 'Your story outline is ready. Next, review and edit scene prompts in Step 3.'
                : 'Click "Generate Full Story" above or write your own hook to approve and continue.'}
            </p>
          </div>
        </div>

        <Button
          variant={hook ? 'success' : 'primary'}
          size="sm"
          disabled={!hook}
          onClick={() => {
            addToast({ type: 'success', title: 'Story Outline Confirmed' });
          }}
        >
          {hook ? 'Approved ✓' : 'Approve Story'}
        </Button>
      </div>
    </div>
  );
};
