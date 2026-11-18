/**
 * AudioPriorityQueue: 3-Tier priority queue for TTS voice announcements with safety cap (10 items).
 * Tier 1: Emergency (gifts >= 99 coins, admin priority)
 * Tier 2: Standard (gifts 1-98 coins)
 * Tier 3: Background (periodic chanting)
 */
export class AudioPriorityQueue {
  /**
   * @param {Object} options
   * @param {import('./TtsEngine.mjs').TtsEngine} options.ttsEngine
   * @param {Function} options.onPlay Callback when audio payload is ready to broadcast
   * @param {number} [options.maxQueueSize=10]
   */
  constructor(options = {}) {
    this.ttsEngine = options.ttsEngine;
    this.onPlay = options.onPlay || (() => {});
    this.maxQueueSize = options.maxQueueSize || 10;

    this.queue = [];
    this.isProcessing = false;
    this.currentTimeout = null;
  }

  /**
   * Enqueue a new TTS request.
   * @param {Object} item
   * @param {string} item.text Text to synthesize
   * @param {number} [item.priority=2] 1 (Highest), 2 (Standard), 3 (Periodic/Lowest)
   * @param {string} [item.tag='gift'] 'gift' | 'say' | 'chant'
   * @param {string} [item.id] User ID if related to a viewer
   * @param {Object} [item.options] Voice options: { voice, pitch, rate }
   */
  enqueue(item) {
    if (!item || !item.text) return;

    const priority = Number(item.priority) || 2;
    const queueItem = {
      text: item.text,
      priority,
      tag: item.tag || 'gift',
      id: item.id || '',
      options: item.options || {},
      enqueuedAt: Date.now()
    };

    // If Tier 3 and queue is at max capacity, drop Tier 3 to prevent clashing
    if (priority === 3 && this.queue.length >= this.maxQueueSize) {
      return;
    }

    if (priority === 1) {
      // Find insertion index before any Tier 2/3 items, but after existing Tier 1
      const tier1Count = this.queue.findIndex((i) => i.priority > 1);
      if (tier1Count === -1) {
        this.queue.push(queueItem);
      } else {
        this.queue.splice(tier1Count, 0, queueItem);
      }
    } else if (priority === 2) {
      // Find insertion index before any Tier 3 items
      const tier3Index = this.queue.findIndex((i) => i.priority === 3);
      if (tier3Index === -1) {
        this.queue.push(queueItem);
      } else {
        this.queue.splice(tier3Index, 0, queueItem);
      }
    } else {
      this.queue.push(queueItem);
    }

    // Enforce safety cap of maxQueueSize (drop oldest low-priority items)
    while (this.queue.length > this.maxQueueSize) {
      const dropIndex = this.queue.findLastIndex ? this.queue.findLastIndex((i) => i.priority >= 2) : -1;
      if (dropIndex !== -1) {
        this.queue.splice(dropIndex, 1);
      } else {
        this.queue.pop();
      }
    }

    // Trigger process loop if idle
    if (!this.isProcessing) {
      this._processNext();
    }
  }

  /**
   * Internal worker loop
   * @private
   */
  async _processNext() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const item = this.queue.shift();

    try {
      let dataUri = null;
      if (this.ttsEngine && typeof this.ttsEngine.synthesize === 'function') {
        dataUri = await this.ttsEngine.synthesize(item.text, item.options);
      }

      if (dataUri) {
        this.onPlay({
          t: 'tts',
          dataUri,
          text: item.text,
          tag: item.tag,
          priority: item.priority,
          id: item.id
        });

        // Estimate playback duration: roughly 120ms per character, minimum 3000ms
        const durationMs = Math.max(3000, item.text.length * 120);
        this.currentTimeout = setTimeout(() => {
          this._processNext();
        }, durationMs);
      } else {
        // Synthesis failed or returned null (e.g. offline fallback); proceed immediately
        this._processNext();
      }
    } catch (err) {
      console.warn(`[AudioPriorityQueue] Process error: ${err.message}`);
      this._processNext();
    }
  }

  /**
   * Get queue length
   * @returns {number}
   */
  size() {
    return this.queue.length;
  }

  /**
   * Clear all pending requests and abort current timer
   */
  clear() {
    this.queue = [];
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    this.isProcessing = false;
  }
}

export default AudioPriorityQueue;
