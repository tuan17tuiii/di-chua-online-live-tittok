import { ProfanityFilter } from './ProfanityFilter.mjs';
import { Sanitizer } from './Sanitizer.mjs';

/**
 * EventNormalizer: Dual-format event normalizer supporting BOTH:
 * 1) `tiktok-live-connector` v2.5+ Protobuf v3 nested objects (`raw.user.*`, `raw.common.*`, `raw.giftDetails.*`)
 * 2) Flattened v1 / legacy / unit-test objects (`raw.userId`, `raw.nickname`, `raw.diamondCount`)
 *
 * Also handles dynamic Skin NLP detection and per-user chat rate limiting.
 */
export class EventNormalizer {
  static DEFAULT_SKIN_CONFIG = {
    enabled: true,
    shortMsgMaxWords: 3,
    sacredExclusions: [
      'nam mô',
      'phật bà',
      'a di đà',
      'bổn sư',
      'quán thế âm',
      'bồ tát',
      'thích ca',
      'lạy phật'
    ],
    rules: [
      { skin: 'monk', keywords: ['sư thầy', 'thầy tu', 'đại đức', 'thầy'] },
      { skin: 'nun', keywords: ['ni cô', 'sư cô'] },
      { skin: 'child', keywords: ['chú tiểu', 'tiểu đồng'] },
      { skin: 'granny', keywords: ['cụ bà', 'bà lão', 'phật tử già'] },
      { skin: 'master', keywords: ['cao tăng', 'viện chủ', 'hòa thượng', 'thượng tọa'] },
      { skin: 'man', keywords: ['cư sĩ nam', 'con là nam', 'đổi nam', 'skin nam'] },
      { skin: 'woman', keywords: ['cư sĩ nữ', 'con là nữ', 'đổi nữ', 'skin nữ'] }
    ],
    isolatedShortKeywords: [
      { skin: 'man', keyword: 'nam' },
      { skin: 'woman', keyword: 'nữ' },
      { skin: 'granny', keyword: 'bà' }
    ]
  };

  static activeSkinConfig = EventNormalizer.DEFAULT_SKIN_CONFIG;

  constructor(options = {}) {
    // Per-user rate limiting: userId -> lastChatTimestamp (ms)
    this.userLastChat = new Map();
    this.CHAT_COOLDOWN_MS = options.perUserCooldownMs ?? 3000;
    this.maxCommentLength = options.maxCommentLength ?? 120;
  }

  /**
   * Dynamically apply comment & skin NLP settings from Admin ConfigStore
   * @param {Object} commentFlowsCfg
   */
  configure(commentFlowsCfg = {}) {
    if (commentFlowsCfg.general) {
      if (commentFlowsCfg.general.perUserCooldownMs !== undefined) {
        this.CHAT_COOLDOWN_MS = Math.max(0, Number(commentFlowsCfg.general.perUserCooldownMs) || 0);
      }
      if (commentFlowsCfg.general.maxLength !== undefined) {
        this.maxCommentLength = Math.max(10, Math.min(500, Number(commentFlowsCfg.general.maxLength) || 120));
      }
    }
    if (commentFlowsCfg.skinChange) {
      EventNormalizer.activeSkinConfig = {
        ...EventNormalizer.DEFAULT_SKIN_CONFIG,
        ...commentFlowsCfg.skinChange
      };
    }
    if (commentFlowsCfg.moderation) {
      ProfanityFilter.configure(commentFlowsCfg.moderation, this.maxCommentLength);
    }
  }

  /**
   * Check per-user rate limit for chat.
   * @param {string} userId
   * @returns {boolean} true if allowed, false if rate limited
   */
  checkChatRateLimit(userId) {
    if (!userId || this.CHAT_COOLDOWN_MS <= 0) return true;
    const now = Date.now();
    const lastTime = this.userLastChat.get(userId) || 0;
    if (now - lastTime < this.CHAT_COOLDOWN_MS) {
      return false;
    }
    this.userLastChat.set(userId, now);
    if (this.userLastChat.size > 1000) {
      for (const [id, t] of this.userLastChat) {
        if (now - t > 60000) this.userLastChat.delete(id);
      }
    }
    return true;
  }

  static _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Detect avatar skin keyword from chat text using active Skin NLP configuration.
   * Protects Buddhist sacred chants from triggering unintentional skin changes.
   * @param {string} text
   * @param {Object} [customSkinCfg]
   * @returns {'man' | 'woman' | 'granny' | 'child' | 'monk' | 'nun' | 'master' | null}
   */
  static detectSkinFromText(text, customSkinCfg) {
    if (!text || typeof text !== 'string') return null;
    const skinCfg = customSkinCfg || EventNormalizer.activeSkinConfig || EventNormalizer.DEFAULT_SKIN_CONFIG;
    if (skinCfg.enabled === false) return null;

    const clean = text.trim();
    if (!clean) return null;

    // 1. Sacred Phrase Exclusion Filter
    const exclusions = Array.isArray(skinCfg.sacredExclusions) ? skinCfg.sacredExclusions : [];
    for (const phrase of exclusions) {
      const trimmed = String(phrase || '').trim();
      if (!trimmed) continue;
      const flexPattern = trimmed.split(/\s+/).map((p) => EventNormalizer._escapeRegex(p)).join('\\s+');
      if (new RegExp(flexPattern, 'iu').test(clean)) {
        return null;
      }
    }

    // 2. Explicit or Word-boundary detection
    const normalized = clean.toLowerCase();
    const rules = Array.isArray(skinCfg.rules) ? skinCfg.rules : [];

    for (const rule of rules) {
      if (!rule || !rule.skin || !Array.isArray(rule.keywords) || rule.keywords.length === 0) continue;
      const validKws = rule.keywords.map((k) => String(k || '').trim().toLowerCase()).filter(Boolean);
      if (validKws.length === 0) continue;
      const alt = validKws.map((k) => EventNormalizer._escapeRegex(k)).join('|');
      const regex = new RegExp(`(?:^|[^\\p{L}\\p{N}])(${alt})(?:$|[^\\p{L}\\p{N}])`, 'iu');
      if (regex.test(normalized)) {
        return rule.skin;
      }
    }

    // 3. Isolated keywords for short messages (<= shortMsgMaxWords)
    const maxWords = Number(skinCfg.shortMsgMaxWords) || 3;
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length <= maxWords && Array.isArray(skinCfg.isolatedShortKeywords)) {
      for (const item of skinCfg.isolatedShortKeywords) {
        if (!item?.skin || !item?.keyword) continue;
        const kw = EventNormalizer._escapeRegex(String(item.keyword).trim().toLowerCase());
        if (!kw) continue;
        const regex = new RegExp(`(?:^|[^\\p{L}\\p{N}])${kw}(?:$|[^\\p{L}\\p{N}])`, 'iu');
        if (regex.test(normalized)) {
          return item.skin;
        }
      }
    }

    return null;
  }

  /**
   * Extract standardized user identity & metadata from EITHER v2.5 Protobuf OR v1 flat object
   * @private
   */
  _extractBaseFields(raw, prefix) {
    const u = raw.user || raw.fromUser || {};
    const rawUserId =
      u.idStr ||
      (u.id !== undefined && u.id !== null && String(u.id) !== '0' ? String(u.id) : '') ||
      (u.userId !== undefined ? String(u.userId) : '') ||
      raw.userId ||
      raw.uniqueId ||
      u.displayId ||
      '';

    const userId = String(rawUserId || '');
    const uniqueId = String(u.displayId || u.uniqueId || raw.uniqueId || userId);
    const rawNickname = u.nickname || raw.nickname || uniqueId || 'Phật tử';
    const nickname = ProfanityFilter.sanitizeNickname(rawNickname);

    const avatarUrl =
      raw.profilePictureUrl ||
      u.profilePicture?.url?.[0] ||
      u.profilePicture?.urlList?.[0] ||
      u.avatarLarge?.url?.[0] ||
      u.avatarLarge?.urlList?.[0] ||
      u.avatarThumb?.url?.[0] ||
      u.avatarThumb?.urlList?.[0] ||
      raw.userDetails?.profilePictureUrls?.[0] ||
      '';

    const rawMsgId = raw.msgId || raw.common?.msgId || '';
    const eventId = rawMsgId && String(rawMsgId) !== '0'
      ? String(rawMsgId)
      : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    let timestamp = Number(raw.createTime ?? raw.common?.createTime ?? Date.now());
    // TikTok createTime is sometimes in seconds (10 digits) rather than milliseconds
    if (timestamp > 0 && timestamp < 10000000000) {
      timestamp *= 1000;
    }

    return {
      eventId,
      timestamp: timestamp || Date.now(),
      userId,
      uniqueId,
      nickname,
      avatarUrl: String(avatarUrl || '')
    };
  }

  /**
   * Normalize TikTok chat event (v2.5 WebcastChatMessage + v1 flat)
   * @param {any} raw
   * @returns {import('../broadcaster/MessageSchemas.mjs').CanonicalAppEvent | null}
   */
  normalizeTikTokChat(raw) {
    if (!raw) return null;
    const base = this._extractBaseFields(raw, 'chat');
    if (ProfanityFilter.isUserBlocked(base.userId, base.uniqueId)) return null;

    const rawComment = raw.comment ?? raw.text ?? raw.content ?? '';
    const comment = Sanitizer.cleanString(rawComment, this.maxCommentLength);

    const { allowed, cleanedText } = ProfanityFilter.filterComment(comment, this.maxCommentLength);
    if (!allowed) return null;

    const detectedSkin = EventNormalizer.detectSkinFromText(cleanedText);

    return {
      ...base,
      source: 'tiktok',
      type: 'chat',
      payload: {
        text: cleanedText,
        detectedSkin
      }
    };
  }

  /**
   * Normalize TikTok gift event (v2.5 WebcastGiftMessage + v1 flat)
   * @param {any} raw
   * @returns {import('../broadcaster/MessageSchemas.mjs').CanonicalAppEvent | null}
   */
  normalizeTikTokGift(raw) {
    if (!raw) return null;
    const base = this._extractBaseFields(raw, 'gift');
    if (ProfanityFilter.isUserBlocked(base.userId, base.uniqueId)) return null;

    const details = raw.giftDetails || raw.giftInfo || {};
    const ext = raw.extendedGiftInfo || {};

    const giftId = String(raw.giftId ?? details.giftId ?? ext.id ?? raw.id ?? '');
    const rawGiftName =
      raw.giftName ||
      details.giftName ||
      ext.name ||
      details.describe ||
      'Hoa Sen';
    const giftName = Sanitizer.cleanString(rawGiftName, 40) || 'Hoa Sen';

    const diamondCount = Math.max(
      1,
      Number(raw.diamondCount ?? details.diamondCount ?? ext.diamond_count ?? raw.diamonds ?? 1) || 1
    );
    const repeatCount = Math.max(
      1,
      Number(raw.repeatCount ?? raw.comboCount ?? raw.count ?? 1) || 1
    );
    const giftType = Number(raw.giftType ?? details.giftType ?? ext.type ?? 0);

    // Handle repeatEnd accurately across v1 boolean AND v2.5 Protobuf numeric (0/1)
    let repeatEnd = true;
    if (typeof raw.repeatEnd === 'boolean') {
      repeatEnd = raw.repeatEnd;
    } else if (typeof raw.repeatEnd === 'number') {
      // In TikTok Webcast Protobuf, only giftType === 1 is streakable; non-streakable gifts send repeatEnd=0
      repeatEnd = giftType === 1 ? raw.repeatEnd === 1 : true;
    }

    const isCombo = Boolean(giftType === 1 || raw.isCombo || repeatCount > 1);
    const giftIconUrl =
      raw.giftPictureUrl ||
      details.giftImage?.url?.[0] ||
      details.giftImage?.urlList?.[0] ||
      details.icon?.url?.[0] ||
      details.icon?.urlList?.[0] ||
      ext.image?.url_list?.[0] ||
      '';

    return {
      ...base,
      source: 'tiktok',
      type: 'gift',
      payload: {
        giftId,
        giftName,
        giftIconUrl,
        diamondCount,
        repeatCount,
        repeatEnd,
        isCombo
      }
    };
  }

  /**
   * Normalize TikTok like event (v2.5 WebcastLikeMessage + v1 flat)
   * @param {any} raw
   * @returns {import('../broadcaster/MessageSchemas.mjs').CanonicalAppEvent | null}
   */
  normalizeTikTokLike(raw) {
    if (!raw) return null;
    const base = this._extractBaseFields(raw, 'like');
    if (ProfanityFilter.isUserBlocked(base.userId, base.uniqueId)) return null;

    return {
      ...base,
      source: 'tiktok',
      type: 'like',
      payload: {
        count: Math.max(1, Number(raw.likeCount ?? raw.count ?? 1) || 1),
        totalLikes: Number(raw.totalLikeCount ?? raw.total ?? 0) || 0
      }
    };
  }

  /**
   * Normalize TikTok member/join event (v2.5 WebcastMemberMessage + v1 flat)
   */
  normalizeTikTokMember(raw) {
    if (!raw) return null;
    const base = this._extractBaseFields(raw, 'member');
    if (ProfanityFilter.isUserBlocked(base.userId, base.uniqueId)) return null;

    return {
      ...base,
      source: 'tiktok',
      type: 'member',
      payload: {}
    };
  }

  /**
   * Normalize TikTok follow event (v2.5 WebcastSocialMessage)
   */
  normalizeTikTokFollow(raw) {
    if (!raw) return null;
    const base = this._extractBaseFields(raw, 'follow');
    if (ProfanityFilter.isUserBlocked(base.userId, base.uniqueId)) return null;

    return {
      ...base,
      source: 'tiktok',
      type: 'follow',
      payload: {}
    };
  }

  /**
   * Normalize TikTok share event (v2.5 WebcastSocialMessage)
   */
  normalizeTikTokShare(raw) {
    if (!raw) return null;
    const base = this._extractBaseFields(raw, 'share');
    if (ProfanityFilter.isUserBlocked(base.userId, base.uniqueId)) return null;

    return {
      ...base,
      source: 'tiktok',
      type: 'share',
      payload: {}
    };
  }

  /**
   * Normalize TikTok subscription / SuperFan event (v2.5 WebcastSubNotifyMessage)
   */
  normalizeTikTokSubscribe(raw) {
    if (!raw) return null;
    const base = this._extractBaseFields(raw, 'subscribe');
    if (ProfanityFilter.isUserBlocked(base.userId, base.uniqueId)) return null;

    return {
      ...base,
      source: 'tiktok',
      type: 'subscribe',
      payload: {}
    };
  }

  /**
   * Normalize TikTok treasure chest / envelope event (v2.5 WebcastEnvelopeMessage)
   */
  normalizeTikTokEnvelope(raw) {
    if (!raw) return null;
    const envUser = raw.envelopeInfo?.sendUserName
      ? { ...raw, nickname: raw.envelopeInfo.sendUserName, userId: raw.envelopeInfo.sendUserId || 'envelope_sender' }
      : raw;
    const base = this._extractBaseFields(envUser, 'envelope');

    return {
      ...base,
      source: 'tiktok',
      type: 'envelope',
      payload: {
        diamondCount: Number(raw.envelopeInfo?.diamondCount || 0)
      }
    };
  }

  /**
   * Normalize TikTok sticker / emote chat event (v2.5 WebcastEmoteChatMessage)
   */
  normalizeTikTokEmote(raw) {
    if (!raw) return null;
    const base = this._extractBaseFields(raw, 'emote');
    if (ProfanityFilter.isUserBlocked(base.userId, base.uniqueId)) return null;

    return {
      ...base,
      source: 'tiktok',
      type: 'chat',
      payload: {
        text: '🙏🪷',
        detectedSkin: null,
        isEmote: true
      }
    };
  }
}

export default EventNormalizer;
