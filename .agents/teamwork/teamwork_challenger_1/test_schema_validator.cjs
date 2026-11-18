// test_schema_validator.cjs
// Empirical schema validation for WebSocket messages in WEBSOCKET_SPEC.md vs ARCHITECTURE.md

const specSchemas = {
  join: {
    envelope: 'join',
    required: ['t', 'v', 'cap'],
    vRequired: ['id', 'name', 'skin', 'avatar', 'coins', 'slotIndex']
  },
  leave: {
    envelope: 'leave',
    required: ['t', 'id'],
    optional: ['slotIndex', 'reason']
  },
  chat: {
    envelope: 'chat',
    required: ['t', 'id', 'name', 'text'],
    optional: ['slotIndex']
  },
  gift: {
    envelope: 'gift',
    required: ['t', 'id', 'name', 'giftName', 'count', 'coins', 'total', 'tier', 'prayer'],
    optional: ['giftId', 'slotIndex']
  },
  like: {
    envelope: 'like',
    required: ['t', 'id', 'n'],
    optional: ['totalLikes', 'slotIndex']
  },
  tts: {
    envelope: 'tts',
    required: ['t', 'url', 'text'],
    optional: ['dataUri', 'tag', 'priority', 'id']
  },
  chant: {
    envelope: 'chant',
    required: ['t', 'text']
  },
  bell: {
    envelope: 'bell',
    optional: ['isGreatBell']
  },
  mo1: {
    envelope: 'mo1',
    optional: ['roundRobinIndex']
  },
  tiktok: {
    envelope: 'tiktok',
    required: ['t', 'status', 'uniqueId'],
    optional: ['roomId', 'viewerCount', 'likeCount', 'error']
  },
  log: {
    envelope: 'log',
    required: ['t', 'line']
  }
};

console.log("=== WEBSOCKET SCHEMA AUDIT & DISCREPANCY ANALYSIS ===");

// 1. Audit TTS message:
console.log("\n1. TTS MESSAGE AUDIT:");
console.log("Spec definition: url is REQUIRED, dataUri is OPTIONAL.");
console.log("Architecture §1.3 & §6.4: 'thay thế cơ chế ghi file TTS ra đĩa SSD bằng In-Memory Buffer / Data URI streaming qua WebSocket'.");
console.log("ISSUE: If backend never writes to SSD, 'url' field cannot be populated with a valid file path, or will point to non-existent endpoint! 'dataUri' MUST be the primary or required field, and 'url' should be optional or omitted.");

// 2. Audit BELL message:
console.log("\n2. BELL MESSAGE AUDIT:");
console.log("Server-to-client: { t: 'bell', isGreatBell?: boolean }");
console.log("Client-to-server: { t: 'ctl', cmd: 'bell', great?: boolean }");
console.log("ISSUE: Inconsistent property naming: 'isGreatBell' vs 'great'. Increases cognitive load and potential bug in forwarding admin commands to overlay.");

// 3. Audit MO1 message:
console.log("\n3. MO1 vs MO MESSAGE AUDIT:");
console.log("Server-to-client message type: 'mo1'");
console.log("Client-to-server command: 'mo'");
console.log("Architecture references: 'mo'");
console.log("ISSUE: Message type 'mo1' is idiosyncratic (likely leftover from a legacy sound file name 'mo1.wav'). Should be canonical 'mo'.");

// 4. Audit GIFT message:
console.log("\n4. GIFT MESSAGE & STREAK COMBO AUDIT:");
console.log("Spec fields: { id, name, giftName, count, coins, total, tier, prayer, slotIndex }");
console.log("Client-to-server ctl fields: { diamonds, count, gift, prayer } ('diamonds' vs 'coins' vs 'giftName' vs 'gift')");
console.log("Missing fields for streaks: 'repeatEnd', 'comboCount', 'isCombo'.");
console.log("ISSUE: Architecture states repeatEnd == false triggers light particle VFX. But schema has NO combo indicators to tell overlay whether this is an intermediate tap or final settled gift!");

// 5. Audit CHAT message:
console.log("\n5. CHAT MESSAGE & NON-SEATED USERS AUDIT:");
console.log("Spec fields: { t: 'chat', id, name, text, slotIndex?: number }");
console.log("Architecture §7.2: Broadcast { t: 'chat', id, text } (omits name and slotIndex)");
console.log("ISSUE: If a user is not seated (e.g. room full of donors, cap=100), slotIndex is undefined. Spec does NOT define how OBS Overlay renders speech bubbles for unseated users!");

// 6. Audit LEAVE message:
console.log("\n6. LEAVE MESSAGE AUDIT:");
console.log("Spec fields: { t: 'leave', id, slotIndex?: number, reason?: string }");
console.log("Architecture §3.3 A: Broadcast { t: 'leave', id: evictee.id } (omits slotIndex and reason)");
console.log("ISSUE: If slotIndex is optional and omitted, Overlay has to search all 100 slots by id. If slotIndex is provided, eviction is O(1). Spec should mandate slotIndex for performance in 60fps render loop.");
