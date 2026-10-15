import React from 'react';
import {
  Share2,
  Shield,
  Lock,
  Sparkles,
} from 'lucide-react';
import { GoogleConnectCard } from '../../components/google/GoogleConnectCard';

export const SocialAccountsView: React.FC = () => {
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
                Connected Accounts & Authentication
              </h2>
              <p className="text-xs text-studio-300 mt-0.5">
                Official Google OAuth 2.0 PKCE authentication and credentials management.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-studio-300 bg-[#081633] px-3.5 py-2 rounded-xl border border-[rgba(91,145,255,0.2)]">
          <Shield size={14} className="text-emerald-400" />
          <span>OAuth 2.0 & OS Vault Encryption (DPAPI)</span>
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
            Social Earnings Studio never asks for or stores account passwords. All authentication uses official Google OAuth 2.0 PKCE authorization tokens with cryptographic signatures, secured exclusively inside your operating system's native encrypted credential store.
          </p>
        </div>
      </div>

      {/* Official Google OAuth 2.0 Connection Card */}
      <GoogleConnectCard />
    </div>
  );
};

export default SocialAccountsView;
