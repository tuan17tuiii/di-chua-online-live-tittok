import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));

function decodePngHeader(buf) {
  if (buf.length < 24) return null;
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) return null;
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    colorType: buf[25]
  };
}

function decodeJpgHeader(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset < buf.length) {
    if (buf[offset] !== 0xff) { offset++; continue; }
    while (offset < buf.length && buf[offset] === 0xff) offset++;
    if (offset >= buf.length) break;
    const marker = buf[offset++];
    if (marker === 0xd9) break;
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const len = buf.readUInt16BE(offset);
    if (marker === 0xc0 || marker === 0xc2) {
      return {
        height: buf.readUInt16BE(offset + 3),
        width: buf.readUInt16BE(offset + 5)
      };
    }
    offset += len;
  }
  return null;
}

function decodeWavHeader(buf) {
  if (buf.length < 44) return null;
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return null;
  let offset = 12;
  while (offset + 8 < buf.length) {
    const chunkId = buf.toString('ascii', offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    if (chunkId === 'fmt ') {
      return {
        sampleRate: buf.readUInt32LE(offset + 12),
        bitsPerSample: buf.readUInt16LE(offset + 22),
        channels: buf.readUInt16LE(offset + 10)
      };
    }
    offset += 8 + chunkSize;
  }
  return null;
}

const fileList = [];

// Backgrounds (2)
manifest.assets.backgrounds.forEach(b => {
  fileList.push({ id: b.id, path: b.path, type: 'jpg', expW: b.width, expH: b.height });
});

// Altar (7)
manifest.assets.altar.forEach(a => {
  fileList.push({ id: a.id, path: a.path, type: 'png', expW: a.width, expH: a.height, requireAlpha: true });
});

// Characters (14)
manifest.assets.characters.forEach(c => {
  fileList.push({ id: `${c.id}_static`, path: c.staticPath, type: 'png', expW: c.frameWidth, expH: c.frameHeight, requireAlpha: true });
  fileList.push({ id: `${c.id}_strip`, path: c.spritesheetPath, type: 'png', expW: c.frameWidth * 8, expH: c.frameHeight, requireAlpha: true });
});

// FX (4)
manifest.assets.visual_fx.forEach(fx => {
  fileList.push({ id: fx.id, path: fx.path, type: 'png', expW: fx.width, expH: fx.height, requireAlpha: true });
});

// Audio SFX (7)
manifest.assets.audio_sfx.forEach(sfx => {
  fileList.push({ id: sfx.id, path: sfx.path, type: 'wav', sampleRate: sfx.sampleRate || 48000, bitDepth: sfx.bitDepth || 24 });
});

// Audio BGM (2)
manifest.assets.audio_bgm.forEach(bgm => {
  fileList.push({ id: bgm.id, path: bgm.path, type: 'mp3' });
});

console.log(`Checking all ${fileList.length} physical assets independently...`);

let failCount = 0;

fileList.forEach((f, idx) => {
  const rel = f.path.replace(/^\//, '');
  const abs = path.join(rootDir, rel);
  if (!fs.existsSync(abs)) {
    console.error(`[FAIL] File missing: ${rel}`);
    failCount++;
    return;
  }
  const stat = fs.statSync(abs);
  if (stat.size === 0) {
    console.error(`[FAIL] File empty: ${rel}`);
    failCount++;
    return;
  }
  const buf = fs.readFileSync(abs);
  if (f.type === 'png') {
    const h = decodePngHeader(buf);
    if (!h) {
      console.error(`[FAIL] Invalid PNG: ${rel}`);
      failCount++;
    } else if (h.width !== f.expW || h.height !== f.expH) {
      console.error(`[FAIL] Dim mismatch ${rel}: expected ${f.expW}x${f.expH}, got ${h.width}x${h.height}`);
      failCount++;
    } else if (f.requireAlpha && h.colorType !== 6) {
      console.error(`[FAIL] Missing alpha ${rel}: colorType ${h.colorType}`);
      failCount++;
    } else {
      console.log(`  [OK ${idx+1}/36] PNG ${f.id.padEnd(25)}: ${h.width}x${h.height} (${stat.size} bytes)`);
    }
  } else if (f.type === 'jpg') {
    const h = decodeJpgHeader(buf);
    if (!h) {
      console.error(`[FAIL] Invalid JPEG: ${rel}`);
      failCount++;
    } else if (h.width !== f.expW || h.height !== f.expH) {
      console.error(`[FAIL] Dim mismatch ${rel}: expected ${f.expW}x${f.expH}, got ${h.width}x${h.height}`);
      failCount++;
    } else {
      console.log(`  [OK ${idx+1}/36] JPG ${f.id.padEnd(25)}: ${h.width}x${h.height} (${stat.size} bytes)`);
    }
  } else if (f.type === 'wav') {
    const h = decodeWavHeader(buf);
    if (!h) {
      console.error(`[FAIL] Invalid WAV: ${rel}`);
      failCount++;
    } else if (h.sampleRate !== f.sampleRate || h.bitsPerSample !== f.bitDepth) {
      console.error(`[FAIL] Format mismatch ${rel}: expected ${f.sampleRate}Hz/${f.bitDepth}bit, got ${h.sampleRate}Hz/${h.bitsPerSample}bit`);
      failCount++;
    } else {
      console.log(`  [OK ${idx+1}/36] WAV ${f.id.padEnd(25)}: ${h.sampleRate}Hz ${h.bitsPerSample}bit (${stat.size} bytes)`);
    }
  } else if (f.type === 'mp3') {
    if (buf.length < 500000) {
      console.error(`[FAIL] MP3 too small: ${rel}`);
      failCount++;
    } else {
      console.log(`  [OK ${idx+1}/36] MP3 ${f.id.padEnd(25)}: (${stat.size} bytes)`);
    }
  }
});

console.log(`\nFinal tally: ${36 - failCount} / 36 passed, ${failCount} failed.`);
if (failCount > 0) process.exit(1);
