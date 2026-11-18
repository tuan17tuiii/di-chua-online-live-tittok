// test_capacity_resizing.cjs
// Test slotIndex mapping across capacity changes (24 -> 36 -> 64 -> 100)

function getRowCol(slotIndex, cols) {
  const r = Math.floor(slotIndex / cols);
  const k = slotIndex % cols;
  return { r, k };
}

console.log("=== CAPACITY EXPANSION: SLOT INDEX JUMPING TEST ===");
const testSlots = [0, 5, 6, 12, 23];

console.log("Grid definitions: Cap 24 (4x6), Cap 36 (6x6), Cap 64 (8x8), Cap 100 (10x10)");
testSlots.forEach(slot => {
  const g24 = getRowCol(slot, 6);
  const g36 = getRowCol(slot, 6);
  const g64 = getRowCol(slot, 8);
  const g100 = getRowCol(slot, 10);

  console.log(`Slot ${slot}:`);
  console.log(`  At Cap 24 (cols=6): row=${g24.r}, col=${g24.k}`);
  console.log(`  At Cap 36 (cols=6): row=${g36.r}, col=${g36.k}`);
  console.log(`  At Cap 64 (cols=8): row=${g64.r}, col=${g64.k} <--- JUMP!`);
  console.log(`  At Cap 100 (cols=10): row=${g100.r}, col=${g100.k} <--- JUMP!`);
});
