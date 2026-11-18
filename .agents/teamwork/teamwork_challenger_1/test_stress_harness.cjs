// test_stress_harness.cjs
// Empirical stress tests for:
// 1. 100-slot LRU Eviction with all donors (coins > 0)
// 2. Exponential backoff reconnection formula
// 3. Rapid 50-gift streak combo coalescence & TTS queue exhaustion

console.log("=================================================================");
console.log("TEST 1: 100-SLOT LRU EVICTION UNDER ALL-DONOR CONDITION");
console.log("=================================================================");

function simulateSeatingEngine(maxCapacity, incomingUserCount, donorPercentage) {
  const viewers = new Map();
  let totalEvictions = 0;
  let failedJoins = 0;
  let slotAssignmentsOutOfBounds = 0;

  for (let i = 1; i <= incomingUserCount; i++) {
    const userId = `user_${i}`;
    const isDonor = Math.random() < donorPercentage;
    const coins = isDonor ? Math.floor(Math.random() * 50) + 1 : 0;
    const isVip = false;
    const lastActivityAt = Date.now() + i * 1000;

    // Check capacity logic from ARCHITECTURE.md §3.3 A
    if (viewers.size >= maxCapacity) {
      const nonDonors = [...viewers.values()].filter(v => v.coins === 0 && !v.isVip);
      if (nonDonors.length > 0) {
        nonDonors.sort((a, b) => a.lastActivityAt - b.lastActivityAt);
        const evictee = nonDonors[0];
        viewers.delete(evictee.id);
        totalEvictions++;
      }
    }

    // Now try to allocate slot
    if (viewers.size < maxCapacity) {
      // Find lowest available slotIndex from 0 to maxCapacity - 1
      const takenSlots = new Set([...viewers.values()].map(v => v.slotIndex));
      let availableSlot = -1;
      for (let s = 0; s < maxCapacity; s++) {
        if (!takenSlots.has(s)) {
          availableSlot = s;
          break;
        }
      }
      if (availableSlot === -1 || availableSlot >= maxCapacity) {
        slotAssignmentsOutOfBounds++;
      } else {
        viewers.set(userId, { id: userId, coins, isVip, lastActivityAt, slotIndex: availableSlot });
      }
    } else {
      // Failed to join because room is full and NO ONE can be evicted!
      failedJoins++;
    }
  }

  return {
    maxCapacity,
    incomingUserCount,
    donorPercentage,
    finalViewersCount: viewers.size,
    totalEvictions,
    failedJoins,
    slotAssignmentsOutOfBounds,
    nonDonorCount: [...viewers.values()].filter(v => v.coins === 0).length,
    donorCount: [...viewers.values()].filter(v => v.coins > 0).length
  };
}

console.log("Scenario A: Normal stream with 30% donors (300 users trying to join)");
const resA = simulateSeatingEngine(100, 300, 0.30);
console.log(resA);

console.log("\nScenario B: High-engagement stream with 90% donors (300 users trying to join)");
const resB = simulateSeatingEngine(100, 300, 0.90);
console.log(resB);

console.log("\nScenario C: 100% donors already seated (100 donors), 101st user tries to join");
const resC = simulateSeatingEngine(100, 150, 1.0);
console.log(resC);


console.log("\n=================================================================");
console.log("TEST 2: EXPONENTIAL BACKOFF RECONNECTION FORMULA");
console.log("=================================================================");

function testExponentialBackoff(attempts, runsPerAttempt) {
  const Tbase = 2.0;
  const Tmax = 30.0;
  console.log(`Formula: min(Tmax, Tbase * 1.5^attempt) * (1 ± 0.2)`);

  const results = [];
  for (let attempt = 0; attempt <= attempts; attempt++) {
    const rawVal = Tbase * Math.pow(1.5, attempt);
    const clamped = Math.min(Tmax, rawVal);

    let minDelay = Infinity;
    let maxDelay = -Infinity;
    for (let r = 0; r < runsPerAttempt; r++) {
      // Jitter (1 ± 0.2)
      const jitterFactor = 1.0 + (Math.random() * 0.4 - 0.2); // [0.8, 1.2]
      const delay = clamped * jitterFactor;
      if (delay < minDelay) minDelay = delay;
      if (delay > maxDelay) maxDelay = delay;
    }

    results.push({
      attempt,
      rawVal: rawVal.toFixed(2),
      clamped: clamped.toFixed(2),
      minDelay: minDelay.toFixed(2),
      maxDelay: maxDelay.toFixed(2),
      exceedsTmax: maxDelay > Tmax
    });
  }

  console.table(results);
}

testExponentialBackoff(15, 1000);


console.log("\n=================================================================");
console.log("TEST 3: RAPID 50-GIFT STREAK COMBO & TTS QUEUE EXHAUSTION");
console.log("=================================================================");

function simulateGiftCombosAndTtsQueue() {
  // Simulate 3 users simultaneously sending 50-gift streaks of 1-coin roses,
  // plus 2 users sending Tier 1 gifts (100 coins)
  const maxQueueSize = 10;
  const ttsQueue = [];
  let droppedCount = 0;
  let totalProcessed = 0;

  // Let's model the Tầng 2 Streak Coalescer:
  // If repeatEnd === false, accumulate and do not queue TTS.
  // When repeatEnd === true or 1.5s timeout, queue TTS.
  // What if repeatEnd event is dropped by network (TikTok Webcast bug)?

  const activeCombos = new Map();

  function onGiftEvent(event) {
    const { userId, giftId, repeatCount, repeatEnd, coins, tier } = event;
    const comboKey = `${userId}_${giftId}`;

    if (!repeatEnd) {
      // accumulating
      if (!activeCombos.has(comboKey)) {
        activeCombos.set(comboKey, {
          userId,
          giftId,
          totalCount: repeatCount,
          totalCoins: coins * repeatCount,
          tier,
          timer: setTimeout(() => finalizeCombo(comboKey), 1500)
        });
      } else {
        const c = activeCombos.get(comboKey);
        c.totalCount = repeatCount;
        c.totalCoins = coins * repeatCount;
        clearTimeout(c.timer);
        c.timer = setTimeout(() => finalizeCombo(comboKey), 1500);
      }
    } else {
      // repeatEnd === true
      if (activeCombos.has(comboKey)) {
        const c = activeCombos.get(comboKey);
        clearTimeout(c.timer);
        c.totalCount = repeatCount;
        c.totalCoins = coins * repeatCount;
        activeCombos.delete(comboKey);
        enqueueTts(c);
      } else {
        enqueueTts({ userId, giftId, totalCount: repeatCount, totalCoins: coins * repeatCount, tier });
      }
    }
  }

  function finalizeCombo(comboKey) {
    if (activeCombos.has(comboKey)) {
      const c = activeCombos.get(comboKey);
      activeCombos.delete(comboKey);
      enqueueTts(c);
    }
  }

  function enqueueTts(giftItem) {
    // 3-Tier Priority Queue
    // Tier 1: Emergency (>= 99 coins) -> preempt / head of queue
    // Tier 2: Standard (10 - 98 coins) -> FIFO
    // Tier 3: Low (1 - 9 coins) -> FIFO
    // Safe ceiling: 10 items. If overflow, drop oldest 1-coin messages.
    if (ttsQueue.length >= maxQueueSize) {
      // Find oldest 1-coin message (Tier 3)
      const dropIndex = ttsQueue.findIndex(item => item.totalCoins < 10);
      if (dropIndex !== -1) {
        ttsQueue.splice(dropIndex, 1);
        droppedCount++;
      } else {
        // No 1-coin message to drop! What does the spec do?
        // SPEC ONLY SAYS: "tự động bỏ qua các thông báo 1 xu cũ nhất"
        // If all items in queue are Tier 2 or Tier 1, SPEC DOES NOT DEFINE BEHAVIOR!
        // Does queue grow unbounded, or does it drop Tier 2, or reject new gift?
        droppedCount++;
        return; // dropped
      }
    }

    if (giftItem.tier === 1) {
      ttsQueue.unshift(giftItem); // head of queue
    } else {
      ttsQueue.push(giftItem);
    }
  }

  // Stress scenario: 20 rapid Tier 2 gifts (e.g. 30 diamonds each) sent in burst
  for (let i = 1; i <= 20; i++) {
    enqueueTts({ userId: `user_${i}`, giftId: '5820', totalCount: 1, totalCoins: 30, tier: 2 });
  }

  console.log(`After 20 Tier-2 gifts burst (maxQueue=${maxQueueSize}):`);
  console.log(`Current queue length: ${ttsQueue.length}`);
  console.log(`Dropped items: ${droppedCount}`);
}

simulateGiftCombosAndTtsQueue();
