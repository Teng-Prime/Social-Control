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

  const handleOpenCreate = () => {
    setForm({
      name: '',
      description: '',
      appearance: 'Asian female, sleek black hair, dark amber eyes, athletic build',
      clothing: 'Modern street wear, oversized charcoal bomber jacket, silver necklace',
      ageRange: '24-28',
      personality: 'Determined, sharp, secretive, quick-witted',
      voice: 'en-US-Standard-C',
      visualStyle: 'Photorealistic Cinematic 8k, Unreal Engine 5 aesthetic, volumetric lighting',
      isLocked: false,
    });
    setIsEditing(false);
    setIsCreateModalOpen(true);
  };

  const handleSaveCharacter = async () => {
    if (!form.name.trim()) {
      addToast({ type: 'warn', title: 'Character name required' });
      return;
    }

    if (window.api) {
      if (isEditing && selectedCharacter) {
        await window.api.updateCharacter(selectedCharacter.id, form);
        addToast({ type: 'success', title: 'Character Updated' });
      } else {
        const created = await window.api.createCharacter(form);
        addToast({ type: 'success', title: 'Character Created', message: created.name });
        setSelectedCharacter(created);
      }
      setIsCreateModalOpen(false);
      fetchCharacters();
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
        addToast({ type: 'success', title: 'Reference image added' });
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
            <p className="text-[11px] text-studio-400">Reusable AI identities</p>
          </div>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={handleOpenCreate}>
            New
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {characters.length === 0 ? (
            <div className="text-center py-12 px-4 text-xs text-studio-500">
              No character profiles yet. Click "New" to create your first consistent AI character.
            </div>
          ) : (
            characters.map((char) => {
              const isSelected = selectedCharacter?.id === char.id;
              const primaryRef = char.references.find((r) => r.isPrimary) || char.references[0];

              return (
                <div
                  key={char.id}
                  onClick={() => setSelectedCharacter(char)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? 'bg-brand-500/15 border-brand-500/40 shadow-subtle'
                      : 'bg-studio-850 border-studio-800 hover:border-studio-700'
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg bg-studio-950 overflow-hidden shrink-0 border border-studio-750 flex items-center justify-center">
                    {primaryRef ? (
                      <img
                        src={`file://${primaryRef.imagePath.replace(/\\/g, '/')}`}
                        alt={char.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users size={20} className="text-studio-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-studio-100 truncate">{char.name}</h4>
                      {char.isLocked ? (
                        <Lock size={12} className="text-amber-400" title="Locked Continuity" />
                      ) : (
                        <Unlock size={12} className="text-studio-500" />
                      )}
                    </div>
                    <p className="text-[11px] text-studio-400 truncate mt-0.5">{char.description || char.appearance}</p>
                    <span className="text-[10px] text-studio-500 font-mono">
                      {char.references.length} reference photos
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
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Upload size={14} />}
                  onClick={() => handleAddReferenceImage(selectedCharacter.id)}
                >
                  Upload Reference Image
                </Button>
              }
            >
              {selectedCharacter.references.length === 0 ? (
                <EmptyState
                  icon={<ImageIcon size={28} />}
                  title="No reference images"
                  description="Upload front, profile, or portrait reference shots so scene prompts generate the exact same face."
                  actionText="Upload Image"
                  onAction={() => handleAddReferenceImage(selectedCharacter.id)}
                />
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
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-brand-500 text-white text-[9px] font-semibold">
                          Primary
                        </span>
                      )}
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
        </div>
      </Modal>
    </div>
  );
};
