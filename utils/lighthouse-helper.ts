/**
 * ============================================================
 * Lighthouse Performance Helper
 * ============================================================
 *
 * Core utility that wraps Lighthouse audit execution and Core
 * Web Vitals extraction. This module is the heart of the
 * performance measurement pipeline.
 *
 * Responsibilities:
 *   1. Run a Lighthouse audit against a given URL via CDP port
 *   2. Extract targeted Core Web Vitals (FCP, LCP, CLS, INP, TTFB)
 *   3. Run N iterations and compute the mean averages
 *   4. Format results for downstream consumption (CSV, console)
 *
 * @module utils/lighthouse-helper
 */

import { Page } from 'playwright';
import { playAudit } from 'playwright-lighthouse';
import {
  LIGHTHOUSE_AUDIT_IDS,
  MetricName,
  DEFAULT_LIGHTHOUSE_OPTIONS,
  DEFAULT_THRESHOLDS,
} from '../config/lighthouse.config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single iteration's extracted Web Vitals */
export interface WebVitalsResult {
  /** Iteration number (1-indexed) */
  iteration: number;

  /** First Contentful Paint in milliseconds */
  fcp: number | null;

  /** Largest Contentful Paint in milliseconds */
  lcp: number | null;

  /** Cumulative Layout Shift (unitless) */
  cls: number | null;

  /** Interaction to Next Paint in milliseconds */
  inp: number | null;

  /** Time to First Byte (server response time) in milliseconds */
  ttfb: number | null;

  /** Overall Lighthouse Performance score (0-100) */
  performanceScore: number | null;

  /** Timestamp of this iteration */
  timestamp: string;
}

/** Aggregated results across multiple iterations */
export interface AggregatedVitals {
  /** The test scenario name */
  scenario: string;

  /** URL tested */
  url: string;

  /** Total number of iterations completed */
  totalIterations: number;

  /** Individual iteration results */
  iterations: WebVitalsResult[];

  /** Mean averages of each metric */
  averages: {
    fcp: number;
    lcp: number;
    cls: number;
    inp: number;
    ttfb: number;
    performanceScore: number;
  };

  /** P90 values (90th percentile) */
  p90: {
    fcp: number;
    lcp: number;
    cls: number;
    inp: number;
    ttfb: number;
  };
}

/** Options for a Lighthouse run */
export interface LighthouseRunOptions {
  /** The navigated Playwright page */
  page: Page;

  /** CDP port for Lighthouse to connect to */
  port: number;

  /** Optional custom thresholds (defaults to 0 — data collection mode) */
  thresholds?: Record<string, number>;

  /** Optional Lighthouse config overrides */
  lighthouseConfig?: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Retry configuration for LambdaTest native Lighthouse audits.
 * LambdaTest's server-side audit can intermittently fail with
 * "Failed to generate lighthouse report" — these retries handle
 * that transient failure gracefully.
 */
const LAMBDATEST_RETRY_CONFIG = {
  /** Maximum number of retry attempts per audit */
  maxRetries: 3,
  /** Initial backoff delay in ms (doubles on each retry) */
  initialBackoffMs: 10_000,
  /** Cooldown delay in ms between consecutive LambdaTest audits */
  cooldownMs: 5_000,
};

// ---------------------------------------------------------------------------
// Private Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a promise that resolves after `ms` milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safely extracts a numeric metric value from the Lighthouse audit results.
 *
 * @param audits — The `lhr.audits` object from Lighthouse results
 * @param metricKey — The friendly metric name (e.g., 'FCP', 'LCP')
 * @returns The metric value or null if unavailable
 */
function extractMetric(
  audits: Record<string, any>,
  metricKey: MetricName
): number | null {
  const auditId = LIGHTHOUSE_AUDIT_IDS[metricKey];
  const audit = audits[auditId];

  if (!audit || audit.numericValue === undefined || audit.numericValue === null) {
    console.warn(`  ⚠️  Metric "${metricKey}" (${auditId}) not available in this audit.`);
    return null;
  }

  return audit.numericValue;
}

/**
 * Computes the mean of an array of numbers, ignoring nulls.
 */
function mean(values: (number | null)[]): number {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return 0;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}

/**
 * Computes the Pth percentile of a numeric array.
 */
function percentile(values: (number | null)[], p: number): number {
  const valid = values.filter((v): v is number => v !== null).sort((a, b) => a - b);
  if (valid.length === 0) return 0;
  const idx = Math.ceil((p / 100) * valid.length) - 1;
  return valid[Math.max(0, idx)];
}

/**
 * Rounds a number to a fixed number of decimal places.
 */
function round(value: number, decimals: number = 2): number {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Runs a single Lighthouse audit and extracts Core Web Vitals.
 *
 * @param options — Configuration for the Lighthouse run
 * @param iterationNumber — The iteration index (for logging)
 * @returns A `WebVitalsResult` with extracted metric values
 *
 * @example
 * ```ts
 * const result = await runLighthouseAudit({
 *   page,
 *   port: 9222,
 * }, 1);
 * console.log(result.lcp); // e.g., 1234.56
 * ```
 */
export async function runLighthouseAudit(
  options: LighthouseRunOptions,
  iterationNumber: number = 1
): Promise<WebVitalsResult> {
  const { page, port, thresholds, lighthouseConfig } = options;

  const isLambdaTest = process.env.LIGHTHOUSE_LAMBDATEST === 'true';
  console.log(`\n  🔍 Running Lighthouse Audit — Iteration #${iterationNumber}`);
  console.log(`     URL: ${page.url()}`);
  if (isLambdaTest) {
    console.log(`     Mode: LambdaTest Native Audit`);
  } else {
    console.log(`     CDP Port: ${port}`);
  }

  // ── Build the playAudit config once ──
  const auditConfig = {
    page,
    port,
    thresholds: thresholds || DEFAULT_THRESHOLDS,
    opts: {
      formFactor: DEFAULT_LIGHTHOUSE_OPTIONS.formFactor,
      onlyCategories: DEFAULT_LIGHTHOUSE_OPTIONS.onlyCategories,
      screenEmulation: DEFAULT_LIGHTHOUSE_OPTIONS.screenEmulation,
      throttling: DEFAULT_LIGHTHOUSE_OPTIONS.throttling,
      ...lighthouseConfig,
    },
  };

  // ── Execute with retry logic for LambdaTest ──
  const maxAttempts = isLambdaTest ? LAMBDATEST_RETRY_CONFIG.maxRetries + 1 : 1;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        const backoff = LAMBDATEST_RETRY_CONFIG.initialBackoffMs * Math.pow(2, attempt - 2);
        console.log(`  🔄 Retry ${attempt - 1}/${LAMBDATEST_RETRY_CONFIG.maxRetries} — waiting ${backoff / 1000}s before retrying...`);
        await sleep(backoff);

        // Re-navigate to the URL to reset the page state before retry
        await page.goto(page.url(), { waitUntil: 'domcontentloaded', timeout: 120000 });
        await sleep(2000);
      }

      // Run the Lighthouse audit via playwright-lighthouse
      const auditResult = await playAudit(auditConfig);

      // Access the Lighthouse Result (LHR) object
      const lhr = auditResult.lhr;
      const audits = lhr.audits;

      // Extract each Core Web Vital
      const fcp = extractMetric(audits, 'FCP');
      const lcp = extractMetric(audits, 'LCP');
      const cls = extractMetric(audits, 'CLS');
      const inp = extractMetric(audits, 'INP');
      const ttfb = extractMetric(audits, 'TTFB');

      // Extract overall performance score (0-1 → 0-100)
      const perfScore = lhr.categories?.performance?.score;
      const performanceScore = perfScore !== null && perfScore !== undefined
        ? round(perfScore * 100)
        : null;

      // Build result object
      const result: WebVitalsResult = {
        iteration: iterationNumber,
        fcp: fcp !== null ? round(fcp) : null,
        lcp: lcp !== null ? round(lcp) : null,
        cls: cls !== null ? round(cls, 4) : null,
        inp: inp !== null ? round(inp) : null,
        ttfb: ttfb !== null ? round(ttfb) : null,
        performanceScore,
        timestamp: new Date().toISOString(),
      };

      // Pretty-print the extracted vitals
      console.log(`     ┌─────────────────────────────────────────────┐`);
      console.log(`     │  FCP:  ${String(result.fcp ?? 'N/A').padEnd(10)} ms              │`);
      console.log(`     │  LCP:  ${String(result.lcp ?? 'N/A').padEnd(10)} ms              │`);
      console.log(`     │  CLS:  ${String(result.cls ?? 'N/A').padEnd(10)}                 │`);
      console.log(`     │  INP:  ${String(result.inp ?? 'N/A').padEnd(10)} ms              │`);
      console.log(`     │  TTFB: ${String(result.ttfb ?? 'N/A').padEnd(10)} ms              │`);
      console.log(`     │  Score: ${String(result.performanceScore ?? 'N/A').padEnd(9)} / 100          │`);
      console.log(`     └─────────────────────────────────────────────┘`);

      if (attempt > 1) {
        console.log(`  ✅ Audit succeeded on retry ${attempt - 1}`);
      }

      return result;
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        console.warn(`  ⚠️  Lighthouse audit attempt ${attempt}/${maxAttempts} failed (will retry): ${(error as Error).message || error}`);
      }
    }
  }

  // All attempts exhausted
  console.error(`  ❌ Lighthouse audit failed on iteration #${iterationNumber} after ${maxAttempts} attempt(s):`, lastError);

  // Return null-valued result so we don't break the aggregation pipeline
  return {
    iteration: iterationNumber,
    fcp: null,
    lcp: null,
    cls: null,
    inp: null,
    ttfb: null,
    performanceScore: null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Runs multiple Lighthouse audits and aggregates the results.
 *
 * For each iteration, the page is reloaded (or navigated to the URL)
 * before running the audit, simulating independent user sessions.
 *
 * @param page — The Playwright page to audit
 * @param port — CDP port
 * @param url — The URL to test
 * @param scenario — Human-readable scenario name
 * @param iterations — Number of times to run the audit
 * @param thresholds — Optional custom thresholds
 * @returns Aggregated vitals with averages and P90 values
 *
 * @example
 * ```ts
 * const results = await runIteratedAudit(page, 9222, 'https://loco.gg', 'Home Page', 10);
 * console.log(results.averages.lcp); // Mean LCP across 10 runs
 * ```
 */
export async function runIteratedAudit(
  page: Page,
  port: number,
  url: string,
  scenario: string,
  iterations: number = 5,
  thresholds?: Record<string, number>
): Promise<AggregatedVitals> {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  📊 PERFORMANCE AUDIT: "${scenario}"`);
  console.log(`  🌐 URL: ${url}`);
  console.log(`  🔄 Iterations: ${iterations}`);
  console.log(`${'═'.repeat(60)}`);

  const results: WebVitalsResult[] = [];

  const isLambdaTest = process.env.LIGHTHOUSE_LAMBDATEST === 'true';

  for (let i = 1; i <= iterations; i++) {
    // Navigate fresh for each iteration to get independent measurements
    console.log(`\n  ── Iteration ${i} of ${iterations} ${'─'.repeat(35)}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });

    // Small delay to let the page fully settle
    await page.waitForTimeout(2000);

    const result = await runLighthouseAudit(
      { page, port, thresholds },
      i
    );
    results.push(result);

    // Cooldown between iterations on LambdaTest to avoid overwhelming their infra
    if (isLambdaTest && i < iterations) {
      console.log(`  ⏳ LambdaTest cooldown (${LAMBDATEST_RETRY_CONFIG.cooldownMs / 1000}s)...`);
      await sleep(LAMBDATEST_RETRY_CONFIG.cooldownMs);
    }
  }

  // ── Compute Aggregations ──
  const averages = {
    fcp: round(mean(results.map((r) => r.fcp))),
    lcp: round(mean(results.map((r) => r.lcp))),
    cls: round(mean(results.map((r) => r.cls)), 4),
    inp: round(mean(results.map((r) => r.inp))),
    ttfb: round(mean(results.map((r) => r.ttfb))),
    performanceScore: round(mean(results.map((r) => r.performanceScore))),
  };

  const p90 = {
    fcp: round(percentile(results.map((r) => r.fcp), 90)),
    lcp: round(percentile(results.map((r) => r.lcp), 90)),
    cls: round(percentile(results.map((r) => r.cls), 90), 4),
    inp: round(percentile(results.map((r) => r.inp), 90)),
    ttfb: round(percentile(results.map((r) => r.ttfb), 90)),
  };

  const aggregated: AggregatedVitals = {
    scenario,
    url,
    totalIterations: iterations,
    iterations: results,
    averages,
    p90,
  };

  // ── Print Summary ──
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  📈 AGGREGATED RESULTS: "${scenario}"`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Metric            Mean          P90`);
  console.log(`  ──────────────────────────────────────────`);
  console.log(`  FCP (ms)          ${String(averages.fcp).padEnd(14)}${p90.fcp}`);
  console.log(`  LCP (ms)          ${String(averages.lcp).padEnd(14)}${p90.lcp}`);
  console.log(`  CLS               ${String(averages.cls).padEnd(14)}${p90.cls}`);
  console.log(`  INP (ms)          ${String(averages.inp).padEnd(14)}${p90.inp}`);
  console.log(`  TTFB (ms)         ${String(averages.ttfb).padEnd(14)}${p90.ttfb}`);
  console.log(`  Perf Score        ${averages.performanceScore}/100`);
  console.log(`${'═'.repeat(60)}\n`);

  return aggregated;
}
