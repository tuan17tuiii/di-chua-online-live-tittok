import { WebSocketServer, WebSocket } from 'ws';
import { WS_ERROR_CODES, ALLOWED_ROLES, validateClientCommand } from './MessageSchemas.mjs';

/**
 * Broadcaster: Native WebSocket broadcaster with role segregation (overlay vs control),
 * snapshot-on-connect synchronization (<50ms), and rate limiting.
 */
export class Broadcaster {
  /**
   * @param {Object} options
   * @param {import('http').Server} [options.server] HTTP server to attach upgrade handler
   * @param {import('../state/StateManager.mjs').StateManager} options.stateManager
   * @param {number} [options.rateLimitPerSec=10] Max control commands per second
   */
  constructor(options = {}) {
    this.stateManager = options.stateManager;
    this.rateLimitPerSec = options.rateLimitPerSec || 10;

    this.overlayClients = new Set();
    this.controlClients = new Set();
    this.controlRateMap = new Map(); // ws -> { count: number, resetAt: number }

    this.wss = new WebSocketServer({
      noServer: true
    });

    this.wss.on('connection', (ws, req, role) => {
      this._handleConnection(ws, req, role);
    });

    // Start 30s ping interval
    this.pingInterval = setInterval(() => {
      this._pingClients();
    }, 30000);
    if (this.pingInterval.unref) this.pingInterval.unref();
  }

  handleUpgrade(req, socket, head) {
    let url;
    try {
      url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    } catch {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    const role = url.searchParams.get('role');

    if (!role || !ALLOWED_ROLES.includes(role)) {
      socket.write('HTTP/1.1 400 Bad Handshake: Missing or invalid role\r\n\r\n');
      socket.destroy();
      return;
    }

    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.wss.emit('connection', ws, req, role);
    });
  }

  _handleConnection(ws, req, role) {
    ws.isAlive = true;
    ws.role = role;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    if (role === 'overlay') {
      this.overlayClients.add(ws);

      // Rule: role=overlay is strictly READ-ONLY. Any inbound message triggers 4403
      ws.on('message', () => {
        console.warn('[Broadcaster] Overlay client attempted to send message. Terminating with 4403.');
        ws.close(WS_ERROR_CODES.FORBIDDEN_ACTION, 'Forbidden Action: Overlay client is read-only');
      });

      ws.on('close', () => {
        this.overlayClients.delete(ws);
      });
    } else if (role === 'control') {
      this.controlClients.add(ws);
      this.controlRateMap.set(ws, { count: 0, resetAt: Date.now() + 1000 });

      ws.on('message', (data) => {
        this._handleControlMessage(ws, data);
      });

      ws.on('close', () => {
        this.controlClients.delete(ws);
        this.controlRateMap.delete(ws);
      });
    }

    // Snapshot on Connect: Immediately serialize and send state in <50ms
    if (this.stateManager && typeof this.stateManager.getSnapshot === 'function') {
      const snapshot = this.stateManager.getSnapshot();
      this.send(ws, snapshot);

      // If control, also push recent logs, bot status, full config, queue & session stats
      if (role === 'control') {
        if (typeof this.stateManager.getRecentLogs === 'function') {
          this.send(ws, {
            t: 'logs',
            lines: this.stateManager.getRecentLogs()
          });
        }
        if (typeof this.stateManager.getBotStatus === 'function') {
          this.send(ws, {
            t: 'bots',
            ...this.stateManager.getBotStatus()
          });
        }
        if (typeof this.stateManager.getFullConfig === 'function') {
          this.send(ws, {
            t: 'config',
            config: this.stateManager.getFullConfig()
          });
        }
        if (typeof this.stateManager.getTtsQueueStatus === 'function') {
          this.send(ws, {
            t: 'tts_queue',
            ...this.stateManager.getTtsQueueStatus()
          });
        }
        if (typeof this.stateManager.getSessionStats === 'function') {
          this.send(ws, {
            t: 'session_stats',
            ...this.stateManager.getSessionStats()
          });
        }
      }
    }
  }

  _handleControlMessage(ws, data) {
    const now = Date.now();
    let rateInfo = this.controlRateMap.get(ws);
    if (!rateInfo || now > rateInfo.resetAt) {
      rateInfo = { count: 1, resetAt: now + 1000 };
      this.controlRateMap.set(ws, rateInfo);
    } else {
      rateInfo.count++;
      if (rateInfo.count > this.rateLimitPerSec) {
        console.warn('[Broadcaster] Control client exceeded rate limit. Closing with 4429.');
        ws.close(WS_ERROR_CODES.RATE_LIMITED, 'Rate Limited: Exceeded 10 commands per second');
        return;
      }
    }

    let parsed;
    try {
      parsed = JSON.parse(data.toString('utf8'));
    } catch {
      this.send(ws, { t: 'log', line: '[ERROR] Invalid JSON payload' });
      return;
    }

    const validation = validateClientCommand(parsed);
    if (!validation.valid) {
      this.send(ws, { t: 'log', line: `[ERROR] Invalid command: ${validation.error}` });
      return;
    }

    if (this.stateManager && typeof this.stateManager.handleControlCommand === 'function') {
      try {
        this.stateManager.handleControlCommand(parsed);
      } catch (err) {
        this.send(ws, { t: 'log', line: `[ERROR] Command failed: ${err.message}` });
      }
    }
  }

  send(ws, payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
      } catch (err) {
        console.warn(`[Broadcaster] Send error: ${err.message}`);
      }
    }
  }

  broadcast(payload) {
    const json = typeof payload === 'string' ? payload : JSON.stringify(payload);
    for (const ws of this.overlayClients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(json);
    }
    for (const ws of this.controlClients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(json);
    }
  }

  broadcastOverlayOnly(payload) {
    const json = typeof payload === 'string' ? payload : JSON.stringify(payload);
    for (const ws of this.overlayClients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(json);
    }
  }

  broadcastControlOnly(payload) {
    const json = typeof payload === 'string' ? payload : JSON.stringify(payload);
    for (const ws of this.controlClients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(json);
    }
  }

  _pingClients() {
    const all = [...this.overlayClients, ...this.controlClients];
    for (const ws of all) {
      if (ws.isAlive === false) {
        ws.terminate();
      } else {
        ws.isAlive = false;
        ws.ping();
      }
    }
  }

  close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    for (const ws of this.overlayClients) {
      try { ws.terminate(); } catch {}
    }
    for (const ws of this.controlClients) {
      try { ws.terminate(); } catch {}
    }
    this.overlayClients.clear();
    this.controlClients.clear();
    this.wss.close();
  }
}

export default Broadcaster;
