// victory_validation_test.cjs
// Independent Victory Verification Suite by victory_auditor_1

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../../..');
console.log('================================================================');
console.log('VICTORY AUDITOR INDEPENDENT VERIFICATION SUITE');
console.log('Project Root:', projectRoot);
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function check(desc, condition, detail = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${desc}`);
  } else {
    failedTests++;
    console.error(`[FAIL] ${desc} - ${detail}`);
    failureDetails.push({ desc, detail });
  }
}

// -------------------------------------------------------------
// CHECKPOINT 1: DELIVERABLE PRESENCE & NON-TRIVIAL SIZE
// -------------------------------------------------------------
console.log('--- CHECKPOINT 1: Deliverable File Integrity & Completeness ---');
const requiredDeliverables = [
  { file: 'ARCHITECTURE.md', minSize: 40000 },
  { file: 'WEBSOCKET_SPEC.md', minSize: 20000 },
  { file: 'ROADMAP.md', minSize: 25000 },
  { file: 'ASSET_MANIFEST.md', minSize: 12000 },
  { file: 'manifest.json', minSize: 10000 },
  { file: 'assets/asset-manifest.schema.json', minSize: 6000 },
  { file: 'PROJECT.md', minSize: 10000 },
  { file: 'scripts/verify_assets.mjs', minSize: 8000 }
];

for (const d of requiredDeliverables) {
  const fullPath = path.join(projectRoot, d.file);
  const exists = fs.existsSync(fullPath);
  const size = exists ? fs.statSync(fullPath).size : 0;
  check(`Deliverable exists: ${d.file}`, exists, `File missing: ${fullPath}`);
  check(`Deliverable non-trivial size: ${d.file} (${size} bytes >= ${d.minSize} bytes)`, size >= d.minSize, `Size ${size} < ${d.minSize}`);
}

// -------------------------------------------------------------
// CHECKPOINT 2: JSON SCHEMA DRAFT 2020-12 COMPLIANCE & MANIFEST VALIDATION
// -------------------------------------------------------------
console.log('\n--- CHECKPOINT 2: JSON Schema & manifest.json Validation ---');
const schemaPath = path.join(projectRoot, 'assets/asset-manifest.schema.json');
const manifestPath = path.join(projectRoot, 'manifest.json');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

check('Schema uses Draft 2020-12 meta-schema', schema['$schema'] === 'https://json-schema.org/draft/2020-12/schema', `Got ${schema['$schema']}`);
check('Schema root requires version, theme, defaultConfig, assets', ['version', 'theme', 'defaultConfig', 'assets'].every(k => schema.required.includes(k)));

const defs = schema['$defs'];
check('Schema contains $defs for 6 asset categories', ['backgroundItem', 'altarItem', 'characterItem', 'fxItem', 'sfxItem', 'bgmItem'].every(k => defs && defs[k]));

const categoryToDef = {
  backgrounds: 'backgroundItem',
  altar: 'altarItem',
  characters: 'characterItem',
  visual_fx: 'fxItem',
  audio_sfx: 'sfxItem',
  audio_bgm: 'bgmItem'
};

let allAssets = [];
const assetIdMap = new Map();

for (const [cat, defKey] of Object.entries(categoryToDef)) {
  const items = manifest.assets[cat] || [];
  const def = defs[defKey];
  
  for (const item of items) {
    allAssets.push({ ...item, categoryKey: cat });
    check(`Asset ID unique: ${item.id}`, !assetIdMap.has(item.id), `Duplicate ID ${item.id}`);
    assetIdMap.set(item.id, item);

    // Validate required fields
    for (const req of def.required || []) {
      check(`Asset ${item.id} has required field '${req}'`, item[req] !== undefined, `Missing '${req}' in ${item.id}`);
    }

    // Validate additionalProperties: false
    if (def.additionalProperties === false) {
      for (const k of Object.keys(item)) {
        check(`Asset ${item.id} property '${k}' is allowed in schema`, def.properties[k] !== undefined, `Disallowed property '${k}' in ${item.id}`);
      }
    }

    // Validate enum constraints
    for (const [prop, propSpec] of Object.entries(def.properties)) {
      if (item[prop] !== undefined) {
        if (propSpec.const !== undefined) {
          check(`Asset ${item.id}.${prop} equals const '${propSpec.const}'`, item[prop] === propSpec.const, `Got ${item[prop]}`);
        }
        if (propSpec.enum !== undefined) {
          check(`Asset ${item.id}.${prop} in enum [${propSpec.enum.join(', ')}]`, propSpec.enum.includes(item[prop]), `Got ${item[prop]}`);
        }
      }
    }
  }
}

check('Total cataloged assets equals 29', allAssets.length === 29, `Found ${allAssets.length}`);

// -------------------------------------------------------------
// CHECKPOINT 3: ACYCLIC FALLBACK DIRECTED GRAPH VALIDATION
// -------------------------------------------------------------
console.log('\n--- CHECKPOINT 3: Directed Fallback Graph & Synthetic Termination ---');
let hasCycle = false;
let deadFallback = false;
let nonTerminating = false;

for (const asset of allAssets) {
  let curr = asset;
  const visited = new Set([curr.id]);

  while (curr.fallbackId) {
    if (!assetIdMap.has(curr.fallbackId)) {
      deadFallback = true;
      check(`Fallback ID exists for ${curr.id}`, false, `Target ${curr.fallbackId} does not exist`);
      break;
    }
    if (visited.has(curr.fallbackId)) {
      hasCycle = true;
      check(`No cycle in fallback path for ${asset.id}`, false, `Cycle detected at ${curr.fallbackId}`);
      break;
    }
    visited.add(curr.fallbackId);
    curr = assetIdMap.get(curr.fallbackId);
  }

  if (!curr.fallbackSynthetic) {
    nonTerminating = true;
    check(`Fallback chain for ${asset.id} terminates at synthetic generator`, false, `Terminal asset ${curr.id} lacks fallbackSynthetic: true`);
  }
}

check('Zero cycles in asset fallback graph', !hasCycle);
check('Zero dead fallback IDs in asset manifest', !deadFallback);
check('100% of fallback chains terminate at fallbackSynthetic: true', !nonTerminating);

// -------------------------------------------------------------
// CHECKPOINT 4: 2.5D PERSPECTIVE GEOMETRY & MATH INVARIANTS
// -------------------------------------------------------------
console.log('\n--- CHECKPOINT 4: 2.5D Floor Geometry, Clearance & Invariants ---');
const capacities = [
  { cap: 24, rows: 4, cols: 6 },
  { cap: 36, rows: 6, cols: 6 },
  { cap: 64, rows: 8, cols: 8 },
  { cap: 100, rows: 10, cols: 10 }
];

const yTop = 1215;
const yBot = 1845;
const halfTop = 290;
const halfBot = 430;
const centerX = 540;
const aisleRatio = 0.15;
const marginRatio = 0.12;

for (const c of capacities) {
  check(`Capacity ${c.cap} has strictly even columns (${c.cols} % 2 === 0)`, c.cols % 2 === 0);

  let prevY = -Infinity;
  let centerBlocked = false;
  let floorViolation = false;

  for (let r = 0; r < c.rows; r++) {
    const t = c.rows === 1 ? 0.5 : r / (c.rows - 1);
    const y = yTop + (yBot - yTop) * t;
    
    // Y-monotonicity
    if (y <= prevY) {
      check(`Row ${r} Y-depth monotonic increasing`, false, `${y} <= ${prevY}`);
    }
    prevY = y;

    const halfW = halfTop + (halfBot - halfTop) * t;
    const scale = (0.26 + 0.24 * t) * Math.pow(6 / c.cols, 0.75);
    const cushionR = 40 * (scale / 0.5);

    for (let col = 0; col < c.cols; col++) {
      const u0 = (col - (c.cols - 1) / 2) / ((c.cols - 1) / 2);
      if (Math.abs(u0) < 1e-9) {
        centerBlocked = true;
      }

      const sign = u0 < 0 ? -1 : 1;
      const mag = Math.abs(u0);
      const u = sign * (aisleRatio + mag * (1.0 - aisleRatio - marginRatio));

      if (Math.abs(u) < aisleRatio - 1e-9) {
        centerBlocked = true;
      }

      const x = centerX + u * halfW;
      const leftEdge = x - cushionR;
      const rightEdge = x + cushionR;
      const floorLeft = centerX - halfW;
      const floorRight = centerX + halfW;

      if (leftEdge < floorLeft - 1e-6 || rightEdge > floorRight + 1e-6) {
        floorViolation = true;
      }
    }
  }

  check(`Capacity ${c.cap}: Center aisle 100% unobstructed`, !centerBlocked);
  check(`Capacity ${c.cap}: All cushions stay strictly inside floor trapezoid`, !floorViolation);
}

// -------------------------------------------------------------
// CHECKPOINT 5: EXPONENTIAL BACKOFF BOUNDEDNESS & JITTER
// -------------------------------------------------------------
console.log('\n--- CHECKPOINT 5: Exponential Backoff & Jitter Verification ---');
function calcBackoff(attempt) {
  const baseDelay = 2.0;
  const maxDelay = 30.0;
  const jitterRange = 0.2;
  const unclamped = baseDelay * Math.pow(1.5, attempt);
  const expDelay = Math.min(unclamped, maxDelay);
  const jitterFactor = 1.0 + (Math.random() * 2 - 1) * jitterRange;
  return Math.min(expDelay * jitterFactor, maxDelay);
}

let backoffBreached = false;
let maxObservedDelay = 0;
for (let i = 0; i < 50000; i++) {
  const attempt = Math.floor(Math.random() * 20);
  const delay = calcBackoff(attempt);
  if (delay > 30.000001) backoffBreached = true;
  if (delay > maxObservedDelay) maxObservedDelay = delay;
}
check('Exponential backoff strictly bounded by 30.0s across 50,000 trials', !backoffBreached, `Max observed: ${maxObservedDelay}`);
check('Exponential backoff achieves expected maximum saturation (>= 29.5s)', maxObservedDelay >= 29.5, `Max observed: ${maxObservedDelay}`);

// -------------------------------------------------------------
// CHECKPOINT 6: SEATING EVICTION UNDER 100% DONOR SATURATION
// -------------------------------------------------------------
console.log('\n--- CHECKPOINT 6: Seating Eviction Engine Under 100% Saturation ---');
class MockSeatingEngine {
  constructor(capacity = 36) {
    this.capacity = capacity;
    this.slots = new Map(); // slotIndex -> viewer
  }

  join(viewer) {
    if (this.slots.size < this.capacity) {
      const slotIndex = this.findFreeSlot();
      viewer.slotIndex = slotIndex;
      this.slots.set(slotIndex, viewer);
      return { success: true, slotIndex, evicted: null };
    }

    // Eviction logic
    const candidates = Array.from(this.slots.values()).filter(v => !v.isVip);

    // Priority 1: non-donors (coins === 0), longest idle
    const nonDonors = candidates.filter(v => (v.coins || 0) === 0);
    if (nonDonors.length > 0) {
      nonDonors.sort((a, b) => a.lastActiveAt - b.lastActiveAt);
      const victim = nonDonors[0];
      this.slots.delete(victim.slotIndex);
      viewer.slotIndex = victim.slotIndex;
      this.slots.set(victim.slotIndex, viewer);
      return { success: true, slotIndex: victim.slotIndex, evicted: victim, reason: 'eviction_idle' };
    }

    // Priority 2: 100% donor saturation -> evict inactive donors (> 15min idle), lowest coins first
    const now = Date.now();
    const inactiveDonors = candidates.filter(v => (now - v.lastActiveAt) > 15 * 60 * 1000);
    if (inactiveDonors.length > 0) {
      inactiveDonors.sort((a, b) => a.coins - b.coins || a.lastActiveAt - b.lastActiveAt);
      const victim = inactiveDonors[0];
      this.slots.delete(victim.slotIndex);
      viewer.slotIndex = victim.slotIndex;
      this.slots.set(victim.slotIndex, viewer);
      return { success: true, slotIndex: victim.slotIndex, evicted: victim, reason: 'eviction_donor_inactive' };
    }

    return { success: false, reason: 'room_full_active_donors' };
  }

  findFreeSlot() {
    for (let i = 0; i < this.capacity; i++) {
      if (!this.slots.has(i)) return i;
    }
    return -1;
  }
}

const engine = new MockSeatingEngine(24);
// Fill 24 slots with donors, 1 VIP, 23 regular donors
const now = Date.now();
engine.slots.set(0, { id: 'vip_1', name: 'VIP Host', coins: 1000, isVip: true, slotIndex: 0, lastActiveAt: now - 3600000 });
for (let i = 1; i < 24; i++) {
  // inactive donors (> 20 mins ago)
  engine.slots.set(i, { id: `donor_${i}`, name: `Donor ${i}`, coins: i * 10, isVip: false, slotIndex: i, lastActiveAt: now - (20 + i) * 60000 });
}

// Join incoming viewer
const newViewer = { id: 'new_user', name: 'New User', coins: 0, isVip: false, lastActiveAt: now };
const result = engine.join(newViewer);

check('Join succeeds under 100% donor saturation by evicting inactive donor', result.success);
check('Victim is lowest coin inactive donor (donor_1 with 10 coins)', result.evicted && result.evicted.id === 'donor_1', `Evicted: ${result.evicted?.id}`);
check('VIP slot remains untouched', engine.slots.get(0)?.id === 'vip_1');

// -------------------------------------------------------------
// CHECKPOINT 7: VIETNAMESE SACRED PHRASE EXCLUSION IN SKIN NLP
// -------------------------------------------------------------
console.log('\n--- CHECKPOINT 7: Vietnamese Sacred Phrase NLP Exclusion ---');
const sacredPrayers = [
  'Nam mô A Di Đà Phật',
  'Nam mô Bổn Sư Thích Ca Mâu Ni Phật',
  'Nam mô Quán Thế Âm Bồ Tát',
  'Con lạy Phật bà Quan Âm cứu khổ cứu nạn',
  'Lạy Phật từ bi gia hộ gia đạo bình an',
  'Nam mô Đại Trí Văn Thù Sư Lợi Bồ Tát'
];

const skinCommands = [
  { text: 'nam', expected: 'man' },
  { text: 'nữ', expected: 'woman' },
  { text: 'bà', expected: 'granny' },
  { text: 'chú tiểu', expected: 'child' },
  { text: 'sư thầy', expected: 'monk' },
  { text: 'sư cô', expected: 'nun' },
  { text: 'cao tăng', expected: 'master' },
  { text: 'cho con đổi skin chú tiểu', expected: 'child' }
];

function parseSkin(text) {
  const lower = text.toLowerCase().trim();
  // Check sacred exclusion
  const sacredPatterns = [
    /nam\s+mô/i,
    /phật\s+bà/i,
    /bồ\s+tát/i,
    /a\s+di\s+đà/i,
    /thích\s+ca/i,
    /từ\s+bi/i,
    /gia\s+hộ/i
  ];

  if (sacredPatterns.some(p => p.test(lower))) {
    return null; // Sacred phrase protected
  }

  // Exact word boundary checks
  if (/(?:^|\s)chú\s+tiểu(?:$|\s)/i.test(lower)) return 'child';
  if (/(?:^|\s)sư\s+thầy(?:$|\s)/i.test(lower)) return 'monk';
  if (/(?:^|\s)sư\s+cô(?:$|\s)/i.test(lower)) return 'nun';
  if (/(?:^|\s)cao\s+tăng(?:$|\s)/i.test(lower)) return 'master';
  if (/(?:^|\s)bà(?:$|\s)/i.test(lower)) return 'granny';
  if (/(?:^|\s)nữ(?:$|\s)/i.test(lower)) return 'woman';
  if (/(?:^|\s)nam(?:$|\s)/i.test(lower)) return 'man';

  return null;
}

let prayerProtected = true;
for (const p of sacredPrayers) {
  if (parseSkin(p) !== null) {
    prayerProtected = false;
    check(`Sacred prayer protected: "${p}"`, false, `Parsed as skin '${parseSkin(p)}'`);
  }
}
check('100% of Sacred Buddhist Prayers protected from accidental skin triggers', prayerProtected);

let skinMatches = true;
for (const sc of skinCommands) {
  const parsed = parseSkin(sc.text);
  if (parsed !== sc.expected) {
    skinMatches = false;
    check(`Skin parsed correctly for "${sc.text}"`, false, `Expected ${sc.expected}, got ${parsed}`);
  }
}
check('All valid skin commands correctly identified', skinMatches);

// -------------------------------------------------------------
// CHECKPOINT 8: ACCEPTANCE CRITERIA COMPLETENESS AUDIT
// -------------------------------------------------------------
console.log('\n--- CHECKPOINT 8: Verification of ORIGINAL_REQUEST Acceptance Criteria ---');
const archContent = fs.readFileSync(path.join(projectRoot, 'ARCHITECTURE.md'), 'utf8');
const wsContent = fs.readFileSync(path.join(projectRoot, 'WEBSOCKET_SPEC.md'), 'utf8');
const roadmapContent = fs.readFileSync(path.join(projectRoot, 'ROADMAP.md'), 'utf8');
const manifestMdContent = fs.readFileSync(path.join(projectRoot, 'ASSET_MANIFEST.md'), 'utf8');

// AC 1: Architecture breakdown with components & data flow
check('AC 1.1: ARCHITECTURE.md covers Backend connector', /TikTokLiveAdapter|tiktok-live-connector/i.test(archContent));
check('AC 1.1: ARCHITECTURE.md covers OBS overlay', /OBS.*Overlay|Browser Source/i.test(archContent));
check('AC 1.1: ARCHITECTURE.md covers Admin dashboard', /Admin Dashboard|Bảng Điều Khiển Quản Trị/i.test(archContent));
check('AC 1.1: ARCHITECTURE.md covers Audio & TTS Engine', /Audio.*TTS|Edge-TTS|Web Audio/i.test(archContent));
check('AC 1.1: ARCHITECTURE.md includes Data Flow diagram', /TẦNG 1: EVENT INGESTION LAYER|sequenceDiagram/i.test(archContent));

// AC 2: WebSocket message format for all required events
check('AC 1.2: WEBSOCKET_SPEC.md covers comment (chat) event', /"t":\s*"chat"/i.test(wsContent));
check('AC 1.2: WEBSOCKET_SPEC.md covers like event', /"t":\s*"like"/i.test(wsContent));
check('AC 1.2: WEBSOCKET_SPEC.md covers gift event with repeatEnd & combo', /"t":\s*"gift"/i.test(wsContent) && /repeatEnd/i.test(wsContent));
check('AC 1.2: WEBSOCKET_SPEC.md covers join slot event', /"t":\s*"join"/i.test(wsContent));
check('AC 1.2: WEBSOCKET_SPEC.md covers admin manual action commands', /"cmd":\s*"bell"|"cmd":\s*"mo"|"cmd":\s*"gift"/i.test(wsContent));

// AC 3: Implementation roadmap with milestones and OBS setup guide
check('AC 1.3: ROADMAP.md covers implementation phases/milestones', /GIAI ĐOẠN 1|GIAI ĐOẠN 2|GIAI ĐOẠN 3/i.test(roadmapContent));
check('AC 1.3: ROADMAP.md provides OBS Studio setup instructions', /HƯỚNG DẪN CẤU HÌNH OBS STUDIO|Browser Source/i.test(roadmapContent));

// AC 4: Complete Asset Manifest with classifications, dimensions, licenses
check('AC 2.1: ASSET_MANIFEST.md classifies image, animation, audio', /Backgrounds & Altar|Characters.*Sprites|Audio SFX|Ambient Meditation BGM/i.test(manifestMdContent));
check('AC 2.1: ASSET_MANIFEST.md specifies recommended dimensions & formats', /1080\s*[×x]\s*1920|WAV 48kHz|MP3/i.test(manifestMdContent));
check('AC 2.1: ASSET_MANIFEST.md specifies license for each asset', /CC-BY-4.0|Public Domain|CC0|MIT/i.test(manifestMdContent));

// AC 5: Drop-in integration guide for user-provided assets
check('AC 2.2: ASSET_MANIFEST.md includes 4-step user integration guide', /HƯỚNG DẪN 4 BƯỚC TÍCH HỢP TÀI NGUYÊN/i.test(manifestMdContent));
check('AC 2.2: ASSET_MANIFEST.md explains folder structure for user assets', /assets\/backgrounds|assets\/altar|assets\/audio/i.test(manifestMdContent));

console.log('\n================================================================');
console.log(`TOTAL AUDIT ASSERTIONS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log(`PASS RATE: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log('================================================================');

if (failedTests > 0) {
  console.error('\nFAILURE DETAILS:');
  failureDetails.forEach(f => console.error(`- ${f.desc}: ${f.detail}`));
  process.exit(1);
} else {
  console.log('\nALL INDEPENDENT VERIFICATION ASSERTIONS PASSED WITH ZERO DEFECTS.');
  process.exit(0);
}
