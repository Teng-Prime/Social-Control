import React from 'react';
import {
  Share2,
  Shield,
  Lock,
} from 'lucide-react';
import { GoogleConnectCard } from '../../components/google/GoogleConnectCard';

export const SocialAccountsView: React.FC = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 select-none overflow-y-auto h-full">
      <div className="flex items-center justify-between pb-4 border-b border-studio-800">
        <div>
          <h2 className="text-xl font-bold text-studio-100 flex items-center gap-2">
            <Share2 className="text-brand-400" size={22} />
            Connected Accounts & Google Sign-In
          </h2>
          <p className="text-xs text-studio-400 mt-1">
            Official Google OAuth 2.0 PKCE authentication with native OS credential encryption.
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
            Social Earnings Studio never asks for or stores passwords. All authentication utilizes official OAuth 2.0 PKCE tokens secured exclusively via your operating system's native encrypted credential store.
          </p>
        </div>
      </div>

      {/* Official Google OAuth 2.0 Connection Card */}
      <GoogleConnectCard />
    </div>
  );
};
