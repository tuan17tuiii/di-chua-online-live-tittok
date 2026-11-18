/**
 * PrayerCache: Sliding window prayer cache with configurable TTL, consumption mode,
 * and customizable spiritual fallback blessings.
 */
export class PrayerCache {
  static DEFAULT_PRAYERS = [
    'Cầu gia đạo bình an, vạn sự kiết tường như ý.',
    'Nguyện cầu cha mẹ mạnh khỏe, phúc thọ tăng long.',
    'Cầu cho quốc thái dân an, phong điều vũ thuận.',
    'Nguyện tiêu trừ nghiệp chướng, phước huệ trang nghiêm.',
    'Cầu cho sở nguyện tòng tâm, bình an thanh tịnh.'
  ];

  /**
   * @param {number} [ttlMs=90000] Time to live in ms (default 90s)
   */
  constructor(ttlMs = 90000) {
    this.enabled = true;
    this.ttlMs = ttlMs;
    this.consumeOnce = true;
    this.defaultPrayers = [...PrayerCache.DEFAULT_PRAYERS];
    this.cache = new Map();
  }

  /**
   * Hot-update prayer cache configuration from Admin ConfigStore
   * @param {Object} cfg
   */
  configure(cfg = {}) {
    if (cfg.enabled !== undefined) this.enabled = Boolean(cfg.enabled);
    if (cfg.ttlSec !== undefined) this.ttlMs = Math.max(5, Number(cfg.ttlSec) || 90) * 1000;
    if (cfg.consumeOnce !== undefined) this.consumeOnce = Boolean(cfg.consumeOnce);
    if (Array.isArray(cfg.defaultPrayers)) {
      const cleaned = cfg.defaultPrayers.map((s) => String(s || '').trim()).filter(Boolean);
      this.defaultPrayers = cleaned.length > 0 ? cleaned : [...PrayerCache.DEFAULT_PRAYERS];
    }
  }

  /**
   * Record a prayer comment from a user.
   * @param {string} userId
   * @param {string} text
   */
  recordPrayer(userId, text) {
    if (!this.enabled || !userId || !text) return;
    this.cache.set(userId, {
      prayer: text.trim(),
      timestamp: Date.now()
    });
  }

  /**
   * Consume user's recent prayer within TTL. If not found or expired, returns default blessing.
   * @param {string} userId
   * @returns {string}
   */
  getPrayer(userId) {
    if (!this.enabled) return this.pickPrayer();

    const entry = this.cache.get(userId);
    const now = Date.now();

    if (entry && now - entry.timestamp <= this.ttlMs) {
      if (this.consumeOnce) {
        this.cache.delete(userId);
      }
      return entry.prayer;
    }

    if (entry) {
      this.cache.delete(userId);
    }

    return this.pickPrayer();
  }

  /**
   * Pick a random default prayer from configured blessings list.
   * @returns {string}
   */
  pickPrayer() {
    const list = this.defaultPrayers.length > 0 ? this.defaultPrayers : PrayerCache.DEFAULT_PRAYERS;
    const index = Math.floor(Math.random() * list.length);
    return list[index];
  }

  /**
   * Cleanup expired entries.
   */
  cleanupExpired() {
    const now = Date.now();
    for (const [userId, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(userId);
      }
    }
  }
}

export default PrayerCache;
