import React, { useEffect, useState } from 'react';
import {
  Share2,
  Shield,
  Lock,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ExternalLink,
  Layers,
  Facebook,
  Video,
  Check,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import { GoogleConnectCard } from '../../components/google/GoogleConnectCard';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useAppStore } from '../../stores/useAppStore';
import { SocialAccount, SocialPlatform } from '../../../../shared/types';

export const SocialAccountsView: React.FC = () => {
  const { addToast } = useAppStore();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlatformTab, setSelectedPlatformTab] = useState<'all' | SocialPlatform>('all');

  // Add Account Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAccountPlatform, setNewAccountPlatform] = useState<SocialPlatform>('tiktok');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [newPageId, setNewPageId] = useState('');
  const [newPageName, setNewPageName] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // OTP Verification Modal
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [targetAccountForOtp, setTargetAccountForOtp] = useState<SocialAccount | null>(null);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);

  // Facebook Page Modal
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [targetAccountForPage, setTargetAccountForPage] = useState<SocialAccount | null>(null);
  const [pageIdInput, setPageIdInput] = useState('');
  const [pageNameInput, setPageNameInput] = useState('');
  const [isSubmittingPage, setIsSubmittingPage] = useState(false);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      if (window.api?.getSocialAccounts) {
        const accs = await window.api.getSocialAccounts();
        setAccounts(accs);
      }
    } catch (err: any) {
      console.warn('Failed to fetch social accounts', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) {
      addToast({ type: 'warn', title: 'Account name required' });
      return;
    }

    setIsSubmittingNew(true);
    try {
      if (window.api?.createSocialAccount) {
        await window.api.createSocialAccount({
          platform: newAccountPlatform,
          accountName: newAccountName.trim(),
          email: newAccountEmail.trim() || undefined,
          selectedPageId: newAccountPlatform === 'facebook' && newPageId.trim() ? newPageId.trim() : undefined,
          selectedPageName: newAccountPlatform === 'facebook' && newPageName.trim() ? newPageName.trim() : undefined,
        });

        addToast({
          type: 'success',
          title: 'Account Profile Added',
          message: `${newAccountName} registered for ${newAccountPlatform.toUpperCase()}`,
        });

        setIsAddModalOpen(false);
        setNewAccountName('');
        setNewAccountEmail('');
        setNewPageId('');
        setNewPageName('');
        fetchAccounts();
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to create account', message: err.message });
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      if (window.api?.deleteSocialAccount) {
        await window.api.deleteSocialAccount(id);
        addToast({ type: 'info', title: 'Account Removed', message: `${name} has been removed.` });
        fetchAccounts();
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Delete Failed', message: err.message });
    }
  };

  const handleOpenOtpModal = (acc: SocialAccount) => {
    setTargetAccountForOtp(acc);
    setOtpEmail(acc.email || '');
    setOtpCode('');
    setIsOtpModalOpen(true);
  };

  const handleSubmitOtp = async () => {
    if (!targetAccountForOtp || !otpEmail.trim() || !otpCode.trim()) {
      addToast({ type: 'warn', title: 'Email and OTP code are required' });
      return;
    }

    setIsSubmittingOtp(true);
    try {
      if (window.api?.submitAccountOtp) {
        const res = await window.api.submitAccountOtp({
          accountId: targetAccountForOtp.id,
          email: otpEmail.trim(),
          otpCode: otpCode.trim(),
          platform: targetAccountForOtp.platform,
        });

        if (res.success) {
          addToast({
            type: 'success',
            title: 'Account Verified with OTP',
            message: res.message,
          });
          setIsOtpModalOpen(false);
          fetchAccounts();
        } else {
          addToast({
            type: 'error',
            title: 'OTP Verification Notice',
            message: res.message,
          });
        }
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Verification Error', message: err.message });
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  const handleOpenPageModal = (acc: SocialAccount) => {
    setTargetAccountForPage(acc);
    setPageIdInput(acc.selectedPageId || '');
    setPageNameInput(acc.selectedPageName || '');
    setIsPageModalOpen(true);
  };

  const handleSubmitPage = async () => {
    if (!targetAccountForPage || !pageIdInput.trim() || !pageNameInput.trim()) {
      addToast({ type: 'warn', title: 'Page ID and Page Name are required' });
      return;
    }

    setIsSubmittingPage(true);
    try {
      if (window.api?.updateSocialAccountPage) {
        await window.api.updateSocialAccountPage(
          targetAccountForPage.id,
          pageIdInput.trim(),
          pageNameInput.trim()
        );

        addToast({
          type: 'success',
          title: 'Facebook Page Assigned',
          message: `Target page set to: ${pageNameInput.trim()}`,
        });

        setIsPageModalOpen(false);
        fetchAccounts();
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Page Assignment Failed', message: err.message });
    } finally {
      setIsSubmittingPage(false);
    }
  };

  const filteredAccounts = accounts.filter(
    (a) => selectedPlatformTab === 'all' || a.platform === selectedPlatformTab
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 select-none overflow-y-auto h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[rgba(91,145,255,0.18)]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white">
              <Share2 size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Connected Social Accounts & Verification
              </h2>
              <p className="text-xs text-studio-300 mt-0.5">
                Official Google OAuth 2.0 PKCE, YouTube, TikTok, and Facebook Pages multi-account manager.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />}
            onClick={fetchAccounts}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Profile
          </Button>
        </div>
      </div>

      {/* Security Notice Box */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-cyan-500/10 border border-brand-500/30 backdrop-blur-md flex items-start gap-3.5 shadow-lg shadow-brand-500/5">
        <div className="w-8 h-8 rounded-xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center shrink-0 text-brand-300">
          <Lock size={16} />
        </div>
        <div className="text-xs space-y-1">
          <span className="font-semibold text-white flex items-center gap-1.5">
            Zero Password Storage Architecture
            <Sparkles size={13} className="text-cyan-400" />
          </span>
          <p className="text-studio-300 leading-relaxed text-[11px]">
            Social Earnings Studio never asks for or stores account passwords. Verification uses secure loopback OAuth 2.0 PKCE and manual OTP verification codes without storing credential secrets on disk.
          </p>
        </div>
      </div>

      {/* Official Google OAuth 2.0 Connection Card */}
      <GoogleConnectCard />

      {/* Multi-Account Profiles Section */}
      <Card
        title="Social Media Accounts & Publishing Targets"
        subtitle="Manage profiles for YouTube Shorts, TikTok, and Facebook Pages / Meta Business Suite"
        action={
          <div className="flex bg-[#081633] p-1 rounded-xl border border-[rgba(91,145,255,0.2)] text-xs">
            {(['all', 'youtube', 'tiktok', 'facebook'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedPlatformTab(tab)}
                className={`px-3 py-1 rounded-lg capitalize font-medium transition-all ${
                  selectedPlatformTab === tab
                    ? 'bg-gradient-to-r from-brand-500 to-cyan-500 text-white shadow-[0_0_12px_rgba(8,123,255,0.4)]'
                    : 'text-studio-400 hover:text-studio-100 hover:bg-[#102A50]/60'
                }`}
              >
                {tab === 'all' ? 'All' : tab}
              </button>
            ))}
          </div>
        }
      >
        {filteredAccounts.length > 0 ? (
          <div className="space-y-3">
            {filteredAccounts.map((acc) => (
              <div
                key={acc.id}
                className="p-4 rounded-xl bg-[#081633]/70 border border-[rgba(91,145,255,0.18)] hover:border-brand-500/40 hover:bg-[#102A50]/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs shadow-subtle"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#102A50] border border-[rgba(91,145,255,0.2)] flex items-center justify-center shrink-0 text-cyan-400">
                    {acc.platform === 'youtube' ? (
                      <Video size={18} />
                    ) : acc.platform === 'tiktok' ? (
                      <Sparkles size={18} />
                    ) : (
                      <Facebook size={18} />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-studio-100 text-sm">{acc.accountName}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-studio-800 text-studio-300">
                        {acc.platform}
                      </span>
                      {acc.isConnected ? (
                        <Badge variant="success" size="sm" dot>Connected</Badge>
                      ) : (
                        <Badge variant="warning" size="sm">Configured</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-studio-400">
                      {acc.email ? (
                        <span className="flex items-center gap-1 font-mono text-studio-200">
                          ✉ {acc.email}
                        </span>
                      ) : (
                        <span className="text-amber-400/80">No email associated</span>
                      )}

                      {acc.platform === 'facebook' && (
                        <span className="flex items-center gap-1 text-cyan-300">
                          📄 Page: <strong>{acc.selectedPageName || acc.selectedPageId || 'Not selected'}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<KeyRound size={13} className="text-cyan-400" />}
                    onClick={() => handleOpenOtpModal(acc)}
                    className="text-xs"
                  >
                    {acc.email ? 'Verify OTP' : 'Associate Email'}
                  </Button>

                  {acc.platform === 'facebook' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Layers size={13} className="text-brand-300" />}
                      onClick={() => handleOpenPageModal(acc)}
                      className="text-xs"
                    >
                      Target Page
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={13} className="text-rose-400" />}
                    onClick={() => handleDeleteAccount(acc.id, acc.accountName)}
                    className="text-rose-400 hover:bg-rose-950/30"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 px-4 bg-[#081633]/40 rounded-xl border border-dashed border-[rgba(91,145,255,0.18)]">
            <Share2 className="mx-auto text-cyan-400/60 mb-2" size={24} />
            <h4 className="text-sm font-semibold text-studio-100">No account profiles registered</h4>
            <p className="text-xs text-studio-400 max-w-sm mx-auto mt-1 mb-4">
              Register social profiles for YouTube Shorts, TikTok, or Facebook Pages to assign target channels and destinations.
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Add First Profile
            </Button>
          </div>
        )}
      </Card>

      {/* Add Account Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Social Media Profile"
        subtitle="Configure target channel or page destination without storing passwords"
        maxWidth="md"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isSubmittingNew}
              icon={<Check size={14} />}
              onClick={handleCreateAccount}
            >
              Save Profile
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <Select
            label="Target Platform"
            value={newAccountPlatform}
            onChange={(e) => setNewAccountPlatform(e.target.value as SocialPlatform)}
            options={[
              { value: 'tiktok', label: 'TikTok' },
              { value: 'youtube', label: 'YouTube Shorts' },
              { value: 'facebook', label: 'Facebook Pages / Meta Business Suite' },
            ]}
          />

          <Input
            label="Account / Channel Name"
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            placeholder="e.g. Neon Odyssey Shorts, TechVanguard AI"
          />

          <Input
            label="Associated Email (Optional)"
            type="email"
            value={newAccountEmail}
            onChange={(e) => setNewAccountEmail(e.target.value)}
            placeholder="creator@example.com"
          />

          {newAccountPlatform === 'facebook' && (
            <div className="p-3 bg-[#081633] rounded-xl border border-[rgba(91,145,255,0.18)] space-y-3">
              <span className="font-semibold text-cyan-300 block">Facebook Page Configuration</span>
              <Input
                label="Facebook Page ID"
                value={newPageId}
                onChange={(e) => setNewPageId(e.target.value)}
                placeholder="e.g. 109283746523"
              />
              <Input
                label="Facebook Page Name"
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                placeholder="e.g. Official Studio Page"
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Manual OTP Verification Modal */}
      <Modal
        isOpen={isOtpModalOpen}
        onClose={() => setIsOtpModalOpen(false)}
        title="Manual OTP Verification"
        subtitle="Associate email and verify with one-time verification code (Zero Password Guarantee)"
        maxWidth="md"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsOtpModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isSubmittingOtp}
              icon={<CheckCircle2 size={14} />}
              onClick={handleSubmitOtp}
            >
              Verify OTP Code
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-brand-950/30 rounded-xl border border-brand-500/30 text-studio-300 text-[11px] leading-relaxed">
            <span className="font-semibold text-white block mb-1">
              Account: {targetAccountForOtp?.accountName} ({targetAccountForOtp?.platform.toUpperCase()})
            </span>
            Enter the 6-digit confirmation or login OTP code sent by your platform or verification service to authenticate this account safely.
          </div>

          <Input
            label="Associated Email Address"
            type="email"
            value={otpEmail}
            onChange={(e) => setOtpEmail(e.target.value)}
            placeholder="creator@company.com"
          />

          <Input
            label="6-Digit OTP Verification Code"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            placeholder="e.g. 849201"
            className="tracking-widest font-mono text-base"
          />
        </div>
      </Modal>

      {/* Target Facebook Page Modal */}
      <Modal
        isOpen={isPageModalOpen}
        onClose={() => setIsPageModalOpen(false)}
        title="Assign Target Facebook Page"
        subtitle="Select or update the Facebook Page asset for publishing Reels & Posts"
        maxWidth="md"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsPageModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isSubmittingPage}
              icon={<Check size={14} />}
              onClick={handleSubmitPage}
            >
              Update Target Page
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <Input
            label="Facebook Page Name"
            value={pageNameInput}
            onChange={(e) => setPageNameInput(e.target.value)}
            placeholder="e.g. TechVanguard Official Page"
          />

          <Input
            label="Facebook Page ID"
            value={pageIdInput}
            onChange={(e) => setPageIdInput(e.target.value)}
            placeholder="e.g. 1092837465"
          />

          <p className="text-[11px] text-studio-400">
            This target page ID will be used when launching Facebook or Meta Business Suite for direct upload staging on your connected phone.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default SocialAccountsView;
