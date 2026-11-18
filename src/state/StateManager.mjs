import { SeatingEngine } from './SeatingEngine.mjs';
import { PrayerCache } from './PrayerCache.mjs';
import { MeritLeaderboard } from './MeritLeaderboard.mjs';
import { LiturgicalScheduler } from './LiturgicalScheduler.mjs';
import { TtsEngine } from '../audio/TtsEngine.mjs';
import { AudioPriorityQueue } from '../audio/AudioPriorityQueue.mjs';
import { EventNormalizer } from '../moderation/EventNormalizer.mjs';
import { GiftStreakCoalescer } from '../moderation/GiftStreakCoalescer.mjs';
import { MockBotSimulator } from '../ingestion/MockBotSimulator.mjs';
import { AdminManualAdapter } from '../ingestion/AdminManualAdapter.mjs';
import { TikTokLiveAdapter } from '../ingestion/TikTokLiveAdapter.mjs';
import { config } from '../config.mjs';

/**
 * StateManager: Central orchestrator and single source of truth for Chánh Điện Tịnh Tâm.
 * Coordinates Ingestion, Moderation, Seating State, Audio/TTS, and Broadcaster.
 */
export class StateManager {
  /**
   * @param {Object} [options]
   * @param {Object} [options.settings]
   * @param {import('../broadcaster/Broadcaster.mjs').Broadcaster} [options.broadcaster]
   */
  constructor(options = {}) {
    this.settings = {
      ...config.defaultRoomSettings,
      ...(options.settings || {})
    };

    this.startedAt = Date.now();
    this.logs = []; // Max 300 entries
    this.broadcaster = options.broadcaster || null;

    // 1. Initialize Moderation
    this.normalizer = new EventNormalizer();
    this.coalescer = new GiftStreakCoalescer({
      debounceMs: 1500,
      onIntermediate: (data) => this._handleIntermediateGift(data),
      onFlush: (finalGift) => this._handleFinalizedGift(finalGift)
    });

    // 2. Initialize State Sub-engines
    this.seatingEngine = new SeatingEngine({
      seatMode: this.settings.seatMode,
      initialCapacity: 36
    });
    this.prayerCache = new PrayerCache(90000);
    this.leaderboard = new MeritLeaderboard();

    // 3. Initialize Audio & TTS Pipeline
    this.ttsEngine = new TtsEngine({
      voice: this.settings.voice,
      pitch: `${this.settings.pitch}Hz`,
      rate: `${this.settings.rate}%`
    });

    this.audioQueue = new AudioPriorityQueue({
      ttsEngine: this.ttsEngine,
      onPlay: (payload) => {
        if (this.broadcaster) {
          this.broadcaster.broadcastOverlayOnly(payload);
        }
      }
    });

    // 4. Initialize Liturgical Scheduler
    this.scheduler = new LiturgicalScheduler({
      moBpm: this.settings.moBpm,
      chantEveryMin: this.settings.chantEveryMin,
      moEnabled: this.settings.mo,
      autoChantEnabled: this.settings.autoChant,
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
            text: chantText
          });
        }
        if (this.settings.autoChant) {
          this.audioQueue.enqueue({
            text: chantText,
            priority: 3,
            tag: 'chant'
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
      autoReconnect: true,
      onRawEvent: (type, rawData) => this._handleRawTikTokEvent(type, rawData),
      onStatusChange: (statusPayload) => {
        if (this.broadcaster) {
          this.broadcaster.broadcast({
            t: 'tiktok',
            ...statusPayload
          });
        }
        this.addLog(`[TikTok] Trạng thái kết nối: ${statusPayload.status} ${statusPayload.error ? '(' + statusPayload.error + ')' : ''}`);
      }
    });

    // Start liturgical metronome
    this.scheduler.start();
  }

  setBroadcaster(broadcaster) {
    this.broadcaster = broadcaster;
  }

  /**
   * Append log message
   * @param {string} line
   */
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
   * Raw TikTok event ingestion dispatcher
   * @private
   */
  _handleRawTikTokEvent(type, rawData) {
    let canonical = null;
    switch (type) {
      case 'chat':
        canonical = this.normalizer.normalizeTikTokChat(rawData);
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
      default:
        break;
    }

    if (canonical) {
      this.handleCanonicalEvent(canonical);
    }
  }

  /**
   * Dispatch canonical event through state engines and broadcast
   * @param {import('../broadcaster/MessageSchemas.mjs').CanonicalAppEvent} event
   */
  handleCanonicalEvent(event) {
    if (!event || !event.type) return;

    if (event.type === 'chat') {
      const text = event.payload.text;
      // Record prayer into 90s cache
      this.prayerCache.recordPrayer(event.userId, text);

      // Ensure viewer is seated
      let viewer = this.seatingEngine.viewers.get(event.userId);
      if (!viewer) {
        const { slotIndex, evicted } = this.seatingEngine.assignSeat({
          id: event.userId,
          name: event.nickname,
          skin: event.payload.detectedSkin || event.payload.skin || 'man',
          avatar: event.avatarUrl,
          coins: 0,
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
        if (event.payload.detectedSkin) {
          this.seatingEngine.setSkin(event.userId, event.payload.detectedSkin);
          if (this.broadcaster) {
            this.broadcaster.broadcast({
              t: 'skin',
              id: event.userId,
              skin: event.payload.detectedSkin
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
          slotIndex: viewer ? viewer.slotIndex : -1
        });
      }

      this.addLog(`💬 @${event.nickname}: ${text}`);
    } else if (event.type === 'like') {
      const viewer = this.seatingEngine.viewers.get(event.userId);
      if (viewer) {
        this.seatingEngine.touchActivity(event.userId);
      } else if (this.settings.joinOnEnter) {
        const { slotIndex, evicted } = this.seatingEngine.assignSeat({
          id: event.userId,
          name: event.nickname,
          skin: event.payload.skin || 'woman',
          avatar: event.avatarUrl,
          coins: 0,
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
        if (slotIndex !== -1 && this.broadcaster) {
          const v = this.seatingEngine.slots[slotIndex];
          this.broadcaster.broadcast({
            t: 'join',
            v: { ...v },
            cap: this.seatingEngine.capacity
          });
        }
      }

      if (this.broadcaster) {
        this.broadcaster.broadcast({
          t: 'like',
          id: event.userId,
          n: event.payload.count || 1,
          totalLikes: event.payload.totalLikes,
          slotIndex: viewer ? viewer.slotIndex : -1
        });
      }
    } else if (event.type === 'gift') {
      // Pass through GiftStreakCoalescer
      this.coalescer.processGift(event);
    }
  }

  /**
   * Handle intermediate gift hit (light particles only, no TTS)
   * @private
   */
  _handleIntermediateGift(data) {
    let viewer = this.seatingEngine.viewers.get(data.userId);
    if (!viewer) {
      const { slotIndex } = this.seatingEngine.assignSeat({
        id: data.userId,
        name: data.nickname,
        skin: 'man',
        avatar: data.avatarUrl,
        coins: 0
      });
      if (slotIndex !== -1) viewer = this.seatingEngine.slots[slotIndex];
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
   * Handle finalized combo or single gift
   * @private
   */
  _handleFinalizedGift(finalGift) {
    // 1. Ensure user has a seat
    let viewer = this.seatingEngine.viewers.get(finalGift.userId);
    if (!viewer) {
      const { slotIndex, evicted } = this.seatingEngine.assignSeat({
        id: finalGift.userId,
        name: finalGift.nickname,
        skin: 'man',
        avatar: finalGift.avatarUrl,
        coins: finalGift.totalCoins
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
        if (this.broadcaster && viewer) {
          this.broadcaster.broadcast({
            t: 'join',
            v: { ...viewer },
            cap: this.seatingEngine.capacity
          });
        }
      }
    } else {
      this.seatingEngine.addCoins(finalGift.userId, finalGift.totalCoins);
      viewer = this.seatingEngine.viewers.get(finalGift.userId);
    }

    // 2. Record donation in leaderboard
    this.leaderboard.recordDonation(
      {
        id: finalGift.userId,
        name: finalGift.nickname,
        avatar: finalGift.avatarUrl
      },
      finalGift.totalCoins
    );

    // 3. Retrieve prayer from 90s cache
    const prayer = finalGift.prayer || this.prayerCache.getPrayer(finalGift.userId);

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
        total: finalGift.totalCoins,
        tier: finalGift.tier,
        prayer,
        repeatEnd: true,
        comboCount: finalGift.comboCount,
        isCombo: finalGift.isCombo,
        slotIndex: viewer ? viewer.slotIndex : -1
      });

      // Tier 3: Trigger Great Bell
      if (finalGift.tier === 3) {
        this.broadcaster.broadcast({
          t: 'bell',
          isGreatBell: true
        });
      }
    }

    // 5. Enqueue TTS Announcement
    if (this.settings.gifts.readAll || finalGift.totalCoins >= this.settings.gifts.minDiamonds) {
      const ttsText = `Nam mô A Di Đà Phật. Phật tử ${finalGift.nickname} thành tâm cúng dường ${finalGift.count > 1 ? finalGift.count + ' cành ' : ''}${finalGift.giftName}. ${prayer}`;
      this.audioQueue.enqueue({
        text: ttsText,
        priority: finalGift.totalCoins >= 99 ? 1 : 2,
        tag: 'gift',
        id: finalGift.userId,
        options: {
          voice: this.settings.voice,
          pitch: `${this.settings.pitch}Hz`,
          rate: `${this.settings.rate}%`
        }
      });
    }

    this.addLog(`🎁 ${finalGift.nickname} cúng dường ${finalGift.giftName} x${finalGift.count} (+${finalGift.totalCoins} xu). Lời nguyện: ${prayer}`);
  }

  /**
   * Handle incoming control command from Admin Dashboard
   * @param {Object} msg { t: 'ctl', cmd: string, ... }
   */
  handleControlCommand(msg) {
    const cmd = msg.cmd.toLowerCase();

    switch (cmd) {
      case 'connect':
        this.tiktokAdapter.connect(msg.uniqueId);
        break;

      case 'disconnect':
        this.tiktokAdapter.disconnect();
        break;

      case 'chat':
        this.adminAdapter.injectChat(msg.text, msg.name, msg.id);
        break;

      case 'gift':
        this.adminAdapter.injectGift(msg.diamonds, msg.name, msg.gift, msg.count, msg.prayer, msg.id);
        break;

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

      case 'settings':
        if (msg.settings) {
          Object.assign(this.settings, msg.settings);
          if (msg.settings.moBpm) this.scheduler.setMoBpm(msg.settings.moBpm);
          if (msg.settings.mo !== undefined) this.scheduler.setMoEnabled(msg.settings.mo);
          if (msg.settings.chantEveryMin) this.scheduler.setChantInterval(msg.settings.chantEveryMin);
          if (msg.settings.autoChant !== undefined) this.scheduler.setAutoChantEnabled(msg.settings.autoChant);
          if (msg.settings.seatMode) this.seatingEngine.setSeatMode(msg.settings.seatMode);

          if (this.broadcaster) {
            this.broadcaster.broadcast({
              t: 'settings',
              settings: this.settings,
              cap: this.seatingEngine.capacity
            });
          }
          this.addLog('[Admin] Cập nhật cấu hình phòng live.');
        }
        break;

      case 'title':
        if (msg.title) {
          this.settings.title = msg.title;
          if (msg.subtitle) this.settings.subtitle = msg.subtitle;
          if (this.broadcaster) {
            this.broadcaster.broadcast({
              t: 'settings',
              settings: this.settings,
              cap: this.seatingEngine.capacity
            });
          }
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
    return {
      t: 'state',
      settings: { ...this.settings },
      viewers: this.seatingEngine.getSnapshot(),
      cap: this.seatingEngine.capacity,
      startedAt: this.startedAt,
      tiktok: this.tiktokAdapter.getStatus()
    };
  }

  /**
   * Graceful shutdown of all sub-engines
   */
  async destroy() {
    this.scheduler.stop();
    this.botSimulator.stop();
    this.audioQueue.clear();
    await this.tiktokAdapter.disconnect();
  }
}

export default StateManager;
