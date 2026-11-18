import { SeatingEngine } from './SeatingEngine.mjs';
import { PrayerCache } from './PrayerCache.mjs';
import { MeritLeaderboard } from './MeritLeaderboard.mjs';
import { LiturgicalScheduler } from './LiturgicalScheduler.mjs';
import { EventFlowEngine } from './EventFlowEngine.mjs';
import { TtsEngine } from '../audio/TtsEngine.mjs';
import { AudioPriorityQueue } from '../audio/AudioPriorityQueue.mjs';
import { EventNormalizer } from '../moderation/EventNormalizer.mjs';
import { GiftStreakCoalescer } from '../moderation/GiftStreakCoalescer.mjs';
import { MockBotSimulator } from '../ingestion/MockBotSimulator.mjs';
import { AdminManualAdapter } from '../ingestion/AdminManualAdapter.mjs';
import { TikTokLiveAdapter } from '../ingestion/TikTokLiveAdapter.mjs';
import { ConfigStore } from '../config/ConfigStore.mjs';
import { fromLegacySettingsPatch, toLegacyRoomSettings } from '../config/defaultConfigSchema.mjs';

/**
 * StateManager: Central orchestrator and single source of truth for Chánh Điện Tịnh Tâm.
 * Coordinates ConfigStore, EventFlowEngine, Ingestion, Moderation, Seating State, Audio/TTS, and Broadcaster.
 */
export class StateManager {
  /**
   * @param {Object} [options]
   * @param {Object} [options.settings] Legacy room settings override
   * @param {ConfigStore} [options.configStore] Persistent ConfigStore instance
   * @param {boolean} [options.persistConfig=false] Whether to persist config if auto-creating ConfigStore
   * @param {import('../broadcaster/Broadcaster.mjs').Broadcaster} [options.broadcaster]
   */
  constructor(options = {}) {
    this.configStore =
      options.configStore ||
      new ConfigStore({
        persist: Boolean(options.persistConfig),
        initialPatch: options.settings ? fromLegacySettingsPatch(options.settings) : undefined
      });

    this.settings = this.configStore.getLegacySettings();
    if (options.settings) {
      this.settings = { ...this.settings, ...options.settings };
    }

    this.startedAt = Date.now();
    this.logs = []; // Max 300 entries
    this.broadcaster = options.broadcaster || null;

    // Session Live Telemetry & Gift History
    this.roomTotalLikes = 0;
    this.recentGifts = []; // Max 30 finalized gifts for Live Manager & TTS Replay
    this.sessionStats = {
      sessionStartedAt: Date.now(),
      totalChats: 0,
      totalGifts: 0,
      totalDiamonds: 0,
      totalLikes: 0,
      totalMembers: 0,
      totalFollows: 0,
      totalShares: 0
    };

    const fullCfg = this.configStore.get();

    // 1. Initialize EventFlowEngine & Moderation
    this.flowEngine = new EventFlowEngine(this.configStore);
    this.normalizer = new EventNormalizer({
      perUserCooldownMs: fullCfg.commentFlows.general.perUserCooldownMs,
      maxCommentLength: fullCfg.commentFlows.general.maxLength
    });
    this.normalizer.configure(fullCfg.commentFlows);

    this.coalescer = new GiftStreakCoalescer({
      debounceMs: fullCfg.giftFlows.general.comboDebounceMs,
      tiers: fullCfg.giftFlows.tiers,
      onIntermediate: (data) => this._handleIntermediateGift(data),
      onFlush: (finalGift) => this._handleFinalizedGift(finalGift)
    });

    // 2. Initialize State Sub-engines
    this.seatingEngine = new SeatingEngine({
      seatMode: fullCfg.sceneSeating.seating.seatMode,
      initialCapacity: 36
    });
    this.seatingEngine.setDonorIdleMinutes(fullCfg.sceneSeating.seating.donorIdleEvictMin);

    this.prayerCache = new PrayerCache((fullCfg.commentFlows.prayerCache.ttlSec || 90) * 1000);
    this.prayerCache.configure(fullCfg.commentFlows.prayerCache);

    this.leaderboard = new MeritLeaderboard();

    // 3. Initialize Audio & TTS Pipeline
    this.ttsEngine = new TtsEngine({
      voice: fullCfg.audioRitual.tts.voice,
      pitch: `${fullCfg.audioRitual.tts.pitch}Hz`,
      rate: `${fullCfg.audioRitual.tts.rate}%`
    });

    this.audioQueue = new AudioPriorityQueue({
      ttsEngine: this.ttsEngine,
      maxQueueSize: fullCfg.audioRitual.tts.maxQueueSize || 10,
      onPlay: (payload) => {
        if (this.broadcaster) {
          this.broadcaster.broadcastOverlayOnly(payload);
          this.broadcaster.broadcastControlOnly({
            t: 'tts',
            itemId: payload.itemId,
            text: payload.text,
            tag: payload.tag,
            priority: payload.priority,
            id: payload.id
          });
        }
      },
      onStop: (stopPayload) => {
        if (this.broadcaster) {
          this.broadcaster.broadcastOverlayOnly(stopPayload);
        }
      },
      onStateChange: (queueStatus) => {
        if (this.broadcaster) {
          this.broadcaster.broadcastControlOnly({
            t: 'tts_queue',
            ...queueStatus
          });
        }
      }
    });

    // 4. Initialize Liturgical Scheduler
    this.scheduler = new LiturgicalScheduler({
      moBpm: fullCfg.audioRitual.mo.bpm,
      chantEveryMin: fullCfg.audioRitual.chant.everyMin,
      moEnabled: fullCfg.audioRitual.mo.enabled,
      autoChantEnabled: fullCfg.audioRitual.chant.enabled,
      chants: fullCfg.audioRitual.chant.items,
      onMoTick: (index) => {
        if (this.broadcaster) {
          this.broadcaster.broadcast({
            t: 'mo',
            roundRobinIndex: index
          });
        }
      },
      onChantTick: (chantText) => {
        if (this.broadcaster) {
          this.broadcaster.broadcast({
            t: 'chant',
            text: chantText,
            durationSec: this.configStore.get().audioRitual.chant.bannerDurationSec || 12
          });
        }
        if (this.configStore.get().audioRitual.chant.enabled) {
          this.audioQueue.enqueue({
            text: chantText,
            priority: 3,
            tag: 'chant',
            options: this._getTtsVoiceOptions()
          });
        }
      }
    });

    // 5. Initialize Ingestion Adapters
    this.adminAdapter = new AdminManualAdapter({
      onEvent: (event) => this.handleCanonicalEvent(event)
    });

    this.botSimulator = new MockBotSimulator({
      on: false,
      count: 15,
      pace: 'mid',
      onEvent: (event) => this.handleCanonicalEvent(event)
    });

    this.tiktokAdapter = new TikTokLiveAdapter({
      ...fullCfg.connection,
      onRawEvent: (type, rawData) => this._handleRawTikTokEvent(type, rawData),
      onStatusChange: (statusPayload) => {
        if (statusPayload.likeCount > this.roomTotalLikes) {
          this.roomTotalLikes = statusPayload.likeCount;
        }
        if (this.broadcaster) {
          this.broadcaster.broadcast({
            t: 'tiktok',
            ...statusPayload
          });
        }
        this.addLog(
          `[TikTok] Trạng thái @${statusPayload.uniqueId || '---'}: ${statusPayload.status} ${
            statusPayload.error ? '(' + statusPayload.error + ')' : ''
          }`
        );
      },
      onGiftCatalogLoaded: (gifts) => {
        this.addLog(`[TikTok] Đã đồng bộ danh mục ${gifts.length} quà tặng từ phòng live.`);
        if (this.broadcaster) {
          this.broadcaster.broadcastControlOnly({
            t: 'gift_catalog',
            gifts
          });
        }
      }
    });

    // Subscribe to hot config updates from ConfigStore
    this._unsubscribeConfig = this.configStore.onChange((updatedCfg) => {
      this._applyConfigToEngines(updatedCfg, true);
    });

    // Start liturgical metronome
    this.scheduler.start();
  }

  _getTtsVoiceOptions() {
    const tts = this.configStore.get().audioRitual.tts;
    return {
      voice: tts.voice,
      pitch: `${tts.pitch}Hz`,
      rate: `${tts.rate}%`
    };
  }

  /**
   * Synchronize all sub-engines whenever ConfigStore changes (0-downtime hot reload)
   * @private
   */
  _applyConfigToEngines(cfg, shouldBroadcast = true) {
    this.settings = toLegacyRoomSettings(cfg);

    // Ingestion
    this.tiktokAdapter.updateConnectionConfig(cfg.connection);

    // Moderation & Coalescer
    this.normalizer.configure(cfg.commentFlows);
    this.coalescer.configure({
      debounceMs: cfg.giftFlows.general.comboDebounceMs,
      tiers: cfg.giftFlows.tiers
    });
    this.prayerCache.configure(cfg.commentFlows.prayerCache);

    // Seating
    this.seatingEngine.setSeatMode(cfg.sceneSeating.seating.seatMode);
    this.seatingEngine.setDonorIdleMinutes(cfg.sceneSeating.seating.donorIdleEvictMin);

    // Audio & Scheduler
    this.ttsEngine.voice = cfg.audioRitual.tts.voice;
    this.ttsEngine.pitch = `${cfg.audioRitual.tts.pitch}Hz`;
    this.ttsEngine.rate = `${cfg.audioRitual.tts.rate}%`;
    this.audioQueue.setMaxQueueSize(cfg.audioRitual.tts.maxQueueSize || 10);

    this.scheduler.setMoBpm(cfg.audioRitual.mo.bpm);
    this.scheduler.setMoEnabled(cfg.audioRitual.mo.enabled);
    this.scheduler.setChantInterval(cfg.audioRitual.chant.everyMin);
    this.scheduler.setAutoChantEnabled(cfg.audioRitual.chant.enabled);
    this.scheduler.setChantItems(cfg.audioRitual.chant.items);

    if (shouldBroadcast && this.broadcaster) {
      this.broadcaster.broadcast({
        t: 'settings',
        settings: this.settings,
        cap: this.seatingEngine.capacity
      });
      this.broadcaster.broadcastControlOnly({
        t: 'config',
        config: cfg
      });
    }
  }

  setBroadcaster(broadcaster) {
    this.broadcaster = broadcaster;
  }

  getFullConfig() {
    return this.configStore.get();
  }

  getTtsQueueStatus() {
    return this.audioQueue.getStatus();
  }

  getRecentGifts() {
    return [...this.recentGifts];
  }

  getSessionStats() {
    return {
      ...this.sessionStats,
      roomTotalLikes: this.roomTotalLikes,
      seatedCount: this.seatingEngine.viewers.size,
      capacity: this.seatingEngine.capacity,
      topDonors: this.leaderboard.getTop(10),
      recentGifts: this.recentGifts.slice(0, 15)
    };
  }

  _broadcastSessionStats() {
    if (this.broadcaster) {
      this.broadcaster.broadcastControlOnly({
        t: 'session_stats',
        ...this.getSessionStats()
      });
    }
  }

  addLog(line) {
    const timestamp = new Date().toLocaleTimeString('vi-VN');
    const entry = `[${timestamp}] ${line}`;
    this.logs.push(entry);
    if (this.logs.length > 300) {
      this.logs.shift();
    }
    if (this.broadcaster) {
      this.broadcaster.broadcastControlOnly({
        t: 'log',
        line: entry
      });
    }
  }

  getRecentLogs() {
    return [...this.logs];
  }

  getBotStatus() {
    return this.botSimulator.getStatus();
  }

  /**
   * Ensure a user is seated (or update existing seat) and broadcast join/eviction
   * @private
   */
  _ensureViewerSeated(event, options = {}) {
    let viewer = this.seatingEngine.viewers.get(event.userId);
    if (!viewer) {
      const { slotIndex, evicted } = this.seatingEngine.assignSeat({
        id: event.userId,
        name: event.nickname,
        skin: options.skin || this.configStore.get().sceneSeating.seating.defaultSkin || 'man',
        avatar: event.avatarUrl,
        coins: Number(options.initialCoins) || 0,
        isVip: Boolean(options.grantVip),
        demo: event.source === 'bot'
      });

      if (evicted && this.broadcaster) {
        this.broadcaster.broadcast({
          t: 'leave',
          id: evicted.id,
          slotIndex: evicted.slotIndex,
          reason: evicted.reason
        });
      }

      if (slotIndex !== -1) {
        viewer = this.seatingEngine.slots[slotIndex];
        if (options.grantVip) {
          this.seatingEngine.setVip(slotIndex, true);
        }
        if (this.broadcaster && viewer) {
          this.broadcaster.broadcast({
            t: 'join',
            v: { ...viewer },
            cap: this.seatingEngine.capacity
          });
        }
      }
    } else {
      this.seatingEngine.touchActivity(event.userId);
      if (options.bonusCoins && options.bonusCoins > 0) {
        this.seatingEngine.addCoins(event.userId, options.bonusCoins);
      }
      if (options.grantVip) {
        this.seatingEngine.setVip(viewer.slotIndex, true);
      }
      if (options.forceSkin) {
        this.seatingEngine.setSkin(event.userId, options.forceSkin);
        if (this.broadcaster) {
          this.broadcaster.broadcast({
            t: 'skin',
            id: event.userId,
            skin: options.forceSkin
          });
        }
      }
      viewer = this.seatingEngine.viewers.get(event.userId);
    }
    return viewer;
  }

  /**
   * Dispatch configured SFX, particles, halo, bow, and banners to Overlay & Control
   * @private
   */
  _dispatchFlowEffects(fx) {
    if (!this.broadcaster) return;

    if (fx.sfx === 'great_bell') {
      this.broadcaster.broadcast({ t: 'bell', isGreatBell: true });
    } else if (fx.sfx === 'small_bell') {
      this.broadcaster.broadcast({ t: 'bell', isGreatBell: false });
    } else if (fx.sfx === 'mo') {
      this.broadcaster.broadcast({ t: 'mo', roundRobinIndex: 1 });
    }

    const hasCustomOverlayFx =
      fx.pulseHalo ||
      fx.allBow ||
      fx.bowUserId ||
      fx.rainPetals ||
      (fx.particleTier && fx.slotIndex >= 0) ||
      fx.showBanner ||
      fx.sfx === 'tier1_chime' ||
      fx.sfx === 'tier2_chime';

    if (hasCustomOverlayFx) {
      this.broadcaster.broadcast({
        t: 'fx',
        slotIndex: fx.slotIndex ?? -1,
        userId: fx.bowUserId || '',
        particleTier: fx.particleTier || 0,
        pulseHalo: Boolean(fx.pulseHalo),
        allBow: Boolean(fx.allBow),
        rainPetals: Boolean(fx.rainPetals),
        rainCount: fx.rainCount || 32,
        chime: fx.sfx === 'tier1_chime' || fx.sfx === 'tier2_chime' ? fx.sfx : '',
        banner: fx.showBanner
          ? {
              title: fx.bannerTitle || 'ĐẠI LỄ CHÁNH ĐIỆN',
              donor: fx.bannerDonor || '',
              subtitle: fx.bannerSubtitle || '',
              prayer: fx.bannerPrayer || '',
              durationSec: fx.bannerDurationSec || 8
            }
          : null
      });
    }
  }

  /**
   * Raw TikTok event ingestion dispatcher
   * @private
   */
  _handleRawTikTokEvent(type, rawData) {
    let canonical = null;
    switch (type) {
      case 'chat':
        canonical = this.normalizer.normalizeTikTokChat(rawData);
        if (canonical && !this.normalizer.checkChatRateLimit(canonical.userId)) {
          return;
        }
        break;
      case 'gift':
        canonical = this.normalizer.normalizeTikTokGift(rawData);
        break;
      case 'like':
        canonical = this.normalizer.normalizeTikTokLike(rawData);
        break;
      case 'member':
        canonical = this.normalizer.normalizeTikTokMember(rawData);
        break;
      case 'follow':
        canonical = this.normalizer.normalizeTikTokFollow(rawData);
        break;
      case 'share':
        canonical = this.normalizer.normalizeTikTokShare(rawData);
        break;
      case 'subNotify':
        canonical = this.normalizer.normalizeTikTokSubscribe(rawData);
        break;
      case 'envelope':
        canonical = this.normalizer.normalizeTikTokEnvelope(rawData);
        break;
      case 'emote':
        canonical = this.normalizer.normalizeTikTokEmote(rawData);
        break;
      default:
        break;
    }

    if (canonical) {
      this.handleCanonicalEvent(canonical);
    }
  }

  /**
   * Dispatch canonical event through EventFlowEngine, state engines, and broadcaster
   * @param {import('../broadcaster/MessageSchemas.mjs').CanonicalAppEvent} event
   */
  handleCanonicalEvent(event) {
    if (!event || !event.type) return;

    // 1. CHAT EVENT FLOW
    if (event.type === 'chat') {
      const text = event.payload.text;
      this.sessionStats.totalChats++;

      const existingViewer = this.seatingEngine.viewers.get(event.userId) || null;
      const chatPlan = this.flowEngine.evaluateChat(event, existingViewer);
      if (!chatPlan.handled) return;

      this.prayerCache.recordPrayer(event.userId, text);

      const resolvedSkin = chatPlan.forceSkin || event.payload.detectedSkin || event.payload.skin;
      let viewer = existingViewer;

      if (!viewer && chatPlan.seatOnChat) {
        viewer = this._ensureViewerSeated(event, {
          skin: resolvedSkin || chatPlan.defaultSkin || 'man',
          initialCoins: chatPlan.bonusCoins || 0
        });
      } else if (viewer) {
        this.seatingEngine.touchActivity(event.userId);
        if (chatPlan.bonusCoins > 0) {
          this.seatingEngine.addCoins(event.userId, chatPlan.bonusCoins);
          this.leaderboard.recordDonation({ id: event.userId, name: event.nickname, avatar: event.avatarUrl }, chatPlan.bonusCoins);
        }
        if (resolvedSkin && resolvedSkin !== viewer.skin) {
          this.seatingEngine.setSkin(event.userId, resolvedSkin);
          if (this.broadcaster) {
            this.broadcaster.broadcast({
              t: 'skin',
              id: event.userId,
              skin: resolvedSkin
            });
          }
        }
      }

      if (this.broadcaster) {
        this.broadcaster.broadcast({
          t: 'chat',
          id: event.userId,
          name: event.nickname,
          text,
          showBubble: chatPlan.showBubble,
          bubbleDurationSec: chatPlan.bubbleDurationSec,
          bow: chatPlan.bow,
          slotIndex: viewer ? viewer.slotIndex : -1
        });
      }

      if (
        chatPlan.allBow ||
        chatPlan.pulseHalo ||
        chatPlan.particleTier > 0 ||
        (chatPlan.sfx && chatPlan.sfx !== 'none')
      ) {
        this._dispatchFlowEffects({
          slotIndex: viewer ? viewer.slotIndex : -1,
          particleTier: chatPlan.particleTier,
          pulseHalo: chatPlan.pulseHalo,
          allBow: chatPlan.allBow,
          sfx: chatPlan.sfx
        });
      }

      if (chatPlan.showChantBanner && this.broadcaster) {
        this.broadcaster.broadcast({ t: 'chant', text });
      }

      if (chatPlan.ttsText) {
        this.audioQueue.enqueue({
          text: chatPlan.ttsText,
          priority: chatPlan.ttsPriority,
          tag: 'keyword',
          id: event.userId,
          options: this._getTtsVoiceOptions()
        });
      }

      this.addLog(`💬 @${event.nickname}: ${text}`);
      this._broadcastSessionStats();
      return;
    }

    // 2. GIFT EVENT FLOW
    if (event.type === 'gift') {
      if (this.configStore.get().giftFlows.general.enabled === false) return;
      this.coalescer.processGift(event);
      return;
    }

    // 3. LIKE & LIKE MILESTONE EVENT FLOW
    if (event.type === 'like') {
      const count = Number(event.payload.count) || 1;
      const prevTotal = this.roomTotalLikes;
      if (event.payload.totalLikes && event.payload.totalLikes > this.roomTotalLikes) {
        this.roomTotalLikes = Number(event.payload.totalLikes);
      } else {
        this.roomTotalLikes += count;
      }
      this.sessionStats.totalLikes += count;

      const likePlan = this.flowEngine.evaluateLike(event, prevTotal, this.roomTotalLikes);
      let viewer = this.seatingEngine.viewers.get(event.userId);

      if (viewer && likePlan.touchActivity) {
        this.seatingEngine.touchActivity(event.userId);
      } else if (!viewer && (likePlan.shouldSeat || this.settings.joinOnEnter)) {
        viewer = this._ensureViewerSeated(event, {
          skin: event.payload.skin || 'woman'
        });
      }

      if (likePlan.handled && this.broadcaster) {
        this.broadcaster.broadcast({
          t: 'like',
          id: event.userId,
          n: count,
          totalLikes: this.roomTotalLikes,
          particleTier: likePlan.particleTier,
          bow: likePlan.bow,
          slotIndex: viewer ? viewer.slotIndex : -1
        });
      }

      if (likePlan.milestone) {
        const ms = likePlan.milestone;
        this._dispatchFlowEffects({
          sfx: ms.sfx,
          pulseHalo: ms.pulseHalo,
          allBow: ms.allBow,
          rainPetals: ms.rainPetals,
          rainCount: ms.rainCount,
          showBanner: ms.showBanner,
          bannerTitle: ms.bannerTitle,
          bannerDonor: `Cột Mốc ${ms.threshold.toLocaleString('vi-VN')} Tim`,
          bannerSubtitle: 'Đại chúng đồng lòng hướng về Tam Bảo',
          bannerDurationSec: ms.bannerDurationSec
        });

        if (ms.ttsText) {
          this.audioQueue.enqueue({
            text: ms.ttsText,
            priority: ms.ttsPriority,
            tag: 'milestone',
            options: this._getTtsVoiceOptions()
          });
        }
        this.addLog(`❤️ [CỘT MỐC TIM] Chánh điện đạt ${ms.threshold.toLocaleString('vi-VN')} lượt tim!`);
      }

      this._broadcastSessionStats();
      return;
    }

    // 4. MEMBER JOIN EVENT FLOW
    if (event.type === 'member') {
      this.sessionStats.totalMembers++;
      const isSeated = this.seatingEngine.viewers.has(event.userId);
      const joinPlan = this.flowEngine.evaluateMemberJoin(event, {
        seatedCount: this.seatingEngine.viewers.size,
        capacity: this.seatingEngine.capacity,
        isSeated
      });
      if (!joinPlan.handled) return;

      let viewer = this.seatingEngine.viewers.get(event.userId);
      if (joinPlan.shouldSeat && !viewer) {
        viewer = this._ensureViewerSeated(event, { skin: joinPlan.skin });
      }

      if (viewer && joinPlan.welcomeBubble && this.broadcaster) {
        this.broadcaster.broadcast({
          t: 'chat',
          id: event.userId,
          name: event.nickname,
          text: joinPlan.welcomeBubble,
          bow: joinPlan.bow,
          slotIndex: viewer.slotIndex
        });
      } else if (viewer && (joinPlan.bow || joinPlan.particleTier > 0)) {
        this._dispatchFlowEffects({
          slotIndex: viewer.slotIndex,
          bowUserId: joinPlan.bow ? event.userId : '',
          particleTier: joinPlan.particleTier
        });
      }

      this.addLog(`🚪 @${event.nickname} bước vào chánh điện.`);
      this._broadcastSessionStats();
      return;
    }

    // 5. FOLLOW EVENT FLOW
    if (event.type === 'follow') {
      this.sessionStats.totalFollows++;
      const plan = this.flowEngine.evaluateFollow(event);
      if (!plan.handled) return;

      let viewer = this.seatingEngine.viewers.get(event.userId);
      if (plan.shouldSeat) {
        viewer = this._ensureViewerSeated(event, {
          initialCoins: plan.bonusCoins,
          bonusCoins: plan.bonusCoins
        });
      } else if (viewer && plan.bonusCoins > 0) {
        this.seatingEngine.addCoins(event.userId, plan.bonusCoins);
      }
      if (plan.bonusCoins > 0) {
        this.leaderboard.recordDonation({ id: event.userId, name: event.nickname, avatar: event.avatarUrl }, plan.bonusCoins);
      }

      this._dispatchFlowEffects({
        slotIndex: viewer ? viewer.slotIndex : -1,
        bowUserId: plan.bow ? event.userId : '',
        particleTier: plan.particleTier,
        sfx: plan.sfx
      });

      if (plan.ttsText) {
        this.audioQueue.enqueue({
          text: plan.ttsText,
          priority: plan.ttsPriority,
          tag: 'follow',
          id: event.userId,
          options: this._getTtsVoiceOptions()
        });
      }

      this.addLog(`✨ @${event.nickname} vừa theo dõi (Follow) kênh chánh điện.`);
      this._broadcastSessionStats();
      return;
    }

    // 6. SHARE EVENT FLOW
    if (event.type === 'share') {
      this.sessionStats.totalShares++;
      const plan = this.flowEngine.evaluateShare(event);
      if (!plan.handled) return;

      let viewer = this.seatingEngine.viewers.get(event.userId);
      if (plan.shouldSeat) {
        viewer = this._ensureViewerSeated(event, {
          initialCoins: plan.bonusCoins,
          bonusCoins: plan.bonusCoins
        });
      } else if (viewer && plan.bonusCoins > 0) {
        this.seatingEngine.addCoins(event.userId, plan.bonusCoins);
      }
      if (plan.bonusCoins > 0) {
        this.leaderboard.recordDonation({ id: event.userId, name: event.nickname, avatar: event.avatarUrl }, plan.bonusCoins);
      }

      this._dispatchFlowEffects({
        slotIndex: viewer ? viewer.slotIndex : -1,
        bowUserId: plan.bow ? event.userId : '',
        particleTier: plan.particleTier,
        sfx: plan.sfx
      });

      if (plan.ttsText) {
        this.audioQueue.enqueue({
          text: plan.ttsText,
          priority: plan.ttsPriority,
          tag: 'share',
          id: event.userId,
          options: this._getTtsVoiceOptions()
        });
      }

      this.addLog(`🔗 @${event.nickname} đã gieo duyên chia sẻ livestream.`);
      this._broadcastSessionStats();
      return;
    }

    // 7. SUBSCRIBE / SUPERFAN EVENT FLOW
    if (event.type === 'subscribe') {
      const plan = this.flowEngine.evaluateSubscribe(event);
      if (!plan.handled) return;

      const viewer = plan.shouldSeat
        ? this._ensureViewerSeated(event, {
            initialCoins: plan.bonusCoins,
            bonusCoins: plan.bonusCoins,
            grantVip: plan.grantVip,
            forceSkin: plan.forceSkin || undefined
          })
        : this.seatingEngine.viewers.get(event.userId);

      if (plan.bonusCoins > 0) {
        this.leaderboard.recordDonation({ id: event.userId, name: event.nickname, avatar: event.avatarUrl }, plan.bonusCoins);
      }

      this._dispatchFlowEffects({
        slotIndex: viewer ? viewer.slotIndex : -1,
        particleTier: plan.particleTier,
        sfx: plan.sfx,
        pulseHalo: plan.pulseHalo,
        allBow: plan.allBow,
        showBanner: plan.showBanner,
        bannerTitle: plan.bannerTitle,
        bannerDonor: `Phật tử ${event.nickname}`,
        bannerSubtitle: 'Đăng ký Hộ Pháp Chánh Điện',
        bannerDurationSec: plan.bannerDurationSec
      });

      if (plan.ttsText) {
        this.audioQueue.enqueue({
          text: plan.ttsText,
          priority: plan.ttsPriority,
          tag: 'subscribe',
          id: event.userId,
          options: this._getTtsVoiceOptions()
        });
      }

      this.addLog(`👑 @${event.nickname} đã đăng ký Hộ Pháp (Subscribe)!`);
      this._broadcastSessionStats();
      return;
    }

    // 8. ENVELOPE (TREASURE BOX) EVENT FLOW
    if (event.type === 'envelope') {
      const plan = this.flowEngine.evaluateEnvelope(event);
      if (!plan.handled) return;

      this._dispatchFlowEffects({
        sfx: plan.sfx,
        pulseHalo: plan.pulseHalo,
        rainPetals: plan.rainPetals,
        showBanner: plan.showBanner,
        bannerTitle: plan.bannerTitle,
        bannerDonor: `Phật tử ${event.nickname}`,
        bannerSubtitle: 'Gieo duyên Túi Lộc Phước Báu',
        bannerDurationSec: plan.bannerDurationSec
      });

      if (plan.ttsText) {
        this.audioQueue.enqueue({
          text: plan.ttsText,
          priority: plan.ttsPriority,
          tag: 'envelope',
          id: event.userId,
          options: this._getTtsVoiceOptions()
        });
      }

      this.addLog(`🧧 @${event.nickname} phát túi lộc phước báu trên phòng live.`);
    }
  }

  /**
   * Handle intermediate gift hit (light particles only, no TTS)
   * @private
   */
  _handleIntermediateGift(data) {
    if (this.configStore.get().giftFlows.general.intermediateParticles === false) return;

    let viewer = this.seatingEngine.viewers.get(data.userId);
    if (!viewer) {
      viewer = this._ensureViewerSeated({
        userId: data.userId,
        nickname: data.nickname,
        avatarUrl: data.avatarUrl,
        source: 'tiktok'
      });
    }

    if (this.broadcaster) {
      this.broadcaster.broadcast({
        t: 'gift',
        id: data.userId,
        name: data.nickname,
        giftName: data.giftName,
        giftId: data.giftId,
        count: data.count,
        coins: data.diamondsEach,
        total: data.count * data.diamondsEach,
        tier: 1,
        prayer: '',
        repeatEnd: false,
        comboCount: data.comboCount,
        isCombo: true,
        slotIndex: viewer ? viewer.slotIndex : -1
      });
    }
  }

  /**
   * Handle finalized combo or single gift using EventFlowEngine plan
   * @private
   */
  _handleFinalizedGift(finalGift) {
    const prayer = finalGift.prayer || this.prayerCache.getPrayer(finalGift.userId);
    const giftPlan = this.flowEngine.resolveGiftPlan(finalGift, prayer);
    const creditedCoins = giftPlan.effectiveMeritCoins;

    this.sessionStats.totalGifts += finalGift.count || 1;
    this.sessionStats.totalDiamonds += creditedCoins;

    // 1. Ensure user has a seat & apply VIP / skin / coins
    let viewer = this.seatingEngine.viewers.get(finalGift.userId);
    if (!viewer) {
      viewer = this._ensureViewerSeated(
        {
          userId: finalGift.userId,
          nickname: finalGift.nickname,
          avatarUrl: finalGift.avatarUrl,
          source: 'tiktok'
        },
        {
          skin: giftPlan.forceSkin || 'man',
          initialCoins: creditedCoins,
          grantVip: giftPlan.grantVip
        }
      );
    } else {
      this.seatingEngine.addCoins(finalGift.userId, creditedCoins);
      if (giftPlan.grantVip) {
        this.seatingEngine.setVip(viewer.slotIndex, true);
      }
      if (giftPlan.forceSkin && giftPlan.forceSkin !== viewer.skin) {
        this.seatingEngine.setSkin(finalGift.userId, giftPlan.forceSkin);
        if (this.broadcaster) {
          this.broadcaster.broadcast({
            t: 'skin',
            id: finalGift.userId,
            skin: giftPlan.forceSkin
          });
        }
      }
      viewer = this.seatingEngine.viewers.get(finalGift.userId);
    }

    // 2. Record donation in leaderboard
    this.leaderboard.recordDonation(
      {
        id: finalGift.userId,
        name: finalGift.nickname,
        avatar: finalGift.avatarUrl
      },
      creditedCoins
    );

    // 3. Save in recentGifts history for Live Manager & 1-click TTS Replay
    const giftRecord = {
      recordId: `grec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      userId: finalGift.userId,
      name: finalGift.nickname,
      giftId: finalGift.giftId,
      giftName: finalGift.giftName,
      count: finalGift.count,
      coinsEach: finalGift.diamondsEach,
      totalCoins: creditedCoins,
      tier: giftPlan.tierLevel,
      prayer,
      ttsText:
        giftPlan.ttsText ||
        `Nam mô A Di Đà Phật. Phật tử ${finalGift.nickname} thành tâm cúng dường ${finalGift.giftName}. ${prayer}`
    };
    this.recentGifts.unshift(giftRecord);
    if (this.recentGifts.length > 30) {
      this.recentGifts.pop();
    }

    // 4. Broadcast finalized gift
    if (this.broadcaster) {
      this.broadcaster.broadcast({
        t: 'gift',
        id: finalGift.userId,
        name: finalGift.nickname,
        giftName: finalGift.giftName,
        giftId: finalGift.giftId,
        count: finalGift.count,
        coins: finalGift.diamondsEach,
        total: creditedCoins,
        tier: giftPlan.particleTier,
        tierLevel: giftPlan.tierLevel,
        sfx: giftPlan.sfx,
        pulseHalo: giftPlan.pulseHalo,
        allBow: giftPlan.allBow,
        rainPetals: giftPlan.rainPetals,
        showBanner: giftPlan.showBanner,
        bannerTitle: giftPlan.bannerTitle,
        bannerDurationSec: giftPlan.bannerDurationSec,
        prayer,
        ttsText: giftRecord.ttsText,
        repeatEnd: true,
        comboCount: finalGift.comboCount,
        isCombo: finalGift.isCombo,
        slotIndex: viewer ? viewer.slotIndex : -1
      });

      if (giftPlan.sfx === 'great_bell') {
        this.broadcaster.broadcast({
          t: 'bell',
          isGreatBell: true
        });
      } else if (giftPlan.sfx === 'small_bell') {
        this.broadcaster.broadcast({
          t: 'bell',
          isGreatBell: false
        });
      }
    }

    // 5. Enqueue TTS Announcement
    if (giftPlan.ttsText) {
      this.audioQueue.enqueue({
        text: giftPlan.ttsText,
        priority: giftPlan.ttsPriority,
        tag: 'gift',
        id: finalGift.userId,
        options: this._getTtsVoiceOptions()
      });
    }

    this.addLog(
      `🎁 ${finalGift.nickname} cúng dường ${finalGift.giftName} x${finalGift.count} (+${creditedCoins} xu). Lời nguyện: ${prayer}`
    );
    this._broadcastSessionStats();
  }

  /**
   * Reset session telemetry, leaderboard, and optionally clear seats
   * @param {{ clearSeats?: boolean }} [opts]
   */
  resetSession(opts = {}) {
    this.leaderboard.reset();
    this.flowEngine.resetSessionState();
    this.recentGifts = [];
    this.roomTotalLikes = 0;
    this.startedAt = Date.now();
    this.sessionStats = {
      sessionStartedAt: Date.now(),
      totalChats: 0,
      totalGifts: 0,
      totalDiamonds: 0,
      totalLikes: 0,
      totalMembers: 0,
      totalFollows: 0,
      totalShares: 0
    };

    if (opts.clearSeats) {
      this.seatingEngine.clearAll();
    } else {
      // Reset coins on currently seated viewers for fresh session ranking
      for (const v of this.seatingEngine.viewers.values()) {
        v.coins = 0;
        if (this.seatingEngine.slots[v.slotIndex]) {
          this.seatingEngine.slots[v.slotIndex].coins = 0;
        }
      }
    }

    if (this.broadcaster) {
      this.broadcaster.broadcast(this.getSnapshot());
    }
    this._broadcastSessionStats();
    this.addLog('[Live Manager] Đã làm mới thống kê phiên live & Bảng Vàng Công Đức.');
  }

  /**
   * Export Merit Leaderboard as UTF-8 CSV (with BOM for Excel compatibility)
   */
  exportDonorsCsv() {
    const allSorted = Array.from(this.leaderboard.donors.values()).sort((a, b) => b.coins - a.coins);
    const header = '\uFEFFHạng,User ID,Tên Phật Tử,Tổng Xu Công Đức\n';
    const rows = allSorted.map((d, idx) => {
      const safeName = `"${String(d.name || '').replace(/"/g, '""')}"`;
      return `${idx + 1},"${d.id}",${safeName},${d.coins}`;
    });
    return header + rows.join('\n');
  }

  /**
   * Handle incoming control command from Admin Dashboard / Live Manager
   * @param {Object} msg { t: 'ctl', cmd: string, ... }
   */
  handleControlCommand(msg) {
    const cmd = msg.cmd.toLowerCase();

    switch (cmd) {
      case 'connect':
        this.tiktokAdapter.connect(msg.uniqueId, msg.roomId);
        break;

      case 'disconnect':
        this.tiktokAdapter.disconnect();
        break;

      case 'chat':
        this.adminAdapter.injectChat(msg.text, msg.name, msg.id);
        break;

      case 'gift':
        this.adminAdapter.injectGift(msg.diamonds, msg.name, msg.gift, msg.count, msg.prayer, msg.id, msg.giftId);
        break;

      case 'like':
        this.adminAdapter.injectLike(msg.count || msg.n || 20, msg.name, msg.id, msg.totalLikes);
        break;

      case 'test_event': {
        const evType = String(msg.eventType || '').toLowerCase();
        const name = msg.name || 'Phật Tử Thử Nghiệm';
        if (evType === 'chat') {
          this.adminAdapter.injectChat(msg.text || 'Nam mô A Di Đà Phật', name, msg.id);
        } else if (evType === 'gift') {
          this.adminAdapter.injectGift(msg.diamonds || 30, name, msg.gift || 'Đèn Hoa Sen', msg.count || 1, msg.prayer, msg.id, msg.giftId);
        } else if (evType === 'like') {
          this.adminAdapter.injectLike(msg.count || 25, name, msg.id);
        } else if (evType === 'like_milestone') {
          const step = this.configStore.get().likeFlows?.milestones?.everyNLikes || 1000;
          const nextTarget = (Math.floor(this.roomTotalLikes / step) + 1) * step;
          this.adminAdapter.injectLike(50, name, msg.id, nextTarget);
        } else if (['member', 'follow', 'share', 'subscribe', 'envelope'].includes(evType)) {
          this.adminAdapter.injectSocialOrPresence(evType, name, msg.id);
        }
        break;
      }

      case 'fill': {
        const added = this.seatingEngine.fillDemo(Number(msg.n) || 24);
        if (this.broadcaster) {
          this.broadcaster.broadcast(this.getSnapshot());
        }
        this.addLog(`[Admin] Đổ dữ liệu mẫu: ${added.length} Phật tử.`);
        break;
      }

      case 'clear':
        this.seatingEngine.clearAll();
        if (this.broadcaster) {
          this.broadcaster.broadcast(this.getSnapshot());
        }
        this.addLog('[Admin] Đã làm trống toàn bộ bồ đoàn.');
        break;

      case 'bot':
      case 'bots':
        this.botSimulator.updateSettings({
          on: msg.on,
          count: msg.n || msg.count,
          pace: msg.pace
        });
        if (this.broadcaster) {
          this.broadcaster.broadcastControlOnly({
            t: 'bots',
            ...this.botSimulator.getStatus()
          });
        }
        this.addLog(`[Bot] ${msg.on ? 'BẬT' : 'TẮT'} động cơ bot. Số lượng: ${this.botSimulator.count}, Tốc độ: ${this.botSimulator.pace}`);
        break;

      case 'skin':
        this.seatingEngine.setSkin(msg.id, msg.skin);
        if (this.broadcaster) {
          this.broadcaster.broadcast({
            t: 'skin',
            id: msg.id,
            skin: msg.skin
          });
        }
        break;

      case 'kick': {
        const evicted = this.seatingEngine.freeUser(msg.id, 'kicked_by_admin');
        if (evicted && this.broadcaster) {
          this.broadcaster.broadcast({
            t: 'leave',
            id: evicted.id,
            slotIndex: evicted.slotIndex,
            reason: 'kicked'
          });
        }
        this.addLog(`[Admin] Đã kick user ${msg.id}`);
        break;
      }

      case 'slot':
        if (msg.action === 'vip') {
          this.seatingEngine.setVip(msg.slotIndex, true);
        } else if (msg.action === 'lock') {
          const evicted = this.seatingEngine.setLock(msg.slotIndex, true);
          if (evicted && this.broadcaster) {
            this.broadcaster.broadcast({
              t: 'leave',
              id: evicted.id,
              slotIndex: evicted.slotIndex,
              reason: 'admin_lock'
            });
          }
        } else if (msg.action === 'unlock') {
          this.seatingEngine.setLock(msg.slotIndex, false);
          this.seatingEngine.setVip(msg.slotIndex, false);
        }
        if (this.broadcaster) {
          this.broadcaster.broadcast(this.getSnapshot());
        }
        break;

      case 'adjust_coins': {
        const delta = Number(msg.delta || msg.coins || 0);
        if (msg.id && delta !== 0) {
          this.seatingEngine.addCoins(msg.id, delta);
          const v = this.seatingEngine.viewers.get(msg.id);
          if (delta > 0 && v) {
            this.leaderboard.recordDonation({ id: v.id, name: v.name, avatar: v.avatar }, delta);
          }
          if (this.broadcaster) {
            this.broadcaster.broadcast(this.getSnapshot());
          }
          this._broadcastSessionStats();
          this.addLog(`[Admin] Điều chỉnh xu cho ${msg.id}: ${delta > 0 ? '+' : ''}${delta} xu.`);
        }
        break;
      }

      case 'bell':
        if (this.broadcaster) {
          this.broadcaster.broadcast({
            t: 'bell',
            isGreatBell: Boolean(msg.isGreatBell || msg.great)
          });
        }
        this.addLog('[Admin] Thỉnh chuông chùa.');
        break;

      case 'mo':
        this.scheduler.triggerMoManual();
        this.addLog('[Admin] Gõ mõ thủ công.');
        break;

      case 'chant':
        this.scheduler.triggerChantManual(msg.text);
        this.addLog(`[Admin] Kích hoạt tụng kinh: ${msg.text || 'mặc định'}`);
        break;

      case 'tts':
      case 'say':
        if (msg.text) {
          this.audioQueue.enqueue({
            text: msg.text,
            priority: 1,
            tag: 'say',
            options: {
              voice: msg.voice || this.settings.voice,
              pitch: msg.pitch !== undefined ? `${msg.pitch}Hz` : `${this.settings.pitch}Hz`,
              rate: msg.rate !== undefined ? `${msg.rate}%` : `${this.settings.rate}%`
            }
          });
          this.addLog(`[Admin] Phát thanh thông báo: ${msg.text}`);
        }
        break;

      case 'tts_queue': {
        const action = String(msg.action || '').toLowerCase();
        if (action === 'pause') {
          this.audioQueue.pause();
          this.addLog('[TTS Queue] Đã tạm dừng hàng đợi đọc TTS.');
        } else if (action === 'resume') {
          this.audioQueue.resume();
          this.addLog('[TTS Queue] Đã tiếp tục hàng đợi đọc TTS.');
        } else if (action === 'skip') {
          this.audioQueue.skipCurrent();
          this.addLog('[TTS Queue] Đã bỏ qua câu TTS đang đọc.');
        } else if (action === 'clear') {
          this.audioQueue.clear();
          if (this.broadcaster) {
            this.broadcaster.broadcastOverlayOnly({ t: 'tts_stop', reason: 'clear' });
          }
          this.addLog('[TTS Queue] Đã xóa sạch hàng đợi TTS.');
        } else if (action === 'mute') {
          this.audioQueue.setMuted(true);
          this.addLog('[TTS Queue] 🔇 BẬT TẮT TIẾNG KHẨN CẤP (PANIC MUTE).');
        } else if (action === 'unmute') {
          this.audioQueue.setMuted(false);
          this.addLog('[TTS Queue] 🔊 Đã mở lại tiếng đọc TTS.');
        } else if (action === 'replay') {
          const target = msg.itemId || msg.text;
          if (target) {
            this.audioQueue.replay(target);
            this.addLog('[TTS Queue] 🔁 Phát lại lời nguyện/thông báo TTS.');
          }
        }
        break;
      }

      case 'settings':
        if (msg.settings) {
          const patch = fromLegacySettingsPatch(msg.settings);
          this.configStore.update(patch);
          this.addLog('[Admin] Cập nhật cấu hình nhanh phòng live.');
        }
        break;

      case 'update_config':
        if (msg.config && typeof msg.config === 'object') {
          this.configStore.update(msg.config);
          this.addLog('[Admin Config] Đã lưu và áp dụng cấu hình toàn diện.');
        }
        break;

      case 'apply_preset':
        if (msg.presetId) {
          const applied = this.configStore.applyScenePreset(msg.presetId);
          if (applied) {
            this.addLog(`[Scene Preset] Đã chuyển sang chế độ: ${applied.name}`);
          }
        }
        break;

      case 'reset_session':
        this.resetSession({ clearSeats: Boolean(msg.clearSeats) });
        break;

      case 'title':
        if (msg.title) {
          const plaquePatch = { title: msg.title };
          if (msg.subtitle !== undefined) plaquePatch.subtitle = msg.subtitle;
          this.configStore.update({
            sceneSeating: { plaque: plaquePatch }
          });
          this.addLog(`[Admin] Đổi hoành phi: ${msg.title}`);
        }
        break;

      default:
        console.warn(`[StateManager] Unhandled command: ${cmd}`);
        break;
    }
  }

  /**
   * Get complete state snapshot for initial sync (<50ms)
   * @returns {import('../broadcaster/MessageSchemas.mjs').ServerToClientMessage}
   */
  getSnapshot() {
    const tiktokStatus = this.tiktokAdapter.getStatus();
    if (this.roomTotalLikes > tiktokStatus.likeCount) {
      tiktokStatus.likeCount = this.roomTotalLikes;
    }
    return {
      t: 'state',
      settings: { ...this.settings },
      viewers: this.seatingEngine.getSnapshot(),
      cap: this.seatingEngine.capacity,
      startedAt: this.startedAt,
      tiktok: tiktokStatus,
      topDonors: this.leaderboard.getTop(10)
    };
  }

  /**
   * Graceful shutdown of all sub-engines
   */
  async destroy() {
    if (this._unsubscribeConfig) {
      this._unsubscribeConfig();
      this._unsubscribeConfig = null;
    }
    this.scheduler.stop();
    this.botSimulator.stop();
    this.audioQueue.clear();
    await this.tiktokAdapter.disconnect();
  }
}

export default StateManager;
