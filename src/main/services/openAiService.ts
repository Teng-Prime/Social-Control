import { appDb } from '../database/db';
import { logger } from '../logger';

export class OpenAIService {
  private getApiKey(overrideKey?: string): string {
    if (overrideKey && overrideKey.trim()) {
      return overrideKey.trim();
    }
    try {
      const settings = appDb.getSettings();
      return (settings.openaiApiKey || '').trim();
    } catch {
      return '';
    }
  }

  public hasApiKey(overrideKey?: string): boolean {
    const key = this.getApiKey(overrideKey);
    return key.length > 5;
  }

  public async testConnection(apiKey?: string, model?: string): Promise<{
    success: boolean;
    message: string;
    modelCount?: number;
  }> {
    const key = this.getApiKey(apiKey);
    if (!key) {
      return {
        success: false,
        message: 'No OpenAI API key provided. Please enter your API key.',
      };
    }

    try {
      logger.info('OpenAIService', 'Testing OpenAI API connection...');
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });

      if (!response.ok) {
        const errJson: any = await response.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        return {
          success: false,
          message: `OpenAI connection failed: ${errMsg}`,
        };
      }

      const data: any = await response.json();
      const count = Array.isArray(data?.data) ? data.data.length : 0;
      return {
        success: true,
        message: `Successfully connected to OpenAI API! Access to ${count} models verified.`,
        modelCount: count,
      };
    } catch (err: any) {
      logger.error('OpenAIService', `Test connection failed: ${err.message}`);
      return {
        success: false,
        message: `Network error connecting to OpenAI: ${err.message}`,
      };
    }
  }

  public async generateFullStory(options: {
    prompt: string;
    genre: string;
    targetDuration: number;
    platform?: string;
    tone?: string;
    targetAudience?: string;
    characterNames?: string[];
    customInstructions?: string;
    apiKey?: string;
    model?: string;
  }): Promise<{
    hook: string;
    intro: string;
    scenes: Array<{
      title: string;
      scriptText: string;
      narration: string;
      prompt: string;
      duration: number;
      visualDescription: string;
      cameraAngle: string;
      lighting: string;
      actions: string;
      environment: string;
      soundEffectSuggestion: string;
      negativePrompt: string;
    }>;
    climax: string;
    ending: string;
  } | null> {
    const key = this.getApiKey(options.apiKey);
    if (!key) return null;

    const settings = appDb.getSettings();
    const modelToUse = options.model || settings.openaiModel || 'gpt-4o-mini';
    const targetDuration = options.targetDuration || 30;
    
    // For 30s videos, standard is 5 scenes of 6s each.
    const sceneCount = targetDuration <= 15 ? 3 : targetDuration <= 35 ? 5 : Math.max(3, Math.min(8, Math.round(targetDuration / 6)));
    const perSceneDuration = Math.round(targetDuration / sceneCount);

    const systemPrompt = `You are a world-class viral short-form video creative director and scriptwriter for TikTok, YouTube Shorts, and Instagram Reels.
You create emotionally engaging, suspenseful, and visually rich video stories with high viewer retention.
You must respond with ONLY valid JSON (no markdown formatting, no code fences, no explanatory text) matching this schema:
{
  "hook": "Compelling first 3 seconds hook sentence",
  "intro": "Brief premise introduction sentence",
  "scenes": [
    {
      "title": "Scene title (e.g. Scene 1: The Discovery)",
      "scriptText": "Action description for the scene",
      "narration": "Voiceover narration line to be spoken",
      "prompt": "Highly detailed visual prompt for AI video/image generation: subject description, camera motion, cinematic lighting, 8k resolution, photorealistic",
      "duration": ${perSceneDuration},
      "visualDescription": "Visual scene breakdown",
      "cameraAngle": "Specific cinematic camera angle",
      "lighting": "Specific dramatic lighting",
      "actions": "Character physical action",
      "environment": "Environment setting details",
      "soundEffectSuggestion": "Suggested sound effect cue (e.g. Footsteps on Gravel, Creaking Wooden Door, etc.)",
      "negativePrompt": "blurry, low quality, artifacts, distorted hands"
    }
  ],
  "climax": "The peak dramatic turning point sentence",
  "ending": "Viral call-to-action or cliffhanger ending"
}
CRITICAL RULES:
- The "scenes" array MUST contain exactly ${sceneCount} scenes.
- Total video duration must equal exactly ${targetDuration} seconds.`;

    const userPrompt = `Create a viral ${options.genre} video story.
Topic/Prompt: "${options.prompt}"
Target Duration: ${targetDuration} seconds (${sceneCount} scenes of ${perSceneDuration}s each)
Platform: ${options.platform || 'TikTok/Shorts'}
Tone: ${options.tone || 'suspenseful & engaging'}
Target Audience: ${options.targetAudience || 'General Audience'}
${options.characterNames && options.characterNames.length ? `Characters: ${options.characterNames.join(', ')}` : ''}
${options.customInstructions ? `Special Instructions: ${options.customInstructions}` : ''}`;

    try {
      logger.info('OpenAIService', `Calling OpenAI (${modelToUse}) for full story generation (duration: ${targetDuration}s)...`);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        logger.warn('OpenAIService', `OpenAI API returned status ${response.status}: ${JSON.stringify(errJson)}`);
        return null;
      }

      const resData: any = await response.json();
      const content = resData?.choices?.[0]?.message?.content;
      if (!content) return null;

      const parsed = JSON.parse(content);
      if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
        return null;
      }

      let totalAssigned = 0;
      const formattedScenes = parsed.scenes.map((sc: any, idx: number) => {
        const isLast = idx === parsed.scenes.length - 1;
        const dur = isLast ? (targetDuration - totalAssigned) : (sc.duration || perSceneDuration);
        totalAssigned += dur;
        return {
          title: sc.title || `Scene ${idx + 1}`,
          scriptText: sc.scriptText || '',
          narration: sc.narration || '',
          prompt: sc.prompt || `${sc.title}. Cinematic lighting, 8k resolution.`,
          duration: Math.max(2, dur),
          visualDescription: sc.visualDescription || sc.scriptText || '',
          cameraAngle: sc.cameraAngle || 'Cinematic Eye-Level Push-In',
          lighting: sc.lighting || 'Volumetric Dramatic Lighting',
          actions: sc.actions || 'moves forward with purpose',
          environment: sc.environment || 'Cinematic atmosphere',
          soundEffectSuggestion: sc.soundEffectSuggestion || 'Footsteps on Gravel',
          negativePrompt: sc.negativePrompt || 'blurry, distorted, low quality',
        };
      });

      return {
        hook: parsed.hook || 'Watch what happened next...',
        intro: parsed.intro || '',
        scenes: formattedScenes,
        climax: parsed.climax || '',
        ending: parsed.ending || 'Follow for Part 2!',
      };
    } catch (err: any) {
      logger.error('OpenAIService', `Failed generating story with OpenAI: ${err.message}`);
      return null;
    }
  }

  public async generateStoryIdeas(options: {
    topic: string;
    genre: string;
    characterNames?: string[];
    apiKey?: string;
  }): Promise<string[] | null> {
    const key = this.getApiKey(options.apiKey);
    if (!key) return null;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You generate viral, high-retention 30-second short-form video concepts. Return a JSON object with an array of 5 idea strings under "ideas".',
            },
            {
              role: 'user',
              content: `Give me 5 viral video story ideas for genre "${options.genre}" and topic "${options.topic}". Output JSON only: { "ideas": ["...", "..."] }`,
            },
          ],
          temperature: 0.8,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) return null;
      const resData: any = await response.json();
      const content = resData?.choices?.[0]?.message?.content;
      const parsed = JSON.parse(content);
      return Array.isArray(parsed?.ideas) ? parsed.ideas : null;
    } catch (err: any) {
      logger.warn('OpenAIService', `generateStoryIdeas failed: ${err.message}`);
      return null;
    }
  }

  public async generateHook(options: {
    topic: string;
    genre: string;
    tone?: string;
    apiKey?: string;
  }): Promise<string | null> {
    const key = this.getApiKey(options.apiKey);
    if (!key) return null;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You write irresistible viral opening hooks for short-form videos (TikTok, Shorts, Reels) that stop scrolling in the first 2 seconds. Return JSON: { "hook": "..." }',
            },
            {
              role: 'user',
              content: `Write one killer viral hook for a ${options.genre} video about "${options.topic}". Tone: ${options.tone || 'dramatic'}.`,
            },
          ],
          temperature: 0.8,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) return null;
      const resData: any = await response.json();
      const parsed = JSON.parse(resData?.choices?.[0]?.message?.content);
      return parsed?.hook || null;
    } catch {
      return null;
    }
  }
}

export const openAiService = new OpenAIService();
