import React, { useState } from 'react';
import { Character, CharacterReference, StoryProject } from '../../../../../shared/types';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Badge } from '../../../components/common/Badge';
import { EmptyState } from '../../../components/common/EmptyState';
import { Modal } from '../../../components/common/Modal';
import { useAppStore } from '../../../stores/useAppStore';
import {
  Users,
  Plus,
  Lock,
  Unlock,
  Upload,
  Sparkles,
  Check,
  Trash2,
  UserCheck,
  Camera,
  Copy,
  ChevronDown,
  Sliders,
} from 'lucide-react';

interface Step1CharacterProps {
  characters: Character[];
  selectedCharacterIds: string[];
  onToggleCharacter: (charId: string) => void;
  onRefreshCharacters: () => Promise<void>;
  project: StoryProject;
  onUpdateProject: (updates: Partial<StoryProject>) => Promise<void>;
  onOpenCharactersConfig?: () => void;
}

export const Step1Character: React.FC<Step1CharacterProps> = ({
  characters,
  selectedCharacterIds,
  onToggleCharacter,
  onRefreshCharacters,
  project: _project,
  onUpdateProject: _onUpdateProject,
  onOpenCharactersConfig,
}) => {
  const { addToast } = useAppStore();

  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState<string | null>(null);
  const [photoMenuCharId, setPhotoMenuCharId] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<CharacterReference | null>(null);
  const [autoGenerateOnSave, setAutoGenerateOnSave] = useState(true);
  const [creationSource, setCreationSource] = useState<'ai' | 'upload'>('ai');
  const [uploadedPhotoPath, setUploadedPhotoPath] = useState<string | null>(null);

  // Form State for Character Creator
  const [form, setForm] = useState({
    name: '',
    description: '',
    appearance: 'Athletic build, sleek dark hair, expressive amber eyes, distinct jawline',
    clothing: 'Modern charcoal bomber jacket, dark utility pants, minimalist silver pendant',
    ageRange: '25-30',
    personality: 'Curious, determined, strategic, quiet intensity',
    voice: 'en-US-Standard-C',
    visualStyle: 'Photorealistic Cinematic 8k, volumetric lighting, Unreal Engine 5 aesthetic',
    isLocked: true,
  });

  const handleOpenNewCharacter = (source: 'ai' | 'upload' = 'ai') => {
    setForm({
      name: '',
      description: 'Protagonist for story video series',
      appearance: 'Athletic build, sleek dark hair, expressive amber eyes, distinct jawline',
      clothing: 'Modern charcoal bomber jacket, dark utility pants, minimalist silver pendant',
      ageRange: '25-30',
      personality: 'Curious, determined, strategic, quiet intensity',
      voice: 'en-US-Standard-C',
      visualStyle: 'Photorealistic Cinematic 8k, volumetric lighting, Unreal Engine 5 aesthetic',
      isLocked: true,
    });
    setEditingCharacter(null);
    setCreationSource(source);
    setUploadedPhotoPath(null);
    setMode('create');
  };

  const handleDirectUploadNewCharacter = async () => {
    if (!window.api) return;
    const file = await window.api.openFileDialog(['png', 'jpg', 'jpeg', 'webp']);
    if (file) {
      const baseName = file.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || 'Custom Protagonist';
      const cleanName = baseName.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      try {
        const created = await window.api.createCharacter({
          name: cleanName,
          description: 'Uploaded reference character',
          appearance: 'Realistic appearance matching reference photo',
          clothing: 'Custom wardrobe matching reference photo',
          ageRange: '25-30',
          personality: 'Bold, determined, expressive',
          voice: 'en-US-Standard-C',
          visualStyle: 'Photorealistic Cinematic 8k',
          isLocked: true,
        });

        await window.api.addCharacterReference(
          created.id,
          file,
          'Directly uploaded reference keyframe photo',
          true
        );

        await onRefreshCharacters();
        if (!selectedCharacterIds.includes(created.id)) {
          onToggleCharacter(created.id);
        }
        addToast({
          type: 'success',
          title: 'Character Photo Uploaded',
          message: `Created "${cleanName}" with primary keyframe photo attached.`,
        });
      } catch (err: any) {
        addToast({ type: 'error', title: 'Upload Failed', message: err.message });
      }
    }
  };

  const handleSelectUploadedPhotoForForm = async () => {
    if (!window.api) return;
    const file = await window.api.openFileDialog(['png', 'jpg', 'jpeg', 'webp']);
    if (file) {
      setUploadedPhotoPath(file);
      if (!form.name.trim()) {
        const base = file.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || 'Custom Protagonist';
        setForm((prev) => ({ ...prev, name: base.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));
      }
      addToast({ type: 'info', title: 'Reference Photo Selected', message: 'Will attach upon saving.' });
    }
  };

  const handleOpenEditCharacter = (char: Character) => {
    setForm({
      name: char.name,
      description: char.description,
      appearance: char.appearance,
      clothing: char.clothing,
      ageRange: char.ageRange,
      personality: char.personality,
      voice: char.voice,
      visualStyle: char.visualStyle,
      isLocked: char.isLocked,
    });
    setEditingCharacter(char);
    setCreationSource('ai');
    setUploadedPhotoPath(null);
    setMode('create');
  };

  const handleSaveCharacter = async () => {
    if (!form.name.trim()) {
      addToast({ type: 'warn', title: 'Character Name Required', message: 'Please provide a character name.' });
      return;
    }

    try {
      if (window.api) {
        if (editingCharacter) {
          await window.api.updateCharacter(editingCharacter.id, form);
          if (uploadedPhotoPath) {
            await window.api.addCharacterReference(
              editingCharacter.id,
              uploadedPhotoPath,
              'Custom uploaded reference portrait',
              true
            );
          }
          addToast({ type: 'success', title: 'Character Profile Updated', message: form.name });
        } else {
          // A character MUST have an image (Generate to Image or Upload Image)
          if (!uploadedPhotoPath && !autoGenerateOnSave) {
            addToast({
              type: 'warn',
              title: 'Image Required',
              message: 'Characters must have a generated image or uploaded image to be used. Auto-generating AI image.',
            });
          }

          const created = await window.api.createCharacter(form);
          addToast({ type: 'success', title: 'Character Created', message: created.name });

          if (uploadedPhotoPath) {
            await window.api.addCharacterReference(
              created.id,
              uploadedPhotoPath,
              'Direct uploaded reference photo',
              true
            );
          } else {
            // Auto-generate AI photo so character is immediately usable
            setIsGeneratingPhoto(created.id);
            try {
              await window.api.generateCharacterPhoto(created.id, 'front');
              addToast({
                type: 'success',
                title: 'AI Reference Photo Created',
                message: 'Front portrait generated. Character is now ready to use.',
              });
            } catch (err: any) {
              console.warn('Auto photo generation notice:', err.message);
            } finally {
              setIsGeneratingPhoto(null);
            }
          }

          if (!selectedCharacterIds.includes(created.id)) {
            onToggleCharacter(created.id);
          }
        }
        await onRefreshCharacters();
        setMode('select');
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error Saving Character', message: err.message });
    }
  };

  const handleGeneratePhoto = async (
    charId: string,
    angle: 'front' | 'three_quarter' | 'profile' | 'full_body' = 'front'
  ) => {
    if (!window.api) return;
    setIsGeneratingPhoto(charId);
    setPhotoMenuCharId(null);
    try {
      await window.api.generateCharacterPhoto(charId, angle);
      await onRefreshCharacters();
      addToast({
        type: 'success',
        title: 'Character Photo Generated',
        message: `${angle.replace('_', ' ')} keyframe photo saved.`,
      });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Photo Generation Failed', message: e.message });
    } finally {
      setIsGeneratingPhoto(null);
    }
  };

  const handleGenerateMultiAngleSuite = async (charId: string) => {
    if (!window.api) return;
    setIsGeneratingPhoto(charId);
    setPhotoMenuCharId(null);
    try {
      await window.api.generateCharacterSuite(charId);
      await onRefreshCharacters();
      addToast({
        type: 'success',
        title: 'Multi-Angle Photo Suite Ready',
        message: 'Generated front portrait, 3/4 angle, and side profile photos.',
      });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Photo Suite Failed', message: e.message });
    } finally {
      setIsGeneratingPhoto(null);
    }
  };

  const handleSetPrimaryReference = async (charId: string, refId: string) => {
    if (!window.api) return;
    await window.api.setCharacterPrimaryReference(charId, refId);
    await onRefreshCharacters();
    addToast({ type: 'success', title: 'Primary Keyframe Photo Set' });
  };

  const handleDeleteReference = async (refId: string) => {
    if (window.confirm('Delete this reference photo?')) {
      if (window.api) {
        await window.api.deleteCharacterReference(refId);
        await onRefreshCharacters();
        addToast({ type: 'info', title: 'Reference Photo Deleted' });
        if (previewPhoto?.id === refId) setPreviewPhoto(null);
      }
    }
  };

  const handleCopyPhotoToClipboard = async (imagePath: string) => {
    if (!window.api) return;
    const success = await window.api.copyImageToClipboard(imagePath);
    if (success) {
      addToast({ type: 'success', title: 'Photo Copied to Clipboard', message: 'Ready to paste into video generation tools.' });
    } else {
      addToast({ type: 'info', title: 'File Path Copied' });
      navigator.clipboard.writeText(imagePath);
    }
  };

  const handleToggleLock = async (char: Character) => {
    if (window.api) {
      await window.api.updateCharacter(char.id, { isLocked: !char.isLocked });
      addToast({
        type: 'info',
        title: char.isLocked ? 'Appearance Unlocked' : 'Appearance Locked',
        message: char.isLocked ? 'Free to edit variations' : 'Locked for strict video continuity',
      });
      await onRefreshCharacters();
    }
  };

  const handleDeleteCharacter = async (id: string, name: string) => {
    if (window.confirm(`Delete character "${name}" and all associated reference images?`)) {
      if (window.api) {
        await window.api.deleteCharacter(id);
        addToast({ type: 'info', title: 'Character Deleted' });
        await onRefreshCharacters();
      }
    }
  };

  const handleUploadReferenceImage = async (charId: string) => {
    if (!window.api) return;
    const file = await window.api.openFileDialog(['png', 'jpg', 'jpeg', 'webp', 'svg']);
    if (file) {
      await window.api.addCharacterReference(
        charId,
        file,
        'Manual uploaded reference portrait for video continuity',
        true
      );
      addToast({ type: 'success', title: 'Reference Photo Attached' });
      await onRefreshCharacters();
    }
  };

  const selectedCharacters = characters.filter((c) => selectedCharacterIds.includes(c.id));

  return (
    <div className="space-y-6">
      {/* Step Header & Mode Switcher */}
      <div className="flex items-center justify-between pb-4 border-b border-[#18345C]">
        <div>
          <h2 className="text-base font-bold text-[#F1F5FF] flex items-center gap-2">
            <Users size={18} className="text-[#00C8F5]" />
            Step 1: Character Photo Generation & Consistent Identity
          </h2>
          <p className="text-xs text-[#91A4C5] mt-0.5">
            Only characters with a <strong className="text-[#00C8F5]">generated image</strong> or <strong className="text-[#00C8F5]">uploaded image</strong> can be used for story video generation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCharactersConfig && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Users size={13} className="text-[#00C8F5]" />}
              onClick={onOpenCharactersConfig}
              className="bg-[#0A1933] border border-[#18345C] text-[#F1F5FF] hover:text-white hover:border-[#00C8F5] shadow-subtle rounded-xl"
              title="Open full AI Characters configuration modal"
            >
              AI Characters Config
            </Button>
          )}

          <Button
            variant="cyan"
            size="sm"
            icon={<Sparkles size={13} />}
            onClick={() => handleOpenNewCharacter('ai')}
            className="font-bold shadow-[0_0_12px_rgba(0,200,245,0.3)] rounded-xl"
          >
            Generate to Image
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Upload size={13} className="text-[#00C8F5]" />}
            onClick={handleDirectUploadNewCharacter}
            className="bg-[#0A1933] border border-[#18345C] text-[#F1F5FF] hover:border-[#00C8F5] rounded-xl"
          >
            Upload Image
          </Button>

          <div className="bg-[#07122A] p-1 rounded-xl border border-[#18345C] flex items-center gap-1 ml-2">
            <button
              onClick={() => setMode('select')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'select'
                  ? 'bg-[#00C8F5] text-[#050B1D] font-bold shadow-[0_0_8px_rgba(0,200,245,0.4)]'
                  : 'text-[#91A4C5] hover:text-[#F1F5FF]'
              }`}
            >
              Saved ({characters.length})
            </button>
            <button
              onClick={() => handleOpenNewCharacter('ai')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                mode === 'create'
                  ? 'bg-[#00C8F5] text-[#050B1D] font-bold shadow-[0_0_8px_rgba(0,200,245,0.4)]'
                  : 'text-[#91A4C5] hover:text-[#F1F5FF]'
              }`}
            >
              <Plus size={13} />
              New
            </button>
          </div>
        </div>
      </div>

      {/* Selected Status Bar */}
      <div className="p-4 rounded-2xl bg-[#0A1933] border border-[#18345C] flex items-center justify-between shadow-subtle">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00C8F5]/15 border border-[#00C8F5]/30 text-[#00C8F5] flex items-center justify-center shadow-[0_0_10px_rgba(0,200,245,0.2)]">
            <UserCheck size={18} />
          </div>
          <div>
            <span className="text-xs font-bold text-[#F1F5FF] block">
              {selectedCharacters.length === 0
                ? 'No character selected yet'
                : `${selectedCharacters.length} Protagonist${selectedCharacters.length > 1 ? 's' : ''} Selected for Story`}
            </span>
            <span className="text-[11px] text-[#91A4C5]">
              {selectedCharacters.length === 0
                ? 'Select a character below. Their reference photos will be used to generate the scene videos.'
                : selectedCharacters.map((c) => `${c.name} (${c.references.length} reference photos)`).join(' • ')}
            </span>
          </div>
        </div>

        {selectedCharacters.length > 0 && (
          <Badge variant="success" size="sm" dot>
            Face Consistency Active
          </Badge>
        )}
      </div>

      {/* Mode 1: Select Saved Character Grid */}
      {mode === 'select' && (
        <div>
          {characters.length === 0 ? (
            <EmptyState
              icon={<Users size={32} />}
              title="No AI characters created yet"
              description="Create your first reusable AI protagonist and generate reference photos for video consistency."
              actionText="Create New Character"
              onAction={handleOpenNewCharacter}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {characters.map((char) => {
                const isSelected = selectedCharacterIds.includes(char.id);
                const hasImage = Boolean(char.references && char.references.length > 0);
                const primaryRef = char.references.find((r) => r.isPrimary) || char.references[0];
                const isGeneratingThis = isGeneratingPhoto === char.id;
                const isPhotoMenuOpen = photoMenuCharId === char.id;

                return (
                  <div
                    key={char.id}
                    onClick={() => {
                      if (!hasImage) {
                        addToast({
                          type: 'warn',
                          title: 'Image Required to Use',
                          message: `Cannot use "${char.name}". Only characters with a generated image or uploaded image can be used in story videos.`,
                        });
                        return;
                      }
                      onToggleCharacter(char.id);
                    }}
                    className={`p-4 rounded-2xl border transition-all relative group flex flex-col justify-between ${
                      !hasImage
                        ? 'bg-[#0A1933]/60 border-[#FFB84D]/40'
                        : isSelected
                        ? 'bg-gradient-to-br from-[#087BFF]/20 via-[#0A1933] to-[#0D2040] border-[#00C8F5] shadow-[0_0_16px_rgba(0,200,245,0.3)] ring-1 ring-[#00C8F5]/50 cursor-pointer'
                        : 'bg-[#0A1933] border-[#18345C] hover:border-[#00C8F5]/40 hover:bg-[#0D2040]/70 cursor-pointer'
                    }`}
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          {/* Large Primary Portrait Photo */}
                          <div
                            onClick={(e) => {
                              if (primaryRef) {
                                e.stopPropagation();
                                setPreviewPhoto(primaryRef);
                              }
                            }}
                            className="w-16 h-16 rounded-xl bg-[#050B1D] border border-[#18345C] overflow-hidden shrink-0 flex items-center justify-center relative shadow-subtle hover:scale-105 transition-transform"
                            title="Click to preview full reference photo"
                          >
                            {primaryRef ? (
                              <img
                                src={`file://${primaryRef.imagePath.replace(/\\/g, '/')}`}
                                alt={char.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Users size={26} className="text-[#546F96]" />
                            )}
                            {char.isLocked && (
                              <div className="absolute bottom-1 right-1 bg-[#FFB84D] text-[#050B1D] p-0.5 rounded shadow">
                                <Lock size={10} />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-[#F1F5FF] truncate">{char.name}</h3>
                              {hasImage ? (
                                <Badge variant="success" size="sm" dot>
                                  Ready
                                </Badge>
                              ) : (
                                <Badge variant="warning" size="sm" dot>
                                  Needs Image
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-[#91A4C5] line-clamp-1 mt-0.5">
                              {char.description || char.appearance}
                            </p>
                            <span className="text-[10px] text-[#00C8F5] font-mono mt-1 block font-bold">
                              {hasImage
                                ? `${char.references.length} Keyframe Photo${char.references.length === 1 ? '' : 's'}`
                                : '⚠️ Unusable (No Image)'}
                            </span>
                          </div>
                        </div>

                        {/* Checkbox / Lock indicator */}
                        {hasImage ? (
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-[#00C8F5] text-[#050B1D] font-bold shadow-[0_0_8px_rgba(0,200,245,0.4)]'
                                : 'bg-[#050B1D] border border-[#18345C] text-transparent group-hover:text-[#91A4C5]'
                            }`}
                          >
                            <Check size={14} className={isSelected ? 'opacity-100 stroke-[3]' : 'opacity-0'} />
                          </div>
                        ) : (
                          <div
                            className="w-6 h-6 rounded-lg bg-[#FFB84D]/10 border border-[#FFB84D]/30 text-[#FFB84D] flex items-center justify-center"
                            title="Only characters with a generated image or uploaded image can be used"
                          >
                            <Lock size={12} />
                          </div>
                        )}
                      </div>

                      {/* Reference Photos Gallery Strip */}
                      <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                        {hasImage ? (
                          <>
                            <div className="flex items-center justify-between text-[10px] text-[#91A4C5] mb-1">
                              <span className="font-semibold uppercase font-mono">Reference Photos (For Video):</span>
                              <span className="text-[#546F96]">Click photo to set Primary</span>
                            </div>
                            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                              {char.references.map((ref) => {
                                const isRefPrimary = ref.isPrimary;
                                return (
                                  <div
                                    key={ref.id}
                                    onClick={() => handleSetPrimaryReference(char.id, ref.id)}
                                    className={`w-11 h-11 rounded-lg overflow-hidden shrink-0 border relative cursor-pointer hover:border-[#00C8F5] transition-all ${
                                      isRefPrimary
                                        ? 'border-[#00C8F5] ring-2 ring-[#00C8F5]/40 shadow-[0_0_8px_rgba(0,200,245,0.3)]'
                                        : 'border-[#18345C] opacity-80 hover:opacity-100 bg-[#050B1D]'
                                    }`}
                                    title={isRefPrimary ? 'Primary Reference Keyframe' : 'Click to make Primary Reference'}
                                  >
                                    <img
                                      src={`file://${ref.imagePath.replace(/\\/g, '/')}`}
                                      alt="Reference"
                                      className="w-full h-full object-cover"
                                    />
                                    {isRefPrimary && (
                                      <span className="absolute bottom-0 inset-x-0 bg-[#00C8F5] text-[#050B1D] text-[8px] font-bold text-center py-0.2">
                                        KEY
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          /* Prompt box when character has no image */
                          <div className="p-3 rounded-xl bg-[#FFB84D]/10 border border-[#FFB84D]/30 text-center space-y-1.5">
                            <span className="text-[11px] font-bold text-[#FFB84D] block">
                              ⚠️ Cannot Use — Image Required
                            </span>
                            <p className="text-[10px] text-[#91A4C5] leading-tight">
                              Generate to image or upload image to activate this character.
                            </p>
                            <div className="flex items-center justify-center gap-2 pt-1">
                              <button
                                onClick={() => handleGeneratePhoto(char.id, 'front')}
                                disabled={isGeneratingThis}
                                className="px-2.5 py-1 rounded-lg bg-[#00C8F5] hover:bg-[#087BFF] text-[#050B1D] hover:text-white text-[10px] font-bold inline-flex items-center gap-1 shadow-subtle transition-colors"
                              >
                                <Sparkles size={11} />
                                {isGeneratingThis ? 'Generating...' : 'Generate to Image'}
                              </button>
                              <button
                                onClick={() => handleUploadReferenceImage(char.id)}
                                className="px-2.5 py-1 rounded-lg bg-[#0A1933] hover:bg-[#0D2040] text-[#F1F5FF] border border-[#18345C] text-[10px] font-bold inline-flex items-center gap-1 shadow-subtle transition-colors"
                              >
                                <Upload size={11} className="text-[#00C8F5]" />
                                <span>Upload Image</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Continuity Tags */}
                      <div className="p-2.5 rounded-xl bg-[#050B1D] border border-[#18345C] space-y-1 text-[11px] mb-3">
                        <div className="truncate">
                          <span className="text-[#546F96] font-mono text-[10px] uppercase">Appearance: </span>
                          <span className="text-[#F1F5FF]">{char.appearance}</span>
                        </div>
                        <div className="truncate">
                          <span className="text-[#546F96] font-mono text-[10px] uppercase">Wardrobe: </span>
                          <span className="text-[#F1F5FF]">{char.clothing}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar & Photo Generator Menu */}
                    <div
                      className="pt-2 border-t border-[#18345C] flex items-center justify-between"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Photo Generation Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setPhotoMenuCharId(isPhotoMenuOpen ? null : char.id)}
                          disabled={isGeneratingThis}
                          className="text-[11px] text-[#00C8F5] hover:text-white font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00C8F5]/10 hover:bg-[#00C8F5]/20 border border-[#00C8F5]/30 transition-colors"
                        >
                          <Camera size={12} />
                          {isGeneratingThis ? 'Generating...' : 'Generate Photo'}
                          <ChevronDown size={11} />
                        </button>

                        {/* Angle Selection Dropdown Menu */}
                        {isPhotoMenuOpen && (
                          <div className="absolute left-0 bottom-8 w-56 bg-[#07122A] border border-[#18345C] rounded-xl shadow-2xl p-1.5 z-30 space-y-1 text-left">
                            <span className="text-[10px] text-[#546F96] font-mono px-2 py-0.5 block uppercase">
                              Select Camera Angle:
                            </span>
                            <button
                              onClick={() => handleGeneratePhoto(char.id, 'front')}
                              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#0A1933] text-[11px] text-[#F1F5FF] flex items-center justify-between transition-colors"
                            >
                              <span>📸 Front Portrait</span>
                              <span className="text-[9px] text-[#00C8F5] font-mono">Headshot</span>
                            </button>
                            <button
                              onClick={() => handleGeneratePhoto(char.id, 'three_quarter')}
                              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#0A1933] text-[11px] text-[#F1F5FF] flex items-center justify-between transition-colors"
                            >
                              <span>📐 3/4 Cinematic Angle</span>
                              <span className="text-[9px] text-[#00C8F5] font-mono">Dramatic</span>
                            </button>
                            <button
                              onClick={() => handleGeneratePhoto(char.id, 'profile')}
                              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#0A1933] text-[11px] text-[#F1F5FF] flex items-center justify-between transition-colors"
                            >
                              <span>👤 Side Profile</span>
                              <span className="text-[9px] text-[#00C8F5] font-mono">Silhouette</span>
                            </button>
                            <button
                              onClick={() => handleGeneratePhoto(char.id, 'full_body')}
                              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#0A1933] text-[11px] text-[#F1F5FF] flex items-center justify-between transition-colors"
                            >
                              <span>🧥 Full Wardrobe Shot</span>
                              <span className="text-[9px] text-[#00C8F5] font-mono">Costume</span>
                            </button>
                            <div className="border-t border-[#18345C] my-1" />
                            <button
                              onClick={() => handleGenerateMultiAngleSuite(char.id)}
                              className="w-full text-left px-2 py-1.5 rounded-lg bg-[#087BFF]/20 hover:bg-[#087BFF]/30 text-[11px] font-bold text-[#00C8F5] flex items-center justify-between transition-colors"
                            >
                              <span>✨ Generate All 3 Angles</span>
                              <span className="text-[9px] text-[#00C8F5] font-mono">Full Suite</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* 1. Config Button (btn config) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditCharacter(char);
                          }}
                          className="text-[11px] font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#07122A] hover:bg-[#0A1933] text-[#F1F5FF] border border-[#18345C] hover:border-[#00C8F5] transition-all shadow-subtle"
                          title="Configure Character attributes and visual parameters"
                        >
                          <Sliders size={12} className="text-[#00C8F5]" />
                          <span>Config</span>
                        </button>

                        {/* 2. Upload Photo Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUploadReferenceImage(char.id);
                          }}
                          className="text-[11px] font-medium flex items-center gap-1 px-2 py-1 rounded-lg bg-[#07122A] hover:bg-[#0A1933] text-[#91A4C5] hover:text-white border border-[#18345C] transition-all"
                          title="Upload Character Reference Photo directly"
                        >
                          <Upload size={12} className="text-[#00C8F5]" />
                          <span>Upload Photo</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleLock(char)}
                          className="p-1 rounded text-[#91A4C5] hover:text-[#FFB84D] transition-colors"
                          title={char.isLocked ? 'Unlock Appearance' : 'Lock Appearance for strict video continuity'}
                        >
                          {char.isLocked ? <Lock size={13} className="text-[#FFB84D]" /> : <Unlock size={13} />}
                        </button>
                        <button
                          onClick={() => handleDeleteCharacter(char.id, char.name)}
                          className="p-1 rounded text-[#91A4C5] hover:text-[#FF5D73] transition-colors"
                          title="Delete Character"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Mode 2: In-Studio Character Creator */}
      {mode === 'create' && (
        <Card
          title={editingCharacter ? `Edit Character: ${editingCharacter.name}` : 'Create New AI Character'}
          subtitle="Define persistent appearance details and auto-generate reference photos for video consistency"
          action={
            <Button variant="secondary" size="sm" onClick={() => setMode('select')}>
              Back to Selection
            </Button>
          }
        >
          <div className="space-y-4 max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Character Name *"
                placeholder="e.g. Maya Lin"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />

              <Input
                label="Role / Short Bio"
                placeholder="e.g. Cyberpunk detective & tech specialist"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Age Range"
                placeholder="e.g. 25-30"
                value={form.ageRange}
                onChange={(e) => setForm({ ...form, ageRange: e.target.value })}
              />

              <Input
                label="Personality & Demeanor"
                placeholder="e.g. Resolute, inquisitive, bold"
                value={form.personality}
                onChange={(e) => setForm({ ...form, personality: e.target.value })}
              />

              <Input
                label="Voice Preference"
                value={form.voice}
                onChange={(e) => setForm({ ...form, voice: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F1F5FF] mb-1.5">
                Permanent Appearance & Facial Details * (Used to generate reference photos and scene prompts)
              </label>
              <textarea
                rows={2}
                className="w-full bg-[#050B1D] border border-[#18345C] rounded-xl p-3 text-xs text-[#F1F5FF] placeholder-[#546F96] focus:outline-none focus:border-[#00C8F5] transition-all"
                value={form.appearance}
                onChange={(e) => setForm({ ...form, appearance: e.target.value })}
                placeholder="e.g. Athletic build, sleek dark hair, expressive amber eyes, distinct jawline..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F1F5FF] mb-1.5">
                Wardrobe & Clothing Consistency (Dresses protagonist identically across video scenes)
              </label>
              <textarea
                rows={2}
                className="w-full bg-[#050B1D] border border-[#18345C] rounded-xl p-3 text-xs text-[#F1F5FF] placeholder-[#546F96] focus:outline-none focus:border-[#00C8F5] transition-all"
                value={form.clothing}
                onChange={(e) => setForm({ ...form, clothing: e.target.value })}
                placeholder="e.g. Modern charcoal bomber jacket, dark utility cargo pants, silver pendant..."
              />
            </div>

            <Input
              label="Visual Style & Aesthetics"
              placeholder="e.g. Photorealistic Cinematic 8k, volumetric lighting, Unreal Engine 5 aesthetic"
              value={form.visualStyle}
              onChange={(e) => setForm({ ...form, visualStyle: e.target.value })}
            />

            {/* Reference Photo Sourcing: Generate AI or Upload */}
            <div className="p-4 bg-[#050B1D] border border-[#18345C] rounded-2xl space-y-3">
              <span className="text-xs font-bold text-[#F1F5FF] block uppercase tracking-wider font-mono">
                Keyframe Reference Photo Source
              </span>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCreationSource('ai');
                    setUploadedPhotoPath(null);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    creationSource === 'ai' && !uploadedPhotoPath
                      ? 'bg-[#087BFF]/20 border-[#00C8F5] text-[#F1F5FF] shadow-[0_0_12px_rgba(0,200,245,0.25)]'
                      : 'bg-[#0A1933] border-[#18345C] text-[#91A4C5] hover:text-[#F1F5FF]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={15} className="text-[#00C8F5]" />
                    <span className="font-bold text-xs text-[#F1F5FF]">Generate with AI</span>
                  </div>
                  <span className="text-[10px] block text-[#91A4C5]">
                    Auto-synthesizes high-resolution keyframe portrait matching facial prompt details
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCreationSource('upload');
                    handleSelectUploadedPhotoForForm();
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    creationSource === 'upload' || uploadedPhotoPath
                      ? 'bg-[#087BFF]/20 border-[#00C8F5] text-[#F1F5FF] shadow-[0_0_12px_rgba(0,200,245,0.25)]'
                      : 'bg-[#0A1933] border-[#18345C] text-[#91A4C5] hover:text-[#F1F5FF]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Upload size={15} className="text-[#00C8F5]" />
                    <span className="font-bold text-xs text-[#F1F5FF]">Upload Photo File</span>
                  </div>
                  <span className="text-[10px] block text-[#91A4C5]">
                    Use existing headshot or character art from local computer
                  </span>
                </button>
              </div>

              {uploadedPhotoPath ? (
                <div className="p-3 rounded-xl bg-[#07122A] border border-[#00C8F5]/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={`file://${uploadedPhotoPath.replace(/\\/g, '/')}`}
                      alt="Uploaded Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-[#00C8F5]"
                    />
                    <div>
                      <span className="text-xs font-bold text-[#F1F5FF] block">Photo Attached</span>
                      <span className="text-[10px] text-[#91A4C5] truncate max-w-xs block font-mono">
                        {uploadedPhotoPath}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Upload size={12} className="text-[#00C8F5]" />}
                    onClick={handleSelectUploadedPhotoForForm}
                  >
                    Change
                  </Button>
                </div>
              ) : creationSource === 'ai' && !editingCharacter && (
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#91A4C5] pt-1">
                  <input
                    type="checkbox"
                    checked={autoGenerateOnSave}
                    onChange={(e) => setAutoGenerateOnSave(e.target.checked)}
                    className="rounded border-[#18345C] text-[#00C8F5] bg-[#07122A] focus:ring-[#00C8F5]"
                  />
                  <span>Auto-generate initial AI portrait reference photo upon saving</span>
                </label>
              )}
            </div>

            {/* Lock Continuity & Save Button */}
            <div className="pt-4 border-t border-[#18345C] flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#91A4C5]">
                <input
                  type="checkbox"
                  checked={form.isLocked}
                  onChange={(e) => setForm({ ...form, isLocked: e.target.checked })}
                  className="rounded border-[#18345C] text-[#00C8F5] bg-[#07122A] focus:ring-[#00C8F5]"
                />
                <span>Lock appearance details for strict prompt injection</span>
              </label>

              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setMode('select')}>
                  Cancel
                </Button>
                <Button
                  variant="cyan"
                  size="sm"
                  icon={<Check size={14} />}
                  onClick={handleSaveCharacter}
                  className="font-bold shadow-[0_0_12px_rgba(0,200,245,0.3)]"
                >
                  {editingCharacter ? 'Update Character' : 'Save & Select Character'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Full Photo Preview Modal */}
      {previewPhoto && (
        <Modal
          isOpen={Boolean(previewPhoto)}
          onClose={() => setPreviewPhoto(null)}
          title="Character Reference Photo (Keyframe)"
          subtitle="Use this exact photo as the image input for video generation"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] text-[#546F96] font-mono truncate max-w-xs">
                {previewPhoto.imagePath}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Copy size={13} className="text-[#00C8F5]" />}
                  onClick={() => handleCopyPhotoToClipboard(previewPhoto.imagePath)}
                >
                  Copy Photo
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 size={13} />}
                  onClick={() => handleDeleteReference(previewPhoto.id)}
                >
                  Delete Photo
                </Button>
                <Button variant="cyan" size="sm" onClick={() => setPreviewPhoto(null)}>
                  Done
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="max-h-[500px] bg-[#050B1D] rounded-xl overflow-hidden border border-[#18345C] flex items-center justify-center p-2">
              <img
                src={`file://${previewPhoto.imagePath.replace(/\\/g, '/')}`}
                alt="Full Character Reference"
                className="max-h-[460px] object-contain rounded-lg"
              />
            </div>
            <div className="p-3 bg-[#050B1D] rounded-xl border border-[#18345C] text-[11px] text-[#91A4C5]">
              <strong className="text-[#00C8F5] block mb-1 font-mono uppercase">
                Video Generation Continuity Instruction:
              </strong>
              <p className="text-[#F1F5FF]">{previewPhoto.prompt}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
