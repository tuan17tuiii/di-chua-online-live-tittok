import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const rootDir = process.cwd();
const manifestPath = path.join(rootDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

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

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function parsePng(buf, filePath) {
  const issues = [];
  if (buf.length < 8) {
    issues.push('File size less than 8 bytes');
    return { ok: false, issues };
  }

  const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== pngSig[i]) {
      issues.push(`Invalid PNG signature byte at ${i}`);
      return { ok: false, issues };
    }
  }

  let offset = 8;
  const chunks = [];
  let idatBuffers = [];
  let ihdr = null;
  let seenIend = false;

  while (offset < buf.length) {
    if (offset + 8 > buf.length) {
      issues.push(`Truncated chunk header at offset ${offset}`);
      break;
    }
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    offset += 8;

    if (offset + length + 4 > buf.length) {
      issues.push(`Chunk ${type} truncated`);
      break;
    }

    const chunkData = buf.subarray(offset, offset + length);
    const storedCrc = buf.readUInt32BE(offset + length);
    offset += length;

    const typeAndData = buf.subarray(offset - length - 4, offset);
    const calculatedCrc = calcCrc(typeAndData);
    if (storedCrc !== calculatedCrc) {
      issues.push(`Chunk ${type} CRC mismatch`);
    }

    offset += 4;
    chunks.push({ type, length, crcOk: storedCrc === calculatedCrc });

    if (type === 'IHDR') {
      ihdr = {
        width: chunkData.readUInt32BE(0),
        height: chunkData.readUInt32BE(4),
        bitDepth: chunkData[8],
        colorType: chunkData[9],
        compression: chunkData[10],
        filter: chunkData[11],
        interlace: chunkData[12]
      };
    } else if (type === 'IDAT') {
      idatBuffers.push(chunkData);
    } else if (type === 'IEND') {
      seenIend = true;
      if (offset < buf.length) {
        issues.push(`Trailing ${buf.length - offset} bytes after IEND`);
      }
      break;
    }
  }

  if (!ihdr) issues.push('Missing IHDR chunk');
  if (idatBuffers.length === 0) issues.push('Missing IDAT chunk');
  if (!seenIend) issues.push('Missing IEND chunk');

  if (issues.length > 0) {
    return { ok: false, issues, ihdr, chunks };
  }

  let inflated;
  try {
    const combinedIdat = Buffer.concat(idatBuffers);
    inflated = zlib.inflateSync(combinedIdat);
  } catch (err) {
    issues.push(`zlib inflate failed: ${err.message}`);
    return { ok: false, issues, ihdr, chunks };
  }

  const { width, height, bitDepth, colorType, interlace } = ihdr;
  if (interlace !== 0) {
    issues.push(`Interlaced PNG not supported`);
    return { ok: false, issues, ihdr, chunks };
  }

  let bytesPerPixel;
  if (colorType === 6 && bitDepth === 8) bytesPerPixel = 4;
  else if (colorType === 2 && bitDepth === 8) bytesPerPixel = 3;
  else if (colorType === 0 && bitDepth === 8) bytesPerPixel = 1;
  else if (colorType === 4 && bitDepth === 8) bytesPerPixel = 2;
  else {
    issues.push(`Unsupported colorType=${colorType} / bitDepth=${bitDepth}`);
    return { ok: false, issues, ihdr, chunks };
  }

  const rawRgba = Buffer.alloc(width * height * 4);
  let srcOffset = 0;
  let prevRow = Buffer.alloc(width * bytesPerPixel);

  for (let y = 0; y < height; y++) {
    const filterType = inflated[srcOffset++];
    const currentRow = Buffer.alloc(width * bytesPerPixel);

    for (let x = 0; x < width * bytesPerPixel; x++) {
      const raw = inflated[srcOffset++];
      const a = x >= bytesPerPixel ? currentRow[x - bytesPerPixel] : 0;
      const b = prevRow[x];
      const c = x >= bytesPerPixel ? prevRow[x - bytesPerPixel] : 0;

      let val = 0;
      switch (filterType) {
        case 0: val = raw; break;
        case 1: val = (raw + a) & 0xff; break;
        case 2: val = (raw + b) & 0xff; break;
        case 3: val = (raw + Math.floor((a + b) / 2)) & 0xff; break;
        case 4: val = (raw + paethPredictor(a, b, c)) & 0xff; break;
        default:
          issues.push(`Invalid filter type ${filterType}`);
          val = raw;
      }
      currentRow[x] = val;
    }

    for (let x = 0; x < width; x++) {
      const dstIdx = (y * width + x) * 4;
      if (colorType === 6) {
        const srcIdx = x * 4;
        rawRgba[dstIdx] = currentRow[srcIdx];
        rawRgba[dstIdx + 1] = currentRow[srcIdx + 1];
        rawRgba[dstIdx + 2] = currentRow[srcIdx + 2];
        rawRgba[dstIdx + 3] = currentRow[srcIdx + 3];
      } else if (colorType === 2) {
        const srcIdx = x * 3;
        rawRgba[dstIdx] = currentRow[srcIdx];
        rawRgba[dstIdx + 1] = currentRow[srcIdx + 1];
        rawRgba[dstIdx + 2] = currentRow[srcIdx + 2];
        rawRgba[dstIdx + 3] = 255;
      } else if (colorType === 0) {
        const g = currentRow[x];
        rawRgba[dstIdx] = g;
        rawRgba[dstIdx + 1] = g;
        rawRgba[dstIdx + 2] = g;
        rawRgba[dstIdx + 3] = 255;
      } else if (colorType === 4) {
        const g = currentRow[x * 2];
        const a = currentRow[x * 2 + 1];
        rawRgba[dstIdx] = g;
        rawRgba[dstIdx + 1] = g;
        rawRgba[dstIdx + 2] = g;
        rawRgba[dstIdx + 3] = a;
      }
    }
    prevRow = currentRow;
  }

  return {
    ok: issues.length === 0,
    issues,
    ihdr,
    chunks,
    rgba: rawRgba,
    width,
    height
  };
}

function parseJpeg(buf) {
  const issues = [];
  if (buf.length < 4) {
    issues.push('File size less than 4 bytes');
    return { ok: false, issues };
  }

  if (buf[0] !== 0xff || buf[1] !== 0xd8) {
    issues.push(`Invalid JPEG SOI marker: 0x${buf[0].toString(16)} 0x${buf[1].toString(16)}`);
    return { ok: false, issues };
  }

  let offset = 2;
  let sof = null;
  let hasApp0 = false;
  let seenEoi = false;
  const markers = [];

  while (offset < buf.length) {
    if (buf[offset] !== 0xff) {
      offset++;
      continue;
    }
    while (offset < buf.length && buf[offset] === 0xff) {
      offset++;
    }
    if (offset >= buf.length) break;

    const marker = buf[offset++];
    if (marker === 0xd9) { // EOI
      seenEoi = true;
      markers.push('EOI');
      break;
    }
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    if (offset + 2 > buf.length) {
      issues.push(`Truncated marker length at offset ${offset}`);
      break;
    }
    const length = buf.readUInt16BE(offset);
    if (offset + length > buf.length) {
      issues.push(`Marker segment 0x${marker.toString(16)} truncated`);
      break;
    }

    const markerHex = '0x' + marker.toString(16).toUpperCase();
    markers.push(markerHex);

    if (marker === 0xe0) { // APP0
      const ident = buf.toString('ascii', offset + 2, offset + 7);
      if (ident.startsWith('JFIF')) hasApp0 = true;
    } else if (marker === 0xc0 || marker === 0xc2) { // SOF0 / SOF2
      sof = {
        marker: marker === 0xc0 ? 'SOF0' : 'SOF2',
        precision: buf[offset + 2],
        height: buf.readUInt16BE(offset + 3),
        width: buf.readUInt16BE(offset + 5),
        components: buf[offset + 7]
      };
    }

    offset += length;
  }

  if (!sof) issues.push('Missing SOF0/SOF2 frame header');
  if (!seenEoi) issues.push('Missing EOI marker (truncated)');

  return {
    ok: issues.length === 0,
    issues,
    hasApp0,
    sof,
    markers,
    width: sof?.width,
    height: sof?.height
  };
}

// Build list of all 27 visual assets
const visualAssets = [];

// Backgrounds
manifest.assets.backgrounds.forEach(item => {
  visualAssets.push({
    group: 'backgrounds',
    id: item.id,
    name: item.name,
    path: item.path,
    format: item.format,
    expectedWidth: item.width,
    expectedHeight: item.height,
    isStrip: false,
    item
  });
});

// Altar
manifest.assets.altar.forEach(item => {
  visualAssets.push({
    group: 'altar',
    id: item.id,
    name: item.name,
    path: item.path,
    format: item.format,
    expectedWidth: item.width,
    expectedHeight: item.height,
    isStrip: false,
    item
  });
});

// Characters: 7 static + 7 strips
manifest.assets.characters.forEach(item => {
  visualAssets.push({
    group: 'characters_static',
    id: `${item.id}_static`,
    name: `${item.name} (Static)`,
    path: item.staticPath,
    format: item.format,
    expectedWidth: item.frameWidth,
    expectedHeight: item.frameHeight,
    isStrip: false,
    item
  });
  visualAssets.push({
    group: 'characters_strip',
    id: `${item.id}_strip`,
    name: `${item.name} (Spritesheet)`,
    path: item.spritesheetPath,
    format: item.format,
    expectedWidth: item.frameWidth * 8,
    expectedHeight: item.frameHeight,
    isStrip: true,
    frameCount: 8,
    frameWidth: item.frameWidth,
    frameHeight: item.frameHeight,
    seatedHeight: item.seatedHeight,
    item
  });
});

// Visual FX
manifest.assets.visual_fx.forEach(item => {
  visualAssets.push({
    group: 'visual_fx',
    id: item.id,
    name: item.name,
    path: item.path,
    format: item.format,
    expectedWidth: item.width,
    expectedHeight: item.height,
    isStrip: false,
    item
  });
});

console.log(`Configured ${visualAssets.length} visual assets for testing.`);

const results = [];

for (const asset of visualAssets) {
  const relPath = asset.path.replace(/^\//, '');
  const absPath = path.join(rootDir, relPath);

  const res = {
    id: asset.id,
    name: asset.name,
    group: asset.group,
    path: relPath,
    format: asset.format,
    exists: false,
    fileSizeBytes: 0,
    binaryCheck: { pass: false, issues: [] },
    dimensionCheck: { pass: false, actualWidth: null, actualHeight: null, expectedWidth: asset.expectedWidth, expectedHeight: asset.expectedHeight, issues: [] },
    alphaCheck: null,
    anchoringCheck: null
  };

  if (!fs.existsSync(absPath)) {
    res.binaryCheck.issues.push(`File missing on disk: ${relPath}`);
    results.push(res);
    continue;
  }

  res.exists = true;
  const stat = fs.statSync(absPath);
  res.fileSizeBytes = stat.size;

  if (stat.size === 0) {
    res.binaryCheck.issues.push('File is 0 bytes (empty)');
    results.push(res);
    continue;
  }

  const buf = fs.readFileSync(absPath);

  if (asset.format === 'jpg' || asset.format === 'jpeg') {
    const parsed = parseJpeg(buf);
    res.binaryCheck.pass = parsed.ok;
    res.binaryCheck.issues = parsed.issues;
    res.binaryCheck.details = {
      hasApp0: parsed.hasApp0,
      sofMarker: parsed.sof?.marker,
      components: parsed.sof?.components
    };

    res.dimensionCheck.actualWidth = parsed.width;
    res.dimensionCheck.actualHeight = parsed.height;
    if (parsed.width === asset.expectedWidth && parsed.height === asset.expectedHeight) {
      res.dimensionCheck.pass = true;
    } else {
      res.dimensionCheck.issues.push(`Dimension mismatch: expected ${asset.expectedWidth}x${asset.expectedHeight}, got ${parsed.width}x${parsed.height}`);
    }

  } else if (asset.format === 'png') {
    const parsed = parsePng(buf, relPath);
    res.binaryCheck.pass = parsed.ok;
    res.binaryCheck.issues = parsed.issues;
    res.binaryCheck.details = {
      chunks: parsed.chunks?.map(c => c.type),
      colorType: parsed.ihdr?.colorType,
      bitDepth: parsed.ihdr?.bitDepth
    };

    res.dimensionCheck.actualWidth = parsed.width;
    res.dimensionCheck.actualHeight = parsed.height;
    if (parsed.width === asset.expectedWidth && parsed.height === asset.expectedHeight) {
      res.dimensionCheck.pass = true;
    } else {
      res.dimensionCheck.issues.push(`Dimension mismatch: expected ${asset.expectedWidth}x${asset.expectedHeight}, got ${parsed.width}x${parsed.height}`);
    }

    if (parsed.rgba) {
      const w = parsed.width;
      const h = parsed.height;
      const totalPixels = w * h;
      let minAlpha = 255;
      let maxAlpha = 0;
      let zeroAlphaCount = 0;
      let opaqueAlphaCount = 0; // alpha == 255
      let semiAlphaCount = 0;   // 0 < alpha < 255
      let alphaSum = 0;

      for (let i = 3; i < parsed.rgba.length; i += 4) {
        const a = parsed.rgba[i];
        if (a < minAlpha) minAlpha = a;
        if (a > maxAlpha) maxAlpha = a;
        if (a === 0) zeroAlphaCount++;
        else if (a === 255) opaqueAlphaCount++;
        else semiAlphaCount++;
        alphaSum += a;
      }

      // Check corners: (0,0), (w-1, 0), (0, h-1), (w-1, h-1)
      const getPixelAlpha = (px, py) => {
        if (px < 0 || px >= w || py < 0 || py >= h) return 0;
        return parsed.rgba[(py * w + px) * 4 + 3];
      };

      const cornerTopLeft = getPixelAlpha(0, 0);
      const cornerTopRight = getPixelAlpha(w - 1, 0);
      const cornerBottomLeft = getPixelAlpha(0, h - 1);
      const cornerBottomRight = getPixelAlpha(w - 1, h - 1);

      // Check perimeter borders
      let topEdgeOpaque = 0;
      let bottomEdgeOpaque = 0;
      let leftEdgeOpaque = 0;
      let rightEdgeOpaque = 0;

      for (let x = 0; x < w; x++) {
        if (getPixelAlpha(x, 0) > 200) topEdgeOpaque++;
        if (getPixelAlpha(x, h - 1) > 200) bottomEdgeOpaque++;
      }
      for (let y = 0; y < h; y++) {
        if (getPixelAlpha(0, y) > 200) leftEdgeOpaque++;
        if (getPixelAlpha(w - 1, y) > 200) rightEdgeOpaque++;
      }

      const alphaIssues = [];
      if (minAlpha !== 0) alphaIssues.push(`minAlpha is ${minAlpha} (expected 0: transparent regions exist)`);
      if (maxAlpha <= 200) alphaIssues.push(`maxAlpha is ${maxAlpha} (expected > 200: opaque subject exists)`);

      const corners = { cornerTopLeft, cornerTopRight, cornerBottomLeft, cornerBottomRight };
      const nonZeroCorners = Object.entries(corners).filter(([k, v]) => v !== 0);
      if (nonZeroCorners.length > 0) {
        alphaIssues.push(`Corner pixels not transparent: ${nonZeroCorners.map(([k, v]) => `${k}=${v}`).join(', ')}`);
      }

      res.alphaCheck = {
        pass: alphaIssues.length === 0,
        minAlpha,
        maxAlpha,
        avgAlpha: (alphaSum / totalPixels).toFixed(2),
        zeroAlphaRatio: (zeroAlphaCount / totalPixels).toFixed(4),
        opaqueAlphaRatio: (opaqueAlphaCount / totalPixels).toFixed(4),
        semiAlphaRatio: (semiAlphaCount / totalPixels).toFixed(4),
        corners,
        borderOpaqueCounts: {
          topEdgeOpaque,
          bottomEdgeOpaque,
          leftEdgeOpaque,
          rightEdgeOpaque
        },
        issues: alphaIssues
      };

      // Anchoring & Frame Analysis for Characters
      if (asset.group === 'characters_static' || asset.group === 'characters_strip') {
        const frameW = asset.isStrip ? asset.frameWidth : w;
        const frameH = asset.isStrip ? asset.frameHeight : h;
        const frameCount = asset.isStrip ? asset.frameCount : 1;

        const frames = [];
        let allFramesAnchored = true;
        const anchoringIssues = [];

        for (let f = 0; f < frameCount; f++) {
          const startX = f * frameW;
          let minX = frameW, maxX = -1, minY = frameH, maxY = -1;
          let bottomRowAlphaCount = 0;
          let bottom5RowsAlphaCount = 0;

          for (let y = 0; y < frameH; y++) {
            for (let x = 0; x < frameW; x++) {
              const a = getPixelAlpha(startX + x, y);
              if (a > 20) { // consider pixel active
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                if (y === frameH - 1) bottomRowAlphaCount++;
                if (y >= frameH - 5) bottom5RowsAlphaCount++;
              }
            }
          }

          const bottomMargin = frameH - 1 - maxY;
          const subjectHeight = maxY >= minY ? maxY - minY + 1 : 0;
          const subjectWidth = maxX >= minX ? maxX - minX + 1 : 0;

          // Check bottom row touching:
          // In 2.5D seating, characters are seated at y = frameH - 1.
          // Bottom margin should be 0 or small (<= 2-5 pixels), or bottom row has contact.
          const frameInfo = {
            frameIndex: f,
            bbox: { minX, maxX, minY, maxY },
            subjectWidth,
            subjectHeight,
            bottomMargin,
            bottomRowAlphaCount,
            bottom5RowsAlphaCount
          };
          frames.push(frameInfo);

          if (bottomMargin > 10) {
            anchoringIssues.push(`Frame ${f}: character floats ${bottomMargin}px above frame bottom (y=${frameH-1})`);
            allFramesAnchored = false;
          }
        }

        res.anchoringCheck = {
          pass: allFramesAnchored,
          frames,
          issues: anchoringIssues
        };
      }
    }
  }

  results.push(res);
}

// Print comprehensive summary
console.log('\n================================================================');
console.log('EMPIRICAL ASSET VERIFICATION REPORT');
console.log('================================================================\n');

let totalAssets = results.length;
let passBinary = results.filter(r => r.binaryCheck.pass).length;
let passDim = results.filter(r => r.dimensionCheck.pass).length;
let pngAssets = results.filter(r => r.format === 'png');
let passAlpha = pngAssets.filter(r => r.alphaCheck?.pass).length;
let charAssets = results.filter(r => r.anchoringCheck);
let passAnchoring = charAssets.filter(r => r.anchoringCheck?.pass).length;

console.log(`Total Assets Evaluated: ${totalAssets}`);
console.log(`Binary Integrity Pass: ${passBinary} / ${totalAssets}`);
console.log(`Dimension Exact Match: ${passDim} / ${totalAssets}`);
console.log(`Alpha Transparency & Borders Pass: ${passAlpha} / ${pngAssets.length}`);
console.log(`Character Bottom Anchoring Pass: ${passAnchoring} / ${charAssets.length}`);

console.log('\n----------------------------------------------------------------');
console.log('DETAILED BREAKDOWN BY ASSET');
console.log('----------------------------------------------------------------');

for (const r of results) {
  const binaryStatus = r.binaryCheck.pass ? 'PASS' : 'FAIL';
  const dimStatus = r.dimensionCheck.pass ? 'PASS' : 'FAIL';
  const alphaStatus = r.alphaCheck ? (r.alphaCheck.pass ? 'PASS' : 'FAIL') : 'N/A(JPG)';
  const anchorStatus = r.anchoringCheck ? (r.anchoringCheck.pass ? 'PASS' : 'FAIL') : 'N/A';

  console.log(`[${r.id}] ${r.name}`);
  console.log(`  Path: ${r.path} (${r.fileSizeBytes.toLocaleString()} bytes)`);
  console.log(`  Binary: ${binaryStatus} | Dim: ${dimStatus} (${r.dimensionCheck.actualWidth}x${r.dimensionCheck.actualHeight}) | Alpha: ${alphaStatus} | Anchor: ${anchorStatus}`);

  if (r.binaryCheck.issues.length > 0) {
    console.log(`    Binary Issues:`, r.binaryCheck.issues.join('; '));
  }
  if (r.dimensionCheck.issues.length > 0) {
    console.log(`    Dimension Issues:`, r.dimensionCheck.issues.join('; '));
  }
  if (r.alphaCheck) {
    console.log(`    Alpha: min=${r.alphaCheck.minAlpha}, max=${r.alphaCheck.maxAlpha}, zero=${(r.alphaCheck.zeroAlphaRatio*100).toFixed(1)}%, opaque=${(r.alphaCheck.opaqueAlphaRatio*100).toFixed(1)}%, semi=${(r.alphaCheck.semiAlphaRatio*100).toFixed(1)}%`);
    console.log(`    Corners: TL=${r.alphaCheck.corners.cornerTopLeft}, TR=${r.alphaCheck.corners.cornerTopRight}, BL=${r.alphaCheck.corners.cornerBottomLeft}, BR=${r.alphaCheck.corners.cornerBottomRight}`);
    if (r.alphaCheck.issues.length > 0) {
      console.log(`    Alpha Issues:`, r.alphaCheck.issues.join('; '));
    }
  }
  if (r.anchoringCheck) {
    const bottomMargins = r.anchoringCheck.frames.map(f => f.bottomMargin);
    const bottomRows = r.anchoringCheck.frames.map(f => f.bottomRowAlphaCount);
    console.log(`    Anchoring: bottomMargins=[${bottomMargins.join(', ')}px], bottomRowActivePixels=[${bottomRows.join(', ')}]`);
    if (r.anchoringCheck.issues.length > 0) {
      console.log(`    Anchoring Issues:`, r.anchoringCheck.issues.join('; '));
    }
  }
}

// Write json dump of results for reporting
fs.writeFileSync(
  path.join(rootDir, '.agents/teamwork/challenger_asset_1/empirical_results.json'),
  JSON.stringify(results, null, 2),
  'utf8'
);
console.log('\nWrote full empirical results to .agents/teamwork/challenger_asset_1/empirical_results.json');
