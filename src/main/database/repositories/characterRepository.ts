import { appDb } from '../db';
import { Character, CharacterReference } from '../../../shared/types';

export class CharacterRepository {
  public getAll(): Character[] {
    const db = appDb.getRawDb();
    const characters = db.prepare(`
      SELECT id, name, description, appearance, clothing, age_range as ageRange,
             personality, voice, visual_style as visualStyle, is_locked as isLocked,
             created_at as createdAt, updated_at as updatedAt
      FROM characters
      ORDER BY name ASC
    `).all() as any[];

    return characters.map(c => ({
      ...c,
      isLocked: Boolean(c.isLocked),
      references: this.getReferences(c.id),
    }));
  }

  public getById(id: string): Character | null {
    const db = appDb.getRawDb();
    const c = db.prepare(`
      SELECT id, name, description, appearance, clothing, age_range as ageRange,
             personality, voice, visual_style as visualStyle, is_locked as isLocked,
             created_at as createdAt, updated_at as updatedAt
      FROM characters
      WHERE id = ?
    `).get(id) as any;

    if (!c) return null;
    return {
      ...c,
      isLocked: Boolean(c.isLocked),
      references: this.getReferences(c.id),
    };
  }

  public getReferences(characterId: string): CharacterReference[] {
    const db = appDb.getRawDb();
    const rows = db.prepare(`
      SELECT id, character_id as characterId, image_path as imagePath,
             prompt, is_primary as isPrimary, created_at as createdAt
      FROM character_references
      WHERE character_id = ?
      ORDER BY is_primary DESC, created_at DESC
    `).all(characterId) as any[];

    return rows.map(r => ({
      ...r,
      isPrimary: Boolean(r.isPrimary),
    }));
  }

  public create(char: Omit<Character, 'id' | 'createdAt' | 'updatedAt' | 'references'>): Character {
    const db = appDb.getRawDb();
    const id = 'char_' + Math.random().toString(36).substring(2, 11);
    const stmt = db.prepare(`
      INSERT INTO characters (
        id, name, description, appearance, clothing, age_range,
        personality, voice, visual_style, is_locked, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, datetime('now'), datetime('now')
      )
    `);

    stmt.run(
      id,
      char.name,
      char.description || '',
      char.appearance || '',
      char.clothing || '',
      char.ageRange || '',
      char.personality || '',
      char.voice || '',
      char.visualStyle || '',
      char.isLocked ? 1 : 0
    );

    return this.getById(id)!;
  }

  public update(id: string, updates: Partial<Character>): Character {
    const db = appDb.getRawDb();
    const current = this.getById(id);
    if (!current) throw new Error(`Character not found: ${id}`);

    const newObj = { ...current, ...updates };
    const stmt = db.prepare(`
      UPDATE characters
      SET name = ?, description = ?, appearance = ?, clothing = ?,
          age_range = ?, personality = ?, voice = ?, visual_style = ?,
          is_locked = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(
      newObj.name,
      newObj.description,
      newObj.appearance,
      newObj.clothing,
      newObj.ageRange,
      newObj.personality,
      newObj.voice,
      newObj.visualStyle,
      newObj.isLocked ? 1 : 0,
      id
    );

    return this.getById(id)!;
  }

  public delete(id: string): boolean {
    const db = appDb.getRawDb();
    const res = db.prepare('DELETE FROM characters WHERE id = ?').run(id);
    return res.changes > 0;
  }

  public addReference(characterId: string, imagePath: string, prompt: string, isPrimary = false): CharacterReference {
    const db = appDb.getRawDb();
    const id = 'ref_' + Math.random().toString(36).substring(2, 11);

    if (isPrimary) {
      db.prepare('UPDATE character_references SET is_primary = 0 WHERE character_id = ?').run(characterId);
    }

    const stmt = db.prepare(`
      INSERT INTO character_references (id, character_id, image_path, prompt, is_primary, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(id, characterId, imagePath, prompt, isPrimary ? 1 : 0);

    return {
      id,
      characterId,
      imagePath,
      prompt,
      isPrimary,
      createdAt: new Date().toISOString(),
    };
  }

  public deleteReference(referenceId: string): boolean {
    const db = appDb.getRawDb();
    const res = db.prepare('DELETE FROM character_references WHERE id = ?').run(referenceId);
    return res.changes > 0;
  }
}

export const characterRepo = new CharacterRepository();
