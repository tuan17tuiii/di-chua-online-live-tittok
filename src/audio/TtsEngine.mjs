import crypto from 'crypto';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { Sanitizer } from '../moderation/Sanitizer.mjs';
import { config } from '../config.mjs';

/**
 * TtsEngine: Microsoft Edge-TTS In-Memory Streaming Engine with MD5 Audio Cache.
 * Streams audio directly in RAM as Base64 Data URIs, completely avoiding SSD wear.
 */
export class TtsEngine {
  /**
   * @param {Object} [options]
   * @param {string} [options.voice]
   * @param {string} [options.pitch]
   * @param {string} [options.rate]
   * @param {number} [options.cacheLimit=200]
   */
  constructor(options = {}) {
    this.voice = options.voice || config.tts.voice || 'vi-VN-NamMinhNeural';
    this.pitch = options.pitch || config.tts.pitch || '-18Hz';
    this.rate = options.rate || config.tts.rate || '-20%';
    this.cacheLimit = options.cacheLimit || 200;

    // MD5 In-Memory Cache: hash -> dataUri
    this.cache = new Map();
  }

  /**
   * Compute MD5 hash key for caching.
   * @param {string} text
   * @param {string} voice
   * @param {string} pitch
   * @param {string} rate
   * @returns {string} MD5 hex hash
   */
  getCacheKey(text, voice, pitch, rate) {
    return crypto
      .createHash('md5')
      .update(`${voice}_${pitch}_${rate}_${text}`)
      .digest('hex');
  }

  /**
   * Synthesize text to Base64 Data URI in RAM.
   * @param {string} text Plain text to synthesize
   * @param {Object} [customOptions]
   * @param {string} [customOptions.voice]
   * @param {string} [customOptions.pitch]
   * @param {string} [customOptions.rate]
   * @returns {Promise<string | null>} Base64 Data URI or null on failure
   */
  async synthesize(text, customOptions = {}) {
    if (!text || typeof text !== 'string') return null;

    const cleanedText = Sanitizer.cleanString(text, 250);
    if (!cleanedText) return null;

    const voice = customOptions.voice || this.voice;
    const pitch = customOptions.pitch || this.pitch;
    const rate = customOptions.rate || this.rate;

    const cacheKey = this.getCacheKey(cleanedText, voice, pitch, rate);

    // 1. Check MD5 In-Memory Cache (0ms latency on cache hit)
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

      const { audioStream } = tts.toStream(cleanedText, {
        pitch,
        rate
      });

      const buffer = await new Promise((resolve, reject) => {
        const chunks = [];
        audioStream.on('data', (chunk) => chunks.push(chunk));
        audioStream.on('end', () => {
          if (typeof tts.close === 'function') tts.close();
          resolve(Buffer.concat(chunks));
        });
        audioStream.on('error', (err) => {
          if (typeof tts.close === 'function') tts.close();
          reject(err);
        });
      });

      if (!buffer || buffer.length === 0) {
        return null;
      }

      const base64Audio = buffer.toString('base64');
      const dataUri = `data:audio/mp3;base64,${base64Audio}`;

      // Save to cache (LRU eviction if at cacheLimit)
      if (this.cache.size >= this.cacheLimit) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) this.cache.delete(firstKey);
      }
      this.cache.set(cacheKey, dataUri);

      return dataUri;
    } catch (err) {
      console.warn(`[TtsEngine] Synthesis warning: ${err.message}. Graceful fallback.`);
      return null;
    }
  }

  /**
   * Clear in-memory MD5 cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default TtsEngine;
