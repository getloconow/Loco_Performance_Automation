/**
 * ============================================================
 * CSV Report Writer
 * ============================================================
 *
 * Writes performance test results to structured CSV files for
 * historical comparison, dashboarding, and CI/CD artifact storage.
 *
 * Two CSV files are generated per test run:
 *   1. **Detailed** — One row per iteration with all metrics
 *   2. **Summary**  — One row per scenario with averaged metrics
 *
 * Output directory: `reports/<project>/<timestamp>/`
 *
 * @module utils/csv-reporter
 */

import * as fs from 'fs';
import * as path from 'path';
import { AggregatedVitals, WebVitalsResult } from './lighthouse-helper';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Configuration for the CSV reporter */
export interface CsvReporterConfig {
  /** Project name (e.g., 'loco') — used for directory structure */
  projectName: string;

  /** Optional custom output directory (defaults to `reports/`) */
  outputDir?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generates a timestamp-based directory name: YYYY-MM-DD_HH-mm-ss
 */
function getTimestampDir(): string {
  const now = new Date();
  return now.toISOString().replace(/[T:]/g, '-').replace(/\..+$/, '').replace(/-/g, '_');
}

/**
 * Ensures a directory exists; creates it recursively if not.
 */
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Escapes a CSV field value (handles commas, quotes, newlines).
 */
function escapeCsv(value: string | number | null): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Writes detailed iteration-level results to a CSV file.
 *
 * Columns: Scenario, Iteration, FCP, LCP, CLS, INP, TTFB, Performance Score, Timestamp
 *
 * @param results — Array of aggregated vitals from test runs
 * @param config — Reporter configuration
 * @returns The absolute path to the written CSV file
 */
export function writeDetailedCsv(
  results: AggregatedVitals[],
  config: CsvReporterConfig
): string {
  const baseDir = config.outputDir || path.resolve(__dirname, '..', 'reports');
  const runDir = path.join(baseDir, config.projectName, getTimestampDir());
  ensureDir(runDir);

  const filePath = path.join(runDir, 'detailed_results.csv');

  // CSV Header
  const header = [
    'Scenario',
    'URL',
    'Iteration',
    'FCP (ms)',
    'LCP (ms)',
    'CLS',
    'INP (ms)',
    'TTFB (ms)',
    'Performance Score',
    'Timestamp',
  ].join(',');

  // CSV Rows
  const rows: string[] = [header];

  for (const agg of results) {
    for (const iter of agg.iterations) {
      rows.push(
        [
          escapeCsv(agg.scenario),
          escapeCsv(agg.url),
          escapeCsv(iter.iteration),
          escapeCsv(iter.fcp),
          escapeCsv(iter.lcp),
          escapeCsv(iter.cls),
          escapeCsv(iter.inp),
          escapeCsv(iter.ttfb),
          escapeCsv(iter.performanceScore),
          escapeCsv(iter.timestamp),
        ].join(',')
      );
    }
  }

  fs.writeFileSync(filePath, rows.join('\n'), 'utf-8');
  console.log(`\n  📄 Detailed CSV written: ${filePath}`);
  return filePath;
}

/**
 * Writes an aggregated summary CSV file with mean and P90 values.
 *
 * Columns: Scenario, URL, Iterations, Avg FCP, Avg LCP, Avg CLS, Avg INP,
 *          Avg TTFB, Avg Score, P90 FCP, P90 LCP, P90 CLS, P90 INP, P90 TTFB,
 *          Run Date
 *
 * @param results — Array of aggregated vitals from test runs
 * @param config — Reporter configuration
 * @returns The absolute path to the written CSV file
 */
export function writeSummaryCsv(
  results: AggregatedVitals[],
  config: CsvReporterConfig
): string {
  const baseDir = config.outputDir || path.resolve(__dirname, '..', 'reports');
  const runDir = path.join(baseDir, config.projectName, getTimestampDir());
  ensureDir(runDir);

  const filePath = path.join(runDir, 'summary_results.csv');

  const header = [
    'Scenario',
    'URL',
    'Iterations',
    'Avg FCP (ms)',
    'Avg LCP (ms)',
    'Avg CLS',
    'Avg INP (ms)',
    'Avg TTFB (ms)',
    'Avg Perf Score',
    'P90 FCP (ms)',
    'P90 LCP (ms)',
    'P90 CLS',
    'P90 INP (ms)',
    'P90 TTFB (ms)',
    'Run Date',
  ].join(',');

  const rows: string[] = [header];

  for (const agg of results) {
    rows.push(
      [
        escapeCsv(agg.scenario),
        escapeCsv(agg.url),
        escapeCsv(agg.totalIterations),
        escapeCsv(agg.averages.fcp),
        escapeCsv(agg.averages.lcp),
        escapeCsv(agg.averages.cls),
        escapeCsv(agg.averages.inp),
        escapeCsv(agg.averages.ttfb),
        escapeCsv(agg.averages.performanceScore),
        escapeCsv(agg.p90.fcp),
        escapeCsv(agg.p90.lcp),
        escapeCsv(agg.p90.cls),
        escapeCsv(agg.p90.inp),
        escapeCsv(agg.p90.ttfb),
        escapeCsv(new Date().toISOString()),
      ].join(',')
    );
  }

  fs.writeFileSync(filePath, rows.join('\n'), 'utf-8');
  console.log(`  📊 Summary CSV written: ${filePath}`);
  return filePath;
}

/**
 * Convenience function that writes both detailed and summary CSVs.
 *
 * @param results — Array of aggregated vitals
 * @param config — Reporter configuration
 * @returns Object containing paths to both CSV files
 */
export function writeAllReports(
  results: AggregatedVitals[],
  config: CsvReporterConfig
): { detailedPath: string; summaryPath: string } {
  const detailedPath = writeDetailedCsv(results, config);
  const summaryPath = writeSummaryCsv(results, config);

  console.log(`\n  ✅ All reports written for project "${config.projectName}"\n`);

  return { detailedPath, summaryPath };
}
