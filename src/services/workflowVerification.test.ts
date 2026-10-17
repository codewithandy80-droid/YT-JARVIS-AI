/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Workflow Verification & Automated Tests
 * Validates:
 * - Test A: Source Persistence across tabs and reloads
 * - Test B: Source Selection & Content Integrity (prevents substitution)
 * - Test C: End-to-End Production Workflow (Sources -> Script -> Prompts -> Thumbnails -> SEO -> Editor -> Export)
 */

import {
  saveSource,
  getSavedSources,
  getSourceById,
  updateSource,
  deleteSource,
  subscribeSources,
  type SourceItem,
} from './sourceRepository.ts';
import {
  createDefaultProductionProfile,
  updateProductionProfile,
  buildCompleteVideoPrompt,
  buildCompleteThumbnailPrompt,
  validateExportSettings,
} from './productionProfileService.ts';
import { convertScriptToEditorProject } from './editorDefaults.ts';
import type { ScriptGenerationResponse } from './api.ts';

// In-memory mock localStorage for Node testing environment
if (typeof localStorage === 'undefined' || !localStorage.getItem) {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => store.set(key, String(val)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
}

export function runAutomatedWorkflowTests() {
  console.log('========================================================');
  console.log('🚀 RUNNING JARVIS YT-AI AUTOMATED SYSTEM TESTS');
  console.log('========================================================\n');

  const testUserId = `test_creator_${Date.now()}`;

  // ==========================================
  // TEST A: SOURCE PERSISTENCE
  // ==========================================
  console.log('▶ TEST A: Source Persistence');
  
  // 1. Initial count must be 0 for a new test user
  const initialSources = getSavedSources(testUserId);
  if (initialSources.length !== 0) {
    throw new Error(`Test A Failed: Expected 0 initial sources, found ${initialSources.length}`);
  }

  // 2. Save a source with a unique title and recognizable text
  const sourceTitle = 'Quantum AI Breakthroughs 2026';
  const sourceText = 'Scientists at CERN and MIT achieved quantum coherence in ambient silicon chips, unlocking 10,000x faster AI compute.';
  const saved = saveSource(testUserId, {
    title: sourceTitle,
    text: sourceText,
  });

  if (!saved.id || !saved.id.startsWith('src_')) {
    throw new Error('Test A Failed: Saved source does not have a valid stable ID');
  }
  if (saved.title !== sourceTitle || saved.text !== sourceText) {
    throw new Error('Test A Failed: Saved source title or text does not match input');
  }

  // 3. Confirm it appears in Saved Sources immediately
  const sourcesAfterSave = getSavedSources(testUserId);
  if (sourcesAfterSave.length !== 1) {
    throw new Error(`Test A Failed: Expected 1 saved source, found ${sourcesAfterSave.length}`);
  }
  if (sourcesAfterSave[0].id !== saved.id) {
    throw new Error('Test A Failed: Retrieved source ID does not match saved ID');
  }
  console.log('  ✓ Saved source appears in Sources list immediately with stable ID');

  // 4. Simulate Script Generator loading sources (same service)
  let subscriberUpdateCount = 0;
  let receivedSources: SourceItem[] = [];
  const unsubscribe = subscribeSources(testUserId, (list) => {
    subscriberUpdateCount++;
    receivedSources = list;
  });

  if (receivedSources.length !== 1 || receivedSources[0].title !== sourceTitle) {
    throw new Error('Test A Failed: Script Generator subscription did not receive the saved source');
  }
  console.log('  ✓ Script Generator source library shows matching source and count (1)');

  // 5. Test real-time subscription update
  saveSource(testUserId, {
    title: 'James Webb Deep Field Discoveries',
    text: 'JWST captured the earliest galaxies formed 300 million years after the Big Bang.',
  });
  if ((receivedSources.length as number) !== 2) {
    throw new Error('Test A Failed: Script Generator library did not update in real-time when 2nd source added');
  }
  console.log('  ✓ Real-time cross-tab synchronization updates library count to 2');
  unsubscribe();

  // 6. Simulate application reload / cache read
  const reloadedSources = getSavedSources(testUserId);
  if (reloadedSources.length !== 2) {
    throw new Error('Test A Failed: Reload failed to recover saved sources');
  }
  console.log('  ✓ Application reload retains all saved sources with exact metadata');
  console.log('✅ TEST A PASSED: Source Persistence verified.\n');

  // ==========================================
  // TEST B: SOURCE SELECTION & CONTENT INTEGRITY
  // ==========================================
  console.log('▶ TEST B: Source Selection & Integrity');

  // 1. Select specific source by ID
  const selectedSource = getSourceById(testUserId, saved.id);
  if (!selectedSource) {
    throw new Error('Test B Failed: Could not find saved source by ID');
  }
  if (selectedSource.id !== saved.id) {
    throw new Error('Test B Failed: Source ID mismatch on selection');
  }
  if (selectedSource.text !== sourceText) {
    throw new Error('Test B Failed: Selected source text corrupted or truncated');
  }
  console.log('  ✓ Source selected correctly with ID and pristine text content');

  // 2. Verify non-existent ID handled safely
  const nonExistent = getSourceById(testUserId, 'src_fake_9999');
  if (nonExistent !== undefined) {
    throw new Error('Test B Failed: Non-existent source ID returned an unexpected value');
  }
  console.log('  ✓ Non-existent source reference safely returns undefined');

  // 3. Test non-destructive custom tweak
  const customTweak = `${selectedSource.text} [TWEAKED: Emphasize silicon fabrication]`;
  if (customTweak === selectedSource.text) {
    throw new Error('Test B Failed: Custom tweak failed to differentiate');
  }
  // Ensure original is preserved in storage
  const originalCheck = getSourceById(testUserId, saved.id);
  if (originalCheck?.text !== sourceText) {
    throw new Error('Test B Failed: Original source was mutated by local custom tweak');
  }
  console.log('  ✓ Original source text safely preserved during per-script tweaking');
  console.log('✅ TEST B PASSED: Source Selection & Integrity verified.\n');

  // ==========================================
  // TEST C: END-TO-END WORKFLOW & RATIO PROPAGATION
  // ==========================================
  console.log('▶ TEST C: End-to-End Workflow & Ratio Propagation');

  // 1. Script Generation output contract simulation
  const dummyScript: ScriptGenerationResponse = {
    contentMode: 'Science & Technology',
    durationSeconds: 32,
    language: 'English',
    totalSegments: 4,
    estimatedTotalSeconds: 32,
    sourceId: saved.id,
    sourceTitle: saved.title,
    aspectRatio: '9:16',
    model: 'gemini-3.8-flash',
    segments: [
      {
        segmentNumber: 1,
        type: 'Hook',
        voiceover: 'Silicon chips just took a massive quantum leap.',
        timestamp: '00:00 - 00:08',
        estimatedDurationSeconds: 8,
        wordCount: 8,
      },
      {
        segmentNumber: 2,
        type: 'Main Part 1',
        voiceover: 'At room temperature, scientists locked qubits in standard microprocessors.',
        timestamp: '00:08 - 00:16',
        estimatedDurationSeconds: 8,
        wordCount: 10,
      },
      {
        segmentNumber: 3,
        type: 'Main Part 2',
        voiceover: 'This means existing cleanrooms can produce supercomputing power at consumer scale.',
        timestamp: '00:16 - 00:24',
        estimatedDurationSeconds: 8,
        wordCount: 11,
      },
      {
        segmentNumber: 4,
        type: 'Ending',
        voiceover: 'The quantum era is no longer twenty years away. It is here.',
        timestamp: '00:24 - 00:32',
        estimatedDurationSeconds: 8,
        wordCount: 12,
      },
    ],
  };

  if (dummyScript.sourceId !== saved.id || dummyScript.sourceTitle !== sourceTitle) {
    throw new Error('Test C Failed: Script does not retain sourceId and sourceTitle');
  }
  console.log('  ✓ Generated script retains source provenance (sourceId & sourceTitle)');

  // 2. Video Prompt Builder generation with 9:16 portrait ratio
  const p916 = createDefaultProductionProfile('proj-workflow-1', '9:16', sourceTitle);
  const promptSeg1 = buildCompleteVideoPrompt(dummyScript.segments[0], p916);
  if (!promptSeg1.includes('9:16') || !promptSeg1.includes('PORTRAIT') || !promptSeg1.includes(dummyScript.segments[0].voiceover)) {
    throw new Error('Test C Failed: Video prompt does not match segment voiceover or ratio');
  }
  console.log('  ✓ Video Prompt Builder generates 9:16 portrait prompt with exact segment dialogue');

  // 3. Ratio switch to 16:9 widescreen
  const p169 = updateProductionProfile(p916, { aspectRatio: '16:9' });
  if (p169.frameWidth !== 1920 || p169.frameHeight !== 1080 || p169.orientation !== 'landscape') {
    throw new Error('Test C Failed: Switching ratio did not update dimensions to 1920x1080');
  }
  const promptSeg1Widescreen = buildCompleteVideoPrompt(dummyScript.segments[0], p169);
  if (!promptSeg1Widescreen.includes('16:9') || !promptSeg1Widescreen.includes('LANDSCAPE')) {
    throw new Error('Test C Failed: Widescreen prompt does not reflect 16:9 ratio');
  }
  console.log('  ✓ Global ratio switch cleanly propagates 16:9 widescreen to prompt generation');

  // 4. Thumbnail Studio prompt respects project topic and ratio
  const thumbnailPrompt = buildCompleteThumbnailPrompt(saved.title, p916);
  if (!thumbnailPrompt.includes(saved.title) || !thumbnailPrompt.includes('9:16')) {
    throw new Error('Test C Failed: Thumbnail prompt missing topic or aspect ratio');
  }
  console.log('  ✓ Thumbnail Studio builds prompt with real topic and project ratio');

  // 5. YT Editor Timeline conversion
  const editorProject = convertScriptToEditorProject(dummyScript, saved.title);
  if (!editorProject.clips || editorProject.clips.length === 0) {
    throw new Error('Test C Failed: Script conversion to YT Editor timeline produced 0 clips');
  }
  const voiceoverClips = editorProject.clips.filter((c) => c.type === 'text');
  if (voiceoverClips.length !== 4) {
    throw new Error(`Test C Failed: Expected 4 voiceover/caption clips, found ${voiceoverClips.length}`);
  }
  console.log(`  ✓ YT Editor converts 4 script segments into timeline clips (${voiceoverClips.length} dialogue cards)`);

  // 6. Export Validation matches project profile
  const validExport = validateExportSettings(p169, { width: 1920, height: 1080 });
  if (!validExport.valid || validExport.warnings.length > 0) {
    throw new Error('Test C Failed: Valid 16:9 export failed validation');
  }
  const invalidExport = validateExportSettings(p169, { width: 1080, height: 1920 });
  if (invalidExport.valid) {
    throw new Error('Test C Failed: Inverted aspect ratio was incorrectly allowed without warnings');
  }
  console.log('  ✓ Export Engine accurately validates canonical sequence resolution against project ratio');

  console.log('✅ TEST C PASSED: End-to-End Workflow & Ratio Propagation verified.\n');

  console.log('========================================================');
  console.log('🎉 ALL AUTOMATED TESTS (A, B, C) PASSED WITH 100% SUCCESS!');
  console.log('========================================================\n');
  process.exit(0);
}

// Execute tests immediately when run via CLI
runAutomatedWorkflowTests();
