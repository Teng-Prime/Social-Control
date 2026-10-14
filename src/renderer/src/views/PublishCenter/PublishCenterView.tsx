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
  Send,
  Sparkles,
  Video,
  Calendar,
  Eye,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldAlert,
  Smartphone,
  RefreshCw,
  AlertTriangle,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import {
  MediaAsset,
  PublishJob,
  SocialPlatform,
  Device,
  PlatformPostCheckResult,
} from '../../../shared/types';

interface PlatformMeta {
  id: SocialPlatform;
  name: string;
  typeBadge: string;
  maxDuration: string;
  maxTitle: string;
  color: string;
  activeBorder: string;
  activeBg: string;
  activeText: string;
}

const PLATFORMS_INFO: PlatformMeta[] = [
  {
    id: 'youtube',
    name: 'YouTube Shorts',
    typeBadge: 'Shorts (60s)',
    maxDuration: 'Max 60s',
    maxTitle: '100 chars',
    color: 'rose',
    activeBorder: 'border-rose-500/80',
    activeBg: 'bg-rose-950/40 text-rose-100',
    activeText: 'text-rose-400',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    typeBadge: 'Feed (10m)',
    maxDuration: 'Max 10m',
    maxTitle: '150 chars',
    color: 'cyan',
    activeBorder: 'border-cyan-500/80',
    activeBg: 'bg-cyan-950/40 text-cyan-100',
    activeText: 'text-cyan-400',
  },
  {
    id: 'facebook',
    name: 'Facebook Reels',
    typeBadge: 'Reels (90s)',
    maxDuration: 'Max 90s',
    maxTitle: '255 chars',
    color: 'blue',
    activeBorder: 'border-blue-500/80',
    activeBg: 'bg-blue-950/40 text-blue-100',
    activeText: 'text-blue-400',
  },
];

export const PublishCenterView: React.FC = () => {
  const { addToast, setCurrentSection } = useAppStore();

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [publishJobs, setPublishJobs] = useState<PublishJob[]>([]);

  // Workflow Form State: Multi-Platform Selection (1, 2, or 3)
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(['youtube', 'tiktok']);
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>('youtube');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isScanningDevices, setIsScanningDevices] = useState(false);

  // Platform Check State
  const [checkQuery, setCheckQuery] = useState('');
  const [multiCheckResults, setMultiCheckResults] = useState<Record<string, PlatformPostCheckResult>>({});
  const [isCheckingCanPost, setIsCheckingCanPost] = useState(false);
  const [showCheckDetails, setShowCheckDetails] = useState(true);

  const [postTitle, setPostTitle] = useState('');
  const [postCaption, setPostCaption] = useState('');
  const [postHashtags, setPostHashtags] = useState('#viral #trending #story #ai');
  const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('public');
  const [aiDisclosure, setAiDisclosure] = useState(true);
  const [scheduleTime, setScheduleTime] = useState('');

  // Caption Assistant Modal
  const [isCaptionModalOpen, setIsCaptionModalOpen] = useState(false);
  const [captionTone, setCaptionTone] = useState<'engaging' | 'professional' | 'humorous' | 'dramatic'>('engaging');
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const loadData = async () => {
    if (window.api) {
      const aList = await window.api.getMediaAssets();
      const jList = await window.api.getPublishJobs();
      const dList = await window.api.getConnectedDevices();

      setAssets(aList);
      setPublishJobs(jList);
      setDevices(dList);

      let curAssetId = selectedAssetId;
      if (aList.length > 0 && !curAssetId) {
        curAssetId = aList[0].id;
        setSelectedAssetId(aList[0].id);
        setPostTitle(aList[0].title);
      }
      let curDevId = selectedDeviceId;
      if (dList.length > 0 && !curDevId) {
        curDevId = dList[0].id;
        setSelectedDeviceId(dList[0].id);
      }

      runMultiPostCheck(selectedPlatforms, checkQuery, curAssetId, curDevId);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefreshDevices = async () => {
    if (!window.api) return;
    setIsScanningDevices(true);
    try {
      const dList = await window.api.getConnectedDevices();
      setDevices(dList);
      let devId = selectedDeviceId;
      if (dList.length > 0 && !selectedDeviceId) {
        devId = dList[0].id;
        setSelectedDeviceId(dList[0].id);
      }
      addToast({
        type: 'info',
        title: 'Devices Scanned',
        message: `Found ${dList.length} connected device(s).`,
      });
      runMultiPostCheck(selectedPlatforms, checkQuery, selectedAssetId, devId);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Device scan failed', message: err.message });
    } finally {
      setIsScanningDevices(false);
    }
  };

  const runMultiPostCheck = async (
    platformsToCheck = selectedPlatforms,
    queryToTest?: string,
    assetIdToTest?: string,
    deviceIdToTest?: string
  ) => {
    if (!window.api || platformsToCheck.length === 0) return;
    setIsCheckingCanPost(true);
    try {
      const targetDev = deviceIdToTest !== undefined ? deviceIdToTest : selectedDeviceId;
      const targetAsset = assetIdToTest !== undefined ? assetIdToTest : selectedAssetId;
      const targetQuery = queryToTest !== undefined ? queryToTest : checkQuery;

      const resultsMap: Record<string, PlatformPostCheckResult> = {};
      for (const plat of platformsToCheck) {
        const res = await window.api.checkPlatformPostReadiness({
          platform: plat,
          deviceId: targetDev,
          mediaAssetId: targetAsset,
          checkQuery: targetQuery,
          title: postTitle,
          caption: postCaption,
          hashtags: postHashtags.split(/\s+/).filter(Boolean),
          privacy,
        });
        resultsMap[plat] = res;
      }
      setMultiCheckResults(resultsMap);
    } catch (err: any) {
      console.warn('Failed to run multi-platform post check:', err);
    } finally {
      setIsCheckingCanPost(false);
    }
  };

  const togglePlatform = (p: SocialPlatform) => {
    let next: SocialPlatform[];
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length === 1) {
        addToast({ type: 'warn', title: 'At least 1 platform must be selected' });
        return;
      }
      next = selectedPlatforms.filter((x) => x !== p);
      if (previewPlatform === p) {
        setPreviewPlatform(next[0]);
      }
    } else {
      next = [...selectedPlatforms, p];
      setPreviewPlatform(p);
    }
    setSelectedPlatforms(next);
    runMultiPostCheck(next, checkQuery, selectedAssetId, selectedDeviceId);
  };

  const selectAllPlatforms = () => {
    const all: SocialPlatform[] = ['youtube', 'tiktok', 'facebook'];
    setSelectedPlatforms(all);
    runMultiPostCheck(all, checkQuery, selectedAssetId, selectedDeviceId);
  };

  const handleRunCaptionAssistant = async () => {
    if (!window.api) return;
    setIsGeneratingCaptions(true);
    try {
      const selected = assets.find((a) => a.id === selectedAssetId);
      const res = await window.api.generateCaptions({
        videoTitle: postTitle || selected?.title || 'Viral AI Story',
        targetPlatform: previewPlatform,
        targetAudience: 'Content creators, mystery and short video lovers',
        language: 'en',
        tone: captionTone,
        keywords: ['viral', 'storytime', 'mindblowing', 'twist'],
        callToAction: 'Follow for the next episode tomorrow!',
      });

      if (res.variations.length > 0) {
        const top = res.variations[0];
        setPostTitle(top.title);
        setPostCaption(top.caption);
        setPostHashtags(top.hashtags.join(' '));
        addToast({ type: 'success', title: 'Captions & Hashtags Generated' });
        setIsCaptionModalOpen(false);
        runMultiPostCheck(selectedPlatforms, top.title, selectedAssetId, selectedDeviceId);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Caption assistant failed', message: err.message });
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  const handleCreateAndPublish = async () => {
    if (!selectedAssetId || !window.api) {
      addToast({ type: 'warn', title: 'Please select a video asset to publish' });
      return;
    }

    if (selectedPlatforms.length === 0) {
      addToast({ type: 'warn', title: 'Please select at least 1 platform to post' });
      return;
    }

    const targetAccountId = selectedDeviceId
      ? `phone_${selectedDeviceId}`
      : 'phone_virtual';

    setIsPublishing(true);
    let successCount = 0;
    const errors: string[] = [];

    try {
      for (const plat of selectedPlatforms) {
        try {
          // 1. Create publish job for this platform
          const job = await window.api.createPublishJob({
            mediaAssetId: selectedAssetId,
            platform: plat,
            accountId: targetAccountId,
            title: postTitle,
            caption: postCaption,
            hashtags: postHashtags.split(/\s+/).filter(Boolean),
            tags: ['studio', 'ai'],
            privacy,
            scheduledFor: scheduleTime || undefined,
            aiDisclosure,
          });

          // 2. Execute publish workflow
          const result = await window.api.executePublishJob(job.id);
          if (result.success) {
            successCount++;
          } else {
            errors.push(`${plat.toUpperCase()}: ${result.message}`);
          }
        } catch (jobErr: any) {
          errors.push(`${plat.toUpperCase()}: ${jobErr.message}`);
        }
      }

      if (successCount === selectedPlatforms.length) {
        addToast({
          type: 'success',
          title: 'Transferred & Ready on Phone!',
          message: `Successfully processed for ${successCount} platform(s): ${selectedPlatforms.map((p) => p.toUpperCase()).join(', ')}.`,
        });
      } else if (successCount > 0) {
        addToast({
          type: 'warn',
          title: `Published to ${successCount}/${selectedPlatforms.length} Platforms`,
          message: errors.join('; '),
        });
      } else {
        addToast({
          type: 'error',
          title: 'Publish Failed',
          message: errors.join('; ') || 'Could not post to selected platforms.',
        });
      }

      await loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Publishing process error', message: err.message });
    } finally {
      setIsPublishing(false);
    }
  };

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);

  return (
    <div className="flex h-full select-none overflow-hidden">
      {/* Left Publishing Config Panel */}
      <div className="w-[450px] border-r border-studio-800 bg-studio-900/50 flex flex-col shrink-0 overflow-y-auto p-6 space-y-5 text-xs">
        <div>
          <h3 className="text-base font-bold text-studio-100 flex items-center gap-2">
            <Send size={18} className="text-brand-400" />
            Publishing Workspace
          </h3>
          <p className="text-[11px] text-studio-400 mt-0.5">
            Prepare, optimize, and distribute videos to YouTube, TikTok, and Facebook.
          </p>
        </div>

        {/* Step 1: Video Selection */}
        <div>
          <label className="block text-xs font-semibold text-studio-300 mb-1.5">1. Select Video Asset</label>
          <select
            className="w-full bg-studio-850 border border-studio-750 rounded-lg p-2.5 text-studio-100 text-xs"
            value={selectedAssetId}
            onChange={(e) => {
              setSelectedAssetId(e.target.value);
              const found = assets.find((a) => a.id === e.target.value);
              if (found) setPostTitle(found.title);
            }}
          >
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.aspectRatio}, {a.duration}s) - {a.folder}
              </option>
            ))}
          </select>
        </div>

        {/* Step 2: Multi-Platform Selection (1, 2, or 3) & Authorized Phone */}
        <div className="space-y-3 pt-2 border-t border-studio-800">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-studio-300">
              2. Platforms & Phone Destination
            </label>
            <span className="text-[10px] text-cyan-400 font-medium flex items-center gap-1 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
              <Smartphone size={11} />
              Android Direct Push
            </span>
          </div>

          {/* 3 Clickable Platform Cards (Select 1, 2, or All 3) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-studio-300">
                Click to Select Platforms ({selectedPlatforms.length} of 3 selected):
              </span>
              <button
                type="button"
                onClick={selectAllPlatforms}
                className="text-[10px] text-brand-400 hover:text-brand-300 underline font-medium"
              >
                {selectedPlatforms.length === 3 ? 'All 3 Selected' : 'Select All 3'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS_INFO.map((p) => {
                const isSelected = selectedPlatforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className={`relative p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? `${p.activeBorder} ${p.activeBg} shadow-sm ring-1 ring-white/10`
                        : 'border-studio-800 bg-studio-850/60 text-studio-400 hover:border-studio-700 hover:text-studio-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs truncate">
                        {p.name}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ml-1 ${
                          isSelected
                            ? 'bg-brand-500 text-white font-bold'
                            : 'border border-studio-600 text-transparent'
                        }`}
                      >
                        ✓
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-studio-400 font-mono">
                      <span>{p.typeBadge}</span>
                      <span className={isSelected ? p.activeText : ''}>{p.maxDuration}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Destination Selector: Authorized Phone Destination */}
          <div>
            <div className="p-3 bg-studio-850/80 rounded-xl border border-studio-750 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-studio-200 flex items-center gap-1.5">
                  <Smartphone size={13} className="text-brand-400" />
                  Authorized Phone Destination
                </label>
                <button
                  type="button"
                  onClick={handleRefreshDevices}
                  disabled={isScanningDevices}
                  className="text-[10px] text-brand-400 hover:text-brand-300 flex items-center gap-1"
                  title="Scan connected Android phones via ADB"
                >
                  <RefreshCw size={10} className={isScanningDevices ? 'animate-spin' : ''} />
                  Scan Phone
                </button>
              </div>

              <select
                className="w-full bg-studio-900 border border-studio-750 rounded-lg p-2 text-studio-100 text-xs"
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  runMultiPostCheck(selectedPlatforms, checkQuery, selectedAssetId, e.target.value);
                }}
              >
                {devices.length === 0 ? (
                  <option value="">📱 Virtual Android Phone (Staging Mode)</option>
                ) : (
                  devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      📱 {d.model} ({d.status.toUpperCase()}) — Battery {d.batteryLevel || 85}%
                    </option>
                  ))
                )}
              </select>

              {/* Show installed app readiness on phone for each selected platform */}
              {devices.length > 0 && selectedDeviceId && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedPlatforms.map((p) => {
                    const d = devices.find((x) => x.id === selectedDeviceId);
                    const appPkg =
                      p === 'youtube'
                        ? 'com.google.android.youtube'
                        : p === 'tiktok'
                        ? 'com.zhiliaoapp.musically'
                        : 'com.facebook.katana';
                    const isInstalled = d?.installedApps?.some((a) => a.packageName === appPkg && a.isInstalled);
                    const appName = p === 'youtube' ? 'YouTube' : p === 'tiktok' ? 'TikTok' : 'Facebook';
                    return (
                      <span
                        key={p}
                        className={`text-[9px] px-2 py-0.5 rounded-full border ${
                          isInstalled
                            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 font-medium'
                            : 'bg-studio-800 border-studio-700 text-studio-400'
                        }`}
                      >
                        {isInstalled ? `✓ ${appName} App Ready` : `${appName} (Gallery Push)`}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Platform Update & Check We Can Post Textbox */}
          <div className="p-3 bg-studio-850/80 rounded-xl border border-studio-750 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-studio-200 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-cyan-400" />
                Check We Can Post ({selectedPlatforms.length} Selected)
              </span>
              <div className="flex items-center gap-1">
                {selectedPlatforms.map((p) => (
                  <span
                    key={p}
                    className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-studio-800 text-studio-300 border border-studio-700"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 bg-studio-900 border border-studio-700 rounded-lg px-2.5 py-1.5 text-studio-100 text-xs placeholder:text-studio-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="Enter test post text or query to check if we can post..."
                value={checkQuery}
                onChange={(e) => setCheckQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    runMultiPostCheck();
                  }
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                loading={isCheckingCanPost}
                icon={<CheckCircle2 size={12} />}
                onClick={() => runMultiPostCheck()}
              >
                Check {selectedPlatforms.length} Platform{selectedPlatforms.length > 1 ? 's' : ''}
              </Button>
            </div>

            {/* Diagnostic readout box across selected platforms */}
            {selectedPlatforms.length > 0 && Object.keys(multiCheckResults).length > 0 && (
              <div className="space-y-2 pt-1">
                {/* Platform status cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {selectedPlatforms.map((p) => {
                    const res = multiCheckResults[p];
                    if (!res) return null;
                    const isReady = res.status === 'ready';
                    const isWarn = res.status === 'warning';
                    return (
                      <div
                        key={p}
                        className={`p-2 rounded-lg border text-[10px] space-y-1 ${
                          isReady
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                            : isWarn
                            ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                            : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold capitalize">
                          <span>{res.platformName}</span>
                          <span>{isReady ? '✓ Ready' : isWarn ? '⚠ Notice' : '✗ Error'}</span>
                        </div>
                        <p className="text-[9px] text-studio-400 line-clamp-1">{res.summary}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Detailed checks toggle */}
                <div className="p-2.5 rounded-lg bg-studio-900 border border-studio-800 text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-studio-200 text-[10px]">
                      Detailed Diagnostic Checklist ({selectedPlatforms.length} Platforms)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCheckDetails(!showCheckDetails)}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 underline"
                    >
                      {showCheckDetails ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>

                  {showCheckDetails && (
                    <div className="pt-1.5 border-t border-studio-800 space-y-1 max-h-36 overflow-y-auto">
                      {selectedPlatforms.map((p) => {
                        const res = multiCheckResults[p];
                        if (!res) return null;
                        return (
                          <div key={p} className="space-y-0.5 pb-1">
                            <span className="text-[9px] uppercase font-bold text-studio-400 block">
                              • {res.platformName}:
                            </span>
                            {res.checks.map((c, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-[10px] pl-2">
                                <span className="shrink-0 mt-0.5">
                                  {c.severity === 'success' ? (
                                    <span className="text-emerald-400 font-bold">✓</span>
                                  ) : c.severity === 'warn' ? (
                                    <span className="text-amber-400 font-bold">⚠</span>
                                  ) : (
                                    <span className="text-rose-400 font-bold">✗</span>
                                  )}
                                </span>
                                <span
                                  className={
                                    c.severity === 'success'
                                      ? 'text-studio-300'
                                      : c.severity === 'warn'
                                      ? 'text-amber-300'
                                      : 'text-rose-300'
                                  }
                                >
                                  <strong>{c.name}:</strong> {c.message}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Title & AI Caption Assistant */}
        <div className="space-y-3 pt-2 border-t border-studio-800">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-studio-300">2. Title & Captions</label>
            <Button
              variant="secondary"
              size="sm"
              icon={<Sparkles size={13} className="text-brand-400" />}
              onClick={() => setIsCaptionModalOpen(true)}
            >
              AI Caption Assistant
            </Button>
          </div>

          <Input
            label="Post Title"
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
            placeholder="High-converting hook title..."
          />

          <div>
            <label className="block text-xs font-medium text-studio-300 mb-1.5">Caption & Description</label>
            <textarea
              rows={4}
              className="w-full bg-studio-850 border border-studio-750 rounded-lg p-2.5 text-studio-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              value={postCaption}
              onChange={(e) => setPostCaption(e.target.value)}
              placeholder="Story summary, question for viewers, call to action..."
            />
          </div>

          <Input
            label="Hashtags"
            value={postHashtags}
            onChange={(e) => setPostHashtags(e.target.value)}
            placeholder="#shorts #viral #ai"
          />
        </div>

        {/* Step 4: Settings & Disclosures */}
        <div className="space-y-3 pt-2 border-t border-studio-800">
          <label className="block text-xs font-semibold text-studio-300">3. Privacy & Disclosures</label>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Visibility"
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as any)}
              options={[
                { value: 'public', label: 'Public (Instant Reach)' },
                { value: 'unlisted', label: 'Unlisted (Review First)' },
                { value: 'private', label: 'Private (Creator Only)' },
              ]}
            />

            <Input
              label="Schedule Post (Optional)"
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 p-3 bg-studio-850 rounded-lg border border-studio-750 cursor-pointer">
            <input
              type="checkbox"
              checked={aiDisclosure}
              onChange={(e) => setAiDisclosure(e.target.checked)}
              className="accent-brand-500 rounded"
            />
            <span className="text-studio-300 text-[11px]">
              Apply AI-Generated Content Disclosure (Recommended for compliance with platform guidelines)
            </span>
          </label>
        </div>

        {/* Publish Action Button */}
        <div className="pt-3">
          <Button
            variant="primary"
            size="md"
            className="w-full"
            loading={isPublishing}
            icon={<Send size={15} />}
            onClick={handleCreateAndPublish}
          >
            {scheduleTime
              ? `Schedule Post (${selectedPlatforms.length} Platform${selectedPlatforms.length > 1 ? 's' : ''})`
              : `Push to Phone & Post (${selectedPlatforms.length} Platform${selectedPlatforms.length > 1 ? 's' : ''})`}
          </Button>
        </div>
      </div>

      {/* Right Column: Live Mockup Preview & Publishing History */}
      <div className="flex-1 flex flex-col overflow-hidden bg-studio-950">
        {/* Preview Header */}
        <div className="px-6 py-4 border-b border-studio-800 bg-studio-900/60 flex items-center justify-between flex-wrap gap-2">
          <h4 className="text-sm font-semibold text-studio-100 flex items-center gap-2">
            <Eye size={16} className="text-cyan-400" />
            Social Feed Live Mockup Preview
          </h4>
          <div className="flex items-center gap-2">
            {/* Preview Platform Switcher for Selected Platforms */}
            <div className="flex items-center bg-studio-800/90 p-0.5 rounded-lg border border-studio-700">
              {selectedPlatforms.map((p) => {
                const info = PLATFORMS_INFO.find((x) => x.id === p);
                const isActive = previewPlatform === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPreviewPlatform(p)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-sm font-semibold'
                        : 'text-studio-400 hover:text-studio-200'
                    }`}
                  >
                    {info?.name.split(' ')[0] || p}
                  </button>
                );
              })}
            </div>
            <Badge variant="default" size="sm" className="text-cyan-400 border-cyan-800/40 bg-cyan-950/40">
              Phone Direct Push
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex flex-col lg:flex-row gap-8 items-start">
          {/* Simulated Mobile Feed Card */}
          <div className="w-80 mx-auto lg:mx-0 bg-black rounded-3xl border-4 border-studio-800 shadow-elevated overflow-hidden flex flex-col relative aspect-[9/16]">
            {/* Top Phone Mode status notch */}
            <div className="absolute top-2.5 left-3 right-3 bg-studio-900/80 backdrop-blur-md rounded-full py-0.5 px-2.5 flex items-center justify-between text-[9px] text-studio-200 border border-studio-700/60 z-20">
              <span className="flex items-center gap-1 text-cyan-400 font-semibold truncate">
                <Smartphone size={10} />
                {devices.find((d) => d.id === selectedDeviceId)?.model || 'Android Phone'}
              </span>
              <span className="text-emerald-400 text-[8px] font-mono shrink-0">ADB READY</span>
            </div>

            {/* Video preview area */}
            <div className="flex-1 bg-studio-950 flex items-center justify-center relative overflow-hidden">
              {selectedAsset?.thumbnailPath ? (
                <img
                  src={`file://${selectedAsset.thumbnailPath.replace(/\\/g, '/')}`}
                  alt="Thumbnail"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Video size={36} className="text-studio-600" />
              )}

              {/* Feed overlay elements */}
              <div className="absolute bottom-4 left-3 right-12 text-white space-y-1.5 drop-shadow-md">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <Smartphone size={11} className="text-cyan-400 shrink-0" />
                    @{devices.find((d) => d.id === selectedDeviceId)?.model?.replace(/\s+/g, '_').toLowerCase() || 'phone_creator'}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                      previewPlatform === 'youtube'
                        ? 'bg-rose-600/80 text-white'
                        : previewPlatform === 'tiktok'
                        ? 'bg-cyan-500/80 text-black'
                        : 'bg-blue-600/80 text-white'
                    }`}
                  >
                    {previewPlatform === 'youtube' ? 'YouTube Shorts' : previewPlatform === 'tiktok' ? 'TikTok' : 'Facebook Reels'}
                  </span>
                </div>
                <p className="text-[11px] font-semibold line-clamp-1">{postTitle || 'Video Title'}</p>
                <p className="text-[10px] text-gray-200 line-clamp-2">{postCaption}</p>
                <p className="text-[9px] text-cyan-300 font-mono">{postHashtags}</p>
                {aiDisclosure && (
                  <span className="inline-block px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-gray-300">
                    ✨ AI-generated
                  </span>
                )}
              </div>

              {/* Simulated right action icons */}
              <div className="absolute bottom-6 right-2 flex flex-col items-center gap-3 text-white text-[10px]">
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  ❤️
                </div>
                <span>42.8k</span>
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  💬
                </div>
                <span>1.2k</span>
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  ↗️
                </div>
                <span>Share</span>
              </div>
            </div>
          </div>

          {/* Publishing History & Jobs Table */}
          <div className="flex-1 w-full space-y-4">
            <Card title="Recent Publish History" subtitle="Tracked uploads, post IDs, and status">
              {publishJobs.length === 0 ? (
                <div className="text-center py-8 text-xs text-studio-500">
                  No publish jobs executed yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {publishJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-3.5 rounded-xl bg-studio-900 border border-studio-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-studio-100">{job.title}</span>
                          <Badge
                            variant={
                              job.status === 'published'
                                ? 'success'
                                : job.status === 'failed'
                                ? 'danger'
                                : 'warning'
                            }
                            size="sm"
                          >
                            {job.status}
                          </Badge>
                          <span className="text-[10px] uppercase font-mono text-studio-400">{job.platform}</span>
                        </div>
                        {job.remotePostUrl && (
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              window.api?.openExternalUrl(job.remotePostUrl!);
                            }}
                            className="text-[11px] text-brand-400 hover:underline flex items-center gap-1 mt-1"
                          >
                            {job.remotePostUrl} <ExternalLink size={11} />
                          </a>
                        )}
                        {job.errorMessage && (
                          <p className="text-[11px] text-rose-400 mt-0.5">{job.errorMessage}</p>
                        )}
                      </div>

                      <span className="text-[10px] text-studio-500 font-mono">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* AI Caption Assistant Modal */}
      <Modal
        isOpen={isCaptionModalOpen}
        onClose={() => setIsCaptionModalOpen(false)}
        title="AI Caption & Hashtag Assistant"
        subtitle="Platform-compliant high-retention descriptions tailored to your chosen tone"
        maxWidth="md"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsCaptionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isGeneratingCaptions}
              icon={<Sparkles size={14} />}
              onClick={handleRunCaptionAssistant}
            >
              Generate Optimized Captions
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <Select
            label="Caption Tone"
            value={captionTone}
            onChange={(e) => setCaptionTone(e.target.value as any)}
            options={[
              { value: 'engaging', label: 'Engaging / High Retention (Recommended)' },
              { value: 'dramatic', label: 'Dramatic / Mystery Hook' },
              { value: 'humorous', label: 'Humorous / Satirical' },
              { value: 'professional', label: 'Professional / Informative' },
            ]}
          />

          <div className="p-3 bg-studio-900 rounded-lg border border-studio-800 space-y-1 text-studio-400">
            <span className="font-semibold text-studio-200 block">Includes:</span>
            <p>• 1-line clickable hook</p>
            <p>• Curated trending tags without duplicate hashtag spam</p>
            <p>• Pinned comment conversation starter</p>
            <p>• AI disclosure tagging for transparency</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
