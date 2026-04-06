/**
 * ============================================================
 * Config Index — Barrel Exports
 * ============================================================
 *
 * Re-exports all configuration modules for convenient importing.
 *
 * @module config/index
 */

export { config, type FrameworkConfig, type ExecutionEnvironment } from './env.config';

export {
  LIGHTHOUSE_AUDIT_IDS,
  DEFAULT_LIGHTHOUSE_OPTIONS,
  DEFAULT_THRESHOLDS,
  type MetricName,
} from './lighthouse.config';
