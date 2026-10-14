import React, { useState } from 'react';
import { Character, StoryProject } from '../../../../../shared/types';
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
  Image as ImageIcon,
  Sparkles,
  Check,
  CheckCircle2,
  Trash2,
  Edit,
  UserCheck,
  Wand2,
} from 'lucide-react';

interface Step1CharacterProps {
  characters: Character[];
  selectedCharacterIds: string[];
  onToggleCharacter: (charId: string) => void;
  onRefreshCharacters: () => Promise<void>;
  project: StoryProject;
  onUpdateProject: (updates: Partial<StoryProject>) => Promise<void>;
}

export const Step1Character: React.FC<Step1CharacterProps> = ({
  characters,
  selectedCharacterIds,
  onToggleCharacter,
  onRefreshCharacters,
  project,
  onUpdateProject,
}) => {
  const { addToast } = useAppStore();

  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);

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
    isLocked: false,
  });

  const handleOpenNewCharacter = () => {
    setForm({
      name: '',
      description: 'Protagonist for story video series',
      appearance: 'Athletic build, sleek dark hair, expressive amber eyes, distinct jawline',
      clothing: 'Modern charcoal bomber jacket, dark utility pants, minimalist silver pendant',
      ageRange: '25-30',
      personality: 'Curious, determined, strategic, quiet intensity',
      voice: 'en-US-Standard-C',
      visualStyle: 'Photorealistic Cinematic 8k, volumetric lighting, Unreal Engine 5 aesthetic',
      isLocked: false,
    });
    setEditingCharacter(null);
    setMode('create');
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
          addToast({ type: 'success', title: 'Character Profile Updated', message: form.name });
        } else {
          const created = await window.api.createCharacter(form);
          addToast({ type: 'success', title: 'Character Created', message: created.name });
          // Automatically select newly created character
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

  const handleToggleLock = async (char: Character) => {
    if (window.api) {
      await window.api.updateCharacter(char.id, { isLocked: !char.isLocked });
      addToast({
        type: 'info',
        title: char.isLocked ? 'Appearance Unlocked' : 'Appearance Locked',
        message: char.isLocked ? 'Free to edit variations' : 'Locked for strict continuity',
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
    if (window.api) {
      const file = await window.api.openFileDialog(['png', 'jpg', 'jpeg', 'webp']);
      if (file) {
        await window.api.addCharacterReference(
          charId,
          file,
          'Manual uploaded reference portrait for continuity',
          true
        );
        addToast({ type: 'success', title: 'Reference Photo Attached' });
        await onRefreshCharacters();
      }
    }
  };

  const selectedCharacters = characters.filter((c) => selectedCharacterIds.includes(c.id));

  return (
    <div className="space-y-6">
      {/* Step Header & Mode Switcher */}
      <div className="flex items-center justify-between pb-4 border-b border-studio-800">
        <div>
          <h2 className="text-base font-bold text-studio-100 flex items-center gap-2">
            <Users size={18} className="text-brand-400" />
            Step 1: Choose Story Characters & Protagonists
          </h2>
          <p className="text-xs text-studio-400 mt-0.5">
            Select one or more consistent AI identities to feature in this story video.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-studio-950 p-1 rounded-xl border border-studio-800 flex items-center gap-1">
            <button
              onClick={() => setMode('select')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'select'
                  ? 'bg-brand-500 text-white shadow-subtle'
                  : 'text-studio-400 hover:text-studio-200'
              }`}
            >
              Select Saved ({characters.length})
            </button>
            <button
              onClick={handleOpenNewCharacter}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                mode === 'create'
                  ? 'bg-brand-500 text-white shadow-subtle'
                  : 'text-studio-400 hover:text-studio-200'
              }`}
            >
              <Plus size={13} />
              Create New
            </button>
          </div>
        </div>
      </div>

      {/* Selected Status Bar */}
      <div className="p-3.5 rounded-xl bg-studio-850/70 border border-studio-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
            <UserCheck size={16} />
          </div>
          <div>
            <span className="text-xs font-semibold text-studio-200 block">
              {selectedCharacters.length === 0
                ? 'No character selected yet'
                : `${selectedCharacters.length} Character${selectedCharacters.length > 1 ? 's' : ''} Selected for Story`}
            </span>
            <span className="text-[11px] text-studio-400">
              {selectedCharacters.length === 0
                ? 'Click on a character card below to assign as protagonist.'
                : selectedCharacters.map((c) => c.name).join(', ')}
            </span>
          </div>
        </div>

        {selectedCharacters.length > 0 && (
          <Badge variant="success" size="sm" dot>
            Continuity Assigned
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
              description="Create your first reusable AI protagonist with consistent facial features, clothing, and visual style."
              actionText="Create New Character"
              onAction={handleOpenNewCharacter}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {characters.map((char) => {
                const isSelected = selectedCharacterIds.includes(char.id);
                const primaryRef = char.references.find((r) => r.isPrimary) || char.references[0];

                return (
                  <div
                    key={char.id}
                    onClick={() => onToggleCharacter(char.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                      isSelected
                        ? 'bg-brand-500/15 border-brand-500 shadow-glow-brand ring-1 ring-brand-500/30'
                        : 'bg-studio-850/80 border-studio-800 hover:border-studio-700 hover:bg-studio-800/60'
                    }`}
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-xl bg-studio-950 border border-studio-750 overflow-hidden shrink-0 flex items-center justify-center relative shadow-subtle">
                            {primaryRef ? (
                              <img
                                src={`file://${primaryRef.imagePath.replace(/\\/g, '/')}`}
                                alt={char.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Users size={24} className="text-studio-600" />
                            )}
                            {char.isLocked && (
                              <div className="absolute bottom-1 right-1 bg-amber-500 text-black p-0.5 rounded shadow">
                                <Lock size={10} />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-studio-100 truncate">{char.name}</h3>
                            <p className="text-[11px] text-studio-400 line-clamp-1 mt-0.5">
                              {char.description || char.appearance}
                            </p>
                            <span className="text-[10px] text-studio-500 font-mono mt-1 block">
                              {char.references.length} reference photos
                            </span>
                          </div>
                        </div>

                        {/* Checkbox indicator */}
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-brand-500 text-white shadow-subtle'
                              : 'bg-studio-800/80 border border-studio-700 text-transparent group-hover:text-studio-400'
                          }`}
                        >
                          <Check size={14} className={isSelected ? 'opacity-100' : 'opacity-0'} />
                        </div>
                      </div>

                      {/* Continuity Tags */}
                      <div className="p-2.5 rounded-xl bg-studio-950/60 border border-studio-800/80 space-y-1 text-[11px] mb-3">
                        <div className="truncate">
                          <span className="text-studio-500">Face: </span>
                          <span className="text-studio-300">{char.appearance}</span>
                        </div>
                        <div className="truncate">
                          <span className="text-studio-500">Clothing: </span>
                          <span className="text-studio-300">{char.clothing}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div
                      className="pt-2 border-t border-studio-800/60 flex items-center justify-between"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleUploadReferenceImage(char.id)}
                        className="text-[11px] text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
                      >
                        <Upload size={12} />
                        Add Photo
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleLock(char)}
                          className="p-1 rounded text-studio-400 hover:text-amber-400"
                          title={char.isLocked ? 'Unlock Appearance' : 'Lock Appearance for strict continuity'}
                        >
                          {char.isLocked ? <Lock size={13} className="text-amber-400" /> : <Unlock size={13} />}
                        </button>
                        <button
                          onClick={() => handleOpenEditCharacter(char)}
                          className="p-1 rounded text-studio-400 hover:text-studio-200"
                          title="Edit Profile"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteCharacter(char.id, char.name)}
                          className="p-1 rounded text-studio-500 hover:text-rose-400"
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
          subtitle="Define persistent facial, wardrobe, and style parameters for continuous scene consistency"
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
              <label className="block text-xs font-medium text-studio-300 mb-1.5">
                Permanent Appearance & Facial Details * (Preserved across all scene video prompts)
              </label>
              <textarea
                rows={2}
                className="w-full bg-studio-950 border border-studio-800 rounded-xl p-3 text-xs text-studio-100 placeholder-studio-500 focus:outline-none focus:border-brand-500"
                value={form.appearance}
                onChange={(e) => setForm({ ...form, appearance: e.target.value })}
                placeholder="e.g. Athletic build, sleek dark hair, expressive amber eyes, distinct jawline..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-studio-300 mb-1.5">
                Wardrobe & Clothing Consistency (Keeps protagonist dressed identically across scenes)
              </label>
              <textarea
                rows={2}
                className="w-full bg-studio-950 border border-studio-800 rounded-xl p-3 text-xs text-studio-100 placeholder-studio-500 focus:outline-none focus:border-brand-500"
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

            {/* Lock Continuity & Save Button */}
            <div className="pt-4 border-t border-studio-800 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-studio-300">
                <input
                  type="checkbox"
                  checked={form.isLocked}
                  onChange={(e) => setForm({ ...form, isLocked: e.target.checked })}
                  className="rounded border-studio-700 text-brand-500 focus:ring-brand-500 bg-studio-900"
                />
                <span>Lock appearance details for strict prompt injection</span>
              </label>

              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setMode('select')}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" icon={<Check size={14} />} onClick={handleSaveCharacter}>
                  {editingCharacter ? 'Update Character' : 'Save & Select Character'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
