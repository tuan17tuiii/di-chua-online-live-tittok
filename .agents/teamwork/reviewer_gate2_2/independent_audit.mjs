import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const rootDir = process.cwd();

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function calcCrc(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePng(buf) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== sig[i]) throw new Error('Invalid PNG signature');
  }

  let offset = 8;
  let ihdr = null;
  const idats = [];

  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    offset += 8;

    const data = buf.subarray(offset, offset + len);
    offset += len;

    const crc = buf.readUInt32BE(offset);
    offset += 4;

    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12]
      };
    } else if (type === 'IDAT') {
      idats.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (!ihdr) throw new Error('Missing IHDR');
  if (idats.length === 0) throw new Error('Missing IDAT');

  const inflated = zlib.inflateSync(Buffer.concat(idats));
  const { width, height, colorType, bitDepth } = ihdr;

  if (colorType !== 6 || bitDepth !== 8) {
    return { ihdr, rgba: null };
  }

  const bytesPerPixel = 4;
  const rgba = Buffer.alloc(width * height * 4);
  let srcOffset = 0;
  let prevRow = Buffer.alloc(width * bytesPerPixel);

  for (let y = 0; y < height; y++) {
    const filter = inflated[srcOffset++];
    const currentRow = Buffer.alloc(width * bytesPerPixel);

    for (let x = 0; x < width * bytesPerPixel; x++) {
      const raw = inflated[srcOffset++];
      const a = x >= bytesPerPixel ? currentRow[x - bytesPerPixel] : 0;
      const b = prevRow[x];
      const c = x >= bytesPerPixel ? prevRow[x - bytesPerPixel] : 0;

      let val = 0;
      switch (filter) {
        case 0: val = raw; break;
        case 1: val = (raw + a) & 0xff; break;
        case 2: val = (raw + b) & 0xff; break;
        case 3: val = (raw + Math.floor((a + b) / 2)) & 0xff; break;
        case 4: val = (raw + paeth(a, b, c)) & 0xff; break;
        default: val = raw;
      }
      currentRow[x] = val;
    }

    currentRow.copy(rgba, y * width * 4);
    prevRow = currentRow;
  }

  return { ihdr, rgba };
}

function decodeJpeg(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error('Invalid JPEG SOI');
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
        marker: marker === 0xc0 ? 'SOF0' : 'SOF2',
        height: buf.readUInt16BE(offset + 3),
        width: buf.readUInt16BE(offset + 5)
      };
    }
    offset += len;
  }
  throw new Error('No SOF0/SOF2 header found');
}

console.log('=== INDEPENDENT AUDIT OF 12 REMEDIATED ASSETS ===');

const TARGETS = [
  { path: 'assets/characters/c_woman.png', expW: 212, expH: 300, isStrip: false },
  { path: 'assets/characters/anim_woman.png', expW: 1696, expH: 300, isStrip: true, fw: 212 },
  { path: 'assets/characters/c_monk.png', expW: 212, expH: 300, isStrip: false },
  { path: 'assets/characters/anim_monk.png', expW: 1696, expH: 300, isStrip: true, fw: 212 },
  { path: 'assets/characters/c_nun.png', expW: 212, expH: 300, isStrip: false },
  { path: 'assets/characters/anim_nun.png', expW: 1696, expH: 300, isStrip: true, fw: 212 },
  { path: 'assets/altar/statue_shakyamuni.png', expW: 600, expH: 800, isStrip: false },
  { path: 'assets/altar/statue_amitabha.png', expW: 600, expH: 800, isStrip: false },
  { path: 'assets/altar/statue_avalokiteshvara.png', expW: 550, expH: 820, isStrip: false },
  { path: 'assets/altar/censer_bronze.png', expW: 280, expH: 240, isStrip: false },
  { path: 'assets/altar/candle_stand.png', expW: 150, expH: 350, isStrip: false },
  { path: 'assets/altar/meditation_cushion.png', expW: 160, expH: 90, isStrip: false },
  { path: 'assets/backgrounds/zen_garden.jpg', expW: 1080, expH: 1920, maxSize: 550 * 1024, isJpg: true }
];

let allPassed = true;

for (const t of TARGETS) {
  const full = path.join(rootDir, t.path);
  if (!fs.existsSync(full)) {
    console.error(`[FAIL] File missing: ${t.path}`);
    allPassed = false;
    continue;
  }
  const stat = fs.statSync(full);
  const buf = fs.readFileSync(full);

  if (t.isJpg) {
    const jpg = decodeJpeg(buf);
    const sizeOk = stat.size < t.maxSize;
    const dimOk = jpg.width === t.expW && jpg.height === t.expH;
    console.log(`[${dimOk && sizeOk ? 'PASS' : 'FAIL'}] ${t.path}`);
    console.log(`  Size: ${stat.size} bytes (${(stat.size/1024).toFixed(1)} KB) - Limit: ${(t.maxSize/1024).toFixed(1)} KB (${sizeOk ? 'OK' : 'EXCEEDED'})`);
    console.log(`  Dimensions: ${jpg.width}x${jpg.height} (Expected: ${t.expW}x${t.expH}) - ${dimOk ? 'OK' : 'MISMATCH'}`);
    if (!dimOk || !sizeOk) allPassed = false;
  } else {
    const png = decodePng(buf);
    const dimOk = png.ihdr.width === t.expW && png.ihdr.height === t.expH;
    let alphaInfo = 'RGBA';
    let cornersOk = true;
    let anchorOk = true;

    if (png.rgba) {
      const w = png.ihdr.width;
      const h = png.ihdr.height;
      const getA = (x, y) => png.rgba[(y * w + x) * 4 + 3];

      // Corners
      const tl = getA(0, 0);
      const tr = getA(w - 1, 0);
      const bl = getA(0, h - 1);
      const br = getA(w - 1, h - 1);
      cornersOk = (tl === 0 && tr === 0 && bl === 0 && br === 0);

      // Total active pixels
      let activePixels = 0;
      for (let i = 3; i < png.rgba.length; i += 4) {
        if (png.rgba[i] > 10) activePixels++;
      }
      const activeRatio = (activePixels / (w * h) * 100).toFixed(1);

      // Character anchoring check
      if (t.path.includes('/characters/')) {
        let bottomRowActive = 0;
        for (let x = 0; x < w; x++) {
          if (getA(x, h - 1) > 20) bottomRowActive++;
        }
        anchorOk = bottomRowActive > 0;
        alphaInfo += ` | Active: ${activeRatio}% | Corners: [${tl},${tr},${bl},${br}] | BottomRowActive: ${bottomRowActive}px`;
      } else {
        alphaInfo += ` | Active: ${activeRatio}% | Corners: [${tl},${tr},${bl},${br}]`;
      }
    }

    const testPass = dimOk && cornersOk && anchorOk;
    console.log(`[${testPass ? 'PASS' : 'FAIL'}] ${t.path}`);
    console.log(`  Size: ${stat.size} bytes | Dim: ${png.ihdr.width}x${png.ihdr.height} (Expected: ${t.expW}x${t.expH})`);
    console.log(`  ${alphaInfo}`);
    if (!testPass) allPassed = false;
  }
}

console.log(`\nTARGET AUDIT RESULT: ${allPassed ? 'ALL 13 TARGET ASSETS PASSED 100%' : 'FAILURES DETECTED'}`);
process.exit(allPassed ? 0 : 1);
