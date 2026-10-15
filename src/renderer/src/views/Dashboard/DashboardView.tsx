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
  ArrowRight,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle2,
  Download,
  ArrowRightLeft,
  Users,
  Layers,
  UserCheck,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { DashboardMobileStats, PublishJob } from '../../../../shared/types';

export const DashboardView: React.FC = () => {
  const { stats, health, fetchDashboardStats, fetchSystemHealth, setCurrentSection, addToast } = useAppStore();
  const [mobileStats, setMobileStats] = useState<DashboardMobileStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMobileStats = async () => {
    try {
      if (window.api?.getMobileDashboardStats) {
        const mStats = await window.api.getMobileDashboardStats();
        setMobileStats(mStats);
      }
    } catch (err: any) {
      console.warn('Failed to fetch mobile dashboard stats', err);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    fetchSystemHealth();
    fetchMobileStats();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchDashboardStats(), fetchSystemHealth(), fetchMobileStats()]);
    setIsRefreshing(false);
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      if (window.api?.retryPublishJob) {
        await window.api.retryPublishJob(jobId);
        addToast({ type: 'info', title: 'Publishing Job Retried', message: `Job ${jobId} re-queued.` });
        await fetchMobileStats();
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Retry Failed', message: err.message });
    }
  };

  // 8 Required Metrics Cards
  const metricCards = [
    {
      title: 'Total Generated',
      value: mobileStats?.totalGeneratedVideos ?? stats?.totalGeneratedVideos ?? 0,
      icon: <Video className="text-brand-400" size={18} />,
      subtext: 'PC Studio Videos',
      action: () => setCurrentSection('video-library'),
    },
    {
      title: 'Ready to Publish',
      value: mobileStats?.videosReadyToPublish ?? stats?.videosReadyToPublish ?? 0,
      icon: <Sparkles className="text-cyan-400" size={18} />,
      subtext: 'Metadata Configured',
      action: () => setCurrentSection('publish-center'),
    },
    {
      title: 'Transferred to Phone',
      value: mobileStats?.videosTransferredToPhone ?? 0,
      icon: <Smartphone className="text-emerald-400" size={18} />,
      subtext: 'On Android Storage',
      action: () => setCurrentSection('video-library'),
    },
    {
      title: 'Published Posts',
      value: mobileStats?.successfullyPublishedVideos ?? stats?.publishedPosts ?? 0,
      icon: <CheckCircle2 className="text-teal-400" size={18} />,
      subtext: 'YouTube, TikTok, FB',
      action: () => setCurrentSection('publish-center'),
    },
    {
      title: 'Failed / Pending',
      value: mobileStats?.failedOrPendingPublishingTasks ?? stats?.failedJobs ?? 0,
      icon: <AlertCircle className="text-rose-400" size={18} />,
      subtext: (mobileStats?.failedOrPendingPublishingTasks ?? 0) > 0 ? 'Action required' : 'All clear',
      isWarning: (mobileStats?.failedOrPendingPublishingTasks ?? 0) > 0,
      action: () => setCurrentSection('automation-queue'),
    },
    {
      title: 'Connected Devices',
      value: mobileStats?.connectedDevicesCount ?? stats?.connectedDevicesCount ?? 0,
      icon: <HardDrive className="text-purple-400" size={18} />,
      subtext: 'USB / Wireless ADB',
      action: () => setCurrentSection('phone-control'),
    },
    {
      title: 'Installed Apps',
      value: mobileStats?.installedAppsCount ?? 0,
      icon: <Layers className="text-indigo-400" size={18} />,
      subtext: 'Social Apps Ready',
      action: () => setCurrentSection('phone-control'),
    },
    {
      title: 'Account Status',
      value: mobileStats?.accountConnectionStatus?.verifiedAccounts
        ? `${mobileStats.accountConnectionStatus.verifiedAccounts} Connected`
        : 'Setup Needed',
      icon: <UserCheck className="text-cyan-300" size={18} />,
      subtext: mobileStats?.accountConnectionStatus?.hasActiveConnection ? 'Verified' : 'Connect Profiles',
      action: () => setCurrentSection('accounts'),
    },
  ];

  // 7 Required Quick Action Buttons
  const quickActions = [
    {
      label: 'Create Video',
      icon: <Plus size={14} className="text-brand-300" />,
      onClick: () => setCurrentSection('ai-studio'),
      variant: 'primary' as const,
    },
    {
      label: 'Connect Phone',
      icon: <Smartphone size={14} className="text-emerald-400" />,
      onClick: () => setCurrentSection('phone-control'),
      variant: 'secondary' as const,
    },
    {
      label: 'Install Social Apps',
      icon: <Download size={14} className="text-purple-400" />,
      onClick: () => setCurrentSection('phone-control'),
      variant: 'secondary' as const,
    },
    {
      label: 'Transfer Videos',
      icon: <ArrowRightLeft size={14} className="text-cyan-400" />,
      onClick: () => setCurrentSection('video-library'),
      variant: 'secondary' as const,
    },
    {
      label: 'Open Publishing Center',
      icon: <Send size={14} className="text-blue-400" />,
      onClick: () => setCurrentSection('publish-center'),
      variant: 'secondary' as const,
    },
    {
      label: 'Manage Accounts',
      icon: <Users size={14} className="text-amber-400" />,
      onClick: () => setCurrentSection('accounts'),
      variant: 'secondary' as const,
    },
    {
      label: 'View Publishing History',
      icon: <Clock size={14} className="text-studio-300" />,
      onClick: () => setCurrentSection('automation-queue'),
      variant: 'outline' as const,
    },
  ];

  const getWorkflowBadge = (stage?: string, status?: string) => {
    if (status === 'published' || stage === 'published') {
      return <Badge variant="success" size="sm">Published</Badge>;
    }
    if (status === 'failed' || stage === 'failed') {
      return <Badge variant="danger" size="sm">Failed</Badge>;
    }
    if (stage === 'awaiting_review') {
      return <Badge variant="warning" size="sm">Awaiting Review</Badge>;
    }
    if (stage === 'on_phone') {
      return <Badge variant="cyan" size="sm">On Phone</Badge>;
    }
    if (stage === 'transferring') {
      return <Badge variant="brand" size="sm">Transferring</Badge>;
    }
    return <Badge variant="neutral" size="sm">{stage || status || 'Ready'}</Badge>;
  };

  return (
    <div className="p-8 space-y-7 overflow-y-auto h-full">
      {/* Top Banner & Refresh */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1D3B]/95 via-[#102A50]/80 to-[#0B1D3B]/95 border border-[rgba(91,145,255,0.22)] shadow-glass p-6 backdrop-blur-xl">
        <div className="absolute -top-16 -right-16 w-60 h-60 bg-gradient-to-br from-cyan-400/20 to-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-60 h-60 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="brand" size="sm" dot>Mobile Publishing Pipeline Active</Badge>
              <span className="text-xs text-cyan-400/90 font-medium">PC Studio → Android → Social Media</span>
            </div>
            <h2 className="text-xl font-bold text-studio-100 tracking-tight">Social Earnings Studio</h2>
            <p className="text-xs text-studio-300 mt-1 max-w-xl leading-relaxed">
              Unified command center: generate AI videos on PC, transfer seamlessly to connected Android devices, stage mobile uploads for YouTube, TikTok, and Facebook Pages, and monitor end-to-end publishing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
              onClick={handleRefresh}
            >
              Refresh Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold text-studio-300 uppercase tracking-wider">Quick Actions</span>
          <span className="text-[11px] text-studio-500">End-to-End Workflow Shortcuts</span>
        </div>
        <div className="p-3 rounded-2xl bg-[#081633]/80 border border-[rgba(91,145,255,0.18)] backdrop-blur-md flex flex-wrap items-center gap-2.5 shadow-subtle">
          {quickActions.map((qa, idx) => (
            <Button
              key={idx}
              variant={qa.variant}
              size="sm"
              icon={qa.icon}
              onClick={qa.onClick}
              className="text-xs"
            >
              {qa.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 8 Required Metrics Grid */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold text-studio-300 uppercase tracking-wider">System & Pipeline Metrics</span>
          <span className="text-[11px] text-cyan-400/80">Real-time status</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {metricCards.map((card, idx) => (
            <div
              key={idx}
              onClick={card.action}
              className={`glass-card rounded-xl p-3.5 transition-all duration-200 cursor-pointer hover:border-brand-500/50 hover:shadow-[0_8px_30px_rgba(8,123,255,0.2)] hover:scale-[1.02] group ${
                card.isWarning ? 'border-rose-500/50 bg-rose-950/20 shadow-[0_4px_20px_rgba(255,92,122,0.15)]' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-studio-400 group-hover:text-studio-200 transition-colors truncate">
                  {card.title}
                </span>
                <div className="p-1.5 rounded-lg bg-[#102A50]/70 border border-[rgba(91,145,255,0.2)] text-studio-300 group-hover:text-cyan-400 transition-colors shadow-subtle shrink-0">
                  {card.icon}
                </div>
              </div>
              <div className="text-xl font-bold text-studio-100 tracking-tight group-hover:text-white transition-colors">
                {card.value}
              </div>
              <div className="text-[10px] text-studio-400 mt-1 truncate">{card.subtext}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Publishing Activity */}
      <Card
        title="Recent Mobile Publishing Activity"
        subtitle="Live status across PC Studio, Phone Transfer, and Social Media Publishing"
        action={
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowRight size={14} />}
            onClick={() => setCurrentSection('publish-center')}
          >
            Publish Center
          </Button>
        }
      >
        {mobileStats?.recentPublishingActivity && mobileStats.recentPublishingActivity.length > 0 ? (
          <div className="space-y-2.5">
            {mobileStats.recentPublishingActivity.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#081633]/70 border border-[rgba(91,145,255,0.18)] hover:border-brand-500/40 hover:bg-[#102A50]/60 transition-all text-xs shadow-subtle"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-[#102A50] border border-[rgba(91,145,255,0.2)] text-cyan-400 shrink-0">
                    {job.platform === 'youtube' ? <Video size={16} /> : job.platform === 'tiktok' ? <Sparkles size={16} /> : <Send size={16} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-studio-100 truncate">{job.title || 'Untitled Post'}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-studio-800 text-studio-300">
                        {job.platform}
                      </span>
                      {getWorkflowBadge(job.workflowStage, job.status)}
                    </div>
                    <div className="text-[11px] text-studio-400 mt-0.5 flex items-center gap-3">
                      {job.phoneDestinationPath && (
                        <span className="text-cyan-400/90 font-mono truncate max-w-[280px]">
                          📱 {job.phoneDestinationPath}
                        </span>
                      )}
                      {job.remotePostUrl && (
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            window.api?.openExternalUrl(job.remotePostUrl!);
                          }}
                          className="text-brand-400 hover:underline flex items-center gap-1 font-mono"
                        >
                          Link <ExternalLink size={10} />
                        </a>
                      )}
                      {job.errorMessage && (
                        <span className="text-rose-400 truncate max-w-sm">{job.errorMessage}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {(job.status === 'failed' || job.workflowStage === 'failed') && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<RotateCcw size={12} />}
                      onClick={() => handleRetryJob(job.id)}
                      className="text-[11px] h-7 px-2"
                    >
                      Retry
                    </Button>
                  )}
                  <span className="text-studio-500 font-mono text-[10px]">
                    {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-studio-400 bg-[#081633]/40 rounded-xl border border-dashed border-[rgba(91,145,255,0.18)]">
            <Send className="mx-auto text-cyan-400/60 mb-2" size={24} />
            <p className="font-semibold text-studio-200">No publishing jobs executed yet</p>
            <p className="text-[11px] text-studio-400 mt-1 mb-3">
              Transfer videos from your Video Library to your Android device, then publish via YouTube, TikTok, or Facebook.
            </p>
            <Button
              variant="secondary"
              size="sm"
              icon={<Send size={13} />}
              onClick={() => setCurrentSection('publish-center')}
            >
              Open Publishing Center
            </Button>
          </div>
        )}
      </Card>

      {/* Main Content Grid: Projects & Storage */}
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

        {/* Storage & Environment */}
        <div className="space-y-6">
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
        </div>
      </div>

      {/* Recent Activity Log */}
      <Card
        title="Recent System Activity"
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

export default DashboardView;
