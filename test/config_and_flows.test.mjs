import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ConfigStore } from '../src/config/ConfigStore.mjs';
import { EventNormalizer } from '../src/moderation/EventNormalizer.mjs';
import { StateManager } from '../src/state/StateManager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('TikTok-Live-Connector v2.5.0 Protobuf Normalization & Dynamic Moderation', () => {
  it('normalizes nested v2.5 WebcastChatMessage and WebcastGiftMessage accurately', () => {
    const normalizer = new EventNormalizer();

    // Real v2.5 Protobuf-shaped WebcastChatMessage
    const v2Chat = {
      common: { msgId: '749911223344', createTime: '1730000123' },
      user: {
        idStr: '698877665544',
        displayId: 'phat_tu_an_lac',
        nickname: 'An Lạc Hạnh',
        profilePicture: { url: ['https://p16.tiktokcdn.com/avatar.webp'] }
      },
      comment: 'Kính bạch cao tăng, cầu bình an cho cả nhà'
    };

    const normChat = normalizer.normalizeTikTokChat(v2Chat);
    assert.ok(normChat);
    assert.strictEqual(normChat.eventId, '749911223344');
    assert.strictEqual(normChat.userId, '698877665544');
    assert.strictEqual(normChat.uniqueId, 'phat_tu_an_lac');
    assert.strictEqual(normChat.nickname, 'An Lạc Hạnh');
    assert.strictEqual(normChat.avatarUrl, 'https://p16.tiktokcdn.com/avatar.webp');
    assert.strictEqual(normChat.payload.detectedSkin, 'master');
    // 10-digit seconds converted to ms
    assert.strictEqual(normChat.timestamp, 1730000123000);

    // Real v2.5 Protobuf-shaped non-streakable big gift (giftType=2, numeric repeatEnd=0 -> must finalize immediately!)
    const v2BigGift = {
      common: { msgId: '749911229999', createTime: 1730000125000 },
      user: {
        idStr: '698877665544',
        displayId: 'phat_tu_an_lac',
        nickname: 'An Lạc Hạnh'
      },
      giftId: 5765,
      repeatCount: 1,
      repeatEnd: 0, // Protobuf default 0 for non-streakable giftType=2
      giftDetails: {
        giftName: 'Galaxy',
        diamondCount: 1000,
        giftType: 2,
        giftImage: { url: ['https://p16.tiktokcdn.com/galaxy.png'] }
      }
    };

    const normBigGift = normalizer.normalizeTikTokGift(v2BigGift);
    assert.ok(normBigGift);
    assert.strictEqual(normBigGift.userId, '698877665544');
    assert.strictEqual(normBigGift.payload.giftId, '5765');
    assert.strictEqual(normBigGift.payload.giftName, 'Galaxy');
    assert.strictEqual(normBigGift.payload.diamondCount, 1000);
    assert.strictEqual(normBigGift.payload.repeatEnd, true, 'Non-streakable v2 gift must set repeatEnd=true');

    // Streakable v2 gift (giftType=1, repeatEnd=0 -> intermediate streak hit)
    const v2StreakHit = {
      user: { idStr: '112233', displayId: 'user_rose', nickname: 'Tâm Từ' },
      giftId: 5655,
      repeatCount: 3,
      repeatEnd: 0,
      giftDetails: { giftName: 'Rose', diamondCount: 1, giftType: 1 }
    };
    const normStreak = normalizer.normalizeTikTokGift(v2StreakHit);
    assert.strictEqual(normStreak.payload.repeatEnd, false, 'Streakable v2 hit with repeatEnd=0 must stay false');
  });

  it('normalizes follow, share, subscribe, envelope and enforces blockedUserIds', () => {
    const normalizer = new EventNormalizer();
    normalizer.configure({
      moderation: {
        enabled: true,
        blockedUserIds: ['spammer_99']
      }
    });

    const blockedRes = normalizer.normalizeTikTokChat({
      user: { idStr: 'spammer_99', nickname: 'Spammer' },
      comment: 'Xin chào'
    });
    assert.strictEqual(blockedRes, null);

    const followEv = normalizer.normalizeTikTokFollow({
      user: { idStr: '888', displayId: 'huu_duyen', nickname: 'Hữu Duyên' }
    });
    assert.strictEqual(followEv.type, 'follow');
    assert.strictEqual(followEv.userId, '888');

    const shareEv = normalizer.normalizeTikTokShare({
      user: { idStr: '888', displayId: 'huu_duyen', nickname: 'Hữu Duyên' }
    });
    assert.strictEqual(shareEv.type, 'share');

    // Reset static blocklist so subsequent tests stay clean
    normalizer.configure({ moderation: { enabled: true, blockedUserIds: [] } });
  });
});

describe('ConfigStore: Persistence, Profiles, Scene Presets & Secret Masking', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chanh-dien-cfg-'));
  const cfgPath = path.join(tmpDir, 'app-config.json');
  const profPath = path.join(tmpDir, 'profiles.json');

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('persists updates to disk, reloads cleanly, manages profiles and masks secrets on export', () => {
    const store1 = new ConfigStore({ persist: true, filePath: cfgPath, profilesPath: profPath });
    store1.update({
      connection: { defaultChannel: 'chua_linh_ung', signApiKey: 'secret_euler_123' },
      audioRitual: { mo: { bpm: 76 } }
    });

    assert.ok(fs.existsSync(cfgPath), 'Config JSON file must be created on disk');

    // Reload in a brand new ConfigStore instance (simulating server restart)
    const store2 = new ConfigStore({ persist: true, filePath: cfgPath, profilesPath: profPath });
    assert.strictEqual(store2.get().connection.defaultChannel, 'chua_linh_ung');
    assert.strictEqual(store2.get().audioRitual.mo.bpm, 76);

    // Save & Load named profile
    const savedProf = store2.saveProfile('Lễ Rằm Tháng Bảy', 'Nhịp nhanh 76 BPM');
    store2.applyScenePreset('tinh_toa');
    assert.strictEqual(store2.get().audioRitual.mo.bpm, 36);

    store2.loadProfile(savedProf.id);
    assert.strictEqual(store2.get().audioRitual.mo.bpm, 76);

    // Export without secrets masks signApiKey, while import preserves local secret
    const safeExport = store2.exportJson(false);
    assert.strictEqual(safeExport.connection.signApiKey, '');

    safeExport.sceneSeating.plaque.title = 'Đại Lễ Vu Lan';
    store2.importJson(safeExport);
    assert.strictEqual(store2.get().sceneSeating.plaque.title, 'Đại Lễ Vu Lan');
    assert.strictEqual(store2.get().connection.signApiKey, 'secret_euler_123');
  });
});

describe('EventFlowEngine & StateManager: Micro-Event Flows End-to-End', () => {
  it('executes member, follow, share (oncePerSession), like milestones, keyword rules & gift overrides', async () => {
    const broadcasts = [];
    const overlayOnly = [];
    const sm = new StateManager({ persistConfig: false });
    sm.setBroadcaster({
      broadcast: (m) => broadcasts.push(m),
      broadcastOverlayOnly: (m) => overlayOnly.push(m),
      broadcastControlOnly: () => {}
    });

    // Configure micro-event flows via update_config command
    sm.handleControlCommand({
      t: 'ctl',
      cmd: 'update_config',
      config: {
        presenceFlows: {
          memberJoin: { enabled: true, seatOnJoin: true, minFreeSeatPercent: 10, defaultSkin: 'nun', welcomeBubble: 'Kính lễ Tam Bảo' },
          share: { enabled: true, seatOnShare: true, bonusCoins: 5, oncePerSession: true }
        },
        likeFlows: {
          milestones: { enabled: true, customThresholds: [500], everyNLikes: 0, sfx: 'great_bell', rainPetals: true, showBanner: true }
        },
        commentFlows: {
          keywordRules: [
            {
              id: 'kw_custom_bell',
              name: 'Gõ Chuông Cầu An',
              enabled: true,
              matchType: 'startsWith',
              keywords: ['cầu an:'],
              requireDonor: false,
              minCoins: 0,
              cooldownSec: 30,
              actions: { bow: true, allBow: true, pulseHalo: true, sfx: 'small_bell', bonusCoins: 3 }
            }
          ]
        },
        giftFlows: {
          giftOverrides: [
            {
              id: 'ov_special_lotus',
              enabled: true,
              giftId: '9999',
              giftName: 'Sen Ngọc Bích',
              meritMultiplier: 2,
              particleTier: 3,
              sfx: 'small_bell',
              pulseHalo: true,
              allBow: true,
              rainPetals: true,
              showBanner: true,
              bannerTitle: 'BẢO VẬT SEN NGỌC BÍCH',
              grantVip: true,
              forceSkin: 'master',
              ttsMode: 'mute'
            }
          ]
        }
      }
    });

    // 1. Member Join Flow -> seats user with 'nun' skin & emits welcome bubble
    sm.handleCanonicalEvent({
      eventId: 'm1',
      source: 'tiktok',
      timestamp: Date.now(),
      userId: 'u_member',
      uniqueId: 'u_member',
      nickname: 'Diệu Liên',
      avatarUrl: '',
      type: 'member',
      payload: {}
    });
    assert.strictEqual(sm.seatingEngine.viewers.get('u_member')?.skin, 'nun');
    assert.ok(broadcasts.some((b) => b.t === 'chat' && b.text === 'Kính lễ Tam Bảo'));

    // 2. Share Flow -> grants +5 coins first time, 0 coins second time (oncePerSession)
    sm.handleCanonicalEvent({
      eventId: 's1',
      source: 'tiktok',
      timestamp: Date.now(),
      userId: 'u_member',
      uniqueId: 'u_member',
      nickname: 'Diệu Liên',
      avatarUrl: '',
      type: 'share',
      payload: {}
    });
    assert.strictEqual(sm.seatingEngine.viewers.get('u_member')?.coins, 5);

    sm.handleCanonicalEvent({
      eventId: 's2',
      source: 'tiktok',
      timestamp: Date.now(),
      userId: 'u_member',
      uniqueId: 'u_member',
      nickname: 'Diệu Liên',
      avatarUrl: '',
      type: 'share',
      payload: {}
    });
    assert.strictEqual(sm.seatingEngine.viewers.get('u_member')?.coins, 5, 'Second share in same session must not duplicate bonus');

    // 3. Comment Keyword Rule -> 'cầu an: gia đình mạnh khỏe' triggers small_bell + +3 bonusCoins
    broadcasts.length = 0;
    sm.handleCanonicalEvent({
      eventId: 'c1',
      source: 'tiktok',
      timestamp: Date.now(),
      userId: 'u_member',
      uniqueId: 'u_member',
      nickname: 'Diệu Liên',
      avatarUrl: '',
      type: 'chat',
      payload: { text: 'Cầu an: gia đình mạnh khỏe' }
    });
    assert.strictEqual(sm.seatingEngine.viewers.get('u_member')?.coins, 8);
    assert.ok(broadcasts.some((b) => b.t === 'bell' && b.isGreatBell === false));
    assert.ok(broadcasts.some((b) => b.t === 'fx' && b.allBow === true));

    // 4. Room Like Milestone -> Crossing 500 totalLikes triggers Great Bell & FX rain
    broadcasts.length = 0;
    sm.handleCanonicalEvent({
      eventId: 'l1',
      source: 'tiktok',
      timestamp: Date.now(),
      userId: 'u_member',
      uniqueId: 'u_member',
      nickname: 'Diệu Liên',
      avatarUrl: '',
      type: 'like',
      payload: { count: 25, totalLikes: 520 }
    });
    assert.ok(broadcasts.some((b) => b.t === 'bell' && b.isGreatBell === true));
    assert.ok(broadcasts.some((b) => b.t === 'fx' && b.rainPetals === true));

    // 5. Specific Gift Override -> 50 diamonds * meritMultiplier(2) = 100 coins, forceSkin='master', ttsMode='mute'
    broadcasts.length = 0;
    sm.handleCanonicalEvent({
      eventId: 'g1',
      source: 'tiktok',
      timestamp: Date.now(),
      userId: 'u_member',
      uniqueId: 'u_member',
      nickname: 'Diệu Liên',
      avatarUrl: '',
      type: 'gift',
      payload: {
        giftId: '9999',
        giftName: 'Sen Ngọc Bích',
        diamondCount: 50,
        repeatCount: 1,
        repeatEnd: true
      }
    });
    assert.strictEqual(sm.seatingEngine.viewers.get('u_member')?.coins, 108);
    assert.strictEqual(sm.seatingEngine.viewers.get('u_member')?.skin, 'master');
    const giftMsg = broadcasts.find((b) => b.t === 'gift' && b.repeatEnd === true);
    assert.strictEqual(giftMsg.total, 100);
    assert.strictEqual(giftMsg.bannerTitle, 'BẢO VẬT SEN NGỌC BÍCH');
    assert.strictEqual(sm.audioQueue.size(), 0, 'ttsMode=mute must suppress TTS enqueue');

    // 6. Live Manager TTS Queue Pause / Mute & CSV Export
    sm.handleControlCommand({ t: 'ctl', cmd: 'tts_queue', action: 'pause' });
    assert.strictEqual(sm.getTtsQueueStatus().paused, true);

    sm.handleControlCommand({ t: 'ctl', cmd: 'tts_queue', action: 'mute' });
    assert.strictEqual(sm.getTtsQueueStatus().muted, true);
    assert.ok(overlayOnly.some((o) => o.t === 'tts_stop' && o.reason === 'panic_mute'));

    const csv = sm.exportDonorsCsv();
    assert.ok(csv.includes('Diệu Liên'));
    assert.ok(csv.includes('108'));

    await sm.destroy();
  });
});

describe('Admin Config Studio HTML & JS DOM Integrity', () => {
  it('ensures every static getElementById in AdminConfigApp.js exists in admin.html', () => {
    const html = fs.readFileSync(path.join(rootDir, 'public', 'admin.html'), 'utf8');
    const js = fs.readFileSync(path.join(rootDir, 'public', 'js', 'AdminConfigApp.js'), 'utf8');

    const idRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
    const missing = [];
    let match;
    while ((match = idRegex.exec(js)) !== null) {
      const id = match[1];
      if (!new RegExp(`id=["']${id}["']`).test(html)) {
        missing.push(id);
      }
    }
    assert.deepEqual(missing, [], `Missing element IDs in admin.html: ${missing.join(', ')}`);
  });
});

describe('Admin Config & Live Manager HTTP REST API Endpoints', () => {
  it('serves /admin, /api/config, /api/tiktok/gifts, /api/config/preset and /api/live/donors.csv', async () => {
    const { startServer, shutdown, configStore } = await import('../src/server.mjs');
    const srv = await startServer(0, '127.0.0.1');
    const port = srv.address().port;
    const base = `http://127.0.0.1:${port}`;

    try {
      // 1. /admin serves HTML Studio
      const adminPage = await fetch(`${base}/admin`);
      assert.strictEqual(adminPage.status, 200);
      const adminHtml = await adminPage.text();
      assert.ok(adminHtml.includes('ADMIN CONFIG STUDIO'));

      // 2. GET /api/config
      const cfgResp = await fetch(`${base}/api/config`);
      assert.strictEqual(cfgResp.status, 200);
      const cfgJson = await cfgResp.json();
      assert.ok(cfgJson.config.giftFlows);
      assert.ok(Array.isArray(cfgJson.availableGifts));
      assert.ok(cfgJson.availableGifts.length >= 15);

      // 3. POST /api/config/preset
      const presetResp = await fetch(`${base}/api/config/preset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId: 'dai_le' })
      });
      const presetJson = await presetResp.json();
      assert.strictEqual(presetJson.ok, true);
      assert.strictEqual(presetJson.config.audioRitual.mo.bpm, 72);

      // 4. GET /api/live/donors.csv
      const csvResp = await fetch(`${base}/api/live/donors.csv`);
      assert.strictEqual(csvResp.status, 200);
      const csvText = await csvResp.text();
      assert.ok(csvText.includes('Tên Phật Tử'));

      // Restore defaults on disk after test
      configStore.resetAll();
    } finally {
      await shutdown();
    }
  });
});

