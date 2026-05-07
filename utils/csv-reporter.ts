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
 * Uses the shared RUN_TIMESTAMP from process.env if available so that 
 * parallel workers write to the exact same folder.
 */
function getTimestampDir(): string {
  if (process.env.RUN_TIMESTAMP) return process.env.RUN_TIMESTAMP;
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
 * Columns: Scenario, Iteration, FCP, LCP, CLS, TTFB, Page Load Time, Performance Score, Timestamp
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

  // Check if file exists to determine if we need a header
  const fileExists = fs.existsSync(filePath);

  // CSV Header
  const header = [
    'Scenario',
    'URL',
    'Iteration',
    'FCP (ms)',
    'LCP (ms)',
    'CLS',
    'TTFB (ms)',
    'Page Load Time (ms)',
    'Performance Score',
    'Timestamp',
  ].join(',');

  // CSV Rows
  const rows: string[] = fileExists ? [] : [header];

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
          escapeCsv(iter.ttfb),
          escapeCsv(iter.pageLoadTime),
          escapeCsv(iter.performanceScore),
          escapeCsv(iter.timestamp),
        ].join(',')
      );
    }
  }

  // If there are no rows to write (or just an empty header array), do nothing
  if (rows.length > 0) {
    fs.appendFileSync(filePath, rows.join('\n') + '\n', 'utf-8');
  }
  console.log(`\n  📄 Detailed CSV written/appended: ${filePath}`);
  return filePath;
}

/**
 * Writes an aggregated summary CSV file with mean and P90 values.
 *
 * Columns: Scenario, URL, Iterations, Avg FCP, Avg LCP, Avg CLS,
 *          Avg TTFB, Avg PLT, Avg Score, P90 FCP, P90 LCP, P90 CLS,
 *          P90 TTFB, P90 PLT, Run Date
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

  const fileExists = fs.existsSync(filePath);

  const header = [
    'Scenario',
    'URL',
    'Iterations',
    'Avg FCP (ms)',
    'Avg LCP (ms)',
    'Avg CLS',
    'Avg TTFB (ms)',
    'Avg Page Load Time (ms)',
    'Avg Perf Score',
    'P90 FCP (ms)',
    'P90 LCP (ms)',
    'P90 CLS',
    'P90 TTFB (ms)',
    'P90 Page Load Time (ms)',
    'Run Date',
  ].join(',');

  const rows: string[] = fileExists ? [] : [header];

  for (const agg of results) {
    rows.push(
      [
        escapeCsv(agg.scenario),
        escapeCsv(agg.url),
        escapeCsv(agg.totalIterations),
        escapeCsv(agg.averages.fcp),
        escapeCsv(agg.averages.lcp),
        escapeCsv(agg.averages.cls),
        escapeCsv(agg.averages.ttfb),
        escapeCsv(agg.averages.pageLoadTime),
        escapeCsv(agg.averages.performanceScore),
        escapeCsv(agg.p90.fcp),
        escapeCsv(agg.p90.lcp),
        escapeCsv(agg.p90.cls),
        escapeCsv(agg.p90.ttfb),
        escapeCsv(agg.p90.pageLoadTime),
        escapeCsv(new Date().toISOString()),
      ].join(',')
    );
  }

  if (rows.length > 0) {
    fs.appendFileSync(filePath, rows.join('\n') + '\n', 'utf-8');
  }
  console.log(`  📊 Summary CSV written/appended: ${filePath}`);
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
