-- Migration: 003_mobile_publishing_suite
-- Complete mobile publishing workflow from PC to Android phone

-- 1. Extend media_assets with mobile workflow and transfer tracking
ALTER TABLE media_assets ADD COLUMN workflow_status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE media_assets ADD COLUMN transfer_status TEXT NOT NULL DEFAULT 'not_transferred';
ALTER TABLE media_assets ADD COLUMN phone_path TEXT;
ALTER TABLE media_assets ADD COLUMN target_platform TEXT;
ALTER TABLE media_assets ADD COLUMN caption_text TEXT;
ALTER TABLE media_assets ADD COLUMN hashtags_text TEXT NOT NULL DEFAULT '[]';

-- 2. Extend social_accounts with email association and Facebook Page fields
ALTER TABLE social_accounts ADD COLUMN email TEXT;
ALTER TABLE social_accounts ADD COLUMN selected_page_id TEXT;
ALTER TABLE social_accounts ADD COLUMN selected_page_name TEXT;

-- 3. Extend publish_jobs with workflow stages and phone details
ALTER TABLE publish_jobs ADD COLUMN workflow_stage TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE publish_jobs ADD COLUMN phone_destination_path TEXT;
ALTER TABLE publish_jobs ADD COLUMN confirmed_published_at TEXT;
ALTER TABLE publish_jobs ADD COLUMN selected_page_id TEXT;
ALTER TABLE publish_jobs ADD COLUMN selected_page_name TEXT;
ALTER TABLE publish_jobs ADD COLUMN associated_email TEXT;

-- 4. Transfer records table with checksum verification & Android media scan
CREATE TABLE IF NOT EXISTS transfer_records (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  media_asset_id TEXT,
  file_name TEXT NOT NULL,
  source_path TEXT NOT NULL,
  destination_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  transferred_bytes INTEGER NOT NULL DEFAULT 0,
  speed_bps INTEGER NOT NULL DEFAULT 0,
  checksum TEXT,
  is_verified INTEGER NOT NULL DEFAULT 0,
  media_scan_triggered INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  FOREIGN KEY (media_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_transfer_records_status ON transfer_records(status);

-- 5. Account email management (separate from passwords, stores verified email identity)
CREATE TABLE IF NOT EXISTS account_emails (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  email TEXT NOT NULL,
  platform TEXT NOT NULL,
  is_verified INTEGER NOT NULL DEFAULT 0,
  last_otp_requested_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (account_id) REFERENCES social_accounts(id) ON DELETE CASCADE
);
