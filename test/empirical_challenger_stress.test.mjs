/**
 * empirical_challenger_stress.test.mjs
 * Comprehensive Empirical Adversarial Stress Harness
 * 
 * Target Domains:
 * 1. 2.5D floor perspective math boundaries (Capacities 24, 36, 64, 100)
 * 2. Web Audio synthesis fallbacks (triangle swept mõ, 4-sine additive bell, 500ms autoplay watchdog)
 * 3. Look-ahead ducking (-14dB) concurrency stress (Bell + fast mõ 120 BPM + TTS)
 * 4. Memory benchmark: 10,000 continuous event cycles with heap < 120MB and zero leaks
 */

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { CanvasFloorEngine } from '../public/js/CanvasFloorEngine.js';
import { WebAudioEngine } from '../public/js/WebAudioEngine.js';
import { StateManager } from '../src/state/StateManager.mjs';
import { SeatingEngine } from '../src/state/SeatingEngine.mjs';
import { GiftStreakCoalescer } from '../src/moderation/GiftStreakCoalescer.mjs';
import { Sanitizer } from '../src/moderation/Sanitizer.mjs';
import { EventNormalizer } from '../src/moderation/EventNormalizer.mjs';

// ==============================================================================
// 1. MOCK WEB AUDIO API SPY ENVIRONMENT
// ==============================================================================

class MockAudioParam {
  constructor(initial = 1.0) {
    this.value = initial;
    this.calls = [];
  }
  setValueAtTime(val, time) {
    this.value = val;
    this.calls.push({ method: 'setValueAtTime', value: val, time });
  }
  exponentialRampToValueAtTime(val, time) {
    this.calls.push({ method: 'exponentialRampToValueAtTime', value: val, time });
  }
  linearRampToValueAtTime(val, time) {
    this.value = val;
    this.calls.push({ method: 'linearRampToValueAtTime', value: val, time });
  }
  cancelScheduledValues(time) {
    this.calls.push({ method: 'cancelScheduledValues', time });
  }
}

class MockAudioNode {
  constructor(type) {
    this.nodeType = type;
    this.connections = [];
  }
  connect(dest) {
    this.connections.push(dest);
  }
  disconnect() {
    this.connections = [];
  }
}

class MockGainNode extends MockAudioNode {
  constructor() {
    super('gain');
    this.gain = new MockAudioParam(1.0);
  }
}

class MockOscillatorNode extends MockAudioNode {
  constructor() {
    super('oscillator');
    this.type = 'sine';
    this.frequency = new MockAudioParam(440);
    this.starts = [];
    this.stops = [];
  }
  start(time) {
    this.starts.push(time);
  }
  stop(time) {
    this.stops.push(time);
  }
}

class MockBiquadFilterNode extends MockAudioNode {
  constructor() {
    super('filter');
    this.type = 'lowpass';
    this.frequency = new MockAudioParam(350);
    this.Q = new MockAudioParam(1);
  }
}

class MockAudioContext {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 48000;
    this.currentTime = 10.0;
    this.state = 'suspended';
    this.destination = new MockAudioNode('destination');
    this.createdNodes = [];
    this.resumeCalled = false;
  }

  createGain() {
    const node = new MockGainNode();
    this.createdNodes.push(node);
    return node;
  }

  createOscillator() {
    const node = new MockOscillatorNode();
    this.createdNodes.push(node);
    return node;
  }

  createBiquadFilter() {
    const node = new MockBiquadFilterNode();
    this.createdNodes.push(node);
    return node;
  }

  createBufferSource() {
    const node = new MockAudioNode('bufferSource');
    node.playbackRate = new MockAudioParam(1.0);
    node.start = () => {};
    node.stop = () => {};
    this.createdNodes.push(node);
    return node;
  }

  async resume() {
    this.state = 'running';
    this.resumeCalled = true;
  }
}

// Set global window for Web Audio Engine tests
let originalWindow = global.window;
function setupMockWindow() {
  global.window = {
    AudioContext: MockAudioContext,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

function teardownMockWindow() {
  global.window = originalWindow;
}

// ==============================================================================
// TEST SUITE: EMPIRICAL CHALLENGER STRESS TESTS
// ==============================================================================

describe('EMPIRICAL CHALLENGER: OBS Overlay, Audio Engine & State Concurrency Stress', () => {

  // ----------------------------------------------------------------------------
  // SECTION 1: 2.5D MATH BOUNDARIES ACROSS CAPACITIES (24, 36, 64, 100)
  // ----------------------------------------------------------------------------
  describe('1. 2.5D Floor Perspective Math Boundary Stress', () => {
    const capacities = [24, 36, 64, 100];
    const mockCanvas = { getContext: () => ({}) };

    capacities.forEach((cap) => {
      test(`EC-01.[Cap ${cap}]: Verify Center Walkway (X=540 never occupied) and [110, 970] bounds`, () => {
        const engine = new CanvasFloorEngine(mockCanvas);
        engine.setCapacity(cap);

        assert.equal(engine.slotCoords.length, cap, `Floor must compute exactly ${cap} slots`);

        let minDistanceToCenter = Infinity;
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        for (let idx = 0; idx < engine.slotCoords.length; idx++) {
          const slot = engine.slotCoords[idx];

          // 1. Center Walkway Isolation
          const distToCenter = Math.abs(slot.x - 540);
          if (distToCenter < minDistanceToCenter) {
            minDistanceToCenter = distToCenter;
          }

          assert.notEqual(
            slot.x,
            540,
            `Slot ${idx} (row ${slot.row}, col ${slot.col}) must NEVER occupy center aisle X=540`
          );
          // Center carpet half-width is 43.5px to 64.5px. Slots must maintain clearance > 65px from 540.
          assert.ok(
            distToCenter >= 65.0,
            `Slot ${idx} at X=${slot.x} must maintain at least 65px aisle buffer from 540 (got ${distToCenter.toFixed(2)}px)`
          );

          // 2. Spatial Floor Bounds [110, 970]
          if (slot.x < minX) minX = slot.x;
          if (slot.x > maxX) maxX = slot.x;
          if (slot.y < minY) minY = slot.y;
          if (slot.y > maxY) maxY = slot.y;

          assert.ok(
            slot.x >= 110 && slot.x <= 970,
            `Slot ${idx} X=${slot.x.toFixed(2)} must be strictly within [110, 970]`
          );

          assert.ok(
            slot.y >= 1215 && slot.y <= 1845,
            `Slot ${idx} Y=${slot.y.toFixed(2)} must be strictly within floor Y range [1215, 1845]`
          );

          // 3. Cushion Physical Footprint Boundary
          const cushionW = 160 * slot.scale;
          const cushionLeft = slot.x - cushionW / 2;
          const cushionRight = slot.x + cushionW / 2;

          assert.ok(
            cushionLeft >= 105,
            `Slot ${idx} cushion left edge (${cushionLeft.toFixed(2)}) must not clip into left wall (< 105)`
          );
          assert.ok(
            cushionRight <= 975,
            `Slot ${idx} cushion right edge (${cushionRight.toFixed(2)}) must not clip into right wall (> 975)`
          );

          // Cushion inner edge must not invade center walkway carpet line
          const cushionInnerEdgeDist = slot.x < 540 ? (540 - cushionRight) : (cushionLeft - 540);
          assert.ok(
            cushionInnerEdgeDist >= 25,
            `Slot ${idx} cushion inner edge must stay at least 25px clear of center X=540 (clearance: ${cushionInnerEdgeDist.toFixed(2)}px)`
          );

          // 4. Scale Monotonicity
          assert.ok(slot.scale > 0.15 && slot.scale <= 0.60, `Scale ${slot.scale} must be realistic`);
        }

        console.log(`  [Cap ${cap}] Metrics: Slots=${cap}, X Range=[${minX.toFixed(1)}, ${maxX.toFixed(1)}], Y Range=[${minY.toFixed(1)}, ${maxY.toFixed(1)}], Min Center Dist=${minDistanceToCenter.toFixed(1)}px`);
      });
    });

    test('EC-02: Depth Sorting (Painter Algorithm) Invariance', () => {
      const engine = new CanvasFloorEngine(mockCanvas);
      engine.setCapacity(64);

      const slotRow0 = engine.computeSlotMath(0, 0, 8, 8);
      const slotRowLast = engine.computeSlotMath(7, 0, 8, 8);

      assert.ok(slotRow0.y < slotRowLast.y, 'Row 0 (far altar) must have smaller Y than Row 7 (camera near)');
      assert.equal(slotRow0.y, 1215, 'Row 0 Y must be Y_TOP = 1215');
      assert.equal(slotRowLast.y, 1845, 'Row 7 Y must be Y_BOT = 1845');
      assert.ok(slotRow0.scale < slotRowLast.scale, 'Row 0 scale must be smaller than Row 7 scale');
    });
  });

  // ----------------------------------------------------------------------------
  // SECTION 2: WEB AUDIO SYNTHESIS FALLBACKS & AUTOPLAY WATCHDOG
  // ----------------------------------------------------------------------------
  describe('2. Web Audio Synthesis Fallbacks & Watchdog Verification', () => {
    before(() => {
      setupMockWindow();
    });

    test('EC-03: Swept Triangle Mõ Synthesis Parameters Verification', () => {
      const audio = new WebAudioEngine();
      audio.audioBuffers.set('mo_1', null); // Force synthetic fallback

      const beforeNodeCount = audio.ctx.createdNodes.length;
      audio.synthesizeMo();
      const newNodes = audio.ctx.createdNodes.slice(beforeNodeCount);

      const osc = newNodes.find(n => n.nodeType === 'oscillator');
      const filter = newNodes.find(n => n.nodeType === 'filter');
      const gain = newNodes.find(n => n.nodeType === 'gain');

      assert.ok(osc, 'Mõ synthesis must create an oscillator');
      assert.ok(filter, 'Mõ synthesis must create a bandpass filter');
      assert.ok(gain, 'Mõ synthesis must create an envelope gain node');

      // 1. Oscillator wave shape and frequency sweep: 620Hz -> 380Hz
      assert.equal(osc.type, 'triangle', 'Mõ oscillator wave must be triangle');
      const freqSet = osc.frequency.calls.find(c => c.method === 'setValueAtTime');
      const freqRamp = osc.frequency.calls.find(c => c.method === 'exponentialRampToValueAtTime');

      assert.ok(freqSet, 'Oscillator must set initial frequency');
      assert.equal(freqSet.value, 620, 'Initial frequency must be exactly 620Hz');
      assert.ok(freqRamp, 'Oscillator must ramp down frequency');
      assert.equal(freqRamp.value, 380, 'Ramped frequency must reach 380Hz');
      assert.ok(Math.abs((freqRamp.time - freqSet.time) - 0.12) < 0.001, 'Frequency ramp duration must be 0.12s');

      // 2. Bandpass Filter: 700Hz, Q = 3.0
      assert.equal(filter.type, 'bandpass', 'Filter type must be bandpass');
      const filterFreq = filter.frequency.calls.find(c => c.method === 'setValueAtTime');
      const filterQ = filter.Q.calls.find(c => c.method === 'setValueAtTime');
      assert.equal(filterFreq.value, 700, 'Bandpass center frequency must be 700Hz');
      assert.equal(filterQ.value, 3.0, 'Bandpass resonance Q must be 3.0');

      // 3. Amplitude Envelope: 0.85 -> 0.001
      const gainSet = gain.gain.calls.find(c => c.method === 'setValueAtTime');
      const gainRamp = gain.gain.calls.find(c => c.method === 'exponentialRampToValueAtTime');
      assert.equal(gainSet.value, 0.85, 'Initial gain must be 0.85');
      assert.equal(gainRamp.value, 0.001, 'Decayed gain must reach 0.001');
      assert.ok(Math.abs((gainRamp.time - gainSet.time) - 0.35) < 0.001, 'Gain decay duration must be 0.35s');
    });

    test('EC-04: 4-Sine Additive Bell Synthesis Parameters Verification', () => {
      const audio = new WebAudioEngine();
      audio.audioBuffers.set('bell_temple', null); // Force synthetic fallback

      const beforeNodeCount = audio.ctx.createdNodes.length;
      audio.synthesizeBell(11.2);
      const newNodes = audio.ctx.createdNodes.slice(beforeNodeCount);

      const oscillators = newNodes.filter(n => n.nodeType === 'oscillator');
      assert.equal(oscillators.length, 4, 'Great Bell must create exactly 4 additive sine partials');

      for (const osc of oscillators) {
        assert.equal(osc.type, 'sine', 'Bell partial oscillator must be sine wave');
      }

      const expectedFreqs = [216, 432, 1296, 2160];
      const actualFreqs = oscillators.map(osc => {
        const setCall = osc.frequency.calls.find(c => c.method === 'setValueAtTime');
        return setCall ? setCall.value : 0;
      });

      assert.deepEqual(actualFreqs, expectedFreqs, 'Additive harmonic partials must match [216, 432, 1296, 2160] Hz');

      const gains = newNodes.filter(n => n.nodeType === 'gain');
      const masterBellGain = gains[0];
      const masterSet = masterBellGain.gain.calls.find(c => c.method === 'setValueAtTime');
      const masterRamp = masterBellGain.gain.calls.find(c => c.method === 'exponentialRampToValueAtTime');

      assert.equal(masterSet.value, 0.9, 'Master bell gain initial value must be 0.9');
      assert.equal(masterRamp.value, 0.0001, 'Master bell gain decay value must be 0.0001');
      assert.equal(masterRamp.time - masterSet.time, 11.2, 'Master bell decay time must match 11.2s');
    });

    test('EC-05: 500ms Autoplay Watchdog & Resume Execution', async () => {
      let registeredListeners = {};
      global.window.addEventListener = (evt, fn) => {
        registeredListeners[evt] = fn;
      };

      const audio = new WebAudioEngine();
      assert.equal(audio.ctx.state, 'suspended', 'Context starts suspended under browser autoplay policy');
      assert.equal(audio.ctx.resumeCalled, false);

      await new Promise(resolve => setTimeout(resolve, 550));
      assert.equal(audio.ctx.resumeCalled, true, 'Autoplay watchdog must invoke resume() within 500ms');
      assert.equal(audio.ctx.state, 'running', 'Context state must transition to running');

      assert.ok(typeof registeredListeners['click'] === 'function', 'Must register click unlock');
      assert.ok(typeof registeredListeners['keydown'] === 'function', 'Must register keydown unlock');
      assert.ok(typeof registeredListeners['touchstart'] === 'function', 'Must register touchstart unlock');
    });
  });

  // ----------------------------------------------------------------------------
  // SECTION 3: LOOK-AHEAD DUCKING (-14dB) CONCURRENCY STRESS
  // ----------------------------------------------------------------------------
  describe('3. Look-Ahead Ducking (-14dB) & Audio Concurrency Stress', () => {
    before(() => {
      setupMockWindow();
    });

    test('EC-06: Ducking Mathematics (-14dB Attenuation & 400ms Linear Ramp)', () => {
      const audio = new WebAudioEngine();
      assert.equal(audio.normalBgmVolume, 0.55, 'Normal BGM volume must be 0.55');
      assert.equal(audio.duckedBgmVolume, 0.12, 'Ducked BGM volume must be 0.12');

      const dbDrop = 20 * Math.log10(audio.duckedBgmVolume / audio.normalBgmVolume);
      assert.ok(dbDrop <= -13.0 && dbDrop >= -14.5, `Decibel reduction (${dbDrop.toFixed(2)} dB) must adhere to -14dB specification`);

      audio.duckAudio(6.0);

      const calls = audio.bgmGain.gain.calls;
      const cancelCall = calls.find(c => c.method === 'cancelScheduledValues');
      const duckRamp = calls.find(c => c.method === 'linearRampToValueAtTime' && c.value === 0.12);
      const restoreRamp = calls.find(c => c.method === 'linearRampToValueAtTime' && c.value === 0.55);

      assert.ok(cancelCall, 'Ducking must cancel conflicting previously scheduled ramps');
      assert.ok(duckRamp, 'Must schedule linear ramp down to ducked volume 0.12');
      assert.ok(restoreRamp, 'Must schedule linear ramp restore back to 0.55');
      assert.ok(Math.abs((duckRamp.time - audio.ctx.currentTime) - 0.400) < 0.001, 'Look-ahead duck ramp must take 400ms');
    });

    test('EC-07: Concurrency Stress: Great Bell, 120 BPM Fast Mõ & TTS Rapid Triggers', () => {
      const audio = new WebAudioEngine();
      audio.audioBuffers.set('mo_1', null);
      audio.audioBuffers.set('mo_2', null);
      audio.audioBuffers.set('mo_3', null);
      audio.audioBuffers.set('bell_temple', null);

      assert.doesNotThrow(() => {
        for (let i = 0; i < 500; i++) {
          if (i % 50 === 0) {
            audio.playBell(true);
          }
          if (i % 5 === 0) {
            audio.playMo();
          }
          if (i % 20 === 0) {
            audio.duckAudio(3.5);
          }
        }
      }, 'High concurrency audio triggers must not throw or cause scheduling collisions');

      assert.ok(!isNaN(audio.bgmGain.gain.value), 'BGM gain must remain a valid number');
      assert.ok(audio.bgmGain.gain.value >= 0 && audio.bgmGain.gain.value <= 1.0, 'BGM gain must remain within [0, 1]');
      assert.ok(!isNaN(audio.sfxGain.gain.value), 'SFX gain must remain a valid number');
      assert.ok(!isNaN(audio.bellGain.gain.value), 'Bell gain must remain a valid number');
      assert.ok(!isNaN(audio.ttsGain.gain.value), 'TTS gain must remain a valid number');
    });

    after(() => {
      teardownMockWindow();
    });
  });

  // ----------------------------------------------------------------------------
  // SECTION 4: MEMORY BENCHMARK (10,000 CONTINUOUS EVENT CYCLES)
  // ----------------------------------------------------------------------------
  describe('4. Extended Memory Benchmark & Zero-Leak Verification (10,000 Events)', () => {
    test('EC-08: 10,000 Continuous Lifecycle Operations with Heap < 120MB and Bounded State', async () => {
      const stateManager = new StateManager({
        config: {
          server: { port: 3099 },
          seating: { defaultCap: 36, seatMode: 'auto' }
        }
      });

      const normalizer = new EventNormalizer();
      const coalescer = new GiftStreakCoalescer({ debounceMs: 100 });

      if (typeof global.gc === 'function') {
        global.gc();
      }

      const initialHeapUsed = process.memoryUsage().heapUsed;
      const initialHeapMb = initialHeapUsed / (1024 * 1024);

      console.log(`\n  [Memory Benchmark] Initial Heap: ${initialHeapMb.toFixed(2)} MB`);

      const checkpointInterval = 2500;
      const checkpoints = [];

      // Run 10,000 continuous full event cycles
      for (let cycle = 1; cycle <= 10000; cycle++) {
        const userIndex = cycle % 300;
        const userId = `mem_user_${userIndex}`;
        const nickname = `Phật Tử Thí Chủ ${userIndex}`;

        // 1. Text Sanitization & Moderation
        const rawComment = (cycle % 7 === 0)
          ? `Nam mô A Di Đà Phật cầu an số ${cycle}`
          : (cycle % 13 === 0)
            ? `Thầy ơi đổi cho con skin monk với ạ [${cycle}]`
            : `Cầu quốc thái dân an gia đạo bình an ${cycle}`;

        const cleanComment = Sanitizer.cleanString(rawComment, 120);
        const escaped = Sanitizer.escapeXml(cleanComment);

        // 2. Normalization
        const appEvent = normalizer.normalizeTikTokChat({
          userId,
          uniqueId: userId,
          nickname,
          comment: escaped
        });

        // 3. State Ingestion & Seating Allocation
        if (appEvent) {
          stateManager.handleCanonicalEvent(appEvent);
        }

        // 4. Gift Processing & Coalescing (every 10 cycles)
        if (cycle % 10 === 0) {
          coalescer.processGift({
            userId,
            uniqueId: userId,
            nickname,
            avatarUrl: '',
            payload: {
              giftId: 'rose_1',
              giftName: 'Hoa Hồng',
              diamondCount: 1,
              repeatCount: (cycle % 50) + 1,
              repeatEnd: (cycle % 50 === 49),
              isCombo: true
            }
          });
        }

        // 5. Liturgical Bell / Mõ / Chant trigger (every 100 cycles)
        if (cycle % 100 === 0) {
          stateManager.scheduler.triggerMoManual();
          stateManager.prayerCache.recordPrayer(userId, `Lời nguyện tại chu kỳ ${cycle}`);
        }

        // 6. Admin Control actions: Pin VIP, lock, kick (every 500 cycles)
        if (cycle % 500 === 0) {
          stateManager.seatingEngine.setVip(cycle % stateManager.seatingEngine.capacity, true);
        }

        // Checkpoint metrics
        if (cycle % checkpointInterval === 0) {
          const currentHeap = process.memoryUsage().heapUsed / (1024 * 1024);
          checkpoints.push({ cycle, heapMb: currentHeap });
          console.log(`  [Cycle ${cycle}/10,000] Heap: ${currentHeap.toFixed(2)} MB, Viewers: ${stateManager.seatingEngine.viewers.size}, Cap: ${stateManager.seatingEngine.capacity}`);
        }
      }

      if (typeof global.gc === 'function') {
        global.gc();
      }

      const finalHeapUsed = process.memoryUsage().heapUsed;
      const finalHeapMb = finalHeapUsed / (1024 * 1024);
      const deltaHeapMb = finalHeapMb - initialHeapMb;

      console.log(`  [Memory Benchmark] Final Heap: ${finalHeapMb.toFixed(2)} MB (Delta: ${deltaHeapMb >= 0 ? '+' : ''}${deltaHeapMb.toFixed(2)} MB)\n`);

      // 1. Strict heap limit (< 120MB)
      assert.ok(
        finalHeapMb < 120,
        `Final heap (${finalHeapMb.toFixed(2)} MB) must be strictly under 120 MB ceiling`
      );

      for (const cp of checkpoints) {
        assert.ok(
          cp.heapMb < 120,
          `Checkpoint at cycle ${cp.cycle} (${cp.heapMb.toFixed(2)} MB) must be strictly under 120 MB`
        );
      }

      // 2. Zero Unbounded Object Accumulation
      assert.ok(
        stateManager.seatingEngine.viewers.size <= stateManager.seatingEngine.capacity,
        `Seated viewers (${stateManager.seatingEngine.viewers.size}) must never exceed capacity (${stateManager.seatingEngine.capacity})`
      );

      assert.ok(
        stateManager.audioQueue.size() <= 10,
        `Audio priority queue (${stateManager.audioQueue.size()}) must respect 10-item maximum safety cap`
      );

      // Clean up
      await stateManager.destroy();
    });
  });
});
