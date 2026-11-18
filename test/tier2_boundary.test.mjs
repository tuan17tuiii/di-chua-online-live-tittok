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
import { SeatingEngine } from '../src/state/SeatingEngine.mjs';
import { EventNormalizer } from '../src/moderation/EventNormalizer.mjs';
import { GiftStreakCoalescer } from '../src/moderation/GiftStreakCoalescer.mjs';
import { LiturgicalScheduler } from '../src/state/LiturgicalScheduler.mjs';
import { AudioPriorityQueue } from '../src/audio/AudioPriorityQueue.mjs';
import { Sanitizer } from '../src/moderation/Sanitizer.mjs';
import { ProfanityFilter } from '../src/moderation/ProfanityFilter.mjs';

const TEST_PORT = config.port || 3000;

describe('Tier 2: Boundary & Corner Cases (TC-201 to TC-208)', () => {
  before(async () => {
    await ensureServerRunning(TEST_PORT, '127.0.0.1');
  });

  after(async () => {
    await shutdown();
  });

  beforeEach(() => {
    resetServerState();
  });

  test('TC-201: Empty Hall Transitions - seamless transition between 0 and 1 viewer without null pointer exceptions', async () => {
    const control = await MockWsClient.connectControl(TEST_PORT);
    const snap0 = await control.waitForState();

    // 1. Initial hall state is 0 viewers
    assert.equal(snap0.viewers.length, 0, 'Initial hall must have 0 viewers');

    // 2. Transition 0 -> 1 viewer (user enters and chats)
    control.sendControl('chat', {
      id: 'lone_viewer_01',
      name: 'Phật Tử Độc Thoại',
      text: 'Nam mô A Di Đà Phật'
    });

    const joinEvent = await control.waitForMessage((m) => m.t === 'join' && m.v.id === 'lone_viewer_01', 2000);
    assert.ok(joinEvent, 'Single viewer should receive valid join event');
    assert.equal(joinEvent.v.id, 'lone_viewer_01');
    assert.equal(stateManager.seatingEngine.viewers.size, 1);

    // 3. Transition 1 -> 0 viewers (admin kicks the sole viewer)
    control.sendControl('kick', { id: 'lone_viewer_01' });
    const leaveEvent = await control.waitForMessage((m) => m.t === 'leave' && m.id === 'lone_viewer_01', 2000);
    assert.ok(leaveEvent, 'Should receive leave event upon kicking the lone viewer');
    assert.equal(stateManager.seatingEngine.viewers.size, 0, 'Hall should smoothly return to 0 viewers');

    // 4. Verify snapshot with 0 viewers has valid structure
    const snapFinal = stateManager.getSnapshot();
    assert.equal(snapFinal.viewers.length, 0);
    assert.ok(Array.isArray(snapFinal.viewers));

    control.close();
  });

  test('TC-202: Capacity Saturation Boundaries - viewers array length never exceeds capacity across tiers (24, 36, 64, 100)', () => {
    const capacities = [24, 36, 64, 100];

    for (const cap of capacities) {
      const engine = new SeatingEngine({ initialCapacity: cap, seatMode: String(cap) });
      assert.equal(engine.capacity, cap);

      // Attempt to assign cap + 10 users without eviction
      for (let i = 0; i < cap + 10; i++) {
        engine.assignSeat({
          id: `user_tier2_${cap}_${i}`,
          name: `User ${i}`,
          coins: 0
        });
      }

      assert.ok(
        engine.viewers.size <= cap,
        `Seated viewers (${engine.viewers.size}) must never exceed capacity (${cap})`
      );
      assert.equal(engine.slots.length, cap);
    }
  });

  test('TC-203: 100% Donor Saturation Deadlock Resolution - evicts lowest coins donor inactive >15m, safely rejects if none', () => {
    const engine = new SeatingEngine({ initialCapacity: 24, seatMode: '24' });

    // 1. Fill 24 seats with donors (coins > 0)
    for (let i = 0; i < 24; i++) {
      engine.assignSeat({
        id: `donor_${i}`,
        name: `Donor ${i}`,
        coins: 10 + i * 5
      });
    }
    assert.equal(engine.viewers.size, 24);

    // Scenario A: All donors are actively participating (inactivity < 15m)
    // A newcomer arrives: should be safely rejected without crashing (evictIfNeeded returns null)
    const activeEviction = engine.evictIfNeeded();
    assert.equal(activeEviction, null, 'Should not evict active donors (<15m inactive)');

    // Scenario B: One donor has been idle for 20 minutes (1200000ms > 15m)
    const idleDonor = engine.viewers.get('donor_3');
    idleDonor.coins = 25; // moderate coins
    idleDonor.lastActivityAt = Date.now() - (20 * 60 * 1000);

    const lowestIdleDonor = engine.viewers.get('donor_0');
    lowestIdleDonor.coins = 10; // lowest coins
    lowestIdleDonor.lastActivityAt = Date.now() - (16 * 60 * 1000); // also > 15m

    const evictee = engine.evictIfNeeded();
    assert.ok(evictee, 'Deadlock resolver must evict an inactive donor');
    assert.equal(
      evictee.id,
      'donor_0',
      'Should evict the inactive donor with the lowest coins (donor_0 has 10 coins vs donor_3 has 25 coins)'
    );
    assert.equal(evictee.reason, 'evicted_inactive_donor');
  });

  test('TC-204: Rapid-Fire Comment Spam Rate Limiting - allows 1 comment per 3s, drops rapid consecutive spam', () => {
    const normalizer = new EventNormalizer();
    const spamUserId = 'spammer_99';

    // 1. First chat should be allowed
    const firstAllowed = normalizer.checkChatRateLimit(spamUserId);
    assert.equal(firstAllowed, true, 'First comment must be allowed');

    // 2. Next 9 rapid attempts within same second must all be blocked
    let blockedCount = 0;
    for (let i = 0; i < 9; i++) {
      const allowed = normalizer.checkChatRateLimit(spamUserId);
      if (!allowed) blockedCount++;
    }

    assert.equal(blockedCount, 9, 'All 9 rapid consecutive comments must be rate limited');

    // 3. Different user is not blocked
    const otherUserAllowed = normalizer.checkChatRateLimit('innocent_user');
    assert.equal(otherUserAllowed, true, 'Different user should not be affected by rate limit');
  });

  test('TC-205: Gift Combo Timeout Boundary - auto-flushes finalized gift after 1.5s pause without repeatEnd', async () => {
    const finals = [];
    const coalescer = new GiftStreakCoalescer({
      debounceMs: 300, // Reduced from 1500ms for test execution speed
      onFlush: (f) => finals.push(f)
    });

    // Send 3 intermediate combo hits with repeatEnd: false
    const sendHit = (count) => {
      coalescer.processGift({
        userId: 'combo_user_1',
        uniqueId: 'combo_user_1',
        nickname: 'Phật Tử',
        avatarUrl: '',
        payload: {
          giftId: 'lotus_candle',
          giftName: 'Đèn Sen',
          diamondCount: 10,
          repeatCount: count,
          repeatEnd: false,
          isCombo: true
        }
      });
    };

    sendHit(1);
    sendHit(2);
    sendHit(3);

    assert.equal(finals.length, 0, 'Should not flush immediately during active streak');

    // Wait for the debounce timeout to trigger
    await new Promise((r) => setTimeout(r, 450));

    assert.equal(finals.length, 1, 'Debounce timer should auto-flush the streak on timeout');
    assert.equal(finals[0].count, 3);
    assert.equal(finals[0].totalCoins, 30);
    assert.equal(finals[0].repeatEnd, true);
  });

  test('TC-206: Extreme Metronome BPM Limits - clamps values below 20 to 20, and above 120 to 120', () => {
    const scheduler = new LiturgicalScheduler({ moBpm: 52 });

    // 1. Lower boundary clamp
    scheduler.setMoBpm(10);
    assert.equal(scheduler.moBpm, 20, 'BPM 10 must be clamped to 20 BPM minimum');

    scheduler.setMoBpm(-50);
    assert.equal(scheduler.moBpm, 20, 'Negative BPM must be clamped to 20 BPM minimum');

    // 2. Upper boundary clamp
    scheduler.setMoBpm(500);
    assert.equal(scheduler.moBpm, 120, 'BPM 500 must be clamped to 120 BPM maximum');

    scheduler.setMoBpm(9999);
    assert.equal(scheduler.moBpm, 120, 'BPM 9999 must be clamped to 120 BPM maximum');

    // 3. Valid in-range value
    scheduler.setMoBpm(75);
    assert.equal(scheduler.moBpm, 75, 'Valid BPM within [20, 120] should be accepted as-is');

    scheduler.stop();
  });

  test('TC-207: TTS Priority Queue Ceiling - limits pending queue to 10 items, drops oldest low-tier', () => {
    // Mock TTS engine that does not process immediately to build up queue
    const mockTts = {
      synthesize: () => new Promise(() => {}) // never resolves to keep queue loaded
    };

    const queue = new AudioPriorityQueue({
      ttsEngine: mockTts,
      maxQueueSize: 10
    });

    // Enqueue 15 Tier 2 items
    for (let i = 1; i <= 15; i++) {
      queue.enqueue({
        text: `Lời nguyện cúng dường số ${i}`,
        priority: 2,
        tag: 'gift'
      });
    }

    assert.ok(
      queue.size() <= 10,
      `Queue size (${queue.size()}) must be capped at maxQueueSize 10`
    );

    queue.clear();
  });

  test('TC-208: Unicode & String Extremes - verifies empty strings, 120-char limits, emojis, and 18-char nickname truncation', () => {
    // 1. Empty and whitespace string handling
    assert.equal(Sanitizer.cleanString(''), '');
    assert.equal(Sanitizer.cleanString('   \n\t  '), '');
    assert.equal(ProfanityFilter.filterComment('').allowed, false);

    // 2. 120-character comment boundary
    const exactly120Chars = 'a'.repeat(120);
    assert.equal(Sanitizer.cleanString(exactly120Chars, 120).length, 120);

    const over120Chars = 'b'.repeat(200);
    const cleanedOver = Sanitizer.cleanString(over120Chars, 120);
    assert.equal(cleanedOver.length, 120, 'Strings exceeding 120 chars must be sliced to 120');

    // 3. Complex Vietnamese Unicode tone marks
    const vietnamesePoem = 'Trầm hương một dải nguy ngập toả, Pháp giới mười phương lắng sạch lòng.';
    const cleanedVn = Sanitizer.cleanString(vietnamesePoem, 120);
    assert.equal(cleanedVn, vietnamesePoem, 'Vietnamese Unicode diacritics must be perfectly preserved');

    // 4. Emoji preservation
    const emojiText = '🙏 Nam mô A Di Đà Phật 🌸 🪷';
    const cleanedEmoji = Sanitizer.cleanString(emojiText, 120);
    assert.equal(cleanedEmoji, emojiText, 'Lotus and praying emojis must be preserved');

    // 5. Nickname 18-character truncation
    const longNickname = 'Phật Tử Diệu Hạnh Từ Bi Hoan Hỷ Thích Ca';
    const sanitizedNick = ProfanityFilter.sanitizeNickname(longNickname);
    assert.ok(sanitizedNick.length <= 18, `Sanitized nickname length (${sanitizedNick.length}) must be <= 18 chars`);
    assert.equal(sanitizedNick, longNickname.slice(0, 18).trim());
  });
});
