import { VALID_SKINS } from '../broadcaster/MessageSchemas.mjs';

/**
 * EventFlowEngine: Evaluates every TikTok / Admin / Bot micro-event against the
 * current Admin Configuration and returns a deterministic execution plan (actions).
 *
 * Pattern: [Event Trigger] -> [Filter & Cooldown Guard] -> [Action Plan]
 */
export class EventFlowEngine {
  /**
   * @param {import('../config/ConfigStore.mjs').ConfigStore} configStore
   */
  constructor(configStore) {
    this.configStore = configStore;

    // Cooldown maps: ruleKey -> timestampMs
    this.cooldowns = new Map();

    // Per-session tracking (cleared on session reset)
    this.sharedUserIds = new Set();
    this.triggeredLikeMilestones = new Set();
    this.lastPeriodicLikeMilestone = 0;
  }

  /**
   * Reset session-scoped counters (e.g. when starting a fresh live session)
   */
  resetSessionState() {
    this.cooldowns.clear();
    this.sharedUserIds.clear();
    this.triggeredLikeMilestones.clear();
    this.lastPeriodicLikeMilestone = 0;
  }

  /**
   * Check & record cooldown for a given key
   * @param {string} key
   * @param {number} cooldownSec
   * @returns {boolean} true if allowed, false if still cooling down
   */
  checkCooldown(key, cooldownSec) {
    const sec = Number(cooldownSec) || 0;
    if (sec <= 0) return true;
    const now = Date.now();
    const last = this.cooldowns.get(key) || 0;
    if (now - last < sec * 1000) {
      return false;
    }
    this.cooldowns.set(key, now);
    return true;
  }

  /**
   * Render a dynamic TTS or Banner template string
   * @param {string} template
   * @param {Record<string, any>} vars
   * @returns {string}
   */
  static renderTemplate(template, vars = {}) {
    if (!template || typeof template !== 'string') return '';
    return template
      .replace(/\{name\}/gi, vars.name ?? 'Phật tử')
      .replace(/\{giftName\}/gi, vars.giftName ?? 'Lễ vật')
      .replace(/\{count\}/gi, String(vars.count ?? 1))
      .replace(/\{countText\}/gi, vars.count > 1 ? `${vars.count} phần ` : '')
      .replace(/\{coins\}/gi, String(vars.coins ?? 0))
      .replace(/\{totalCoins\}/gi, String(vars.totalCoins ?? vars.coins ?? 0))
      .replace(/\{prayer\}/gi, vars.prayer ?? '')
      .replace(/\{text\}/gi, vars.text ?? '')
      .replace(/\{totalLikes\}/gi, Number(vars.totalLikes || 0).toLocaleString('vi-VN'))
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Resolve a skin option ('random' or valid skin name)
   * @param {string} skinSetting
   * @param {string} [fallback='man']
   */
  static resolveSkinChoice(skinSetting, fallback = 'man') {
    if (!skinSetting || skinSetting === 'random') {
      return VALID_SKINS[Math.floor(Math.random() * VALID_SKINS.length)];
    }
    return VALID_SKINS.includes(skinSetting) ? skinSetting : fallback;
  }

  /**
   * Evaluate `member` (Viewer Joined Room) flow
   * @param {Object} event CanonicalAppEvent
   * @param {{ seatedCount: number, capacity: number, isSeated: boolean }} ctx
   */
  evaluateMemberJoin(event, ctx) {
    const cfg = this.configStore.get().presenceFlows?.memberJoin;
    if (!cfg || !cfg.enabled) return { handled: false };

    const freeSeats = Math.max(0, ctx.capacity - ctx.seatedCount);
    const freePercent = ctx.capacity > 0 ? (freeSeats / ctx.capacity) * 100 : 0;
    const shouldSeat = Boolean(
      cfg.seatOnJoin && !ctx.isSeated && freePercent >= (Number(cfg.minFreeSeatPercent) || 0)
    );

    return {
      handled: true,
      shouldSeat,
      skin: EventFlowEngine.resolveSkinChoice(cfg.defaultSkin, 'man'),
      bow: Boolean(cfg.bowOnJoin),
      particleTier: Number(cfg.particleTier) || 0,
      welcomeBubble: cfg.welcomeBubble
        ? EventFlowEngine.renderTemplate(cfg.welcomeBubble, { name: event.nickname })
        : ''
    };
  }

  /**
   * Evaluate `follow` flow
   * @param {Object} event CanonicalAppEvent
   */
  evaluateFollow(event) {
    const cfg = this.configStore.get().presenceFlows?.follow;
    if (!cfg || !cfg.enabled) return { handled: false };

    let ttsText = '';
    if (cfg.ttsEnabled && cfg.ttsTemplate && this.checkCooldown('follow_tts', cfg.ttsCooldownSec)) {
      ttsText = EventFlowEngine.renderTemplate(cfg.ttsTemplate, { name: event.nickname });
    }

    return {
      handled: true,
      shouldSeat: Boolean(cfg.seatOnFollow),
      bow: Boolean(cfg.bowOnFollow),
      bonusCoins: Math.max(0, Number(cfg.bonusCoins) || 0),
      particleTier: Number(cfg.particleTier) || 0,
      sfx: cfg.sfx || 'none',
      ttsText,
      ttsPriority: Number(cfg.ttsPriority) || 3
    };
  }

  /**
   * Evaluate `share` flow
   * @param {Object} event CanonicalAppEvent
   */
  evaluateShare(event) {
    const cfg = this.configStore.get().presenceFlows?.share;
    if (!cfg || !cfg.enabled) return { handled: false };

    const alreadyShared = this.sharedUserIds.has(event.userId);
    if (cfg.oncePerSession && alreadyShared) {
      return { handled: true, shouldSeat: false, bow: false, bonusCoins: 0, particleTier: 0, sfx: 'none', ttsText: '' };
    }
    if (event.userId) {
      this.sharedUserIds.add(event.userId);
    }

    let ttsText = '';
    if (cfg.ttsEnabled && cfg.ttsTemplate && this.checkCooldown('share_tts', cfg.ttsCooldownSec)) {
      ttsText = EventFlowEngine.renderTemplate(cfg.ttsTemplate, { name: event.nickname });
    }

    return {
      handled: true,
      shouldSeat: Boolean(cfg.seatOnShare),
      bow: Boolean(cfg.bowOnShare),
      bonusCoins: Math.max(0, Number(cfg.bonusCoins) || 0),
      particleTier: Number(cfg.particleTier) || 0,
      sfx: cfg.sfx || 'none',
      ttsText,
      ttsPriority: Number(cfg.ttsPriority) || 3
    };
  }

  /**
   * Evaluate `subNotify` (Channel Subscription / SuperFan) flow
   * @param {Object} event CanonicalAppEvent
   */
  evaluateSubscribe(event) {
    const cfg = this.configStore.get().presenceFlows?.subscribe;
    if (!cfg || !cfg.enabled) return { handled: false };

    const ttsText = cfg.ttsEnabled && cfg.ttsTemplate
      ? EventFlowEngine.renderTemplate(cfg.ttsTemplate, { name: event.nickname })
      : '';

    return {
      handled: true,
      shouldSeat: Boolean(cfg.seatOnSubscribe),
      grantVip: Boolean(cfg.grantVip),
      bonusCoins: Math.max(0, Number(cfg.bonusCoins) || 0),
      forceSkin: cfg.forceSkin || '',
      particleTier: Number(cfg.particleTier) || 3,
      sfx: cfg.sfx || 'great_bell',
      pulseHalo: Boolean(cfg.pulseHalo),
      allBow: Boolean(cfg.allBow),
      showBanner: Boolean(cfg.showBanner),
      bannerTitle: cfg.bannerTitle || 'PHẬT TỬ ĐĂNG KÝ HỘ PHÁP',
      bannerDurationSec: Number(cfg.bannerDurationSec) || 10,
      ttsText,
      ttsPriority: Number(cfg.ttsPriority) || 1
    };
  }

  /**
   * Evaluate `envelope` (Treasure Chest / Coin Box) flow
   * @param {Object} event CanonicalAppEvent
   */
  evaluateEnvelope(event) {
    const cfg = this.configStore.get().presenceFlows?.envelope;
    if (!cfg || !cfg.enabled) return { handled: false };

    const ttsText = cfg.ttsEnabled && cfg.ttsTemplate
      ? EventFlowEngine.renderTemplate(cfg.ttsTemplate, { name: event.nickname })
      : '';

    return {
      handled: true,
      pulseHalo: Boolean(cfg.pulseHalo),
      rainPetals: Boolean(cfg.rainPetals),
      sfx: cfg.sfx || 'small_bell',
      showBanner: Boolean(cfg.showBanner),
      bannerTitle: cfg.bannerTitle || 'TÚI LỘC PHƯỚC BÁU GIEO DUYÊN',
      bannerDurationSec: Number(cfg.bannerDurationSec) || 8,
      ttsText,
      ttsPriority: Number(cfg.ttsPriority) || 2
    };
  }

  /**
   * Evaluate `like` event and check Room Like Milestones
   * @param {Object} event CanonicalAppEvent
   * @param {number} prevTotalLikes
   * @param {number} newTotalLikes
   */
  evaluateLike(event, prevTotalLikes = 0, newTotalLikes = 0) {
    const likeFlows = this.configStore.get().likeFlows || {};
    const perLike = likeFlows.perLike || {};
    const msCfg = likeFlows.milestones || {};

    const count = Number(event.payload?.count) || 1;
    const plan = {
      handled: Boolean(perLike.enabled !== false),
      shouldSeat: Boolean(perLike.seatOnLike && count >= (Number(perLike.minLikesToSeat) || 1)),
      touchActivity: perLike.touchActivity !== false,
      bow: Boolean(perLike.bowOnLike),
      particleTier: Number(perLike.particleTier ?? 1),
      milestone: null
    };

    if (msCfg.enabled && newTotalLikes > prevTotalLikes && newTotalLikes > 0) {
      let hitThreshold = null;

      // 1. Check custom explicit thresholds
      if (Array.isArray(msCfg.customThresholds)) {
        for (const th of msCfg.customThresholds) {
          const numTh = Number(th);
          if (numTh > 0 && newTotalLikes >= numTh && !this.triggeredLikeMilestones.has(numTh)) {
            this.triggeredLikeMilestones.add(numTh);
            hitThreshold = numTh;
          }
        }
      }

      // 2. Check periodic step (everyNLikes)
      const step = Number(msCfg.everyNLikes) || 0;
      if (step > 0) {
        const currentBucket = Math.floor(newTotalLikes / step) * step;
        if (currentBucket > 0 && currentBucket > this.lastPeriodicLikeMilestone) {
          this.lastPeriodicLikeMilestone = currentBucket;
          if (!this.triggeredLikeMilestones.has(currentBucket)) {
            this.triggeredLikeMilestones.add(currentBucket);
            hitThreshold = currentBucket;
          }
        }
      }

      if (hitThreshold !== null) {
        plan.milestone = {
          threshold: hitThreshold,
          sfx: msCfg.sfx || 'great_bell',
          pulseHalo: Boolean(msCfg.pulseHalo),
          allBow: Boolean(msCfg.allBow),
          rainPetals: Boolean(msCfg.rainPetals),
          rainCount: Number(msCfg.rainCount) || 36,
          showBanner: Boolean(msCfg.showBanner),
          bannerTitle: msCfg.bannerTitle || 'ĐẠI CHÚNG ĐỒNG TÂM THẢ TIM',
          bannerDurationSec: Number(msCfg.bannerDurationSec) || 8,
          ttsText: msCfg.ttsEnabled && msCfg.ttsTemplate
            ? EventFlowEngine.renderTemplate(msCfg.ttsTemplate, { totalLikes: hitThreshold })
            : '',
          ttsPriority: Number(msCfg.ttsPriority) || 2
        };
      }
    }

    return plan;
  }

  /**
   * Match a single comment keyword rule against cleaned comment text
   * @private
   */
  _matchesKeywordRule(rule, text) {
    if (!rule || !rule.enabled || !Array.isArray(rule.keywords) || rule.keywords.length === 0) {
      return false;
    }
    const lowerText = text.toLowerCase().trim();
    const matchType = rule.matchType || 'contains';

    for (const rawKw of rule.keywords) {
      const kw = String(rawKw || '').trim();
      if (!kw) continue;
      const lowerKw = kw.toLowerCase();

      if (matchType === 'exact' && lowerText === lowerKw) return true;
      if (matchType === 'startsWith' && lowerText.startsWith(lowerKw)) return true;
      if (matchType === 'contains' && lowerText.includes(lowerKw)) return true;
      if (matchType === 'regex') {
        try {
          const re = new RegExp(kw, 'iu');
          if (re.test(text)) return true;
        } catch {
          // ignore invalid regex entered by admin
        }
      }
    }
    return false;
  }

  /**
   * Evaluate `chat` against general comment config + custom keyword trigger rules
   * @param {Object} event CanonicalAppEvent
   * @param {Object | null} viewer Current seated viewer state (if any)
   */
  evaluateChat(event, viewer) {
    const commentCfg = this.configStore.get().commentFlows || {};
    const general = commentCfg.general || {};
    if (general.enabled === false) return { handled: false };

    const text = event.payload?.text || '';
    const userCoins = viewer?.coins || 0;

    const result = {
      handled: true,
      seatOnChat: general.seatOnChat !== false,
      defaultSkin: EventFlowEngine.resolveSkinChoice(general.defaultSkin || 'man', 'man'),
      showBubble: general.showBubble !== false,
      bubbleDurationSec: Number(general.bubbleDurationSec) || 6,
      bow: general.bowOnChat !== false,
      allBow: false,
      forceSkin: '',
      particleTier: 0,
      pulseHalo: false,
      sfx: 'none',
      bonusCoins: 0,
      showChantBanner: false,
      ttsText: '',
      ttsPriority: 3,
      matchedRuleIds: []
    };

    const rules = Array.isArray(commentCfg.keywordRules) ? commentCfg.keywordRules : [];
    for (const rule of rules) {
      if (!this._matchesKeywordRule(rule, text)) continue;

      if (rule.requireDonor && userCoins <= 0 && !viewer?.isVip) continue;
      if (Number(rule.minCoins) > 0 && userCoins < Number(rule.minCoins)) continue;

      const cdKey = `kw_${rule.id || rule.name}`;
      if (!this.checkCooldown(cdKey, rule.cooldownSec)) continue;

      result.matchedRuleIds.push(rule.id || rule.name);
      const act = rule.actions || {};
      if (act.bow) result.bow = true;
      if (act.allBow) result.allBow = true;
      if (act.forceSkin && VALID_SKINS.includes(act.forceSkin)) result.forceSkin = act.forceSkin;
      if (Number(act.particleTier) > result.particleTier) result.particleTier = Number(act.particleTier);
      if (act.pulseHalo) result.pulseHalo = true;
      if (act.sfx && act.sfx !== 'none') result.sfx = act.sfx;
      if (Number(act.bonusCoins) > 0) result.bonusCoins += Number(act.bonusCoins);
      if (act.showChantBanner) result.showChantBanner = true;

      if (act.ttsEnabled && act.ttsTemplate && !result.ttsText) {
        result.ttsText = EventFlowEngine.renderTemplate(act.ttsTemplate, {
          name: event.nickname,
          text,
          coins: userCoins
        });
        result.ttsPriority = Number(act.ttsPriority) || 2;
      }
    }

    return result;
  }

  /**
   * Resolve finalized gift against Specific Gift Overrides first, then Dynamic Gift Tiers.
   * @param {Object} finalGift Finalized gift from GiftStreakCoalescer
   * @param {string} prayer Resolved prayer text
   */
  resolveGiftPlan(finalGift, prayer) {
    const giftCfg = this.configStore.get().giftFlows || {};
    const general = giftCfg.general || {};
    const tiers = Array.isArray(giftCfg.tiers) ? [...giftCfg.tiers] : [];
    const overrides = Array.isArray(giftCfg.giftOverrides) ? giftCfg.giftOverrides : [];

    const rawTotalCoins = Math.max(1, Number(finalGift.totalCoins) || 1);

    // 1. Find matching base tier by totalCoins (sorted descending by minCoins)
    const sortedTiers = tiers.sort((a, b) => (Number(b.minCoins) || 0) - (Number(a.minCoins) || 0));
    let matchedTier = sortedTiers.find(
      (t) => rawTotalCoins >= (Number(t.minCoins) || 0) &&
             (t.maxCoins === undefined || t.maxCoins === null || rawTotalCoins <= Number(t.maxCoins))
    );
    if (!matchedTier) {
      matchedTier = sortedTiers.find((t) => rawTotalCoins >= (Number(t.minCoins) || 0)) || {
        level: rawTotalCoins >= 100 ? 3 : rawTotalCoins >= 10 ? 2 : 1,
        particleTier: rawTotalCoins >= 100 ? 3 : rawTotalCoins >= 10 ? 2 : 1,
        sfx: rawTotalCoins >= 100 ? 'great_bell' : 'mo',
        pulseHalo: rawTotalCoins >= 100,
        allBow: rawTotalCoins >= 100,
        rainPetals: rawTotalCoins >= 100,
        showBanner: rawTotalCoins >= 100,
        bannerTitle: 'ĐẠI LỄ CÚNG DƯỜNG',
        bannerDurationSec: 10,
        grantVip: true,
        forceSkin: '',
        ttsEnabled: true,
        ttsPriority: rawTotalCoins >= (Number(general.priority1ThresholdCoins) || 99) ? 1 : 2,
        ttsTemplate: 'Nam mô A Di Đà Phật. Phật tử {name} thành tâm cúng dường {countText}{giftName}. {prayer}'
      };
    }

    // 2. Check Specific Gift Override (by giftId or case-insensitive giftName)
    const giftIdStr = String(finalGift.giftId || '').trim().toLowerCase();
    const giftNameStr = String(finalGift.giftName || '').trim().toLowerCase();

    const matchedOverride = overrides.find((ov) => {
      if (!ov || !ov.enabled) return false;
      const ovId = String(ov.giftId || '').trim().toLowerCase();
      const ovName = String(ov.giftName || '').trim().toLowerCase();
      if (ovId && giftIdStr && ovId === giftIdStr) return true;
      if (ovName && giftNameStr && (ovName === giftNameStr || giftNameStr.includes(ovName))) return true;
      return false;
    });

    const multiplier = matchedOverride && Number(matchedOverride.meritMultiplier) > 0
      ? Number(matchedOverride.meritMultiplier)
      : 1;
    const effectiveMeritCoins = Math.round(rawTotalCoins * multiplier);

    const activeRule = matchedOverride
      ? {
          ...matchedTier,
          ...matchedOverride,
          sfx: matchedOverride.sfx && matchedOverride.sfx !== 'inherit' ? matchedOverride.sfx : matchedTier.sfx,
          showBanner: matchedOverride.showBanner !== undefined && matchedOverride.showBanner !== 'inherit'
            ? Boolean(matchedOverride.showBanner)
            : Boolean(matchedTier.showBanner)
        }
      : matchedTier;

    // 3. Determine TTS eligibility & text
    let shouldReadTts = Boolean(
      general.enabled !== false &&
      activeRule.ttsEnabled !== false &&
      (general.readAllTts || rawTotalCoins >= (Number(general.minDiamondsForTts) || 1))
    );

    let ttsTemplate = activeRule.ttsTemplate || matchedTier.ttsTemplate ||
      'Nam mô A Di Đà Phật. Phật tử {name} thành tâm cúng dường {countText}{giftName}. {prayer}';
    let ttsPriority = Number(activeRule.ttsPriority) ||
      (rawTotalCoins >= (Number(general.priority1ThresholdCoins) || 99) ? 1 : 2);

    if (matchedOverride) {
      if (matchedOverride.ttsMode === 'mute') {
        shouldReadTts = false;
      } else if (matchedOverride.ttsMode === 'custom' && matchedOverride.ttsTemplate) {
        shouldReadTts = true;
        ttsTemplate = matchedOverride.ttsTemplate;
        if (matchedOverride.ttsPriority) ttsPriority = Number(matchedOverride.ttsPriority);
      }
    }

    const ttsText = shouldReadTts
      ? EventFlowEngine.renderTemplate(ttsTemplate, {
          name: finalGift.nickname,
          giftName: finalGift.giftName,
          count: finalGift.count,
          coins: finalGift.diamondsEach,
          totalCoins: effectiveMeritCoins,
          prayer
        })
      : '';

    return {
      matchedOverrideId: matchedOverride?.id || null,
      tierLevel: Number(activeRule.level || activeRule.particleTier || finalGift.tier || 1),
      particleTier: Number(activeRule.particleTier || finalGift.tier || 1),
      effectiveMeritCoins,
      sfx: activeRule.sfx || (finalGift.tier >= 3 ? 'great_bell' : 'mo'),
      pulseHalo: Boolean(activeRule.pulseHalo),
      allBow: Boolean(activeRule.allBow),
      rainPetals: Boolean(activeRule.rainPetals),
      showBanner: Boolean(activeRule.showBanner),
      bannerTitle: activeRule.bannerTitle || 'ĐẠI LỄ CÚNG DƯỜNG',
      bannerDurationSec: Number(activeRule.bannerDurationSec) || 10,
      grantVip: general.autoGrantVipOnGift !== false && Boolean(activeRule.grantVip !== false),
      forceSkin: activeRule.forceSkin && VALID_SKINS.includes(activeRule.forceSkin) ? activeRule.forceSkin : '',
      ttsText,
      ttsPriority
    };
  }
}

export default EventFlowEngine;

