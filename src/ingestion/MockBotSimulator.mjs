/**
 * MockBotSimulator: Autonomous virtual participants engine (1-100 bots)
 * with natural behavior distribution (60% chant, 30% like, 10% gift)
 * and configurable pacing (slow, mid, fast).
 */
export class MockBotSimulator {
  static BOT_NAMES = [
    'Diệu Hạnh', 'Minh Tâm', 'Tuệ Đức', 'Tịnh Quang', 'Thiện Nhân',
    'Diệu Âm', 'Quang Minh', 'Bảo Ngọc', 'Chân Như', 'An Lạc',
    'Trí Dũng', 'Phúc Hậu', 'Từ Bi', 'Thanh Tịnh', 'Như Ý',
    'Đức Trí', 'Tuệ Giác', 'Bồ Đề', 'Viên Thông', 'Chân Tâm'
  ];

  static BOT_SKINS = ['man', 'woman', 'granny', 'child', 'monk', 'nun', 'master'];

  static BOT_PRAYERS = [
    'Nam mô A Di Đà Phật',
    'Nam mô Bổn Sư Thích Ca Mâu Ni Phật',
    'Cầu gia đạo bình an, tai qua nạn khỏi',
    'Nguyện tiêu trừ nghiệp chướng, phước huệ trang nghiêm',
    'Cầu cho cha mẹ mạnh khỏe, phúc thọ tăng long',
    'Nam mô Đại Bi Quán Thế Âm Bồ Tát',
    'Nguyện khắp chúng sanh đều trọn thành Phật đạo'
  ];

  static BOT_GIFTS = [
    { name: 'Hoa Sen', diamonds: 1, id: '1001' },
    { name: 'Đèn Hoa Sen', diamonds: 10, id: '1002' },
    { name: 'Chuông Đồng', diamonds: 30, id: '1003' },
    { name: 'Chuông Vàng', diamonds: 199, id: '1004' }
  ];

  /**
   * @param {Object} [options]
   * @param {Function} [options.onEvent] Callback to deliver CanonicalAppEvent
   * @param {boolean} [options.on=false]
   * @param {number} [options.count=15]
   * @param {'slow' | 'mid' | 'fast'} [options.pace='mid']
   */
  constructor(options = {}) {
    this.onEvent = options.onEvent || (() => {});
    this.on = Boolean(options.on);
    this.count = Math.max(1, Math.min(100, Number(options.count) || 15));
    this.pace = options.pace || 'mid';

    this.timer = null;
    this.bots = [];
    this._initBots();

    if (this.on) {
      this.start();
    }
  }

  _initBots() {
    this.bots = [];
    for (let i = 0; i < this.count; i++) {
      const skin = MockBotSimulator.BOT_SKINS[i % MockBotSimulator.BOT_SKINS.length];
      const name = `${MockBotSimulator.BOT_NAMES[i % MockBotSimulator.BOT_NAMES.length]}${Math.floor(i / MockBotSimulator.BOT_NAMES.length) > 0 ? ' ' + (Math.floor(i / MockBotSimulator.BOT_NAMES.length) + 1) : ''}`;
      this.bots.push({
        userId: `bot_${i + 1}`,
        uniqueId: `bot_${i + 1}`,
        nickname: name,
        skin,
        avatarUrl: `/assets/characters/c_${skin}.png`
      });
    }
  }

  /**
   * Start bot generation loop
   */
  start() {
    this.stop();
    this.on = true;
    this._scheduleNextTick();
  }

  /**
   * Stop bot generation loop
   */
  stop() {
    this.on = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Update bot settings
   * @param {Object} settings
   * @param {boolean} [settings.on]
   * @param {number} [settings.count]
   * @param {'slow' | 'mid' | 'fast'} [settings.pace]
   */
  updateSettings({ on, count, pace } = {}) {
    if (count !== undefined && count !== this.count) {
      this.count = Math.max(1, Math.min(100, Number(count) || 15));
      this._initBots();
    }
    if (pace !== undefined) {
      this.pace = pace;
    }
    if (on !== undefined) {
      if (on && !this.on) this.start();
      else if (!on && this.on) this.stop();
    }
  }

  /**
   * Get delay based on pace
   * @returns {number} Delay in ms
   */
  _getNextDelay() {
    switch (this.pace) {
      case 'slow':
        return 8000 + Math.random() * 7000; // 8 - 15s
      case 'fast':
        return 350 + Math.random() * 650;  // 0.35 - 1s
      case 'mid':
      default:
        return 3000 + Math.random() * 3000; // 3 - 6s
    }
  }

  _scheduleNextTick() {
    if (!this.on) return;
    const delay = this._getNextDelay();
    this.timer = setTimeout(() => {
      this._generateRandomEvent();
      this._scheduleNextTick();
    }, delay);
  }

  /**
   * Generate a realistic random event according to distribution:
   * 60% Chant/Prayer, 30% Like, 10% Gift
   */
  _generateRandomEvent() {
    if (this.bots.length === 0) return;
    const bot = this.bots[Math.floor(Math.random() * this.bots.length)];
    const roll = Math.random();

    if (roll < 0.60) {
      // 60% Chant / Prayer
      const prayer = MockBotSimulator.BOT_PRAYERS[Math.floor(Math.random() * MockBotSimulator.BOT_PRAYERS.length)];
      this.onEvent({
        eventId: `bot_chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        source: 'bot',
        timestamp: Date.now(),
        userId: bot.userId,
        uniqueId: bot.uniqueId,
        nickname: bot.nickname,
        avatarUrl: bot.avatarUrl,
        type: 'chat',
        payload: {
          text: prayer,
          skin: bot.skin
        }
      });
    } else if (roll < 0.90) {
      // 30% Like
      const likeCount = Math.floor(5 + Math.random() * 25);
      this.onEvent({
        eventId: `bot_like_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        source: 'bot',
        timestamp: Date.now(),
        userId: bot.userId,
        uniqueId: bot.uniqueId,
        nickname: bot.nickname,
        avatarUrl: bot.avatarUrl,
        type: 'like',
        payload: {
          count: likeCount,
          skin: bot.skin
        }
      });
    } else {
      // 10% Gift
      const gift = MockBotSimulator.BOT_GIFTS[Math.floor(Math.random() * MockBotSimulator.BOT_GIFTS.length)];
      const prayer = MockBotSimulator.BOT_PRAYERS[Math.floor(Math.random() * MockBotSimulator.BOT_PRAYERS.length)];
      this.onEvent({
        eventId: `bot_gift_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        source: 'bot',
        timestamp: Date.now(),
        userId: bot.userId,
        uniqueId: bot.uniqueId,
        nickname: bot.nickname,
        avatarUrl: bot.avatarUrl,
        type: 'gift',
        payload: {
          giftId: gift.id,
          giftName: gift.name,
          diamondCount: gift.diamonds,
          repeatCount: 1,
          repeatEnd: true,
          isCombo: false,
          prayer,
          skin: bot.skin
        }
      });
    }
  }

  /**
   * Get current simulator status
   * @returns {{ on: boolean, count: number, pace: string }}
   */
  getStatus() {
    return {
      on: this.on,
      count: this.count,
      pace: this.pace
    };
  }
}

export default MockBotSimulator;
