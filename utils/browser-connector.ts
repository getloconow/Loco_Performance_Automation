/**
 * ============================================================
 * Browser Connection Utility
 * ============================================================
 *
 * Provides a unified API to acquire a Playwright Browser instance
 * that works seamlessly across two execution environments:
 *
 *   1. **Local**  — Launches Chromium with `--remote-debugging-port`
 *                    so Lighthouse can connect via CDP.
 *   2. **LambdaTest** — Constructs the LambdaTest WSS endpoint and
 *                        connects via `chromium.connect()`.
 *
 * Usage:
 *   import { connectBrowser, disconnectBrowser } from '../utils/browser-connector';
 *   const { browser, port } = await connectBrowser();
 *   // ... run tests ...
 *   await disconnectBrowser(browser);
 *
 * @module utils/browser-connector
 */

import { chromium, Browser } from 'playwright';
import { config } from '../config/env.config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of a browser connection attempt */
export interface BrowserConnection {
  /** The connected Playwright Browser instance */
  browser: Browser;
  /** The CDP port (meaningful only for local runs; -1 for LambdaTest) */
  port: number;
  /** Which environment we connected to */
  environment: 'local' | 'lambdatest';
}

// ---------------------------------------------------------------------------
// LambdaTest Helpers
// ---------------------------------------------------------------------------

/**
 * Constructs the LambdaTest WebSocket endpoint URL.
 *
 * Format:
 *   wss://cdp.lambdatest.com/playwright?capabilities=<encoded-JSON>
 *
 * @param testName — Human-readable test name for LambdaTest dashboard
 * @returns The fully formed WSS URL
 * @throws Error if LT_USERNAME or LT_ACCESS_KEY is missing
 */
function buildLambdaTestEndpoint(testName: string = 'Perf Test'): string {
  const { username, accessKey, browserVersion, platform, buildName, tunnel } =
    config.lambdatest;

  // Validate credentials
  if (!username || !accessKey) {
    throw new Error(
      '[BrowserConnector] LambdaTest credentials missing! ' +
        'Set LT_USERNAME and LT_ACCESS_KEY in your .env file.'
    );
  }

  // Build capabilities object per LambdaTest docs
  const capabilities = {
    browserName: 'Chrome',
    browserVersion,
    'LT:Options': {
      platform,
      build: buildName,
      name: testName,
      user: username,
      accessKey,
      tunnel,
      network: true,
      console: true,
      video: true,
    },
  };

  const encodedCaps = encodeURIComponent(JSON.stringify(capabilities));
  const endpoint = `wss://cdp.lambdatest.com/playwright?capabilities=${encodedCaps}`;

  console.log(`[BrowserConnector] LambdaTest endpoint constructed for "${testName}"`);
  return endpoint;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Connects to a browser based on the current `EXECUTION_ENV`.
 *
 * - **local**: Launches Chromium with a debugging port for Lighthouse.
 * - **lambdatest**: Connects to LambdaTest cloud via WebSocket.
 *
 * @param testName — Optional test name used for LambdaTest session labeling
 * @returns A `BrowserConnection` containing the browser, port, and env info
 */
export async function connectBrowser(
  testName: string = 'Performance Test'
): Promise<BrowserConnection> {
  const env = config.executionEnv;
  console.log(`\n[BrowserConnector] Environment: ${env.toUpperCase()}`);

  // ── Local Execution ──────────────────────────────────────────────
  if (env === 'local') {
    const port = config.chromeDebugPort;
    console.log(`[BrowserConnector] Launching Chromium on debug port ${port}`);

    const browser = await chromium.launch({
      headless: config.headless,
      args: [
        `--remote-debugging-port=${port}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--mute-audio',
        '--safebrowsing-disable-auto-update',
      ],
    });

    console.log(`[BrowserConnector] ✅ Local browser launched (port: ${port})`);
    return { browser, port, environment: 'local' };
  }

  // ── LambdaTest Execution ─────────────────────────────────────────
  if (env === 'lambdatest') {
    const endpoint = buildLambdaTestEndpoint(testName);
    console.log('[BrowserConnector] Connecting to LambdaTest cloud...');

    const browser = await chromium.connect(endpoint);

    console.log('[BrowserConnector] ✅ Connected to LambdaTest');
    return { browser, port: -1, environment: 'lambdatest' };
  }

  // ── Unknown Environment ──────────────────────────────────────────
  throw new Error(
    `[BrowserConnector] Unknown EXECUTION_ENV: "${env}". ` +
      'Supported values: "local", "lambdatest".'
  );
}

/**
 * Gracefully disconnects/closes the browser.
 *
 * @param browser — The Playwright Browser instance to close
 */
export async function disconnectBrowser(browser: Browser): Promise<void> {
  try {
    await browser.close();
    console.log('[BrowserConnector] 🔌 Browser disconnected.\n');
  } catch (err) {
    console.warn('[BrowserConnector] Warning: Error closing browser:', err);
  }
}
