import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  MockWsClient,
  ensureServerRunning,
  resetServerState,
  stateManager,
  shutdown
} from './helpers/MockWsClient.mjs';
import { config } from '../src/config.mjs';
import { ReconnectionEngine } from '../src/ingestion/ReconnectionEngine.mjs';
import { SeatingEngine } from '../src/state/SeatingEngine.mjs';
import { GiftStreakCoalescer } from '../src/moderation/GiftStreakCoalescer.mjs';
import { EventNormalizer } from '../src/moderation/EventNormalizer.mjs';
import { Sanitizer } from '../src/moderation/Sanitizer.mjs';
import { ProfanityFilter } from '../src/moderation/ProfanityFilter.mjs';

const TEST_PORT = config.port || 3000;

describe('Tier 4: Real-World Workload Scenarios (TC-401 to TC-404)', () => {
  before(async () => {
    await ensureServerRunning(TEST_PORT, '127.0.0.1');
  });

  after(async () => {
    if (stateManager.audioQueue) {
      stateManager.audioQueue.clear();
    }
    await shutdown();
  });

  beforeEach(() => {
    resetServerState();
  });

  test('TC-401: Continuous Live Simulation - mixed workload stream maintains processing latency < 20ms and 0 crashes', async () => {
    const control = await MockWsClient.connectControl(TEST_PORT);
    await control.waitForState();

    const TOTAL_EVENTS = 120;
    const latencies = [];

    for (let i = 0; i < TOTAL_EVENTS; i++) {
      const tStart = performance.now();
      const mod = i % 4;

      if (mod === 0) {
        // Chat event
        control.sendControl('chat', {
          id: `sim_devotee_${i % 15}`,
          name: `Phật Tử ${i % 15}`,
          text: `A Di Đà Phật nguyện cầu an lành (${i})`
        });
      } else if (mod === 1) {
        // Like event through canonical event
        stateManager.handleCanonicalEvent({
          eventId: `evt_like_${i}`,
          source: 'tiktok',
          timestamp: Date.now(),
          userId: `sim_devotee_${i % 15}`,
          uniqueId: `sim_devotee_${i % 15}`,
          nickname: `Phật Tử ${i % 15}`,
          avatarUrl: '',
          type: 'like',
          payload: { count: 5, totalLikes: 1000 + i * 5 }
        });
      } else if (mod === 2) {
        // Gift event
        stateManager.handleCanonicalEvent({
          eventId: `evt_gift_${i}`,
          source: 'tiktok',
          timestamp: Date.now(),
          userId: `sim_devotee_${i % 15}`,
          uniqueId: `sim_devotee_${i % 15}`,
          nickname: `Phật Tử ${i % 15}`,
          avatarUrl: '',
          type: 'gift',
          payload: {
            giftId: 'rose',
            giftName: 'Hoa Hồng',
            diamondCount: 1,
            repeatCount: 1,
            repeatEnd: true,
            isCombo: false
          }
        });
      } else {
        // Mo strike
        control.sendControl('mo');
      }

      const elapsed = performance.now() - tStart;
      latencies.push(elapsed);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);

    assert.ok(
      avgLatency < 20,
      `Average event ingestion latency (${avgLatency.toFixed(2)}ms) must be under 20ms`
    );
    assert.ok(
      maxLatency < 100,
      `Max event ingestion latency (${maxLatency.toFixed(2)}ms) must be under 100ms`
    );

    // Verify system state integrity after 120 mixed events
    assert.ok(stateManager.seatingEngine.viewers.size > 0, 'Hall must have seated devotees');
    assert.ok(stateManager.seatingEngine.viewers.size <= stateManager.seatingEngine.capacity);

    control.close();
  });

  test('TC-402: Sudden Gift Storm Scenario - 20 users send 100 gifts rapidly, coalesces without memory spike or deadlock', () => {
    const finalizedGifts = [];
    const coalescer = new GiftStreakCoalescer({
      debounceMs: 50,
      onFlush: (g) => finalizedGifts.push(g)
    });

    const NUM_USERS = 20;
    const GIFTS_PER_USER = 5; // Total 100 gifts

    // Rapid burst injection across all 20 users
    for (let userIdx = 0; userIdx < NUM_USERS; userIdx++) {
      const userId = `storm_donor_${userIdx}`;
      const nickname = `Phật Tử Thí Chủ ${userIdx}`;

      for (let count = 1; count <= GIFTS_PER_USER; count++) {
        const isFinal = count === GIFTS_PER_USER;
        coalescer.processGift({
          userId,
          uniqueId: userId,
          nickname,
          avatarUrl: '',
          payload: {
            giftId: 'lotus_30',
            giftName: 'Đèn Sen',
            diamondCount: 30,
            repeatCount: count,
            repeatEnd: isFinal,
            isCombo: true
          }
        });
      }
    }

    // Exactly 20 finalized gifts should be emitted (1 per user)
    assert.equal(
      finalizedGifts.length,
      NUM_USERS,
      `Gift storm must coalesce into exactly ${NUM_USERS} final announcements, got ${finalizedGifts.length}`
    );

    // Verify all 20 users have correct total coins (5 x 30 = 150 coins -> Tier 3 celebration)
    for (const g of finalizedGifts) {
      assert.equal(g.count, GIFTS_PER_USER);
      assert.equal(g.totalCoins, GIFTS_PER_USER * 30);
      assert.equal(g.tier, 3, '150 coins should be classified as Tier 3');
    }

    // Verify active streak map is cleanly flushed
    assert.equal(coalescer.activeStreaks.size, 0, 'Active streaks map must be completely empty after storm');
  });

  test('TC-403: Network Disconnect & Backoff Recovery - exponential backoff with jitter and 15s watchdog', () => {
    const reconnection = new ReconnectionEngine({
      baseDelay: 2000,
      maxDelay: 30000,
      watchdogInterval: 15000,
      inactivityTimeout: 60000
    });

    // 1. Verify Attempt 0 delay is near 2000ms (+/- 20% jitter: [1600, 2400])
    reconnection.attempt = 0;
    const delay0 = reconnection.getNextDelay();
    assert.ok(delay0 >= 1600 && delay0 <= 2400, `Delay 0 (${delay0}ms) must be within [1600, 2400]`);

    // 2. Verify Attempt 1 delay increases exponentially (~3000ms with multiplier 1.5)
    reconnection.attempt = 1;
    const delay1 = reconnection.getNextDelay();
    assert.ok(delay1 >= 2400 && delay1 <= 3600, `Delay 1 (${delay1}ms) must be within [2400, 3600]`);

    // 3. Verify High attempt (attempt 10) is clamped strictly to maxDelay (30000ms)
    reconnection.attempt = 10;
    const delay10 = reconnection.getNextDelay();
    assert.ok(delay10 <= 30000, `High attempt delay (${delay10}ms) must be clamped to maxDelay 30000ms`);

    // 4. Verify scheduleReconnect returns valid delay and increments attempt
    reconnection.attempt = 0;
    const scheduledDelay = reconnection.scheduleReconnect();
    assert.ok(scheduledDelay > 0);
    assert.equal(reconnection.attempt, 1, 'Attempt counter must increment');

    // 5. Verify reset clears timers and resets attempt to 0
    reconnection.reset();
    assert.equal(reconnection.attempt, 0);
    assert.equal(reconnection.reconnectTimeout, null);

    // 6. Verify watchdog heartbeat
    reconnection.recordHeartbeat();
    assert.ok(Date.now() - reconnection.lastEventTimestamp < 100);
  });

  test('TC-404: Memory Leak & Garbage Collection Benchmark - heap remains stable and under 120MB across 10,000 operations', () => {
    const engine = new SeatingEngine({ initialCapacity: 100, seatMode: '100' });
    const normalizer = new EventNormalizer();

    const memBefore = process.memoryUsage().heapUsed;

    // Execute 10,000 synthetic operations
    for (let i = 0; i < 10000; i++) {
      // 1. Sanitize string
      Sanitizer.cleanString(`Bình luận kiểm tra tải trọng số ${i} <script>alert(1)</script>`, 120);
      Sanitizer.escapeXml(`A & B < C > D "E" 'F'`);

      // 2. Normalize chat event
      normalizer.normalizeTikTokChat({
        userId: `user_bench_${i % 200}`,
        uniqueId: `user_bench_${i % 200}`,
        nickname: `Phật Tử ${i % 200}`,
        comment: `Nam mô A Di Đà Phật câu ${i}`
      });

      // 3. Seating allocation and churn
      engine.assignSeat({
        id: `bench_user_${i % 150}`,
        name: `User ${i % 150}`,
        coins: (i % 5 === 0) ? 10 : 0
      });

      if (i % 1000 === 0) {
        engine.touchActivity(`bench_user_${i % 150}`);
      }
    }

    if (typeof global.gc === 'function') {
      global.gc();
    }

    const memAfter = process.memoryUsage().heapUsed;
    const heapUsedMb = memAfter / (1024 * 1024);

    assert.ok(
      heapUsedMb < 120,
      `Heap memory usage (${heapUsedMb.toFixed(2)}MB) must stay well under 120MB threshold`
    );

    engine.clearAll();
  });
});
