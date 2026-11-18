import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Milestone 3 (R3): Control Dashboard Integrity & Verification', () => {

  const htmlPath = path.join(rootDir, 'public', 'control.html');
  const cssPath = path.join(rootDir, 'public', 'css', 'control.css');
  const jsPath = path.join(rootDir, 'public', 'js', 'ControlApp.js');

  test('TC-M3-01: Exclusive file ownership and file existence', () => {
    assert.ok(fs.existsSync(htmlPath), 'public/control.html must exist');
    assert.ok(fs.existsSync(cssPath), 'public/css/control.css must exist');
    assert.ok(fs.existsSync(jsPath), 'public/js/ControlApp.js must exist');

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const jsContent = fs.readFileSync(jsPath, 'utf8');

    assert.ok(htmlContent.length > 500, 'public/control.html must not be empty');
    assert.ok(cssContent.length > 500, 'public/css/control.css must not be empty');
    assert.ok(jsContent.length > 1000, 'public/js/ControlApp.js must not be empty');
  });

  test('TC-M3-02: HTML semantic structure and resource linkage', () => {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Must link to CSS and JS
    assert.match(htmlContent, /<link[^>]+href=["']css\/control\.css["']/i, 'Must link to css/control.css');
    assert.match(htmlContent, /<script[^>]+src=["']js\/ControlApp\.js["']/i, 'Must load js/ControlApp.js as module');
    assert.match(htmlContent, /type=["']module["']/i, 'Script must be type="module"');

    // Must contain 5 core module sections
    assert.match(htmlContent, /id=["']module-connection["']/i, 'Must contain module-connection');
    assert.match(htmlContent, /id=["']module-seating["']/i, 'Must contain module-seating');
    assert.match(htmlContent, /id=["']module-audio["']/i, 'Must contain module-audio');
    assert.match(htmlContent, /id=["']module-simulation["']/i, 'Must contain module-simulation');
    assert.match(htmlContent, /id=["']module-audit["']/i, 'Must contain module-audit');

    // Must contain 9:16 OBS preview launcher button
    assert.match(htmlContent, /id=["']btn-open-preview["']/i, 'Must contain 9:16 preview button');
  });

  test('TC-M3-03: DOM element ID synchronization between HTML and JS', () => {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const jsContent = fs.readFileSync(jsPath, 'utf8');

    // Extract all getElementById calls in JS
    const idRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
    const requiredIds = new Set();
    let match;
    while ((match = idRegex.exec(jsContent)) !== null) {
      requiredIds.add(match[1]);
    }

    assert.ok(requiredIds.size >= 30, `Expected at least 30 element IDs, found ${requiredIds.size}`);

    const missingIds = [];
    for (const id of requiredIds) {
      const pattern = new RegExp(`id=["']${id}["']`);
      if (!pattern.test(htmlContent)) {
        missingIds.push(id);
      }
    }

    assert.deepEqual(missingIds, [], `All element IDs in ControlApp.js must exist in control.html. Missing: ${missingIds.join(', ')}`);
  });

  test('TC-M3-04: CSS Zen Brown / Gold theme variables & 2.5D perspective styles', () => {
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // Color tokens
    assert.ok(cssContent.includes('--bg-panel: #241915') || cssContent.includes('#241915'), 'CSS must define #241915');
    assert.ok(cssContent.includes('--gold-primary: #f59e0b') || cssContent.includes('#f59e0b'), 'CSS must define #f59e0b');
    assert.ok(cssContent.includes('#fbbf24'), 'CSS must define #fbbf24');
    assert.ok(cssContent.includes('#d97706') || cssContent.includes('#78350f'), 'CSS must define amber/gold accents');

    // 2.5D perspective classes
    assert.match(cssContent, /perspective:\s*1200px/i, 'CSS must include 3D perspective definition');
    assert.match(cssContent, /rotateX\(12deg\)/i, 'CSS must include 2.5D floor tilt rotateX');
    assert.match(cssContent, /\.central-aisle/i, 'CSS must define central aisle divider');
    assert.match(cssContent, /\.slot-cushion/i, 'CSS must define slot cushion styling');
  });

  test('TC-M3-05: ControlApp state store logic and ring buffer', async () => {
    // Dynamic import of AdminStateStore from ControlApp.js
    const { AdminStateStore } = await import('../public/js/ControlApp.js');
    const store = new AdminStateStore();

    assert.equal(store.wsStatus, 'disconnected');
    assert.equal(store.cap, 24);
    assert.equal(store.slots.length, 100);

    // Test log ring buffer classification and 300-entry max limit
    for (let i = 0; i < 350; i++) {
      if (i % 5 === 0) store.appendLogEntry(`🎁 Diệu Hạnh cúng dường Hoa Sen x1 (+30 xu) [${i}]`);
      else if (i % 5 === 1) store.appendLogEntry(`💬 Minh Tâm bình luận: Nam Mô A Di Đà Phật [${i}]`);
      else if (i % 5 === 2) store.appendLogEntry(`🔔 Thỉnh Đại Hồng Chung ngân vang [${i}]`);
      else if (i % 5 === 3) store.appendLogEntry(`[LỖI] Đóng kết nối bất thường [${i}]`);
      else store.appendLogEntry(`Khởi tạo hệ thống [${i}]`);
    }

    assert.equal(store.logs.length, 300, 'Store must cap log entries strictly at 300');
    assert.equal(store.logs[299].raw.includes('[349]'), true, 'Most recent log must be preserved');

    // Test state synchronization
    const mockState = {
      t: 'state',
      settings: {
        title: 'Chánh Điện Thử Nghiệm',
        moBpm: 60,
        music: true
      },
      cap: 36,
      startedAt: 1700000000000,
      tiktok: {
        status: 'connected',
        uniqueId: 'kenh_live_test',
        viewerCount: 1500,
        likeCount: 50000
      },
      viewers: [
        { id: 'u1', name: 'Phật Tử 1', skin: 'monk', coins: 100, slotIndex: 0, isVip: true },
        { id: 'u2', name: 'Phật Tử 2', skin: 'nun', coins: 50, slotIndex: 5, isVip: false }
      ]
    };

    store.syncFullState(mockState);
    assert.equal(store.settings.title, 'Chánh Điện Thử Nghiệm');
    assert.equal(store.settings.moBpm, 60);
    assert.equal(store.cap, 36);
    assert.equal(store.tiktok.status, 'connected');
    assert.equal(store.slots[0].name, 'Phật Tử 1');
    assert.equal(store.slots[0].isVip, true);
    assert.equal(store.slots[5].name, 'Phật Tử 2');
    assert.equal(store.slots[1], null);

    // Test viewer join
    store.addOrUpdateViewer({ id: 'u3', name: 'Phật Tử 3', skin: 'man', coins: 10, slotIndex: 1 });
    assert.equal(store.slots[1].name, 'Phật Tử 3');

    // Test skin change
    store.updateSkin('u3', 'child');
    assert.equal(store.slots[1].skin, 'child');

    // Test viewer leave
    store.removeViewer('u3', 1, 'kicked');
    assert.equal(store.slots[1], null);
  });

  test('TC-M3-06: WebSocket Client command envelope adherence for all 16 ctl schemas', async () => {
    const { AdminStateStore, WebSocketNetworkClient } = await import('../public/js/ControlApp.js');
    const store = new AdminStateStore();
    const wsClient = new WebSocketNetworkClient(store);

    const sentMessages = [];
    // Mock ws socket
    wsClient.ws = {
      readyState: 1, // WebSocket.OPEN
      send: (data) => sentMessages.push(JSON.parse(data))
    };

    // 1. connect
    wsClient.sendCommand('connect', { uniqueId: 'kenh_phat_phap', roomId: '12345' });
    assert.deepEqual(sentMessages[0], {
      t: 'ctl',
      cmd: 'connect',
      uniqueId: 'kenh_phat_phap',
      roomId: '12345'
    });

    // 2. disconnect
    wsClient.sendCommand('disconnect');
    assert.deepEqual(sentMessages[1], { t: 'ctl', cmd: 'disconnect' });

    // 3. chat
    wsClient.sendCommand('chat', { name: 'Diệu Âm', text: 'Nam Mô A Di Đà Phật', id: 'sim_1' });
    assert.deepEqual(sentMessages[2], {
      t: 'ctl',
      cmd: 'chat',
      name: 'Diệu Âm',
      text: 'Nam Mô A Di Đà Phật',
      id: 'sim_1'
    });

    // 4. gift
    wsClient.sendCommand('gift', { name: 'Minh Tâm', gift: 'Hoa Sen', diamonds: 30, count: 1, prayer: 'Cầu an' });
    assert.deepEqual(sentMessages[3], {
      t: 'ctl',
      cmd: 'gift',
      name: 'Minh Tâm',
      gift: 'Hoa Sen',
      diamonds: 30,
      count: 1,
      prayer: 'Cầu an'
    });

    // 5. fill
    wsClient.sendCommand('fill', { n: 36 });
    assert.deepEqual(sentMessages[4], { t: 'ctl', cmd: 'fill', n: 36 });

    // 6. clear
    wsClient.sendCommand('clear');
    assert.deepEqual(sentMessages[5], { t: 'ctl', cmd: 'clear' });

    // 7. bots / bot
    wsClient.sendCommand('bots', { on: true, n: 20, pace: 'mid' });
    assert.deepEqual(sentMessages[6], { t: 'ctl', cmd: 'bots', on: true, n: 20, pace: 'mid' });

    // 8. skin
    wsClient.sendCommand('skin', { id: 'user_1', skin: 'monk' });
    assert.deepEqual(sentMessages[7], { t: 'ctl', cmd: 'skin', id: 'user_1', skin: 'monk' });

    // 9. kick
    wsClient.sendCommand('kick', { id: 'user_1', slotIndex: 0 });
    assert.deepEqual(sentMessages[8], { t: 'ctl', cmd: 'kick', id: 'user_1', slotIndex: 0 });

    // 10. slot
    wsClient.sendCommand('slot', { slotIndex: 0, action: 'vip', id: 'user_1' });
    assert.deepEqual(sentMessages[9], { t: 'ctl', cmd: 'slot', slotIndex: 0, action: 'vip', id: 'user_1' });

    // 11. bell
    wsClient.sendCommand('bell', { isGreatBell: true, great: true });
    assert.deepEqual(sentMessages[10], { t: 'ctl', cmd: 'bell', isGreatBell: true, great: true });

    // 12. mo
    wsClient.sendCommand('mo');
    assert.deepEqual(sentMessages[11], { t: 'ctl', cmd: 'mo' });

    // 13. chant
    wsClient.sendCommand('chant', { text: 'Nguyện đem công đức này...' });
    assert.deepEqual(sentMessages[12], { t: 'ctl', cmd: 'chant', text: 'Nguyện đem công đức này...' });

    // 14. say / tts
    wsClient.sendCommand('say', { text: 'Kính mời chư vị lắng lòng', voice: 'vi-VN-NamMinhNeural', pitch: -18, rate: -20 });
    assert.deepEqual(sentMessages[13], {
      t: 'ctl',
      cmd: 'say',
      text: 'Kính mời chư vị lắng lòng',
      voice: 'vi-VN-NamMinhNeural',
      pitch: -18,
      rate: -20
    });

    // 15. settings
    wsClient.sendCommand('settings', { settings: { moBpm: 60, music: true } });
    assert.deepEqual(sentMessages[14], {
      t: 'ctl',
      cmd: 'settings',
      settings: { moBpm: 60, music: true }
    });

    // 16. title
    wsClient.sendCommand('title', { title: 'Chánh Điện Tịnh Tâm', subtitle: 'A Di Đà Phật' });
    assert.deepEqual(sentMessages[15], {
      t: 'ctl',
      cmd: 'title',
      title: 'Chánh Điện Tịnh Tâm',
      subtitle: 'A Di Đà Phật'
    });

    assert.equal(sentMessages.length, 16, 'All 16 ctl commands must be sent with exact protocol envelope');
  });

  test('TC-M3-07: WebSocket Inbound message routing handles all server event types', async () => {
    const { AdminStateStore, WebSocketNetworkClient } = await import('../public/js/ControlApp.js');
    const store = new AdminStateStore();
    const wsClient = new WebSocketNetworkClient(store);

    // Inbound test packets
    wsClient.handleIncomingMessage(JSON.stringify({ t: 'state', settings: { moBpm: 52 }, viewers: [], cap: 24, tiktok: { status: 'idle' } }));
    assert.equal(store.settings.moBpm, 52);
    assert.equal(store.cap, 24);

    wsClient.handleIncomingMessage(JSON.stringify({ t: 'join', v: { id: 'test_1', name: 'Tester', skin: 'man', slotIndex: 3 } }));
    assert.equal(store.slots[3].name, 'Tester');

    wsClient.handleIncomingMessage(JSON.stringify({ t: 'skin', id: 'test_1', skin: 'master' }));
    assert.equal(store.slots[3].skin, 'master');

    wsClient.handleIncomingMessage(JSON.stringify({ t: 'leave', id: 'test_1', slotIndex: 3 }));
    assert.equal(store.slots[3], null);

    wsClient.handleIncomingMessage(JSON.stringify({ t: 'bots', on: true, count: 25, pace: 'fast' }));
    assert.equal(store.botState.on, true);
    assert.equal(store.botState.count, 25);
    assert.equal(store.botState.pace, 'fast');

    wsClient.handleIncomingMessage(JSON.stringify({ t: 'tiktok', status: 'connected', uniqueId: 'kenh_phat_phap', viewerCount: 999 }));
    assert.equal(store.tiktok.status, 'connected');
    assert.equal(store.tiktok.viewerCount, 999);

    wsClient.handleIncomingMessage(JSON.stringify({ t: 'logs', lines: ['Line 1', 'Line 2'] }));
    assert.ok(store.logs.some(l => l.raw === 'Line 1'));
    assert.ok(store.logs.some(l => l.raw === 'Line 2'));
  });

  test('TC-M3-08: Live WebSocket network integration test with state hydration and command round-trip', async () => {
    const { WebSocketServer } = await import('ws');
    const { AdminStateStore, WebSocketNetworkClient } = await import('../public/js/ControlApp.js');

    const TEST_PORT = 3889;
    const wss = new WebSocketServer({ port: TEST_PORT });

    const serverReceivedCommands = [];
    let serverSocket = null;

    wss.on('connection', (ws, req) => {
      serverSocket = ws;
      assert.ok(req.url.includes('role=control'), 'Server must receive role=control handshake parameter');

      // Send initial snapshot
      ws.send(JSON.stringify({
        t: 'state',
        settings: {
          title: 'Chánh Điện Trực Tiếp',
          moBpm: 60,
          music: true,
          autoChant: true
        },
        cap: 24,
        startedAt: Date.now() - 10000,
        tiktok: {
          status: 'connected',
          uniqueId: 'kenh_live_chinh_thuc',
          viewerCount: 2500,
          likeCount: 75000
        },
        viewers: [
          { id: 'v1', name: 'Thích Tâm An', skin: 'monk', coins: 500, slotIndex: 0, isVip: true }
        ]
      }));

      ws.on('message', (raw) => {
        const parsed = JSON.parse(raw.toString('utf8'));
        serverReceivedCommands.push(parsed);
      });
    });

    const store = new AdminStateStore();
    const client = new WebSocketNetworkClient(store);
    client.wsUrl = `ws://127.0.0.1:${TEST_PORT}/ws?role=control`;

    // Connect client
    client.connect();

    // Wait for connection and state hydration
    await new Promise((resolve) => {
      const checkHydrated = () => {
        if (store.wsStatus === 'connected' && store.settings.title === 'Chánh Điện Trực Tiếp') {
          resolve();
        } else {
          setTimeout(checkHydrated, 20);
        }
      };
      checkHydrated();
    });

    assert.equal(store.wsStatus, 'connected');
    assert.equal(store.settings.title, 'Chánh Điện Trực Tiếp');
    assert.equal(store.slots[0].name, 'Thích Tâm An');
    assert.equal(store.slots[0].isVip, true);

    // Send control commands from client
    client.sendCommand('bell', { isGreatBell: true });
    client.sendCommand('say', { text: 'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật' });

    // Wait for server to receive
    await new Promise((resolve) => {
      const checkCommands = () => {
        if (serverReceivedCommands.length >= 2) resolve();
        else setTimeout(checkCommands, 20);
      };
      checkCommands();
    });

    assert.equal(serverReceivedCommands[0].t, 'ctl');
    assert.equal(serverReceivedCommands[0].cmd, 'bell');
    assert.equal(serverReceivedCommands[0].isGreatBell, true);

    assert.equal(serverReceivedCommands[1].t, 'ctl');
    assert.equal(serverReceivedCommands[1].cmd, 'say');
    assert.equal(serverReceivedCommands[1].text, 'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật');

    // Server broadcasts live gift event
    serverSocket.send(JSON.stringify({
      t: 'gift',
      id: 'v1',
      name: 'Thích Tâm An',
      giftName: 'Đèn Hoa Sen',
      coins: 30,
      count: 1,
      tier: 2,
      prayer: 'Nguyện cầu quốc thái dân an'
    }));

    // Wait for store to process gift
    await new Promise((resolve) => {
      const checkCoins = () => {
        if (store.slots[0].coins === 530) resolve();
        else setTimeout(checkCoins, 20);
      };
      checkCoins();
    });

    assert.equal(store.slots[0].coins, 530, 'Occupant coins should be incremented to 530');
    assert.ok(store.logs.some(l => l.raw.includes('Đèn Hoa Sen')), 'Gift log must be present in audit buffer');

    // Clean up
    client.disconnect();
    await new Promise((resolve) => wss.close(resolve));
  });

});

