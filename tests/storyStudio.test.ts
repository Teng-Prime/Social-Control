import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ProjectRepository } from '../src/main/database/repositories/projectRepository';
import { CharacterRepository } from '../src/main/database/repositories/characterRepository';
import { MediaAssetRepository } from '../src/main/database/repositories/mediaAssetRepository';
import { FlowService } from '../src/main/services/flowService';
import { FFmpegService } from '../src/main/services/ffmpegService';
import { storageService } from '../src/main/services/storageService';
import { characterImageGenerator } from '../src/main/services/characterImageGenerator';

describe('Story Studio 7-Step Workflow & Engine Integration', () => {
  const projectRepo = new ProjectRepository();
  const characterRepo = new CharacterRepository();
  const mediaAssetRepo = new MediaAssetRepository();
  const flowService = new FlowService();
  const ffmpegService = new FFmpegService();

  let testCharId: string;
  let testProjectId: string;

  beforeEach(() => {
    // Create a consistent test character
    const char = characterRepo.create({
      name: 'Elena Rostova',
      description: 'Quantum researcher in covert operations',
      appearance: 'Slender build, short silver-streaked dark hair, sharp grey eyes',
      clothing: 'High-collar dark grey weatherproof duster, titanium wrist chronometer',
      ageRange: '28-32',
      personality: 'Meticulous, calm under extreme pressure',
      voice: 'en-US-Neural-Jenny',
      visualStyle: 'Photorealistic Cinematic 8k, volumetric lighting',
      isLocked: true,
    });
    testCharId = char.id;
  });

  afterEach(() => {
    if (testProjectId) {
      try {
        projectRepo.delete(testProjectId);
      } catch {}
    }
    if (testCharId) {
      try {
        characterRepo.delete(testCharId);
      } catch {}
    }
  });

  it('Step 1: should support character selection and preserve continuity specifications', async () => {
    const char = characterRepo.getById(testCharId);
    expect(char).toBeDefined();
    expect(char?.name).toBe('Elena Rostova');
    expect(char?.isLocked).toBe(true);
    expect(char?.appearance).toContain('silver-streaked');

    // Create story project with Elena as selected character
    const project = projectRepo.create({
      title: 'Echoes of the Quantum Rift',
      genre: 'mystery',
      aspectRatio: '9:16',
      targetDuration: 60,
      language: 'en',
      voice: 'en-US-Neural-Jenny',
      status: 'draft',
      selectedCharacterIds: [testCharId],
      currentStep: 1,
    });
    testProjectId = project.id;

    expect(project.selectedCharacterIds).toContain(testCharId);
    expect(project.currentStep).toBe(1);

    // Verify multi-character support
    const char2 = characterRepo.create({
      name: 'Marcus Hayes',
      description: 'Tactical navigator',
      appearance: 'Broad-shouldered, dark buzzcut',
      clothing: 'Olive tactical vest',
      ageRange: '35',
      personality: 'Protective',
      voice: 'en-US-Neural-Guy',
      visualStyle: 'Cinematic realism',
      isLocked: false,
    });

    const updated = projectRepo.update(project.id, {
      selectedCharacterIds: [testCharId, char2.id],
    });
    expect(updated.selectedCharacterIds?.length).toBe(2);
    expect(updated.selectedCharacterIds).toContain(char2.id);

    characterRepo.delete(char2.id);
  });

  it('Step 1 Character Photo Engine: should generate visual keyframe portraits, multi-angle suites, and persist primary photo for video consistency', async () => {
    const char = characterRepo.getById(testCharId)!;
    expect(char).toBeDefined();

    // 1. Generate primary front portrait photo
    const portraitRef = await characterImageGenerator.generatePortrait(char, 'front', true);
    expect(portraitRef).toBeDefined();
    expect(portraitRef.characterId).toBe(testCharId);
    expect(portraitRef.isPrimary).toBe(true);
    expect(fs.existsSync(portraitRef.imagePath)).toBe(true);

    // Verify persisted in character record
    let updatedChar = characterRepo.getById(testCharId)!;
    expect(updatedChar.references.length).toBe(1);
    expect(updatedChar.references[0].id).toBe(portraitRef.id);
    expect(updatedChar.references[0].isPrimary).toBe(true);

    // 2. Generate multi-angle suite (front, 3/4, profile)
    const suite = await characterImageGenerator.generateMultiAngleSuite(char);
    expect(suite.length).toBe(3);
    for (const ref of suite) {
      expect(fs.existsSync(ref.imagePath)).toBe(true);
    }

    updatedChar = characterRepo.getById(testCharId)!;
    expect(updatedChar.references.length).toBe(4);

    // 3. Switch primary reference photo
    const profileRef = suite[2];
    characterRepo.setPrimaryReference(testCharId, profileRef.id);
    updatedChar = characterRepo.getById(testCharId)!;
    const newPrimary = updatedChar.references.find((r) => r.isPrimary);
    expect(newPrimary?.id).toBe(profileRef.id);

    // 4. Verify scene binding: Scene can reference this keyframe photo for Image-to-Video generation
    const testProject = projectRepo.create({
      title: 'Scene Continuity Test',
      genre: 'mystery',
      currentStep: 3,
    });

    const scene = projectRepo.createScene({
      projectId: testProject.id,
      sceneNumber: 1,
      title: 'Consistent Scene 1',
      generationPrompt: 'Elena in laboratory',
      characterId: testCharId,
      referenceImagePath: newPrimary?.imagePath,
      status: 'ready',
    });

    expect(scene.referenceImagePath).toBe(newPrimary?.imagePath);
    expect(scene.referenceImagePath).toBeDefined();
    expect(fs.existsSync(scene.referenceImagePath!)).toBe(true);

    // Clean up
    projectRepo.delete(testProject.id);
    for (const ref of updatedChar.references) {
      if (fs.existsSync(ref.imagePath)) {
        try { fs.unlinkSync(ref.imagePath); } catch {}
      }
    }
  });

  it('Step 2: should generate story ideas, viral hook, and approve narrative arc', async () => {
    const ideas = await flowService.generateStoryIdeas('a hidden transmitter', 'mystery', ['Elena Rostova']);
    expect(ideas.length).toBeGreaterThanOrEqual(3);
    for (const idea of ideas) {
      expect(idea.length).toBeGreaterThan(15);
    }

    const hook = await flowService.generateHook('a hidden transmitter', 'mystery', 'dark');
    expect(hook.length).toBeGreaterThan(10);

    // Test script rewrite and shortening
    const scriptTransform = await flowService.transformStoryScript({
      script: 'Scene 1: Elena enters the room. Scene 2: She sees the signal flickering on the old console.',
      hook,
      action: 'shorten',
      genre: 'mystery',
    });
    expect(scriptTransform.hook).toBeDefined();
    expect(scriptTransform.script).toBeDefined();

    // Persist to project
    const project = projectRepo.create({
      title: 'Signal in the Deep',
      genre: 'mystery',
      aspectRatio: '9:16',
      targetDuration: 30,
      language: 'en',
      voice: 'en-US-Neural-Jenny',
      status: 'scripted',
      hook,
      intro: 'Deep within the underground sector, a signal awakens.',
      climax: 'Elena decodes the final transmission.',
      ending: 'What will she do next? Follow for Part 2!',
      currentStep: 2,
    });
    testProjectId = project.id;

    const saved = projectRepo.getById(project.id);
    expect(saved?.hook).toBe(hook);
    expect(saved?.status).toBe('scripted');
    expect(saved?.currentStep).toBe(2);
  });

  it('Step 3: should generate, reorder, and edit scene prompts with character continuity', async () => {
    const fullStory = await flowService.generateFullStory({
      prompt: 'Elena deciphers an encrypted mainframe',
      genre: 'mystery',
      targetDuration: 30,
      characterIds: [testCharId],
      platform: 'tiktok',
    });

    expect(fullStory.scenes.length).toBeGreaterThanOrEqual(3);
    expect(fullStory.hook).toBeDefined();

    // Create project and save scenes
    const project = projectRepo.create({
      title: 'Mainframe Infiltration',
      genre: 'mystery',
      aspectRatio: '9:16',
      targetDuration: 30,
      language: 'en',
      voice: 'en-US-Neural-Jenny',
      status: 'draft',
      hook: fullStory.hook,
      intro: fullStory.intro,
      climax: fullStory.climax,
      ending: fullStory.ending,
      selectedCharacterIds: [testCharId],
      currentStep: 3,
    });
    testProjectId = project.id;

    const scene1 = projectRepo.createScene({
      projectId: project.id,
      sceneNumber: 1,
      title: fullStory.scenes[0].title,
      scriptText: fullStory.scenes[0].scriptText,
      narration: fullStory.scenes[0].narration,
      generationPrompt: fullStory.scenes[0].prompt,
      duration: fullStory.scenes[0].duration,
      visualDescription: fullStory.scenes[0].visualDescription,
      cameraAngle: fullStory.scenes[0].cameraAngle,
      lighting: fullStory.scenes[0].lighting,
      actions: fullStory.scenes[0].actions,
      environment: fullStory.scenes[0].environment,
      soundEffectSuggestion: fullStory.scenes[0].soundEffectSuggestion,
      negativePrompt: fullStory.scenes[0].negativePrompt,
      characterId: testCharId,
      status: 'draft',
    });

    const scene2 = projectRepo.createScene({
      projectId: project.id,
      sceneNumber: 2,
      title: fullStory.scenes[1].title,
      scriptText: fullStory.scenes[1].scriptText,
      narration: fullStory.scenes[1].narration,
      generationPrompt: fullStory.scenes[1].prompt,
      duration: fullStory.scenes[1].duration,
      characterId: testCharId,
      status: 'draft',
    });

    // Verify character continuity injection into scene prompt
    expect(scene1.generationPrompt).toContain('Elena Rostova');
    expect(scene1.generationPrompt).toContain('silver-streaked');

    // Test scene editing
    const updatedScene = projectRepo.updateScene(scene1.id, {
      duration: 7,
      status: 'ready',
    });
    expect(updatedScene.duration).toBe(7);
    expect(updatedScene.status).toBe('ready');

    // Test scene reordering
    projectRepo.reorderScenes(project.id, [scene2.id, scene1.id]);
    const reordered = projectRepo.getScenes(project.id);
    expect(reordered[0].id).toBe(scene2.id);
    expect(reordered[0].sceneNumber).toBe(1);
    expect(reordered[1].id).toBe(scene1.id);
    expect(reordered[1].sceneNumber).toBe(2);
  });

  it('Step 4, 5 & 6: should manage voiceover, background music, ducking, and Foley sound effects', async () => {
    const project = projectRepo.create({
      title: 'Sound Design Story',
      genre: 'mystery',
      aspectRatio: '9:16',
      targetDuration: 60,
      language: 'en',
      voice: 'en-US-Neural-Jenny',
      status: 'draft',
      currentStep: 4,
    });
    testProjectId = project.id;

    // 1. Generate Voiceover
    const narrationText = 'Elena stepped into the forgotten chamber. The signal grew stronger with every footstep.';
    const voiceRes = await flowService.generateVoiceoverAudio(project.id, narrationText, {
      provider: 'Neural Studio TTS',
      voice: 'en-US-Neural-Jenny',
      language: 'English (US)',
      gender: 'female',
      speed: 1.0,
      pitch: 0,
      volume: 100,
    });
    expect(voiceRes.audioPath).toBeDefined();
    expect(fs.existsSync(voiceRes.audioPath)).toBe(true);

    // 2. Music Library & Settings
    const audioLib = await flowService.getBuiltinAudioLibrary();
    expect(audioLib.music.length).toBeGreaterThanOrEqual(4);
    expect(audioLib.soundEffects.length).toBeGreaterThanOrEqual(6);

    const musicTrack = audioLib.music.find((m) => m.mood === 'suspense') || audioLib.music[0];
    expect(fs.existsSync(musicTrack.path)).toBe(true);

    // 3. Sound Effects
    const impactSfx = audioLib.soundEffects[0];
    expect(fs.existsSync(impactSfx.path)).toBe(true);

    // Update project with audio settings
    const updated = projectRepo.update(project.id, {
      voiceSettings: {
        provider: 'Neural Studio TTS',
        voice: 'en-US-Neural-Jenny',
        language: 'English (US)',
        gender: 'female',
        speed: 1.0,
        pitch: 0,
        volume: 95,
        audioPath: voiceRes.audioPath,
      },
      musicSettings: {
        trackId: musicTrack.id,
        trackTitle: musicTrack.title,
        mood: musicTrack.mood,
        volume: 25,
        trimStart: 0,
        trimEnd: 60,
        fadeIn: true,
        fadeOut: true,
        loop: true,
        ducking: true,
        audioPath: musicTrack.path,
      },
      soundEffects: [
        {
          id: 'sfx_1',
          name: impactSfx.name,
          category: impactSfx.category,
          audioPath: impactSfx.path,
          volume: 80,
          startTime: 2,
          duration: impactSfx.duration,
        },
      ],
      currentStep: 6,
    });

    const retrieved = projectRepo.getById(project.id);
    expect(retrieved?.voiceSettings?.audioPath).toBe(voiceRes.audioPath);
    expect(retrieved?.musicSettings?.ducking).toBe(true);
    expect(retrieved?.musicSettings?.volume).toBe(25);
    expect(retrieved?.soundEffects?.length).toBe(1);
    expect(retrieved?.soundEffects?.[0].name).toBe(impactSfx.name);
  });

  it('Step 7: should verify export parameters and auto-index rendered video into Video Library', async () => {
    const project = projectRepo.create({
      title: 'Final Quantum Odyssey',
      genre: 'adventure',
      aspectRatio: '9:16',
      targetDuration: 30,
      language: 'en',
      voice: 'en-US-Neural-Jenny',
      status: 'review',
      currentStep: 7,
    });
    testProjectId = project.id;

    // Create mock scene video files in test folder
    const videosFolder = storageService.getFolder('Videos/Drafts');
    const mockClipPath = path.join(videosFolder, `test_clip_${Date.now()}.mp4`);
    fs.writeFileSync(mockClipPath, 'mock-video-binary-content-for-testing');

    const scene = projectRepo.createScene({
      projectId: project.id,
      sceneNumber: 1,
      title: 'Scene 1: Departure',
      scriptText: 'Elena prepares the craft for launch.',
      narration: 'Launch sequence initiated.',
      generationPrompt: 'Elena Rostova launches vessel.',
      duration: 10,
      videoPath: mockClipPath,
      status: 'ready',
    });

    // Test assembling video and registering in Video Library
    const exportsFolder = storageService.getFolder('Exports');
    const finalOutPath = path.join(exportsFolder, `final_${project.id}.mp4`);

    await ffmpegService.assembleScenes({
      videoClips: [mockClipPath],
      outputFilePath: finalOutPath,
      aspectRatio: '9:16',
    });

    expect(fs.existsSync(finalOutPath)).toBe(true);

    // Register into Video Library under ReadyToPublish
    const asset = mediaAssetRepo.create({
      id: 'asset_test_' + Date.now(),
      title: `${project.title} (Final Render)`,
      filePath: finalOutPath,
      fileName: path.basename(finalOutPath),
      fileSize: 1024,
      duration: 10,
      width: 1080,
      height: 1920,
      aspectRatio: '9:16',
      format: 'mp4',
      thumbnailPath: '',
      tags: ['rendered', 'ai-story', project.genre],
      folder: 'ReadyToPublish',
      isFavorite: true,
      projectId: project.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(asset.id).toBeDefined();
    expect(asset.folder).toBe('ReadyToPublish');
    expect(asset.projectId).toBe(project.id);

    // Verify retrieval from MediaAssetRepository
    const retrievedAsset = mediaAssetRepo.getById(asset.id);
    expect(retrievedAsset?.filePath).toBe(finalOutPath);

    // Clean up mock video files
    if (fs.existsSync(mockClipPath)) fs.unlinkSync(mockClipPath);
    if (fs.existsSync(finalOutPath)) fs.unlinkSync(finalOutPath);
    mediaAssetRepo.delete(asset.id);
  });
});
