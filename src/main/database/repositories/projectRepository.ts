import { appDb } from '../db';
import { StoryProject, Scene } from '../../../shared/types';

export class ProjectRepository {
  public getAll(): StoryProject[] {
    const db = appDb.getRawDb();
    const rows = db.prepare(`
      SELECT id, title, genre, aspect_ratio as aspectRatio, target_duration as targetDuration,
             language, voice, status, hook, intro, climax, ending, continuity_notes as continuityNotes,
             created_at as createdAt, updated_at as updatedAt
      FROM projects
      ORDER BY updated_at DESC
    `).all() as any[];

    return rows.map(r => ({
      ...r,
      scenes: this.getScenes(r.id),
    }));
  }

  public getById(id: string): StoryProject | null {
    const db = appDb.getRawDb();
    const r = db.prepare(`
      SELECT id, title, genre, aspect_ratio as aspectRatio, target_duration as targetDuration,
             language, voice, status, hook, intro, climax, ending, continuity_notes as continuityNotes,
             created_at as createdAt, updated_at as updatedAt
      FROM projects
      WHERE id = ?
    `).get(id) as any;

    if (!r) return null;
    return {
      ...r,
      scenes: this.getScenes(r.id),
    };
  }

  public getScenes(projectId: string): Scene[] {
    const db = appDb.getRawDb();
    const rows = db.prepare(`
      SELECT s.id, s.project_id as projectId, s.scene_number as sceneNumber,
             s.script_text as scriptText, s.narration, s.character_id as characterId,
             c.name as characterName, s.reference_image_path as referenceImagePath,
             s.generation_prompt as generationPrompt, s.duration, s.video_path as videoPath,
             s.status, s.error
      FROM scenes s
      LEFT JOIN characters c ON s.character_id = c.id
      WHERE s.project_id = ?
      ORDER BY s.scene_number ASC
    `).all(projectId) as any[];

    return rows;
  }

  public create(project: Omit<StoryProject, 'id' | 'createdAt' | 'updatedAt' | 'scenes'>): StoryProject {
    const db = appDb.getRawDb();
    const id = 'proj_' + Math.random().toString(36).substring(2, 11);
    const stmt = db.prepare(`
      INSERT INTO projects (
        id, title, genre, aspect_ratio, target_duration, language, voice, status,
        hook, intro, climax, ending, continuity_notes, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, datetime('now'), datetime('now')
      )
    `);

    stmt.run(
      id,
      project.title,
      project.genre,
      project.aspectRatio,
      project.targetDuration,
      project.language,
      project.voice,
      project.status || 'draft',
      project.hook || '',
      project.intro || '',
      project.climax || '',
      project.ending || '',
      project.continuityNotes || ''
    );

    return this.getById(id)!;
  }

  public update(id: string, updates: Partial<StoryProject>): StoryProject {
    const db = appDb.getRawDb();
    const current = this.getById(id);
    if (!current) throw new Error(`Project not found: ${id}`);

    const newObj = { ...current, ...updates };
    const stmt = db.prepare(`
      UPDATE projects
      SET title = ?, genre = ?, aspect_ratio = ?, target_duration = ?,
          language = ?, voice = ?, status = ?, hook = ?, intro = ?,
          climax = ?, ending = ?, continuity_notes = ?, updated_at = datetime('now')
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
      newObj.continuityNotes,
      id
    );

    return this.getById(id)!;
  }

  public delete(id: string): boolean {
    const db = appDb.getRawDb();
    const res = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return res.changes > 0;
  }

  public createScene(scene: Omit<Scene, 'id'>): Scene {
    const db = appDb.getRawDb();
    const id = 'scene_' + Math.random().toString(36).substring(2, 11);

    const stmt = db.prepare(`
      INSERT INTO scenes (
        id, project_id, scene_number, script_text, narration, character_id,
        reference_image_path, generation_prompt, duration, video_path, status, error,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        datetime('now'), datetime('now')
      )
    `);

    stmt.run(
      id,
      scene.projectId,
      scene.sceneNumber,
      scene.scriptText || '',
      scene.narration || '',
      scene.characterId || null,
      scene.referenceImagePath || null,
      scene.generationPrompt || '',
      scene.duration || 5.0,
      scene.videoPath || null,
      scene.status || 'draft',
      scene.error || null
    );

    return this.getSceneById(id)!;
  }

  public getSceneById(id: string): Scene | null {
    const db = appDb.getRawDb();
    const row = db.prepare(`
      SELECT s.id, s.project_id as projectId, s.scene_number as sceneNumber,
             s.script_text as scriptText, s.narration, s.character_id as characterId,
             c.name as characterName, s.reference_image_path as referenceImagePath,
             s.generation_prompt as generationPrompt, s.duration, s.video_path as videoPath,
             s.status, s.error
      FROM scenes s
      LEFT JOIN characters c ON s.character_id = c.id
      WHERE s.id = ?
    `).get(id) as any;

    return row || null;
  }

  public updateScene(id: string, updates: Partial<Scene>): Scene {
    const db = appDb.getRawDb();
    const current = this.getSceneById(id);
    if (!current) throw new Error(`Scene not found: ${id}`);

    const newObj = { ...current, ...updates };
    const stmt = db.prepare(`
      UPDATE scenes
      SET scene_number = ?, script_text = ?, narration = ?, character_id = ?,
          reference_image_path = ?, generation_prompt = ?, duration = ?,
          video_path = ?, status = ?, error = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(
      newObj.sceneNumber,
      newObj.scriptText,
      newObj.narration,
      newObj.characterId || null,
      newObj.referenceImagePath || null,
      newObj.generationPrompt,
      newObj.duration,
      newObj.videoPath || null,
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
