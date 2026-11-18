/**
 * test_overlay_app_events.mjs
 * End-to-end event simulation test for OverlayApp coordinator
 */

import assert from 'assert';

// Mock DOM Environment
class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.textContent = '';
    this.style = {};
    this.classList = new Set();
    this.className = '';
    this._classes = new Set();
  }
  getContext() {
    return {
      clearRect: () => {},
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      ellipse: () => {},
      fill: () => {},
      stroke: () => {},
      save: () => {},
      restore: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      roundRect: () => {},
      closePath: () => {}
    };
  }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
  get classList() {
    return {
      add: (c) => this._classes.add(c),
      remove: (c) => this._classes.delete(c),
      contains: (c) => this._classes.has(c)
    };
  }
  set classList(val) {
    this._classes = new Set();
  }
}

const mockDocElements = new Map();
function getOrCreateMockElem(id) {
  if (!mockDocElements.has(id)) {
    const el = new MockElement();
    el.id = id;
    mockDocElements.set(id, el);
  }
  return mockDocElements.get(id);
}

global.document = {
  getElementById: (id) => getOrCreateMockElem(id),
  createElement: (tag) => new MockElement(tag)
};

global.window = {
  location: { protocol: 'http:', host: '127.0.0.1:3000' },
  addEventListener: () => {},
  removeEventListener: () => {}
};

global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.AudioContext = class {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = {};
  }
  createGain() {
    return {
      gain: {
        value: 1.0,
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        cancelScheduledValues: () => {}
      },
      connect: () => {},
      disconnect: () => {}
    };
  }
  createOscillator() {
    return {
      type: 'sine',
      frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      connect: () => {},
      start: () => {},
      stop: () => {}
    };
  }
  createBiquadFilter() {
    return {
      type: 'bandpass',
      frequency: { setValueAtTime: () => {} },
      Q: { setValueAtTime: () => {} },
      connect: () => {}
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      playbackRate: { value: 1.0 },
      connect: () => {},
      start: () => {},
      stop: () => {},
      disconnect: () => {}
    };
  }
  decodeAudioData(buf) {
    return Promise.resolve({ duration: 3.5 });
  }
  resume() { return Promise.resolve(); }
};
global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
global.Image = class {
  constructor() {
    this.src = '';
    setTimeout(() => { if (this.onload) this.onload(); }, 5);
  }
};
global.WebSocket = class {
  constructor(url) {
    this.url = url;
    setTimeout(() => { if (this.onopen) this.onopen(); }, 5);
  }
  close() { if (this.onclose) this.onclose(); }
};

// Now import OverlayApp
const { OverlayApp } = await import('../public/js/OverlayApp.js');

console.log('Testing OverlayApp instance and message dispatching...');
const app = new OverlayApp();

// 1. Initial State Snapshot
app.handleMessage({
  t: 'state',
  cap: 36,
  settings: {
    title: 'Chánh Điện Tịnh Tâm',
    subtitle: 'Nam Mô A Di Đà Phật',
    music: true
  },
  viewers: [
    { id: 'v1', name: 'Diệu Hạnh', coins: 150, slotIndex: 0, skin: 'woman', isVip: true },
    { id: 'v2', name: 'Minh Tâm', coins: 0, slotIndex: 1, skin: 'man' }
  ],
  tiktok: { likeCount: 45200 }
});

assert.strictEqual(app.floorEngine.cap, 36, 'Capacity should be 36');
assert.strictEqual(app.characterRenderer.characters.size, 2, 'Should have 2 seated characters');
assert.strictEqual(getOrCreateMockElem('viewer-count').textContent, 2, 'Viewer count pill updated');
assert.strictEqual(getOrCreateMockElem('like-count').textContent, '45,200', 'Like count updated');

// 2. Chat event
app.handleMessage({
  t: 'chat',
  id: 'v2',
  slotIndex: 1,
  text: 'Nam mô A Di Đà Phật'
});
const bubble1 = app.bubblePool.get(1);
assert.ok(bubble1, 'Speech bubble created for slot 1');
assert.strictEqual(bubble1.textContent, 'Nam mô A Di Đà Phật');

// 3. Gift event (Tier 3)
app.handleMessage({
  t: 'gift',
  id: 'v1',
  name: 'Diệu Hạnh',
  giftName: 'Đại Hồng Chung',
  count: 1,
  coins: 500,
  total: 650,
  tier: 3,
  prayer: 'Cầu quốc thái dân an',
  repeatEnd: true
});
assert.strictEqual(app.domGiftDonor.textContent, 'Phật tử Diệu Hạnh');
assert.strictEqual(app.domGiftPrayer.textContent, '"Cầu quốc thái dân an"');
assert.ok(app.domGiftBanner._classes.has('active'), 'Gift banner should be active');

// 4. Like event
app.handleMessage({
  t: 'like',
  id: 'v1',
  n: 20,
  totalLikes: 45220
});
assert.strictEqual(getOrCreateMockElem('like-count').textContent, '45,220');

// 5. Chant event
app.handleMessage({
  t: 'chant',
  text: 'Nguyện đem công đức này, hướng về khắp tất cả'
});
assert.strictEqual(app.domChantText.textContent, 'Nguyện đem công đức này, hướng về khắp tất cả');
assert.ok(app.domChantBanner._classes.has('active'), 'Chant banner should be active');

// 6. Join & Leave
app.handleMessage({
  t: 'join',
  v: { id: 'v3', name: 'Tuệ Minh', coins: 0, slotIndex: 2, skin: 'monk' }
});
assert.strictEqual(app.characterRenderer.characters.size, 3);
assert.strictEqual(getOrCreateMockElem('viewer-count').textContent, 3);

app.handleMessage({
  t: 'leave',
  id: 'v3',
  slotIndex: 2
});
assert.strictEqual(app.characterRenderer.characters.size, 2);
assert.strictEqual(getOrCreateMockElem('viewer-count').textContent, 2);

// 7. TTS Data URI playback
const sampleMp3Base64 = Buffer.from('mock_audio_bytes').toString('base64');
app.handleMessage({
  t: 'tts',
  dataUri: `data:audio/mp3;base64,${sampleMp3Base64}`
});

// 8. Nametag Synchronization
app.syncNametags();
assert.ok(app.nametagPool.has(0), 'Nametag created for slot 0');
assert.strictEqual(app.nametagPool.get(0).textContent, 'Diệu Hạnh');
assert.ok(app.nametagPool.get(0).className.includes('vip'), 'VIP nametag styled');

console.log('[PASS] All OverlayApp event handlers executed cleanly with zero errors.');
process.exit(0);
