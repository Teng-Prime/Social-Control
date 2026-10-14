import React, { useState } from 'react';
import { StoryProject } from '../../../../shared/types';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Select } from '../../components/common/Select';
import {
  Film,
  Plus,
  Search,
  Clock,
  Sparkles,
  Trash2,
  FolderOpen,
  ChevronRight,
} from 'lucide-react';

interface ProjectSidebarProps {
  projects: StoryProject[];
  activeProject: StoryProject | null;
  onSelectProject: (project: StoryProject) => void;
  onCreateProject: (projectData: Partial<StoryProject>) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  isOpen: boolean;
  onToggle: () => void;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  isOpen,
  onToggle,
}) => {
  const [search, setSearch] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newGenre, setNewGenre] = useState<any>('mystery');
  const [newAspect, setNewAspect] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [newDuration, setNewDuration] = useState(60);

  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.genre.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await onCreateProject({
      title: newTitle.trim(),
      genre: newGenre,
      aspectRatio: newAspect,
      targetDuration: newDuration,
      status: 'draft',
      currentStep: 1,
    });
    setNewTitle('');
    setIsNewModalOpen(false);
  };

  if (!isOpen) {
    return (
      <div className="border-r border-studio-800 bg-studio-900/60 p-2 flex flex-col items-center shrink-0">
        <button
          onClick={onToggle}
          title="Open Projects Panel"
          className="p-2 rounded-xl bg-studio-850 hover:bg-studio-800 text-studio-400 hover:text-brand-400 transition-all border border-studio-750"
        >
          <FolderOpen size={18} />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-72 border-r border-studio-800 bg-studio-900/80 flex flex-col shrink-0 select-none">
      {/* Header */}
      <div className="p-4 border-b border-studio-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film size={18} className="text-brand-400" />
          <h3 className="text-xs font-bold text-studio-100 uppercase tracking-wider">
            Story Projects ({projects.length})
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setIsNewModalOpen(true)}
          >
            New
          </Button>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-studio-800 text-studio-400 hover:text-studio-200"
            title="Collapse Panel"
          >
            <ChevronRight size={16} className="rotate-180" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-studio-800/80">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-studio-500" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-studio-950/80 border border-studio-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-studio-200 placeholder-studio-500 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-10 px-4 text-xs text-studio-500">
            {search ? 'No matching projects found' : 'No story projects yet. Click "+ New" to begin.'}
          </div>
        ) : (
          filteredProjects.map((proj) => {
            const isActive = activeProject?.id === proj.id;
            return (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj)}
                className={`group p-2.5 rounded-xl border transition-all cursor-pointer relative ${
                  isActive
                    ? 'bg-brand-500/15 border-brand-500/40 shadow-subtle'
                    : 'bg-studio-850/60 border-studio-800 hover:border-studio-700 hover:bg-studio-800/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4
                      className={`text-xs font-semibold truncate ${
                        isActive ? 'text-brand-300' : 'text-studio-200'
                      }`}
                    >
                      {proj.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="capitalize text-[10px] text-studio-400 font-medium">
                        {proj.genre}
                      </span>
                      <span className="text-studio-600">•</span>
                      <span className="text-[10px] text-studio-500 font-mono">
                        {proj.scenes?.length || 0} scenes
                      </span>
                      <span className="text-studio-600">•</span>
                      <span className="text-[10px] text-studio-500 font-mono">
                        {proj.aspectRatio}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete story project "${proj.title}"?`)) {
                        onDeleteProject(proj.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-studio-500 hover:text-rose-400 transition-opacity"
                    title="Delete Project"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-studio-800/50 text-[10px] text-studio-500">
                  <span className="capitalize flex items-center gap-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        proj.status === 'exported'
                          ? 'bg-emerald-400'
                          : proj.status === 'review' || proj.status === 'generating'
                          ? 'bg-amber-400'
                          : 'bg-studio-500'
                      }`}
                    />
                    {proj.status}
                  </span>
                  <span>Step {proj.currentStep || 1} of 7</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Project Modal */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Create New Story Project"
        subtitle="Set up your story parameters for AI video production"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsNewModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreate} disabled={!newTitle.trim()}>
              Create Project
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <Input
            label="Story Title"
            placeholder="e.g. Mystery of the Midnight Signal"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Genre"
              value={newGenre}
              onChange={(e) => setNewGenre(e.target.value as any)}
              options={[
                { value: 'mystery', label: 'Mystery & Investigation' },
                { value: 'emotional', label: 'Emotional & Drama' },
                { value: 'comedy', label: 'Comedy & Humor' },
                { value: 'romance', label: 'Romance & Relationships' },
                { value: 'horror', label: 'Horror & Suspense' },
                { value: 'adventure', label: 'Adventure & Exploration' },
                { value: 'moral', label: 'Moral & Life Lessons' },
              ]}
            />

            <Select
              label="Aspect Ratio"
              value={newAspect}
              onChange={(e) => setNewAspect(e.target.value as any)}
              options={[
                { value: '9:16', label: 'Vertical (9:16) - TikTok/Reels/Shorts' },
                { value: '16:9', label: 'Landscape (16:9) - YouTube' },
                { value: '1:1', label: 'Square (1:1) - Instagram Post' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-studio-300 mb-1.5">
              Target Duration: <span className="text-brand-400 font-bold">{newDuration} seconds</span>
            </label>
            <input
              type="range"
              min={15}
              max={180}
              step={15}
              value={newDuration}
              onChange={(e) => setNewDuration(parseInt(e.target.value, 10))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-studio-500 mt-1">
              <span>15s (Shorts)</span>
              <span>60s (Standard)</span>
              <span>180s (Deep Story)</span>
            </div>
          </div>
        </div>
      </Modal>
    </aside>
  );
};
