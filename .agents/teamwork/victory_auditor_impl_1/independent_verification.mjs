import { createServer } from 'http';
import express from 'express';
import { WebSocket } from 'ws';
import { StateManager } from '../../../src/state/StateManager.mjs';
import { Broadcaster } from '../../../src/broadcaster/Broadcaster.mjs';
import assert from 'node:assert/strict';

const app = express();
app.use(express.static('public'));
const server = createServer(app);

const stateManager = new StateManager({ joinOnEnter: true });
const broadcaster = new Broadcaster({ server, stateManager });
stateManager.broadcaster = broadcaster;

server.on('upgrade', (req, socket, head) => {
  broadcaster.handleUpgrade(req, socket, head);
});

server.listen(4123, async () => {
  try {
    // 1. Check HTTP overlay.html
    const resOverlay = await fetch('http://127.0.0.1:4123/overlay.html');
    assert.equal(resOverlay.status, 200, 'overlay.html must be served with 200 OK');
    const htmlOverlay = await resOverlay.text();
    assert.ok(htmlOverlay.includes('id="templeCanvas"'), 'overlay.html must declare templeCanvas');
    assert.ok(htmlOverlay.includes('id="plaque"'), 'overlay.html must declare plaque HUD');
    assert.ok(htmlOverlay.includes('id="merit"'), 'overlay.html must declare merit HUD');
    assert.ok(htmlOverlay.includes('id="speech-bubbles"'), 'overlay.html must declare speech bubbles container');
    console.log('[PASS] HTTP overlay.html verified.');

    // 2. Check HTTP control.html
    const resControl = await fetch('http://127.0.0.1:4123/control.html');
    assert.equal(resControl.status, 200, 'control.html must be served with 200 OK');
    const htmlControl = await resControl.text();
    assert.ok(htmlControl.includes('id="module-connection"'), 'control.html must declare module-connection');
    assert.ok(htmlControl.includes('id="floor-matrix-container"'), 'control.html must declare floor-matrix-container');
    assert.ok(htmlControl.includes('id="btn-trigger-great-bell"'), 'control.html must declare Great Bell button');
    assert.ok(htmlControl.includes('id="slider-mo-bpm"'), 'control.html must declare BPM slider');
    console.log('[PASS] HTTP control.html verified.');

    // 3. Check WS role=overlay connection & snapshot receipt
    const wsOverlay = new WebSocket('ws://127.0.0.1:4123/ws?role=overlay');
    const overlaySnapshot = await new Promise((resolve, reject) => {
      wsOverlay.on('message', (data) => resolve(JSON.parse(data.toString())));
      wsOverlay.on('error', reject);
    });
    assert.equal(overlaySnapshot.t, 'state', 'Snapshot message type must be state');
    assert.equal(overlaySnapshot.cap, 36, 'Default capacity must be 36');
    assert.ok(Array.isArray(overlaySnapshot.viewers), 'Snapshot must include viewers array');
    console.log('[PASS] WS role=overlay snapshot receipt verified.');

    // 4. Test overlay read-only enforcement (close with 4403 on client message)
    const overlayCloseCode = await new Promise((resolve) => {
      wsOverlay.on('close', (code) => resolve(code));
      wsOverlay.send(JSON.stringify({ t: 'chat', text: 'illegal' }));
    });
    assert.equal(overlayCloseCode, 4403, 'Overlay client sending message must trigger 4403');
    console.log('[PASS] WS role=overlay read-only protection (4403) verified.');

    // 5. Check WS role=control connection
    const wsControl = new WebSocket('ws://127.0.0.1:4123/ws?role=control');
    const controlSnapshot = await new Promise((resolve, reject) => {
      wsControl.on('message', (data) => resolve(JSON.parse(data.toString())));
      wsControl.on('error', reject);
    });
    assert.equal(controlSnapshot.t, 'state');
    console.log('[PASS] WS role=control snapshot receipt verified.');

    // 6. Test control command dispatch & broadcast
    wsControl.send(JSON.stringify({
      t: 'ctl',
      cmd: 'chat',
      id: 'auditor_tester',
      name: 'Kiểm Định Viên',
      text: 'Nam mô A Di Đà Phật'
    }));

    // Wait for chat event broadcast to control
    const broadcastChat = await new Promise((resolve) => {
      const handler = (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.t === 'chat' && msg.id === 'auditor_tester') {
          wsControl.off('message', handler);
          resolve(msg);
        }
      };
      wsControl.on('message', handler);
    });
    assert.equal(broadcastChat.name, 'Kiểm Định Viên');
    assert.equal(broadcastChat.text, 'Nam mô A Di Đà Phật');
    assert.ok(broadcastChat.slotIndex >= 0, 'Seated user must have non-negative slot index');
    console.log('[PASS] WS control command dispatch & chat broadcast verified (slotIndex: ' + broadcastChat.slotIndex + ').');

    // 7. Test Bell trigger
    wsControl.send(JSON.stringify({
      t: 'ctl',
      cmd: 'bell',
      isGreatBell: true
    }));

    const bellMsg = await new Promise((resolve) => {
      const handler = (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.t === 'bell') {
          wsControl.off('message', handler);
          resolve(msg);
        }
      };
      wsControl.on('message', handler);
    });
    assert.equal(bellMsg.isGreatBell, true);
    console.log('[PASS] WS control Great Bell command & broadcast verified.');

    wsControl.close();
    clearInterval(broadcaster.pingInterval);
    await stateManager.destroy();
    broadcaster.wss.close();
    server.close(() => {
      console.log('ALL INDEPENDENT SERVER SANITY CHECKS PASSED WITH CODE 0!');
    });
  } catch (err) {
    console.error('INDEPENDENT SANITY FAILED:', err);
    process.exit(1);
  }
});
