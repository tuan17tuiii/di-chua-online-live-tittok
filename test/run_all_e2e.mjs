#!/usr/bin/env node

/**
 * run_all_e2e.mjs: Unified E2E Test Suite Runner for Chánh Điện Tịnh Tâm
 * Sequentially executes all 4 test tiers (TC-101 to TC-404) and generates
 * a comprehensive coverage summary report.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const TIERS = [
  {
    name: 'Tier 1: Feature Coverage & Core Protocol',
    file: 'test/tier1_feature_coverage.test.mjs',
    testCount: 13,
    range: 'TC-101 to TC-113',
    description: 'Server bootstrap, role segregation, snapshot <50ms, moderation, seating math, eviction, VIP protection, prayer cache, audio fallbacks, admin ctl'
  },
  {
    name: 'Tier 2: Boundary & Corner Cases',
    file: 'test/tier2_boundary.test.mjs',
    testCount: 8,
    range: 'TC-201 to TC-208',
    description: 'Empty hall transitions, capacity boundaries (24/36/64/100), 100% donor saturation deadlock, comment spam limit, combo timeout, BPM clamps, TTS queue cap'
  },
  {
    name: 'Tier 3: Cross-Feature Interactions',
    file: 'test/tier3_cross_feature.test.mjs',
    testCount: 7,
    range: 'TC-301 to TC-307',
    description: 'Admin kick during combo, chant preemption, TTS + bell ducking (-14dB), bot flooding, auto-capacity expansion, sacred NLP preservation, rapid reconnect'
  },
  {
    name: 'Tier 4: Real-World Workload Scenarios',
    file: 'test/tier4_workload.test.mjs',
    testCount: 4,
    range: 'TC-401 to TC-404',
    description: 'Continuous live simulation, 100-gift storm, network backoff recovery, memory leak & GC benchmark (<120MB heap)'
  }
];

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  magenta: '\x1b[35m'
};

function runTestTier(tier) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const filePath = path.join(rootDir, tier.file);

    console.log(`\n${COLORS.cyan}${COLORS.bold}▶ Launching ${tier.name}${COLORS.reset}`);
    console.log(`${COLORS.dim}  File: ${tier.file} (${tier.range})${COLORS.reset}`);
    console.log(`${COLORS.dim}  Scope: ${tier.description}${COLORS.reset}\n`);

    const child = spawn(process.execPath, ['--test', filePath], {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    child.on('close', (code) => {
      const durationMs = Math.round(performance.now() - startTime);
      resolve({
        tier,
        passed: code === 0,
        exitCode: code,
        durationMs
      });
    });

    child.on('error', (err) => {
      const durationMs = Math.round(performance.now() - startTime);
      console.error(`${COLORS.red}Failed to execute ${tier.file}: ${err.message}${COLORS.reset}`);
      resolve({
        tier,
        passed: false,
        exitCode: 1,
        durationMs,
        error: err.message
      });
    });
  });
}

async function main() {
  console.log(`${COLORS.bold}${COLORS.magenta}======================================================================${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}  CHÁNH ĐIỆN TỊNH TÂM — AUTOMATED 4-TIER E2E TEST RUNNER${COLORS.reset}`);
  console.log(`${COLORS.dim}  Node.js ${process.version} | Architecture: R1, R2, R3, R4 Backend / Protocol / State${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.magenta}======================================================================${COLORS.reset}`);

  const overallStart = performance.now();
  const results = [];

  for (const tier of TIERS) {
    const result = await runTestTier(tier);
    results.push(result);
  }

  const overallDuration = ((performance.now() - overallStart) / 1000).toFixed(2);
  const allPassed = results.every((r) => r.passed);
  const totalTests = TIERS.reduce((sum, t) => sum + t.testCount, 0);
  const passedTests = results.reduce((sum, r) => sum + (r.passed ? r.tier.testCount : 0), 0);

  console.log(`\n${COLORS.bold}${COLORS.magenta}======================================================================${COLORS.reset}`);
  console.log(`${COLORS.bold}  E2E TEST EXECUTION SUMMARY REPORT${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.magenta}======================================================================${COLORS.reset}\n`);

  console.log(`| # | Test Tier                          | Cases | Status   | Duration | Range          |`);
  console.log(`|---|------------------------------------|-------|----------|----------|----------------|`);

  results.forEach((r, idx) => {
    const statusText = r.passed
      ? `${COLORS.green}PASS${COLORS.reset}    `
      : `${COLORS.red}FAIL (${r.exitCode})${COLORS.reset}`;
    const durStr = `${(r.durationMs / 1000).toFixed(2)}s`.padEnd(8);
    const tierName = r.tier.name.slice(0, 34).padEnd(34);
    const countStr = String(r.tier.testCount).padStart(3);
    const rangeStr = r.tier.range.padEnd(14);
    console.log(`| ${idx + 1} | ${tierName} |   ${countStr} | ${statusText} | ${durStr} | ${rangeStr} |`);
  });

  console.log(`\n${COLORS.bold}Total Test Cases :${COLORS.reset} ${totalTests}`);
  console.log(`${COLORS.bold}Passed           :${COLORS.reset} ${COLORS.green}${passedTests}${COLORS.reset} / ${totalTests}`);
  console.log(`${COLORS.bold}Failed           :${COLORS.reset} ${allPassed ? `${COLORS.green}0${COLORS.reset}` : `${COLORS.red}${totalTests - passedTests}${COLORS.reset}`}`);
  console.log(`${COLORS.bold}Total Time       :${COLORS.reset} ${overallDuration}s\n`);

  if (allPassed) {
    console.log(`${COLORS.bold}${COLORS.green}✔ ALL 4 TEST TIERS PASSED PERFECTLY (32/32 TEST CASES). READY FOR DEPLOYMENT.${COLORS.reset}\n`);
    process.exit(0);
  } else {
    console.error(`${COLORS.bold}${COLORS.red}✖ ONE OR MORE TEST TIERS FAILED. CHECK LOGS ABOVE.${COLORS.reset}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
