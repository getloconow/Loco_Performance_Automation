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

/**
 * Calculate a reasonable timeout based on iteration count.
 * Each Lighthouse audit takes ~20-30 seconds. We add generous buffer.
 */
const iterationCount = parseInt(process.env.ITERATION_COUNT || '5', 10);
const perTestTimeout = Math.max(
  5 * 60 * 1000,  // Minimum 5 minutes per test
  iterationCount * 45 * 1000 + 60 * 1000  // 45s per iteration + 60s buffer
);

export default defineConfig({
  // ── Test Discovery ─────────────────────────────────────────────
  testDir: './projects',
  testMatch: '**/*.spec.ts',

  // ── Execution ──────────────────────────────────────────────────

  /**
   * CRITICAL: Lighthouse tests MUST run with a single worker.
   * Multiple workers would compete for the same CDP port (9222)
   * and cause audit failures.
   */
  workers: 1,

  /**
   * Fully parallel execution within a file is DISABLED.
   * Tests in a file share a browser connection (via beforeAll),
   * so they must run sequentially.
   */
  fullyParallel: false,

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
