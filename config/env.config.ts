/**
 * ============================================================
 * Environment Configuration Loader
 * ============================================================
 *
 * Centralizes all environment variables into a single, typed
 * configuration object. Uses `dotenv` to load from the project
 * root `.env` file. Every module in the framework should import
 * configuration from here — never read `process.env` directly.
 *
 * @module config/env.config
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

/** Supported execution environments */
export type ExecutionEnvironment = 'local' | 'lambdatest';

/** Fully typed framework configuration */
export interface FrameworkConfig {
  /** Execution target: local browser or LambdaTest cloud */
  executionEnv: ExecutionEnvironment;

  /** Chrome remote debugging port for local Lighthouse runs */
  chromeDebugPort: number;

  /** Whether to run in headless mode locally */
  headless: boolean;

  /** Number of iterations per test scenario for averaging vitals */
  iterationCount: number;

  /** LambdaTest credentials and capability overrides */
  lambdatest: {
    username: string;
    accessKey: string;
    browserVersion: string;
    platform: string;
    buildName: string;
    tunnel: boolean;
  };
}

// ---------------------------------------------------------------------------
// Configuration Builder
// ---------------------------------------------------------------------------

/**
 * Reads environment variables and returns a strongly-typed
 * FrameworkConfig object with sensible defaults.
 */
function buildConfig(): FrameworkConfig {
  return {
    executionEnv: (process.env.EXECUTION_ENV as ExecutionEnvironment) || 'local',
    chromeDebugPort: parseInt(process.env.CHROME_DEBUG_PORT || '9222', 10),
    headless: process.env.HEADLESS === 'true',
    iterationCount: parseInt(process.env.ITERATION_COUNT || '5', 10),
    lambdatest: {
      username: process.env.LT_USERNAME || '',
      accessKey: process.env.LT_ACCESS_KEY || '',
      browserVersion: process.env.LT_BROWSER_VERSION || 'latest',
      platform: process.env.LT_PLATFORM || 'Windows 11',
      buildName: process.env.LT_BUILD_NAME || 'Performance Suite',
      tunnel: process.env.LT_TUNNEL === 'true',
    },
  };
}

/** Singleton framework configuration */
export const config: FrameworkConfig = buildConfig();
