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
  Users,
  Plus,
  Lock,
  Unlock,
  Upload,
  Image as ImageIcon,
  Trash2,
  Edit,
  Sparkles,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import { Character, CharacterReference } from '../../../shared/types';

export const CharactersView: React.FC = () => {
  const { addToast } = useAppStore();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState<string | null>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [creationSource, setCreationSource] = useState<'ai' | 'upload'>('ai');
  const [uploadedPhotoPath, setUploadedPhotoPath] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    description: '',
    appearance: '',
    clothing: '',
    ageRange: '20-30',
    personality: '',
    voice: 'en-US-Standard-A',
    visualStyle: 'Photorealistic Cinematic 8k',
    isLocked: false,
  });

  const fetchCharacters = async () => {
    if (window.api) {
      const list = await window.api.getCharacters();
      setCharacters(list);
      if (selectedCharacter) {
        const updated = list.find((c) => c.id === selectedCharacter.id);
        if (updated) setSelectedCharacter(updated);
      }
    }
  };

  useEffect(() => {
    fetchCharacters();
  }, []);

  const handleOpenCreate = (source: 'ai' | 'upload' = 'ai') => {
    setForm({
      name: '',
      description: 'Protagonist for video series',
      appearance: 'Athletic build, sleek dark hair, expressive amber eyes, distinct jawline',
      clothing: 'Modern street wear, oversized charcoal bomber jacket, silver necklace',
      ageRange: '24-28',
      personality: 'Determined, sharp, secretive, quick-witted',
      voice: 'en-US-Standard-C',
      visualStyle: 'Photorealistic Cinematic 8k, Unreal Engine 5 aesthetic, volumetric lighting',
      isLocked: true,
    });
    setCreationSource(source);
    setUploadedPhotoPath(null);
    setIsEditing(false);
    setIsCreateModalOpen(true);
  };

  const handleDirectUploadCharacter = async () => {
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
          personality: 'Bold, expressive, determined',
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

        addToast({
          type: 'success',
          title: 'Character Photo Uploaded',
          message: `Created "${cleanName}" with primary keyframe photo attached. Ready to use.`,
        });
        await fetchCharacters();
        setSelectedCharacter(created);
      } catch (err: any) {
        addToast({ type: 'error', title: 'Upload Failed', message: err.message });
      }
    }
  };

  const handlePickPhotoForModal = async () => {
    if (!window.api) return;
    const file = await window.api.openFileDialog(['png', 'jpg', 'jpeg', 'webp']);
    if (file) {
      setUploadedPhotoPath(file);
      if (!form.name.trim()) {
        const base = file.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || 'Custom Protagonist';
        setForm((prev) => ({ ...prev, name: base.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));
      }
    }
  };

  const handleSaveCharacter = async () => {
    if (!form.name.trim()) {
      addToast({ type: 'warn', title: 'Character name required' });
      return;
    }

    if (window.api) {
      if (isEditing && selectedCharacter) {
        await window.api.updateCharacter(selectedCharacter.id, form);
        if (uploadedPhotoPath) {
          await window.api.addCharacterReference(
            selectedCharacter.id,
            uploadedPhotoPath,
            'Uploaded reference portrait',
            true
          );
        }
        addToast({ type: 'success', title: 'Character Updated' });
      } else {
        const created = await window.api.createCharacter(form);
        addToast({ type: 'success', title: 'Character Created', message: created.name });

        if (uploadedPhotoPath) {
          await window.api.addCharacterReference(
            created.id,
            uploadedPhotoPath,
            'Uploaded reference photo',
            true
          );
        } else {
          // Auto-generate AI photo so character is immediately ready to use
          setIsGeneratingPhoto(created.id);
          try {
            await window.api.generateCharacterPhoto(created.id, 'front');
            addToast({
              type: 'success',
              title: 'AI Photo Generated',
              message: 'Front portrait generated. Character is ready to use.',
            });
          } catch (err: any) {
            console.warn('Auto photo generation notice:', err.message);
          } finally {
            setIsGeneratingPhoto(null);
          }
        }
        setSelectedCharacter(created);
      }
      setIsCreateModalOpen(false);
      fetchCharacters();
    }
  };

  const handleGeneratePhoto = async (
    charId: string,
    angle: 'front' | 'three_quarter' | 'profile' | 'full_body' = 'front'
  ) => {
    if (!window.api) return;
    setIsGeneratingPhoto(charId);
    setPhotoMenuOpen(false);
    try {
      await window.api.generateCharacterPhoto(charId, angle);
      await fetchCharacters();
      addToast({
        type: 'success',
        title: 'Character Photo Generated',
        message: `${angle.replace('_', ' ')} keyframe photo saved. Character is ready to use.`,
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
    setPhotoMenuOpen(false);
    try {
      await window.api.generateCharacterSuite(charId);
      await fetchCharacters();
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
    await fetchCharacters();
    addToast({ type: 'success', title: 'Primary Keyframe Photo Set' });
  };

  const handleDeleteReference = async (refId: string) => {
    if (window.confirm('Delete this reference photo?')) {
      if (window.api) {
        await window.api.deleteCharacterReference(refId);
        await fetchCharacters();
        addToast({ type: 'info', title: 'Reference photo deleted' });
      }
    }
  };

  const handleToggleLock = async (char: Character) => {
    if (window.api) {
      await window.api.updateCharacter(char.id, { isLocked: !char.isLocked });
      addToast({
        type: 'info',
        title: char.isLocked ? 'Appearance Unlocked' : 'Appearance Locked',
        message: char.isLocked ? 'Free to edit variations' : 'Locked for strict scene continuity',
      });
      fetchCharacters();
    }
  };

  const handleDelete = async (id: string) => {
    if (window.api && window.confirm('Delete this character profile and its references?')) {
      await window.api.deleteCharacter(id);
      addToast({ type: 'info', title: 'Character Deleted' });
      if (selectedCharacter?.id === id) setSelectedCharacter(null);
      fetchCharacters();
    }
  };

  const handleAddReferenceImage = async (charId: string) => {
    if (window.api) {
      const file = await window.api.openFileDialog(['png', 'jpg', 'jpeg', 'webp']);
      if (file) {
        await window.api.addCharacterReference(
          charId,
          file,
          'Manual uploaded reference portrait',
          selectedCharacter?.references.length === 0
        );
        addToast({ type: 'success', title: 'Reference image added. Character is ready to use.' });
        fetchCharacters();
      }
    }
  };

  return (
    <div className="flex h-full select-none overflow-hidden">
      {/* Left List Column */}
      <div className="w-80 border-r border-studio-800 bg-studio-900/40 flex flex-col shrink-0">
        <div className="p-4 border-b border-studio-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-studio-100 flex items-center gap-2">
              <Users size={16} className="text-brand-400" />
              Characters ({characters.length})
            </h3>
            <p className="text-[11px] text-studio-400">Generate or upload image to use</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="primary" size="sm" icon={<Sparkles size={13} />} onClick={() => handleOpenCreate('ai')} title="Generate to Image">
              Generate
            </Button>
            <Button variant="secondary" size="sm" icon={<Upload size={13} />} onClick={handleDirectUploadCharacter} title="Upload Image">
              Upload
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {characters.length === 0 ? (
            <div className="text-center py-12 px-4 text-xs text-studio-500">
              No character profiles yet. Click "Generate" or "Upload" to create your first consistent AI character.
            </div>
          ) : (
            characters.map((char) => {
              const isSelected = selectedCharacter?.id === char.id;
              const hasImage = Boolean(char.references && char.references.length > 0);
              const primaryRef = char.references.find((r) => r.isPrimary) || char.references[0];

              return (
                <div
                  key={char.id}
                  onClick={() => setSelectedCharacter(char)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? 'bg-brand-500/15 border-brand-500/40 shadow-subtle'
                      : !hasImage
                      ? 'bg-studio-900/60 border-amber-500/30'
                      : 'bg-studio-850 border-studio-800 hover:border-studio-700'
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg bg-studio-950 overflow-hidden shrink-0 border border-studio-750 flex items-center justify-center relative">
                    {primaryRef ? (
                      <img
                        src={`file://${primaryRef.imagePath.replace(/\\/g, '/')}`}
                        alt={char.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users size={20} className="text-studio-600" />
                    )}
                    {char.isLocked && (
                      <div className="absolute bottom-0.5 right-0.5 bg-amber-500 text-black p-0.5 rounded shadow text-[8px]">
                        <Lock size={9} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-studio-100 truncate">{char.name}</h4>
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
                    <p className="text-[11px] text-studio-400 truncate mt-0.5">{char.description || char.appearance}</p>
                    <span className="text-[10px] text-studio-500 font-mono">
                      {hasImage ? `${char.references.length} photo(s)` : '⚠️ Unusable without image'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Detail / Inspector Area */}
      <div className="flex-1 overflow-y-auto p-8">
        {selectedCharacter ? (
          <div className="max-w-4xl space-y-6">
            {/* Header Card */}
            <div className="flex items-start justify-between pb-6 border-b border-studio-800">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-studio-800 border border-studio-700 overflow-hidden flex items-center justify-center shadow-subtle">
                  {selectedCharacter.references[0] ? (
                    <img
                      src={`file://${selectedCharacter.references[0].imagePath.replace(/\\/g, '/')}`}
                      alt={selectedCharacter.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users size={28} className="text-studio-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-studio-100">{selectedCharacter.name}</h2>
                    {selectedCharacter.isLocked ? (
                      <Badge variant="warning" size="sm" dot>
                        Appearance Locked (High Continuity)
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        Unlocked
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-studio-400 mt-1 max-w-xl">
                    {selectedCharacter.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={selectedCharacter.isLocked ? <Unlock size={14} /> : <Lock size={14} />}
                  onClick={() => handleToggleLock(selectedCharacter)}
                >
                  {selectedCharacter.isLocked ? 'Unlock' : 'Lock Appearance'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  icon={<Edit size={14} />}
                  onClick={() => {
                    setForm({
                      name: selectedCharacter.name,
                      description: selectedCharacter.description,
                      appearance: selectedCharacter.appearance,
                      clothing: selectedCharacter.clothing,
                      ageRange: selectedCharacter.ageRange,
                      personality: selectedCharacter.personality,
                      voice: selectedCharacter.voice,
                      visualStyle: selectedCharacter.visualStyle,
                      isLocked: selectedCharacter.isLocked,
                    });
                    setIsEditing(true);
                    setIsCreateModalOpen(true);
                  }}
                >
                  Edit
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  onClick={() => handleDelete(selectedCharacter.id)}
                >
                  Delete
                </Button>
              </div>
            </div>

            {/* Image Required Warning Banner */}
            {selectedCharacter.references.length === 0 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Lock size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-300">
                      Character Cannot Be Used in Story Videos (Image Required)
                    </h4>
                    <p className="text-[11px] text-amber-200/80 mt-0.5">
                      Only characters with a <strong>generated image</strong> or <strong>uploaded image</strong> can be selected in AI Studio. Generate an AI portrait or upload a photo to activate this character.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Sparkles size={13} />}
                    onClick={() => handleGeneratePhoto(selectedCharacter.id, 'front')}
                    disabled={isGeneratingPhoto === selectedCharacter.id}
                  >
                    {isGeneratingPhoto === selectedCharacter.id ? 'Generating...' : 'Generate to Image'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Upload size={13} />}
                    onClick={() => handleAddReferenceImage(selectedCharacter.id)}
                  >
                    Upload Image
                  </Button>
                </div>
              </div>
            )}

            {/* Permanent Appearance & Consistency Specs */}
            <Card title="Character Consistency Profile" subtitle="Strict continuity parameters injected into every story scene">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-studio-900 rounded-lg border border-studio-800">
                  <span className="text-studio-400 block mb-1">Face & Appearance Details</span>
                  <p className="text-studio-200">{selectedCharacter.appearance}</p>
                </div>
                <div className="p-3 bg-studio-900 rounded-lg border border-studio-800">
                  <span className="text-studio-400 block mb-1">Default Clothing & Wardrobe</span>
                  <p className="text-studio-200">{selectedCharacter.clothing}</p>
                </div>
                <div className="p-3 bg-studio-900 rounded-lg border border-studio-800">
                  <span className="text-studio-400 block mb-1">Personality & Tone</span>
                  <p className="text-studio-200">{selectedCharacter.personality}</p>
                </div>
                <div className="p-3 bg-studio-900 rounded-lg border border-studio-800">
                  <span className="text-studio-400 block mb-1">Visual Rendering Style</span>
                  <p className="text-studio-200">{selectedCharacter.visualStyle}</p>
                </div>
              </div>
            </Card>

            {/* Reference Images Gallery */}
            <Card
              title={`Reference Images (${selectedCharacter.references.length})`}
              subtitle="Multiple multi-angle reference photos used in Flow AI scene prompts"
              action={
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Sparkles size={13} />}
                      onClick={() => setPhotoMenuOpen(!photoMenuOpen)}
                      disabled={isGeneratingPhoto === selectedCharacter.id}
                    >
                      {isGeneratingPhoto === selectedCharacter.id ? 'Generating...' : 'Generate AI Image'}
                    </Button>
                    {photoMenuOpen && (
                      <div className="absolute right-0 mt-1 w-52 bg-studio-900 border border-studio-750 rounded-xl shadow-xl z-30 p-1.5 space-y-1">
                        <button
                          onClick={() => handleGeneratePhoto(selectedCharacter.id, 'front')}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-studio-800 text-studio-200"
                        >
                          Front Portrait
                        </button>
                        <button
                          onClick={() => handleGeneratePhoto(selectedCharacter.id, 'three_quarter')}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-studio-800 text-studio-200"
                        >
                          Three-Quarter (3/4)
                        </button>
                        <button
                          onClick={() => handleGeneratePhoto(selectedCharacter.id, 'profile')}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-studio-800 text-studio-200"
                        >
                          Side Profile
                        </button>
                        <button
                          onClick={() => handleGeneratePhoto(selectedCharacter.id, 'full_body')}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-studio-800 text-studio-200"
                        >
                          Full Body Shot
                        </button>
                        <div className="border-t border-studio-800 pt-1">
                          <button
                            onClick={() => handleGenerateMultiAngleSuite(selectedCharacter.id)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-brand-300 font-semibold hover:bg-brand-500/10"
                          >
                            Generate Multi-Angle Suite
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Upload size={13} />}
                    onClick={() => handleAddReferenceImage(selectedCharacter.id)}
                  >
                    Upload Image
                  </Button>
                </div>
              }
            >
              {selectedCharacter.references.length === 0 ? (
                <div className="text-center py-8 px-4 bg-studio-900/40 rounded-xl border border-dashed border-studio-800">
                  <div className="w-12 h-12 rounded-xl bg-studio-800 text-studio-400 flex items-center justify-center mx-auto mb-3">
                    <ImageIcon size={24} />
                  </div>
                  <h4 className="text-sm font-semibold text-studio-200">No reference images attached</h4>
                  <p className="text-xs text-studio-400 max-w-md mx-auto mt-1 mb-4">
                    Characters must have an AI-generated portrait or uploaded photo to be used in Story Studio video generation.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Sparkles size={13} />}
                      onClick={() => handleGeneratePhoto(selectedCharacter.id, 'front')}
                      disabled={isGeneratingPhoto === selectedCharacter.id}
                    >
                      Generate to Image
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Upload size={13} />}
                      onClick={() => handleAddReferenceImage(selectedCharacter.id)}
                    >
                      Upload Image
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {selectedCharacter.references.map((ref) => (
                    <div
                      key={ref.id}
                      className="group relative aspect-square bg-studio-950 rounded-xl overflow-hidden border border-studio-800 hover:border-brand-500 transition-all shadow-subtle"
                    >
                      <img
                        src={`file://${ref.imagePath.replace(/\\/g, '/')}`}
                        alt="Character reference"
                        className="w-full h-full object-cover"
                      />
                      {ref.isPrimary && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-brand-500 text-white text-[9px] font-semibold shadow">
                          Primary
                        </span>
                      )}
                      {/* Hover Overlay Actions */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                        {!ref.isPrimary && (
                          <button
                            onClick={() => handleSetPrimaryReference(selectedCharacter.id, ref.id)}
                            className="p-1.5 bg-brand-500/80 hover:bg-brand-500 text-white rounded-lg text-xs"
                            title="Set as Primary Face Reference"
                          >
                            <CheckCircle2 size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteReference(ref.id)}
                          className="p-1.5 bg-rose-500/80 hover:bg-rose-500 text-white rounded-lg text-xs"
                          title="Delete Reference Image"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ) : (
          <EmptyState
            icon={<Users size={32} />}
            title="Select a character to view continuity profile"
            description="Character consistency allows you to produce multi-scene video stories where the protagonist's face, clothing, and style remain identical across every scene."
            actionText="Create New Character"
            onAction={handleOpenCreate}
          />
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={isEditing ? 'Edit Character Profile' : 'Create New AI Character'}
        subtitle="Define persistent appearance guidelines for story scene consistency"
        maxWidth="lg"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveCharacter}>
              {isEditing ? 'Save Changes' : 'Create Character'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <Input
            label="Character Name"
            placeholder="e.g. Maya Lin"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <Input
            label="Short Bio / Role"
            placeholder="e.g. Cyberpunk detective uncoverer"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Age Range"
              placeholder="e.g. 24-28"
              value={form.ageRange}
              onChange={(e) => setForm({ ...form, ageRange: e.target.value })}
            />
            <Input
              label="Personality Traits"
              placeholder="e.g. Inquisitive, bold, cautious"
              value={form.personality}
              onChange={(e) => setForm({ ...form, personality: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-studio-300 mb-1.5">
              Permanent Appearance (Facial details, hair, build)
            </label>
            <textarea
              rows={2}
              className="w-full bg-studio-900 border border-studio-700/80 rounded-lg p-2.5 text-sm text-studio-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={form.appearance}
              onChange={(e) => setForm({ ...form, appearance: e.target.value })}
              placeholder="Detailed physical characteristics..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-studio-300 mb-1.5">
              Wardrobe & Accessories (Continuity clothing)
            </label>
            <textarea
              rows={2}
              className="w-full bg-studio-900 border border-studio-700/80 rounded-lg p-2.5 text-sm text-studio-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={form.clothing}
              onChange={(e) => setForm({ ...form, clothing: e.target.value })}
              placeholder="Specific jackets, colors, jewelry, or signature outfits..."
            />
          </div>

          <Input
            label="Visual Style & Aesthetics"
            value={form.visualStyle}
            onChange={(e) => setForm({ ...form, visualStyle: e.target.value })}
            placeholder="Photorealistic 8k, volumetric lighting, Unreal Engine 5"
          />

          {/* Reference Image Source Selector */}
          <div className="p-3 bg-studio-950 rounded-xl border border-studio-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-studio-200">
                Reference Image Setup <span className="text-rose-400">*</span>
              </label>
              <span className="text-[10px] text-amber-400 font-medium">Required to use character</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCreationSource('ai')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  creationSource === 'ai'
                    ? 'bg-brand-500/15 border-brand-500 text-studio-100'
                    : 'bg-studio-900 border-studio-800 text-studio-400 hover:border-studio-700'
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-xs text-studio-200">
                  <Sparkles size={14} className="text-brand-400" />
                  Generate with AI
                </div>
                <p className="text-[10px] text-studio-400 mt-1">
                  Generates an AI keyframe portrait from the appearance description automatically upon save.
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreationSource('upload');
                  handlePickPhotoForModal();
                }}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  creationSource === 'upload'
                    ? 'bg-brand-500/15 border-brand-500 text-studio-100'
                    : 'bg-studio-900 border-studio-800 text-studio-400 hover:border-studio-700'
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-xs text-studio-200">
                  <Upload size={14} className="text-brand-400" />
                  Upload Image File
                </div>
                <p className="text-[10px] text-studio-400 mt-1">
                  Select a local photo file from disk to attach as the character's primary face keyframe.
                </p>
              </button>
            </div>

            {uploadedPhotoPath && (
              <div className="flex items-center justify-between p-2 bg-studio-900 rounded-lg border border-studio-750 text-xs text-studio-200">
                <div className="flex items-center gap-2 truncate">
                  <img
                    src={`file://${uploadedPhotoPath.replace(/\\/g, '/')}`}
                    alt="Preview"
                    className="w-8 h-8 rounded object-cover border border-studio-700"
                  />
                  <div className="truncate">
                    <span className="truncate text-[11px] font-mono block text-studio-200">
                      {uploadedPhotoPath.split(/[\\/]/).pop()}
                    </span>
                    <span className="text-[9px] text-emerald-400">Photo attached & ready</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handlePickPhotoForModal}>
                  Change
                </Button>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
