/**
 * GiftStreakCoalescer: Coalesces continuous gift combo streaks into a single
 * finalized gift announcement using repeatEnd and a 1.5s debounce timeout.
 */
export class GiftStreakCoalescer {
  /**
   * @param {Object} options
   * @param {number} [options.debounceMs=1500] Debounce timeout in ms
   * @param {Function} [options.onIntermediate] Callback for repeatEnd=false (particle vfx only)
   * @param {Function} [options.onFlush] Callback for finalized gift
   */
  constructor(options = {}) {
    this.debounceMs = options.debounceMs || 1500;
    this.onIntermediate = options.onIntermediate || (() => {});
    this.onFlush = options.onFlush || (() => {});
    this.activeStreaks = new Map();
  }

  /**
   * Process an incoming gift event.
   * @param {Object} giftEvent Canonical gift event
   */
  processGift(giftEvent) {
    const { userId, uniqueId, nickname, avatarUrl, payload } = giftEvent;
    const { giftId, giftName, diamondCount = 1, repeatCount = 1, repeatEnd = true, isCombo = false } = payload;
    const streakKey = `${userId}_${giftId || giftName}`;

    let streak = this.activeStreaks.get(streakKey);

    if (repeatEnd === false) {
      // Intermediate combo hit
      if (streak) {
        clearTimeout(streak.timer);
        streak.count = Math.max(streak.count, repeatCount);
        streak.lastTimestamp = Date.now();
      } else {
        streak = {
          streakKey,
          userId,
          uniqueId,
          nickname,
          avatarUrl,
          giftId,
          giftName,
          count: repeatCount,
          diamondsEach: diamondCount,
          isCombo: true,
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
        count: streak.count,
        diamondsEach: diamondCount,
        repeatEnd: false,
        isCombo: true,
        comboCount: streak.count
      });
    } else {
      // repeatEnd === true: Combo ended or single non-combo gift
      let finalCount = repeatCount;
      if (streak) {
        clearTimeout(streak.timer);
        finalCount = Math.max(streak.count, repeatCount);
        this.activeStreaks.delete(streakKey);
      }

      this._emitFinalizedGift({
        userId,
        uniqueId,
        nickname,
        avatarUrl,
        giftId,
        giftName,
        count: finalCount,
        diamondsEach: diamondCount,
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
      count: streak.count,
      diamondsEach: streak.diamondsEach,
      repeatEnd: true,
      isCombo: streak.isCombo,
      comboCount: streak.count
    });
  }

  /**
   * Internal helper to compute totals and dispatch finalized gift.
   * @private
   */
  _emitFinalizedGift(data) {
    const totalCoins = data.count * data.diamondsEach;
    // VFX & Celebration Tier: Tier 1 (1-9), Tier 2 (10-99), Tier 3 (100+)
    let tier = 1;
    if (totalCoins >= 100) {
      tier = 3;
    } else if (totalCoins >= 10) {
      tier = 2;
    }

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
