/**
 * ============================================================
 * Playwright Configuration — Performance Testing Framework
 * ============================================================
 *
 * This configuration is tailored for Lighthouse-based performance
 * testing. Key decisions:
 *
 *   1. SINGLE WORKER — Lighthouse requires exclusive access to the
 *      CDP port. Multiple workers would cause port collisions.
 *
 *   2. NO RETRIES — Performance tests should not be retried
 *      automatically. Flaky results indicate real environment issues.
 *
 *   3. GENEROUS TIMEOUT — Lighthouse audits take 20-30s each.
 *      With multiple iterations, tests need extended timeouts.
 *
 *   4. CHROMIUM ONLY — Lighthouse requires a Chromium-based browser.
 *
 * @module playwright.config
 */

import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables before config is read
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Ensure all workers share the same timestamp for CSV reporting
process.env.RUN_TIMESTAMP = process.env.RUN_TIMESTAMP || new Date().toISOString().replace(/[T:]/g, '-').replace(/\..+$/, '').replace(/-/g, '_');

/**
 * Calculate a reasonable timeout based on iteration count.
 * Each Lighthouse audit takes ~20-30 seconds. We add generous buffer.
 */
const iterationCount = parseInt(process.env.ITERATION_COUNT || '5', 10);
const isLambdaTest = process.env.EXECUTION_ENV === 'lambdatest';

// On LambdaTest, each audit may retry up to 3 times (with 10-40s backoff each)
// plus cooldown periods between iterations/scenarios.
const perIterationMs = isLambdaTest ? 120 * 1000 : 45 * 1000; // 2 min vs 45s
const bufferMs = isLambdaTest ? 120 * 1000 : 60 * 1000;       // extra buffer

const perTestTimeout = Math.max(
  5 * 60 * 1000,  // Minimum 5 minutes per test
  iterationCount * perIterationMs + bufferMs
);

export default defineConfig({
  // ── Test Discovery ─────────────────────────────────────────────
  testDir: './projects',
  testMatch: '**/*.spec.ts',
  globalSetup: require.resolve('./global.setup.ts'),

  // ── Execution ──────────────────────────────────────────────────

  /**
   * CRITICAL: Local Lighthouse tests MUST run with a single worker.
   * Multiple workers would compete for the same CDP port (9222) locally.
   * However, on LambdaTest, each worker gets an isolated cloud container,
   * so we can run them in parallel to drastically reduce test execution time.
   */
  workers: isLambdaTest ? (process.env.WORKERS ? parseInt(process.env.WORKERS) : 4) : 1,

  /**
   * Fully parallel execution is ENABLED on LambdaTest and DISABLED on local.
   * On LambdaTest (with multiple workers), this allows tests within 
   * the same file to be distributed across different workers and run concurrently.
   */
  fullyParallel: isLambdaTest ? true : false,

  // ── Timeouts ───────────────────────────────────────────────────

  /**
   * Per-test timeout calculated from iteration count.
   * Default with 5 iterations: ~285s (4.75 min)
   * With 100 iterations: ~4560s (76 min)
   */
  timeout: perTestTimeout,

  /**
   * Expect timeout for assertions (if any are added later).
   */
  expect: {
    timeout: 10000,
  },

  // ── Retries & Reporting ────────────────────────────────────────

  /**
   * NO RETRIES for performance tests. If a Lighthouse audit fails,
   * it indicates a real issue (port conflict, browser crash, etc.)
   * and should be investigated, not masked by retry.
   */
  retries: 0,

  /**
   * Reporters:
   *   - 'list'  — Console output showing test progress
   *   - 'html'  — Rich HTML report in playwright-report/
   */
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  // ── Global Settings ────────────────────────────────────────────

  /**
   * We do NOT use the Playwright `use` block to launch browsers
   * because Lighthouse requires specific browser launch arguments
   * (--remote-debugging-port). The browser is managed by our
   * custom `browser-connector` utility instead.
   *
   * The `use` block below only provides defaults for any standard
   * Playwright assertions or screenshots that might be added later.
   */
  use: {
    actionTimeout: 15000,
    navigationTimeout: 60000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  // ── Projects ───────────────────────────────────────────────────

  /**
   * Projects in Playwright config are used for running different
   * test suites or configurations. We define one project per
   * application being tested.
   *
   * Since we manage the browser ourselves (browser-connector.ts),
   * these projects only serve as logical groupings.
   */
  projects: [
    {
      name: 'loco-performance',
      testDir: './projects/loco/tests',
      testMatch: '**/*.spec.ts',
    },

    // ── Template for future projects ──
    // {
    //   name: 'another-app-performance',
    //   testDir: './projects/another-app/tests',
    //   testMatch: '**/*.spec.ts',
    // },
  ],
});
