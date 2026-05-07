/**
 * ============================================================
 * Streamer Dashboard — Core Web Vitals Performance Test Suite
 * ============================================================
 *
 * @module projects/streamer-dashboard/tests/streamer-dashboard-vitals.spec
 */

import { test } from '@playwright/test';
import { connectBrowser, disconnectBrowser, BrowserConnection } from '../../../utils/browser-connector';
import { runIteratedAudit, AggregatedVitals } from '../../../utils/lighthouse-helper';
import { writeAllReports } from '../../../utils/csv-reporter';
import { config } from '../../../config/env.config';
import { STREAMER_DASHBOARD_SCENARIOS, STREAMER_DASHBOARD_BASE_URL, printScenarioRegistry } from '../data/streamer-dashboard-scenarios';
import {
  injectAuthLocalStorage,
  injectAuthLocalStorageIntoBrowserDefault,
  injectAuthLocalStorageViaRoutes,
  LocoAuthTokens,
} from '../../../utils/loco-auth';

// ---------------------------------------------------------------------------
// Suite-Level Variables
// ---------------------------------------------------------------------------

let connection: BrowserConnection;
const allResults: AggregatedVitals[] = [];
const ITERATIONS = config.iterationCount;
let authTokens: LocoAuthTokens | null = null;
const LAMBDATEST_SCENARIO_COOLDOWN_MS = 10_000;

// ---------------------------------------------------------------------------
// Reusable Test Runner
// ---------------------------------------------------------------------------

async function runScenarioAudit(
  scenario: typeof STREAMER_DASHBOARD_SCENARIOS[keyof typeof STREAMER_DASHBOARD_SCENARIOS],
  emoji: string
): Promise<void> {
  const isLambdaTest = connection.environment === 'lambdatest';

  if (isLambdaTest && allResults.length > 0) {
    console.log(`\n  ⏳ LambdaTest inter-scenario cooldown (${LAMBDATEST_SCENARIO_COOLDOWN_MS / 1000}s)...`);
    await new Promise((r) => setTimeout(r, LAMBDATEST_SCENARIO_COOLDOWN_MS));
  }

  const context = await connection.browser.newContext({
    viewport: { width: 1512, height: 982 },
    ignoreHTTPSErrors: true,
  });

  if (authTokens) {
    await injectAuthLocalStorage(context, authTokens);

    if (connection.environment === 'lambdatest') {
      await injectAuthLocalStorageViaRoutes(context, authTokens);
    }
  }

  const page = await context.newPage();

  try {
    console.log(`\n  ${emoji} Starting "${scenario.name}" performance audit...`);
    console.log(`     URL: ${scenario.url}`);

    await page.goto(scenario.url, { waitUntil: 'domcontentloaded', timeout: 120000 });

    const lighthouseConfig = authTokens
      ? { disableStorageReset: true }
      : undefined;

    const results = await runIteratedAudit(
      page,
      connection.port,
      scenario.url,
      scenario.name,
      ITERATIONS,
      undefined,
      lighthouseConfig,
      async () => {
        if (authTokens) {
          if (connection.environment === 'local') {
            await injectAuthLocalStorageIntoBrowserDefault(connection.port, authTokens, STREAMER_DASHBOARD_BASE_URL);
          } else if (connection.environment === 'lambdatest') {
            await page.evaluate((data) => {
              window.localStorage.setItem('access_token', data.accessToken);
              window.localStorage.setItem('refresh_token', data.refreshToken);
              window.localStorage.setItem('mode', 'logged-in');
            }, authTokens);
          }
        }
      }
    );

    allResults.push(results);

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
  console.log('  STREAMER DASHBOARD PERFORMANCE TEST SUITE — STARTING');
  console.log('🚀'.repeat(30) + '\n');

  printScenarioRegistry();

  connection = await connectBrowser('Streamer Dashboard Performance Suite');

  console.log(`\n  📋 Configuration:`);
  console.log(`     Environment:  ${connection.environment}`);
  console.log(`     CDP Port:     ${connection.port}`);
  console.log(`     Iterations:   ${ITERATIONS}`);
  console.log(`     Headless:     ${config.headless}`);
  console.log(`     Base URL:     ${STREAMER_DASHBOARD_BASE_URL}`);
  console.log(`     Auth Enabled: ${config.locoAuth.enabled}\n`);

  if (config.locoAuth.enabled) {
    if (process.env.LOCO_STREAMER_ACCESS_TOKEN && process.env.LOCO_STREAMER_REFRESH_TOKEN) {
      authTokens = {
        accessToken: process.env.LOCO_STREAMER_ACCESS_TOKEN,
        refreshToken: process.env.LOCO_STREAMER_REFRESH_TOKEN,
      };
      console.log('  ✅ Loaded auth tokens from global setup.\n');
    } else {
      console.warn('  ⚠️  LOCO_AUTH_ENABLED is true, but no tokens found in process.env! Did global.setup.ts fail?');
    }

    if (authTokens) {
      if (connection.environment === 'local') {
        await injectAuthLocalStorageIntoBrowserDefault(connection.port, authTokens, STREAMER_DASHBOARD_BASE_URL);
      }
    }
  } else {
    console.log('  ⚠️  LOCO_AUTH_ENABLED=false — running as guest (no login).\n');
  }
});

test.afterAll(async () => {
  if (allResults.length > 0) {
    console.log('\n  📝 Writing CSV reports...');
    writeAllReports(allResults, { projectName: 'streamer-dashboard' });
  } else {
    console.warn('\n  ⚠️  No results collected — skipping report generation.');
  }

  if (connection?.browser) {
    await disconnectBrowser(connection.browser);
  }

  console.log('\n' + '✅'.repeat(30));
  console.log('  STREAMER DASHBOARD PERFORMANCE TEST SUITE — COMPLETE');
  console.log('✅'.repeat(30) + '\n');
});

// ═══════════════════════════════════════════════════════════════
// Section: Stream
// ═══════════════════════════════════════════════════════════════

test.describe('Streamer Dashboard — Stream section', () => {
  test('Live Stream — Core Web Vitals', async () => {
    await runScenarioAudit(STREAMER_DASHBOARD_SCENARIOS.LIVE_STREAM, '📡');
  });
});

// ═══════════════════════════════════════════════════════════════
// Section: Ads
// ═══════════════════════════════════════════════════════════════

test.describe('Streamer Dashboard — Ads section', () => {
  test('Ads & Affiliates — Core Web Vitals', async () => {
    await runScenarioAudit(STREAMER_DASHBOARD_SCENARIOS.ADS_AFFILIATES, '💸');
  });

  test('Analytics — Core Web Vitals', async () => {
    await runScenarioAudit(STREAMER_DASHBOARD_SCENARIOS.ANALYTICS, '📊');
  });
});

// ═══════════════════════════════════════════════════════════════
// Section: Moderator
// ═══════════════════════════════════════════════════════════════

test.describe('Streamer Dashboard — Moderator section', () => {
  test('Moderator — Core Web Vitals', async () => {
    await runScenarioAudit(STREAMER_DASHBOARD_SCENARIOS.MODERATOR, '🛡️');
  });

  test('Blocked Words — Core Web Vitals', async () => {
    await runScenarioAudit(STREAMER_DASHBOARD_SCENARIOS.BLOCKED_WORDS, '🤬');
  });

  test('Muted Users — Core Web Vitals', async () => {
    await runScenarioAudit(STREAMER_DASHBOARD_SCENARIOS.MUTED_USERS, '🤐');
  });

  test('Activities — Core Web Vitals', async () => {
    await runScenarioAudit(STREAMER_DASHBOARD_SCENARIOS.ACTIVITIES, '📋');
  });
});

// ═══════════════════════════════════════════════════════════════
// Section: Subscriptions
// ═══════════════════════════════════════════════════════════════

test.describe('Streamer Dashboard — Subscriptions section', () => {
  test('Subscription Tab — Core Web Vitals', async () => {
    await runScenarioAudit(STREAMER_DASHBOARD_SCENARIOS.SUBSCRIPTIONS, '⭐');
  });
});

// ═══════════════════════════════════════════════════════════════
// Section: Leaderboard
// ═══════════════════════════════════════════════════════════════

test.describe('Streamer Dashboard — Leaderboard section', () => {
  test('Leaderboard — Core Web Vitals', async () => {
    await runScenarioAudit(STREAMER_DASHBOARD_SCENARIOS.LEADERBOARD, '🏆');
  });
});
