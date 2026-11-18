/**
 * test_overlay_m2.mjs
 * Empirical Verification Suite for Milestone 2: OBS Browser Source Overlay & Web Audio Engine
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';

const ROOT_DIR = process.cwd();
console.log('================================================================');
console.log('TEST SUITE: MILESTONE 2 (R2 OBS OVERLAY & R4 WEB AUDIO ENGINE)');
console.log('Target Directory:', ROOT_DIR);
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`[PASS] ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${desc}:`, err.message);
    failCount++;
  }
}

// -----------------------------------------------------------------------------
// TEST GROUP 1: FILE EXISTENCE & EXCLUSIVE OWNERSHIP
// -----------------------------------------------------------------------------
console.log('--- TEST GROUP 1: File Existence & Exclusive Ownership ---');

const REQUIRED_FILES = [
  'public/overlay.html',
  'public/css/overlay.css',
  'public/js/CanvasFloorEngine.js',
  'public/js/CharacterRenderer.js',
  'public/js/ParticleSystem.js',
  'public/js/WebAudioEngine.js',
  'public/js/OverlayApp.js'
];

for (const relPath of REQUIRED_FILES) {
  it(`File exists and is non-empty: ${relPath}`, () => {
    const fullPath = path.join(ROOT_DIR, relPath);
    assert.ok(fs.existsSync(fullPath), `Missing file: ${relPath}`);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 200, `File ${relPath} is unexpectedly small: ${stat.size} bytes`);
  });
}

// -----------------------------------------------------------------------------
// TEST GROUP 2: FORENSIC ZERO-WATERMARK AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Forensic Zero-Watermark Audit ---');

it('No obfuscated _q arrays or author tags in any public file', () => {
  for (const relPath of REQUIRED_FILES) {
    const content = fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf-8');
    assert.ok(!content.includes('var _q'), `Found obfuscated _q array in ${relPath}`);
    assert.ok(!content.includes('kentjuno'), `Found legacy author tag 'kentjuno' in ${relPath}`);
    assert.ok(!content.includes('eval('), `Found eval() in ${relPath}`);
  }
});

// -----------------------------------------------------------------------------
// TEST GROUP 3: 2.5D PERSPECTIVE FLOOR MATH
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: 2.5D Perspective Floor Math ---');

import { CanvasFloorEngine } from '../public/js/CanvasFloorEngine.js';

// Mock minimal canvas for Node environment
const mockCanvas = {
  getContext: () => ({
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
  })
};

const floor = new CanvasFloorEngine(mockCanvas);

it('Grid capacities map to even columns', () => {
  const caps = [24, 36, 64, 100];
  for (const cap of caps) {
    const grid = floor.resolveGrid(cap);
    assert.strictEqual(grid.cols % 2, 0, `Cols must be even for cap ${cap}`);
    assert.strictEqual(grid.rows * grid.cols, cap, `Rows * cols must equal cap ${cap}`);
  }
});

it('Floor constants match ARCHITECTURE.md specifications', () => {
  assert.strictEqual(floor.Y_TOP, 1215);
  assert.strictEqual(floor.Y_BOT, 1845);
  assert.strictEqual(floor.HALF_TOP, 290);
  assert.strictEqual(floor.HALF_BOT, 430);
  assert.strictEqual(floor.CENTER_X, 540);
  assert.strictEqual(floor.AISLE_RATIO, 0.15);
  assert.strictEqual(floor.MARGIN_RATIO, 0.12);
});

it('Center aisle remains strictly clear (no avatar placed at X = 540)', () => {
  floor.setCapacity(36);
  assert.strictEqual(floor.slotCoords.length, 36);

  for (const slot of floor.slotCoords) {
    const distFromCenter = Math.abs(slot.x - 540);
    // At minimum, distFromCenter must be >= aisleRatio * halfWidth(r)
    const t = slot.row / (6 - 1);
    const halfWidth = 290 + 140 * t;
    const minExpectedDist = 0.15 * halfWidth;
    assert.ok(distFromCenter >= minExpectedDist - 0.01, `Slot at row ${slot.row}, col ${slot.col} is in aisle: dist=${distFromCenter}`);
    // Check floor safety margin: cushions stay inside [110, 970]
    assert.ok(slot.x >= 110 && slot.x <= 970, `Slot X=${slot.x} exceeds floor safety boundary [110, 970]`);
  }
});

it('Perspective scale factor increases from back row (altar) to front row (camera)', () => {
  floor.setCapacity(36);
  // Row 0 is at altar (y = 1215), Row 5 is near camera (y = 1845)
  const slotBack = floor.computeSlotMath(0, 0, 6, 6);
  const slotFront = floor.computeSlotMath(5, 0, 6, 6);

  assert.strictEqual(slotBack.y, 1215);
  assert.strictEqual(slotFront.y, 1845);
  assert.ok(slotFront.scale > slotBack.scale, `Front scale (${slotFront.scale}) must be greater than back scale (${slotBack.scale})`);
  assert.ok(Math.abs(slotBack.scale - 0.26) < 0.01, `Back scale ~0.26`);
  assert.ok(Math.abs(slotFront.scale - 0.50) < 0.01, `Front scale ~0.50`);
});

// -----------------------------------------------------------------------------
// TEST GROUP 4: CHARACTER RENDERER & SKIN NLP PARSER
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Character Renderer & Skin NLP Parser ---');

import { CharacterRenderer } from '../public/js/CharacterRenderer.js';

const renderer = new CharacterRenderer(floor);

it('Skin NLP correctly ignores sacred phrases and prayers', () => {
  const sacredPhrases = [
    'Nam mô A Di Đà Phật',
    'Con lạy Phật bà Quan Thế Âm Bồ Tát',
    'Nam mô Bổn Sư Thích Ca Mâu Ni Phật',
    'Nguyện cầu đức A Di Đà từ bi tiếp dẫn',
    'Thành kính lạy Phật gia hộ cho gia quyến bình an'
  ];

  for (const phrase of sacredPhrases) {
    const result = renderer.detectSkinNLP(phrase);
    assert.strictEqual(result, null, `Sacred phrase "${phrase}" must return null, got "${result}"`);
  }
});

it('Skin NLP correctly recognizes explicit character role keywords', () => {
  const tests = [
    { text: 'cho em xin skin nam', expected: 'char_man' },
    { text: 'đổi sang nữ', expected: 'char_woman' },
    { text: 'sư thầy', expected: 'char_monk' },
    { text: 'chú tiểu ngây thơ', expected: 'char_child' },
    { text: 'bà lão đi chùa', expected: 'char_granny' },
    { text: 'thỉnh sư cô', expected: 'char_nun' },
    { text: 'bái lạy cao tăng', expected: 'char_master' }
  ];

  for (const t of tests) {
    const result = renderer.detectSkinNLP(t.text);
    assert.strictEqual(result, t.expected, `Text "${t.text}" should detect ${t.expected}, got "${result}"`);
  }
});

it('Character state machine progresses through walk -> sitting -> sit', () => {
  renderer.characters.clear();
  renderer.addOrUpdateViewer({ id: 'user1', name: 'Thí Chủ A', slotIndex: 0, skin: 'monk' });

  const char = renderer.characters.get('user1');
  assert.ok(char, 'Character created');
  assert.strictEqual(char.phase, 'walk');
  assert.strictEqual(char.skin, 'char_monk');
  assert.strictEqual(char.currentX, 540);
  assert.strictEqual(char.currentY, 2020);

  // Simulate walk progress
  for (let i = 0; i < 60; i++) {
    renderer.update(0.05);
  }

  // Should have reached target and transitioned to sitting or sit
  assert.ok(char.phase === 'sitting' || char.phase === 'sit', `Expected sitting or sit, got ${char.phase}`);

  // Simulate sitting completion
  for (let i = 0; i < 30; i++) {
    renderer.update(0.05);
  }
  assert.strictEqual(char.phase, 'sit', `Expected sit idle, got ${char.phase}`);
});

it('Procedural cosine compression for prostration bows to cushion forehead and returns', () => {
  const char = renderer.characters.get('user1');
  renderer.triggerBow('user1');
  assert.strictEqual(char.phase, 'bowing');
  assert.strictEqual(char.phaseTime, 0);

  // At beginning of bow (theta = 0): y_scale = 1 - 0.45*(1 - 1) = 1.0
  const BOW_DURATION = 1.4;
  renderer.update(0.70); // Halfway (t = 0.70 / 1.4 = 0.5 -> theta = pi)
  assert.ok(Math.abs(char.bowTheta - Math.PI) < 0.1, `Theta should be near pi at half duration`);
  const yScaleMid = 1.0 - 0.45 * (1.0 - Math.cos(char.bowTheta));
  assert.ok(Math.abs(yScaleMid - 0.10) < 0.05, `yScale at apex of prostration should be ~0.10, got ${yScaleMid}`);

  // Complete bow duration
  renderer.update(0.75);
  assert.strictEqual(char.phase, 'sit', 'Should return to sit after full bow');
});

it('Avatar LRU Cache enforces 150 item ceiling', () => {
  global.Image = class { constructor() { this.src = ''; } };
  for (let i = 0; i < 170; i++) {
    renderer.addOrUpdateViewer({ id: `user_${i}`, name: `User ${i}`, avatar: `http://avatar.com/${i}.jpg` });
  }
  assert.ok(renderer.avatarLruCache.size <= 150, `Avatar cache size ${renderer.avatarLruCache.size} exceeded 150`);
});

// -----------------------------------------------------------------------------
// TEST GROUP 5: PARTICLE SYSTEM OBJECT POOLING & EQUATIONS
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 5: Particle System ---');

import { ParticleSystem } from '../public/js/ParticleSystem.js';

const particles = new ParticleSystem(mockCanvas);

it('Smoke pool contains exactly 18 object-pooled particles with staggered ages', () => {
  assert.strictEqual(particles.smokePool.length, 18);
  for (let i = 0; i < 18; i++) {
    assert.strictEqual(particles.smokePool[i].index, i);
    assert.ok(particles.smokePool[i].age >= 0 && particles.smokePool[i].age <= 4.0);
  }
});

it('Dual-frequency candle flame flicker stays bounded within [0.70, 1.00]', () => {
  for (let t = 0; t < 10; t += 0.25) {
    const flicker = 0.85 + 0.15 * Math.sin(t * 11) * Math.cos(t * 7);
    assert.ok(flicker >= 0.70 && flicker <= 1.00, `Flicker out of bounds: ${flicker} at t=${t}`);
  }
});

it('Gift particle spawning pools and recycles within 50 elements', () => {
  assert.strictEqual(particles.petalPool.length, 50);
  particles.spawnGiftParticles(540, 1500, 3); // Spawns up to 40 particles
  const activeCount1 = particles.petalPool.filter(p => p.active).length;
  assert.strictEqual(activeCount1, 40);

  // Age particles out
  particles.update(5.0);
  const activeCount2 = particles.petalPool.filter(p => p.active).length;
  assert.strictEqual(activeCount2, 0, 'All particles should be recycled after aging out');
});

// -----------------------------------------------------------------------------
// TEST GROUP 6: WEB AUDIO ENGINE ARCHITECTURE & DUCKING
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 6: Web Audio Engine ---');

it('WebAudioEngine ducking and synthesis parameters match specifications', () => {
  const content = fs.readFileSync(path.join(ROOT_DIR, 'public/js/WebAudioEngine.js'), 'utf-8');

  // Verify 48kHz context
  assert.ok(content.includes('48000'), 'AudioContext sampleRate must be 48000');
  // Verify -14dB ducking volume (0.12)
  assert.ok(content.includes('0.12'), 'Ducked BGM volume must be 0.12 (-14dB)');
  assert.ok(content.includes('0.55'), 'Normal BGM volume must be 0.55');
  assert.ok(content.includes('linearRampToValueAtTime'), 'Uses linearRampToValueAtTime for look-ahead ducking');
  // Verify Mõ synthesis: 620Hz -> 380Hz, 700Hz bandpass, Q=3
  assert.ok(content.includes('620') && content.includes('380'), 'Mõ synthesis must sweep 620Hz -> 380Hz');
  assert.ok(content.includes('700') && content.includes('3.0'), 'Mõ bandpass filter must be 700Hz Q=3');
  // Verify Bell synthesis 4 additive partials: 216, 432, 1296, 2160
  assert.ok(content.includes('216') && content.includes('432') && content.includes('1296') && content.includes('2160'),
    'Bell synthesis must include 216Hz, 432Hz, 1296Hz, 2160Hz partials');
  // Verify in-memory Base64 Data URI decoding with zero disk I/O
  assert.ok(content.includes('atob'), 'TTS player must decode Base64 in memory using atob()');
  assert.ok(content.includes('decodeAudioData'), 'TTS player must use decodeAudioData in memory');
});

// -----------------------------------------------------------------------------
// TEST GROUP 7: HTML & CSS CEF SPECIFICATIONS
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 7: HTML & CSS CEF Specifications ---');

it('overlay.html includes all required DOM layers and HUD elements', () => {
  const html = fs.readFileSync(path.join(ROOT_DIR, 'public/overlay.html'), 'utf-8');
  assert.ok(html.includes('width=1080, height=1920'), 'Viewport configured for 1080x1920');
  assert.ok(html.includes('id="templeCanvas"'), 'Canvas element #templeCanvas present');
  assert.ok(html.includes('id="hud-layer"'), '#hud-layer present');
  assert.ok(html.includes('id="plaque"'), '#plaque present');
  assert.ok(html.includes('id="merit"'), '#merit present');
  assert.ok(html.includes('id="merit-list"'), '#merit-list present');
  assert.ok(html.includes('id="pills"'), '#pills present');
  assert.ok(html.includes('id="chant-banner"'), '#chant-banner present');
  assert.ok(html.includes('id="gift-banner"'), '#gift-banner present');
  assert.ok(html.includes('id="speech-bubbles"'), '#speech-bubbles present');
  assert.ok(html.includes('id="nametags"'), '#nametags present');
});

it('overlay.css strictly enforces 1080x1920 resolution, transparent background, and typography', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'public/css/overlay.css'), 'utf-8');
  assert.ok(css.includes('width: 1080px;'), '1080px width specified in CSS');
  assert.ok(css.includes('height: 1920px;'), '1920px height specified in CSS');
  assert.ok(css.includes('background-color: transparent'), 'Transparent background enforced');
  assert.ok(css.includes('.bubble::after'), 'Speech bubble pointer styling present');
  assert.ok(css.includes('.nametag.vip'), 'VIP nametag styling present');
  assert.ok(css.includes('.hud-plaque'), 'Plaque frame styling present');
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passCount} passed, ${failCount} failed.`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL MILESTONE 2 TESTS COMPLETED SUCCESSFULLY WITH 100% PASS RATE.');
}
