import { appDb } from '../db';
import { StoryProject, Scene } from '../../../shared/types';

export class ProjectRepository {
  private schemaChecked = false;

  private ensureSchema(): void {
    if (this.schemaChecked) return;
    try {
      const db = appDb.getRawDb();
      const projectCols = [
        "metadata TEXT NOT NULL DEFAULT '{}'",
        "selected_character_ids TEXT NOT NULL DEFAULT '[]'",
        "story_idea TEXT NOT NULL DEFAULT ''",
        "target_audience TEXT NOT NULL DEFAULT 'Young Adults'",
        "platform TEXT NOT NULL DEFAULT 'tiktok'",
        "story_tone TEXT NOT NULL DEFAULT 'engaging'",
        "custom_instructions TEXT NOT NULL DEFAULT ''",
        "ending_hook TEXT NOT NULL DEFAULT ''",
        "final_video_path TEXT",
        "current_step INTEGER NOT NULL DEFAULT 1",
      ];
      for (const col of projectCols) {
        try {
          db.exec(`ALTER TABLE projects ADD COLUMN ${col};`);
        } catch {}
      }

      const sceneCols = [
        "title TEXT NOT NULL DEFAULT ''",
        "visual_description TEXT NOT NULL DEFAULT ''",
        "camera_angle TEXT NOT NULL DEFAULT ''",
        "lighting TEXT NOT NULL DEFAULT ''",
        "actions TEXT NOT NULL DEFAULT ''",
        "environment TEXT NOT NULL DEFAULT ''",
        "sound_effect_suggestion TEXT NOT NULL DEFAULT ''",
        "negative_prompt TEXT NOT NULL DEFAULT ''",
        "audio_path TEXT",
      ];
      for (const col of sceneCols) {
        try {
          db.exec(`ALTER TABLE scenes ADD COLUMN ${col};`);
        } catch {}
      }
      this.schemaChecked = true;
    } catch {}
  }

  private mapProjectRow(r: any): StoryProject {
    let metadata: Record<string, any> = {};
    try {
      if (r.metadata) {
        metadata = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata;
      }
    } catch {}

    let selectedCharacterIds: string[] = [];
    try {
      if (r.selected_character_ids) {
        selectedCharacterIds = typeof r.selected_character_ids === 'string'
          ? JSON.parse(r.selected_character_ids)
          : r.selected_character_ids;
      } else if (metadata.selectedCharacterIds) {
        selectedCharacterIds = metadata.selectedCharacterIds;
      }
    } catch {}

    return {
      id: r.id,
      title: r.title,
      genre: r.genre || 'mystery',
      aspectRatio: r.aspect_ratio || r.aspectRatio || '9:16',
      targetDuration: r.target_duration !== undefined ? r.target_duration : (r.targetDuration || 60),
      language: r.language || 'en',
      voice: r.voice || 'en-US-Standard-C',
      status: r.status || 'draft',
      hook: r.hook || '',
      intro: r.intro || '',
      climax: r.climax || '',
      ending: r.ending || '',
      endingHook: r.ending_hook || metadata.endingHook || '',
      continuityNotes: r.continuity_notes || r.continuityNotes || '',
      selectedCharacterIds,
      storyIdea: r.story_idea || metadata.storyIdea || '',
      targetAudience: r.target_audience || metadata.targetAudience || 'Young Adults',
      platform: r.platform || metadata.platform || 'tiktok',
      storyTone: r.story_tone || metadata.storyTone || 'engaging',
      customInstructions: r.custom_instructions || metadata.customInstructions || '',
      finalVideoPath: r.final_video_path || metadata.finalVideoPath || undefined,
      currentStep: r.current_step !== undefined ? r.current_step : (metadata.currentStep || 1),
      voiceSettings: metadata.voiceSettings,
      musicSettings: metadata.musicSettings,
      soundEffects: metadata.soundEffects,
      subtitlesSettings: metadata.subtitlesSettings,
      metadata,
      createdAt: r.created_at || r.createdAt,
      updatedAt: r.updated_at || r.updatedAt,
      scenes: this.getScenes(r.id),
    };
  }

  private mapSceneRow(s: any): Scene {
    return {
      id: s.id,
      projectId: s.project_id || s.projectId,
      sceneNumber: s.scene_number !== undefined ? s.scene_number : s.sceneNumber,
      title: s.title || `Scene ${s.scene_number || s.sceneNumber}`,
      scriptText: s.script_text || s.scriptText || '',
      narration: s.narration || '',
      characterId: s.character_id || s.characterId || undefined,
      characterName: s.characterName || undefined,
      referenceImagePath: s.reference_image_path || s.referenceImagePath || undefined,
      generationPrompt: s.generation_prompt || s.generationPrompt || '',
      duration: s.duration || 5.0,
      videoPath: s.video_path || s.videoPath || undefined,
      audioPath: s.audio_path || s.audioPath || undefined,
      visualDescription: s.visual_description || s.visualDescription || '',
      cameraAngle: s.camera_angle || s.cameraAngle || '',
      lighting: s.lighting || '',
      actions: s.actions || '',
      environment: s.environment || '',
      soundEffectSuggestion: s.sound_effect_suggestion || s.soundEffectSuggestion || '',
      negativePrompt: s.negative_prompt || s.negativePrompt || '',
      status: s.status || 'draft',
      error: s.error || undefined,
    };
  }

  public getAll(): StoryProject[] {
    this.ensureSchema();
    const db = appDb.getRawDb();
    const rows = db.prepare(`
      SELECT *
      FROM projects
      ORDER BY updated_at DESC
    `).all() as any[];

    return rows.map(r => this.mapProjectRow(r));
  }

  public getById(id: string): StoryProject | null {
    this.ensureSchema();
    const db = appDb.getRawDb();
    const r = db.prepare(`
      SELECT *
      FROM projects
      WHERE id = ?
    `).get(id) as any;

    if (!r) return null;
    return this.mapProjectRow(r);
  }

  public getScenes(projectId: string): Scene[] {
    this.ensureSchema();
    const db = appDb.getRawDb();
    const rows = db.prepare(`
      SELECT s.*, c.name as characterName
      FROM scenes s
      LEFT JOIN characters c ON s.character_id = c.id
      WHERE s.project_id = ?
      ORDER BY s.scene_number ASC
    `).all(projectId) as any[];

    return rows.map(s => this.mapSceneRow(s));
  }

  public create(project: Omit<StoryProject, 'id' | 'createdAt' | 'updatedAt' | 'scenes'>): StoryProject {
    this.ensureSchema();
    const db = appDb.getRawDb();
    const id = 'proj_' + Math.random().toString(36).substring(2, 11);

    const metadataObj: Record<string, any> = {
      ...(project.metadata || {}),
      voiceSettings: project.voiceSettings,
      musicSettings: project.musicSettings,
      soundEffects: project.soundEffects,
      subtitlesSettings: project.subtitlesSettings,
      currentStep: project.currentStep || 1,
      storyIdea: project.storyIdea || '',
      targetAudience: project.targetAudience || 'Young Adults',
      platform: project.platform || 'tiktok',
      storyTone: project.storyTone || 'engaging',
      customInstructions: project.customInstructions || '',
      selectedCharacterIds: project.selectedCharacterIds || [],
      endingHook: project.endingHook || '',
    };

    const stmt = db.prepare(`
      INSERT INTO projects (
        id, title, genre, aspect_ratio, target_duration, language, voice, status,
        hook, intro, climax, ending, ending_hook, continuity_notes,
        metadata, selected_character_ids, story_idea, target_audience,
        platform, story_tone, custom_instructions, final_video_path, current_step,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        datetime('now'), datetime('now')
      )
    `);

    stmt.run(
      id,
      project.title,
      project.genre || 'mystery',
      project.aspectRatio || '9:16',
      project.targetDuration || 60,
      project.language || 'en',
      project.voice || 'en-US-Standard-C',
      project.status || 'draft',
      project.hook || '',
      project.intro || '',
      project.climax || '',
      project.ending || '',
      project.endingHook || '',
      project.continuityNotes || '',
      JSON.stringify(metadataObj),
      JSON.stringify(project.selectedCharacterIds || []),
      project.storyIdea || '',
      project.targetAudience || 'Young Adults',
      project.platform || 'tiktok',
      project.storyTone || 'engaging',
      project.customInstructions || '',
      project.finalVideoPath || null,
      project.currentStep || 1
    );

    return this.getById(id)!;
  }

  public update(id: string, updates: Partial<StoryProject>): StoryProject {
    this.ensureSchema();
    const db = appDb.getRawDb();
    const current = this.getById(id);
    if (!current) throw new Error(`Project not found: ${id}`);

    const newObj: StoryProject = { ...current, ...updates };

    const metadataObj: Record<string, any> = {
      ...(newObj.metadata || {}),
      voiceSettings: newObj.voiceSettings,
      musicSettings: newObj.musicSettings,
      soundEffects: newObj.soundEffects,
      subtitlesSettings: newObj.subtitlesSettings,
      currentStep: newObj.currentStep || 1,
      storyIdea: newObj.storyIdea || '',
      targetAudience: newObj.targetAudience || 'Young Adults',
      platform: newObj.platform || 'tiktok',
      storyTone: newObj.storyTone || 'engaging',
      customInstructions: newObj.customInstructions || '',
      selectedCharacterIds: newObj.selectedCharacterIds || [],
      endingHook: newObj.endingHook || '',
      finalVideoPath: newObj.finalVideoPath,
    };

    const stmt = db.prepare(`
      UPDATE projects
      SET title = ?, genre = ?, aspect_ratio = ?, target_duration = ?,
          language = ?, voice = ?, status = ?, hook = ?, intro = ?,
          climax = ?, ending = ?, ending_hook = ?, continuity_notes = ?,
          metadata = ?, selected_character_ids = ?, story_idea = ?, target_audience = ?,
          platform = ?, story_tone = ?, custom_instructions = ?, final_video_path = ?,
          current_step = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(
      newObj.title,
      newObj.genre,
      newObj.aspectRatio,
      newObj.targetDuration,
      newObj.language,
      newObj.voice,
      newObj.status,
      newObj.hook,
      newObj.intro,
      newObj.climax,
      newObj.ending,
      newObj.endingHook || '',
      newObj.continuityNotes,
      JSON.stringify(metadataObj),
      JSON.stringify(newObj.selectedCharacterIds || []),
      newObj.storyIdea || '',
      newObj.targetAudience || 'Young Adults',
      newObj.platform || 'tiktok',
      newObj.storyTone || 'engaging',
      newObj.customInstructions || '',
      newObj.finalVideoPath || null,
      newObj.currentStep || 1,
      id
    );

    return this.getById(id)!;
  }

  public delete(id: string): boolean {
    const db = appDb.getRawDb();
    try {
      db.prepare('DELETE FROM scenes WHERE project_id = ?').run(id);
    } catch {}
    try {
      db.prepare('DELETE FROM story_versions WHERE project_id = ?').run(id);
    } catch {}
    try {
      db.prepare('UPDATE media_assets SET project_id = NULL WHERE project_id = ?').run(id);
    } catch {}
    const res = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return res.changes > 0;
  }

  public createScene(scene: Omit<Scene, 'id'>): Scene {
    this.ensureSchema();
    const db = appDb.getRawDb();
    const id = 'scene_' + Math.random().toString(36).substring(2, 11);

    const stmt = db.prepare(`
      INSERT INTO scenes (
        id, project_id, scene_number, title, script_text, narration, character_id,
        reference_image_path, generation_prompt, duration, video_path, audio_path,
        visual_description, camera_angle, lighting, actions, environment,
        sound_effect_suggestion, negative_prompt, status, error,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        datetime('now'), datetime('now')
      )
    `);

    stmt.run(
      id,
      scene.projectId,
      scene.sceneNumber,
      scene.title || `Scene ${scene.sceneNumber}`,
      scene.scriptText || '',
      scene.narration || '',
      scene.characterId || null,
      scene.referenceImagePath || null,
      scene.generationPrompt || '',
      scene.duration || 5.0,
      scene.videoPath || null,
      scene.audioPath || null,
      scene.visualDescription || '',
      scene.cameraAngle || '',
      scene.lighting || '',
      scene.actions || '',
      scene.environment || '',
      scene.soundEffectSuggestion || '',
      scene.negativePrompt || '',
      scene.status || 'draft',
      scene.error || null
    );

    return this.getSceneById(id)!;
  }

  public getSceneById(id: string): Scene | null {
    this.ensureSchema();
    const db = appDb.getRawDb();
    const row = db.prepare(`
      SELECT s.*, c.name as characterName
      FROM scenes s
      LEFT JOIN characters c ON s.character_id = c.id
      WHERE s.id = ?
    `).get(id) as any;

    return row ? this.mapSceneRow(row) : null;
  }

  public updateScene(id: string, updates: Partial<Scene>): Scene {
    this.ensureSchema();
    const db = appDb.getRawDb();
    const current = this.getSceneById(id);
    if (!current) throw new Error(`Scene not found: ${id}`);

    const newObj: Scene = { ...current, ...updates };
    const stmt = db.prepare(`
      UPDATE scenes
      SET scene_number = ?, title = ?, script_text = ?, narration = ?, character_id = ?,
          reference_image_path = ?, generation_prompt = ?, duration = ?,
          video_path = ?, audio_path = ?, visual_description = ?, camera_angle = ?,
          lighting = ?, actions = ?, environment = ?, sound_effect_suggestion = ?,
          negative_prompt = ?, status = ?, error = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(
      newObj.sceneNumber,
      newObj.title || `Scene ${newObj.sceneNumber}`,
      newObj.scriptText,
      newObj.narration,
      newObj.characterId || null,
      newObj.referenceImagePath || null,
      newObj.generationPrompt,
      newObj.duration,
      newObj.videoPath || null,
      newObj.audioPath || null,
      newObj.visualDescription || '',
      newObj.cameraAngle || '',
      newObj.lighting || '',
      newObj.actions || '',
      newObj.environment || '',
      newObj.soundEffectSuggestion || '',
      newObj.negativePrompt || '',
      newObj.status,
      newObj.error || null,
      id
    );

    return this.getSceneById(id)!;
  }

  public deleteScene(id: string): boolean {
    const db = appDb.getRawDb();
    const res = db.prepare('DELETE FROM scenes WHERE id = ?').run(id);
    return res.changes > 0;
  }

  public reorderScenes(projectId: string, sceneIds: string[]): boolean {
    const db = appDb.getRawDb();
    const stmt = db.prepare('UPDATE scenes SET scene_number = ? WHERE id = ? AND project_id = ?');
    db.transaction(() => {
      sceneIds.forEach((id, index) => {
        stmt.run(index + 1, id, projectId);
      });
    })();
    return true;
  }
}

export const projectRepo = new ProjectRepository();
