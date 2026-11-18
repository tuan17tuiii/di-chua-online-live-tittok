import { ProfanityFilter } from './ProfanityFilter.mjs';
import { Sanitizer } from './Sanitizer.mjs';

/**
 * EventNormalizer: Standardizes raw events from TikTok, Bots, or Admin
 * into CanonicalAppEvent and provides Skin NLP detection and per-user rate limiting.
 */
export class EventNormalizer {
  constructor() {
    // Per-user rate limiting: userId -> lastChatTimestamp (ms)
    this.userLastChat = new Map();
    this.CHAT_COOLDOWN_MS = 3000; // max 1 chat / 3 seconds per user
  }

  /**
   * Check per-user rate limit for chat.
   * @param {string} userId
   * @returns {boolean} true if allowed, false if rate limited
   */
  checkChatRateLimit(userId) {
    if (!userId) return true;
    const now = Date.now();
    const lastTime = this.userLastChat.get(userId) || 0;
    if (now - lastTime < this.CHAT_COOLDOWN_MS) {
      return false;
    }
    this.userLastChat.set(userId, now);
    // Cleanup if map gets too large (> 1000 users)
    if (this.userLastChat.size > 1000) {
      for (const [id, t] of this.userLastChat) {
        if (now - t > 60000) this.userLastChat.delete(id);
      }
    }
    return true;
  }

  /**
   * Detect avatar skin keyword from chat text.
   * Protects Buddhist sacred chants from triggering skin changes.
   * @param {string} text
   * @returns {'man' | 'woman' | 'granny' | 'child' | 'monk' | 'nun' | 'master' | null}
   */
  static detectSkinFromText(text) {
    if (!text || typeof text !== 'string') return null;
    const clean = text.trim();

    // 1. Sacred Phrase Exclusion Filter
    const SACRED_PATTERNS = [
      /nam\s+mô/i,
      /phật\s+bà/i,
      /a\s+di\s+đà/i,
      /bổn\s+sư/i,
      /quán\s+thế\s+âm/i,
      /bồ\s+tát/i,
      /thích\s+ca/i,
      /lạy\s+phật/i
    ];
    if (SACRED_PATTERNS.some((pat) => pat.test(clean))) {
      return null;
    }

    // 2. Explicit or Word-boundary detection
    const normalized = clean.toLowerCase();

    if (/(?:^|[^\p{L}\p{N}])(sư thầy|thầy tu|thầy)(?:$|[^\p{L}\p{N}])/iu.test(normalized)) return 'monk';
    if (/(?:^|[^\p{L}\p{N}])(ni cô|sư cô)(?:$|[^\p{L}\p{N}])/iu.test(normalized)) return 'nun';
    if (/(?:^|[^\p{L}\p{N}])(chú tiểu|tiểu đồng)(?:$|[^\p{L}\p{N}])/iu.test(normalized)) return 'child';
    if (/(?:^|[^\p{L}\p{N}])(cụ bà|bà lão|phật tử già)(?:$|[^\p{L}\p{N}])/iu.test(normalized)) return 'granny';
    if (/(?:^|[^\p{L}\p{N}])(cao tăng|viện chủ|hòa thượng)(?:$|[^\p{L}\p{N}])/iu.test(normalized)) return 'master';
    if (/(?:^|[^\p{L}\p{N}])(cư sĩ nam|con là nam|đổi nam|skin nam)(?:$|[^\p{L}\p{N}])/iu.test(normalized)) return 'man';
    if (/(?:^|[^\p{L}\p{N}])(cư sĩ nữ|con là nữ|đổi nữ|skin nữ)(?:$|[^\p{L}\p{N}])/iu.test(normalized)) return 'woman';

    // For short messages (<= 3 words), allow isolated keywords
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length <= 3) {
      if (/(?:^|[^\p{L}\p{N}])nam(?:$|[^\p{L}\p{N}])/iu.test(normalized)) return 'man';
      if (/(?:^|[^\p{L}\p{N}])nữ(?:$|[^\p{L}\p{N}])/iu.test(normalized)) return 'woman';
      if (/(?:^|[^\p{L}\p{N}])bà(?:$|[^\p{L}\p{N}])/iu.test(normalized)) return 'granny';
    }

    return null;
  }

  /**
   * Normalize TikTok chat event
   * @param {any} raw
   * @returns {import('../broadcaster/MessageSchemas.mjs').CanonicalAppEvent | null}
   */
  normalizeTikTokChat(raw) {
    if (!raw) return null;
    const userId = String(raw.userId || raw.uniqueId || '');
    const nickname = ProfanityFilter.sanitizeNickname(raw.nickname || raw.uniqueId || 'Phật tử');
    const comment = Sanitizer.cleanString(raw.comment || raw.text || '', 120);

    const { allowed, cleanedText } = ProfanityFilter.filterComment(comment);
    if (!allowed) return null;

    const detectedSkin = EventNormalizer.detectSkinFromText(cleanedText);

    return {
      eventId: raw.msgId ? String(raw.msgId) : `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      source: 'tiktok',
      timestamp: raw.createTime ? Number(raw.createTime) : Date.now(),
      userId,
      uniqueId: String(raw.uniqueId || userId),
      nickname,
      avatarUrl: raw.profilePictureUrl || (raw.userDetails && raw.userDetails.profilePictureUrls ? raw.userDetails.profilePictureUrls[0] : '') || '',
      type: 'chat',
      payload: {
        text: cleanedText,
        detectedSkin
      }
    };
  }

  /**
   * Normalize TikTok gift event
   * @param {any} raw
   * @returns {import('../broadcaster/MessageSchemas.mjs').CanonicalAppEvent}
   */
  normalizeTikTokGift(raw) {
    const userId = String(raw.userId || raw.uniqueId || '');
    const nickname = ProfanityFilter.sanitizeNickname(raw.nickname || raw.uniqueId || 'Phật tử');
    const giftId = String(raw.giftId || raw.id || '');
    const giftName = Sanitizer.cleanString(raw.giftName || raw.extendedGiftInfo?.name || 'Hoa Sen', 40);
    const diamondCount = Number(raw.diamondCount || raw.diamonds || 1);
    const repeatCount = Number(raw.repeatCount || raw.count || 1);
    const repeatEnd = Boolean(raw.repeatEnd !== undefined ? raw.repeatEnd : true);
    const giftType = Number(raw.giftType || 0);
    const isCombo = Boolean(giftType === 1 || raw.isCombo || (raw.repeatCount && raw.repeatCount > 1));

    return {
      eventId: raw.msgId ? String(raw.msgId) : `gift_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      source: 'tiktok',
      timestamp: raw.createTime ? Number(raw.createTime) : Date.now(),
      userId,
      uniqueId: String(raw.uniqueId || userId),
      nickname,
      avatarUrl: raw.profilePictureUrl || (raw.userDetails && raw.userDetails.profilePictureUrls ? raw.userDetails.profilePictureUrls[0] : '') || '',
      type: 'gift',
      payload: {
        giftId,
        giftName,
        diamondCount,
        repeatCount,
        repeatEnd,
        isCombo
      }
    };
  }

  /**
   * Normalize TikTok like event
   * @param {any} raw
   * @returns {import('../broadcaster/MessageSchemas.mjs').CanonicalAppEvent}
   */
  normalizeTikTokLike(raw) {
    const userId = String(raw.userId || raw.uniqueId || '');
    const nickname = ProfanityFilter.sanitizeNickname(raw.nickname || raw.uniqueId || 'Phật tử');

    return {
      eventId: raw.msgId ? String(raw.msgId) : `like_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      source: 'tiktok',
      timestamp: raw.createTime ? Number(raw.createTime) : Date.now(),
      userId,
      uniqueId: String(raw.uniqueId || userId),
      nickname,
      avatarUrl: raw.profilePictureUrl || (raw.userDetails && raw.userDetails.profilePictureUrls ? raw.userDetails.profilePictureUrls[0] : '') || '',
      type: 'like',
      payload: {
        count: Number(raw.likeCount || 1),
        totalLikes: Number(raw.totalLikeCount || 0)
      }
    };
  }

  /**
   * Normalize TikTok member/join event
   * @param {any} raw
   * @returns {import('../broadcaster/MessageSchemas.mjs').CanonicalAppEvent}
   */
  normalizeTikTokMember(raw) {
    const userId = String(raw.userId || raw.uniqueId || '');
    const nickname = ProfanityFilter.sanitizeNickname(raw.nickname || raw.uniqueId || 'Phật tử');

    return {
      eventId: raw.msgId ? String(raw.msgId) : `member_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      source: 'tiktok',
      timestamp: raw.createTime ? Number(raw.createTime) : Date.now(),
      userId,
      uniqueId: String(raw.uniqueId || userId),
      nickname,
      avatarUrl: raw.profilePictureUrl || (raw.userDetails && raw.userDetails.profilePictureUrls ? raw.userDetails.profilePictureUrls[0] : '') || '',
      type: 'member',
      payload: {}
    };
  }
}

export default EventNormalizer;
