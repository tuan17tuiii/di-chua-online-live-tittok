import { ProfanityFilter } from '../moderation/ProfanityFilter.mjs';
import { Sanitizer } from '../moderation/Sanitizer.mjs';
import { EventNormalizer } from '../moderation/EventNormalizer.mjs';

/**
 * AdminManualAdapter: Injects manually triggered rehearsal and flow-testing events
 * (chat, gift, like, member, follow, share, subscribe, envelope) into the canonical event bus.
 */
export class AdminManualAdapter {
  /**
   * @param {Object} [options]
   * @param {Function} [options.onEvent] Callback to deliver CanonicalAppEvent
   */
  constructor(options = {}) {
    this.onEvent = options.onEvent || (() => {});
  }

  injectChat(text, name = 'Thí Chủ Ẩn Danh', id) {
    const userId = id || `admin_user_${Date.now()}`;
    const nickname = ProfanityFilter.sanitizeNickname(name);
    const cleanedText = Sanitizer.cleanString(text, ProfanityFilter.maxCommentLength || 120);

    const { allowed, cleanedText: validText } = ProfanityFilter.filterComment(cleanedText);
    if (!allowed) return null;

    const detectedSkin = EventNormalizer.detectSkinFromText(validText);

    const event = {
      eventId: `admin_chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      source: 'admin',
      timestamp: Date.now(),
      userId,
      uniqueId: userId,
      nickname,
      avatarUrl: '/assets/characters/c_man.png',
      type: 'chat',
      payload: {
        text: validText,
        detectedSkin
      }
    };

    this.onEvent(event);
    return event;
  }

  injectGift(diamonds, name = 'Phật Tử Diệu Âm', gift = 'Đèn Hoa Sen', count = 1, prayer, id, giftId) {
    const userId = id || `admin_user_${Date.now()}`;
    const nickname = ProfanityFilter.sanitizeNickname(name);
    const giftName = Sanitizer.cleanString(gift, 40);
    const diamondCount = Number(diamonds) || 1;
    const repeatCount = Number(count) || 1;

    const event = {
      eventId: `admin_gift_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      source: 'admin',
      timestamp: Date.now(),
      userId,
      uniqueId: userId,
      nickname,
      avatarUrl: '/assets/characters/c_woman.png',
      type: 'gift',
      payload: {
        giftId: giftId ? String(giftId) : 'manual_' + diamondCount,
        giftName,
        diamondCount,
        repeatCount,
        repeatEnd: true,
        isCombo: repeatCount > 1,
        prayer: prayer ? Sanitizer.cleanString(prayer, 120) : undefined
      }
    };

    this.onEvent(event);
    return event;
  }

  injectLike(count = 10, name = 'Phật Tử', id, totalLikes) {
    const userId = id || `admin_user_${Date.now()}`;
    const nickname = ProfanityFilter.sanitizeNickname(name);

    const event = {
      eventId: `admin_like_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      source: 'admin',
      timestamp: Date.now(),
      userId,
      uniqueId: userId,
      nickname,
      avatarUrl: '/assets/characters/c_man.png',
      type: 'like',
      payload: {
        count: Number(count) || 10,
        totalLikes: totalLikes !== undefined ? Number(totalLikes) : undefined
      }
    };

    this.onEvent(event);
    return event;
  }

  injectSocialOrPresence(type, name = 'Phật Tử Hữu Duyên', id) {
    const userId = id || `admin_${type}_${Date.now()}`;
    const nickname = ProfanityFilter.sanitizeNickname(name);

    const event = {
      eventId: `admin_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      source: 'admin',
      timestamp: Date.now(),
      userId,
      uniqueId: userId,
      nickname,
      avatarUrl: '/assets/characters/c_woman.png',
      type,
      payload: {}
    };

    this.onEvent(event);
    return event;
  }
}

export default AdminManualAdapter;
