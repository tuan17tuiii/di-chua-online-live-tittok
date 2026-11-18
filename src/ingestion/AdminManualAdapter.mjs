import { ProfanityFilter } from '../moderation/ProfanityFilter.mjs';
import { Sanitizer } from '../moderation/Sanitizer.mjs';

/**
 * AdminManualAdapter: Injects manually triggered rehearsal events (chat, gift, like)
 * from the Admin Dashboard into the canonical event bus.
 */
export class AdminManualAdapter {
  /**
   * @param {Object} [options]
   * @param {Function} [options.onEvent] Callback to deliver CanonicalAppEvent
   */
  constructor(options = {}) {
    this.onEvent = options.onEvent || (() => {});
  }

  /**
   * Inject manual chat comment
   * @param {string} text
   * @param {string} [name='Thí Chủ Ẩn Danh']
   * @param {string} [id]
   */
  injectChat(text, name = 'Thí Chủ Ẩn Danh', id) {
    const userId = id || `admin_user_${Date.now()}`;
    const nickname = ProfanityFilter.sanitizeNickname(name);
    const cleanedText = Sanitizer.cleanString(text, 120);

    const { allowed, cleanedText: validText } = ProfanityFilter.filterComment(cleanedText);
    if (!allowed) return null;

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
        text: validText
      }
    };

    this.onEvent(event);
    return event;
  }

  /**
   * Inject manual gift event
   * @param {number} diamonds
   * @param {string} [name='Phật Tử Diệu Âm']
   * @param {string} [gift='Đèn Hoa Sen']
   * @param {number} [count=1]
   * @param {string} [prayer]
   * @param {string} [id]
   */
  injectGift(diamonds, name = 'Phật Tử Diệu Âm', gift = 'Đèn Hoa Sen', count = 1, prayer, id) {
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
        giftId: 'manual_' + diamondCount,
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

  /**
   * Inject manual like event
   * @param {number} [count=10]
   * @param {string} [name='Phật Tử']
   * @param {string} [id]
   */
  injectLike(count = 10, name = 'Phật Tử', id) {
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
        count: Number(count) || 10
      }
    };

    this.onEvent(event);
    return event;
  }
}

export default AdminManualAdapter;
