/**
 * JARVIS Global Production Profile Engine
 * Authoritative single source of truth for aspect ratios, sequence dimensions,
 * visual directions, prompt composition, and multi-tool workflow propagation.
 */

export type ProjectAspectRatio = '9:16' | '16:9';
export type ProjectOrientation = 'portrait' | 'landscape';
export type ResolutionQuality = '720p' | '1080p' | '4k';
export type TargetPlatform = 'youtube_shorts' | 'youtube_longform' | 'tiktok' | 'reels';

export interface SubtitlePreferences {
  enabled: boolean;
  fontSize: number;
  fontFamily: string;
  color: string;
  outlineColor: string;
  position: 'bottom' | 'center' | 'top';
  safeZonePadding: number;
}

export interface SafeAreaSettings {
  titleSafePercent: number;
  actionSafePercent: number;
  platformSafeZone: 'shorts_ui' | 'reels_ui' | 'standard_16_9';
  topMarginPercent: number;
  bottomMarginPercent: number;
}

export interface AudioPreferences {
  backgroundMusicVolume: number;
  voiceoverVolume: number;
  duckingEnabled: boolean;
  ambientSoundscape: string;
}

export interface NarrationPreferences {
  cadenceWpm: number;
  tone: string;
}

export interface ProductionProfile {
  projectId: string;
  projectName: string;
  aspectRatio: ProjectAspectRatio;
  frameWidth: number;
  frameHeight: number;
  orientation: ProjectOrientation;
  frameRate: 24 | 30 | 60;
  resolutionPreset: ResolutionQuality;
  language: string;
  contentMode: string;
  targetPlatform: TargetPlatform;
  defaultClipDuration: number;
  visualStyle: string;
  cameraMotionPreset: string;
  lightingPreset: string;
  subtitlePreferences: SubtitlePreferences;
  safeAreaSettings: SafeAreaSettings;
  audioPreferences: AudioPreferences;
  narrationPreferences: NarrationPreferences;
  productionVersion: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Dimension lookup based on aspect ratio and resolution preset.
 */
export const DIMENSION_MATRIX: Record<ProjectAspectRatio, Record<ResolutionQuality, { width: number; height: number }>> = {
  '9:16': {
    '720p': { width: 720, height: 1280 },
    '1080p': { width: 1080, height: 1920 },
    '4k': { width: 2160, height: 3840 },
  },
  '16:9': {
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '4k': { width: 3840, height: 2160 },
  },
};

/**
 * Creates default production profile with strict aspect-ratio resolution.
 */
export function createDefaultProductionProfile(
  projectId?: string,
  ratio: ProjectAspectRatio = '9:16',
  name?: string
): ProductionProfile {
  const id = projectId || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const orientation: ProjectOrientation = ratio === '9:16' ? 'portrait' : 'landscape';
  const targetPlatform: TargetPlatform = ratio === '9:16' ? 'youtube_shorts' : 'youtube_longform';
  const dims = DIMENSION_MATRIX[ratio]['1080p'];

  return {
    projectId: id,
    projectName: name || (ratio === '9:16' ? 'Untitled Vertical Short' : 'Untitled Widescreen Feature'),
    aspectRatio: ratio,
    frameWidth: dims.width,
    frameHeight: dims.height,
    orientation,
    frameRate: 30,
    resolutionPreset: '1080p',
    language: 'English',
    contentMode: 'Cinematic Documentary',
    targetPlatform,
    defaultClipDuration: ratio === '9:16' ? 4 : 5,
    visualStyle: 'Cinematic Photorealistic 35mm',
    cameraMotionPreset: ratio === '9:16' ? 'Dynamic Vertical Dolly' : 'Smooth Cinematic Dolly',
    lightingPreset: 'Dramatic Natural Lighting',
    subtitlePreferences: {
      enabled: true,
      fontSize: ratio === '9:16' ? 42 : 36,
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#FFFFFF',
      outlineColor: '#000000',
      position: 'bottom',
      safeZonePadding: ratio === '9:16' ? 180 : 80,
    },
    safeAreaSettings: {
      titleSafePercent: 10,
      actionSafePercent: 5,
      platformSafeZone: ratio === '9:16' ? 'shorts_ui' : 'standard_16_9',
      topMarginPercent: ratio === '9:16' ? 12 : 6,
      bottomMarginPercent: ratio === '9:16' ? 18 : 8,
    },
    audioPreferences: {
      backgroundMusicVolume: 0.35,
      voiceoverVolume: 1.0,
      duckingEnabled: true,
      ambientSoundscape: 'Subtle cinematic acoustic score',
    },
    narrationPreferences: {
      cadenceWpm: 145,
      tone: 'Authoritative, engaging, broadcast-standard',
    },
    productionVersion: 2,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Validates and sanitizes a production profile against the canonical schema.
 */
export function validateProductionProfile(raw: any): ProductionProfile {
  if (!raw || typeof raw !== 'object') {
    return createDefaultProductionProfile();
  }

  const ratio: ProjectAspectRatio = raw.aspectRatio === '16:9' ? '16:9' : '9:16';
  const resolution: ResolutionQuality = ['720p', '1080p', '4k'].includes(raw.resolutionPreset)
    ? raw.resolutionPreset
    : '1080p';

  const dims = DIMENSION_MATRIX[ratio][resolution];
  const orientation: ProjectOrientation = ratio === '9:16' ? 'portrait' : 'landscape';

  return {
    projectId: typeof raw.projectId === 'string' && raw.projectId.length > 0 ? raw.projectId : `proj_${Date.now()}`,
    projectName: typeof raw.projectName === 'string' && raw.projectName.length > 0 ? raw.projectName : 'Untitled Project',
    aspectRatio: ratio,
    frameWidth: dims.width,
    frameHeight: dims.height,
    orientation,
    frameRate: [24, 30, 60].includes(raw.frameRate) ? raw.frameRate : 30,
    resolutionPreset: resolution,
    language: typeof raw.language === 'string' ? raw.language : 'English',
    contentMode: typeof raw.contentMode === 'string' ? raw.contentMode : 'Cinematic Documentary',
    targetPlatform: ['youtube_shorts', 'youtube_longform', 'tiktok', 'reels'].includes(raw.targetPlatform)
      ? raw.targetPlatform
      : ratio === '9:16' ? 'youtube_shorts' : 'youtube_longform',
    defaultClipDuration: typeof raw.defaultClipDuration === 'number' ? raw.defaultClipDuration : (ratio === '9:16' ? 4 : 5),
    visualStyle: typeof raw.visualStyle === 'string' ? raw.visualStyle : 'Cinematic Photorealistic 35mm',
    cameraMotionPreset: typeof raw.cameraMotionPreset === 'string' ? raw.cameraMotionPreset : 'Smooth Cinematic Dolly',
    lightingPreset: typeof raw.lightingPreset === 'string' ? raw.lightingPreset : 'Dramatic Natural Lighting',
    subtitlePreferences: {
      enabled: raw.subtitlePreferences?.enabled !== false,
      fontSize: typeof raw.subtitlePreferences?.fontSize === 'number' ? raw.subtitlePreferences.fontSize : (ratio === '9:16' ? 42 : 36),
      fontFamily: raw.subtitlePreferences?.fontFamily || 'Inter, system-ui, sans-serif',
      color: raw.subtitlePreferences?.color || '#FFFFFF',
      outlineColor: raw.subtitlePreferences?.outlineColor || '#000000',
      position: raw.subtitlePreferences?.position || 'bottom',
      safeZonePadding: typeof raw.subtitlePreferences?.safeZonePadding === 'number' ? raw.subtitlePreferences.safeZonePadding : (ratio === '9:16' ? 180 : 80),
    },
    safeAreaSettings: {
      titleSafePercent: 10,
      actionSafePercent: 5,
      platformSafeZone: ratio === '9:16' ? 'shorts_ui' : 'standard_16_9',
      topMarginPercent: ratio === '9:16' ? 12 : 6,
      bottomMarginPercent: ratio === '9:16' ? 18 : 8,
    },
    audioPreferences: {
      backgroundMusicVolume: typeof raw.audioPreferences?.backgroundMusicVolume === 'number' ? raw.audioPreferences.backgroundMusicVolume : 0.35,
      voiceoverVolume: typeof raw.audioPreferences?.voiceoverVolume === 'number' ? raw.audioPreferences.voiceoverVolume : 1.0,
      duckingEnabled: raw.audioPreferences?.duckingEnabled !== false,
      ambientSoundscape: raw.audioPreferences?.ambientSoundscape || 'Subtle cinematic acoustic score',
    },
    narrationPreferences: {
      cadenceWpm: typeof raw.narrationPreferences?.cadenceWpm === 'number' ? raw.narrationPreferences.cadenceWpm : 145,
      tone: raw.narrationPreferences?.tone || 'Authoritative, engaging, broadcast-standard',
    },
    productionVersion: typeof raw.productionVersion === 'number' ? raw.productionVersion : 2,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Updates production profile immutably, recalculating dimensions and dependent settings if ratio or resolution changes.
 */
export function updateProductionProfile(
  current: ProductionProfile,
  changes: Partial<ProductionProfile>
): ProductionProfile {
  const updatedRatio: ProjectAspectRatio = changes.aspectRatio || current.aspectRatio;
  const updatedRes: ResolutionQuality = changes.resolutionPreset || current.resolutionPreset;
  const dims = DIMENSION_MATRIX[updatedRatio][updatedRes];
  const orientation: ProjectOrientation = updatedRatio === '9:16' ? 'portrait' : 'landscape';
  const targetPlatform: TargetPlatform = changes.targetPlatform || (updatedRatio === '9:16' ? 'youtube_shorts' : 'youtube_longform');

  return {
    ...current,
    ...changes,
    aspectRatio: updatedRatio,
    frameWidth: dims.width,
    frameHeight: dims.height,
    orientation,
    resolutionPreset: updatedRes,
    targetPlatform,
    safeAreaSettings: {
      ...current.safeAreaSettings,
      platformSafeZone: updatedRatio === '9:16' ? 'shorts_ui' : 'standard_16_9',
      topMarginPercent: updatedRatio === '9:16' ? 12 : 6,
      bottomMarginPercent: updatedRatio === '9:16' ? 18 : 8,
    },
    subtitlePreferences: {
      ...current.subtitlePreferences,
      safeZonePadding: updatedRatio === '9:16' ? 180 : 80,
    },
    updatedAt: Date.now(),
  };
}

/**
 * Deterministically builds the complete video prompt with strict aspect ratio,
 * orientation, framing instructions, approved dialogue, camera movement, and safe zones.
 */
export function buildCompleteVideoPrompt(
  segment: {
    segmentNumber?: number;
    type?: string;
    timestamp?: string;
    voiceover?: string;
    visualScene?: string;
    durationSeconds?: number;
    cameraMovement?: string;
    lighting?: string;
  },
  profile: ProductionProfile,
  index: number = 0
): string {
  const isPortrait = profile.aspectRatio === '9:16';
  const ratioLabel = isPortrait ? '9:16 Vertical Portrait' : '16:9 Widescreen Landscape';
  const framingInstruction = isPortrait
    ? 'VERTICAL COMPOSITION (9:16): Center-weighted vertical framing, high-retention portrait depth, subject kept strictly within vertical title and action safe zones (12% top and 18% bottom UI clearance).'
    : 'CINEMATIC HORIZONTAL COMPOSITION (16:9): Expansive widescreen rule-of-thirds, 35mm anamorphic field of view, horizontal subject balance, 10% outer safe margin.';

  const segNum = segment.segmentNumber || index + 1;
  const segType = segment.type || (segNum === 1 ? 'Hook' : 'Main');
  const duration = segment.durationSeconds || profile.defaultClipDuration;
  const camera = segment.cameraMovement || profile.cameraMotionPreset;
  const lighting = segment.lighting || profile.lightingPreset;
  const style = profile.visualStyle;
  const scene = segment.visualScene || 'Dynamic scene representing narrative progression with cinematic clarity.';
  const voiceover = segment.voiceover ? `Approved Voiceover Narration: "${segment.voiceover.trim()}"` : '';

  return [
    `[PROJECT PRODUCTION PROFILE: ${ratioLabel}]`,
    `[ASPECT RATIO: ${profile.aspectRatio}] [RESOLUTION: ${profile.frameWidth}x${profile.frameHeight}] [ORIENTATION: ${profile.orientation.toUpperCase()}]`,
    `[SCENE SEGMENT #${segNum}: ${segType} (${duration}s)]`,
    `FRAMING & GEOMETRY: ${framingInstruction}`,
    `VISUAL SCENE: ${scene}`,
    `CAMERA MOVEMENT: ${camera}`,
    `LIGHTING & COLOR: ${lighting}, color graded in ${profile.visualStyle}`,
    `PRODUCTION STYLE: ${style}, high-fidelity render, crisp textural detail`,
    voiceover,
    `RESTRICTIONS: Strict ${profile.aspectRatio} aspect ratio, zero black bars, no distortion, no unnatural warping, text elements rendered cleanly within safe bounds.`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Deterministically builds complete thumbnail prompt aligned with project aspect ratio
 * or destination override (e.g. YouTube standard 16:9 thumbnail for a 9:16 video).
 */
export function buildCompleteThumbnailPrompt(
  topic: string,
  profile: ProductionProfile,
  destinationOverride?: '9:16' | '16:9'
): string {
  const activeRatio = destinationOverride || profile.aspectRatio;
  const isPortrait = activeRatio === '9:16';

  const composition = isPortrait
    ? 'Vertical 9:16 composition, full-bleed smartphone display framing, large dramatic hero subject in the upper two-thirds, bold high-contrast text area in center safe zone.'
    : 'Cinematic 16:9 widescreen composition, high-contrast YouTube thumbnail composition, striking foreground subject with expressive focal intensity, atmospheric background bokeh.';

  return [
    `Photorealistic YouTube thumbnail concept for "${topic || profile.projectName}"`,
    `Aspect Ratio: ${activeRatio} (${isPortrait ? 'Portrait Vertical' : 'Landscape Widescreen'})`,
    `Composition: ${composition}`,
    `Style: ${profile.visualStyle}, ultra-crisp depth, dramatic rim lighting, studio key light`,
    `Visual Focus: Highly legible, eye-catching focal anchor, hyper-saturated contrast designed for high click-through retention.`,
  ].join('\n');
}

/**
 * Resolves exact asset dimensions for downstream tools.
 */
export function resolveAssetAspectRatio(
  profile: ProductionProfile,
  assetType: string,
  destination?: string
): { width: number; height: number; ratio: string } {
  if (assetType === 'thumbnail') {
    const thumbRatio = (destination === '16:9' || destination === '9:16') ? destination : profile.aspectRatio;
    return thumbRatio === '9:16'
      ? { width: 1080, height: 1920, ratio: '9:16' }
      : { width: 1280, height: 720, ratio: '16:9' };
  }

  return {
    width: profile.frameWidth,
    height: profile.frameHeight,
    ratio: profile.aspectRatio,
  };
}

/**
 * Validates export settings against the authoritative production profile.
 */
export function validateExportSettings(
  profile: ProductionProfile,
  exportSettings: any
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!exportSettings) {
    return { valid: false, warnings: ['Missing export settings payload.'] };
  }

  if (exportSettings.width && exportSettings.height) {
    const exportRatio = (exportSettings.width / exportSettings.height).toFixed(2);
    const profileRatio = (profile.frameWidth / profile.frameHeight).toFixed(2);
    if (exportRatio !== profileRatio) {
      warnings.push(
        `Export dimensions (${exportSettings.width}x${exportSettings.height}) do not match project production profile ratio ${profile.aspectRatio} (${profile.frameWidth}x${profile.frameHeight}). Non-destructive letterboxing or reframing will be applied.`
      );
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Migrates legacy project objects that lack an authoritative ProductionProfile.
 */
export function migrateLegacyProject(legacy: any): ProductionProfile {
  if (!legacy) return createDefaultProductionProfile();

  // Infer from legacy settings if present
  let inferredRatio: ProjectAspectRatio = '9:16';
  if (legacy.settings?.resolution?.id === '16:9' || legacy.aspectRatio === '16:9') {
    inferredRatio = '16:9';
  } else if (legacy.settings?.resolution?.width && legacy.settings?.resolution?.height) {
    if (legacy.settings.resolution.width > legacy.settings.resolution.height) {
      inferredRatio = '16:9';
    }
  }

  const base = createDefaultProductionProfile(
    legacy.id || legacy.settings?.id,
    inferredRatio,
    legacy.name || legacy.settings?.name
  );

  return {
    ...base,
    language: legacy.language || base.language,
    contentMode: legacy.contentMode || base.contentMode,
    createdAt: legacy.createdAt || base.createdAt,
    updatedAt: Date.now(),
  };
}
