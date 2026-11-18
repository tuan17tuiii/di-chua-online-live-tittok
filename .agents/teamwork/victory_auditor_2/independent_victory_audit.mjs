/**
 * independent_victory_audit.mjs
 * 
 * Fully independent, zero-shared-context Victory Audit Test Suite
 * Authored by victory_auditor_2
 * 
 * Performs 100% independent binary, acoustic, pixel-level, and architectural verification
 * of all 36 physical assets and codebase integrity.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';

const ROOT_DIR = process.cwd();
console.log('================================================================');
console.log('VICTORY AUDITOR 2: INDEPENDENT FORENSIC EXECUTION SUITE');
console.log('Timestamp:', new Date().toISOString());
console.log('Root Directory:', ROOT_DIR);
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function assertTest(name, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${name} -> ${details}`);
    failureDetails.push({ name, details });
  }
}

// -----------------------------------------------------------------------------
// SECTION 1: MANIFEST INTEGRITY & SPECIFICATION CONTRACT
// -----------------------------------------------------------------------------
console.log('--- SECTION 1: Manifest & Specification Contract ---');

const manifestPath = path.join(ROOT_DIR, 'manifest.json');
assertTest('manifest.json exists', fs.existsSync(manifestPath));

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assertTest('manifest.json parses cleanly as valid JSON', true);
} catch (e) {
  assertTest('manifest.json parses cleanly as valid JSON', false, e.message);
}

const schemaPath = path.join(ROOT_DIR, 'assets', 'asset-manifest.schema.json');
assertTest('asset-manifest.schema.json exists', fs.existsSync(schemaPath));

// Resolution check
const res = manifest.defaultConfig?.resolution;
assertTest('Resolution is 1080x1920 (9:16)', res?.width === 1080 && res?.height === 1920 && res?.aspectRatio === '9:16');

// -----------------------------------------------------------------------------
// SECTION 2: PHYSICAL ASSET CATALOG & CRYPTOGRAPHIC UNIQUENESS
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 2: Physical Asset Inventory & Cryptographic Uniqueness ---');

const EXPECTED_ASSETS = [
  // Backgrounds
  { id: 'bg_main_hall', path: 'assets/backgrounds/hall.jpg', type: 'jpg', w: 1080, h: 1920, maxBytes: 550 * 1024 },
  { id: 'bg_zen_garden', path: 'assets/backgrounds/zen_garden.jpg', type: 'jpg', w: 1080, h: 1920, maxBytes: 550 * 1024 },
  // Altar
  { id: 'altar_table_main', path: 'assets/altar/altar_table.png', type: 'png', w: 1080, h: 850, transparent: true },
  { id: 'statue_shakyamuni', path: 'assets/altar/statue_shakyamuni.png', type: 'png', w: 600, h: 800, transparent: true },
  { id: 'statue_amitabha', path: 'assets/altar/statue_amitabha.png', type: 'png', w: 600, h: 800, transparent: true },
  { id: 'statue_avalokiteshvara', path: 'assets/altar/statue_avalokiteshvara.png', type: 'png', w: 550, h: 820, transparent: true },
  { id: 'altar_censer_bronze', path: 'assets/altar/censer_bronze.png', type: 'png', w: 280, h: 240, transparent: true },
  { id: 'altar_candle_stand', path: 'assets/altar/candle_stand.png', type: 'png', w: 150, h: 350, transparent: true },
  { id: 'cushion_lotus_mat', path: 'assets/altar/meditation_cushion.png', type: 'png', w: 160, h: 90, transparent: true },
  // Characters (Static + Spritesheet)
  { id: 'char_man_static', path: 'assets/characters/c_man.png', type: 'png', w: 212, h: 300, transparent: true },
  { id: 'char_man_anim', path: 'assets/characters/anim_man.png', type: 'png', w: 1696, h: 300, transparent: true, frames: 8, fw: 212 },
  { id: 'char_woman_static', path: 'assets/characters/c_woman.png', type: 'png', w: 212, h: 300, transparent: true },
  { id: 'char_woman_anim', path: 'assets/characters/anim_woman.png', type: 'png', w: 1696, h: 300, transparent: true, frames: 8, fw: 212 },
  { id: 'char_granny_static', path: 'assets/characters/c_granny.png', type: 'png', w: 195, h: 300, transparent: true },
  { id: 'char_granny_anim', path: 'assets/characters/anim_granny.png', type: 'png', w: 1560, h: 300, transparent: true, frames: 8, fw: 195 },
  { id: 'char_child_static', path: 'assets/characters/c_child.png', type: 'png', w: 180, h: 260, transparent: true },
  { id: 'char_child_anim', path: 'assets/characters/anim_child.png', type: 'png', w: 1440, h: 260, transparent: true, frames: 8, fw: 180 },
  { id: 'char_monk_static', path: 'assets/characters/c_monk.png', type: 'png', w: 212, h: 300, transparent: true },
  { id: 'char_monk_anim', path: 'assets/characters/anim_monk.png', type: 'png', w: 1696, h: 300, transparent: true, frames: 8, fw: 212 },
  { id: 'char_nun_static', path: 'assets/characters/c_nun.png', type: 'png', w: 212, h: 300, transparent: true },
  { id: 'char_nun_anim', path: 'assets/characters/anim_nun.png', type: 'png', w: 1696, h: 300, transparent: true, frames: 8, fw: 212 },
  { id: 'char_master_static', path: 'assets/characters/c_master.png', type: 'png', w: 230, h: 320, transparent: true },
  { id: 'char_master_anim', path: 'assets/characters/anim_master.png', type: 'png', w: 1840, h: 320, transparent: true, frames: 8, fw: 230 },
  // Visual FX
  { id: 'fx_halo_gold', path: 'assets/fx/fx_halo.png', type: 'png', w: 512, h: 512, transparent: true },
  { id: 'fx_floating_lotus', path: 'assets/fx/fx_lotus.png', type: 'png', w: 128, h: 128, transparent: true },
  { id: 'fx_gold_petal', path: 'assets/fx/fx_petal.png', type: 'png', w: 64, h: 64, transparent: true },
  { id: 'fx_gift_bell_flash', path: 'assets/fx/fx_bell.png', type: 'png', w: 256, h: 256, transparent: true },
  // Audio SFX (WAV 48kHz 24-bit Stereo)
  { id: 'sfx_mo_01', path: 'assets/audio/sfx/mo_strike_01.wav', type: 'wav', sampleRate: 48000, bitDepth: 24, channels: 2, expDur: 0.35 },
  { id: 'sfx_mo_02', path: 'assets/audio/sfx/mo_strike_02.wav', type: 'wav', sampleRate: 48000, bitDepth: 24, channels: 2, expDur: 0.35 },
  { id: 'sfx_mo_03', path: 'assets/audio/sfx/mo_strike_03.wav', type: 'wav', sampleRate: 48000, bitDepth: 24, channels: 2, expDur: 0.35 },
  { id: 'sfx_bell_bowl', path: 'assets/audio/sfx/bell_bowl.wav', type: 'wav', sampleRate: 48000, bitDepth: 24, channels: 2, expDur: 4.50 },
  { id: 'sfx_bell_temple', path: 'assets/audio/sfx/bell_temple.wav', type: 'wav', sampleRate: 48000, bitDepth: 24, channels: 2, expDur: 11.20 },
  { id: 'sfx_gift_tier1', path: 'assets/audio/sfx/gift_tier1.wav', type: 'wav', sampleRate: 48000, bitDepth: 24, channels: 2, expDur: 1.80 },
  { id: 'sfx_gift_tier2', path: 'assets/audio/sfx/gift_tier2.wav', type: 'wav', sampleRate: 48000, bitDepth: 24, channels: 2, expDur: 2.60 },
  // Audio BGM
  { id: 'bgm_flute_peace', path: 'assets/audio/bgm/music1.mp3', type: 'mp3', minBytes: 1000000 },
  { id: 'bgm_zither_morning', path: 'assets/audio/bgm/music2.mp3', type: 'mp3', minBytes: 1000000 }
];

assertTest('Total expected physical media assets is exactly 36', EXPECTED_ASSETS.length === 36);

const shaMap = new Map();
const buffers = {};

for (const asset of EXPECTED_ASSETS) {
  const fullPath = path.join(ROOT_DIR, asset.path);
  const exists = fs.existsSync(fullPath);
  assertTest(`File exists: ${asset.path}`, exists);

  if (exists) {
    const stat = fs.statSync(fullPath);
    assertTest(`File non-empty: ${asset.path} (${stat.size} bytes)`, stat.size > 0);

    const buf = fs.readFileSync(fullPath);
    buffers[asset.id] = buf;

    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    assertTest(`Unique SHA-256 for ${asset.id}`, !shaMap.has(hash), `Collision with ${shaMap.get(hash)}`);
    shaMap.set(hash, asset.id);
  }
}

assertTest('All 36 asset files have distinct cryptographic SHA-256 hashes (0 aliasing/duplication)', shaMap.size === 36);

// -----------------------------------------------------------------------------
// SECTION 3: DEEP BINARY HEADER AND DIMENSION INSPECTION
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 3: Deep Binary Header & Dimension Verification ---');

// Helper JPEG parser
function inspectJpeg(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return { valid: false };
  let offset = 2;
  while (offset < buf.length) {
    if (buf[offset] !== 0xff) { offset++; continue; }
    while (offset < buf.length && buf[offset] === 0xff) offset++;
    if (offset >= buf.length) break;
    const marker = buf[offset++];
    if (marker === 0xd9) break;
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buf.length) break;
    const len = buf.readUInt16BE(offset);
    if (marker === 0xc0 || marker === 0xc2) {
      const height = buf.readUInt16BE(offset + 3);
      const width = buf.readUInt16BE(offset + 5);
      return { valid: true, width, height, marker: marker === 0xc0 ? 'SOF0' : 'SOF2' };
    }
    offset += len;
  }
  return { valid: false };
}

// Helper PNG parser
function inspectPng(buf) {
  if (buf.length < 24) return { valid: false };
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== sig[i]) return { valid: false };
  }
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return { valid: false };
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25]; // 6 = RGBA
  return { valid: true, width, height, bitDepth, colorType, hasAlpha: (colorType === 4 || colorType === 6) };
}

// Helper WAV parser
function inspectWav(buf) {
  if (buf.length < 44) return { valid: false };
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return { valid: false };
  let offset = 12;
  let fmt = null;
  let dataSize = 0;
  let dataOffset = 0;
  while (offset + 8 < buf.length) {
    const chunkId = buf.toString('ascii', offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    if (chunkId === 'fmt ') {
      fmt = {
        audioFormat: buf.readUInt16LE(offset + 8),
        numChannels: buf.readUInt16LE(offset + 10),
        sampleRate: buf.readUInt32LE(offset + 12),
        byteRate: buf.readUInt32LE(offset + 16),
        blockAlign: buf.readUInt16LE(offset + 20),
        bitsPerSample: buf.readUInt16LE(offset + 22)
      };
    } else if (chunkId === 'data') {
      dataOffset = offset + 8;
      dataSize = chunkSize;
    }
    offset += 8 + chunkSize;
    if (chunkSize % 2 !== 0) offset++;
  }
  if (!fmt || !dataOffset) return { valid: false };
  const durationSec = dataSize / (fmt.sampleRate * fmt.numChannels * (fmt.bitsPerSample / 8));
  return { valid: true, fmt, dataSize, dataOffset, durationSec };
}

// Helper MP3 parser
function inspectMp3(buf) {
  if (buf.length < 128) return { valid: false };
  let offset = 0;
  if (buf.toString('ascii', 0, 3) === 'ID3') {
    const tagSize = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
    offset = 10 + tagSize;
  }
  let frameCount = 0;
  while (offset < buf.length - 1) {
    if (buf[offset] === 0xff && (buf[offset + 1] & 0xe0) === 0xe0) {
      frameCount++;
      offset += 100; // Skip into frame
    } else {
      offset++;
    }
  }
  return { valid: frameCount > 0, frameCount };
}

for (const asset of EXPECTED_ASSETS) {
  const buf = buffers[asset.id];
  if (!buf) continue;

  if (asset.type === 'jpg') {
    const jpg = inspectJpeg(buf);
    assertTest(`JPEG header valid: ${asset.path}`, jpg.valid);
    assertTest(`JPEG dimensions match: ${asset.path} (${jpg.width}x${jpg.height} vs ${asset.w}x${asset.h})`, jpg.width === asset.w && jpg.height === asset.h);
    if (asset.maxBytes) {
      assertTest(`JPEG size within budget: ${asset.path} (${(buf.length/1024).toFixed(1)} KB <= ${(asset.maxBytes/1024).toFixed(1)} KB)`, buf.length <= asset.maxBytes);
    }
  } else if (asset.type === 'png') {
    const png = inspectPng(buf);
    assertTest(`PNG header valid: ${asset.path}`, png.valid);
    assertTest(`PNG dimensions match: ${asset.path} (${png.width}x${png.height} vs ${asset.w}x${asset.h})`, png.width === asset.w && png.height === asset.h);
    assertTest(`PNG bit depth is 8-bit: ${asset.path}`, png.bitDepth === 8);
    assertTest(`PNG has 32-bit RGBA alpha: ${asset.path}`, png.colorType === 6 && png.hasAlpha);
  } else if (asset.type === 'wav') {
    const wav = inspectWav(buf);
    assertTest(`WAV RIFF/fmt/data valid: ${asset.path}`, wav.valid);
    assertTest(`WAV format is PCM (1): ${asset.path}`, wav.fmt.audioFormat === 1);
    assertTest(`WAV channels is 2 (Stereo): ${asset.path}`, wav.fmt.numChannels === asset.channels);
    assertTest(`WAV sample rate is 48000 Hz: ${asset.path}`, wav.fmt.sampleRate === asset.sampleRate);
    assertTest(`WAV bit depth is 24-bit: ${asset.path}`, wav.fmt.bitsPerSample === asset.bitDepth);
    const durDelta = Math.abs(wav.durationSec - asset.expDur);
    assertTest(`WAV duration matches expected (${wav.durationSec.toFixed(2)}s vs ${asset.expDur}s ± 0.1s): ${asset.path}`, durDelta <= 0.1);
  } else if (asset.type === 'mp3') {
    const mp3 = inspectMp3(buf);
    assertTest(`MP3 sync frames valid: ${asset.path}`, mp3.valid && mp3.frameCount > 10);
    assertTest(`MP3 file size > 1MB: ${asset.path} (${(buf.length/(1024*1024)).toFixed(2)} MB)`, buf.length >= asset.minBytes);
  }
}

// -----------------------------------------------------------------------------
// SECTION 4: DEEP PIXEL-LEVEL DECOMPRESSION & TRANSPARENCY FORENSICS
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 4: Decompressed Pixel Inspection & Clean Alpha Verification ---');

function decompressPngRgba(buf) {
  let offset = 8;
  const idatChunks = [];
  let width = 0;
  let height = 0;
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    if (type === 'IHDR') {
      width = buf.readUInt32BE(offset + 8);
      height = buf.readUInt32BE(offset + 12);
    } else if (type === 'IDAT') {
      idatChunks.push(buf.subarray(offset + 8, offset + 8 + len));
    }
    offset += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  
  // Reconstruct uncompressed RGBA scanlines
  const bpp = 4;
  const rawRgba = Buffer.alloc(width * height * 4);
  let srcPos = 0;
  let prevRow = Buffer.alloc(width * bpp);

  for (let y = 0; y < height; y++) {
    const filter = decompressed[srcPos++];
    const row = Buffer.alloc(width * bpp);
    for (let x = 0; x < width * bpp; x++) {
      const raw = decompressed[srcPos++];
      const a = x >= bpp ? row[x - bpp] : 0;
      const b = prevRow[x];
      const c = x >= bpp ? prevRow[x - bpp] : 0;
      let val = 0;
      if (filter === 0) val = raw;
      else if (filter === 1) val = (raw + a) & 0xff;
      else if (filter === 2) val = (raw + b) & 0xff;
      else if (filter === 3) val = (raw + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
        val = (raw + pr) & 0xff;
      }
      row[x] = val;
    }
    row.copy(rawRgba, y * width * 4);
    prevRow = row;
  }
  return { width, height, rawRgba };
}

const transparentPngs = EXPECTED_ASSETS.filter(a => a.transparent);
assertTest('Total transparent PNG assets to inspect: 25', transparentPngs.length === 25);

for (const asset of transparentPngs) {
  const buf = buffers[asset.id];
  if (!buf) continue;

  const { width, height, rawRgba } = decompressPngRgba(buf);

  // 1. Check 4 corners have alpha == 0
  const cornerCoords = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1]
  ];
  let cornersClean = true;
  for (const [cx, cy] of cornerCoords) {
    const idx = (cy * width + cx) * 4;
    const a = rawRgba[idx + 3];
    if (a !== 0) {
      cornersClean = false;
      break;
    }
  }
  assertTest(`4 corner pixels 100% transparent (alpha=0): ${asset.path}`, cornersClean);

  // 2. Count transparent vs opaque pixels (Ensure authentic asset, not blank dummy)
  let transparentCount = 0;
  let opaqueCount = 0;
  const totalPixels = width * height;
  for (let i = 0; i < totalPixels; i++) {
    const a = rawRgba[i * 4 + 3];
    if (a === 0) transparentCount++;
    else if (a > 128) opaqueCount++;
  }

  const transPct = (transparentCount / totalPixels) * 100;
  const opaquePct = (opaqueCount / totalPixels) * 100;

  assertTest(
    `Authentic cutout distribution (Trans: ${transPct.toFixed(1)}%, Opaque: ${opaquePct.toFixed(1)}%): ${asset.path}`,
    transparentCount > 0 && opaqueCount > 0
  );
}

// -----------------------------------------------------------------------------
// SECTION 5: SPRITESHEET SLICING, 8-FRAME COUNT & ZERO-DRIFT FORENSICS
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 5: Spritesheet Slicing, 8-Frame Counts & Zero-Drift Forensics ---');

const charStrips = EXPECTED_ASSETS.filter(a => a.frames === 8);
assertTest('Total character spritesheets to verify: 7', charStrips.length === 7);

for (const strip of charStrips) {
  const buf = buffers[strip.id];
  const { width, height, rawRgba } = decompressPngRgba(buf);

  // Check exact 8 frames horizontal division
  assertTest(`Spritesheet total width ${width} equals 8 * frameWidth ${strip.fw}: ${strip.path}`, width === strip.fw * 8);

  // Verify each of the 8 frames has non-zero character pixels (no blank frames)
  let allFramesActive = true;
  for (let f = 0; f < 8; f++) {
    const sx = f * strip.fw;
    const ex = sx + strip.fw;
    let frameOpaquePixels = 0;
    for (let y = 0; y < height; y++) {
      for (let x = sx; x < ex; x++) {
        const a = rawRgba[(y * width + x) * 4 + 3];
        if (a > 128) frameOpaquePixels++;
      }
    }
    if (frameOpaquePixels === 0) {
      allFramesActive = false;
      break;
    }
  }
  assertTest(`All 8 frames contain active rendered avatar geometry: ${strip.path}`, allFramesActive);

  // Check bottom grounding anchor (characters must have non-zero pixels near bottom boundary)
  let bottomAnchorFound = false;
  for (let y = height - 1; y >= height - 20; y--) {
    for (let x = 0; x < width; x++) {
      if (rawRgba[(y * width + x) * 4 + 3] > 64) {
        bottomAnchorFound = true;
        break;
      }
    }
    if (bottomAnchorFound) break;
  }
  assertTest(`Character grounded near bottom of canvas (y >= ${height - 20}): ${strip.path}`, bottomAnchorFound);
}

// -----------------------------------------------------------------------------
// SECTION 6: ACOUSTIC SIGNAL ANALYSIS (HEADROOM, RMS, DECAY)
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 6: Acoustic Signal Analysis (Headroom, Energy & Attenuation) ---');

const wavAssets = EXPECTED_ASSETS.filter(a => a.type === 'wav');

for (const asset of wavAssets) {
  const buf = buffers[asset.id];
  const wav = inspectWav(buf);
  const dataOffset = wav.dataOffset;
  const totalFrames = wav.dataSize / 6; // 24-bit stereo = 6 bytes/frame

  let maxAbs = 0;
  let sumSq = 0;

  // Segment analysis (5 segments)
  const segFrames = Math.floor(totalFrames / 5);
  const segRmsList = [];

  for (let s = 0; s < 5; s++) {
    let segSum = 0;
    const sStart = s * segFrames;
    const sEnd = (s === 4) ? totalFrames : (s + 1) * segFrames;
    const count = (sEnd - sStart) * 2;

    for (let f = sStart; f < sEnd; f++) {
      const idx = dataOffset + f * 6;
      // Left 24-bit
      let sL = (buf[idx+2] << 16) | (buf[idx+1] << 8) | buf[idx];
      if (sL & 0x800000) sL -= 0x1000000;
      const nL = sL / 8388608.0;

      // Right 24-bit
      let sR = (buf[idx+5] << 16) | (buf[idx+4] << 8) | buf[idx+3];
      if (sR & 0x800000) sR -= 0x1000000;
      const nR = sR / 8388608.0;

      if (Math.abs(nL) > maxAbs) maxAbs = Math.abs(nL);
      if (Math.abs(nR) > maxAbs) maxAbs = Math.abs(nR);

      sumSq += nL * nL + nR * nR;
      segSum += nL * nL + nR * nR;
    }
    const segRms = Math.sqrt(segSum / count);
    segRmsList.push(segRms);
  }

  const overallRms = Math.sqrt(sumSq / (totalFrames * 2));
  const peakDb = maxAbs > 0 ? 20 * Math.log10(maxAbs) : -120;
  const rmsDb = overallRms > 0 ? 20 * Math.log10(overallRms) : -120;

  assertTest(`Audio peak < 0.0 dBFS (Headroom check, actual: ${peakDb.toFixed(2)} dBFS): ${asset.path}`, peakDb < 0.0);
  assertTest(`Audio energy within dynamic range (-25 dBFS to -5 dBFS, actual: ${rmsDb.toFixed(2)} dBFS): ${asset.path}`, rmsDb >= -25.0 && rmsDb <= -5.0);

  // Decay check: head segment RMS > tail segment RMS
  const headRms = segRmsList[0];
  const tailRms = segRmsList[4];
  assertTest(`Natural acoustic attenuation (Head: ${headRms.toFixed(4)}, Tail: ${tailRms.toFixed(4)}): ${asset.path}`, headRms > tailRms);
}

// -----------------------------------------------------------------------------
// SECTION 7: CODEBASE INTEGRITY, ANTI-FACADE & ANTI-CHEATING
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 7: Anti-Facade, Zero-Stub & Source Code Forensics ---');

function scanSourceFiles(dir, exts) {
  const files = [];
  function walk(d) {
    const list = fs.readdirSync(d);
    for (const item of list) {
      const p = path.join(d, item);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        if (!p.includes('.agents') && !p.includes('node_modules') && !p.includes('.git')) {
          walk(p);
        }
      } else {
        const ext = path.extname(p);
        if (exts.includes(ext)) {
          files.push(p);
        }
      }
    }
  }
  walk(dir);
  return files;
}

const prodFiles = scanSourceFiles(path.join(ROOT_DIR, 'src'), ['.js', '.mjs', '.cjs'])
  .concat(scanSourceFiles(path.join(ROOT_DIR, 'public', 'js'), ['.js', '.mjs']));

let zeroStubs = true;
let zeroWatermarks = true;
let zeroEvals = true;

for (const pf of prodFiles) {
  const content = fs.readFileSync(pf, 'utf8');
  if (content.includes('NotImplemented') || content.includes('TODO: implement') || content.includes('dummy_value')) {
    zeroStubs = false;
    console.error(`Found stub/placeholder in ${pf}`);
  }
  if (content.includes('kentjuno') || content.includes('var _q')) {
    zeroWatermarks = false;
    console.error(`Found legacy watermark in ${pf}`);
  }
  if (content.includes('eval(')) {
    zeroEvals = false;
    console.error(`Found eval() in ${pf}`);
  }
}

assertTest('Zero dummy/placeholder stubs in src/ and public/js/', zeroStubs);
assertTest('Zero legacy watermarks in src/ and public/js/', zeroWatermarks);
assertTest('Zero eval() execution in src/ and public/js/', zeroEvals);

// -----------------------------------------------------------------------------
// SUMMARY & VERDICT
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log('INDEPENDENT FORENSIC TEST SUITE SUMMARY');
console.log('================================================================');
console.log(`Total Assertions Executed : ${totalTests}`);
console.log(`Assertions Passed         : ${passedTests}`);
console.log(`Assertions Failed         : ${failedTests}`);

if (failedTests > 0) {
  console.error('\nFAILURE DETAILS:');
  failureDetails.forEach(f => console.error(`  - ${f.name}: ${f.details}`));
  process.exit(1);
} else {
  console.log('\n[INDEPENDENT VERDICT] 100% OF ASSERTIONS PASSED WITH ZERO DEFECTS.');
  process.exit(0);
}
