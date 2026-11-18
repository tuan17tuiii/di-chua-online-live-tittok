import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { config } from './config.mjs';
import { ConfigStore } from './config/ConfigStore.mjs';
import { StateManager } from './state/StateManager.mjs';
import { Broadcaster } from './broadcaster/Broadcaster.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const assetsDir = path.join(rootDir, 'assets');

// 1. Initialize Persistent ConfigStore, StateManager & Broadcaster
export const configStore = new ConfigStore({ persist: true });
export const stateManager = new StateManager({ configStore });
export const broadcaster = new Broadcaster({ stateManager });
stateManager.setBroadcaster(broadcaster);

// 2. Initialize Express App
export const app = express();
app.use(express.json({ limit: '2mb' }));

// Friendly Page Routes
app.get('/admin', (req, res) => {
  res.sendFile(path.join(publicDir, 'admin.html'));
});

app.get('/control', (req, res) => {
  res.sendFile(path.join(publicDir, 'control.html'));
});

// Static File Hosting: Both / and /live for OBS CEF compatibility
app.use('/live', express.static(publicDir));
app.use('/', express.static(publicDir));
app.use('/assets', express.static(assetsDir));

// =========================================================================
// REST API ENDPOINTS (Health, State, Full Config Studio, Gifts, TTS, Live)
// =========================================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

app.get('/api/state', (req, res) => {
  res.json(stateManager.getSnapshot());
});

// Get full configuration + profiles + gift catalog
app.get('/api/config', (req, res) => {
  res.json({
    config: configStore.get(),
    profiles: configStore.listProfiles(),
    availableGifts: stateManager.tiktokAdapter.getAvailableGifts()
  });
});

// Update full or partial configuration (persists to data/app-config.json & hot-reloads)
app.put('/api/config', (req, res) => {
  try {
    const updated = configStore.update(req.body || {});
    stateManager.addLog('[Admin API] Đã lưu cấu hình hệ thống vào đĩa bền vững.');
    res.json({ ok: true, config: updated });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Reset section or entire configuration to factory defaults
app.post('/api/config/reset', (req, res) => {
  const { section, all } = req.body || {};
  const updated = all ? configStore.resetAll() : configStore.resetSection(section);
  stateManager.addLog(
    all
      ? '[Admin API] Đã khôi phục toàn bộ cấu hình về mặc định gốc.'
      : `[Admin API] Đã khôi phục nhóm cấu hình "${section}" về mặc định.`
  );
  res.json({ ok: true, config: updated });
});

// Apply 1-click Scene Preset
app.post('/api/config/preset', (req, res) => {
  const { presetId } = req.body || {};
  const applied = configStore.applyScenePreset(presetId);
  if (!applied) {
    return res.status(404).json({ ok: false, error: 'Không tìm thấy kịch bản preset' });
  }
  stateManager.addLog(`[Scene Preset] Đã áp dụng kịch bản: ${applied.name}`);
  res.json({ ok: true, preset: applied, config: configStore.get() });
});

// Export configuration as downloadable JSON
app.get('/api/config/export', (req, res) => {
  const includeSecrets = req.query.secrets === '1' || req.query.secrets === 'true';
  const payload = configStore.exportJson(includeSecrets);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="chanh-dien-config.json"');
  res.send(JSON.stringify(payload, null, 2));
});

// Import configuration from JSON object
app.post('/api/config/import', (req, res) => {
  try {
    const updated = configStore.importJson(req.body);
    stateManager.addLog('[Admin API] Đã nhập (Import) file cấu hình JSON thành công.');
    res.json({ ok: true, config: updated });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Named Config Profiles CRUD
app.get('/api/config/profiles', (req, res) => {
  res.json({ profiles: configStore.listProfiles() });
});

app.post('/api/config/profiles', (req, res) => {
  try {
    const { name, description } = req.body || {};
    const saved = configStore.saveProfile(name, description);
    stateManager.addLog(`[Profiles] Đã lưu hồ sơ cấu hình "${saved.name}".`);
    res.json({ ok: true, profile: saved, profiles: configStore.listProfiles() });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post('/api/config/profiles/:id/load', (req, res) => {
  try {
    const loaded = configStore.loadProfile(req.params.id);
    stateManager.addLog(`[Profiles] Đã nạp hồ sơ cấu hình "${loaded.name}".`);
    res.json({ ok: true, profile: { id: loaded.id, name: loaded.name }, config: configStore.get() });
  } catch (err) {
    res.status(404).json({ ok: false, error: err.message });
  }
});

app.delete('/api/config/profiles/:id', (req, res) => {
  const ok = configStore.deleteProfile(req.params.id);
  res.json({ ok, profiles: configStore.listProfiles() });
});

// Available TikTok Gifts Catalog (Live + Built-in)
app.get('/api/tiktok/gifts', async (req, res) => {
  if (req.query.refresh === '1') {
    await stateManager.tiktokAdapter.refreshGiftCatalog();
  }
  res.json({
    gifts: stateManager.tiktokAdapter.getAvailableGifts(),
    status: stateManager.tiktokAdapter.getStatus()
  });
});

// Edge-TTS Voice Preview Synthesizer (for Admin Config Studio auditioning)
app.post('/api/tts/preview', async (req, res) => {
  try {
    const { text, voice, pitch, rate, playOnOverlay } = req.body || {};
    const sampleText =
      text || 'Nam mô A Di Đà Phật. Cầu chúc quý Phật tử thân tâm thường an lạc, vạn sự kiết tường.';
    const ttsCfg = configStore.get().audioRitual.tts;
    const dataUri = await stateManager.ttsEngine.synthesize(sampleText, {
      voice: voice || ttsCfg.voice,
      pitch: `${pitch !== undefined ? pitch : ttsCfg.pitch}Hz`,
      rate: `${rate !== undefined ? rate : ttsCfg.rate}%`
    });

    if (playOnOverlay && dataUri) {
      broadcaster.broadcastOverlayOnly({
        t: 'tts',
        dataUri,
        text: sampleText,
        tag: 'preview',
        priority: 1
      });
    }

    res.json({ ok: Boolean(dataUri), dataUri });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Live Manager Session Stats & Donors CSV Export
app.get('/api/live/stats', (req, res) => {
  res.json(stateManager.getSessionStats());
});

app.get('/api/live/donors.csv', (req, res) => {
  const csv = stateManager.exportDonorsCsv();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="bang-vang-cong-duc.csv"');
  res.send(csv);
});

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

export function startServer(port = config.port, host = config.host) {
  return new Promise((resolve) => {
    server.listen(port, host, () => {
      console.log(`====================================================`);
      console.log(`Chánh Điện Tịnh Tâm Server listening on http://${host}:${port}`);
      console.log(`Live Manager: http://${host}:${port}/control.html`);
      console.log(`Admin Config: http://${host}:${port}/admin.html`);
      console.log(`OBS Overlay:  http://${host}:${port}/live/overlay.html?role=overlay`);
      console.log(`WebSocket:    ws://${host}:${port}/ws?role=overlay`);
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

const isDirectRun = process.argv[1] && (path.resolve(process.argv[1]) === __filename);
if (isDirectRun) {
  startServer();
}

export default server;
