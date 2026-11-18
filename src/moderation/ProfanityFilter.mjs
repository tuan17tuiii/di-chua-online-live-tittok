import { Sanitizer } from './Sanitizer.mjs';

/**
 * ProfanityFilter: Vietnamese profanity, teencode, and religious blasphemy filter.
 */
export class ProfanityFilter {
  static BLACKLIST_PATTERNS = [
    // Teencode, curse words, vulgar slang (Unicode-aware word boundaries)
    /(?<![\p{L}\p{N}])(đm|dmm|đcm|vcl|vkl|loz|lồn|cặc|buồi|địt|đéo|đụ|mẹ mày|đụ má|mẹ kiếp|chó chết|khốn nạn)(?![\p{L}\p{N}])/iu,
    // Pornographic & sexually explicit terms
    /(?<![\p{L}\p{N}])(dâm|thủ dâm|bú cu|hiếp|giao cấu|làm tình|dương vật|âm vật|khiêu dâm)(?![\p{L}\p{N}])/iu,
    // Blasphemy and insulting Buddhist religion/monks
    /(?<![\p{L}\p{N}])(chùa lừa|sư giả|buôn thần bán thánh|ma tăng|lừa đảo tôn giáo|phỉ báng tam bảo)(?![\p{L}\p{N}])/iu
  ];

  /**
   * Check if text contains any blacklisted patterns.
   * @param {string} text
   * @returns {boolean}
   */
  static isProfane(text) {
    if (!text || typeof text !== 'string') return false;
    const normalized = text.toLowerCase().replace(/[_.\-+]/g, ' ');
    return this.BLACKLIST_PATTERNS.some((pattern) => pattern.test(normalized));
  }

  /**
   * Sanitize user nickname. If profane, fallback to "Phật tử hữu duyên".
   * @param {string} nickname
   * @returns {string}
   */
  static sanitizeNickname(nickname) {
    const cleaned = Sanitizer.cleanString(nickname || '', 18);
    if (!cleaned || this.isProfane(cleaned)) {
      return 'Phật tử hữu duyên';
    }
    return cleaned;
  }

  /**
   * Filter and validate a comment.
   * @param {string} text
   * @returns {{ allowed: boolean, cleanedText: string }}
   */
  static filterComment(text) {
    const cleaned = Sanitizer.cleanString(text || '', 120);
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
