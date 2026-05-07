/**
 * ============================================================
 * Lighthouse Audit Configuration
 * ============================================================
 *
 * Defines the default Lighthouse flags, categories, and thresholds
 * used across all performance audits. Individual projects can
 * override these by passing custom config to the Lighthouse helper.
 *
 * @module config/lighthouse.config
 */

// ---------------------------------------------------------------------------
// Audit Identifiers for Core Web Vitals
// ---------------------------------------------------------------------------

/**
 * Maps friendly metric names to their Lighthouse audit identifiers.
 * These identifiers are used to extract `numericValue` from the
 * Lighthouse Result (LHR) `audits` object.
 */
export const LIGHTHOUSE_AUDIT_IDS = {
  /** First Contentful Paint (ms) */
  FCP: 'first-contentful-paint',

  /** Largest Contentful Paint (ms) */
  LCP: 'largest-contentful-paint',

  /** Cumulative Layout Shift (unitless score) */
  CLS: 'cumulative-layout-shift',

  /** Time to First Byte / Server Response Time (ms) */
  TTFB: 'server-response-time',

  /** Total Blocking Time (ms) — useful supplementary metric */
  TBT: 'total-blocking-time',

  /** Speed Index (ms) */
  SI: 'speed-index',
} as const;

/** Metric names as a union type */
export type MetricName = keyof typeof LIGHTHOUSE_AUDIT_IDS;

// ---------------------------------------------------------------------------
// Default Lighthouse Options
// ---------------------------------------------------------------------------

/**
 * Default options passed to `playAudit` or raw Lighthouse API.
 * Targets only the Performance category for speed.
 */
export const DEFAULT_LIGHTHOUSE_OPTIONS = {
  /** Only run performance audits to keep runs fast */
  onlyCategories: ['performance'],

  /** Lighthouse form factor */
  formFactor: 'desktop' as const,

  /** Desktop-class throttling (reduces noise in local runs) */
  throttling: {
    rttMs: 40,
    throughputKbps: 10 * 1024, // 10 Mbps
    cpuSlowdownMultiplier: 1,
    requestLatencyMs: 0,
    downloadThroughputKbps: 0,
    uploadThroughputKbps: 0,
  },

  /** Screen emulation for desktop viewport */
  screenEmulation: {
    mobile: false,
    width: 1350,
    height: 940,
    deviceScaleFactor: 1,
    disabled: false,
  },
};

/**
 * Default thresholds for `playAudit`. Tests will fail if scores
 * fall below these values. Set to 0 to disable threshold checks
 * (useful during baseline data collection).
 */
export const DEFAULT_THRESHOLDS = {
  performance: 0,  // Disabled — we only collect data, not gate on score
};
