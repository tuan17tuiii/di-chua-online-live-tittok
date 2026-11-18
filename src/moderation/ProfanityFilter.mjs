import { Sanitizer } from './Sanitizer.mjs';

/**
 * ProfanityFilter: Vietnamese profanity, teencode, religious blasphemy, and user blocklist filter.
 * Supports both static defaults and dynamic Admin Config hot-updates.
 */
export class ProfanityFilter {
  static DEFAULT_BLACKLIST_PATTERNS = [
    // Teencode, curse words, vulgar slang (Unicode-aware word boundaries)
    /(?<![\p{L}\p{N}])(đm|dmm|đcm|vcl|vkl|loz|lồn|cặc|buồi|địt|đéo|đụ|mẹ mày|đụ má|mẹ kiếp|chó chết|khốn nạn)(?![\p{L}\p{N}])/iu,
    // Pornographic & sexually explicit terms
    /(?<![\p{L}\p{N}])(dâm|thủ dâm|bú cu|hiếp|giao cấu|làm tình|dương vật|âm vật|khiêu dâm)(?![\p{L}\p{N}])/iu,
    // Blasphemy and insulting Buddhist religion/monks
    /(?<![\p{L}\p{N}])(chùa lừa|sư giả|buôn thần bán thánh|ma tăng|lừa đảo tôn giáo|phỉ báng tam bảo)(?![\p{L}\p{N}])/iu
  ];

  static BLACKLIST_PATTERNS = [...ProfanityFilter.DEFAULT_BLACKLIST_PATTERNS];
  static enabled = true;
  static fallbackNickname = 'Phật tử hữu duyên';
  static maxCommentLength = 120;
  static blockedUsers = new Set();

  /**
   * Escape regex special characters for safe dynamic word list compilation
   * @param {string} str
   */
  static _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Dynamically configure moderation rules from Admin ConfigStore
   * @param {Object} moderationCfg
   * @param {number} [maxCommentLength=120]
   */
  static configure(moderationCfg = {}, maxCommentLength = 120) {
    if (moderationCfg.enabled !== undefined) {
      this.enabled = Boolean(moderationCfg.enabled);
    }
    if (moderationCfg.fallbackNickname) {
      this.fallbackNickname = Sanitizer.cleanString(moderationCfg.fallbackNickname, 28) || 'Phật tử hữu duyên';
    }
    if (maxCommentLength) {
      this.maxCommentLength = Math.max(10, Math.min(500, Number(maxCommentLength) || 120));
    }

    if (Array.isArray(moderationCfg.blockedUserIds)) {
      this.blockedUsers = new Set(
        moderationCfg.blockedUserIds.map((id) => String(id || '').trim().toLowerCase()).filter(Boolean)
      );
    }

    if (Array.isArray(moderationCfg.blacklistWords)) {
      const words = moderationCfg.blacklistWords
        .map((w) => String(w || '').trim().toLowerCase())
        .filter(Boolean);

      if (words.length > 0) {
        const alternation = words.map((w) => this._escapeRegex(w)).join('|');
        this.BLACKLIST_PATTERNS = [
          new RegExp(`(?<![\\p{L}\\p{N}])(${alternation})(?![\\p{L}\\p{N}])`, 'iu')
        ];
      } else {
        this.BLACKLIST_PATTERNS = [];
      }
    }
  }

  /**
   * Check if a user ID or uniqueId is blocked
   * @param {string} userId
   * @param {string} [uniqueId]
   * @returns {boolean}
   */
  static isUserBlocked(userId, uniqueId) {
    if (this.blockedUsers.size === 0) return false;
    if (userId && this.blockedUsers.has(String(userId).toLowerCase())) return true;
    if (uniqueId && this.blockedUsers.has(String(uniqueId).toLowerCase().replace(/^@/, ''))) return true;
    return false;
  }

  /**
   * Check if text contains any blacklisted patterns.
   * @param {string} text
   * @returns {boolean}
   */
  static isProfane(text) {
    if (!this.enabled) return false;
    if (!text || typeof text !== 'string') return false;
    const normalized = text.toLowerCase().replace(/[_.\-+]/g, ' ');
    return this.BLACKLIST_PATTERNS.some((pattern) => pattern.test(normalized));
  }

  /**
   * Sanitize user nickname. If profane, fallback to configured fallbackNickname.
   * @param {string} nickname
   * @returns {string}
   */
  static sanitizeNickname(nickname) {
    const cleaned = Sanitizer.cleanString(nickname || '', 22);
    if (!cleaned || this.isProfane(cleaned)) {
      return this.fallbackNickname || 'Phật tử hữu duyên';
    }
    return cleaned;
  }

  /**
   * Filter and validate a comment.
   * @param {string} text
   * @param {number} [maxLen]
   * @returns {{ allowed: boolean, cleanedText: string }}
   */
  static filterComment(text, maxLen) {
    const limit = maxLen || this.maxCommentLength || 120;
    const cleaned = Sanitizer.cleanString(text || '', limit);
    if (!cleaned) {
      return { allowed: false, cleanedText: '' };
    }
    if (this.isProfane(cleaned)) {
      return { allowed: false, cleanedText: '' };
    }
    return { allowed: true, cleanedText: cleaned };
  }
}

export default ProfanityFilter;
