import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const manifestPath = path.join(rootDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Measure frame slice alignment for each character
const charReport = [];

const characters = manifest.assets.characters;

for (const c of characters) {
  const stripRelPath = c.spritesheetPath.replace(/^\//, '');
  const stripAbsPath = path.join(rootDir, stripRelPath);
  const staticRelPath = c.staticPath.replace(/^\//, '');
  const staticAbsPath = path.join(rootDir, staticRelPath);

  // Read PNG header directly
  const stripBuf = fs.readFileSync(stripAbsPath);
  const actualStripW = stripBuf.readUInt32BE(16);
  const actualStripH = stripBuf.readUInt32BE(20);

  const staticBuf = fs.readFileSync(staticAbsPath);
  const actualStaticW = staticBuf.readUInt32BE(16);
  const actualStaticH = staticBuf.readUInt32BE(20);

  const declaredFw = c.frameWidth;
  const declaredFh = c.frameHeight;
  const actualFwFromStrip = actualStripW / 8;

  const frameDrift = [];
  let maxBleedPx = 0;
  let outOfBoundsPx = 0;

  for (let f = 0; f < 8; f++) {
    // Engine slicing according to CharacterRenderer.js / manifest.json:
    const engineSx = f * declaredFw;
    const engineEx = engineSx + declaredFw;

    // Actual frame boundary:
    const actualSx = f * actualFwFromStrip;
    const actualEx = actualSx + actualFwFromStrip;

    const startOffset = engineSx - actualSx;
    const endOffset = engineEx - actualEx;

    if (Math.abs(startOffset) > maxBleedPx) maxBleedPx = Math.abs(startOffset);
    if (engineEx > actualStripW) {
      const oob = engineEx - actualStripW;
      if (oob > outOfBoundsPx) outOfBoundsPx = oob;
    }

    frameDrift.push({
      frame: f,
      engineSlice: `[${engineSx}, ${engineEx}]`,
      actualFrame: `[${actualSx}, ${actualEx}]`,
      driftPx: startOffset
    });
  }

  charReport.push({
    id: c.id,
    name: c.name,
    declared: `${declaredFw}x${declaredFh}`,
    actualStatic: `${actualStaticW}x${actualStaticH}`,
    actualStrip: `${actualStripW}x${actualStripH}`,
    actualFwFromStrip,
    dimensionMatch: declaredFw === actualStaticW && (declaredFw * 8) === actualStripW && declaredFh === actualStripH,
    maxBleedPx,
    outOfBoundsPx,
    frameDrift
  });
}

console.log('CHARACTER SPRITESHEET FRAME DRIFT ANALYSIS:');
for (const r of charReport) {
  console.log(`\nCharacter: ${r.id} (${r.name})`);
  console.log(`  Declared Frame: ${r.declared} | Actual Strip: ${r.actualStrip} | Inferred FW: ${r.actualFwFromStrip}`);
  console.log(`  Dimension Match: ${r.dimensionMatch ? 'PASS' : 'FAIL'}`);
  console.log(`  Max Seam Bleed: ${r.maxBleedPx}px | Max Out-Of-Bounds: ${r.outOfBoundsPx}px`);
  if (!r.dimensionMatch) {
    console.log(`  Frame Drift Table:`);
    r.frameDrift.forEach(fd => {
      console.log(`    F${fd.frame}: Engine=${fd.engineSlice} vs Actual=${fd.actualFrame} (drift=${fd.driftPx > 0 ? '+' : ''}${fd.driftPx}px)`);
    });
  }
}

// Dump for report
fs.writeFileSync(
  path.join(rootDir, '.agents/teamwork/challenger_asset_1/character_drift_analysis.json'),
  JSON.stringify(charReport, null, 2),
  'utf8'
);
