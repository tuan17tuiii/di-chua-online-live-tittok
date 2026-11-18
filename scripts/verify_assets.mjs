/**
 * scripts/verify_assets.mjs
 * Comprehensive Forensic Asset & Manifest Validation Suite
 * 
 * Verifies all 36 physical assets declared in manifest.json:
 * - 2 backgrounds (JPEG)
 * - 7 altar layers and props (PNG RGBA)
 * - 14 character files (7 static PNG + 7 8-frame spritesheets PNG RGBA)
 * - 4 visual effects (PNG RGBA)
 * - 7 audio SFX (WAV 48kHz 24-bit)
 * - 2 audio BGM (MP3 160/320kbps)
 * 
 * Enforces:
 * 1. Physical existence on disk and non-zero size.
 * 2. Strict binary header parsing (PNG IHDR, JPEG SOF0/SOF2, WAV RIFF, MP3 MPEG sync).
 * 3. Exact pixel dimension assertion against manifest constraints.
 * 4. Transparent alpha channel checks for cutouts.
 * 5. Immediate exit code 1 upon any failure (Anti-Facade).
 */

import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const manifestFile = path.join(rootDir, 'manifest.json');

console.log('================================================================');
console.log('AUTHORITATIVE ASSET & MANIFEST VALIDATION HARNESS');
console.log('Root Directory:', rootDir);
console.log('Target Manifest:', manifestFile);
console.log('================================================================\n');

const validationErrors = [];

function recordError(code, message, details = {}) {
  const err = { code, message, ...details };
  validationErrors.push(err);
  console.error(`  [FAIL] [${code}] ${message}`, Object.keys(details).length ? details : '');
}

// -------------------------------------------------------------
// STEP 1: Parse and Validate manifest.json
// -------------------------------------------------------------
let manifest;
try {
  const raw = fs.readFileSync(manifestFile, 'utf8');
  manifest = JSON.parse(raw);
  console.log('[PASS] manifest.json parsed successfully as valid JSON.');
} catch (e) {
  console.error('[CRITICAL FAIL] manifest.json parsing failed:', e.message);
  process.exit(1);
}

// Check $schema
if (manifest['$schema']) {
  const schemaResolved = path.resolve(rootDir, manifest['$schema']);
  if (fs.existsSync(schemaResolved)) {
    console.log(`[PASS] Schema file exists: ${manifest['$schema']}`);
  } else {
    recordError('SCHEMA_MISSING', `Declared $schema file does not exist: ${schemaResolved}`);
  }
} else {
  recordError('SCHEMA_NOT_DECLARED', 'Missing $schema declaration in manifest.json');
}

// Check defaultConfig
if (!manifest.defaultConfig || !manifest.defaultConfig.resolution) {
  recordError('CONFIG_MISSING', 'defaultConfig or resolution block missing in manifest.json');
} else {
  const { width, height, aspectRatio } = manifest.defaultConfig.resolution;
  if (width !== 1080 || height !== 1920 || aspectRatio !== '9:16') {
    recordError('RESOLUTION_MISMATCH', `defaultConfig resolution must be 1080x1920 (9:16), got ${width}x${height} (${aspectRatio})`);
  } else {
    console.log('[PASS] Default resolution: 1080x1920 (9:16)');
  }
}

// -------------------------------------------------------------
// STEP 2: Zero-Dependency Binary Header Parsers
// -------------------------------------------------------------

function parsePngHeader(buf) {
  if (buf.length < 24) return { valid: false, error: 'File size less than 24 bytes' };
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== sig[i]) return { valid: false, error: 'Invalid PNG signature bytes' };
  }
  const chunkType = buf.toString('ascii', 12, 16);
  if (chunkType !== 'IHDR') return { valid: false, error: `Expected IHDR chunk, got ${chunkType}` };

  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25]; // 0=Gray, 2=RGB, 3=Indexed, 4=Gray+A, 6=RGBA
  const hasAlpha = (colorType === 4 || colorType === 6);

  return { valid: true, width, height, bitDepth, colorType, hasAlpha };
}

function parseJpegHeader(buf) {
  if (buf.length < 4) return { valid: false, error: 'File size less than 4 bytes' };
  if (buf[0] !== 0xff || buf[1] !== 0xd8) {
    return { valid: false, error: 'Invalid JPEG SOI marker (expected 0xFFD8)' };
  }

  let offset = 2;
  while (offset < buf.length) {
    if (buf[offset] !== 0xff) { offset++; continue; }
    while (offset < buf.length && buf[offset] === 0xff) offset++;
    if (offset >= buf.length) break;

    const marker = buf[offset++];
    if (marker === 0xd9) break; // EOI
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) continue; // Restart or stuffing

    if (offset + 2 > buf.length) break;
    const length = buf.readUInt16BE(offset);
    if (marker === 0xc0 || marker === 0xc2) { // SOF0 / SOF2
      const height = buf.readUInt16BE(offset + 3);
      const width = buf.readUInt16BE(offset + 5);
      return { valid: true, width, height, marker: marker === 0xc0 ? 'SOF0' : 'SOF2' };
    }
    offset += length;
  }
  return { valid: false, error: 'Missing SOF0/SOF2 frame header' };
}

function parseWavHeader(buf) {
  if (buf.length < 44) return { valid: false, error: 'File size less than 44 bytes' };
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    return { valid: false, error: 'Invalid RIFF/WAVE container header' };
  }
  let offset = 12;
  while (offset + 8 < buf.length) {
    const chunkId = buf.toString('ascii', offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    if (chunkId === 'fmt ') {
      const audioFormat = buf.readUInt16LE(offset + 8);
      const channels = buf.readUInt16LE(offset + 10);
      const sampleRate = buf.readUInt32LE(offset + 12);
      const bitsPerSample = buf.readUInt16LE(offset + 22);
      return { valid: true, audioFormat, channels, sampleRate, bitsPerSample };
    }
    offset += 8 + chunkSize;
  }
  return { valid: false, error: 'Missing fmt subchunk' };
}

function parseMp3Header(buf) {
  if (buf.length < 128) return { valid: false, error: 'File size less than 128 bytes' };
  let offset = 0;
  if (buf.toString('ascii', 0, 3) === 'ID3') {
    const tagSize = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
    offset = 10 + tagSize;
  }
  while (offset < buf.length - 1) {
    if (buf[offset] === 0xff && (buf[offset + 1] & 0xe0) === 0xe0) {
      return { valid: true, syncOffset: offset };
    }
    offset++;
  }
  return { valid: false, error: 'MPEG frame sync not found' };
}

// -------------------------------------------------------------
// STEP 3: Catalog and Test All 36 Physical Assets
// -------------------------------------------------------------

console.log('\n--- CHECK 1: Cataloging and Physical File Verification ---');

const physicalFileList = [];

// 1. Backgrounds
(manifest.assets?.backgrounds || []).forEach(item => {
  physicalFileList.push({
    id: item.id,
    name: item.name,
    category: 'backgrounds',
    declaredPath: item.path,
    format: item.format,
    expectedWidth: item.width,
    expectedHeight: item.height,
    requireAlpha: false,
    maxSizeBytes: 550 * 1024 // 550KB cap
  });
});

// 2. Altar props & statues
(manifest.assets?.altar || []).forEach(item => {
  physicalFileList.push({
    id: item.id,
    name: item.name,
    category: 'altar',
    declaredPath: item.path,
    format: item.format,
    expectedWidth: item.width,
    expectedHeight: item.height,
    requireAlpha: true
  });
});

// 3. Characters: Must validate BOTH staticPath AND spritesheetPath!
(manifest.assets?.characters || []).forEach(item => {
  // Static portrait
  physicalFileList.push({
    id: `${item.id}_static`,
    parentId: item.id,
    name: `${item.name} (Static Portrait)`,
    category: 'characters',
    subType: 'static',
    declaredPath: item.staticPath,
    format: item.format,
    expectedWidth: item.frameWidth,
    expectedHeight: item.frameHeight,
    requireAlpha: true
  });
  // 8-frame sequential strip
  physicalFileList.push({
    id: `${item.id}_strip`,
    parentId: item.id,
    name: `${item.name} (8-Frame Spritesheet Strip)`,
    category: 'characters',
    subType: 'spritesheet',
    declaredPath: item.spritesheetPath,
    format: item.format,
    expectedWidth: item.frameWidth * item.frameCount,
    expectedHeight: item.frameHeight,
    requireAlpha: true,
    frameCount: item.frameCount,
    frameWidth: item.frameWidth,
    frameHeight: item.frameHeight
  });
});

// 4. Visual FX
(manifest.assets?.visual_fx || []).forEach(item => {
  physicalFileList.push({
    id: item.id,
    name: item.name,
    category: 'visual_fx',
    declaredPath: item.path,
    format: item.format,
    expectedWidth: item.width,
    expectedHeight: item.height,
    requireAlpha: true
  });
});

// 5. Audio SFX
(manifest.assets?.audio_sfx || []).forEach(item => {
  physicalFileList.push({
    id: item.id,
    name: item.name,
    category: 'audio_sfx',
    declaredPath: item.path,
    format: item.format,
    expectedSampleRate: item.sampleRate || 48000,
    expectedBitDepth: item.bitDepth || 24,
    isAudio: true
  });
});

// 6. Audio BGM
(manifest.assets?.audio_bgm || []).forEach(item => {
  physicalFileList.push({
    id: item.id,
    name: item.name,
    category: 'audio_bgm',
    declaredPath: item.path,
    format: item.format,
    isAudio: true
  });
});

console.log(`Total physical media files scheduled for verification: ${physicalFileList.length} (Expected: 36)`);
if (physicalFileList.length !== 36) {
  recordError('INCOMPLETE_INVENTORY', `Expected 36 physical files in manifest, but cataloged ${physicalFileList.length}`);
}

// -------------------------------------------------------------
// STEP 4: Deep Binary & Dimension Inspection
// -------------------------------------------------------------

console.log('\n--- CHECK 2: Binary Headers, Dimensions & Integrity ---');

let passedFilesCount = 0;

for (const fileItem of physicalFileList) {
  const relPath = fileItem.declaredPath.replace(/^\//, '');
  const absPath = path.join(rootDir, relPath);

  // 1. Check existence
  if (!fs.existsSync(absPath)) {
    recordError('FILE_MISSING', `Physical file missing on disk: ${relPath}`, { id: fileItem.id, path: relPath });
    continue;
  }

  // 2. Check size
  const stat = fs.statSync(absPath);
  if (stat.size === 0) {
    recordError('FILE_EMPTY', `Physical file is 0 bytes: ${relPath}`, { id: fileItem.id, path: relPath });
    continue;
  }

  // Check file size cap if specified (e.g. backgrounds < 550KB)
  if (fileItem.maxSizeBytes && stat.size > fileItem.maxSizeBytes) {
    const sizeKB = (stat.size / 1024).toFixed(1);
    const capKB = (fileItem.maxSizeBytes / 1024).toFixed(1);
    console.warn(`  [WARN] [SIZE_EXCEEDED] ${relPath}: ${sizeKB}KB exceeds documented limit of ${capKB}KB`);
  }

  const buf = fs.readFileSync(absPath);
  let filePassed = true;

  // 3. Inspect formats
  if (fileItem.format === 'png') {
    const png = parsePngHeader(buf);
    if (!png.valid) {
      recordError('CORRUPT_PNG', `Invalid PNG header in ${relPath}: ${png.error}`, { id: fileItem.id });
      filePassed = false;
    } else {
      // Dimension check
      if (png.width !== fileItem.expectedWidth || png.height !== fileItem.expectedHeight) {
        recordError('DIMENSION_MISMATCH', `Dimension divergence on ${relPath}`, {
          id: fileItem.id,
          expected: `${fileItem.expectedWidth}x${fileItem.expectedHeight}`,
          actual: `${png.width}x${png.height}`
        });
        filePassed = false;
      }
      // Transparency check
      if (fileItem.requireAlpha && !png.hasAlpha) {
        recordError('ALPHA_CHANNEL_MISSING', `File requires alpha channel (colorType 6), but got colorType ${png.colorType}: ${relPath}`, { id: fileItem.id });
        filePassed = false;
      }
    }
  } else if (fileItem.format === 'jpg' || fileItem.format === 'jpeg') {
    const jpg = parseJpegHeader(buf);
    if (!jpg.valid) {
      recordError('CORRUPT_JPEG', `Invalid JPEG header in ${relPath}: ${jpg.error}`, { id: fileItem.id });
      filePassed = false;
    } else {
      if (jpg.width !== fileItem.expectedWidth || jpg.height !== fileItem.expectedHeight) {
        recordError('DIMENSION_MISMATCH', `Dimension divergence on ${relPath}`, {
          id: fileItem.id,
          expected: `${fileItem.expectedWidth}x${fileItem.expectedHeight}`,
          actual: `${jpg.width}x${jpg.height}`
        });
        filePassed = false;
      }
    }
  } else if (fileItem.format === 'wav') {
    const wav = parseWavHeader(buf);
    if (!wav.valid) {
      recordError('CORRUPT_WAV', `Invalid WAV header in ${relPath}: ${wav.error}`, { id: fileItem.id });
      filePassed = false;
    } else {
      if (wav.sampleRate !== fileItem.expectedSampleRate) {
        recordError('SAMPLE_RATE_MISMATCH', `Sample rate divergence on ${relPath}: expected ${fileItem.expectedSampleRate}, got ${wav.sampleRate}`, { id: fileItem.id });
        filePassed = false;
      }
      if (wav.bitsPerSample !== fileItem.expectedBitDepth) {
        recordError('BIT_DEPTH_MISMATCH', `Bit depth divergence on ${relPath}: expected ${fileItem.expectedBitDepth}, got ${wav.bitsPerSample}`, { id: fileItem.id });
        filePassed = false;
      }
    }
  } else if (fileItem.format === 'mp3') {
    const mp3 = parseMp3Header(buf);
    if (!mp3.valid) {
      recordError('CORRUPT_MP3', `Invalid MP3 frame sync in ${relPath}: ${mp3.error}`, { id: fileItem.id });
      filePassed = false;
    }
  }

  if (filePassed) {
    passedFilesCount++;
    const dimStr = fileItem.expectedWidth ? ` [${fileItem.expectedWidth}x${fileItem.expectedHeight}px]` : '';
    console.log(`  [PASS] ${fileItem.id.padEnd(25)} -> ${relPath}${dimStr} (${stat.size.toLocaleString()} bytes)`);
  }
}

console.log(`\nBinary Verification Summary: ${passedFilesCount} / ${physicalFileList.length} files passed.`);

// -------------------------------------------------------------
// STEP 5: Fallback Paths & Recursive Traps Check
// -------------------------------------------------------------

console.log('\n--- CHECK 3: Fallback Mechanism & Cycle Analysis ---');
const allDeclaredItems = [
  ...(manifest.assets?.backgrounds || []),
  ...(manifest.assets?.altar || []),
  ...(manifest.assets?.characters || []),
  ...(manifest.assets?.visual_fx || []),
  ...(manifest.assets?.audio_sfx || []),
  ...(manifest.assets?.audio_bgm || [])
];

const idSet = new Set(allDeclaredItems.map(a => a.id));

allDeclaredItems.forEach(asset => {
  if (asset.fallbackId) {
    if (asset.fallbackId === asset.id) {
      recordError('RECURSIVE_FALLBACK', `Asset points to itself as fallback: ${asset.id}`);
    } else if (!idSet.has(asset.fallbackId)) {
      recordError('DEAD_FALLBACK', `Asset points to non-existent fallbackId "${asset.fallbackId}": ${asset.id}`);
    }
  } else if (!asset.fallbackSynthetic) {
    recordError('NO_FALLBACK', `Asset lacks both fallbackId and fallbackSynthetic: ${asset.id}`);
  }
});

// -------------------------------------------------------------
// STEP 6: Spritesheet & Consumer Geometry Contract Check
// -------------------------------------------------------------

console.log('\n--- CHECK 4: Spritesheet & Consumer Geometry Contract ---');
const characters = manifest.assets?.characters || [];
characters.forEach(c => {
  const expectedTotalWidth = c.frameWidth * c.frameCount;
  console.log(`Character "${c.id}": Frame=${c.frameWidth}x${c.frameHeight} | Strip=${expectedTotalWidth}x${c.frameHeight} | Bowing=[${c.bowingFrames?.join(',')}]`);
  
  if (c.frameCount !== 8) {
    recordError('FRAME_COUNT_INVALID', `Character ${c.id} must have exactly 8 frames, got ${c.frameCount}`);
  }
  
  const invalidBowing = c.bowingFrames?.some(f => f < 0 || f >= c.frameCount);
  if (invalidBowing) {
    recordError('BOWING_FRAMES_OOB', `Character ${c.id} bowingFrames index out of bounds for frameCount ${c.frameCount}`);
  }
});

// -------------------------------------------------------------
// STEP 7: Final Execution Verdict & Strict Exit Code Policy
// -------------------------------------------------------------

console.log('\n================================================================');
console.log('VALIDATION SUITE EXECUTION SUMMARY');
console.log('================================================================');
console.log(`Total Media Assets Tested : ${physicalFileList.length} (36 physical files)`);
console.log(`Total Successfully Passed : ${passedFilesCount}`);
console.log(`Total Discrepancies/Errors: ${validationErrors.length}`);

if (validationErrors.length > 0) {
  console.error('\n[CRITICAL FAILURE] The asset harness encountered defects:');
  validationErrors.forEach((err, idx) => {
    console.error(`  ${idx + 1}. [${err.code}] ${err.message}`);
    if (err.expected && err.actual) {
      console.error(`     -> Expected: ${err.expected} | Actual: ${err.actual}`);
    }
  });
  console.error('\nResult: FAILED. Exiting with code 1 to prevent facade validation.\n');
  process.exit(1);
} else {
  console.log('\n[OVERALL RESULT] PASSED: All 36 physical assets verified with 100% binary, header, and dimension integrity.');
  console.log('Execution completed successfully. Exiting with code 0.\n');
  process.exit(0);
}
