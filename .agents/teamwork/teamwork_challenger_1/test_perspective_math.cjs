// test_perspective_math.cjs
// Empirical verification of 2.5D perspective projection math from ARCHITECTURE.md §4.1

function testProjection(rows, cols) {
  const yTop = 1215;
  const yBot = 1845;
  const halfTop = 290;
  const halfBot = 430;
  const centerX = 540;

  console.log(`\n=== Testing Grid: rows=${rows}, cols=${cols} (Total slots = ${rows * cols}) ===`);

  const slots = [];
  for (let r = 0; r < rows; r++) {
    const t = rows === 1 ? 0.5 : r / (rows - 1);
    const y = yTop + (yBot - yTop) * t;
    const halfWidth = halfTop + (halfBot - halfTop) * t;
    const scale = (0.26 + 0.24 * t) * Math.pow(6 / cols, 0.75);

    for (let k = 0; k < cols; k++) {
      const denom = (cols - 1) / 2;
      let u0 = denom === 0 ? 0 : (k - denom) / denom;
      let sign = Math.sign(u0);
      let u = sign * (0.14 + 0.86 * Math.abs(u0));
      let x = centerX + u * halfWidth;

      slots.push({ r, k, t, y, halfWidth, scale, u0, u, x });
    }
  }

  // Check boundaries
  const minX = Math.min(...slots.map(s => s.x));
  const maxX = Math.max(...slots.map(s => s.x));
  const minY = Math.min(...slots.map(s => s.y));
  const maxY = Math.max(...slots.map(s => s.y));
  const minScale = Math.min(...slots.map(s => s.scale));
  const maxScale = Math.max(...slots.map(s => s.scale));

  console.log(`X range: [${minX.toFixed(2)}, ${maxX.toFixed(2)}] (Floor width bounds: [${centerX - halfBot}, ${centerX + halfBot}] = [110, 970])`);
  console.log(`Y range: [${minY.toFixed(2)}, ${maxY.toFixed(2)}] (Floor Y bounds: [${yTop}, ${yBot}])`);
  console.log(`Scale range: [${minScale.toFixed(4)}, ${maxScale.toFixed(4)}]`);

  // Check center aisle opening (distance between leftmost positive u and rightmost negative u)
  for (let r = 0; r < rows; r++) {
    const rowSlots = slots.filter(s => s.r === r);
    const leftSide = rowSlots.filter(s => s.x < centerX);
    const rightSide = rowSlots.filter(s => s.x > centerX);
    const centerSlots = rowSlots.filter(s => s.x === centerX);

    const rightmostLeft = leftSide.length > 0 ? Math.max(...leftSide.map(s => s.x)) : null;
    const leftmostRight = rightSide.length > 0 ? Math.min(...rightSide.map(s => s.x)) : null;
    const aisleGap = (leftmostRight !== null && rightmostLeft !== null) ? leftmostRight - rightmostLeft : 0;
    const floorWidthAtR = 2 * (halfTop + (halfBot - halfTop) * (rows === 1 ? 0.5 : r / (rows - 1)));
    const gapPercentage = (aisleGap / floorWidthAtR) * 100;

    if (r === 0 || r === rows - 1 || centerSlots.length > 0) {
      console.log(`Row ${r}: floorWidth=${floorWidthAtR.toFixed(1)}, aisleGap=${aisleGap.toFixed(1)} (${gapPercentage.toFixed(1)}%), centerSlots=${centerSlots.length}`);
    }
  }

  // Check horizontal spacing between adjacent avatars in the same row
  for (let r = 0; r < rows; r++) {
    const rowSlots = slots.filter(s => s.r === r);
    const halfW = rowSlots[0].halfWidth;
    const sc = rowSlots[0].scale;
    // Assuming standard avatar sprite base width = 120px * scale or cushion = 100px * scale
    const avatarWidth = 120 * sc;

    let minSpacing = Infinity;
    for (let k = 0; k < cols - 1; k++) {
      const dist = rowSlots[k + 1].x - rowSlots[k].x;
      if (dist < minSpacing) minSpacing = dist;
    }
    if (r === 0 || r === rows - 1) {
      console.log(`Row ${r}: avatarEstimatedWidth=${avatarWidth.toFixed(1)}px, minSpacing=${minSpacing.toFixed(1)}px, Overlap? ${minSpacing < avatarWidth ? 'YES (OVERLAP)' : 'NO'}`);
    }
  }

  return slots;
}

// Test common capacities: 24 (4x6), 36 (6x6), 64 (8x8), 100 (10x10)
// Also test odd cols (e.g. 5x5 = 25, 7x7 = 49)
console.log("=== CAPACITY 24: 4 rows x 6 cols ===");
testProjection(4, 6);

console.log("\n=== CAPACITY 36: 6 rows x 6 cols ===");
testProjection(6, 6);

console.log("\n=== CAPACITY 64: 8 rows x 8 cols ===");
testProjection(8, 8);

console.log("\n=== CAPACITY 100: 10 rows x 10 cols ===");
testProjection(10, 10);

console.log("\n=== ODD COLS TEST: 5 rows x 5 cols ===");
testProjection(5, 5);

console.log("\n=== SINGLE ROW TEST: 1 row x 6 cols ===");
testProjection(1, 6);

console.log("\n=== SINGLE COL TEST: 4 rows x 1 col ===");
testProjection(4, 1);
