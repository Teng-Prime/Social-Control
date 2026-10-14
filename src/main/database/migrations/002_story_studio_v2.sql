-- Migration: 002_story_studio_v2
-- Extend projects and scenes for AI Story Studio 7-step workflow

ALTER TABLE projects ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}';
ALTER TABLE projects ADD COLUMN selected_character_ids TEXT NOT NULL DEFAULT '[]';
ALTER TABLE projects ADD COLUMN story_idea TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN target_audience TEXT NOT NULL DEFAULT 'Young Adults';
ALTER TABLE projects ADD COLUMN platform TEXT NOT NULL DEFAULT 'tiktok';
ALTER TABLE projects ADD COLUMN story_tone TEXT NOT NULL DEFAULT 'engaging';
ALTER TABLE projects ADD COLUMN custom_instructions TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN final_video_path TEXT;
ALTER TABLE projects ADD COLUMN current_step INTEGER NOT NULL DEFAULT 1;

ALTER TABLE scenes ADD COLUMN title TEXT NOT NULL DEFAULT '';
ALTER TABLE scenes ADD COLUMN visual_description TEXT NOT NULL DEFAULT '';
ALTER TABLE scenes ADD COLUMN camera_angle TEXT NOT NULL DEFAULT '';
ALTER TABLE scenes ADD COLUMN lighting TEXT NOT NULL DEFAULT '';
ALTER TABLE scenes ADD COLUMN actions TEXT NOT NULL DEFAULT '';
ALTER TABLE scenes ADD COLUMN environment TEXT NOT NULL DEFAULT '';
ALTER TABLE scenes ADD COLUMN sound_effect_suggestion TEXT NOT NULL DEFAULT '';
ALTER TABLE scenes ADD COLUMN negative_prompt TEXT NOT NULL DEFAULT '';
ALTER TABLE scenes ADD COLUMN audio_path TEXT;
