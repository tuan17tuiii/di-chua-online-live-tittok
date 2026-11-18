import WebSocket from 'ws';
import http from 'http';
import { server, startServer, shutdown, stateManager, broadcaster, app } from '../../src/server.mjs';
import { config } from '../../src/config.mjs';
import { WS_ERROR_CODES } from '../../src/broadcaster/MessageSchemas.mjs';

/**
 * MockWsClient: Headless WebSocket test client with role simulation,
 * buffered message queues, promise-based event predicates, and lifecycle tracking.
 */
export class MockWsClient {
  /**
   * @param {string} url - Full WebSocket URL, e.g. 'ws://127.0.0.1:3000/ws?role=control'
   */
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.messageQueue = [];
    this.waiters = [];
    this.closeWaiters = [];
    this.errors = [];
    this.isClosed = false;
    this.closeInfo = null;
    this.connectTimestamp = 0;
  }

  /**
   * Static helper to create and connect an overlay client.
   * @param {number} [port=3000]
   * @param {string} [host='127.0.0.1']
   * @returns {Promise<MockWsClient>}
   */
  static async connectOverlay(port = 3000, host = '127.0.0.1') {
    const client = new MockWsClient(`ws://${host}:${port}/ws?role=overlay`);
    await client.connect();
    return client;
  }

  /**
   * Static helper to create and connect a control client.
   * @param {number} [port=3000]
   * @param {string} [host='127.0.0.1']
   * @returns {Promise<MockWsClient>}
   */
  static async connectControl(port = 3000, host = '127.0.0.1') {
    const client = new MockWsClient(`ws://${host}:${port}/ws?role=control`);
    await client.connect();
    return client;
  }

  /**
   * Connect to the WebSocket server.
   * Resolves when the connection is opened.
   * @param {number} [timeoutMs=3000]
   * @returns {Promise<MockWsClient>}
   */
  async connect(timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
      this.connectTimestamp = performance.now();
      let timer = null;

      try {
        this.ws = new WebSocket(this.url);
      } catch (err) {
        return reject(err);
      }

      timer = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          try { this.ws.terminate(); } catch (_) {}
          reject(new Error(`WebSocket connection timeout (${timeoutMs}ms) to ${this.url}`));
        }
      }, timeoutMs);

      this.ws.on('open', () => {
        clearTimeout(timer);
        resolve(this);
      });

      this.ws.on('error', (err) => {
        this.errors.push(err);
        if (timer) clearTimeout(timer);
        // If not yet opened, reject connect promise
        if (!this.isOpen) {
          reject(err);
        }
      });

      this.ws.on('message', (data) => {
        let parsed;
        try {
          parsed = JSON.parse(data.toString('utf8'));
        } catch (_) {
          parsed = { raw: data.toString('utf8') };
        }
        this._handleIncoming(parsed);
      });

      this.ws.on('close', (code, reason) => {
        this.isClosed = true;
        this.closeInfo = {
          code,
          reason: reason ? reason.toString('utf8') : '',
          timestamp: Date.now()
        };

        // Notify all close waiters
        for (const waiter of this.closeWaiters) {
          clearTimeout(waiter.timer);
          waiter.resolve(this.closeInfo);
        }
        this.closeWaiters = [];
      });
    });
  }

  /**
   * Internal dispatcher for incoming messages.
   * @private
   */
  _handleIncoming(msg) {
    // 1. Check if an active waiter matches
    for (let i = 0; i < this.waiters.length; i++) {
      const waiter = this.waiters[i];
      let matches = false;
      try {
        matches = waiter.predicate(msg);
      } catch (_) {
        matches = false;
      }

      if (matches) {
        clearTimeout(waiter.timer);
        this.waiters.splice(i, 1);
        waiter.resolve(msg);
        return;
      }
    }

    // 2. Otherwise buffer the message
    this.messageQueue.push(msg);
  }

  /**
   * Wait for a message matching the predicate.
   * Searches buffered messages first, then waits for incoming messages.
   *
   * @param {Function} predicate - (msg) => boolean
   * @param {number} [timeoutMs=3000] - Timeout in milliseconds
   * @returns {Promise<any>} The matching message
   */
  async waitForMessage(predicate, timeoutMs = 3000) {
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }

    // 1. Check existing buffered messages
    const existingIndex = this.messageQueue.findIndex((m) => {
      try { return predicate(m); } catch (_) { return false; }
    });

    if (existingIndex !== -1) {
      const [matched] = this.messageQueue.splice(existingIndex, 1);
      return matched;
    }

    // 2. If socket is closed and no match found in buffer, fail early
    if (this.isClosed && this.messageQueue.length === 0) {
      throw new Error(`Socket is already closed (${this.closeInfo?.code}). No message matched predicate.`);
    }

    // 3. Register a waiter for upcoming messages
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.waiters.findIndex((w) => w.resolve === resolve);
        if (idx !== -1) {
          this.waiters.splice(idx, 1);
        }
        const queuedTypes = this.messageQueue.map((m) => m.t || m.raw || 'unknown').join(', ');
        reject(
          new Error(
            `Timeout (${timeoutMs}ms) waiting for message. Buffered types: [${queuedTypes || 'none'}]`
          )
        );
      }, timeoutMs);

      this.waiters.push({ predicate, resolve, reject, timer });
    });
  }

  /**
   * Convenient alias for waitForMessage.
   */
  async waitFor(predicate, timeoutMs = 3000) {
    return this.waitForMessage(predicate, timeoutMs);
  }

  /**
   * Wait for the initial state snapshot.
   * @param {number} [timeoutMs=2000]
   * @returns {Promise<any>}
   */
  async waitForState(timeoutMs = 2000) {
    return this.waitForMessage((m) => m.t === 'state', timeoutMs);
  }

  /**
   * Wait until the socket closes, returning code and reason.
   * @param {number} [timeoutMs=3000]
   * @returns {Promise<{ code: number, reason: string, timestamp: number }>}
   */
  async waitForClose(timeoutMs = 3000) {
    if (this.isClosed && this.closeInfo) {
      return this.closeInfo;
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.closeWaiters.findIndex((w) => w.resolve === resolve);
        if (idx !== -1) this.closeWaiters.splice(idx, 1);
        reject(new Error(`Timeout (${timeoutMs}ms) waiting for socket to close`));
      }, timeoutMs);

      this.closeWaiters.push({ resolve, reject, timer });
    });
  }

  /**
   * Send JSON or text over WebSocket.
   * @param {Object|string} data
   */
  send(data) {
    if (!this.isOpen) {
      throw new Error('Cannot send message: WebSocket is not open');
    }
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    this.ws.send(payload);
  }

  /**
   * Send a control command `{ t: 'ctl', cmd, ... }`.
   * @param {string} cmd
   * @param {Object} [payload={}]
   */
  sendControl(cmd, payload = {}) {
    this.send({
      t: 'ctl',
      cmd,
      ...payload
    });
  }

  /**
   * Drain and clear the internal message buffer.
   * @returns {any[]} Array of all buffered messages
   */
  drainMessages() {
    const msgs = [...this.messageQueue];
    this.messageQueue = [];
    return msgs;
  }

  /**
   * Find all buffered messages matching predicate without removing them.
   * @param {Function} predicate
   * @returns {any[]}
   */
  filterMessages(predicate) {
    return this.messageQueue.filter(predicate);
  }

  /**
   * Clear message queue and pending waiters.
   */
  clear() {
    this.messageQueue = [];
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error('MockWsClient was cleared'));
    }
    this.waiters = [];
  }

  /**
   * Close the WebSocket connection cleanly.
   * @param {number} [code=1000]
   * @param {string} [reason='']
   */
  close(code = 1000, reason = '') {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      try {
        this.ws.close(code, reason);
      } catch (_) {}
    }
  }

  /**
   * Forcefully terminate the connection.
   */
  terminate() {
    if (this.ws) {
      try {
        this.ws.terminate();
      } catch (_) {}
    }
  }

  /**
   * Whether the socket is currently OPEN.
   * @returns {boolean}
   */
  get isOpen() {
    return Boolean(this.ws && this.ws.readyState === WebSocket.OPEN);
  }

  /**
   * ReadyState integer: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
   */
  get readyState() {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }
}

/**
 * Ensure the backend server is running on the given port.
 * Safe to call multiple times; reuses existing running instance.
 * @param {number} [port=3000]
 * @param {string} [host='127.0.0.1']
 * @returns {Promise<http.Server>}
 */
export async function ensureServerRunning(port = config.port || 3000, host = config.host || '127.0.0.1') {
  if (server.listening) {
    return server;
  }
  return startServer(port, host);
}

/**
 * Reset server state between test cases to ensure isolation.
 */
export function resetServerState() {
  if (stateManager) {
    // 1. Reset seating engine
    stateManager.seatingEngine.clearAll();
    stateManager.seatingEngine.setSeatMode('auto');
    stateManager.seatingEngine.resize(36);
    stateManager.seatingEngine.vipSlots.clear();
    stateManager.seatingEngine.lockedSlots.clear();

    // 2. Reset prayer cache
    if (stateManager.prayerCache && stateManager.prayerCache.cache) {
      stateManager.prayerCache.cache.clear();
    }

    // 3. Reset leaderboard
    if (stateManager.leaderboard) {
      stateManager.leaderboard.reset();
    }

    // 4. Reset coalescer
    if (stateManager.coalescer) {
      stateManager.coalescer.flushAll();
    }

    // 5. Reset audio queue
    if (stateManager.audioQueue) {
      stateManager.audioQueue.clear();
    }

    // 6. Reset settings to default
    stateManager.settings = { ...config.defaultRoomSettings };

    // 7. Reset logs
    stateManager.logs = [];

    // 8. Stop bot simulator if running
    if (stateManager.botSimulator) {
      stateManager.botSimulator.stop();
    }
  }
}

export { server, startServer, shutdown, stateManager, broadcaster, app, WS_ERROR_CODES };
export default MockWsClient;
