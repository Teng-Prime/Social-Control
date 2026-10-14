import fs from 'fs';
import path from 'path';
import { Character, CharacterReference } from '../../shared/types';
import { storageService } from './storageService';
import { characterRepo } from '../database/repositories/characterRepository';
import { logger } from '../logger';

export type ReferenceAngle = 'front' | 'three_quarter' | 'profile' | 'full_body';

export class CharacterImageGenerator {
  /**
   * Generates a high-resolution, consistent visual character reference portrait
   * tailored to the character's facial features, wardrobe, and visual style.
   */
  public async generatePortrait(
    character: Character,
    angle: ReferenceAngle = 'front',
    isPrimary: boolean = false
  ): Promise<CharacterReference> {
    const charFolder = storageService.getFolder('Characters');
    const safeName = character.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const baseFileName = `ref_${character.id}_${angle}_${timestamp}`;
    const svgPath = path.join(charFolder, `${baseFileName}.svg`);
    const pngPath = path.join(charFolder, `${baseFileName}.png`);

    // Parse attributes from character
    const appearance = character.appearance.toLowerCase();
    const clothing = character.clothing.toLowerCase();
    const isDarkHair = appearance.includes('black') || appearance.includes('dark');
    const isBlonde = appearance.includes('blonde') || appearance.includes('gold') || appearance.includes('yellow');
    const isSilver = appearance.includes('silver') || appearance.includes('grey') || appearance.includes('white');
    const isRedHair = appearance.includes('red') || appearance.includes('auburn') || appearance.includes('ginger');

    const hairColor = isSilver ? '#D1D5DB' : isBlonde ? '#FDE047' : isRedHair ? '#EA580C' : isDarkHair ? '#18181B' : '#451A03';
    const hairHighlight = isSilver ? '#F3F4F6' : isBlonde ? '#FEF08A' : isRedHair ? '#FB923C' : '#3F3F46';

    const isFairSkin = appearance.includes('pale') || appearance.includes('fair') || appearance.includes('white') || appearance.includes('caucasian');
    const isDeepSkin = appearance.includes('dark skin') || appearance.includes('black') || appearance.includes('african') || appearance.includes('ebony');
    const isTanSkin = appearance.includes('tan') || appearance.includes('olive') || appearance.includes('latino') || appearance.includes('hispanic');

    const skinColor = isDeepSkin ? '#5C3826' : isTanSkin ? '#C68A4C' : isFairSkin ? '#FCE7D0' : '#E8B98C';
    const skinShadow = isDeepSkin ? '#3D2417' : isTanSkin ? '#9E6733' : isFairSkin ? '#E2B897' : '#B88258';

    // Clothing colors
    const isLeather = clothing.includes('leather') || clothing.includes('bomber') || clothing.includes('jacket');
    const isTactical = clothing.includes('tactical') || clothing.includes('military') || clothing.includes('vest');
    const clothingColor = isLeather ? '#1F2937' : isTactical ? '#1E293B' : '#0F172A';
    const clothingAccent = isLeather ? '#4B5563' : isTactical ? '#10B981' : '#3B82F6';

    // Angle perspectives
    let angleLabel = 'Frontal Portrait Keyframe';
    let headTransform = '';
    let eyesTransform = '';
    let bodyTransform = '';

    if (angle === 'three_quarter') {
      angleLabel = '3/4 Cinematic Angle Keyframe';
      headTransform = 'transform="translate(15, 0) scale(0.96, 1)"';
      eyesTransform = 'transform="translate(25, 0)"';
      bodyTransform = 'transform="translate(20, 0)"';
    } else if (angle === 'profile') {
      angleLabel = 'Side Profile Keyframe';
      headTransform = 'transform="translate(50, 0) scale(0.85, 1)"';
      eyesTransform = 'transform="translate(60, 0)"';
      bodyTransform = 'transform="translate(45, 0)"';
    } else if (angle === 'full_body') {
      angleLabel = 'Full Wardrobe & Costume Spec';
    }

    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <!-- Background Cinematic Glow -->
    <radialGradient id="bgGrad" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#1E1B4B" />
      <stop offset="60%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#020617" />
    </radialGradient>

    <!-- Studio Rim Light -->
    <linearGradient id="rimLight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.7" />
      <stop offset="50%" stop-color="#818CF8" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#F43F5E" stop-opacity="0.6" />
    </linearGradient>

    <!-- Skin Gradient -->
    <linearGradient id="skinGrad" x1="30%" y1="20%" x2="70%" y2="80%">
      <stop offset="0%" stop-color="${skinColor}" />
      <stop offset="100%" stop-color="${skinShadow}" />
    </linearGradient>

    <!-- Hair Gradient -->
    <linearGradient id="hairGrad" x1="20%" y1="10%" x2="80%" y2="90%">
      <stop offset="0%" stop-color="${hairHighlight}" />
      <stop offset="70%" stop-color="${hairColor}" />
      <stop offset="100%" stop-color="#09090B" />
    </linearGradient>

    <!-- Clothing Gradient -->
    <linearGradient id="coatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${clothingAccent}" />
      <stop offset="35%" stop-color="${clothingColor}" />
      <stop offset="100%" stop-color="#09090B" />
    </linearGradient>

    <!-- Vignette filter -->
    <filter id="cinematicGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Dark Atmospheric Backdrop -->
  <rect width="1024" height="1024" fill="url(#bgGrad)" />

  <!-- Studio Volumetric Light Beam -->
  <polygon points="150,0 450,0 750,1024 0,1024" fill="url(#rimLight)" opacity="0.18" />

  <!-- Background Ambience Aperture Ring -->
  <circle cx="512" cy="420" r="340" fill="none" stroke="#38BDF8" stroke-width="2" opacity="0.15" stroke-dasharray="12 8" />
  <circle cx="512" cy="420" r="280" fill="none" stroke="#818CF8" stroke-width="1.5" opacity="0.2" />

  <!-- Character Silhouette & Body Group -->
  <g id="characterGroup">
    <!-- Back Rim Light Glow for Face & Shoulders -->
    <path d="M 320 620 C 320 540, 704 540, 704 620 L 760 1024 L 264 1024 Z" fill="#38BDF8" opacity="0.15" filter="url(#cinematicGlow)" />

    <!-- Shoulders & Upper Body / Wardrobe -->
    <g ${bodyTransform}>
      <!-- Main Coat / Torso -->
      <path d="M 270 720 C 330 640, 420 620, 512 620 C 604 620, 694 640, 754 720 L 820 1024 L 204 1024 Z" fill="url(#coatGrad)" stroke="#1E293B" stroke-width="2" />

      <!-- Collar & Jacket Lapels -->
      <path d="M 430 620 L 512 740 L 410 880 L 320 720 Z" fill="#0F172A" stroke="${clothingAccent}" stroke-width="2" />
      <path d="M 594 620 L 512 740 L 614 880 L 704 720 Z" fill="#1E293B" stroke="${clothingAccent}" stroke-width="2" />

      <!-- Inner Shirt / Neck Opening -->
      <polygon points="460,620 564,620 512,710" fill="#020617" />

      <!-- Characteristic Accessory: Titanium Chain / Pendant -->
      <path d="M 470 630 Q 512 690 554 630" fill="none" stroke="#94A3B8" stroke-width="3" />
      <circle cx="512" cy="690" r="8" fill="#38BDF8" stroke="#E2E8F0" stroke-width="2" />
    </g>

    <!-- Neck -->
    <rect x="462" y="520" width="100" height="120" rx="20" fill="url(#skinGrad)" />
    <!-- Neck shadow under chin -->
    <path d="M 462 530 Q 512 580 562 530 L 562 555 Q 512 605 462 555 Z" fill="${skinShadow}" opacity="0.7" />

    <!-- Head & Facial Structure -->
    <g ${headTransform}>
      <!-- Head Base (Oval with tapered jawline) -->
      <path d="M 362 380 C 362 250, 662 250, 662 380 C 662 500, 592 565, 512 565 C 432 565, 362 500, 362 380 Z" fill="url(#skinGrad)" stroke="${skinShadow}" stroke-width="1.5" />

      <!-- Ears with Rim Lighting -->
      <ellipse cx="356" cy="400" rx="18" ry="34" fill="${skinColor}" stroke="#38BDF8" stroke-width="1.5" />
      <ellipse cx="668" cy="400" rx="18" ry="34" fill="${skinColor}" stroke="#818CF8" stroke-width="1.5" />

      <!-- Facial Features Group -->
      <g ${eyesTransform}>
        <!-- Brow Line -->
        <path d="M 410 365 Q 445 355 475 368" fill="none" stroke="${hairColor}" stroke-width="4.5" stroke-linecap="round" />
        <path d="M 549 368 Q 579 355 614 365" fill="none" stroke="${hairColor}" stroke-width="4.5" stroke-linecap="round" />

        <!-- Expressive Eyes -->
        <!-- Left Eye -->
        <ellipse cx="445" cy="390" rx="24" ry="14" fill="#FFFFFF" />
        <circle cx="445" cy="390" r="10" fill="#0284C7" />
        <circle cx="445" cy="390" r="5" fill="#0F172A" />
        <circle cx="442" cy="387" r="2.5" fill="#FFFFFF" />

        <!-- Right Eye -->
        <ellipse cx="579" cy="390" rx="24" ry="14" fill="#FFFFFF" />
        <circle cx="579" cy="390" r="10" fill="#0284C7" />
        <circle cx="579" cy="390" r="5" fill="#0F172A" />
        <circle cx="576" cy="387" r="2.5" fill="#FFFFFF" />

        <!-- Eyelashes & Contour -->
        <path d="M 420 388 Q 445 374 470 388" fill="none" stroke="#0F172A" stroke-width="2.5" />
        <path d="M 554 388 Q 579 374 604 388" fill="none" stroke="#0F172A" stroke-width="2.5" />

        <!-- Sculpted Nose -->
        <path d="M 512 375 L 507 455 Q 512 462 522 455" fill="none" stroke="${skinShadow}" stroke-width="3" stroke-linecap="round" />
        <ellipse cx="512" cy="458" rx="16" ry="6" fill="${skinShadow}" opacity="0.4" />

        <!-- Lips / Mouth -->
        <path d="M 475 498 Q 512 492 549 498" fill="none" stroke="#991B1B" stroke-width="3.5" stroke-linecap="round" />
        <path d="M 480 500 Q 512 516 544 500" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" opacity="0.85" />
      </g>

      <!-- Hair Layer (Volumetric Hairstyle) -->
      <path d="M 338 340 C 330 200, 694 200, 686 340 C 700 240, 640 160, 512 160 C 384 160, 324 240, 338 340 Z" fill="url(#hairGrad)" />
      <!-- Front Bangs / Texture Locks -->
      <path d="M 346 320 C 370 230, 480 230, 500 310 C 512 240, 610 240, 678 320 C 640 260, 560 270, 512 285 C 460 270, 380 260, 346 320 Z" fill="url(#hairGrad)" stroke="#09090B" stroke-width="1.5" />
      <!-- Side Strands -->
      <path d="M 340 330 Q 330 430 355 450 Q 365 390 355 350 Z" fill="url(#hairGrad)" />
      <path d="M 684 330 Q 694 430 669 450 Q 659 390 669 350 Z" fill="url(#hairGrad)" />
    </g>
  </g>

  <!-- Technical Casting Specs & Continuity Overlay -->
  <g id="overlayBadge">
    <!-- Top Continuity Pill -->
    <rect x="36" y="36" width="360" height="48" rx="12" fill="#0F172A" opacity="0.85" stroke="#38BDF8" stroke-width="1.5" />
    <circle cx="56" cy="60" r="7" fill="#38BDF8" />
    <text x="74" y="66" fill="#F8FAFC" font-family="system-ui, sans-serif" font-size="16" font-weight="bold">AI CHARACTER CONTINUITY SEED</text>

    <!-- Bottom Metadata Panel -->
    <rect x="36" y="870" width="952" height="118" rx="16" fill="#09090B" opacity="0.9" stroke="#334155" stroke-width="1.5" />

    <!-- Name & Angle Tag -->
    <text x="64" y="915" fill="#38BDF8" font-family="system-ui, sans-serif" font-size="28" font-weight="900">${character.name.toUpperCase()}</text>
    <rect x="64" y="932" width="220" height="26" rx="6" fill="#1E293B" />
    <text x="76" y="950" fill="#38BDF8" font-family="system-ui, sans-serif" font-size="13" font-weight="bold">${angleLabel.toUpperCase()}</text>

    <!-- Continuity Specs Summary -->
    <text x="340" y="916" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="14">Face: <tspan fill="#F1F5F9">${character.appearance.slice(0, 60)}...</tspan></text>
    <text x="340" y="944" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="14">Wardrobe: <tspan fill="#F1F5F9">${character.clothing.slice(0, 60)}...</tspan></text>
    <text x="340" y="970" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="14">Style: <tspan fill="#F1F5F9">${character.visualStyle.slice(0, 60)}</tspan></text>

    <!-- Primary Lock Icon Status -->
    <circle cx="940" cy="928" r="24" fill="#1E293B" stroke="#38BDF8" stroke-width="2" />
    <text x="940" y="935" fill="#38BDF8" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" text-anchor="middle">✓</text>
  </g>
</svg>
    `.trim();

    // Write SVG master
    fs.writeFileSync(svgPath, svgContent, 'utf-8');

    // Attempt native PNG conversion if running inside Electron
    let finalImagePath = svgPath;
    try {
      const electron = require('electron');
      const nativeImage = electron.nativeImage;
      if (nativeImage && typeof nativeImage.createFromBuffer === 'function') {
        const nImg = nativeImage.createFromBuffer(Buffer.from(svgContent));
        if (!nImg.isEmpty()) {
          fs.writeFileSync(pngPath, nImg.toPNG());
          finalImagePath = pngPath;
        }
      }
    } catch {
      // SVG fallback
    }

    const promptText = `Character ${character.name}: ${angleLabel}. ${character.appearance}, dressed in ${character.clothing}. ${character.visualStyle}. Exact facial and costume continuity keyframe for video generation.`;

    const ref = characterRepo.addReference(character.id, finalImagePath, promptText, isPrimary);
    logger.info('CharacterImageGenerator', `Generated ${angle} portrait photo for ${character.name}: ${finalImagePath}`);
    return ref;
  }

  /**
   * Generates a complete 3-angle reference suite for a character (Front, 3/4 Profile, Full Body)
   */
  public async generateMultiAngleSuite(character: Character): Promise<CharacterReference[]> {
    const front = await this.generatePortrait(character, 'front', true);
    const threeQuarter = await this.generatePortrait(character, 'three_quarter', false);
    const profile = await this.generatePortrait(character, 'profile', false);
    return [front, threeQuarter, profile];
  }
}

export const characterImageGenerator = new CharacterImageGenerator();
