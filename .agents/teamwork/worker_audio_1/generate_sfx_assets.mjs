import fs from 'fs';
import path from 'path';

const SAMPLE_RATE = 48000;
const NUM_CHANNELS = 2; // Stereo
const BITS_PER_SAMPLE = 24;

/**
 * Creates standard 44-byte RIFF WAV header for 24-bit PCM Stereo
 */
function createWavHeader(numSamples) {
  const byteRate = SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const blockAlign = NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(NUM_CHANNELS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(BITS_PER_SAMPLE, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

/**
 * Biquad Bandpass Filter implementation
 */
class BiquadBandpass {
  constructor(f0, Q, sampleRate = SAMPLE_RATE) {
    const w0 = 2 * Math.PI * f0 / sampleRate;
    const alpha = Math.sin(w0) / (2 * Q);
    this.b0 = alpha;
    this.b1 = 0;
    this.b2 = -alpha;
    this.a0 = 1 + alpha;
    this.a1 = -2 * Math.cos(w0);
    this.a2 = 1 - alpha;

    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
  }

  process(x) {
    const y = (this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2) / this.a0;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

/**
 * Encodes floating point left/right buffers into 24-bit PCM Stereo WAV Buffer
 */
function encodeWav24Bit(leftSamples, rightSamples) {
  const numSamples = leftSamples.length;
  const pcmData = Buffer.alloc(numSamples * NUM_CHANNELS * 3);
  let offset = 0;

  // Find peak to ensure no clipping
  let peak = 0;
  for (let i = 0; i < numSamples; i++) {
    const absL = Math.abs(leftSamples[i]);
    const absR = Math.abs(rightSamples[i]);
    if (absL > peak) peak = absL;
    if (absR > peak) peak = absR;
  }

  const gain = peak > 0.95 ? (0.95 / peak) : 1.0;

  for (let i = 0; i < numSamples; i++) {
    // Apply smooth fadeout on last 5ms to avoid any DC click
    const fadeoutSamples = Math.floor(SAMPLE_RATE * 0.005);
    const fadeIdx = numSamples - i;
    const fade = fadeIdx < fadeoutSamples ? (fadeIdx / fadeoutSamples) : 1.0;

    const sL = leftSamples[i] * gain * fade;
    const sR = rightSamples[i] * gain * fade;

    for (const s of [sL, sR]) {
      const clamped = Math.max(-1.0, Math.min(1.0, s));
      const intVal = Math.floor(clamped * 8388607);
      const uVal = intVal < 0 ? intVal + 16777216 : intVal;

      pcmData[offset++] = uVal & 0xff;
      pcmData[offset++] = (uVal >> 8) & 0xff;
      pcmData[offset++] = (uVal >> 16) & 0xff;
    }
  }

  const header = createWavHeader(numSamples);
  return Buffer.concat([header, pcmData]);
}

/**
 * Synthesizes Authentic Buddhist Wooden Fish (Mõ)
 */
function synthesizeMo(options) {
  const {
    startFreq = 620,
    endFreq = 380,
    sweepDuration = 0.12,
    bandpassFreq = 700,
    bandpassQ = 3.0,
    bodyFreq = 480,
    decayTau = 0.08,
    durationSec = 0.35,
    volume = 0.85
  } = options;

  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const left = new Float64Array(numSamples);
  const right = new Float64Array(numSamples);

  const filterL = new BiquadBandpass(bandpassFreq, bandpassQ);
  const filterR = new BiquadBandpass(bandpassFreq, bandpassQ);

  let phase = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    // Exponential frequency sweep
    const sweepProgress = Math.min(1.0, t / sweepDuration);
    const currentFreq = startFreq * Math.pow(endFreq / startFreq, sweepProgress);

    // Continuous phase integration for triangle wave
    phase += currentFreq / SAMPLE_RATE;
    phase = phase % 1.0;
    const tri = 2 * Math.abs(2 * phase - 1) - 1;

    // Mallet contact click transient (first 2.5ms)
    const click = (t < 0.0025) ? (1.0 - t / 0.0025) * 0.40 * (Math.sin(2 * Math.PI * 1800 * t) + 0.3 * (Math.random() * 2 - 1)) : 0;

    // Core body excitation
    const excitation = tri * 0.75 + click;

    // Filter through hollow cavity bandpass
    const filteredL = filterL.process(excitation);
    const filteredR = filterR.process(excitation);

    // Wooden body low cavity resonance
    const bodyResonance = Math.sin(2 * Math.PI * bodyFreq * t) * Math.exp(-t / 0.05) * 0.35;

    // Primary decay envelope
    const env = Math.exp(-t / decayTau);

    // Combine
    const sampleMono = (filteredL * 1.8 + bodyResonance) * env * volume;

    // Slight stereo room ambiance
    left[i] = sampleMono;
    right[i] = sampleMono * 0.98 + (i > 320 ? left[i - 320] * 0.12 : 0); // ~6.6ms room reflection
  }

  return encodeWav24Bit(left, right);
}

/**
 * Synthesizes Singing Bowl (Chuông bát gia trì)
 */
function synthesizeSingingBowl(options = {}) {
  const durationSec = options.durationSec || 4.5;
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const left = new Float64Array(numSamples);
  const right = new Float64Array(numSamples);

  // Pure Solfeggio / Mi meditative frequencies and overtones
  const partials = [
    { freq: 528.0, amp: 0.55, tau: 4.2, pan: -0.15 }, // Fundamental
    { freq: 528.6, amp: 0.32, tau: 4.0, pan: +0.15 }, // Acoustic flutter (0.6Hz beating)
    { freq: 1420.0, amp: 0.22, tau: 2.8, pan: -0.20 }, // 2nd mode
    { freq: 1421.2, amp: 0.10, tau: 2.6, pan: +0.20 }, // 2nd flutter
    { freq: 2680.0, amp: 0.12, tau: 1.6, pan: +0.05 }, // Shimmer
    { freq: 4210.0, amp: 0.05, tau: 0.9, pan: -0.05 }, // Silver bell rim
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    // Attack envelope: fast smooth rise (8ms)
    const attack = Math.min(1.0, t / 0.008);

    // Mallet soft felt tap at t=0
    const malletTap = (t < 0.012) ? Math.sin(2 * Math.PI * 180 * t) * (1.0 - t / 0.012) * 0.25 : 0;

    let sL = malletTap;
    let sR = malletTap;

    for (const p of partials) {
      const env = Math.exp(-t / p.tau) * attack;
      const wave = Math.sin(2 * Math.PI * p.freq * t) * p.amp * env;

      // Pan calculation
      const leftGain = 0.5 * (1 - p.pan);
      const rightGain = 0.5 * (1 + p.pan);

      sL += wave * leftGain;
      sR += wave * rightGain;
    }

    // Gentle temple hall reverb delay (18ms)
    const delaySamples = Math.floor(SAMPLE_RATE * 0.018);
    if (i > delaySamples) {
      sL += right[i - delaySamples] * 0.15;
      sR += left[i - delaySamples] * 0.15;
    }

    left[i] = sL * 0.90;
    right[i] = sR * 0.90;
  }

  return encodeWav24Bit(left, right);
}

/**
 * Synthesizes Great Temple Bell (Đại hồng chung)
 */
function synthesizeGreatTempleBell(options = {}) {
  const durationSec = options.durationSec || 11.2;
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const left = new Float64Array(numSamples);
  const right = new Float64Array(numSamples);

  // Massive bronze bell modal partials
  const partials = [
    { freq: 216.0, amp: 0.45, tau: 11.0, pan: -0.10 }, // Hum tone (A3)
    { freq: 216.7, amp: 0.28, tau: 10.2, pan: +0.10 }, // Hum flutter (0.7Hz slow sacred throb)
    { freq: 108.0, amp: 0.20, tau: 6.5, pan: 0.00 },   // Sub-octave chest resonance
    { freq: 432.0, amp: 0.35, tau: 7.8, pan: -0.15 },  // Prime tone
    { freq: 433.1, amp: 0.15, tau: 7.0, pan: +0.15 },  // Prime flutter
    { freq: 1296.0, amp: 0.20, tau: 5.6, pan: +0.20 }, // Quint tone
    { freq: 2160.0, amp: 0.15, tau: 2.8, pan: -0.20 }, // Nominal tone
    { freq: 3240.0, amp: 0.08, tau: 1.8, pan: +0.10 }, // High bronze sparkle
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    // Fast smooth attack ramp (10ms)
    const attack = Math.min(1.0, t / 0.010);

    // Heavy wooden beam strike thump (first 40ms)
    const woodThump = (t < 0.040) ? Math.sin(2 * Math.PI * 65 * t) * Math.exp(-t / 0.015) * 0.40 : 0;

    let sL = woodThump;
    let sR = woodThump;

    for (const p of partials) {
      const env = Math.exp(-t / p.tau) * attack;
      const wave = Math.sin(2 * Math.PI * p.freq * t) * p.amp * env;

      const leftGain = 0.5 * (1 - p.pan);
      const rightGain = 0.5 * (1 + p.pan);

      sL += wave * leftGain;
      sR += wave * rightGain;
    }

    // Sacred hall reverberant reflection (35ms and 65ms)
    const d1 = Math.floor(SAMPLE_RATE * 0.035);
    const d2 = Math.floor(SAMPLE_RATE * 0.065);
    if (i > d1) {
      sL += right[i - d1] * 0.18;
      sR += left[i - d1] * 0.18;
    }
    if (i > d2) {
      sL += left[i - d2] * 0.10;
      sR += right[i - d2] * 0.10;
    }

    left[i] = sL * 0.95;
    right[i] = sR * 0.95;
  }

  return encodeWav24Bit(left, right);
}

/**
 * Synthesizes Auspicious Gift Blessing Chime (Chuông khánh cát tường - Tier 1)
 */
function synthesizeGiftTier1(options = {}) {
  const durationSec = options.durationSec || 1.8;
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const left = new Float64Array(numSamples);
  const right = new Float64Array(numSamples);

  // Ascending 4-tone celestial wind chime: C6, E6, G6, C7
  const notes = [
    { freq: 1046.50, tStart: 0.00, amp: 0.55, tau: 1.5, pan: -0.35 },
    { freq: 1318.51, tStart: 0.07, amp: 0.60, tau: 1.4, pan: -0.12 },
    { freq: 1567.98, tStart: 0.14, amp: 0.65, tau: 1.3, pan: +0.12 },
    { freq: 2093.00, tStart: 0.21, amp: 0.70, tau: 1.4, pan: +0.35 },
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    let sL = 0;
    let sR = 0;

    for (const n of notes) {
      if (t >= n.tStart) {
        const dt = t - n.tStart;
        const attack = Math.min(1.0, dt / 0.004);
        const env = Math.exp(-dt / n.tau) * attack;

        // Fundamental + shimmer octave harmonic
        const fundamental = Math.sin(2 * Math.PI * n.freq * dt);
        const overtone = Math.sin(2 * Math.PI * (n.freq * 2.02) * dt) * 0.25;
        const wave = (fundamental + overtone) * n.amp * env;

        const leftGain = 0.5 * (1 - n.pan);
        const rightGain = 0.5 * (1 + n.pan);

        sL += wave * leftGain;
        sR += wave * rightGain;
      }
    }

    // Sparkle delay
    const d1 = Math.floor(SAMPLE_RATE * 0.022);
    if (i > d1) {
      sL += right[i - d1] * 0.14;
      sR += left[i - d1] * 0.14;
    }

    left[i] = sL * 0.80;
    right[i] = sR * 0.80;
  }

  return encodeWav24Bit(left, right);
}

/**
 * Synthesizes Grand Merit Blessing Chime (Chuông ngân diệu âm công đức viên mãn - Tier 2)
 */
function synthesizeGiftTier2(options = {}) {
  const durationSec = options.durationSec || 2.6;
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const left = new Float64Array(numSamples);
  const right = new Float64Array(numSamples);

  // Warm golden gong sustain
  const gongPartials = [
    { freq: 320.0, amp: 0.35, tau: 2.2, pan: -0.10 },
    { freq: 640.0, amp: 0.25, tau: 1.8, pan: +0.10 },
  ];

  // 7-tone celestial ascending chime harp
  const notes = [
    { freq: 698.46, tStart: 0.00, amp: 0.45, tau: 2.2, pan: -0.40 }, // F5
    { freq: 880.00, tStart: 0.08, amp: 0.50, tau: 2.2, pan: -0.25 }, // A5
    { freq: 1046.50, tStart: 0.16, amp: 0.55, tau: 2.1, pan: -0.10 }, // C6
    { freq: 1318.51, tStart: 0.24, amp: 0.60, tau: 2.0, pan: +0.10 }, // E6
    { freq: 1760.00, tStart: 0.32, amp: 0.65, tau: 1.9, pan: +0.25 }, // A6
    { freq: 2093.00, tStart: 0.40, amp: 0.70, tau: 1.9, pan: +0.40 }, // C7
    { freq: 2637.02, tStart: 0.48, amp: 0.75, tau: 1.8, pan: 0.00 },  // E7
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    let sL = 0;
    let sR = 0;

    // Foundation gong
    for (const g of gongPartials) {
      const attack = Math.min(1.0, t / 0.006);
      const wave = Math.sin(2 * Math.PI * g.freq * t) * g.amp * Math.exp(-t / g.tau) * attack;
      sL += wave * 0.5 * (1 - g.pan);
      sR += wave * 0.5 * (1 + g.pan);
    }

    // Chime notes
    for (const n of notes) {
      if (t >= n.tStart) {
        const dt = t - n.tStart;
        const attack = Math.min(1.0, dt / 0.003);
        const env = Math.exp(-dt / n.tau) * attack;

        const fundamental = Math.sin(2 * Math.PI * n.freq * dt);
        const shimmer = Math.sin(2 * Math.PI * (n.freq * 2.015) * dt) * 0.30;
        const wave = (fundamental + shimmer) * n.amp * env;

        const leftGain = 0.5 * (1 - n.pan);
        const rightGain = 0.5 * (1 + n.pan);

        sL += wave * leftGain;
        sR += wave * rightGain;
      }
    }

    // Spatial diffusion
    const d1 = Math.floor(SAMPLE_RATE * 0.025);
    const d2 = Math.floor(SAMPLE_RATE * 0.050);
    if (i > d1) {
      sL += right[i - d1] * 0.16;
      sR += left[i - d1] * 0.16;
    }
    if (i > d2) {
      sL += left[i - d2] * 0.10;
      sR += right[i - d2] * 0.10;
    }

    left[i] = sL * 0.85;
    right[i] = sR * 0.85;
  }

  return encodeWav24Bit(left, right);
}

// Ensure target output directory exists
const outDir = path.resolve('assets/audio/sfx');
fs.mkdirSync(outDir, { recursive: true });

console.log('Synthesizing 7 Buddhist Temple SFX assets into:', outDir);

// 1. mo_strike_01.wav
const mo1 = synthesizeMo({
  startFreq: 620,
  endFreq: 380,
  bandpassFreq: 700,
  bandpassQ: 3.0,
  bodyFreq: 480,
  decayTau: 0.08,
  durationSec: 0.35,
  volume: 0.85
});
fs.writeFileSync(path.join(outDir, 'mo_strike_01.wav'), mo1);
console.log('✓ mo_strike_01.wav generated:', mo1.length, 'bytes');

// 2. mo_strike_02.wav (pitch variance +12Hz)
const mo2 = synthesizeMo({
  startFreq: 632,
  endFreq: 392,
  bandpassFreq: 715,
  bandpassQ: 3.2,
  bodyFreq: 492,
  decayTau: 0.082,
  durationSec: 0.35,
  volume: 0.85
});
fs.writeFileSync(path.join(outDir, 'mo_strike_02.wav'), mo2);
console.log('✓ mo_strike_02.wav generated:', mo2.length, 'bytes');

// 3. mo_strike_03.wav (pitch variance -15Hz, fuller decay)
const mo3 = synthesizeMo({
  startFreq: 605,
  endFreq: 365,
  bandpassFreq: 685,
  bandpassQ: 2.8,
  bodyFreq: 465,
  decayTau: 0.088,
  durationSec: 0.35,
  volume: 0.85
});
fs.writeFileSync(path.join(outDir, 'mo_strike_03.wav'), mo3);
console.log('✓ mo_strike_03.wav generated:', mo3.length, 'bytes');

// 4. bell_bowl.wav (Singing bowl / chuông bát gia trì)
const bowl = synthesizeSingingBowl({ durationSec: 4.5 });
fs.writeFileSync(path.join(outDir, 'bell_bowl.wav'), bowl);
console.log('✓ bell_bowl.wav generated:', bowl.length, 'bytes');

// 5. bell_temple.wav (Great temple bell / đại hồng chung)
const temple = synthesizeGreatTempleBell({ durationSec: 11.2 });
fs.writeFileSync(path.join(outDir, 'bell_temple.wav'), temple);
console.log('✓ bell_temple.wav generated:', temple.length, 'bytes');

// 6. gift_tier1.wav (Auspicious blessing chime)
const gift1 = synthesizeGiftTier1({ durationSec: 1.8 });
fs.writeFileSync(path.join(outDir, 'gift_tier1.wav'), gift1);
console.log('✓ gift_tier1.wav generated:', gift1.length, 'bytes');

// 7. gift_tier2.wav (Grand merit blessing chime)
const gift2 = synthesizeGiftTier2({ durationSec: 2.6 });
fs.writeFileSync(path.join(outDir, 'gift_tier2.wav'), gift2);
console.log('✓ gift_tier2.wav generated:', gift2.length, 'bytes');

console.log('\nAll 7 SFX WAV files successfully created and written to assets/audio/sfx/!');
