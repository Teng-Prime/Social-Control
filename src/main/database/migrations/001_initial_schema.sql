-- Initial database schema for Social Earnings Studio
-- Migration: 001_initial_schema

CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 1. settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

-- 3. social_accounts table (Non-sensitive metadata only. Secrets stored in secureStorage)
CREATE TABLE IF NOT EXISTS social_accounts (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL, -- 'youtube' | 'facebook' | 'tiktok'
  account_name TEXT NOT NULL,
  avatar_url TEXT,
  channel_id TEXT,
  is_connected INTEGER NOT NULL DEFAULT 1,
  permissions TEXT NOT NULL DEFAULT '[]', -- JSON array
  token_expiry TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. characters table
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  appearance TEXT NOT NULL DEFAULT '',
  clothing TEXT NOT NULL DEFAULT '',
  age_range TEXT NOT NULL DEFAULT '',
  personality TEXT NOT NULL DEFAULT '',
  voice TEXT NOT NULL DEFAULT '',
  visual_style TEXT NOT NULL DEFAULT '',
  is_locked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. character_references table
CREATE TABLE IF NOT EXISTS character_references (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  image_path TEXT NOT NULL,
  prompt TEXT NOT NULL DEFAULT '',
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_char_refs_character ON character_references(character_id);

-- 6. projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  genre TEXT NOT NULL DEFAULT 'mystery',
  aspect_ratio TEXT NOT NULL DEFAULT '9:16',
  target_duration INTEGER NOT NULL DEFAULT 60,
  language TEXT NOT NULL DEFAULT 'en',
  voice TEXT NOT NULL DEFAULT 'en-US-Standard-A',
  status TEXT NOT NULL DEFAULT 'draft',
  hook TEXT NOT NULL DEFAULT '',
  intro TEXT NOT NULL DEFAULT '',
  climax TEXT NOT NULL DEFAULT '',
  ending TEXT NOT NULL DEFAULT '',
  continuity_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. story_versions table (Script versions for history and rollback)
CREATE TABLE IF NOT EXISTS story_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  script_content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 8. scenes table
CREATE TABLE IF NOT EXISTS scenes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scene_number INTEGER NOT NULL,
  script_text TEXT NOT NULL DEFAULT '',
  narration TEXT NOT NULL DEFAULT '',
  character_id TEXT,
  reference_image_path TEXT,
  generation_prompt TEXT NOT NULL DEFAULT '',
  duration REAL NOT NULL DEFAULT 5.0,
  video_path TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_scenes_project_order ON scenes(project_id, scene_number ASC);

-- 9. media_assets table
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  duration REAL NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 1080,
  height INTEGER NOT NULL DEFAULT 1920,
  aspect_ratio TEXT NOT NULL DEFAULT '9:16',
  format TEXT NOT NULL DEFAULT 'mp4',
  thumbnail_path TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]', -- JSON array
  folder TEXT NOT NULL DEFAULT 'Drafts', -- 'Drafts' | 'ReadyToPublish' | 'Published'
  is_favorite INTEGER NOT NULL DEFAULT 0,
  project_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_media_folder ON media_assets(folder);

-- 10. captions table (Templates and generated captions)
CREATE TABLE IF NOT EXISTS captions (
  id TEXT PRIMARY KEY,
  media_asset_id TEXT,
  target_platform TEXT NOT NULL,
  title TEXT NOT NULL,
  caption TEXT NOT NULL,
  hashtags TEXT NOT NULL DEFAULT '[]', -- JSON array
  pinned_comment TEXT,
  thumbnail_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (media_asset_id) REFERENCES media_assets(id) ON DELETE CASCADE
);

-- 11. publish_jobs table
CREATE TABLE IF NOT EXISTS publish_jobs (
  id TEXT PRIMARY KEY,
  media_asset_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  account_id TEXT NOT NULL,
  title TEXT NOT NULL,
  caption TEXT NOT NULL,
  hashtags TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  privacy TEXT NOT NULL DEFAULT 'public',
  scheduled_for TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
  progress REAL NOT NULL DEFAULT 0.0,
  remote_post_id TEXT,
  remote_post_url TEXT,
  error_message TEXT,
  ai_disclosure INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (media_asset_id) REFERENCES media_assets(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES social_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_publish_status ON publish_jobs(status);

-- 12. published_posts table (Permanent publish history and analytics linkage)
CREATE TABLE IF NOT EXISTS published_posts (
  id TEXT PRIMARY KEY,
  publish_job_id TEXT NOT NULL,
  media_asset_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  account_id TEXT NOT NULL,
  remote_post_id TEXT NOT NULL,
  remote_post_url TEXT NOT NULL,
  title TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  watch_time_seconds REAL NOT NULL DEFAULT 0,
  last_analytics_sync TEXT,
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (publish_job_id) REFERENCES publish_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (media_asset_id) REFERENCES media_assets(id) ON DELETE CASCADE
);

-- 13. devices table (Android ADB devices & emulators)
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  serial TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL DEFAULT 'Unknown Device',
  android_version TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'disconnected',
  battery_level INTEGER,
  available_storage_mb INTEGER,
  total_storage_mb INTEGER,
  installed_apps TEXT NOT NULL DEFAULT '[]', -- JSON array
  last_connected_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 14. transfer_jobs table (PC to Android file transfers)
CREATE TABLE IF NOT EXISTS transfer_jobs (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  source_file_path TEXT NOT NULL,
  destination_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  transferred_bytes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- 15. generation_jobs table (Image and video generation tracking)
CREATE TABLE IF NOT EXISTS generation_jobs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  job_type TEXT NOT NULL, -- 'character_ref' | 'scene_video' | 'audio'
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  output_path TEXT,
  cost_estimate REAL DEFAULT 0.0,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

-- 16. task_queue table (Persistent async queue across application restarts)
CREATE TABLE IF NOT EXISTS task_queue (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'character_gen' | 'video_gen' | 'video_render' | 'file_transfer' | 'caption_gen' | 'upload' | 'publishing'
  title TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}', -- JSON string
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress REAL NOT NULL DEFAULT 0.0,
  priority INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_task_queue_status_prio ON task_queue(status, priority DESC, created_at ASC);
