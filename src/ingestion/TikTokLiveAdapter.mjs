import { TikTokLiveConnection } from 'tiktok-live-connector';
import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent';
import { ReconnectionEngine } from './ReconnectionEngine.mjs';
import { config } from '../config.mjs';

/**
 * TikTokLiveAdapter: Ingestion adapter for TikTok LIVE Webcast events.
 * Supports session authentication, hpagent residential proxy, watchdog heartbeat,
 * and graceful fallback (never crashes Node.js if stream is offline).
 */
export class TikTokLiveAdapter {
  /**
   * @param {Object} [options]
   * @param {string} [options.uniqueId]
   * @param {string} [options.sessionId]
   * @param {string} [options.targetIdc]
   * @param {string} [options.proxyUrl]
   * @param {string} [options.signApiKey]
   * @param {boolean} [options.autoReconnect=true]
   * @param {Function} [options.onRawEvent] (type, rawData) => void
   * @param {Function} [options.onStatusChange] (statusPayload) => void
   */
  constructor(options = {}) {
    this.uniqueId = options.uniqueId || '';
    this.sessionId = options.sessionId || config.tiktok.sessionId || '';
    this.targetIdc = options.targetIdc || config.tiktok.targetIdc || 'alisg';
    this.proxyUrl = options.proxyUrl || config.tiktok.proxyUrl || '';
    this.signApiKey = options.signApiKey || config.tiktok.signApiKey || '';
    this.autoReconnect = options.autoReconnect !== undefined ? options.autoReconnect : true;

    this.onRawEvent = options.onRawEvent || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});

    this.status = 'idle'; // 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'
    this.roomId = '';
    this.viewerCount = 0;
    this.likeCount = 0;
    this.errorMessage = '';

    this.connection = null;
    this.shouldStayConnected = false;

    // Initialize ReconnectionEngine
    this.reconnection = new ReconnectionEngine({
      baseDelay: 2000,
      maxDelay: 30000,
      watchdogInterval: 15000,
      inactivityTimeout: 60000,
      onReconnect: (attempt) => {
        if (this.shouldStayConnected && this.uniqueId) {
          console.log(`[TikTokLiveAdapter] Reconnection attempt #${attempt} for @${this.uniqueId}`);
          this._doConnect(this.uniqueId);
        }
      },
      onWatchdogTimeout: async () => {
        if (this.status === 'connected') {
          console.warn('[TikTokLiveAdapter] Watchdog timeout: no events for 60s. Reconnecting...');
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
          this._updateStatus('disconnected', 'Watchdog timeout: không nhận được sự kiện sau 60s');
          if (this.shouldStayConnected && this.uniqueId && this.autoReconnect) {
            this.reconnection.scheduleReconnect();
          }
        }
      }
    });
  }

  /**
   * Connect to a TikTok LIVE channel
   * @param {string} uniqueId TikTok channel username (e.g. 'chua_tinh_tam_official')
   */
  async connect(uniqueId) {
    if (!uniqueId || typeof uniqueId !== 'string') {
      this._updateStatus('error', 'Tên kênh TikTok không hợp lệ');
      return;
    }

    const cleanUniqueId = uniqueId.replace(/^@/, '').trim();
    this.uniqueId = cleanUniqueId;
    this.shouldStayConnected = true;
    this.reconnection.reset();

    await this._doConnect(cleanUniqueId);
  }

  /**
   * Internal connection logic
   * @private
   */
  async _doConnect(uniqueId) {
    this._updateStatus('connecting');

    try {
      // Clean up previous connection if exists
      if (this.connection) {
        try {
          this.connection.disconnect();
        } catch {
          // ignore
        }
        this.connection = null;
      }

      // Configure proxy agents if proxyUrl is set
      const clientOptions = {};
      if (this.proxyUrl) {
        try {
          clientOptions.webClientOptions = {
            agent: {
              http: new HttpProxyAgent({ proxy: this.proxyUrl, keepAlive: true }),
              https: new HttpsProxyAgent({ proxy: this.proxyUrl, keepAlive: true })
            }
          };
          clientOptions.wsClientOptions = {
            agent: new HttpsProxyAgent({ proxy: this.proxyUrl, keepAlive: true })
          };
        } catch (e) {
          console.warn(`[TikTokLiveAdapter] Proxy config warning: ${e.message}`);
        }
      }

      // Configure session cookies
      const requestHeaders = {};
      if (this.sessionId) {
        requestHeaders.Cookie = `sessionid=${this.sessionId}; sessionid_ss=${this.sessionId}; tt-target-idc=${this.targetIdc};`;
      }

      const connectionOptions = {
        processInitialData: true,
        enableExtendedGiftInfo: true,
        enableWebsocketUpgrade: true,
        requestHeaders,
        ...clientOptions
      };

      if (this.signApiKey) {
        connectionOptions.signApiKey = this.signApiKey;
      }

      this.connection = new TikTokLiveConnection(uniqueId, connectionOptions);

      // Bind events
      this.connection.on('chat', (data) => {
        this.reconnection.recordHeartbeat();
        this.onRawEvent('chat', data);
      });

      this.connection.on('gift', (data) => {
        this.reconnection.recordHeartbeat();
        this.onRawEvent('gift', data);
      });

      this.connection.on('like', (data) => {
        this.reconnection.recordHeartbeat();
        if (data.totalLikeCount) this.likeCount = Number(data.totalLikeCount);
        this.onRawEvent('like', data);
      });

      this.connection.on('member', (data) => {
        this.reconnection.recordHeartbeat();
        this.onRawEvent('member', data);
      });

      this.connection.on('roomUser', (data) => {
        this.reconnection.recordHeartbeat();
        if (data.viewerCount !== undefined) {
          this.viewerCount = Number(data.viewerCount);
          this._emitStatus();
        }
        this.onRawEvent('roomUser', data);
      });

      this.connection.on('connected', (state) => {
        this.roomId = state?.roomId ? String(state.roomId) : '';
        this.reconnection.reset();
        this.reconnection.startWatchdog();
        this._updateStatus('connected');
      });

      this.connection.on('disconnected', () => {
        this.reconnection.stopWatchdog();
        if (this.shouldStayConnected && this.autoReconnect) {
          this._updateStatus('disconnected', 'Mất kết nối với TikTok LIVE');
          this.reconnection.scheduleReconnect();
        } else {
          this._updateStatus('disconnected');
        }
      });

      this.connection.on('streamEnd', () => {
        this.reconnection.stopWatchdog();
        this.shouldStayConnected = false;
        this._updateStatus('disconnected', 'Phiên livestream TikTok đã kết thúc');
      });

      this.connection.on('error', (err) => {
        const msg = err?.message || 'Lỗi kết nối TikTok Live';
        console.warn(`[TikTokLiveAdapter] Connection event error: ${msg}`);
        this.reconnection.stopWatchdog();
        this._updateStatus('error', msg);

        if (this.shouldStayConnected && this.autoReconnect) {
          this.reconnection.scheduleReconnect();
        }
      });

      // Initiate connection
      const state = await this.connection.connect();
      if (state && state.roomId) {
        this.roomId = String(state.roomId);
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
   * Disconnect from TikTok LIVE
   */
  async disconnect() {
    this.shouldStayConnected = false;
    this.reconnection.reset();
    this.reconnection.stopWatchdog();

    if (this.connection) {
      try {
        await this.connection.disconnect();
      } catch {
        // ignore
      }
      this.connection = null;
    }

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
      error: this.errorMessage
    };
  }
}

export default TikTokLiveAdapter;
