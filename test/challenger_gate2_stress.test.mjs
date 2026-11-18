/**
 * challenger_gate2_stress.test.mjs
 * Gate 2 Challenger Automated Stress & Edge Case Verification Harness
 * 
 * Verifies:
 * 1. Unicode Profanity Boundary Rigor (standalone, false positives, punctuation boundaries, ReDoS stress)
 * 2. Watchdog Auto-Reconnection Lifecycle (stalled connection, shouldStayConnected, listener cleanup, backoff)
 * 3. Unseated Viewer Slot Index Isolation (100-seat saturation, slotIndex: -1 assertions, Seat #0 visual isolation)
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

import { ProfanityFilter } from '../src/moderation/ProfanityFilter.mjs';
import { TikTokLiveAdapter } from '../src/ingestion/TikTokLiveAdapter.mjs';
import { StateManager } from '../src/state/StateManager.mjs';
import { OverlayApp } from '../public/js/OverlayApp.js';

// ==============================================================================
// 1. UNICODE PROFANITY BOUNDARY RIGOR
// ==============================================================================

describe('Dimension 1: Unicode Profanity Boundary Rigor', () => {

  test('1.1: Standalone primary Vietnamese profanities with diacritics must be detected', () => {
    const standaloneTargets = [
      'đm',
      'địt',
      'đéo',
      'đụ má',
      'âm vật',
      'đcm',
      'lồn',
      'cặc',
      'buồi',
      'đụ',
      'mẹ mày',
      'mẹ kiếp',
      'dương vật',
      'khiêu dâm',
      'ma tăng',
      'phỉ báng tam bảo'
    ];

    for (const term of standaloneTargets) {
      assert.strictEqual(
        ProfanityFilter.isProfane(term),
        true,
        `Expected standalone term "${term}" to be flagged as profane`
      );
      // Case variations
      assert.strictEqual(
        ProfanityFilter.isProfane(term.toUpperCase()),
        true,
        `Expected uppercase "${term.toUpperCase()}" to be flagged as profane`
      );
      // Comment filter check
      const filterResult = ProfanityFilter.filterComment(term);
      assert.strictEqual(filterResult.allowed, false, `Comment "${term}" must not be allowed`);
      assert.strictEqual(filterResult.cleanedText, '', `Cleaned text for "${term}" must be empty`);
      // Nickname sanitization check
      const sanitizedNick = ProfanityFilter.sanitizeNickname(term);
      assert.strictEqual(sanitizedNick, 'Phật tử hữu duyên', `Profane nick "${term}" must be replaced`);
    }
  });

  test('1.2: Embedded strings and valid Vietnamese words MUST NOT trigger false positives', () => {
    const falsePositiveCandidates = [
      'đêm nay',
      'đạo tràng',
      'đức hạnh',
      'con đường',
      'đêm ngày tĩnh lặng',
      'đêm rằm trăng thanh',
      'đạo đức sáng ngời',
      'đạo lý từ bi',
      'đức phật từ phụ',
      'công đức vô lượng',
      'con đường giác ngộ',
      'đường về cõi tịnh',
      'âm vang chuông chùa',
      'âm nhạc thiền tịnh',
      'âm thanh vi diệu',
      'vật phẩm cúng dường',
      'chúng sinh vạn vật',
      'nhân vật lương thiện',
      'đoàn kết hòa hợp',
      'đỗ đạt thành tài',
      'đổi mới tâm tính',
      'đốm sáng trí tuệ'
    ];

    for (const phrase of falsePositiveCandidates) {
      assert.strictEqual(
        ProfanityFilter.isProfane(phrase),
        false,
        `False positive detected! Legitimate phrase "${phrase}" was incorrectly flagged as profane`
      );
      const filterResult = ProfanityFilter.filterComment(phrase);
      assert.strictEqual(filterResult.allowed, true, `Comment "${phrase}" must be allowed`);
      assert.strictEqual(filterResult.cleanedText, phrase, `Cleaned text must match input`);
      const nick = ProfanityFilter.sanitizeNickname(phrase.slice(0, 18));
      assert.notStrictEqual(nick, 'Phật tử hữu duyên', `Valid nick "${phrase}" should not be replaced`);
    }
  });

  test('1.3: Punctuation boundaries and wrapping characters must still correctly detect profanity', () => {
    const punctuationCases = [
      { raw: '.đm,', term: 'đm' },
      { raw: '!địt?', term: 'địt' },
      { raw: '(đéo)', term: 'đéo' },
      { raw: '[đụ má]', term: 'đụ má' },
      { raw: '~âm vật~', term: 'âm vật' },
      { raw: '"đm"', term: 'đm' },
      { raw: "'địt'", term: 'địt' },
      { raw: '<đéo>', term: 'đéo' },
      { raw: '«đm»', term: 'đm' },
      { raw: '“địt”', term: 'địt' },
      { raw: '‘đéo’', term: 'đéo' },
      { raw: '—đụ má—', term: 'đụ má' },
      { raw: '…âm vật…', term: 'âm vật' },
      { raw: '🙏đm🙏', term: 'đm' },
      { raw: '🌸địt🌸', term: 'địt' },
      { raw: '🪷(đéo)🪷', term: 'đéo' },
      { raw: 'Chào đạo hữu, .đm, sao thế?', term: 'đm' },
      { raw: 'Nam mô A Di Đà Phật! !địt? Thật vô phép', term: 'địt' },
      { raw: 'Nói chuyện (đéo) có văn hóa', term: 'đéo' },
      { raw: 'Ai lại dùng từ [đụ má] ở chánh điện', term: 'đụ má' }
    ];

    for (const { raw, term } of punctuationCases) {
      assert.strictEqual(
        ProfanityFilter.isProfane(raw),
        true,
        `Failed to detect profanity "${term}" within punctuation wrapping: "${raw}"`
      );
      assert.strictEqual(
        ProfanityFilter.filterComment(raw).allowed,
        false,
        `Expected comment containing "${raw}" to be rejected`
      );
    }
  });

  test('1.4: High-throughput stress & ReDoS safety benchmark (5,000 iterations)', () => {
    const testCorpus = [
      'Nam mô Bổn Sư Thích Ca Mâu Ni Phật',
      'Đêm nay chùa trang nghiêm thanh tịnh',
      'Con đường đạo đức đưa đến an lạc',
      'đm cái gì thế này',
      'Âm vang tiếng mõ ngân nga',
      '!địt? sao lại nói tục',
      'Vật phẩm cúng Phật chí thành',
      'Thật là (đéo) chấp nhận được',
      'Đạo tràng tịnh tâm trang nghiêm',
      'Cúng dường hoa sen thanh khiết'
    ];

    const startTime = performance.now();
    const ITERATIONS = 5000;
    let profaneCount = 0;

    for (let i = 0; i < ITERATIONS; i++) {
      const text = testCorpus[i % testCorpus.length];
      if (ProfanityFilter.isProfane(text)) {
        profaneCount++;
      }
    }

    const durationMs = performance.now() - startTime;
    const opsPerSec = (ITERATIONS / (durationMs / 1000)).toFixed(0);

    // 3 of 10 items in corpus are profane: 5000 * 0.3 = 1500
    assert.strictEqual(profaneCount, 1500, 'Profane detection count mismatch across stress iterations');
    assert.ok(
      durationMs < 500,
      `ProfanityFilter stress too slow: ${durationMs.toFixed(2)}ms for ${ITERATIONS} ops (${opsPerSec} ops/sec)`
    );
  });
});

// ==============================================================================
// 2. WATCHDOG AUTO-RECONNECTION LIFECYCLE
// ==============================================================================

describe('Dimension 2: Watchdog Auto-Reconnection Lifecycle', () => {

  class MockConnection extends EventEmitter {
    constructor() {
      super();
      this.disconnected = false;
      this.disconnectCallCount = 0;
      this.removeAllListenersCallCount = 0;
    }
    async connect() {
      return { roomId: '9988776655' };
    }
    async disconnect() {
      this.disconnected = true;
      this.disconnectCallCount++;
    }
    removeAllListeners(...args) {
      this.removeAllListenersCallCount++;
      return super.removeAllListeners(...args);
    }
  }

  test('2.1: Watchdog timeout maintains shouldStayConnected=true, resets old socket, and schedules reconnect', async () => {
    const adapter = new TikTokLiveAdapter({
      uniqueId: 'chua_tinh_tam_stress',
      autoReconnect: true
    });

    const mockConn = new MockConnection();
    adapter.connection = mockConn;
    adapter.status = 'connected';
    adapter.shouldStayConnected = true;
    adapter.reconnection.isWatching = true;

    // Attach sample listener to mockConn to verify removal
    mockConn.on('chat', () => {});
    assert.strictEqual(mockConn.listenerCount('chat'), 1, 'Mock connection should have 1 chat listener initially');

    let statusUpdate = null;
    adapter.onStatusChange = (status) => {
      statusUpdate = status;
    };

    // Trigger watchdog timeout
    await adapter.reconnection.onWatchdogTimeout();

    // 1. Assert shouldStayConnected remains true (vital for reconnect loop!)
    assert.strictEqual(
      adapter.shouldStayConnected,
      true,
      'adapter.shouldStayConnected MUST remain true after watchdog timeout'
    );

    // 2. Assert status updated to disconnected
    assert.strictEqual(adapter.status, 'disconnected', 'Status must transition to disconnected');
    assert.ok(statusUpdate, 'Status change callback must be emitted');
    assert.strictEqual(statusUpdate.status, 'disconnected');
    assert.match(statusUpdate.error, /Watchdog timeout/);

    // 3. Assert previous connection was thoroughly cleaned up
    assert.strictEqual(mockConn.disconnected, true, 'Old connection must have disconnect() called');
    assert.strictEqual(mockConn.removeAllListenersCallCount >= 1, true, 'Old connection listeners must be cleared');
    assert.strictEqual(mockConn.listenerCount('chat'), 0, 'No dangling listeners on old connection');
    assert.strictEqual(adapter.connection, null, 'adapter.connection must be nullified to prevent stale references');

    // 4. Assert reconnectTimeout was scheduled in ReconnectionEngine
    assert.notStrictEqual(
      adapter.reconnection.reconnectTimeout,
      null,
      'adapter.reconnection.reconnectTimeout MUST be scheduled'
    );
    assert.strictEqual(adapter.reconnection.attempt, 1, 'Reconnection attempt should be incremented to 1');

    // 5. Assert watchdog timer is stopped during disconnected waiting phase
    assert.strictEqual(adapter.reconnection.isWatching, false, 'Watchdog must be stopped while disconnected');

    // Clean up timer
    adapter.reconnection.cancelReconnect();
  });

  test('2.2: Multi-cycle watchdog timeout stress prevents listener accumulation and process hang', async () => {
    const adapter = new TikTokLiveAdapter({
      uniqueId: 'chua_tinh_tam_multicycle',
      autoReconnect: true
    });

    const socketsCreated = [];

    // Simulate 5 consecutive connection/watchdog cycles
    for (let cycle = 1; cycle <= 5; cycle++) {
      const mockConn = new MockConnection();
      socketsCreated.push(mockConn);
      adapter.connection = mockConn;
      adapter.status = 'connected';
      adapter.shouldStayConnected = true;

      // Register live listeners like _doConnect does
      mockConn.on('chat', () => {});
      mockConn.on('gift', () => {});
      mockConn.on('like', () => {});
      mockConn.on('roomUser', () => {});

      assert.strictEqual(mockConn.listenerCount('chat'), 1);

      // Trigger watchdog
      await adapter.reconnection.onWatchdogTimeout();

      assert.strictEqual(adapter.shouldStayConnected, true);
      assert.strictEqual(adapter.status, 'disconnected');
      assert.strictEqual(adapter.connection, null);
      assert.strictEqual(mockConn.listenerCount('chat'), 0);
      assert.strictEqual(mockConn.listenerCount('gift'), 0);
      assert.strictEqual(adapter.reconnection.attempt, cycle);

      // Cancel the scheduled timeout before the next mock iteration
      adapter.reconnection.cancelReconnect();
    }

    // Assert all 5 sockets were completely cleaned up
    for (const [idx, sock] of socketsCreated.entries()) {
      assert.strictEqual(sock.disconnected, true, `Socket ${idx} was not disconnected`);
      assert.strictEqual(sock.eventNames().length, 0, `Socket ${idx} has lingering event listeners`);
    }
  });

  test('2.3: Manual disconnect cancels reconnect timers and watchdog completely', async () => {
    const adapter = new TikTokLiveAdapter({
      uniqueId: 'chua_tinh_tam_manual',
      autoReconnect: true
    });

    const mockConn = new MockConnection();
    adapter.connection = mockConn;
    adapter.status = 'connected';
    adapter.shouldStayConnected = true;
    adapter.reconnection.scheduleReconnect();
    adapter.reconnection.startWatchdog();

    // User calls disconnect explicitly
    await adapter.disconnect();

    assert.strictEqual(adapter.shouldStayConnected, false, 'shouldStayConnected must be false on manual disconnect');
    assert.strictEqual(adapter.status, 'disconnected');
    assert.strictEqual(adapter.connection, null);
    assert.strictEqual(adapter.reconnection.reconnectTimeout, null, 'Reconnect timeout must be cleared');
    assert.strictEqual(adapter.reconnection.isWatching, false, 'Watchdog must be stopped');

    // Calling onWatchdogTimeout when disconnected must be an absolute NOOP
    await adapter.reconnection.onWatchdogTimeout();
    assert.strictEqual(adapter.reconnection.reconnectTimeout, null, 'No reconnect scheduled after manual disconnect');
    assert.strictEqual(adapter.shouldStayConnected, false);
  });
});

// ==============================================================================
// 3. UNSEATED VIEWER SLOT INDEX ISOLATION
// ==============================================================================

describe('Dimension 3: Unseated Viewer Slot Index Isolation & Seat #0 Protection', () => {

  test('3.1: Saturated hall (100 seats full) broadcasts slotIndex: -1 for unseated chats, likes, and gifts', async () => {
    const stateManager = new StateManager({
      joinOnEnter: true,
      maxCapacity: 100,
      autoScale: false
    });

    // Mock TTS synthesize to return null so no playback delay timer is scheduled
    if (stateManager.audioQueue?.ttsEngine) {
      stateManager.audioQueue.ttsEngine.synthesize = async () => null;
    }

    stateManager.seatingEngine.resize(100);

    // Populate all 100 seats with active donors
    for (let i = 0; i < 100; i++) {
      const userId = `seated_donor_${i}`;
      const res = stateManager.seatingEngine.assignSeat({
        id: userId,
        name: `Phật tử #${i}`,
        skin: 'man',
        avatar: `https://avatar.test/${i}.jpg`,
        coins: 1000 + i // All have positive coins, preventing non-donor eviction
      });
      assert.notStrictEqual(res.slotIndex, -1, `Seat ${i} must be assigned`);
    }

    assert.strictEqual(stateManager.seatingEngine.viewers.size, 100, 'Hall must have exactly 100 occupied seats');
    assert.strictEqual(stateManager.seatingEngine.capacity, 100, 'Hall capacity must be 100');

    // Check Seat #0 occupant initial state
    const seat0Occupant = stateManager.seatingEngine.slots[0];
    assert.ok(seat0Occupant, 'Seat #0 must have an occupant');
    const initialSeat0Id = seat0Occupant.id;
    const initialSeat0Coins = seat0Occupant.coins;
    const initialSeat0Name = seat0Occupant.name;

    // Capture all broadcasts
    const broadcastedMessages = [];
    stateManager.broadcaster = {
      broadcast: (msg) => {
        broadcastedMessages.push(msg);
      },
      broadcastControlOnly: () => {},
      broadcastOverlayOnly: () => {}
    };

    // A. Dispatch unseated chat
    stateManager.handleCanonicalEvent({
      type: 'chat',
      userId: 'unseated_viewer_alpha',
      nickname: 'Người Nghe Đạo Alpha',
      payload: {
        text: 'Nam mô A Di Đà Phật con chưa có chỗ ngồi',
        detectedSkin: null
      }
    });

    const chatMsg = broadcastedMessages.find((m) => m.t === 'chat' && m.id === 'unseated_viewer_alpha');
    assert.ok(chatMsg, 'Chat message must be broadcasted');
    assert.strictEqual(
      chatMsg.slotIndex,
      -1,
      `Unseated chat MUST broadcast slotIndex: -1 (observed: ${chatMsg.slotIndex})`
    );

    // B. Dispatch unseated like
    stateManager.handleCanonicalEvent({
      type: 'like',
      userId: 'unseated_viewer_beta',
      nickname: 'Người Tán Thán Beta',
      payload: {
        count: 5,
        totalLikes: 12000
      }
    });

    const likeMsg = broadcastedMessages.find((m) => m.t === 'like' && m.id === 'unseated_viewer_beta');
    assert.ok(likeMsg, 'Like message must be broadcasted');
    assert.strictEqual(
      likeMsg.slotIndex,
      -1,
      `Unseated like MUST broadcast slotIndex: -1 (observed: ${likeMsg.slotIndex})`
    );

    // C. Dispatch unseated intermediate gift (combo hit)
    stateManager.handleCanonicalEvent({
      type: 'gift',
      userId: 'unseated_viewer_gamma',
      nickname: 'Người Cúng Dường Gamma',
      payload: {
        giftId: '5655',
        giftName: 'Hoa Sen',
        diamondCount: 1,
        repeatCount: 1,
        repeatEnd: false,
        totalDiamonds: 1
      }
    });

    const interGiftMsg = broadcastedMessages.find(
      (m) => m.t === 'gift' && m.id === 'unseated_viewer_gamma' && m.repeatEnd === false
    );
    assert.ok(interGiftMsg, 'Intermediate gift message must be broadcasted');
    assert.strictEqual(
      interGiftMsg.slotIndex,
      -1,
      `Unseated intermediate gift MUST broadcast slotIndex: -1 (observed: ${interGiftMsg.slotIndex})`
    );

    // Assert Seat #0 occupant state was completely untouched in StateManager
    const currentSeat0 = stateManager.seatingEngine.slots[0];
    assert.strictEqual(currentSeat0.id, initialSeat0Id, 'Seat #0 occupant ID must remain unchanged');
    assert.strictEqual(currentSeat0.coins, initialSeat0Coins, 'Seat #0 coins must remain unchanged');
    assert.strictEqual(currentSeat0.name, initialSeat0Name, 'Seat #0 name must remain unchanged');

    await stateManager.destroy();
  });

  test('3.2: High-concurrency barrage (1,000 unseated events) maintains 100% slotIndex: -1 rate and zero Seat #0 pollution', async () => {
    const stateManager = new StateManager({
      joinOnEnter: true,
      maxCapacity: 100,
      autoScale: false
    });

    stateManager.seatingEngine.resize(100);

    // Settle 100 donors
    for (let i = 0; i < 100; i++) {
      stateManager.seatingEngine.assignSeat({
        id: `donor_${i}`,
        name: `Donor ${i}`,
        skin: 'woman',
        coins: 500
      });
    }

    const seat0Initial = { ...stateManager.seatingEngine.slots[0] };

    const broadcastedEvents = [];
    stateManager.broadcaster = {
      broadcast: (msg) => broadcastedEvents.push(msg),
      broadcastControlOnly: () => {},
      broadcastOverlayOnly: () => {}
    };

    const TOTAL_EVENTS = 1000;
    for (let i = 0; i < TOTAL_EVENTS; i++) {
      const unseatedId = `unseated_bot_${i % 50}`;
      const eventType = i % 2 === 0 ? 'chat' : 'like';

      if (eventType === 'chat') {
        stateManager.handleCanonicalEvent({
          type: 'chat',
          userId: unseatedId,
          nickname: `Bot ${unseatedId}`,
          payload: { text: `Lời cầu an thứ #${i}` }
        });
      } else {
        stateManager.handleCanonicalEvent({
          type: 'like',
          userId: unseatedId,
          nickname: `Bot ${unseatedId}`,
          payload: { count: 1, totalLikes: 1000 + i }
        });
      }
    }

    assert.strictEqual(broadcastedEvents.length, TOTAL_EVENTS, 'All 1,000 events must be processed');

    // Assert EVERY SINGLE broadcast event has slotIndex === -1
    const pollutedEvents = broadcastedEvents.filter((msg) => msg.slotIndex !== -1);
    assert.strictEqual(
      pollutedEvents.length,
      0,
      `Detected ${pollutedEvents.length} events with slotIndex !== -1: ${JSON.stringify(pollutedEvents.slice(0, 3))}`
    );

    // Confirm Seat #0 occupant has not changed
    const seat0Current = stateManager.seatingEngine.slots[0];
    assert.strictEqual(seat0Current.id, seat0Initial.id);
    assert.strictEqual(seat0Current.coins, seat0Initial.coins);
    assert.strictEqual(seat0Current.name, seat0Initial.name);

    await stateManager.destroy();
  });

  test('3.3: Client-side OverlayApp speech bubble & avatar state isolation under unseated events', () => {
    // Setup Mock DOM environment for OverlayApp
    const mockElements = new Map();
    const createMockElement = (id) => {
      const el = {
        id,
        style: {},
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          contains(c) { return this.classes.has(c); }
        },
        appendChild(child) {},
        textContent: '',
        innerHTML: '',
        getContext: () => ({
          save() {},
          restore() {},
          drawImage() {},
          beginPath() {},
          fill() {},
          stroke() {},
          clearRect() {},
          arc() {},
          closePath() {},
          moveTo() {},
          lineTo() {},
          createLinearGradient() { return { addColorStop() {} }; },
          createRadialGradient() { return { addColorStop() {} }; }
        })
      };
      mockElements.set(id, el);
      return el;
    };

    // Install global document mock for OverlayApp constructor
    const originalDocument = globalThis.document;
    globalThis.document = {
      getElementById: (id) => mockElements.get(id) || createMockElement(id),
      createElement: (tag) => {
        return {
          tagName: tag,
          className: '',
          style: {},
          classList: {
            classes: new Set(),
            add(c) { this.classes.add(c); },
            remove(c) { this.classes.delete(c); },
            contains(c) { return this.classes.has(c); }
          },
          textContent: '',
          getContext: () => ({
            save() {},
            restore() {},
            drawImage() {},
            beginPath() {},
            fill() {},
            stroke() {},
            clearRect() {},
            arc() {},
            closePath() {},
            moveTo() {},
            lineTo() {},
            createLinearGradient() { return { addColorStop() {} }; },
            createRadialGradient() { return { addColorStop() {} }; }
          })
        };
      }
    };

    const originalWindow = globalThis.window;
    globalThis.window = {
      location: { protocol: 'http:', host: '127.0.0.1:3000' }
    };

    const originalImage = globalThis.Image;
    globalThis.Image = class MockImage {
      constructor() {
        this.src = '';
      }
    };

    try {
      const app = new OverlayApp();

      // Populate Seat #0 with a legitimate seated character
      const seat0Viewer = {
        id: 'legit_seat_0_user',
        name: 'Phật tử Chánh Điện 0',
        skin: 'man',
        coins: 100,
        isVip: true,
        slotIndex: 0
      };
      app.characterRenderer.addOrUpdateViewer(seat0Viewer);
      const seat0Char = app.characterRenderer.characters.get('legit_seat_0_user');
      seat0Char.phase = 'sit';

      // Verify legitimate seated bubble works
      app.showChatBubble(0, 'Lời của người ngồi ghế số 0');
      const bubble0 = app.bubblePool.get(0);
      assert.ok(bubble0, 'Bubble for seat 0 must exist');
      assert.strictEqual(bubble0.textContent, 'Lời của người ngồi ghế số 0');
      assert.strictEqual(bubble0.classList.contains('visible'), true);

      // Now reset bubble 0 visibility
      bubble0.classList.remove('visible');
      bubble0.textContent = 'Trống';

      // ACT 1: Unseated user sends chat with slotIndex: -1
      const unseatedChatMsg = {
        t: 'chat',
        id: 'unseated_hooligan',
        name: 'Khách Đứng Ngoài',
        text: 'Này người ở ghế số 0 mau nhường chỗ!',
        slotIndex: -1
      };
      app.handleChat(unseatedChatMsg);

      // ASSERT 1: Seat #0 bubble was NOT shown or touched by unseated chat
      assert.strictEqual(
        bubble0.classList.contains('visible'),
        false,
        'Seat #0 bubble MUST NOT become visible from unseated chat'
      );
      assert.strictEqual(
        bubble0.textContent,
        'Trống',
        'Seat #0 bubble text MUST NOT be overwritten by unseated chat'
      );
      assert.strictEqual(
        seat0Char.phase,
        'sit',
        'Seat #0 character phase MUST remain "sit" (no bow triggered by unseated user)'
      );

      // ACT 2: Unseated user sends like with slotIndex: -1
      const unseatedLikeMsg = {
        t: 'like',
        id: 'unseated_hooligan',
        slotIndex: -1,
        totalLikes: 9999
      };
      // Spy on particleSystem spawnGiftParticles
      let particlesSpawnedAt = null;
      app.particleSystem.spawnGiftParticles = (x, y, count) => {
        particlesSpawnedAt = { x, y, count };
      };

      app.handleLike(unseatedLikeMsg);

      // ASSERT 2: No particles spawned for unseated like
      assert.strictEqual(
        particlesSpawnedAt,
        null,
        'No particles should spawn when slotIndex is -1'
      );

      // ACT 3: Unseated user sends gift with slotIndex: -1
      const unseatedGiftMsg = {
        t: 'gift',
        id: 'unseated_hooligan',
        name: 'Khách Đứng Ngoài',
        giftName: 'Bông Sen',
        tier: 1,
        slotIndex: -1
      };
      app.handleGift(unseatedGiftMsg);

      // ASSERT 3: No particles spawned and Seat #0 coins not touched
      assert.strictEqual(particlesSpawnedAt, null, 'No particles should spawn for unseated gift');
      assert.strictEqual(seat0Char.coins, 100, 'Seat #0 coins must remain 100');
      assert.strictEqual(seat0Char.phase, 'sit', 'Seat #0 must not bow for unseated gift');

      // ACT 4: Seat #0 occupant sends their own chat
      const seat0ChatMsg = {
        t: 'chat',
        id: 'legit_seat_0_user',
        name: 'Phật tử Chánh Điện 0',
        text: 'A Di Đà Phật',
        slotIndex: 0
      };
      app.handleChat(seat0ChatMsg);

      // ASSERT 4: Seat #0 DOES show bubble and trigger bow for its own occupant
      assert.strictEqual(bubble0.classList.contains('visible'), true, 'Seat 0 bubble must be visible for Seat 0 occupant');
      assert.strictEqual(bubble0.textContent, 'A Di Đà Phật');
      assert.strictEqual(seat0Char.phase, 'bowing', 'Seat 0 occupant bows on their own chat');

      // Clean up bubble timers to avoid keeping Node event loop alive
      if (bubble0?._timer) clearTimeout(bubble0._timer);

    } finally {
      // Restore globals
      globalThis.document = originalDocument;
      globalThis.window = originalWindow;
      globalThis.Image = originalImage;
    }
  });
});
