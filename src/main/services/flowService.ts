import fs from 'fs';
import path from 'path';
import { appDb } from '../database/db';
import { logger } from '../logger';
import { CaptionGenerationRequest, CaptionGenerationResult, Character, Scene } from '../../shared/types';
import { storageService } from './storageService';

export class FlowService {
  public async generateScript(options: {
    prompt: string;
    genre: string;
    targetDuration: number;
    character?: Character | null;
  }): Promise<{
    hook: string;
    intro: string;
    scenes: Array<{ scriptText: string; narration: string; prompt: string; duration: number }>;
    climax: string;
    ending: string;
  }> {
    const { prompt, genre, targetDuration, character } = options;
    logger.info('FlowService', `Generating story script for genre "${genre}", duration ${targetDuration}s`);

    const charDetails = character
      ? `Protagonist: ${character.name} (${character.appearance}, wearing ${character.clothing}, ${character.personality})`
      : 'Protagonist: Dynamic AI character';

    // Calculate scene count based on duration (average 5 seconds per scene)
    const sceneCount = Math.max(3, Math.min(8, Math.round(targetDuration / 6)));

    // Generate tailored, high-converting story arc
    const hook = `Wait until you see what happened when ${prompt.toLowerCase().slice(0, 50)}... You won't believe the twist!`;
    const intro = `In a world shaped by ${genre}, our journey begins with ${character?.name || 'our character'}. Everything seemed predictable until this exact moment.`;

    const scenes: Array<{ scriptText: string; narration: string; prompt: string; duration: number }> = [];

    const storyMilestones = [
      { beat: 'Inciting Incident', action: 'discovers an unexpected clue that changes everything' },
      { beat: 'Rising Tension', action: 'faces the initial confrontation and risks losing progress' },
      { beat: 'The Complication', action: 'uncovers a hidden secret connecting past events' },
      { beat: 'High Stakes Moment', action: 'races against time to overcome the central obstacle' },
      { beat: 'The Turning Point', action: 'makes a critical choice under immense pressure' },
      { beat: 'Climactic Showdown', action: 'reaches the dramatic peak where truth is revealed' },
    ];

    for (let i = 0; i < sceneCount; i++) {
      const milestone = storyMilestones[i % storyMilestones.length];
      const sceneNum = i + 1;
      const sceneDuration = Math.round(targetDuration / sceneCount);

      const scenePrompt = `${charDetails}. Cinematic scene in a ${genre} setting. Scene ${sceneNum}: ${milestone.beat} - Character ${milestone.action}. Hyper-realistic, dramatic lighting, 8k render, consistent character appearance.`;
      const narration = `${character?.name || 'They'} ${milestone.action}. Every second counts now.`;
      const scriptText = `[SCENE ${sceneNum}] ${character?.name || 'Hero'} ${milestone.action}. Camera tracks movement with dynamic focal depth.`;

      scenes.push({
        scriptText,
        narration,
        prompt: scenePrompt,
        duration: sceneDuration,
      });
    }

    const climax = `At the breaking point, the mystery unravels and truth strikes like lightning.`;
    const ending = `Did they make the right call? Drop your thoughts below and subscribe for part 2!`;

    return {
      hook,
      intro,
      scenes,
      climax,
      ending,
    };
  }

  public prepareFlowWorkflowPackage(projectId: string, scene: Scene, character?: Character | null): {
    flowWebUrl: string;
    instructions: string;
    promptPackage: string;
    referenceImages: string[];
  } {
    const references: string[] = [];
    if (character && character.references) {
      for (const ref of character.references) {
        if (fs.existsSync(ref.imagePath)) {
          references.push(ref.imagePath);
        }
      }
    }

    const promptPackage = `
=========================================
GOOGLE FLOW / AI VIDEO GENERATION PACKAGE
Project ID: ${projectId}
Scene Number: ${scene.sceneNumber}
Target Duration: ${scene.duration}s
=========================================

[POSITIVE PROMPT]
${scene.generationPrompt}

[CHARACTER CONTINUITY SPECS]
${character ? `Character: ${character.name}\nAppearance: ${character.appearance}\nClothing: ${character.clothing}\nStyle: ${character.visualStyle}` : 'Standard cinematic consistency'}

[NARRATION]
${scene.narration}

[RECOMMENDED FLOW SETTINGS]
- Aspect Ratio: 9:16 (Vertical) or 16:9
- Motion Strength: Medium (5-6)
- Camera: Steady pan / slow push
`.trim();

    return {
      flowWebUrl: 'https://flow.google.com',
      instructions: '1. Click "Open Flow Web" below.\n2. Copy the prepared prompt and drag in the character reference image.\n3. Generate the clip in Flow.\n4. Download the video and click "Import Generated Video" to bind it to this scene.',
      promptPackage,
      referenceImages: references,
    };
  }

  public async generateCaptions(req: CaptionGenerationRequest): Promise<CaptionGenerationResult> {
    const { videoTitle, scriptText, targetPlatform, targetAudience, tone, keywords, callToAction } = req;
    logger.info('FlowService', `Generating platform-optimized captions for ${targetPlatform} (${tone})`);

    const kwList = keywords.length > 0 ? keywords : ['viral', 'trending', 'ai', 'story'];
    const kwTags = kwList.map(k => `#${k.replace(/\s+/g, '')}`).join(' ');

    let platformNotes = '';
    if (targetPlatform === 'tiktok') {
      platformNotes = 'TikTok Limit: 2,200 characters. Optimal: first 2 lines visible before "more". Include trending audio tags.';
    } else if (targetPlatform === 'youtube') {
      platformNotes = 'YouTube Limit: Title 100 chars, Description 5,000 chars. Place key links and CTA in top 3 lines.';
    } else {
      platformNotes = 'Facebook Reels Limit: 2,000 chars. Engaging questions boost share algorithm.';
    }

    const variations = [
      {
        title: `Watch Till The End! ${videoTitle}`.slice(0, 95),
        caption: `You will NOT believe what happened next... 🤯\n\n${scriptText ? scriptText.slice(0, 150) + '...' : ''}\n\n${callToAction || 'What would you have done? Let me know in the comments!'}\n\n${kwTags} #${targetPlatform}creators #aivideo`,
        hashtags: [...kwList.map(k => `#${k}`), '#fyp', '#viral', '#foryou', '#mindblowing'],
        pinnedComment: `💬 Question of the day: What was your favorite moment in this story?`,
        thumbnailText: 'WAIT FOR THE END! ⚠️',
        searchKeywords: [...kwList, 'ai story', 'viral shorts', 'trending reel'],
      },
      {
        title: `The Secret Behind ${videoTitle}`.slice(0, 95),
        caption: `This story took an unexpected turn that no one saw coming.\n\nTargeted for anyone interested in ${targetAudience}.\n\n👉 Follow for more epic daily stories!\n\n${kwTags}`,
        hashtags: [...kwList.map(k => `#${k}`), '#storytime', '#aiart', '#epicmoments', '#mustwatch'],
        pinnedComment: `🔥 Drop a like if you want Part 2 tomorrow!`,
        thumbnailText: 'NOBODY EXPECTED THIS...',
        searchKeywords: [...kwList, 'top trending', 'behind the scene', 'full story'],
      },
      {
        title: `${videoTitle} - Did You Notice This?`.slice(0, 95),
        caption: `Only 5% of people notice the hidden clue at the start! Did you catch it?\n\n${callToAction || 'Save this video so you can check again later!'}\n\n${kwTags}`,
        hashtags: [...kwList.map(k => `#${k}`), '#mystery', '#trendingnow', '#watchtillend'],
        pinnedComment: `Did you catch the clue at 0:03? 👇`,
        thumbnailText: 'DID YOU CATCH IT? 👁️',
        searchKeywords: [...kwList, 'clues', 'hidden details', 'viral story'],
      },
    ];

    return {
      variations,
      platformLimitNotes: platformNotes,
    };
  }
}

export const flowService = new FlowService();
