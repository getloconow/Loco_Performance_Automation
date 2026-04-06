/**
 * ============================================================
 * Utility Index — Barrel Exports
 * ============================================================
 *
 * Re-exports all utility modules for convenient importing:
 *   import { connectBrowser, runIteratedAudit, writeAllReports } from '../utils';
 *
 * @module utils/index
 */

export {
  connectBrowser,
  disconnectBrowser,
  type BrowserConnection,
} from './browser-connector';

export {
  runLighthouseAudit,
  runIteratedAudit,
  type WebVitalsResult,
  type AggregatedVitals,
  type LighthouseRunOptions,
} from './lighthouse-helper';

export {
  writeDetailedCsv,
  writeSummaryCsv,
  writeAllReports,
  type CsvReporterConfig,
} from './csv-reporter';
