import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { config } from './config.mjs';
import { StateManager } from './state/StateManager.mjs';
import { Broadcaster } from './broadcaster/Broadcaster.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const assetsDir = path.join(rootDir, 'assets');

// 1. Initialize Express App
export const app = express();
app.use(express.json());

// Static File Hosting: Both / and /live for OBS CEF compatibility
app.use('/live', express.static(publicDir));
app.use('/', express.static(publicDir));
app.use('/assets', express.static(assetsDir));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// Snapshot endpoint
app.get('/api/state', (req, res) => {
  res.json(stateManager.getSnapshot());
});

// 2. Initialize StateManager & Broadcaster
export const stateManager = new StateManager();
export const broadcaster = new Broadcaster({
  stateManager
});
stateManager.setBroadcaster(broadcaster);

// 3. Create HTTP Server & Bind WebSocket Upgrade
export const server = http.createServer(app);

server.on('upgrade', (req, socket, head) => {
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  } catch {
    socket.destroy();
    return;
  }

  if (url.pathname === '/ws') {
    broadcaster.handleUpgrade(req, socket, head);
  } else {
    socket.destroy();
  }
});

/**
 * Start listening on configured host and port
 * @param {number} [port]
 * @param {string} [host]
 * @returns {Promise<http.Server>}
 */
export function startServer(port = config.port, host = config.host) {
  return new Promise((resolve) => {
    server.listen(port, host, () => {
      console.log(`====================================================`);
      console.log(`Chánh Điện Tịnh Tâm Server listening on http://${host}:${port}`);
      console.log(`OBS Overlay: http://${host}:${port}/live/overlay.html?role=overlay`);
      console.log(`WebSocket:   ws://${host}:${port}/ws?role=overlay`);
      console.log(`====================================================`);
      resolve(server);
    });
  });
}

// Graceful Shutdown Handler
let isShuttingDown = false;
export async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('[Server] Gracefully shutting down...');

  broadcaster.close();
  await stateManager.destroy();

  return new Promise((resolve) => {
    server.close(() => {
      console.log('[Server] HTTP and WebSocket servers closed.');
      resolve();
    });
  });
}

process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});

// Auto start if invoked directly
const isDirectRun = process.argv[1] && (path.resolve(process.argv[1]) === __filename);
if (isDirectRun) {
  startServer();
}

export default server;
