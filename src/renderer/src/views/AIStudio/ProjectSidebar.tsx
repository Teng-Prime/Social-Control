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
  Sparkles,
  Trash2,
  FolderOpen,
  ChevronRight,
  ChevronLeft,
  Copy,
  Edit2,
  AlertTriangle,
  Clapperboard,
} from 'lucide-react';

interface ProjectSidebarProps {
  projects: StoryProject[];
  activeProject: StoryProject | null;
  onSelectProject: (project: StoryProject) => void;
  onCreateProject: (projectData: Partial<StoryProject>) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onDuplicateProject?: (project: StoryProject) => Promise<void>;
  onRenameProject?: (id: string, newTitle: string) => Promise<void>;
  isOpen: boolean;
  onToggle: () => void;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onDuplicateProject,
  onRenameProject,
  isOpen,
  onToggle,
}) => {
  const [search, setSearch] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newGenre, setNewGenre] = useState<any>('mystery');
  const [newAspect, setNewAspect] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [newDuration, setNewDuration] = useState(30);

  // Rename modal state
  const [renamingProject, setRenamingProject] = useState<StoryProject | null>(null);
  const [renameTitle, setRenameTitle] = useState('');

  // Delete confirmation modal state
  const [deletingProject, setDeletingProject] = useState<StoryProject | null>(null);

  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.genre.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    const titleToUse = newTitle.trim() || 'New Story Project';
    await onCreateProject({
      title: titleToUse,
      genre: newGenre,
      aspectRatio: newAspect,
      targetDuration: newDuration,
      status: 'draft',
      currentStep: 1,
    });
    setNewTitle('');
    setIsNewModalOpen(false);
  };

  const handleConfirmRename = async () => {
    if (!renamingProject || !renameTitle.trim() || !onRenameProject) return;
    await onRenameProject(renamingProject.id, renameTitle.trim());
    setRenamingProject(null);
    setRenameTitle('');
  };

  const handleConfirmDelete = async () => {
    if (!deletingProject) return;
    await onDeleteProject(deletingProject.id);
    setDeletingProject(null);
  };

  if (!isOpen) {
    return (
      <div className="border-r border-[#18345C] bg-[#07122A] p-2 flex flex-col items-center shrink-0 w-12 select-none justify-between h-full">
        <button
          onClick={onToggle}
          title="Expand Projects Sidebar"
          className="p-2.5 rounded-xl bg-[#0A1933] hover:bg-[#0D2040] text-[#91A4C5] hover:text-[#00C8F5] transition-all border border-[#18345C] hover:border-[#00C8F5]/50 shadow-subtle group"
        >
          <Clapperboard size={18} className="group-hover:scale-110 transition-transform" />
        </button>
        <button
          onClick={onToggle}
          title="Expand Sidebar"
          className="p-2 rounded-lg text-[#91A4C5] hover:text-[#F1F5FF] hover:bg-[#0A1933] transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-80 border-r border-[#18345C] bg-[#07122A] flex flex-col shrink-0 select-none h-full">
      {/* Studio Header & New Project Action */}
      <div className="p-4 border-b border-[#18345C] flex items-center justify-between bg-[#07122A]/90">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#087BFF]/30 to-[#00C8F5]/20 border border-[#00C8F5]/40 flex items-center justify-center text-[#00C8F5] shadow-[0_0_12px_rgba(0,200,245,0.25)]">
            <Film size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#F1F5FF] tracking-wider uppercase font-mono">
              Story Projects
            </h3>
            <span className="text-[10px] text-[#91A4C5] font-mono">
              {projects.length} Total in Library
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="cyan"
            size="sm"
            icon={<Plus size={13} className="stroke-[2.5]" />}
            onClick={() => {
              setNewTitle('New Story Adventure');
              setIsNewModalOpen(true);
            }}
            className="text-xs font-bold shadow-[0_0_12px_rgba(0,200,245,0.3)]"
          >
            New
          </Button>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-[#0A1933] text-[#91A4C5] hover:text-[#F1F5FF] transition-colors border border-transparent hover:border-[#18345C]"
            title="Collapse Sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-[#18345C] bg-[#050B1D]/40">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-[#546F96]" />
          <input
            type="text"
            placeholder="Search story projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0A1933] border border-[#18345C] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#F1F5FF] placeholder-[#546F96] focus:outline-none focus:border-[#00C8F5] focus:ring-1 focus:ring-[#00C8F5]/30 transition-all font-sans"
          />
        </div>
      </div>

      {/* Project Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-10 px-4 text-xs text-[#91A4C5] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0A1933] border border-[#18345C] flex items-center justify-center mx-auto text-[#546F96]">
              <Film size={22} />
            </div>
            <p className="font-medium">
              {search ? 'No projects match your filter' : 'No story projects yet.'}
            </p>
            <Button
              variant="cyan"
              size="sm"
              icon={<Plus size={13} />}
              onClick={() => {
                setNewTitle('New Story Adventure');
                setIsNewModalOpen(true);
              }}
              className="mx-auto"
            >
              Create New Project
            </Button>
          </div>
        ) : (
          filteredProjects.map((proj) => {
            const isActive = activeProject?.id === proj.id;
            return (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj)}
                className={`group p-3 rounded-2xl border transition-all cursor-pointer relative ${
                  isActive
                    ? 'bg-gradient-to-r from-[#087BFF]/20 via-[#0A1933] to-[#0D2040] border-[#00C8F5] shadow-[0_0_16px_rgba(0,200,245,0.25)] ring-1 ring-[#00C8F5]/40'
                    : 'bg-[#0A1933] border-[#18345C] hover:border-[#18345C]/90 hover:bg-[#0D2040]/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4
                      className={`text-xs font-bold truncate leading-tight ${
                        isActive ? 'text-[#00C8F5]' : 'text-[#F1F5FF] group-hover:text-white'
                      }`}
                    >
                      {proj.title}
                    </h4>

                    {/* Metadata chips */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="capitalize text-[10px] px-1.5 py-0.5 rounded-md bg-[#07122A] border border-[#18345C] text-[#91A4C5] font-mono font-medium">
                        {proj.genre}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#07122A] border border-[#18345C] text-[#91A4C5] font-mono">
                        {proj.scenes?.length || 0} scenes
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#07122A] border border-[#18345C] text-[#91A4C5] font-mono">
                        {proj.aspectRatio}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#07122A] border border-[#18345C] text-[#00C8F5] font-mono font-bold">
                        {proj.targetDuration}s
                      </span>
                    </div>
                  </div>

                  {/* Hover Actions (Duplicate, Rename, Delete) */}
                  <div
                    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onDuplicateProject && (
                      <button
                        onClick={() => onDuplicateProject(proj)}
                        className="p-1 rounded-lg text-[#91A4C5] hover:text-[#00C8F5] hover:bg-[#07122A] transition-colors"
                        title="Duplicate Project"
                      >
                        <Copy size={12} />
                      </button>
                    )}
                    {onRenameProject && (
                      <button
                        onClick={() => {
                          setRenamingProject(proj);
                          setRenameTitle(proj.title);
                        }}
                        className="p-1 rounded-lg text-[#91A4C5] hover:text-[#00C8F5] hover:bg-[#07122A] transition-colors"
                        title="Rename Project"
                      >
                        <Edit2 size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => setDeletingProject(proj)}
                      className="p-1 rounded-lg text-[#91A4C5] hover:text-[#FF5D73] hover:bg-[#07122A] transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Bottom Status & Step Progress */}
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#18345C]/60 text-[10px]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        proj.status === 'exported'
                          ? 'bg-[#00D6A0] shadow-[0_0_6px_#00D6A0]'
                          : proj.status === 'review' || proj.status === 'generating'
                          ? 'bg-[#FFB84D] shadow-[0_0_6px_#FFB84D]'
                          : 'bg-[#91A4C5]'
                      }`}
                    />
                    <span
                      className={`capitalize ${
                        proj.status === 'exported'
                          ? 'text-[#00D6A0]'
                          : proj.status === 'review' || proj.status === 'generating'
                          ? 'text-[#FFB84D]'
                          : 'text-[#91A4C5]'
                      }`}
                    >
                      {proj.status === 'exported'
                        ? 'Exported'
                        : proj.status === 'generating'
                        ? 'Generating'
                        : 'Draft'}
                    </span>
                  </span>

                  <span className="font-mono text-[#91A4C5]">
                    Step <span className="text-[#00C8F5] font-bold">{proj.currentStep || 1}</span> of 7
                  </span>
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
            <Button variant="cyan" size="sm" onClick={handleCreate}>
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
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
            <label className="block text-xs font-semibold text-[#F1F5FF] mb-1.5">
              Target Duration: <span className="text-[#00C8F5] font-bold">{newDuration} seconds</span>
            </label>
            <input
              type="range"
              min={15}
              max={180}
              step={15}
              value={newDuration}
              onChange={(e) => setNewDuration(parseInt(e.target.value, 10))}
              className="w-full accent-[#00C8F5]"
            />
            <div className="flex justify-between text-[10px] text-[#91A4C5] mt-1 font-mono">
              <span>15s (Short)</span>
              <span className="text-[#00C8F5] font-bold">30s (Default)</span>
              <span>60s (Standard)</span>
              <span>180s (Deep Story)</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Rename Project Modal */}
      {renamingProject && (
        <Modal
          isOpen={Boolean(renamingProject)}
          onClose={() => setRenamingProject(null)}
          title="Rename Story Project"
          subtitle={`Update title for "${renamingProject.title}"`}
          footer={
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setRenamingProject(null)}>
                Cancel
              </Button>
              <Button variant="cyan" size="sm" onClick={handleConfirmRename}>
                Save Changes
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <Input
              label="New Project Title"
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmRename();
              }}
              autoFocus
            />
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProject && (
        <Modal
          isOpen={Boolean(deletingProject)}
          onClose={() => setDeletingProject(null)}
          title="Delete Story Project?"
          subtitle="This action will permanently delete this project and its storyboard scenes."
          footer={
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setDeletingProject(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmDelete}>
                Delete Project
              </Button>
            </div>
          }
        >
          <div className="p-3 rounded-xl bg-[#FF5D73]/10 border border-[#FF5D73]/30 flex items-start gap-3">
            <AlertTriangle size={20} className="text-[#FF5D73] shrink-0 mt-0.5" />
            <div className="text-xs text-[#F1F5FF]">
              <p className="font-semibold text-[#FF5D73]">Permanent Deletion Warning</p>
              <p className="mt-1 text-[#91A4C5]">
                Are you sure you want to delete <strong>"{deletingProject.title}"</strong>? Generated
                scenes and customized video prompts cannot be recovered.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </aside>
  );
};
