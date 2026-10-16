import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Film, Plus, Trash2, ArrowRight, Layers } from 'lucide-react';
import { StoryProject } from '../../../../shared/types';

export const StoryProjectsView: React.FC = () => {
  const { setCurrentSection, addToast } = useAppStore();
  const [projects, setProjects] = useState<StoryProject[]>([]);

  const fetchProjects = async () => {
    if (window.api) {
      const list = await window.api.getProjects();
      setProjects(list);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.api && window.confirm('Delete this project and its storyboard?')) {
      await window.api.deleteProject(id);
      addToast({ type: 'info', title: 'Project deleted' });
      fetchProjects();
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 select-none overflow-y-auto h-full">
      <div className="flex items-center justify-between pb-5 border-b border-[rgba(91,145,255,0.18)]">
        <div>
          <h2 className="text-xl font-bold text-studio-100 flex items-center gap-2 tracking-tight">
            <Film className="text-cyan-400 drop-shadow-[0_0_10px_#00C8FF]" size={22} />
            Story Projects & Scripts
          </h2>
          <p className="text-xs text-studio-400 mt-1">
            Searchable library of video narratives, scripts, and multi-scene pipelines.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => setCurrentSection('ai-studio')}
        >
          Create New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<Film size={32} />}
          title="No story projects found"
          description="Build reusable AI character stories with our scene-by-scene script architect."
          actionText="Open AI Studio"
          onAction={() => setCurrentSection('ai-studio')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => (
            <Card
              key={proj.id}
              hoverable
              onClick={() => setCurrentSection('ai-studio')}
              className="flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="cyan" size="sm">{proj.genre}</Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-cyan-400/80">{proj.aspectRatio}</span>
                    <button
                      onClick={(e) => handleDelete(proj.id, e)}
                      className="p-1 text-studio-500 hover:text-rose-400 rounded transition-colors"
                      title="Delete Story Project"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-studio-100 text-sm mb-1 group-hover:text-cyan-400 transition-colors">
                  {proj.title}
                </h3>
                <p className="text-xs text-studio-400 line-clamp-2 mb-4 leading-relaxed">
                  {proj.hook || 'No hook defined yet. Click to script this project in AI Studio.'}
                </p>
              </div>

              <div className="pt-3 border-t border-[rgba(91,145,255,0.14)] flex items-center justify-between text-[11px] text-studio-400">
                <span className="flex items-center gap-1.5">
                  <Layers size={13} className="text-cyan-400" />
                  {proj.scenes.length} scenes ({proj.targetDuration}s)
                </span>
                <span className="flex items-center gap-1 text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                  Open Studio <ArrowRight size={12} />
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
