/**
 * AudioPriorityQueue: 3-Tier priority queue for TTS voice announcements with safety cap,
 * Live Manager controls (pause, resume, skip, clear, panic mute), and recent history for replay.
 * Tier 1: Emergency (high-tier gifts, admin priority)
 * Tier 2: Standard (medium/small gifts, keyword rules)
 * Tier 3: Background (periodic chanting, welcome/follow)
 */
export class AudioPriorityQueue {
  /**
   * @param {Object} options
   * @param {import('./TtsEngine.mjs').TtsEngine} options.ttsEngine
   * @param {Function} options.onPlay Callback when audio payload is ready to broadcast
   * @param {Function} [options.onStop] Callback when audio playback should immediately stop on overlay
   * @param {Function} [options.onStateChange] Callback when queue state changes (for Live Manager UI)
   * @param {number} [options.maxQueueSize=10]
   */
  constructor(options = {}) {
    this.ttsEngine = options.ttsEngine;
    this.onPlay = options.onPlay || (() => {});
    this.onStop = options.onStop || (() => {});
    this.onStateChange = options.onStateChange || (() => {});
    this.maxQueueSize = options.maxQueueSize || 10;

    this.queue = [];
    this.currentItem = null;
    this.recentHistory = []; // Max 25 spoken items for 1-click Replay in Live Manager
    this.isProcessing = false;
    this.paused = false;
    this.muted = false;
    this.currentTimeout = null;
  }

  /**
   * Update max queue size dynamically
   * @param {number} size
   */
  setMaxQueueSize(size) {
    this.maxQueueSize = Math.max(3, Math.min(50, Number(size) || 10));
  }

  _emitState() {
    this.onStateChange(this.getStatus());
  }

  /**
   * Enqueue a new TTS request.
   * @param {Object} item
   * @param {string} item.text Text to synthesize
   * @param {number} [item.priority=2] 1 (Highest), 2 (Standard), 3 (Periodic/Lowest)
   * @param {string} [item.tag='gift'] 'gift' | 'say' | 'chant' | 'milestone' | 'keyword'
   * @param {string} [item.id] User ID if related to a viewer
   * @param {Object} [item.options] Voice options: { voice, pitch, rate }
   */
  enqueue(item) {
    if (!item || !item.text || this.muted) return;

    const priority = Number(item.priority) || 2;
    const queueItem = {
      itemId: `tts_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
      const tier1Count = this.queue.findIndex((i) => i.priority > 1);
      if (tier1Count === -1) {
        this.queue.push(queueItem);
      } else {
        this.queue.splice(tier1Count, 0, queueItem);
      }
    } else if (priority === 2) {
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

    this._emitState();

    // Trigger process loop if idle and not paused
    if (!this.isProcessing && !this.paused) {
      this._processNext();
    }
  }

  /**
   * Pause queue processing (finishes current item or holds next items)
   */
  pause() {
    this.paused = true;
    this._emitState();
  }

  /**
   * Resume queue processing
   */
  resume() {
    this.paused = false;
    this._emitState();
    if (!this.isProcessing && this.queue.length > 0) {
      this._processNext();
    }
  }

  /**
   * Skip currently speaking item and proceed immediately to next
   */
  skipCurrent() {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    this.currentItem = null;
    this.isProcessing = false;
    this.onStop({ t: 'tts_stop', reason: 'skip' });
    this._emitState();
    if (!this.paused && this.queue.length > 0) {
      this._processNext();
    }
  }

  /**
   * Panic mute toggle: stops current TTS, clears pending queue if muting
   * @param {boolean} muted
   */
  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.muted) {
      this.queue = [];
      if (this.currentTimeout) {
        clearTimeout(this.currentTimeout);
        this.currentTimeout = null;
      }
      this.currentItem = null;
      this.isProcessing = false;
      this.onStop({ t: 'tts_stop', reason: 'panic_mute', muted: true });
    } else {
      this.onStop({ t: 'tts_stop', reason: 'unmute', muted: false });
    }
    this._emitState();
  }

  /**
   * Replay a previously spoken item by itemId or raw text
   * @param {string} itemIdOrText
   */
  replay(itemIdOrText) {
    if (!itemIdOrText) return false;
    const found = this.recentHistory.find((h) => h.itemId === itemIdOrText);
    if (found) {
      this.enqueue({
        text: found.text,
        priority: 1,
        tag: found.tag || 'gift',
        id: found.id,
        options: found.options
      });
      return true;
    }
    this.enqueue({
      text: String(itemIdOrText),
      priority: 1,
      tag: 'replay'
    });
    return true;
  }

  /**
   * Internal worker loop
   * @private
   */
  async _processNext() {
    if (this.paused || this.muted || this.queue.length === 0) {
      this.isProcessing = false;
      this.currentItem = null;
      this._emitState();
      return;
    }

    this.isProcessing = true;
    const item = this.queue.shift();
    this.currentItem = item;
    this._emitState();

    try {
      let dataUri = null;
      if (this.ttsEngine && typeof this.ttsEngine.synthesize === 'function') {
        dataUri = await this.ttsEngine.synthesize(item.text, item.options);
      }

      if (this.muted) {
        this.isProcessing = false;
        this.currentItem = null;
        this._emitState();
        return;
      }

      // Record in history for replay
      this.recentHistory.unshift({
        itemId: item.itemId,
        text: item.text,
        tag: item.tag,
        id: item.id,
        options: item.options,
        playedAt: Date.now()
      });
      if (this.recentHistory.length > 25) {
        this.recentHistory.pop();
      }

      if (dataUri) {
        this.onPlay({
          t: 'tts',
          itemId: item.itemId,
          dataUri,
          text: item.text,
          tag: item.tag,
          priority: item.priority,
          id: item.id
        });

        // Estimate playback duration: roughly 120ms per character, minimum 3000ms
        const durationMs = Math.max(3000, item.text.length * 120);
        this.currentTimeout = setTimeout(() => {
          this.currentItem = null;
          this._processNext();
        }, durationMs);
      } else {
        this.currentItem = null;
        this._processNext();
      }
    } catch (err) {
      console.warn(`[AudioPriorityQueue] Process error: ${err.message}`);
      this.currentItem = null;
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
   * Get full status snapshot for Live Manager UI
   */
  getStatus() {
    return {
      paused: this.paused,
      muted: this.muted,
      isProcessing: this.isProcessing,
      maxQueueSize: this.maxQueueSize,
      current: this.currentItem
        ? {
            itemId: this.currentItem.itemId,
            text: this.currentItem.text,
            tag: this.currentItem.tag,
            priority: this.currentItem.priority
          }
        : null,
      pending: this.queue.map((q) => ({
        itemId: q.itemId,
        text: q.text,
        tag: q.tag,
        priority: q.priority
      })),
      recent: this.recentHistory.slice(0, 10).map((h) => ({
        itemId: h.itemId,
        text: h.text,
        tag: h.tag,
        playedAt: h.playedAt
      }))
    };
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
    this.currentItem = null;
    this.isProcessing = false;
    this._emitState();
  }
}

export default AudioPriorityQueue;
