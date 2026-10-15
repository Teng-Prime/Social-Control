-- Migration: 004_phone_accounts_and_playstore
-- Stores account credentials for phone apps (Google, Facebook, TikTok, YouTube)

CREATE TABLE IF NOT EXISTS phone_account_credentials (
  id TEXT PRIMARY KEY,
  device_id TEXT,
  platform TEXT NOT NULL,
  identifier TEXT NOT NULL,
  password TEXT,
  two_factor_secret TEXT,
  notes TEXT,
  last_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_phone_acc_platform ON phone_account_credentials(platform);
CREATE INDEX IF NOT EXISTS idx_phone_acc_device ON phone_account_credentials(device_id);
