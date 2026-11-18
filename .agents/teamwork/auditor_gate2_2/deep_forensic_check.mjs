import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const rootDir = 'c:/Users/tn018/Desktop/Person/media/tiktok/app-live';

// 1. Binary header parsers
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
    return { valid: false, error: 'Invalid JPEG SOI marker' };
  }

  let offset = 2;
  while (offset < buf.length) {
    if (buf[offset] !== 0xff) { offset++; continue; }
    while (offset < buf.length && buf[offset] === 0xff) offset++;
    if (offset >= buf.length) break;

    const marker = buf[offset++];
    if (marker === 0xd9) break; // EOI
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) continue;

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
    return { valid: false, error: 'Invalid RIFF/WAVE header' };
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
  return { valid: false, error: 'Missing fmt chunk' };
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
  return { valid: false, error: 'Missing MPEG sync' };
}

// Load manifest.json
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));

// Build ground truth asset list
const assetsToAudit = [
  // Backgrounds
  { id: 'bg_main_hall', path: 'assets/backgrounds/hall.jpg', type: 'jpg', expW: 1080, expH: 1920, alpha: false },
  { id: 'bg_zen_garden', path: 'assets/backgrounds/zen_garden.jpg', type: 'jpg', expW: 1080, expH: 1920, alpha: false },
  // Altar
  { id: 'altar_table_main', path: 'assets/altar/altar_table.png', type: 'png', expW: 1080, expH: 850, alpha: true },
  { id: 'statue_shakyamuni', path: 'assets/altar/statue_shakyamuni.png', type: 'png', expW: 600, expH: 800, alpha: true, wasDefective: true },
  { id: 'statue_amitabha', path: 'assets/altar/statue_amitabha.png', type: 'png', expW: 600, expH: 800, alpha: true, wasDefective: true },
  { id: 'statue_avalokiteshvara', path: 'assets/altar/statue_avalokiteshvara.png', type: 'png', expW: 550, expH: 820, alpha: true, wasDefective: true },
  { id: 'altar_censer_bronze', path: 'assets/altar/censer_bronze.png', type: 'png', expW: 280, expH: 240, alpha: true, wasDefective: true },
  { id: 'altar_candle_stand', path: 'assets/altar/candle_stand.png', type: 'png', expW: 150, expH: 350, alpha: true, wasDefective: true },
  { id: 'cushion_lotus_mat', path: 'assets/altar/meditation_cushion.png', type: 'png', expW: 160, expH: 90, alpha: true, wasDefective: true },
  // Character portraits & strips
  { id: 'char_man_static', path: 'assets/characters/c_man.png', type: 'png', expW: 212, expH: 300, alpha: true },
  { id: 'char_man_strip', path: 'assets/characters/anim_man.png', type: 'png', expW: 1696, expH: 300, alpha: true },
  { id: 'char_woman_static', path: 'assets/characters/c_woman.png', type: 'png', expW: 212, expH: 300, alpha: true, wasDefective: true },
  { id: 'char_woman_strip', path: 'assets/characters/anim_woman.png', type: 'png', expW: 1696, expH: 300, alpha: true, wasDefective: true },
  { id: 'char_granny_static', path: 'assets/characters/c_granny.png', type: 'png', expW: 195, expH: 300, alpha: true },
  { id: 'char_granny_strip', path: 'assets/characters/anim_granny.png', type: 'png', expW: 1560, expH: 300, alpha: true },
  { id: 'char_child_static', path: 'assets/characters/c_child.png', type: 'png', expW: 180, expH: 260, alpha: true },
  { id: 'char_child_strip', path: 'assets/characters/anim_child.png', type: 'png', expW: 1440, expH: 260, alpha: true },
  { id: 'char_monk_static', path: 'assets/characters/c_monk.png', type: 'png', expW: 212, expH: 300, alpha: true, wasDefective: true },
  { id: 'char_monk_strip', path: 'assets/characters/anim_monk.png', type: 'png', expW: 1696, expH: 300, alpha: true, wasDefective: true },
  { id: 'char_nun_static', path: 'assets/characters/c_nun.png', type: 'png', expW: 212, expH: 300, alpha: true, wasDefective: true },
  { id: 'char_nun_strip', path: 'assets/characters/anim_nun.png', type: 'png', expW: 1696, expH: 300, alpha: true, wasDefective: true },
  { id: 'char_master_static', path: 'assets/characters/c_master.png', type: 'png', expW: 230, expH: 320, alpha: true },
  { id: 'char_master_strip', path: 'assets/characters/anim_master.png', type: 'png', expW: 1840, expH: 320, alpha: true },
  // FX
  { id: 'fx_halo_gold', path: 'assets/fx/fx_halo.png', type: 'png', expW: 512, expH: 512, alpha: true },
  { id: 'fx_floating_lotus', path: 'assets/fx/fx_lotus.png', type: 'png', expW: 128, expH: 128, alpha: true },
  { id: 'fx_gold_petal', path: 'assets/fx/fx_petal.png', type: 'png', expW: 64, expH: 64, alpha: true },
  { id: 'fx_gift_bell_flash', path: 'assets/fx/fx_bell.png', type: 'png', expW: 256, expH: 256, alpha: true },
  // Audio SFX
  { id: 'sfx_mo_01', path: 'assets/audio/sfx/mo_strike_01.wav', type: 'wav', sampleRate: 48000, bitDepth: 24 },
  { id: 'sfx_mo_02', path: 'assets/audio/sfx/mo_strike_02.wav', type: 'wav', sampleRate: 48000, bitDepth: 24 },
  { id: 'sfx_mo_03', path: 'assets/audio/sfx/mo_strike_03.wav', type: 'wav', sampleRate: 48000, bitDepth: 24 },
  { id: 'sfx_bell_bowl', path: 'assets/audio/sfx/bell_bowl.wav', type: 'wav', sampleRate: 48000, bitDepth: 24 },
  { id: 'sfx_bell_great_temple', path: 'assets/audio/sfx/bell_temple.wav', type: 'wav', sampleRate: 48000, bitDepth: 24 },
  { id: 'sfx_gift_chime_tier1', path: 'assets/audio/sfx/gift_tier1.wav', type: 'wav', sampleRate: 48000, bitDepth: 24 },
  { id: 'sfx_gift_chime_tier2', path: 'assets/audio/sfx/gift_tier2.wav', type: 'wav', sampleRate: 48000, bitDepth: 24 },
  // Audio BGM
  { id: 'bgm_flute_peace', path: 'assets/audio/bgm/music1.mp3', type: 'mp3' },
  { id: 'bgm_zither_morning', path: 'assets/audio/bgm/music2.mp3', type: 'mp3' },
];

console.log(`Total scheduled assets to independently audit: ${assetsToAudit.length}`);

const results = [];
const shaHashes = new Map();

for (const item of assetsToAudit) {
  const fullPath = path.join(rootDir, item.path);
  if (!fs.existsSync(fullPath)) {
    results.push({ item: item.id, path: item.path, status: 'MISSING' });
    continue;
  }
  const stat = fs.statSync(fullPath);
  if (stat.size === 0) {
    results.push({ item: item.id, path: item.path, status: 'ZERO_BYTE' });
    continue;
  }

  const buf = fs.readFileSync(fullPath);
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  const hashDuplicate = shaHashes.has(sha256) ? shaHashes.get(sha256) : null;
  shaHashes.set(sha256, item.path);

  let details = {
    id: item.id,
    path: item.path,
    size: stat.size,
    sha256_prefix: sha256.substring(0, 16),
    hashDuplicate,
    wasDefective: item.wasDefective || false,
    status: 'OK'
  };

  if (item.type === 'png') {
    const png = parsePngHeader(buf);
    details.format = 'png';
    details.actualW = png.width;
    details.actualH = png.height;
    details.hasAlpha = png.hasAlpha;
    details.bitDepth = png.bitDepth;
    details.colorType = png.colorType;
    if (!png.valid) {
      details.status = 'CORRUPT_PNG';
      details.error = png.error;
    } else if (png.width !== item.expW || png.height !== item.expH) {
      details.status = 'DIM_MISMATCH';
      details.expected = `${item.expW}x${item.expH}`;
      details.actual = `${png.width}x${png.height}`;
    } else if (item.alpha && !png.hasAlpha) {
      details.status = 'MISSING_ALPHA';
    }
  } else if (item.type === 'jpg') {
    const jpg = parseJpegHeader(buf);
    details.format = 'jpg';
    details.actualW = jpg.width;
    details.actualH = jpg.height;
    if (!jpg.valid) {
      details.status = 'CORRUPT_JPG';
      details.error = jpg.error;
    } else if (jpg.width !== item.expW || jpg.height !== item.expH) {
      details.status = 'DIM_MISMATCH';
      details.expected = `${item.expW}x${item.expH}`;
      details.actual = `${jpg.width}x${jpg.height}`;
    }
  } else if (item.type === 'wav') {
    const wav = parseWavHeader(buf);
    details.format = 'wav';
    details.sampleRate = wav.sampleRate;
    details.bitsPerSample = wav.bitsPerSample;
    details.channels = wav.channels;
    if (!wav.valid) {
      details.status = 'CORRUPT_WAV';
      details.error = wav.error;
    } else if (wav.sampleRate !== item.sampleRate || wav.bitsPerSample !== item.bitDepth) {
      details.status = 'AUDIO_FMT_MISMATCH';
    }
  } else if (item.type === 'mp3') {
    const mp3 = parseMp3Header(buf);
    details.format = 'mp3';
    if (!mp3.valid) {
      details.status = 'CORRUPT_MP3';
      details.error = mp3.error;
    }
  }

  results.push(details);
}

fs.writeFileSync(
  path.join(rootDir, '.agents/teamwork/auditor_gate2_2/audit_data.json'),
  JSON.stringify(results, null, 2)
);

console.log('--- AUDIT RESULTS SUMMARY ---');
let passCount = 0;
let failCount = 0;
let defectiveRemediatedCount = 0;

for (const r of results) {
  if (r.status === 'OK' && !r.hashDuplicate) {
    passCount++;
    if (r.wasDefective) defectiveRemediatedCount++;
  } else {
    failCount++;
    console.error(`FAIL: ${r.id} (${r.path}) -> ${r.status}`, r);
  }
}

console.log(`Passed: ${passCount} / ${results.length}`);
console.log(`Failed: ${failCount} / ${results.length}`);
console.log(`Defective Assets Remediated: ${defectiveRemediatedCount} / 12`);
