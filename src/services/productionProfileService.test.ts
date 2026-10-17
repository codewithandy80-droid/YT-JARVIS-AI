import {
  createDefaultProductionProfile,
  updateProductionProfile,
  buildCompleteVideoPrompt,
  buildCompleteThumbnailPrompt,
  resolveAssetAspectRatio,
  validateExportSettings,
  migrateLegacyProject,
} from './productionProfileService.ts';

function runTests() {
  console.log('=== Running Production Profile Engine Unit Tests ===');

  // Test 1: 9:16 Profile Creation
  const p916 = createDefaultProductionProfile('test-1', '9:16', 'Short Video');
  if (p916.aspectRatio !== '9:16' || p916.frameWidth !== 1080 || p916.frameHeight !== 1920 || p916.orientation !== 'portrait') {
    throw new Error('Test 1 Failed: 9:16 profile has incorrect dimensions or orientation');
  }
  console.log('✓ Test 1 Passed: 9:16 default profile creates 1080x1920 portrait');

  // Test 2: 16:9 Profile Creation
  const p169 = createDefaultProductionProfile('test-2', '16:9', 'Widescreen Video');
  if (p169.aspectRatio !== '16:9' || p169.frameWidth !== 1920 || p169.frameHeight !== 1080 || p169.orientation !== 'landscape') {
    throw new Error('Test 2 Failed: 16:9 profile has incorrect dimensions or orientation');
  }
  console.log('✓ Test 2 Passed: 16:9 default profile creates 1920x1080 landscape');

  // Test 3: Updating Ratio updates dimensions
  const switched = updateProductionProfile(p916, { aspectRatio: '16:9' });
  if (switched.aspectRatio !== '16:9' || switched.frameWidth !== 1920 || switched.frameHeight !== 1080 || switched.orientation !== 'landscape') {
    throw new Error('Test 3 Failed: Switching ratio did not update dimensions to 1920x1080');
  }
  console.log('✓ Test 3 Passed: Updating ratio propagates to sequence dimensions');

  // Test 4: Deterministic Video Prompt Builder includes aspect ratio and orientation
  const prompt916 = buildCompleteVideoPrompt(
    { segmentNumber: 1, type: 'Hook', voiceover: 'Did you know black holes sing?' },
    p916
  );
  if (!prompt916.includes('9:16') || !prompt916.includes('PORTRAIT') || !prompt916.includes('Did you know black holes sing?')) {
    throw new Error('Test 4 Failed: 9:16 prompt missing aspect ratio, orientation, or dialogue');
  }
  console.log('✓ Test 4 Passed: 9:16 video prompt includes exact ratio, orientation, and dialogue');

  const prompt169 = buildCompleteVideoPrompt(
    { segmentNumber: 2, type: 'Main', voiceover: 'Astronomers discovered sound waves in the Perseus cluster.' },
    p169
  );
  if (!prompt169.includes('16:9') || !prompt169.includes('LANDSCAPE')) {
    throw new Error('Test 4b Failed: 16:9 prompt missing 16:9 or LANDSCAPE');
  }
  console.log('✓ Test 4b Passed: 16:9 video prompt includes 16:9 widescreen orientation');

  // Test 5: Thumbnail prompt generation
  const thumbPrompt = buildCompleteThumbnailPrompt('Quantum AI Computers', p916);
  if (!thumbPrompt.includes('9:16') || !thumbPrompt.includes('Quantum AI Computers')) {
    throw new Error('Test 5 Failed: Thumbnail prompt missing topic or ratio');
  }
  console.log('✓ Test 5 Passed: Thumbnail prompt respects project aspect ratio');

  // Test 6: Thumbnail destination override
  const thumbOverride = buildCompleteThumbnailPrompt('Quantum AI Computers', p916, '16:9');
  if (!thumbOverride.includes('16:9')) {
    throw new Error('Test 6 Failed: Thumbnail override was not respected');
  }
  console.log('✓ Test 6 Passed: Thumbnail destination override works correctly');

  // Test 7: Export validation
  const validExport = validateExportSettings(p169, { width: 1920, height: 1080 });
  if (!validExport.valid || validExport.warnings.length > 0) {
    throw new Error('Test 7 Failed: Valid export was flagged as invalid');
  }
  const mismatchedExport = validateExportSettings(p169, { width: 1080, height: 1920 });
  if (mismatchedExport.valid || mismatchedExport.warnings.length === 0) {
    throw new Error('Test 7b Failed: Mismatched export did not produce warning');
  }
  console.log('✓ Test 7 Passed: Export validation accurately detects dimension mismatches');

  // Test 8: Legacy project migration
  const migrated = migrateLegacyProject({
    id: 'legacy-1',
    settings: {
      name: 'Old YouTube Video',
      resolution: { id: '16:9', width: 1920, height: 1080 },
    },
  });
  if (migrated.aspectRatio !== '16:9' || migrated.frameWidth !== 1920) {
    throw new Error('Test 8 Failed: Legacy migration failed to infer 16:9');
  }
  console.log('✓ Test 8 Passed: Legacy project safely migrated to canonical ProductionProfile');

  console.log('=== All 8 Production Profile Engine Unit Tests PASSED Successfully! ===');
}

runTests();
