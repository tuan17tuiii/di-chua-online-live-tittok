#!/usr/bin/env node

/**
 * stress_challenger.mjs: Adversarial Empirical Stress Test Suite
 * Executed by teamwork_challenger_impl_1 to stress-test:
 * 1. WebSocket role segregation (4403 on overlay messages, 4429 on control flooding, concurrent connect storm)
 * 2. Snapshot timing under concurrent load (<50ms)
 * 3. High-throughput gift streak coalescing (50-100 rapid gifts, single announcement, accurate coin totals)
 * 4. Seating eviction under pressure (100% capacity with 100% donors, LRU quiet eviction, VIP immunity)
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {
  MockWsClient,
  ensureServerRunning,
  resetServerState,
  stateManager,
  broadcaster,
  shutdown,
  WS_ERROR_CODES
} from './helpers/MockWsClient.mjs';
import { config } from '../src/config.mjs';
import { SeatingEngine } from '../src/state/SeatingEngine.mjs';
import { GiftStreakCoalescer } from '../src/moderation/GiftStreakCoalescer.mjs';

const TEST_PORT = config.port || 3000;
const TEST_HOST = '127.0.0.1';

describe('Empirical Adversarial Stress Suite (teamwork_challenger_impl_1)', () => {
  before(async () => {
    await ensureServerRunning(TEST_PORT, TEST_HOST);
  });

  after(async () => {
    if (stateManager && stateManager.audioQueue) {
      stateManager.audioQueue.clear();
    }
    await shutdown();
  });

  beforeEach(() => {
    resetServerState();
  });

  // =========================================================================
  // CHALLENGE 1: WebSocket Role Segregation & Flood Enforcement
  // =========================================================================
  describe('Challenge 1: WebSocket Role Segregation & Flood Enforcement', () => {
    test('1.1: Overlay client outbound message is strictly rejected with close code 4403', async () => {
      const overlay = await MockWsClient.connectOverlay(TEST_PORT, TEST_HOST);
      const state = await overlay.waitForState();
      assert.equal(state.t, 'state');

      // Attempt forbidden outbound message from overlay
      overlay.send({ t: 'chat', text: 'Adversarial overlay injection attempt' });

      // Expect immediate termination with 4403 Forbidden Action
      const closeInfo = await overlay.waitForClose(3000);
      assert.equal(closeInfo.code, WS_ERROR_CODES.FORBIDDEN_ACTION, `Expected close code 4403, got ${closeInfo.code}`);
      assert.ok(
        closeInfo.reason.toLowerCase().includes('forbidden action') || closeInfo.reason.toLowerCase().includes('read-only'),
        `Expected close reason mentioning forbidden action, got: "${closeInfo.reason}"`
      );
    });

    test('1.2: Control client command flooding (>10 cmds/sec) triggers rate limiter with close code 4429', async () => {
      const control = await MockWsClient.connectControl(TEST_PORT, TEST_HOST);
      const state = await control.waitForState();
      assert.equal(state.t, 'state');

      // Flood 30 control commands synchronously to trigger the 10/sec bucket
      for (let i = 0; i < 30; i++) {
        control.sendControl('mo');
      }

      // Expect termination with 4429 Rate Limited
      const closeInfo = await control.waitForClose(3000);
      assert.equal(closeInfo.code, WS_ERROR_CODES.RATE_LIMITED, `Expected close code 4429, got ${closeInfo.code}`);
      assert.ok(
        closeInfo.reason.toLowerCase().includes('rate limited'),
        `Expected close reason mentioning rate limit, got: "${closeInfo.reason}"`
      );
    });

    test('1.3: Rapid concurrent connect/disconnect storm (40 clients) maintains server stability', async () => {
      const NUM_CLIENTS = 40;
      const clients = [];

      // Connect 20 overlay + 20 control clients simultaneously
      const connectPromises = [];
      for (let i = 0; i < NUM_CLIENTS; i++) {
        const isControl = i % 2 === 0;
        const p = (isControl ? MockWsClient.connectControl(TEST_PORT) : MockWsClient.connectOverlay(TEST_PORT))
          .then((client) => {
            clients.push(client);
            return client.waitForState();
          });
        connectPromises.push(p);
      }

      const snapshots = await Promise.all(connectPromises);
      assert.equal(snapshots.length, NUM_CLIENTS, 'All 40 clients must receive state snapshot');

      // Assert broadcaster tracked all active clients
      assert.equal(broadcaster.overlayClients.size, 20);
      assert.equal(broadcaster.controlClients.size, 20);

      // Cleanly close all clients simultaneously
      for (const client of clients) {
        client.close();
      }

      // Small pause for socket cleanup
      await new Promise((r) => setTimeout(r, 100));

      assert.equal(broadcaster.overlayClients.size, 0, 'All overlay sockets must be pruned');
      assert.equal(broadcaster.controlClients.size, 0, 'All control sockets must be pruned');
    });
  });

  // =========================================================================
  // CHALLENGE 2: Snapshot Timing Under Concurrent Load (<50ms)
  // =========================================================================
  describe('Challenge 2: Snapshot Timing Under Concurrent Load (<50ms)', () => {
    test('2.1: Concurrent connection barrage (30 clients) delivers state snapshot in <50ms', async () => {
      const CONCURRENCY = 30;
      const latencies = [];
      const connectTasks = [];

      for (let i = 0; i < CONCURRENCY; i++) {
        const role = i % 2 === 0 ? 'overlay' : 'control';
        const url = `ws://${TEST_HOST}:${TEST_PORT}/ws?role=${role}`;

        const task = new Promise((resolve, reject) => {
          const tStart = performance.now();
          let tOpen = 0;
          const ws = new WebSocket(url);

          ws.on('open', () => {
            tOpen = performance.now();
          });

          ws.on('message', (data) => {
            const tState = performance.now();
            try {
              const parsed = JSON.parse(data.toString('utf8'));
              if (parsed.t === 'state') {
                const dispatchLatency = tState - tOpen;
                const totalLatency = tState - tStart;
                latencies.push({ dispatchLatency, totalLatency });
                ws.close();
                resolve();
              }
            } catch (err) {
              ws.close();
              reject(err);
            }
          });

          ws.on('error', (err) => {
            reject(err);
          });
        });

        connectTasks.push(task);
      }

      await Promise.all(connectTasks);

      assert.equal(latencies.length, CONCURRENCY);

      const dispatchTimes = latencies.map((l) => l.dispatchLatency).sort((a, b) => a - b);
      const minDispatch = dispatchTimes[0];
      const maxDispatch = dispatchTimes[dispatchTimes.length - 1];
      const avgDispatch = dispatchTimes.reduce((a, b) => a + b, 0) / dispatchTimes.length;
      const p50 = dispatchTimes[Math.floor(dispatchTimes.length * 0.5)];
      const p95 = dispatchTimes[Math.floor(dispatchTimes.length * 0.95)];

      console.log(`\n      [Empirical Latency Benchmark - 30 Concurrent WS Clients]`);
      console.log(`      - Min Dispatch Latency : ${minDispatch.toFixed(2)}ms`);
      console.log(`      - Median (p50) Latency : ${p50.toFixed(2)}ms`);
      console.log(`      - 95th Percentile (p95): ${p95.toFixed(2)}ms`);
      console.log(`      - Max Dispatch Latency : ${maxDispatch.toFixed(2)}ms`);
      console.log(`      - Average Latency      : ${avgDispatch.toFixed(2)}ms\n`);

      // Rigorous assertion: Every single client must receive its snapshot under 50ms
      assert.ok(
        maxDispatch < 50,
        `Maximum snapshot dispatch latency was ${maxDispatch.toFixed(2)}ms, which exceeds 50ms threshold!`
      );
      assert.ok(
        p95 < 30,
        `95th percentile latency was ${p95.toFixed(2)}ms, expected <30ms`
      );
    });
  });

  // =========================================================================
  // CHALLENGE 3: High-Throughput Gift Streak Coalescing
  // =========================================================================
  describe('Challenge 3: High-Throughput Gift Streak Coalescing (100 Rapid Gifts)', () => {
    test('3.1: 100 rapid combo gifts coalesce into single finalized announcement with zero coin loss', async () => {
      const overlay = await MockWsClient.connectOverlay(TEST_PORT, TEST_HOST);
      await overlay.waitForState();

      const DONOR_ID = 'stress_donor_100';
      const NICKNAME = 'Thí Chủ Đại Thí';
      const DIAMONDS_EACH = 25;
      const TOTAL_GIFTS = 100;
      const EXPECTED_COINS = TOTAL_GIFTS * DIAMONDS_EACH; // 2500 coins

      // Inject 99 combo hits with repeatEnd: false, then 1 with repeatEnd: true
      const tStart = performance.now();
      for (let count = 1; count <= TOTAL_GIFTS; count++) {
        const isFinal = count === TOTAL_GIFTS;
        stateManager.handleCanonicalEvent({
          eventId: `evt_streak_${count}`,
          source: 'tiktok',
          timestamp: Date.now(),
          userId: DONOR_ID,
          uniqueId: DONOR_ID,
          nickname: NICKNAME,
          avatarUrl: 'https://example.com/avatar.jpg',
          type: 'gift',
          payload: {
            giftId: 'golden_lotus',
            giftName: 'Hoa Sen Vàng',
            diamondCount: DIAMONDS_EACH,
            repeatCount: count,
            repeatEnd: isFinal,
            isCombo: true
          }
        });
      }
      const injectionDuration = performance.now() - tStart;
      console.log(`      - Injected ${TOTAL_GIFTS} gifts in ${injectionDuration.toFixed(2)}ms`);

      // Overlay should receive finalized gift
      const finalGiftMsg = await overlay.waitForMessage((m) => m.t === 'gift' && m.repeatEnd === true);

      assert.equal(finalGiftMsg.id, DONOR_ID);
      assert.equal(finalGiftMsg.comboCount, TOTAL_GIFTS, 'Combo count must reflect all 100 hits');
      assert.equal(finalGiftMsg.total, EXPECTED_COINS, `Total coins must be ${EXPECTED_COINS}`);
      assert.equal(finalGiftMsg.tier, 3, '2500 coins must trigger Tier 3 visual grand celebration');

      // Verify Leaderboard accurately accumulated all 2500 coins without dropping any
      const top = stateManager.leaderboard.getTop(1);
      assert.equal(top.length, 1);
      assert.equal(top[0].id, DONOR_ID);
      assert.equal(top[0].coins, EXPECTED_COINS, `Leaderboard must have exact ${EXPECTED_COINS} coins`);

      // Verify Seating Engine assigned seat and reflects 2500 coins
      const seated = stateManager.seatingEngine.viewers.get(DONOR_ID);
      assert.ok(seated, 'Donor must be seated in the hall');
      assert.equal(seated.coins, EXPECTED_COINS, 'Seated viewer coins must match total');

      // Verify no multiple finalized gift messages arrived
      const duplicateFinals = overlay.filterMessages((m) => m.t === 'gift' && m.repeatEnd === true);
      assert.equal(duplicateFinals.length, 0, 'No extra finalized gift messages should be buffered');

      overlay.close();
    });

    test('3.2: Streak timeout auto-flush after 1.5s debounce without repeatEnd flag', async () => {
      const finalized = [];
      const coalescer = new GiftStreakCoalescer({
        debounceMs: 100, // Reduced for fast empirical testing
        onFlush: (g) => finalized.push(g)
      });

      // Send 50 combo hits without setting repeatEnd=true
      for (let i = 1; i <= 50; i++) {
        coalescer.processGift({
          userId: 'devotee_pause',
          uniqueId: 'devotee_pause',
          nickname: 'Tịnh Tâm',
          avatarUrl: '',
          payload: {
            giftId: 'bell_gift',
            giftName: 'Chuông Đồng',
            diamondCount: 5,
            repeatCount: i,
            repeatEnd: false,
            isCombo: true
          }
        });
      }

      // Immediately before debounce, 0 flushes
      assert.equal(finalized.length, 0);

      // Wait for debounce timeout to trigger
      await new Promise((r) => setTimeout(r, 150));

      // Must have flushed exactly 1 finalized gift
      assert.equal(finalized.length, 1);
      assert.equal(finalized[0].count, 50);
      assert.equal(finalized[0].totalCoins, 250);
      assert.equal(finalized[0].repeatEnd, true);
    });
  });

  // =========================================================================
  // CHALLENGE 4: Seating Eviction Under Pressure & VIP Immunity
  // =========================================================================
  describe('Challenge 4: Seating Eviction Under Pressure & VIP Immunity', () => {
    test('4.1: Longest-quiet non-donor eviction releases seat for new entrant', () => {
      const engine = new SeatingEngine({ initialCapacity: 24, seatMode: '24' });

      // Fill all 24 seats with non-donors (coins = 0) with staggered timestamps
      const baseTime = Date.now() - 50000;
      for (let i = 0; i < 24; i++) {
        const res = engine.assignSeat({
          id: `non_donor_${i}`,
          name: `Khách ${i}`,
          coins: 0
        });
        assert.ok(res.slotIndex >= 0);
        // Stagger activity timestamp: user 0 is the quietest (oldest)
        engine.viewers.get(`non_donor_${i}`).lastActivityAt = baseTime + (i * 1000);
      }

      assert.equal(engine.viewers.size, 24);

      // Add 25th user
      const result = engine.assignSeat({
        id: 'new_entrant_25',
        name: 'Phật Tử Mới',
        coins: 0
      });

      assert.ok(result.slotIndex >= 0, 'New entrant must obtain a slot');
      assert.ok(result.evicted, 'An eviction must occur');
      assert.equal(result.evicted.id, 'non_donor_0', 'The quietest non-donor (user 0) must be evicted');
      assert.equal(result.evicted.reason, 'evicted_quiet_non_donor');
      assert.equal(engine.viewers.size, 24, 'Total seated count must strictly remain 24');
    });

    test('4.2: VIP slot and donor immunity protects against eviction', () => {
      const engine = new SeatingEngine({ initialCapacity: 24, seatMode: '24' });
      const baseTime = Date.now() - 100000;

      // Slot 0: VIP non-donor (isVip: true, coins: 0, oldest activity)
      engine.assignSeat({ id: 'vip_user', name: 'VIP Đại Đức', coins: 0, isVip: true });
      engine.viewers.get('vip_user').lastActivityAt = baseTime;

      // Slot 1: Donor (coins: 50, old activity)
      engine.assignSeat({ id: 'donor_user', name: 'Thí Chủ Bồ Tát', coins: 50 });
      engine.viewers.get('donor_user').lastActivityAt = baseTime + 1000;

      // Slots 2..23: Non-donors (coins: 0)
      for (let i = 2; i < 24; i++) {
        engine.assignSeat({ id: `user_${i}`, name: `Khách ${i}`, coins: 0 });
        engine.viewers.get(`user_${i}`).lastActivityAt = baseTime + (i * 2000);
      }

      assert.equal(engine.viewers.size, 24);

      // Now attempt to seat user 25
      const result = engine.assignSeat({ id: 'user_25', name: 'Người Mới' });

      assert.ok(result.slotIndex >= 0);
      assert.ok(result.evicted);
      // user_2 was the quietest NON-VIP, NON-DONOR
      assert.equal(result.evicted.id, 'user_2', 'user_2 should be evicted, NOT vip_user or donor_user');
      assert.ok(engine.viewers.has('vip_user'), 'VIP user must remain seated');
      assert.ok(engine.viewers.has('donor_user'), 'Donor user must remain seated');
    });

    test('4.3: 100% Donor Saturation Deadlock Resolution: Active donors immune, inactive donor evicted', () => {
      const engine = new SeatingEngine({ initialCapacity: 100, seatMode: '100' });
      const now = Date.now();

      // Scenario A: Fill 100 seats with 100 ACTIVE donors (activity within last 5 minutes)
      for (let i = 0; i < 100; i++) {
        engine.assignSeat({
          id: `donor_100_${i}`,
          name: `Đại Thí Chủ ${i}`,
          coins: 10 + i
        });
        engine.viewers.get(`donor_100_${i}`).lastActivityAt = now - 5000; // active 5s ago
      }

      assert.equal(engine.viewers.size, 100);

      // Attempt to seat 101st user when all 100 donors are active
      const resA = engine.assignSeat({ id: 'donor_101', name: 'Thí Chủ Đến Sau', coins: 10 });
      // When 100% full of active donors, no eviction is allowed -> seat allocation safely rejected (-1)
      assert.equal(resA.slotIndex, -1, 'Must reject new entry when hall is 100% saturated with active donors');
      assert.equal(resA.evicted, null);
      assert.equal(engine.viewers.size, 100);

      // Scenario B: One donor becomes inactive (>15 minutes idle)
      const inactiveId = 'donor_100_0'; // Has lowest coins: 10
      engine.viewers.get(inactiveId).lastActivityAt = now - (20 * 60 * 1000); // 20m ago

      // Now seat 101st user
      const resB = engine.assignSeat({ id: 'donor_101', name: 'Thí Chủ Đến Sau', coins: 50 });
      assert.ok(resB.slotIndex >= 0, 'Inactive donor must be evicted to free slot');
      assert.equal(resB.evicted.id, inactiveId);
      assert.equal(resB.evicted.reason, 'evicted_inactive_donor');
      assert.equal(engine.viewers.size, 100);
      assert.ok(engine.viewers.has('donor_101'), 'New donor is now seated');
    });
  });
});
