// Test 48kHz 24-bit WAV synthesis in Node.js
import fs from 'fs';
import path from 'path';

function createWavHeader({ sampleRate = 48000, numChannels = 2, bitsPerSample = 24, numSamples = 0 }) {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

const sampleRate = 48000;
const durationSec = 0.35; // Mõ duration
const numSamples = Math.floor(sampleRate * durationSec);
const numChannels = 2;
const bitsPerSample = 24;

const pcmData = Buffer.alloc(numSamples * numChannels * 3);
let offset = 0;

for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  // Sweep frequency: 620Hz down to 380Hz
  const freq = 620 * Math.pow(380 / 620, Math.min(1.0, t / 0.12));
  // Triangle wave + exponential decay
  const phase = (t * freq) % 1.0;
  const tri = 2 * Math.abs(2 * phase - 1) - 1;
  const decay = Math.exp(-t / 0.08);
  const sample = tri * decay * 0.85;

  const intSample = Math.max(-8388607, Math.min(8388607, Math.floor(sample * 8388607)));
  const uVal = intSample < 0 ? intSample + 16777216 : intSample;

  const b0 = uVal & 0xff;
  const b1 = (uVal >> 8) & 0xff;
  const b2 = (uVal >> 16) & 0xff;

  // Left
  pcmData[offset++] = b0;
  pcmData[offset++] = b1;
  pcmData[offset++] = b2;
  // Right
  pcmData[offset++] = b0;
  pcmData[offset++] = b1;
  pcmData[offset++] = b2;
}

const header = createWavHeader({ sampleRate, numChannels, bitsPerSample, numSamples });
const fullWav = Buffer.concat([header, pcmData]);

const outPath = path.join(process.cwd(), '.agents/teamwork/teamwork_explorer_survey_3/test_mo.wav');
fs.writeFileSync(outPath, fullWav);
console.log('Successfully generated test WAV:', outPath, 'Bytes:', fullWav.length);
