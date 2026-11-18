/**
 * PrayerCache: 90-second sliding window prayer cache with spiritual fallback blessings.
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
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  /**
   * Record a prayer comment from a user.
   * @param {string} userId
   * @param {string} text
   */
  recordPrayer(userId, text) {
    if (!userId || !text) return;
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
    const entry = this.cache.get(userId);
    const now = Date.now();

    if (entry && (now - entry.timestamp <= this.ttlMs)) {
      this.cache.delete(userId); // One-time consume
      return entry.prayer;
    }

    if (entry) {
      this.cache.delete(userId);
    }

    return this.pickPrayer();
  }

  /**
   * Pick a random default prayer from standard blessings list.
   * @returns {string}
   */
  pickPrayer() {
    const list = PrayerCache.DEFAULT_PRAYERS;
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
