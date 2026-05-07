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
import {
  getLocoTokens,
  injectAuthCookies,
  injectAuthCookiesIntoBrowserDefault,
  injectAuthCookiesViaStorageCDP,
  injectAuthCookiesViaRoutes,
  LocoAuthTokens,
} from '../../../utils/loco-auth';

// ---------------------------------------------------------------------------
// Suite-Level Variables
// ---------------------------------------------------------------------------

/** Holds the browser connection for the entire test suite */
let connection: BrowserConnection;

/** Collects all scenario results for the final CSV report */
const allResults: AggregatedVitals[] = [];

/** Number of Lighthouse iterations per scenario */
const ITERATIONS = config.iterationCount;

/**
 * Loco session tokens obtained once in beforeAll and reused across
 * every test context. Null when LOCO_AUTH_ENABLED=false.
 */
let authTokens: LocoAuthTokens | null = null;

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
/** Cooldown between scenarios on LambdaTest (ms) */
const LAMBDATEST_SCENARIO_COOLDOWN_MS = 10_000;

async function runScenarioAudit(
  scenario: typeof LOCO_SCENARIOS[keyof typeof LOCO_SCENARIOS],
  emoji: string
): Promise<void> {
  const isLambdaTest = connection.environment === 'lambdatest';

  // Cooldown before starting a new scenario on LambdaTest to avoid
  // overwhelming their server-side Lighthouse audit infrastructure
  if (isLambdaTest && allResults.length > 0) {
    console.log(`\n  ⏳ LambdaTest inter-scenario cooldown (${LAMBDATEST_SCENARIO_COOLDOWN_MS / 1000}s)...`);
    await new Promise((r) => setTimeout(r, LAMBDATEST_SCENARIO_COOLDOWN_MS));
  }

  const context = await connection.browser.newContext({
    viewport: { width: 1512, height: 982 },
    ignoreHTTPSErrors: true,
  });

  // Inject auth cookies BEFORE any navigation so the app sees the
  // logged-in session on the very first page load.
  if (authTokens) {
    await injectAuthCookies(context, authTokens);

    if (connection.environment === 'lambdatest') {
      // Layer 2: intercept loco.com document requests and inject Set-Cookie
      // in the response. This runs at the Playwright runtime level so it
      // survives any clearDataForOrigin call that LambdaTest's Lighthouse
      // makes before navigating. context.route() covers ALL pages in this
      // context including any new tabs Lighthouse opens here.
      await injectAuthCookiesViaRoutes(context, authTokens);
    }
  }

  const page = await context.newPage();

  try {
    console.log(`\n  ${emoji} Starting "${scenario.name}" performance audit...`);
    console.log(`     URL: ${scenario.url}`);

    // Warm-up navigation
    await page.goto(scenario.url, { waitUntil: 'domcontentloaded', timeout: 120000 });

    // Build Lighthouse-level auth config:
    //   1. extraHeaders  — attaches a Cookie HTTP header to every Lighthouse
    //                      network request (server-side auth + LambdaTest fallback)
    //   2. disableStorageReset — prevents Lighthouse from clearing the auth
    //                      cookies we planted in Chrome's default context before
    //                      it navigates. Without this flag, Lighthouse wipes all
    //                      storage as its very first audit step.
    const lighthouseConfig = authTokens
      ? {
        disableStorageReset: true,
        extraHeaders: {
          Cookie: [
            `access_token=${authTokens.accessToken}`,
            `refresh_token=${authTokens.refreshToken}`,
            `mode=logged-in`,
          ].join('; '),
        },
      }
      : undefined;

    // Run iterated Lighthouse audits
    const results = await runIteratedAudit(
      page,
      connection.port,
      scenario.url,
      scenario.name,
      ITERATIONS,
      undefined,       // thresholds — use defaults
      lighthouseConfig // auth cookie headers for Lighthouse's internal navigation
    );

    // Store results for CSV export
    allResults.push(results);

    // Log key findings
    console.log(`  ${emoji} "${scenario.name}" audit complete!`);
    console.log(`     Avg LCP: ${results.averages.lcp}ms`);
    console.log(`     Avg FCP: ${results.averages.fcp}ms`);
    console.log(`     Avg CLS: ${results.averages.cls}`);
    console.log(`     Avg Page Load Time: ${results.averages.pageLoadTime}ms`);
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
  console.log(`     Base URL:     ${LOCO_BASE_URL}`);
  console.log(`     Auth Enabled: ${config.locoAuth.enabled}\n`);

  // ── Authenticate the test user via OTPless ────────────────────────────────
  // Tokens are obtained once and reused across all scenario contexts.
  // Cookie injection happens per-context inside runScenarioAudit().
  if (config.locoAuth.enabled) {
    console.log('  🔐 Authenticating test user via OTPless SDK...');
    authTokens = await getLocoTokens();
    console.log('  ✅ Auth tokens obtained — cookies will be injected per context.\n');

    // ── Inject into Chrome's DEFAULT context (for Lighthouse) ────────────────
    // Lighthouse opens its audit tab in Chrome's DEFAULT browser context, which
    // is separate from the Playwright isolated context.
    //
    // LOCAL:       connectOverCDP exposes contexts()[0] → addCookies() there
    // LAMBDATEST:  browser.newBrowserCDPSession() + Storage.setCookies (no
    //              browserContextId) targets the same default context on the
    //              remote LambdaTest Chrome instance.
    //
    // Both must be paired with disableStorageReset:true in Lighthouse options.
    if (connection.environment === 'local') {
      await injectAuthCookiesIntoBrowserDefault(connection.port, authTokens);
    } else if (connection.environment === 'lambdatest') {
      await injectAuthCookiesViaStorageCDP(connection.browser, authTokens);
    }
  } else {
    console.log('  ⚠️  LOCO_AUTH_ENABLED=false — running as guest (no login).\n');
  }
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

  test('Emerging Streamers — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.EMERGING_STREAMERS, '✨');
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

  test('Leaderboard — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.LEADERBOARD, '🏅');
  });

  test('Battles — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.BATTLES, '⚔️');
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

  test('Livestream Leaderboard — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.LIVESTREAM_LEADERBOARD, '🏅');
  });

  test('Livestream Quests — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.LIVESTREAM_QUESTS, '🏆');
  });

  test('Livestream Drops — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.LIVESTREAM_DROPS, '🎁');
  });

  test('Livestream Battles — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.LIVESTREAM_BATTLES, '⚔️');
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

});

// ═══════════════════════════════════════════════════════════════
// Section: User Profile
// ═══════════════════════════════════════════════════════════════

test.describe('Loco — User Profile', () => {

  test('My Profile — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.MY_PROFILE, '👤');
  });

  test('Following — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.FOLLOWING, '👥');
  });

  test('Subscriptions — Core Web Vitals', async () => {
    await runScenarioAudit(LOCO_SCENARIOS.SUBSCRIPTIONS, '🔔');
  });

});
