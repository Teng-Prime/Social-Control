import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Video,
  Send,
  Calendar,
  AlertCircle,
  Smartphone,
  HardDrive,
  Plus,
  Upload,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { stats, health, fetchDashboardStats, fetchSystemHealth, setCurrentSection } = useAppStore();
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
    fetchSystemHealth();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchDashboardStats(), fetchSystemHealth()]);
    setIsRefreshing(false);
  };

  const statCards = [
    {
      title: 'Total Videos',
      value: stats?.totalGeneratedVideos ?? 0,
      icon: <Video className="text-brand-400" size={20} />,
      subtext: 'In local library',
      action: () => setCurrentSection('video-library'),
    },
    {
      title: 'Ready to Publish',
      value: stats?.videosReadyToPublish ?? 0,
      icon: <Send className="text-cyan-400" size={20} />,
      subtext: 'Rendered & reviewed',
      action: () => setCurrentSection('publish-center'),
    },
    {
      title: 'Published Posts',
      value: stats?.publishedPosts ?? 0,
      icon: <CheckCircle2 className="text-emerald-400" size={20} />,
      subtext: 'Across all platforms',
      action: () => setCurrentSection('publish-center'),
    },
    {
      title: 'Scheduled Posts',
      value: stats?.scheduledPosts ?? 0,
      icon: <Calendar className="text-indigo-400" size={20} />,
      subtext: 'In content calendar',
      action: () => setCurrentSection('calendar'),
    },
    {
      title: 'Failed / Attention',
      value: stats?.failedJobs ?? 0,
      icon: <AlertCircle className="text-rose-400" size={20} />,
      subtext: stats?.failedJobs ? 'Requires retry' : 'All systems normal',
      isWarning: (stats?.failedJobs ?? 0) > 0,
      action: () => setCurrentSection('automation-queue'),
    },
    {
      title: 'Connected Phones',
      value: stats?.connectedDevicesCount ?? 0,
      icon: <Smartphone className="text-purple-400" size={20} />,
      subtext: 'Via Android ADB',
      action: () => setCurrentSection('phone-control'),
    },
  ];

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-full">
      {/* Top Banner & Quick Shortcuts */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1D3B]/95 via-[#102A50]/80 to-[#0B1D3B]/95 border border-[rgba(91,145,255,0.22)] shadow-glass p-6 backdrop-blur-xl">
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 -right-16 w-60 h-60 bg-gradient-to-br from-cyan-400/20 to-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-60 h-60 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="brand" size="sm" dot>Workspace Active</Badge>
              <span className="text-xs text-cyan-400/90 font-medium">Desktop Production Studio</span>
            </div>
            <h2 className="text-xl font-bold text-studio-100 tracking-tight">Social Earnings Studio</h2>
            <p className="text-xs text-studio-300 mt-1 max-w-xl leading-relaxed">
              Design persistent AI characters, script multi-scene video stories, synchronize with Android devices, and automate multi-platform publishing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="primary"
              size="sm"
              icon={<Sparkles size={15} />}
              onClick={() => setCurrentSection('ai-studio')}
            >
              Create AI Story
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<Send size={15} className="text-cyan-400" />}
              onClick={() => setCurrentSection('publish-center')}
            >
              Publish Center
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<Smartphone size={15} className="text-emerald-400" />}
              onClick={() => setCurrentSection('phone-control')}
            >
              Connect Phone
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, idx) => (
          <div
            key={idx}
            onClick={card.action}
            className={`glass-card rounded-2xl p-4 transition-all duration-200 cursor-pointer hover:border-brand-500/50 hover:shadow-[0_8px_30px_rgba(8,123,255,0.2)] hover:scale-[1.02] group ${
              card.isWarning ? 'border-rose-500/50 bg-rose-950/20 shadow-[0_4px_20px_rgba(255,92,122,0.15)]' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-studio-400 group-hover:text-studio-200 transition-colors">
                {card.title}
              </span>
              <div className="p-2 rounded-xl bg-[#102A50]/70 border border-[rgba(91,145,255,0.2)] text-studio-300 group-hover:text-cyan-400 transition-colors shadow-subtle">
                {card.icon}
              </div>
            </div>
            <div className="text-2xl font-bold text-studio-100 tracking-tight group-hover:text-white transition-colors">
              {card.value}
            </div>
            <div className="text-[11px] text-studio-400 mt-1">{card.subtext}</div>
          </div>
        ))}
      </div>

      {/* Main Content Grid: Projects & Activity & Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Story Projects */}
        <div className="lg:col-span-2">
          <Card
            title="Recent Story Projects"
            subtitle="Continue your AI scene creation pipelines"
            action={
              <Button
                variant="ghost"
                size="sm"
                icon={<ArrowRight size={14} />}
                onClick={() => setCurrentSection('story-projects')}
              >
                View All
              </Button>
            }
          >
            {stats?.recentProjects && stats.recentProjects.length > 0 ? (
              <div className="space-y-3">
                {stats.recentProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => setCurrentSection('story-projects')}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-[#081633]/70 border border-[rgba(91,145,255,0.18)] hover:border-brand-500/40 hover:bg-[#102A50]/60 transition-all cursor-pointer group shadow-subtle"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-studio-100 group-hover:text-cyan-400 transition-colors">
                          {project.title}
                        </h4>
                        <Badge variant="cyan" size="sm">{project.genre}</Badge>
                        <Badge variant="neutral" size="sm">{project.aspectRatio}</Badge>
                      </div>
                      <p className="text-xs text-studio-400 mt-1 line-clamp-1">{project.hook || 'No hook set yet'}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono text-cyan-400/90 font-medium">{project.scenes.length} scenes</span>
                      <div className="text-[10px] text-studio-500 mt-0.5">{new Date(project.updatedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 px-4 bg-[#081633]/50 rounded-2xl border border-dashed border-[rgba(91,145,255,0.2)]">
                <Sparkles className="mx-auto text-cyan-400/80 mb-2 drop-shadow-[0_0_10px_#00C8FF]" size={24} />
                <h4 className="text-sm font-semibold text-studio-100">No story projects yet</h4>
                <p className="text-xs text-studio-400 max-w-sm mx-auto mt-1 mb-4">
                  Create your first AI story project with scene-by-scene scriptwriting and continuity tracking.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setCurrentSection('ai-studio')}
                >
                  Create First Project
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Storage & Queue Summary */}
        <div className="space-y-6">
          {/* Storage Meter */}
          <Card title="Storage & Environment" subtitle="Local disk and media cache">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-studio-400">Disk Capacity</span>
                  <span className="text-studio-200 font-mono font-medium">
                    {health?.storageAvailableMb ? `${Math.round(health.storageAvailableMb / 1024)} GB free` : 'Checking...'}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#081633] border border-[rgba(91,145,255,0.18)] overflow-hidden p-0.5">
                  <div className="h-full bg-gradient-to-r from-brand-500 via-cyan-400 to-purple-500 w-1/4 rounded-full shadow-[0_0_10px_#00C8FF]" />
                </div>
              </div>

              <div className="p-3.5 bg-[#081633]/80 rounded-xl border border-[rgba(91,145,255,0.18)] text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-studio-400">Studio Library Path:</span>
                  <span className="text-studio-200 font-mono text-[11px] truncate max-w-[180px]">
                    {health?.storagePath || 'SocialEarningsStudio/'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-studio-400">Video Engine:</span>
                  <span className={`font-mono font-medium ${health?.ffmpegAvailable ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {health?.ffmpegAvailable ? 'FFmpeg Active' : 'Missing'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-studio-400">Android Bridge:</span>
                  <span className={`font-mono font-medium ${health?.adbAvailable ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {health?.adbAvailable ? 'ADB Ready' : 'Not Connected'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Automation Queue Status */}
          <Card
            title="Task Queue Status"
            subtitle="Persistent background processing"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentSection('automation-queue')}
              >
                Queue
              </Button>
            }
          >
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-3 rounded-xl bg-[#081633]/80 border border-[rgba(91,145,255,0.18)]">
                <span className="text-studio-400 block mb-1">Running</span>
                <span className="text-lg font-bold text-cyan-400 drop-shadow-[0_0_8px_rgba(0,200,255,0.4)]">
                  {stats?.queueSummary.running ?? 0}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#081633]/80 border border-[rgba(91,145,255,0.18)]">
                <span className="text-studio-400 block mb-1">Pending</span>
                <span className="text-lg font-bold text-brand-400 drop-shadow-[0_0_8px_rgba(8,123,255,0.4)]">
                  {stats?.queueSummary.pending ?? 0}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#081633]/80 border border-[rgba(91,145,255,0.18)]">
                <span className="text-studio-400 block mb-1">Completed</span>
                <span className="text-lg font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(22,217,160,0.4)]">
                  {stats?.queueSummary.completed ?? 0}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#081633]/80 border border-[rgba(91,145,255,0.18)]">
                <span className="text-studio-400 block mb-1">Failed</span>
                <span className="text-lg font-bold text-rose-400 drop-shadow-[0_0_8px_rgba(255,92,122,0.4)]">
                  {stats?.queueSummary.failed ?? 0}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Activity Log */}
      <Card
        title="Recent Activity"
        subtitle="Audited local operations and system events"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentSection('logs')}
          >
            Full Logs
          </Button>
        }
      >
        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
          <div className="space-y-2">
            {stats.recentActivity.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-[#081633]/70 border border-[rgba(91,145,255,0.14)] text-xs font-mono"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Badge
                    variant={log.level === 'error' ? 'danger' : log.level === 'warn' ? 'warning' : 'brand'}
                    size="sm"
                  >
                    {log.category}
                  </Badge>
                  <span className="text-studio-200 truncate">{log.message}</span>
                </div>
                <span className="text-studio-500 text-[10px] shrink-0 ml-3">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-studio-500">
            No activity logged yet. Operations will appear here automatically.
          </div>
        )}
      </Card>
    </div>
  );
};
