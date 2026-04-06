/**
 * ============================================================
 * Loco — Core Web Vitals Performance Test Suite
 * ============================================================
 *
 * Primary performance test specification for the Loco streaming
 * platform. Covers all 14 P0 screens from the finalized
 * Performance Testing Screens list.
 *
 * ─────────────────────────────────────────────────────────────
 * HOW TO RUN:
 *   All scenarios:    npm run test:loco:all
 *   Home section:     npx playwright test --grep "Home Page|Live Now|Videos|Rewards|Quests"
 *   Streamer section: npx playwright test --grep "Streamer Profile|Channel Preview"
 *   Player section:   npx playwright test --grep "Livestream Player|VOD Player"
 *   Single scenario:  npx playwright test --grep "Home Page"
 *
 * CONFIGURATION:
 *   Iterations:       Set ITERATION_COUNT in .env (default: 5)
 *   Environment:      Set EXECUTION_ENV in .env (local | lambdatest)
 * ─────────────────────────────────────────────────────────────
 *
 * @module projects/loco/tests/loco-vitals.spec
 */

import { test } from '@playwright/test';
import { connectBrowser, disconnectBrowser, BrowserConnection } from '../../../utils/browser-connector';
import { runIteratedAudit, AggregatedVitals } from '../../../utils/lighthouse-helper';
import { writeAllReports } from '../../../utils/csv-reporter';
import { config } from '../../../config/env.config';
import { LOCO_SCENARIOS, LOCO_BASE_URL, printScenarioRegistry } from '../data/loco-scenarios';

// ---------------------------------------------------------------------------
// Suite-Level Variables
// ---------------------------------------------------------------------------

/** Holds the browser connection for the entire test suite */
let connection: BrowserConnection;

/** Collects all scenario results for the final CSV report */
const allResults: AggregatedVitals[] = [];

/** Number of Lighthouse iterations per scenario */
const ITERATIONS = config.iterationCount;

// ---------------------------------------------------------------------------
// Reusable Test Runner
// ---------------------------------------------------------------------------

/**
 * Creates a fresh browser context, runs iterated Lighthouse audits
 * for the given scenario, stores results, and cleans up.
 *
 * Every test in this suite uses this function to avoid code duplication.
 *
 * @param scenario — The scenario object from LOCO_SCENARIOS
 * @param emoji — Emoji for console logging
 */
async function runScenarioAudit(
  scenario: typeof LOCO_SCENARIOS[keyof typeof LOCO_SCENARIOS],
  emoji: string
): Promise<void> {
  const context = await connection.browser.newContext({
    viewport: { width: 1512, height: 982 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  try {
    console.log(`\n  ${emoji} Starting "${scenario.name}" performance audit...`);
    console.log(`     URL: ${scenario.url}`);

    // Warm-up navigation
    await page.goto(scenario.url, { waitUntil: 'domcontentloaded', timeout: 120000 });

    // Run iterated Lighthouse audits
    const results = await runIteratedAudit(
      page,
      connection.port,
      scenario.url,
      scenario.name,
      ITERATIONS
    );

    // Store results for CSV export
    allResults.push(results);

    // Log key findings
    console.log(`  ${emoji} "${scenario.name}" audit complete!`);
    console.log(`     Avg LCP: ${results.averages.lcp}ms`);
    console.log(`     Avg FCP: ${results.averages.fcp}ms`);
    console.log(`     Avg CLS: ${results.averages.cls}`);
    console.log(`     Avg Performance Score: ${results.averages.performanceScore}/100`);
  } finally {
    await context.close();
  }
}

// ---------------------------------------------------------------------------
// Suite Setup & Teardown
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
  console.log('\n' + '🚀'.repeat(30));
  console.log('  LOCO PERFORMANCE TEST SUITE — STARTING');
  console.log('🚀'.repeat(30) + '\n');

  // Display all registered scenarios
  printScenarioRegistry();

  // Connect to browser based on EXECUTION_ENV
  connection = await connectBrowser('Loco Performance Suite');

  console.log(`\n  📋 Configuration:`);
  console.log(`     Environment:  ${connection.environment}`);
  console.log(`     CDP Port:     ${connection.port}`);
  console.log(`     Iterations:   ${ITERATIONS}`);
  console.log(`     Headless:     ${config.headless}`);
  console.log(`     Base URL:     ${LOCO_BASE_URL}\n`);
});

/**
 * AFTER ALL TESTS:
 *   - Write all collected results to CSV reports
 *   - Disconnect the browser
 */
test.afterAll(async () => {
  // ── Write Reports ──
  if (allResults.length > 0) {
    console.log('\n  📝 Writing CSV reports...');
    writeAllReports(allResults, { projectName: 'loco' });
  } else {
    console.warn('\n  ⚠️  No results collected — skipping report generation.');
  }

  // ── Disconnect Browser ──
  if (connection?.browser) {
    await disconnectBrowser(connection.browser);
  }

  console.log('\n' + '✅'.repeat(30));
  console.log('  LOCO PERFORMANCE TEST SUITE — COMPLETE');
  console.log('✅'.repeat(30) + '\n');
});

// ═══════════════════════════════════════════════════════════════
// Section: Home
// ═══════════════════════════════════════════════════════════════

test.describe('Loco — Home Section', () => {

  test('Home Page — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.HOME, '🏠');
  });

  test('Live Now — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.LIVE_NOW, '🔴');
  });

  test('Videos — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.VIDEOS, '🎬');
  });

  test('Rewards — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.REWARDS, '🎁');
  });

  test('Quests — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.QUESTS, '⚔️');
  });

});

// ═══════════════════════════════════════════════════════════════
// Section: Streamer
// ═══════════════════════════════════════════════════════════════

test.describe('Loco — Streamer Section', () => {

  test('Streamer Profile — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.STREAMER_PROFILE, '👤');
  });

  test('Channel Preview — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.CHANNEL_PREVIEW, '📺');
  });

});

// ═══════════════════════════════════════════════════════════════
// Section: Player
// ═══════════════════════════════════════════════════════════════

test.describe('Loco — Player Section', () => {

  test('Livestream Player — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.LIVESTREAM_PLAYER, '📡');
  });

  test('VOD Player — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.VOD_PLAYER, '▶️');
  });

});

// ═══════════════════════════════════════════════════════════════
// Section: Categories & Discovery
// ═══════════════════════════════════════════════════════════════

test.describe('Loco — Categories & Discovery', () => {

  test('Categories Section — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.CATEGORIES, '📂');
  });

  test('Philippines - Slots & Casino — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.PH_SLOTS_CASINO, '🎰');
  });

  test('Brazil - Free Fire, GTA & Just Chattin — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.BR_FREE_FIRE, '🔥');
  });

  test('First Search Fetch Time — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.SEARCH_FETCH, '🔍');
  });

  test('Update Profile — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.UPDATE_PROFILE, '✏️');
  });

});
