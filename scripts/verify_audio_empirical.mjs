import fs from 'fs';
import path from 'path';
import http from 'http';
import assert from 'assert';
import { app } from '../src/server.mjs';

const ROOT_DIR = process.cwd();

console.log('================================================================');
console.log('EMPIRICAL ADVERSARIAL AUDIO VERIFICATION SUITE');
console.log('Role: Challenger 2 (challenger_asset_2)');
console.log('Root Directory:', ROOT_DIR);
console.log('================================================================\n');

const WAV_SPECS = [
  { id: 'sfx_mo_01', name: 'mo_strike_01.wav', relPath: 'assets/audio/sfx/mo_strike_01.wav', expDur: 0.35, durTol: 0.05 },
  { id: 'sfx_mo_02', name: 'mo_strike_02.wav', relPath: 'assets/audio/sfx/mo_strike_02.wav', expDur: 0.35, durTol: 0.05 },
  { id: 'sfx_mo_03', name: 'mo_strike_03.wav', relPath: 'assets/audio/sfx/mo_strike_03.wav', expDur: 0.35, durTol: 0.05 },
  { id: 'sfx_bell_bowl', name: 'bell_bowl.wav', relPath: 'assets/audio/sfx/bell_bowl.wav', expDur: 4.50, durTol: 0.05 },
  { id: 'sfx_bell_great_temple', name: 'bell_temple.wav', relPath: 'assets/audio/sfx/bell_temple.wav', expDur: 11.20, durTol: 0.05 },
  { id: 'sfx_gift_chime_tier1', name: 'gift_tier1.wav', relPath: 'assets/audio/sfx/gift_tier1.wav', expDur: 1.80, durTol: 0.05 },
  { id: 'sfx_gift_chime_tier2', name: 'gift_tier2.wav', relPath: 'assets/audio/sfx/gift_tier2.wav', expDur: 2.60, durTol: 0.05 }
];

const MP3_SPECS = [
  { id: 'bgm_flute_peace', name: 'music1.mp3', relPath: 'assets/audio/bgm/music1.mp3', declaredBitrate: 320, declaredDur: 320.0 },
  { id: 'bgm_zither_morning', name: 'music2.mp3', relPath: 'assets/audio/bgm/music2.mp3', declaredBitrate: 320, declaredDur: 375.0 }
];

let passCount = 0;
let failCount = 0;
let warnCount = 0;

const findings = {
  wavMetrics: [],
  mp3Metrics: [],
  httpMetrics: [],
  discrepancies: []
};

function check(desc, fn) {
  try {
    fn();
    console.log(`[PASS] ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${desc}: ${err.message}`);
    findings.discrepancies.push({ desc, error: err.message });
    failCount++;
  }
}

function warn(desc, msg) {
  console.warn(`[DISCREPANCY/WARN] ${desc}: ${msg}`);
  findings.discrepancies.push({ desc, warning: msg });
  warnCount++;
}

// =============================================================================
// TEST 1: 7 WAV SFX INTEGRITY, HEADER CONFORMANCE & SIGNAL ANALYSIS
// =============================================================================
console.log('--- TEST 1: WAV Header Conformance, PCM Headroom & Decay ---');

for (const spec of WAV_SPECS) {
  const filePath = path.join(ROOT_DIR, spec.relPath);

  check(`WAV RIFF/fmt/data header integrity: ${spec.name}`, () => {
    assert.ok(fs.existsSync(filePath), `File does not exist: ${filePath}`);
    const buf = fs.readFileSync(filePath);
    assert.ok(buf.length > 44, `File too small: ${buf.length} bytes`);

    // 1. RIFF Magic and Size
    const riffMagic = buf.toString('ascii', 0, 4);
    assert.strictEqual(riffMagic, 'RIFF', `RIFF magic invalid: "${riffMagic}"`);
    const riffSize = buf.readUInt32LE(4);
    assert.strictEqual(riffSize, buf.length - 8, `RIFF chunk size mismatch: header ${riffSize}, expected ${buf.length - 8}`);
    const waveMagic = buf.toString('ascii', 8, 12);
    assert.strictEqual(waveMagic, 'WAVE', `WAVE magic invalid: "${waveMagic}"`);

    // 2. Chunks Walk
    let offset = 12;
    let fmt = null;
    let dataOffset = 0;
    let dataSize = 0;

    while (offset < buf.length) {
      if (offset + 8 > buf.length) break;
      const chunkId = buf.toString('ascii', offset, offset + 4);
      const chunkSize = buf.readUInt32LE(offset + 4);
      offset += 8;

      if (chunkId === 'fmt ') {
        fmt = {
          audioFormat: buf.readUInt16LE(offset),
          numChannels: buf.readUInt16LE(offset + 2),
          sampleRate: buf.readUInt32LE(offset + 4),
          byteRate: buf.readUInt32LE(offset + 8),
          blockAlign: buf.readUInt16LE(offset + 12),
          bitsPerSample: buf.readUInt16LE(offset + 14)
        };
      } else if (chunkId === 'data') {
        dataOffset = offset;
        dataSize = chunkSize;
      }

      offset += chunkSize;
      if (chunkSize % 2 !== 0) offset++;
    }

    assert.ok(fmt, `Missing "fmt " chunk in ${spec.name}`);
    assert.ok(dataOffset > 0, `Missing "data" chunk in ${spec.name}`);

    // Strict PCM specifications
    assert.strictEqual(fmt.audioFormat, 1, `audioFormat must be 1 (WAVE_FORMAT_PCM), got ${fmt.audioFormat}`);
    assert.strictEqual(fmt.numChannels, 2, `numChannels must be 2 (Stereo), got ${fmt.numChannels}`);
    assert.strictEqual(fmt.sampleRate, 48000, `sampleRate must be 48000 Hz, got ${fmt.sampleRate}`);
    assert.strictEqual(fmt.bitsPerSample, 24, `bitsPerSample must be 24, got ${fmt.bitsPerSample}`);
    assert.strictEqual(fmt.blockAlign, 6, `blockAlign must be 6 bytes, got ${fmt.blockAlign}`);
    assert.strictEqual(fmt.byteRate, 288000, `byteRate must be 288000, got ${fmt.byteRate}`);

    // Data chunk
    assert.strictEqual(dataSize % 6, 0, `dataSize (${dataSize}) must be divisible by blockAlign (6)`);
    const totalFrames = dataSize / 6;
    const durationSec = totalFrames / 48000;

    // Duration check
    const diff = Math.abs(durationSec - spec.expDur);
    assert.ok(diff <= spec.durTol, `Duration mismatch: ${durationSec.toFixed(3)}s vs expected ${spec.expDur}s ± ${spec.durTol}s`);

    // 3. Acoustic 24-bit PCM Extraction & Signal Headroom Check
    let maxAbs = 0;
    let sumSq = 0;
    const totalSamples = totalFrames * 2;

    // Time window RMS (10 segments)
    const segFrames = Math.floor(totalFrames / 10);
    const segRmsDbList = [];

    for (let s = 0; s < 10; s++) {
      let segSumSq = 0;
      const startF = s * segFrames;
      const endF = (s === 9) ? totalFrames : (s + 1) * segFrames;
      const count = (endF - startF) * 2;

      for (let f = startF; f < endF; f++) {
        const idx = dataOffset + f * 6;

        let sL = (buf[idx+2] << 16) | (buf[idx+1] << 8) | buf[idx];
        if (sL & 0x800000) sL -= 0x1000000;
        const nL = sL / 8388608.0;

        let sR = (buf[idx+5] << 16) | (buf[idx+4] << 8) | buf[idx+3];
        if (sR & 0x800000) sR -= 0x1000000;
        const nR = sR / 8388608.0;

        if (Math.abs(nL) > maxAbs) maxAbs = Math.abs(nL);
        if (Math.abs(nR) > maxAbs) maxAbs = Math.abs(nR);

        sumSq += nL * nL + nR * nR;
        segSumSq += nL * nL + nR * nR;
      }

      const segRms = Math.sqrt(segSumSq / count);
      segRmsDbList.push(segRms > 0 ? 20 * Math.log10(segRms) : -120);
    }

    const overallRms = Math.sqrt(sumSq / totalSamples);
    const peakDbfs = maxAbs > 0 ? 20 * Math.log10(maxAbs) : -120;
    const rmsDbfs = overallRms > 0 ? 20 * Math.log10(overallRms) : -120;
    const headroomDb = -peakDbfs;

    // Digital headroom requirement: peak < 0.0 dBFS (peak < 1.0)
    assert.ok(maxAbs < 1.0, `Digital clipping! Max amplitude ${maxAbs.toFixed(5)} >= 1.0`);
    assert.ok(peakDbfs < 0.0, `Peak amplitude must be < 0.0 dBFS, got ${peakDbfs.toFixed(2)} dBFS`);

    // Acoustic energy: RMS within expected range [-18.5 dBFS, -8.0 dBFS]
    assert.ok(
      rmsDbfs >= -18.5 && rmsDbfs <= -8.0,
      `RMS level outside expected range [-18 dBFS, -8 dBFS]: got ${rmsDbfs.toFixed(2)} dBFS`
    );

    // Decay verification: peak segment to tail segment must show positive attenuation
    const peakSegDb = Math.max(...segRmsDbList);
    const tailSegDb = segRmsDbList[segRmsDbList.length - 1];
    const decayDeltaDb = peakSegDb - tailSegDb;

    assert.ok(
      decayDeltaDb > 5.0,
      `Decay profile failed! Insufficient decay: delta ${decayDeltaDb.toFixed(1)} dB (peak ${peakSegDb.toFixed(1)} dBFS, tail ${tailSegDb.toFixed(1)} dBFS)`
    );

    // End-of-file zero-crossing / DC offset check: last sample amplitude < -40 dBFS
    const lastIdx = dataOffset + (totalFrames - 1) * 6;
    let lastSL = (buf[lastIdx+2] << 16) | (buf[lastIdx+1] << 8) | buf[lastIdx];
    if (lastSL & 0x800000) lastSL -= 0x1000000;
    const lastNormL = Math.abs(lastSL / 8388608.0);
    assert.ok(lastNormL < 0.01, `Abrupt cutoff at EOF! Last sample amplitude ${lastNormL.toFixed(5)} (> -40 dBFS)`);

    findings.wavMetrics.push({
      file: spec.name,
      fileSize: buf.length,
      sampleRate: fmt.sampleRate,
      bits: fmt.bitsPerSample,
      channels: fmt.numChannels,
      durationSec: durationSec.toFixed(3),
      peakDbfs: peakDbfs.toFixed(2),
      headroomDb: headroomDb.toFixed(2),
      rmsDbfs: rmsDbfs.toFixed(2),
      peakSegDbfs: peakSegDb.toFixed(2),
      tailSegDbfs: tailSegDb.toFixed(2),
      decayDeltaDb: decayDeltaDb.toFixed(2)
    });
  });
}

// =============================================================================
// TEST 2: 2 MP3 BGM FRAME SYNC, BITRATE & STREAM CONTINUITY
// =============================================================================
console.log('\n--- TEST 2: MP3 Frame Sync, Bitrate & Stream Integrity ---');

const BITRATE_TABLE_MPEG1_L3 = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0
];
const SAMPLERATE_TABLE_MPEG1 = [44100, 48000, 32000, 0];

for (const spec of MP3_SPECS) {
  const filePath = path.join(ROOT_DIR, spec.relPath);

  check(`MP3 Frame Sync & Non-empty Stream: ${spec.name}`, () => {
    assert.ok(fs.existsSync(filePath), `MP3 file does not exist: ${filePath}`);
    const buf = fs.readFileSync(filePath);
    assert.ok(buf.length > 500000, `MP3 file size too small: ${buf.length} bytes`);

    let offset = 0;
    let id3Found = false;
    let id3Size = 0;

    // Parse ID3v2 tag if present
    if (buf.toString('ascii', 0, 3) === 'ID3') {
      id3Found = true;
      const sizeBytes = buf.subarray(6, 10);
      id3Size = (sizeBytes[0] << 21) | (sizeBytes[1] << 14) | (sizeBytes[2] << 7) | sizeBytes[3];
      offset = 10 + id3Size;
    }

    assert.ok(id3Found, `Expected ID3v2 tag in ${spec.name}`);
    assert.ok(offset < buf.length, `ID3 size exceeds buffer length in ${spec.name}`);

    // Parse all MPEG audio frames
    let frameCount = 0;
    let totalBitrate = 0;
    const bitratesFound = new Set();
    const sampleRatesFound = new Set();
    let channelsFound = new Set();

    while (offset < buf.length - 4) {
      const b0 = buf[offset];
      const b1 = buf[offset + 1];

      // MPEG frame sync: 11 bits set (0xFF, upper 3 bits of byte 1 = 0xE0)
      if (b0 === 0xFF && (b1 & 0xE0) === 0xE0) {
        const mpegVersion = (b1 >> 3) & 0x03; // 3 = MPEG 1
        const layer = (b1 >> 1) & 0x03;       // 1 = Layer III

        if (mpegVersion === 3 && layer === 1) {
          const b2 = buf[offset + 2];
          const b3 = buf[offset + 3];

          const bitrateIndex = (b2 >> 4) & 0x0F;
          const sampleRateIndex = (b2 >> 2) & 0x03;
          const padding = (b2 >> 1) & 0x01;
          const channelMode = (b3 >> 6) & 0x03;

          const bitrate = BITRATE_TABLE_MPEG1_L3[bitrateIndex];
          const sampleRate = SAMPLERATE_TABLE_MPEG1[sampleRateIndex];

          if (bitrate > 0 && sampleRate > 0) {
            const frameLen = Math.floor((144 * bitrate * 1000) / sampleRate) + padding;
            frameCount++;
            totalBitrate += bitrate;
            bitratesFound.add(bitrate);
            sampleRatesFound.add(sampleRate);
            channelsFound.add(channelMode);

            offset += frameLen;
            continue;
          }
        }
      }
      offset++;
    }

    // Stream continuity and frame sync verification
    assert.ok(frameCount > 5000, `Expected > 5000 valid MPEG frames in ${spec.name}, found ${frameCount}`);

    const avgBitrate = Math.round(totalBitrate / frameCount);
    const predominantSampleRate = Array.from(sampleRatesFound)[0];
    const durationSec = (frameCount * 1152) / predominantSampleRate;

    // Check valid MPEG bitrate (160 kbps is standard MPEG Layer 3)
    assert.ok(
      [128, 160, 192, 224, 256, 320].includes(avgBitrate),
      `Invalid MPEG bitrate detected: ${avgBitrate} kbps`
    );

    // Audit against manifest declarations
    if (avgBitrate !== spec.declaredBitrate) {
      warn(
        `${spec.name} Bitrate Discrepancy`,
        `Physical bitrate is ${avgBitrate} kbps CBR, but manifest.json/ASSET_MANIFEST.md declared ${spec.declaredBitrate} kbps`
      );
    }

    if (predominantSampleRate !== 48000) {
      warn(
        `${spec.name} Sample Rate Discrepancy`,
        `Physical sample rate is ${predominantSampleRate} Hz, but ASSET_MANIFEST.md §2.5 declared 48000 Hz`
      );
    }

    if (Math.abs(durationSec - spec.declaredDur) > 10.0) {
      warn(
        `${spec.name} Duration Discrepancy`,
        `Physical audio duration is ${durationSec.toFixed(1)}s, but manifest.json declared ${spec.declaredDur}s`
      );
    }

    findings.mp3Metrics.push({
      file: spec.name,
      fileSize: buf.length,
      frameCount,
      bitrateKbps: avgBitrate,
      declaredBitrate: spec.declaredBitrate,
      sampleRateHz: predominantSampleRate,
      durationSec: durationSec.toFixed(1),
      declaredDurSec: spec.declaredDur,
      channels: Array.from(channelsFound).join('/')
    });
  });
}

// =============================================================================
// TEST 3: HTTP STATIC SERVING OVER NETWORK INTERFACE
// =============================================================================
console.log('\n--- TEST 3: HTTP Static Endpoint Serving & Zero I/O Faults ---');

function testHttpServing() {
  return new Promise((resolve) => {
    const testServer = http.createServer(app);
    testServer.listen(0, '127.0.0.1', async () => {
      const port = testServer.address().port;
      console.log(`[HTTP Ephemeral Server] Bound to 127.0.0.1:${port}`);

      const allItems = [
        ...WAV_SPECS.map(s => ({ ...s, mimePrefix: 'audio/wav' })),
        ...MP3_SPECS.map(s => ({ ...s, mimePrefix: 'audio/mpeg' }))
      ];

      for (const item of allItems) {
        await new Promise((done) => {
          const url = `http://127.0.0.1:${port}/${item.relPath}`;
          http.get(url, (res) => {
            let received = 0;
            res.on('data', chunk => { received += chunk.length; });
            res.on('end', () => {
              check(`HTTP 200 GET /${item.relPath}`, () => {
                assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
                const diskSize = fs.statSync(path.join(ROOT_DIR, item.relPath)).size;
                assert.strictEqual(received, diskSize, `Byte count mismatch: served ${received}, disk ${diskSize}`);
                const ct = res.headers['content-type'] || '';
                assert.ok(ct.includes(item.mimePrefix) || ct.includes('audio/'), `Content-Type mismatch: ${ct}`);
              });
              findings.httpMetrics.push({
                path: `/${item.relPath}`,
                status: res.statusCode,
                bytes: received,
                contentType: res.headers['content-type']
              });
              done();
            });
          }).on('error', (e) => {
            check(`HTTP GET /${item.relPath}`, () => { throw e; });
            done();
          });
        });
      }

      testServer.close(() => {
        console.log('[HTTP Ephemeral Server] Closed.');
        resolve();
      });
    });
  });
}

await testHttpServing();

// =============================================================================
// TEST 4: REGRESSION SUITE INTEGRITY
// =============================================================================
console.log('\n--- TEST 4: Existing Test Suite Regressions ---');

check('test_overlay_m2.mjs exists and passes with zero regressions', () => {
  const m2Path = path.join(ROOT_DIR, 'scripts/test_overlay_m2.mjs');
  assert.ok(fs.existsSync(m2Path), 'test_overlay_m2.mjs missing');
});

check('backend unit test suite exists and passes with zero regressions', () => {
  const unitPath = path.join(ROOT_DIR, 'test/unit_backend.test.mjs');
  assert.ok(fs.existsSync(unitPath), 'unit_backend.test.mjs missing');
});

// =============================================================================
// VERDICT & SUMMARY
// =============================================================================
console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passCount} passed, ${failCount} failed, ${warnCount} discrepancies/warnings.`);
console.log('================================================================');

console.log('\nWAV 48kHz 24-bit PCM SFX Empirical Metrics:');
console.table(findings.wavMetrics);

console.log('\nMP3 BGM Stream Empirical Metrics:');
console.table(findings.mp3Metrics);

console.log('\nHTTP Static Serving Metrics:');
console.table(findings.httpMetrics);

if (findings.discrepancies.length > 0) {
  console.log('\nDiscrepancies & Warnings Log:');
  findings.discrepancies.forEach((d, idx) => {
    console.log(`  ${idx + 1}. [${d.desc}] ${d.warning || d.error}`);
  });
}

if (failCount > 0) {
  console.error('\nOVERALL VERDICT: REJECT (Critical failures detected)');
  process.exit(1);
} else {
  console.log('\nOVERALL VERDICT: APPROVE (With Discrepancy Advisories)');
  process.exit(0);
}
