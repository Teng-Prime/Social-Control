import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Share2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  RefreshCw,
  Plus,
  Trash2,
  Lock,
} from 'lucide-react';
import { SocialAccount, SocialPlatform } from '../../../shared/types';

export const SocialAccountsView: React.FC = () => {
  const { addToast } = useAppStore();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | null>(null);

  const fetchAccounts = async () => {
    if (window.api) {
      const list = await window.api.getSocialAccounts();
      setAccounts(list);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleConnect = async (platform: SocialPlatform) => {
    setIsConnecting(true);
    try {
      if (window.api) {
        const res = await window.api.connectSocialAccount(platform);
        addToast({
          type: 'success',
          title: 'Account Authorized',
          message: `Connected ${res.account?.accountName || platform} via OAuth 2.0.`,
        });
        fetchAccounts();
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Connection Failed',
        message: err.message,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (window.api && window.confirm('Disconnect this account and wipe tokens from OS secure storage?')) {
      await window.api.disconnectSocialAccount(id);
      addToast({ type: 'info', title: 'Account disconnected' });
      fetchAccounts();
    }
  };

  const platforms: {
    id: SocialPlatform;
    name: string;
    description: string;
    badge: string;
    docsUrl: string;
  }[] = [
    {
      id: 'youtube',
      name: 'YouTube Channel',
      description: 'Upload YouTube Shorts and full videos directly via YouTube Data API v3.',
      badge: 'Official API v3',
      docsUrl: 'https://developers.google.com/youtube/v3',
    },
    {
      id: 'tiktok',
      name: 'TikTok Creator Account',
      description: 'Direct post and draft staging via TikTok Content Posting API.',
      badge: 'Content Posting API',
      docsUrl: 'https://developers.tiktok.com/docs/en/content-posting-api-get-started',
    },
    {
      id: 'facebook',
      name: 'Facebook Page / Reels',
      description: 'Publish video Reels and posts to managed Facebook Pages via Graph API.',
      badge: 'Graph API v19.0',
      docsUrl: 'https://developers.facebook.com/docs/video-api',
    },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 select-none overflow-y-auto h-full">
      <div className="flex items-center justify-between pb-4 border-b border-studio-800">
        <div>
          <h2 className="text-xl font-bold text-studio-100 flex items-center gap-2">
            <Share2 className="text-brand-400" size={22} />
            Connected Social Accounts
          </h2>
          <p className="text-xs text-studio-400 mt-1">
            Manage authorized publishing destinations for YouTube, TikTok, and Facebook.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-studio-400 bg-studio-850 px-3 py-1.5 rounded-lg border border-studio-800">
          <Shield size={14} className="text-emerald-400" />
          <span>OAuth 2.0 & OS Vault Encryption (DPAPI)</span>
        </div>
      </div>

      {/* Security Notice Box */}
      <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-start gap-3">
        <Lock className="text-brand-400 shrink-0 mt-0.5" size={18} />
        <div className="text-xs space-y-1">
          <span className="font-semibold text-studio-200">Zero Password Storage Guarantee</span>
          <p className="text-studio-400 leading-relaxed">
            Social Earnings Studio never asks for or stores social media passwords. All authentication utilizes official OAuth 2.0 tokens secured exclusively via your operating system's native encrypted credential store.
          </p>
        </div>
      </div>

      {/* Available Platform Connectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {platforms.map((p) => {
          const connectedForPlatform = accounts.filter((a) => a.platform === p.id && a.isConnected);

          return (
            <Card key={p.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="brand" size="sm">{p.badge}</Badge>
                  <button
                    onClick={() => window.api?.openExternalUrl(p.docsUrl)}
                    className="text-studio-500 hover:text-studio-300"
                    title="View API Docs"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>

                <h3 className="font-bold text-base text-studio-100 mb-1">{p.name}</h3>
                <p className="text-xs text-studio-400 mb-4 leading-relaxed">{p.description}</p>
              </div>

              <div>
                <div className="text-[11px] text-studio-400 mb-3">
                  Status:{' '}
                  {connectedForPlatform.length > 0 ? (
                    <span className="text-emerald-400 font-semibold">
                      {connectedForPlatform.length} Channel(s) Connected
                    </span>
                  ) : (
                    <span className="text-studio-500">Not Connected</span>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  icon={<Plus size={14} />}
                  loading={isConnecting}
                  onClick={() => handleConnect(p.id)}
                >
                  Connect {p.name.split(' ')[0]}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Connected Accounts List */}
      <Card title="Authorized Publishing Accounts" subtitle="Active token status and channel IDs">
        {accounts.length === 0 ? (
          <div className="text-center py-8 text-xs text-studio-500">
            No social accounts connected yet. Click "Connect" above to authorize a publishing channel.
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-4 rounded-xl bg-studio-900 border border-studio-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-studio-800 border border-studio-700 flex items-center justify-center font-bold text-studio-200">
                    {acc.platform[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-studio-100">{acc.accountName}</h4>
                      <Badge variant="success" size="sm" dot>
                        Connected
                      </Badge>
                      <span className="text-[10px] uppercase font-mono text-studio-500">{acc.platform}</span>
                    </div>
                    <p className="text-[11px] text-studio-500 mt-0.5">
                      Permissions: {acc.permissions.join(', ') || 'publish, read_insights'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Trash2 size={13} />}
                    onClick={() => handleDisconnect(acc.id)}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
