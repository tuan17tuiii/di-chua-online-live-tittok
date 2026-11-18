import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';
import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent';
import { ReconnectionEngine } from './ReconnectionEngine.mjs';
import { config } from '../config.mjs';
import { BUILTIN_TIKTOK_GIFTS } from '../config/defaultConfigSchema.mjs';

/**
 * TikTokLiveAdapter: Ingestion adapter for TikTok LIVE Webcast events (tiktok-live-connector v2.5+).
 * Supports v2.5 CookieSessionBundle authentication, EulerStream Sign API, hpagent residential proxy,
 * 11 real-time Webcast event streams, room gift catalog fetching, watchdog heartbeat, and hot-reconfig.
 */
export class TikTokLiveAdapter {
  /**
   * @param {Object} [options]
   * @param {string} [options.uniqueId]
   * @param {string} [options.sessionId]
   * @param {string} [options.targetIdc]
   * @param {boolean} [options.authenticateWs=false]
   * @param {string} [options.proxyUrl]
   * @param {string} [options.signApiKey]
   * @param {boolean} [options.autoReconnect=true]
   * @param {number} [options.watchdogTimeoutSec=60]
   * @param {boolean} [options.fetchGiftsOnConnect=true]
   * @param {Record<string, boolean>} [options.enabledEvents]
   * @param {Function} [options.onRawEvent] (type, rawData) => void
   * @param {Function} [options.onStatusChange] (statusPayload) => void
   * @param {Function} [options.onGiftCatalogLoaded] (gifts) => void
   */
  constructor(options = {}) {
    this.uniqueId = options.uniqueId || '';
    this.requestedRoomId = options.roomId || '';
    this.sessionId = options.sessionId ?? config.tiktok.sessionId ?? '';
    this.targetIdc = options.targetIdc || config.tiktok.targetIdc || 'alisg';
    this.authenticateWs = Boolean(options.authenticateWs);
    this.proxyUrl = options.proxyUrl ?? config.tiktok.proxyUrl ?? '';
    this.signApiKey = options.signApiKey ?? config.tiktok.signApiKey ?? '';
    this.autoReconnect = options.autoReconnect !== undefined ? Boolean(options.autoReconnect) : true;
    this.fetchGiftsOnConnect = options.fetchGiftsOnConnect !== undefined ? Boolean(options.fetchGiftsOnConnect) : true;

    this.enabledEvents = {
      chat: true,
      gift: true,
      like: true,
      member: true,
      follow: true,
      share: true,
      subNotify: true,
      emote: true,
      envelope: true,
      roomUser: true,
      ...(options.enabledEvents || {})
    };

    this.onRawEvent = options.onRawEvent || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onGiftCatalogLoaded = options.onGiftCatalogLoaded || (() => {});

    this.status = 'idle'; // 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'
    this.roomId = '';
    this.viewerCount = 0;
    this.likeCount = 0;
    this.errorMessage = '';
    this.connectedAt = null;
    this.liveGiftCatalog = [];

    this.connection = null;
    this.shouldStayConnected = false;

    const inactivityTimeoutMs = Math.max(15, Number(options.watchdogTimeoutSec) || 60) * 1000;

    // Initialize ReconnectionEngine
    this.reconnection = new ReconnectionEngine({
      baseDelay: 2000,
      maxDelay: 30000,
      watchdogInterval: 15000,
      inactivityTimeout: inactivityTimeoutMs,
      onReconnect: (attempt) => {
        if (this.shouldStayConnected && this.uniqueId) {
          console.log(`[TikTokLiveAdapter] Reconnection attempt #${attempt} for @${this.uniqueId}`);
          this._doConnect(this.uniqueId, this.requestedRoomId);
        }
      },
      onWatchdogTimeout: async () => {
        if (this.status === 'connected') {
          console.warn('[TikTokLiveAdapter] Watchdog timeout: no events received. Reconnecting...');
          this.reconnection.stopWatchdog();
          if (this.connection) {
            try {
              if (typeof this.connection.removeAllListeners === 'function') {
                this.connection.removeAllListeners();
              }
              await this.connection.disconnect();
            } catch {
              // ignore
            }
            this.connection = null;
          }
          this._updateStatus('disconnected', 'Watchdog timeout: không nhận được tín hiệu mới từ phòng live');
          if (this.shouldStayConnected && this.uniqueId && this.autoReconnect) {
            this.reconnection.scheduleReconnect();
          }
        }
      }
    });
  }

  /**
   * Hot-update connection & ingestion settings from Admin ConfigStore without restarting server.
   * @param {Object} connCfg
   */
  updateConnectionConfig(connCfg = {}) {
    if (connCfg.signApiKey !== undefined) this.signApiKey = String(connCfg.signApiKey || '').trim();
    if (connCfg.sessionId !== undefined) this.sessionId = String(connCfg.sessionId || '').trim();
    if (connCfg.targetIdc !== undefined) this.targetIdc = String(connCfg.targetIdc || 'alisg').trim();
    if (connCfg.authenticateWs !== undefined) this.authenticateWs = Boolean(connCfg.authenticateWs);
    if (connCfg.proxyUrl !== undefined) this.proxyUrl = String(connCfg.proxyUrl || '').trim();
    if (connCfg.autoReconnect !== undefined) this.autoReconnect = Boolean(connCfg.autoReconnect);
    if (connCfg.fetchGiftsOnConnect !== undefined) this.fetchGiftsOnConnect = Boolean(connCfg.fetchGiftsOnConnect);
    if (connCfg.watchdogTimeoutSec !== undefined) {
      this.reconnection.inactivityTimeout = Math.max(15, Number(connCfg.watchdogTimeoutSec) || 60) * 1000;
    }
    if (connCfg.enabledEvents && typeof connCfg.enabledEvents === 'object') {
      this.enabledEvents = {
        ...this.enabledEvents,
        ...connCfg.enabledEvents
      };
    }
  }

  /**
   * Connect to a TikTok LIVE channel
   * @param {string} uniqueId TikTok channel username or URL (e.g. 'chua_tinh_tam_official')
   * @param {string} [roomId] Optional explicit TikTok room ID
   */
  async connect(uniqueId, roomId = '') {
    if (!uniqueId || typeof uniqueId !== 'string') {
      this._updateStatus('error', 'Tên kênh TikTok không hợp lệ');
      return;
    }

    // Extract clean username even if user pastes full https://www.tiktok.com/@username/live URL
    let cleanUniqueId = uniqueId.trim();
    const urlMatch = cleanUniqueId.match(/tiktok\.com\/@([^/?#]+)/i);
    if (urlMatch && urlMatch[1]) {
      cleanUniqueId = urlMatch[1];
    } else {
      cleanUniqueId = cleanUniqueId.replace(/^@/, '').trim();
    }

    if (!cleanUniqueId) {
      this._updateStatus('error', 'Tên kênh TikTok không hợp lệ');
      return;
    }

    this.uniqueId = cleanUniqueId;
    this.requestedRoomId = roomId ? String(roomId).trim() : '';
    this.shouldStayConnected = true;
    this.reconnection.reset();

    await this._doConnect(this.uniqueId, this.requestedRoomId);
  }

  /**
   * Internal connection logic compliant with tiktok-live-connector v2.5.0
   * @private
   */
  async _doConnect(uniqueId, explicitRoomId = '') {
    this._updateStatus('connecting');

    try {
      // Clean up previous connection if exists
      if (this.connection) {
        try {
          if (typeof this.connection.removeAllListeners === 'function') {
            this.connection.removeAllListeners();
          }
          await this.connection.disconnect();
        } catch {
          // ignore
        }
        this.connection = null;
      }

      const connectionOptions = {
        processInitialData: true,
        fetchRoomInfoOnConnect: !explicitRoomId,
        enableExtendedGiftInfo: Boolean(this.fetchGiftsOnConnect)
      };

      // Configure EulerStream API Key if provided
      if (this.signApiKey) {
        connectionOptions.signApiKey = this.signApiKey;
      }

      // Configure v2.5.0 CookieSessionBundle
      if (this.sessionId) {
        connectionOptions.session = {
          cookie: {
            type: 'cookie',
            value: {
              sessionId: this.sessionId,
              ttTargetIdc: this.targetIdc || 'alisg'
            }
          }
        };
        if (this.authenticateWs) {
          connectionOptions.authenticateWs = true;
        }
      }

      // Configure residential proxy agents via hpagent
      if (this.proxyUrl) {
        try {
          connectionOptions.webClientOptions = {
            agent: {
              http: new HttpProxyAgent({ proxy: this.proxyUrl, keepAlive: true }),
              https: new HttpsProxyAgent({ proxy: this.proxyUrl, keepAlive: true })
            }
          };
          connectionOptions.wsClientOptions = {
            agent: new HttpsProxyAgent({ proxy: this.proxyUrl, keepAlive: true })
          };
        } catch (e) {
          console.warn(`[TikTokLiveAdapter] Proxy config warning: ${e.message}`);
        }
      }

      this.connection = new TikTokLiveConnection(uniqueId, connectionOptions);

      const bindStreamEvent = (eventKey, canonicalType = eventKey) => {
        this.connection.on(eventKey, (data) => {
          this.reconnection.recordHeartbeat();
          if (this.enabledEvents[canonicalType] === false) return;
          this.onRawEvent(canonicalType, data);
        });
      };

      // Core Webcast Events (v2.5 WebcastEvent enum with string fallback)
      bindStreamEvent(WebcastEvent?.CHAT || 'chat', 'chat');
      bindStreamEvent(WebcastEvent?.GIFT || 'gift', 'gift');
      bindStreamEvent(WebcastEvent?.MEMBER || 'member', 'member');
      bindStreamEvent(WebcastEvent?.FOLLOW || 'follow', 'follow');
      bindStreamEvent(WebcastEvent?.SHARE || 'share', 'share');
      bindStreamEvent(WebcastEvent?.SUB_NOTIFY || 'subNotify', 'subNotify');
      bindStreamEvent(WebcastEvent?.EMOTE || 'emote', 'emote');
      bindStreamEvent(WebcastEvent?.ENVELOPE || 'envelope', 'envelope');

      // Like event updates total room likes
      this.connection.on(WebcastEvent?.LIKE || 'like', (data) => {
        this.reconnection.recordHeartbeat();
        const total = Number(data?.totalLikeCount ?? data?.total ?? 0);
        if (total > 0) {
          this.likeCount = total;
        } else {
          this.likeCount += Number(data?.likeCount ?? data?.count ?? 1);
        }
        if (this.enabledEvents.like !== false) {
          this.onRawEvent('like', data);
        }
      });

      // Room viewer sequence updates
      this.connection.on(WebcastEvent?.ROOM_USER || 'roomUser', (data) => {
        this.reconnection.recordHeartbeat();
        const viewers = data?.viewerCount ?? data?.totalUser ?? data?.anonymous;
        if (viewers !== undefined) {
          this.viewerCount = Number(viewers) || 0;
          this._emitStatus();
        }
        if (this.enabledEvents.roomUser !== false) {
          this.onRawEvent('roomUser', data);
        }
      });

      // Control Lifecycle Events
      this.connection.on(ControlEvent?.CONNECTED || 'connected', (state) => {
        this.roomId = state?.roomId ? String(state.roomId) : this.roomId;
        this.connectedAt = Date.now();
        this.reconnection.reset();
        this.reconnection.startWatchdog();

        if (state?.availableGifts) {
          this._ingestGiftCatalog(state.availableGifts);
        }

        this._updateStatus('connected');
      });

      this.connection.on(ControlEvent?.DISCONNECTED || 'disconnected', () => {
        this.reconnection.stopWatchdog();
        if (this.shouldStayConnected && this.autoReconnect) {
          this._updateStatus('disconnected', 'Mất kết nối với TikTok LIVE — đang tự động kết nối lại');
          this.reconnection.scheduleReconnect();
        } else {
          this._updateStatus('disconnected');
        }
      });

      this.connection.on(WebcastEvent?.STREAM_END || 'streamEnd', () => {
        this.reconnection.stopWatchdog();
        this.shouldStayConnected = false;
        this._updateStatus('disconnected', 'Phiên livestream TikTok đã kết thúc');
      });

      this.connection.on(ControlEvent?.ERROR || 'error', (err) => {
        const msg = err?.message || err?.info || 'Lỗi kết nối TikTok Live';
        console.warn(`[TikTokLiveAdapter] Connection event error: ${msg}`);
        if (this.status !== 'connected') {
          this.reconnection.stopWatchdog();
          this._updateStatus('error', msg);
          if (this.shouldStayConnected && this.autoReconnect) {
            this.reconnection.scheduleReconnect();
          }
        }
      });

      // Initiate connection (pass explicitRoomId if provided)
      const state = await this.connection.connect(explicitRoomId || undefined);
      if (state) {
        if (state.roomId) this.roomId = String(state.roomId);
        if (state.availableGifts) {
          this._ingestGiftCatalog(state.availableGifts);
        } else if (this.fetchGiftsOnConnect && typeof this.connection.fetchAvailableGifts === 'function') {
          this.refreshGiftCatalog().catch(() => {});
        }
      }
    } catch (err) {
      const msg = err?.message || 'Không thể kết nối tới phòng TikTok LIVE';
      console.warn(`[TikTokLiveAdapter] Connect caught error: ${msg}`);
      this._updateStatus('error', msg);

      if (this.shouldStayConnected && this.autoReconnect) {
        this.reconnection.scheduleReconnect();
      }
    }
  }

  /**
   * Normalize and cache available room gifts from TikTok
   * @private
   */
  _ingestGiftCatalog(rawGifts) {
    try {
      const list = Array.isArray(rawGifts)
        ? rawGifts
        : Array.isArray(rawGifts?.gifts)
          ? rawGifts.gifts
          : Array.isArray(rawGifts?.data?.gifts)
            ? rawGifts.data.gifts
            : [];

      const mapped = [];
      for (const g of list) {
        if (!g) continue;
        const giftId = String(g.id ?? g.gift_id ?? g.giftId ?? '');
        const name = String(g.name ?? g.giftName ?? '').trim();
        if (!giftId && !name) continue;
        const diamonds = Number(g.diamond_count ?? g.diamondCount ?? g.diamonds ?? 1) || 1;
        const imageUrl =
          g.image?.url_list?.[0] ||
          g.image?.url?.[0] ||
          g.icon?.url_list?.[0] ||
          g.icon?.url?.[0] ||
          g.imageUrl ||
          '';

        mapped.push({
          giftId,
          name: name || `Gift #${giftId}`,
          diamonds,
          imageUrl,
          icon: '🎁',
          category: 'live_room'
        });
      }

      if (mapped.length > 0) {
        mapped.sort((a, b) => a.diamonds - b.diamonds);
        this.liveGiftCatalog = mapped;
        this.onGiftCatalogLoaded(this.getAvailableGifts());
      }
    } catch (err) {
      console.warn(`[TikTokLiveAdapter] Failed to parse gift catalog: ${err.message}`);
    }
  }

  /**
   * Explicitly refresh available gifts from active TikTok connection if connected
   */
  async refreshGiftCatalog() {
    if (this.connection && this.status === 'connected' && typeof this.connection.fetchAvailableGifts === 'function') {
      try {
        const raw = await this.connection.fetchAvailableGifts();
        this._ingestGiftCatalog(raw);
      } catch (err) {
        console.warn(`[TikTokLiveAdapter] fetchAvailableGifts warning: ${err.message}`);
      }
    }
    return this.getAvailableGifts();
  }

  /**
   * Get merged catalog of Live Room Gifts + Built-in Spiritual/TikTok Gifts
   */
  getAvailableGifts() {
    const byKey = new Map();
    for (const item of BUILTIN_TIKTOK_GIFTS) {
      byKey.set(String(item.giftId), { ...item });
    }
    for (const liveItem of this.liveGiftCatalog) {
      const key = String(liveItem.giftId || liveItem.name);
      const existing = byKey.get(key);
      byKey.set(key, {
        ...(existing || {}),
        ...liveItem,
        icon: existing?.icon || liveItem.icon || '🎁'
      });
    }
    return Array.from(byKey.values()).sort((a, b) => a.diamonds - b.diamonds);
  }

  /**
   * Disconnect from TikTok LIVE
   */
  async disconnect() {
    this.shouldStayConnected = false;
    this.reconnection.reset();
    this.reconnection.stopWatchdog();

    if (this.connection) {
      try {
        if (typeof this.connection.removeAllListeners === 'function') {
          this.connection.removeAllListeners();
        }
        await this.connection.disconnect();
      } catch {
        // ignore
      }
      this.connection = null;
    }

    this.connectedAt = null;
    this._updateStatus('disconnected');
  }

  /**
   * Update and notify connection status
   * @private
   */
  _updateStatus(status, error = '') {
    this.status = status;
    this.errorMessage = error;
    this._emitStatus();
  }

  /**
   * Emit current status payload
   * @private
   */
  _emitStatus() {
    const payload = this.getStatus();
    this.onStatusChange(payload);
  }

  /**
   * Get current connection status payload
   * @returns {import('../broadcaster/MessageSchemas.mjs').TikTokStatusPayload}
   */
  getStatus() {
    return {
      status: this.status,
      uniqueId: this.uniqueId,
      roomId: this.roomId,
      viewerCount: this.viewerCount,
      likeCount: this.likeCount,
      reconnectAttempt: this.reconnection.attempt,
      hasSessionCookie: Boolean(this.sessionId),
      hasSignApiKey: Boolean(this.signApiKey),
      hasProxy: Boolean(this.proxyUrl),
      connectedAt: this.connectedAt,
      error: this.errorMessage
    };
  }
}

export default TikTokLiveAdapter;
