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
  Share2,
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
  SocialAccount,
  SocialPlatform,
  Device,
  PlatformPostCheckResult,
} from '../../../shared/types';

export const PublishCenterView: React.FC = () => {
  const { addToast, setCurrentSection } = useAppStore();

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [publishJobs, setPublishJobs] = useState<PublishJob[]>([]);

  // Workflow Form State
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('youtube');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [publishMode, setPublishMode] = useState<'phone' | 'account'>('phone');
  const [isScanningDevices, setIsScanningDevices] = useState(false);

  // Platform Check State
  const [checkQuery, setCheckQuery] = useState('');
  const [checkResult, setCheckResult] = useState<PlatformPostCheckResult | null>(null);
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
      const accList = await window.api.getSocialAccounts();
      const jList = await window.api.getPublishJobs();
      const dList = await window.api.getConnectedDevices();

      setAssets(aList);
      setAccounts(accList);
      setPublishJobs(jList);
      setDevices(dList);

      if (aList.length > 0 && !selectedAssetId) {
        setSelectedAssetId(aList[0].id);
        setPostTitle(aList[0].title);
      }
      if (accList.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accList[0].id);
      }
      if (dList.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(dList[0].id);
      }

      // Initial check
      runPostCheck(
        selectedPlatform,
        checkQuery,
        aList[0]?.id,
        dList[0]?.id
      );
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
      if (dList.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(dList[0].id);
      }
      addToast({
        type: 'info',
        title: 'Devices Scanned',
        message: `Found ${dList.length} connected device(s).`,
      });
      runPostCheck(selectedPlatform, checkQuery, selectedAssetId, dList[0]?.id);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Device scan failed', message: err.message });
    } finally {
      setIsScanningDevices(false);
    }
  };

  const runPostCheck = async (
    platformToTest?: SocialPlatform,
    queryToTest?: string,
    assetIdToTest?: string,
    deviceIdToTest?: string
  ) => {
    if (!window.api) return;
    setIsCheckingCanPost(true);
    try {
      const targetPlat = platformToTest || selectedPlatform;
      const targetDev = deviceIdToTest !== undefined ? deviceIdToTest : selectedDeviceId;
      const targetAsset = assetIdToTest !== undefined ? assetIdToTest : selectedAssetId;
      const targetQuery = queryToTest !== undefined ? queryToTest : checkQuery;

      const res = await window.api.checkPlatformPostReadiness({
        platform: targetPlat,
        deviceId: targetDev,
        mediaAssetId: targetAsset,
        checkQuery: targetQuery,
        title: postTitle,
        caption: postCaption,
        hashtags: postHashtags.split(/\s+/).filter(Boolean),
        privacy,
      });
      setCheckResult(res);
    } catch (err: any) {
      console.warn('Failed to run post readiness check:', err);
    } finally {
      setIsCheckingCanPost(false);
    }
  };

  const handleRunCaptionAssistant = async () => {
    if (!window.api) return;
    setIsGeneratingCaptions(true);
    try {
      const selected = assets.find((a) => a.id === selectedAssetId);
      const res = await window.api.generateCaptions({
        videoTitle: postTitle || selected?.title || 'Viral AI Story',
        targetPlatform: selectedPlatform,
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
        runPostCheck(selectedPlatform, top.title, selectedAssetId, selectedDeviceId);
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

    const targetAccountId =
      publishMode === 'phone'
        ? selectedDeviceId
          ? `phone_${selectedDeviceId}`
          : 'phone_virtual'
        : selectedAccountId;

    if (publishMode === 'account' && !targetAccountId) {
      addToast({ type: 'warn', title: 'Please select an authorized account or switch to Phone mode' });
      return;
    }

    setIsPublishing(true);
    try {
      // 1. Create publish job
      const job = await window.api.createPublishJob({
        mediaAssetId: selectedAssetId,
        platform: selectedPlatform,
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
        addToast({
          type: 'success',
          title: publishMode === 'phone' ? 'Video Pushed to Phone!' : 'Post Published Successfully!',
          message: result.message || result.remotePostUrl || 'Check post history below.',
        });
      } else {
        addToast({
          type: 'warn',
          title: 'Publish Action Completed with Notes',
          message: result.message,
        });
      }

      await loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Publish Failed', message: err.message });
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

        {/* Step 2: Destination Platform & Authorized Phone */}
        <div className="space-y-3 pt-2 border-t border-studio-800">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-studio-300">
              2. Platform & Destination
            </label>
            <div className="flex items-center gap-1 bg-studio-850 p-0.5 rounded-lg border border-studio-750">
              <button
                type="button"
                onClick={() => {
                  setPublishMode('phone');
                  runPostCheck(selectedPlatform, checkQuery, selectedAssetId, selectedDeviceId);
                }}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors flex items-center gap-1 ${
                  publishMode === 'phone'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-studio-400 hover:text-studio-200'
                }`}
              >
                <Smartphone size={11} />
                Phone
              </button>
              <button
                type="button"
                onClick={() => {
                  setPublishMode('account');
                  runPostCheck(selectedPlatform, checkQuery, selectedAssetId, '');
                }}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors flex items-center gap-1 ${
                  publishMode === 'account'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-studio-400 hover:text-studio-200'
                }`}
              >
                <Share2 size={11} />
                Cloud API
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-studio-300 mb-1.5">Platform</label>
              <select
                className="w-full bg-studio-850 border border-studio-750 rounded-lg p-2.5 text-studio-100 text-xs capitalize"
                value={selectedPlatform}
                onChange={(e) => {
                  const plat = e.target.value as SocialPlatform;
                  setSelectedPlatform(plat);
                  runPostCheck(plat);
                }}
              >
                <option value="youtube">YouTube (Shorts/Video)</option>
                <option value="tiktok">TikTok (Content API/App)</option>
                <option value="facebook">Facebook (Reels/Page)</option>
              </select>
            </div>

            <div>
              {publishMode === 'phone' ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-studio-300 flex items-center gap-1">
                      <Smartphone size={12} className="text-brand-400" />
                      Authorized Phone
                    </label>
                    <button
                      type="button"
                      onClick={handleRefreshDevices}
                      disabled={isScanningDevices}
                      className="text-[10px] text-brand-400 hover:text-brand-300 flex items-center gap-1"
                      title="Scan connected Android phones via ADB"
                    >
                      <RefreshCw size={10} className={isScanningDevices ? 'animate-spin' : ''} />
                      Scan
                    </button>
                  </div>
                  <select
                    className="w-full bg-studio-850 border border-studio-750 rounded-lg p-2.5 text-studio-100 text-xs"
                    value={selectedDeviceId}
                    onChange={(e) => {
                      setSelectedDeviceId(e.target.value);
                      runPostCheck(selectedPlatform, checkQuery, selectedAssetId, e.target.value);
                    }}
                  >
                    {devices.length === 0 ? (
                      <option value="">📱 Virtual Android Phone (Staging)</option>
                    ) : (
                      devices.map((d) => {
                        const app = d.installedApps?.find((a) =>
                          selectedPlatform === 'youtube'
                            ? a.packageName.includes('youtube')
                            : selectedPlatform === 'tiktok'
                            ? a.packageName.includes('musically')
                            : a.packageName.includes('katana')
                        );
                        const appTag = app?.isInstalled ? '✓ App Ready' : 'Gallery Only';
                        return (
                          <option key={d.id} value={d.id}>
                            📱 {d.model} ({d.status.toUpperCase()}) — {appTag}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-studio-300 mb-1.5">
                    Authorized Account
                  </label>
                  <select
                    className="w-full bg-studio-850 border border-studio-750 rounded-lg p-2.5 text-studio-100 text-xs"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                  >
                    {accounts.length === 0 && <option value="">No Accounts Connected</option>}
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} ({acc.platform})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Platform Update & Check We Can Post Textbox */}
          <div className="p-3 bg-studio-850/80 rounded-xl border border-studio-750 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-studio-200 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-cyan-400" />
                Check We Can Post ({checkResult?.platformLimits.appName || selectedPlatform.toUpperCase()})
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">
                Max Title: {checkResult?.platformLimits.maxTitleLength || 100}c
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 bg-studio-900 border border-studio-700 rounded-lg px-2.5 py-1.5 text-studio-100 text-xs placeholder:text-studio-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="Enter test post text or query to check if we can post..."
                value={checkQuery}
                onChange={(e) => {
                  setCheckQuery(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    runPostCheck(selectedPlatform, checkQuery);
                  }
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                loading={isCheckingCanPost}
                icon={<CheckCircle2 size={12} />}
                onClick={() => runPostCheck(selectedPlatform, checkQuery)}
              >
                Check
              </Button>
            </div>

            {/* Diagnostic readout box */}
            {checkResult && (
              <div
                className={`p-2.5 rounded-lg text-[11px] space-y-1.5 border transition-all ${
                  checkResult.status === 'ready'
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                    : checkResult.status === 'warning'
                    ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                    : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5">
                    {checkResult.status === 'ready' ? (
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    ) : checkResult.status === 'warning' ? (
                      <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                    ) : (
                      <XCircle size={13} className="text-rose-400 shrink-0" />
                    )}
                    {checkResult.summary}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCheckDetails(!showCheckDetails)}
                    className="text-[10px] underline hover:text-white"
                  >
                    {showCheckDetails ? 'Hide Details' : 'View Details'}
                  </button>
                </div>

                {showCheckDetails && (
                  <div className="pt-1.5 border-t border-white/10 space-y-1">
                    {checkResult.checks.map((c, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[10px]">
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
                          <strong className="text-studio-100">{c.name}:</strong> {c.message}
                        </span>
                      </div>
                    ))}
                    {checkResult.recommendations.length > 0 && (
                      <div className="mt-1 text-[10px] text-cyan-300 bg-cyan-950/50 p-1.5 rounded border border-cyan-800/40">
                        💡 <strong>Optimization Tip:</strong> {checkResult.recommendations[0]}
                      </div>
                    )}
                  </div>
                )}
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
              ? 'Schedule Post'
              : publishMode === 'phone'
              ? 'Push to Phone & Open App'
              : 'Publish Video Now'}
          </Button>
        </div>
      </div>

      {/* Right Column: Live Mockup Preview & Publishing History */}
      <div className="flex-1 flex flex-col overflow-hidden bg-studio-950">
        {/* Preview Header */}
        <div className="px-6 py-4 border-b border-studio-800 bg-studio-900/60 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-studio-100 flex items-center gap-2">
            <Eye size={16} className="text-cyan-400" />
            Social Feed Live Mockup Preview
          </h4>
          <div className="flex items-center gap-2">
            <Badge variant="brand" size="sm" className="capitalize">
              {selectedPlatform} View
            </Badge>
            {publishMode === 'phone' && (
              <Badge variant="default" size="sm" className="text-cyan-400 border-cyan-800/40 bg-cyan-950/40">
                Phone Direct Push
              </Badge>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex flex-col lg:flex-row gap-8 items-start">
          {/* Simulated Mobile Feed Card */}
          <div className="w-80 mx-auto lg:mx-0 bg-black rounded-3xl border-4 border-studio-800 shadow-elevated overflow-hidden flex flex-col relative aspect-[9/16]">
            {/* Top Phone Mode status notch */}
            {publishMode === 'phone' && (
              <div className="absolute top-2.5 left-3 right-3 bg-studio-900/80 backdrop-blur-md rounded-full py-0.5 px-2.5 flex items-center justify-between text-[9px] text-studio-200 border border-studio-700/60 z-20">
                <span className="flex items-center gap-1 text-cyan-400 font-semibold truncate">
                  <Smartphone size={10} />
                  {devices.find((d) => d.id === selectedDeviceId)?.model || 'Android Phone'}
                </span>
                <span className="text-emerald-400 text-[8px] font-mono shrink-0">ADB READY</span>
              </div>
            )}

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
                <span className="text-xs font-bold flex items-center gap-1">
                  {publishMode === 'phone' ? (
                    <>
                      <Smartphone size={11} className="text-cyan-400 shrink-0" />
                      @{devices.find((d) => d.id === selectedDeviceId)?.model?.replace(/\s+/g, '_').toLowerCase() || 'phone_creator'}
                    </>
                  ) : (
                    `@${accounts.find((a) => a.id === selectedAccountId)?.accountName || 'creator'}`
                  )}
                </span>
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
