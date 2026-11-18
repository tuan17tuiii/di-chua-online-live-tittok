/**
 * GiftStreakCoalescer: Coalesces continuous gift combo streaks into a single
 * finalized gift announcement using repeatEnd and a configurable debounce timeout.
 */
export class GiftStreakCoalescer {
  /**
   * @param {Object} options
   * @param {number} [options.debounceMs=1500] Debounce timeout in ms
   * @param {Array<Object>} [options.tiers] Optional dynamic gift tier definitions
   * @param {Function} [options.onIntermediate] Callback for repeatEnd=false (particle vfx only)
   * @param {Function} [options.onFlush] Callback for finalized gift
   */
  constructor(options = {}) {
    this.debounceMs = options.debounceMs || 1500;
    this.tiers = Array.isArray(options.tiers) ? options.tiers : null;
    this.onIntermediate = options.onIntermediate || (() => {});
    this.onFlush = options.onFlush || (() => {});
    this.activeStreaks = new Map();
  }

  /**
   * Hot-update debounce window & tier definitions from Admin ConfigStore
   * @param {{ debounceMs?: number, tiers?: Array<Object> }} cfg
   */
  configure(cfg = {}) {
    if (cfg.debounceMs !== undefined) {
      this.debounceMs = Math.max(200, Math.min(10000, Number(cfg.debounceMs) || 1500));
    }
    if (Array.isArray(cfg.tiers)) {
      this.tiers = cfg.tiers;
    }
  }

  /**
   * Process an incoming gift event.
   * @param {Object} giftEvent Canonical gift event
   */
  processGift(giftEvent) {
    const { userId, uniqueId, nickname, avatarUrl, payload } = giftEvent;
    const {
      giftId,
      giftName,
      giftIconUrl = '',
      diamondCount = 1,
      repeatCount = 1,
      repeatEnd = true,
      isCombo = false,
      prayer
    } = payload;
    const streakKey = `${userId}_${giftId || giftName}`;

    let streak = this.activeStreaks.get(streakKey);

    if (repeatEnd === false) {
      // Intermediate combo hit
      if (streak) {
        clearTimeout(streak.timer);
        streak.count = Math.max(streak.count, repeatCount);
        streak.lastTimestamp = Date.now();
        if (prayer) streak.prayer = prayer;
      } else {
        streak = {
          streakKey,
          userId,
          uniqueId,
          nickname,
          avatarUrl,
          giftId,
          giftName,
          giftIconUrl,
          count: repeatCount,
          diamondsEach: diamondCount,
          isCombo: true,
          prayer,
          lastTimestamp: Date.now(),
          timer: null
        };
        this.activeStreaks.set(streakKey, streak);
      }

      // Schedule debounce flush
      streak.timer = setTimeout(() => {
        this.flushStreak(streakKey);
      }, this.debounceMs);

      // Emit intermediate event for light VFX (no TTS)
      this.onIntermediate({
        userId,
        uniqueId,
        nickname,
        avatarUrl,
        giftId,
        giftName,
        giftIconUrl,
        count: streak.count,
        diamondsEach: diamondCount,
        repeatEnd: false,
        isCombo: true,
        comboCount: streak.count
      });
    } else {
      // repeatEnd === true: Combo ended or single non-combo gift
      let finalCount = repeatCount;
      let resolvedPrayer = prayer;
      if (streak) {
        clearTimeout(streak.timer);
        finalCount = Math.max(streak.count, repeatCount);
        if (!resolvedPrayer && streak.prayer) resolvedPrayer = streak.prayer;
        this.activeStreaks.delete(streakKey);
      }

      this._emitFinalizedGift({
        userId,
        uniqueId,
        nickname,
        avatarUrl,
        giftId,
        giftName,
        giftIconUrl,
        count: finalCount,
        diamondsEach: diamondCount,
        prayer: resolvedPrayer,
        repeatEnd: true,
        isCombo: Boolean(isCombo || (streak && streak.isCombo) || finalCount > 1),
        comboCount: finalCount
      });
    }
  }

  /**
   * Flush an active streak by key.
   * @param {string} streakKey
   */
  flushStreak(streakKey) {
    const streak = this.activeStreaks.get(streakKey);
    if (!streak) return;
    if (streak.timer) clearTimeout(streak.timer);
    this.activeStreaks.delete(streakKey);

    this._emitFinalizedGift({
      userId: streak.userId,
      uniqueId: streak.uniqueId,
      nickname: streak.nickname,
      avatarUrl: streak.avatarUrl,
      giftId: streak.giftId,
      giftName: streak.giftName,
      giftIconUrl: streak.giftIconUrl,
      count: streak.count,
      diamondsEach: streak.diamondsEach,
      prayer: streak.prayer,
      repeatEnd: true,
      isCombo: streak.isCombo,
      comboCount: streak.count
    });
  }

  _resolveTierLevel(totalCoins) {
    if (Array.isArray(this.tiers) && this.tiers.length > 0) {
      const sorted = [...this.tiers].sort((a, b) => (Number(b.minCoins) || 0) - (Number(a.minCoins) || 0));
      const found = sorted.find(
        (t) => totalCoins >= (Number(t.minCoins) || 0) &&
               (t.maxCoins === undefined || t.maxCoins === null || totalCoins <= Number(t.maxCoins))
      );
      if (found) return Number(found.level || found.particleTier || 1);
    }

    if (totalCoins >= 100) return 3;
    if (totalCoins >= 10) return 2;
    return 1;
  }

  /**
   * Internal helper to compute totals and dispatch finalized gift.
   * @private
   */
  _emitFinalizedGift(data) {
    const totalCoins = data.count * data.diamondsEach;
    const tier = this._resolveTierLevel(totalCoins);

    this.onFlush({
      ...data,
      totalCoins,
      tier
    });
  }

  /**
   * Flush all active streaks (e.g., on server shutdown).
   */
  flushAll() {
    for (const streakKey of Array.from(this.activeStreaks.keys())) {
      this.flushStreak(streakKey);
    }
  }
}

export default GiftStreakCoalescer;
