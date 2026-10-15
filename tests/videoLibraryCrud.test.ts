import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { mediaAssetRepo } from '../src/main/database/repositories/mediaAssetRepository';
import { appDb } from '../src/main/database/db';

describe('Video Library CRUD & Textbox Multi-CRUD Engine', () => {
  beforeEach(() => {
    // Ensure clean state for test assets
    const all = mediaAssetRepo.getAll();
    for (const a of all) {
      if (a.id.startsWith('test_asset_') || a.id.startsWith('batch_test_')) {
        mediaAssetRepo.delete(a.id);
      }
    }
  });

  afterEach(() => {
    const all = mediaAssetRepo.getAll();
    for (const a of all) {
      if (a.id.startsWith('test_asset_') || a.id.startsWith('batch_test_')) {
        mediaAssetRepo.delete(a.id);
      }
    }
  });

  // 1. Single Create Video Asset
  it('1. Single Create: creates video record with automatic unique file path and metadata', () => {
    const asset = mediaAssetRepo.create({
      id: 'test_asset_1',
      title: 'Top 5 Productivity Tips',
      folder: 'Drafts',
      tags: ['productivity', 'tips'],
      aspectRatio: '9:16',
      duration: 60,
    });

    expect(asset).toBeDefined();
    expect(asset.id).toBe('test_asset_1');
    expect(asset.title).toBe('Top 5 Productivity Tips');
    expect(asset.folder).toBe('Drafts');
    expect(asset.tags).toEqual(['productivity', 'tips']);
    expect(asset.aspectRatio).toBe('9:16');
    expect(asset.filePath).toContain('library://videos/test_asset_1/');
    expect(asset.fileName).toContain('top_5_productivity_tips.mp4');
  });

  // 2. Single Read Video Asset
  it('2. Single Read: retrieves video record by ID and file path', () => {
    const created = mediaAssetRepo.create({
      id: 'test_asset_read',
      title: 'Healthy Recipe Reel',
      folder: 'ReadyToPublish',
      tags: ['food'],
    });

    const byId = mediaAssetRepo.getById(created.id);
    expect(byId).not.toBeNull();
    expect(byId?.title).toBe('Healthy Recipe Reel');
    expect(byId?.folder).toBe('ReadyToPublish');

    const byPath = mediaAssetRepo.getByFilePath(created.filePath);
    expect(byPath).not.toBeNull();
    expect(byPath?.id).toBe(created.id);
  });

  // 3. Single Update Video Asset
  it('3. Single Update: updates title, folder, tags, and aspect ratio', () => {
    const created = mediaAssetRepo.create({
      id: 'test_asset_update',
      title: 'Original Title',
      folder: 'Drafts',
      tags: ['v1'],
    });

    const updated = mediaAssetRepo.update(created.id, {
      title: 'Updated Final Title',
      folder: 'Published',
      tags: ['v2', 'final'],
      aspectRatio: '16:9',
    });

    expect(updated.title).toBe('Updated Final Title');
    expect(updated.folder).toBe('Published');
    expect(updated.tags).toEqual(['v2', 'final']);
    expect(updated.aspectRatio).toBe('16:9');
  });

  // 4. Single Delete Video Asset
  it('4. Single Delete: removes asset record from database', () => {
    const created = mediaAssetRepo.create({
      id: 'test_asset_delete',
      title: 'To Be Deleted',
    });

    expect(mediaAssetRepo.getById(created.id)).not.toBeNull();
    const success = mediaAssetRepo.delete(created.id);
    expect(success).toBe(true);
    expect(mediaAssetRepo.getById(created.id)).toBeNull();
  });

  // 5. Batch Create (Multi-Create from Textbox)
  it('5. Batch Create (Multi Textbox): creates multiple video assets in a single operation', () => {
    const rawTextboxInput = [
      { title: 'Morning Routine 01', folder: 'Drafts' as const, tags: ['lifestyle', 'morning'] },
      { title: 'Morning Routine 02', folder: 'ReadyToPublish' as const, tags: ['lifestyle'] },
      { title: 'Morning Routine 03', folder: 'Published' as const, tags: ['viral'] },
    ];

    const createdList = mediaAssetRepo.batchCreate(
      rawTextboxInput.map((item, idx) => ({
        id: `batch_test_${idx + 1}`,
        ...item,
      }))
    );

    expect(createdList.length).toBe(3);
    expect(createdList[0].title).toBe('Morning Routine 01');
    expect(createdList[0].folder).toBe('Drafts');
    expect(createdList[1].folder).toBe('ReadyToPublish');
    expect(createdList[2].folder).toBe('Published');

    // Verify all exist in database
    for (let i = 1; i <= 3; i++) {
      expect(mediaAssetRepo.getById(`batch_test_${i}`)).not.toBeNull();
    }
  });

  // 6. Batch Update (Multi-Update via Textbox)
  it('6. Batch Update (Multi Textbox): updates multiple assets simultaneously', () => {
    mediaAssetRepo.create({ id: 'batch_test_u1', title: 'Video Alpha', folder: 'Drafts' });
    mediaAssetRepo.create({ id: 'batch_test_u2', title: 'Video Beta', folder: 'Drafts' });

    const updated = mediaAssetRepo.batchUpdate(
      ['batch_test_u1', 'batch_test_u2'],
      { folder: 'ReadyToPublish', tags: ['batch-approved'] }
    );

    expect(updated.length).toBe(2);
    expect(updated[0].folder).toBe('ReadyToPublish');
    expect(updated[0].tags).toEqual(['batch-approved']);
    expect(updated[1].folder).toBe('ReadyToPublish');
    expect(updated[1].tags).toEqual(['batch-approved']);
  });

  // 7. Batch Delete (Multi-Delete via Textbox)
  it('7. Batch Delete (Multi Textbox): deletes multiple assets in bulk', () => {
    mediaAssetRepo.create({ id: 'batch_test_d1', title: 'Delete 1' });
    mediaAssetRepo.create({ id: 'batch_test_d2', title: 'Delete 2' });
    mediaAssetRepo.create({ id: 'batch_test_d3', title: 'Delete 3' });

    const count = mediaAssetRepo.batchDelete(['batch_test_d1', 'batch_test_d2', 'batch_test_d3']);
    expect(count).toBe(3);

    expect(mediaAssetRepo.getById('batch_test_d1')).toBeNull();
    expect(mediaAssetRepo.getById('batch_test_d2')).toBeNull();
    expect(mediaAssetRepo.getById('batch_test_d3')).toBeNull();
  });

  // 8. Textbox Multi-Create Parser Logic Simulation
  it('8. Textbox Parser: parses delimited lines into valid video asset objects', () => {
    const rawText = `
      Street Interview #1 | #viral, #shorts | Drafts
      Tech Review Ep 2 | #tech, #4k | ReadyToPublish | D:/videos/tech.mp4
      Finance Tip #3 | #money | Published
    `;

    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));

    const parsed = lines.map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      const title = parts[0];
      const tags = parts[1]
        ? parts[1]
            .split(',')
            .map((t) => t.trim().replace(/^#/, ''))
            .filter(Boolean)
        : [];
      const folder = parts[2] || 'Drafts';
      const filePath = parts[3] || undefined;
      return { title, tags, folder, filePath };
    });

    expect(parsed.length).toBe(3);
    expect(parsed[0].title).toBe('Street Interview #1');
    expect(parsed[0].tags).toEqual(['viral', 'shorts']);
    expect(parsed[0].folder).toBe('Drafts');

    expect(parsed[1].title).toBe('Tech Review Ep 2');
    expect(parsed[1].tags).toEqual(['tech', '4k']);
    expect(parsed[1].folder).toBe('ReadyToPublish');
    expect(parsed[1].filePath).toBe('D:/videos/tech.mp4');

    expect(parsed[2].title).toBe('Finance Tip #3');
    expect(parsed[2].folder).toBe('Published');
  });

  // 9. Textbox Multi-Update Parser Logic Simulation
  it('9. Textbox Update Parser: extracts ID, updated title, folder, and tags from [ID] lines', () => {
    const updateText = `
      [asset_101] Modern Architecture Tour | Published | modern, luxury
      [asset_102] Minimalist Apartment | ReadyToPublish | design, room
    `;

    const lines = updateText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const parsed = lines.map((line) => {
      const match = line.match(/^\[([a-zA-Z0-9_-]+)\]\s*(.*)$/);
      expect(match).not.toBeNull();
      const id = match![1];
      const parts = match![2].split('|').map((p) => p.trim());
      return {
        id,
        title: parts[0],
        folder: parts[1],
        tags: parts[2] ? parts[2].split(',').map((t) => t.trim()) : [],
      };
    });

    expect(parsed.length).toBe(2);
    expect(parsed[0].id).toBe('asset_101');
    expect(parsed[0].title).toBe('Modern Architecture Tour');
    expect(parsed[0].folder).toBe('Published');
    expect(parsed[0].tags).toEqual(['modern', 'luxury']);

    expect(parsed[1].id).toBe('asset_102');
    expect(parsed[1].title).toBe('Minimalist Apartment');
    expect(parsed[1].folder).toBe('ReadyToPublish');
  });
});
