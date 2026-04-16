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

/** Credentials and config for a single OTPless-authenticated app role */
export interface LocoAuthRoleConfig {
  /** OTPless App ID for this role */
  appId: string;
  /** Test phone number (digits only, without country code) */
  phone: string;
  /** Static OTP configured for the test account */
  otp: string;
  /** International dialling code, e.g. "+55" */
  countryCode: string;
}

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

  /** Loco OTPless authentication configuration */
  locoAuth: {
    /**
     * When true, getLocoTokens() is called in beforeAll and auth cookies
     * are injected into every browser context before audits begin.
     * Set LOCO_AUTH_ENABLED=false to skip login and run as a guest.
     */
    enabled: boolean;
    /** Shared Loco sign-in client ID (x-client-id header) */
    clientId: string;
    /** Shared Loco sign-in client secret (x-client-secret header) */
    clientSecret: string;
    /** Credentials for the viewer app (used by the loco viewer project) */
    viewer: LocoAuthRoleConfig;
    /** Credentials for the streamer dashboard app (used by the loco streamer project) */
    streamer: LocoAuthRoleConfig;
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
    locoAuth: {
      // Default to enabled; set LOCO_AUTH_ENABLED=false to run as guest
      enabled: process.env.LOCO_AUTH_ENABLED !== 'false',
      clientId: process.env.LOCO_AUTH_CLIENT_ID || '',
      clientSecret: process.env.LOCO_AUTH_CLIENT_SECRET || '',
      viewer: {
        appId: process.env.LOCO_VIEWER_APP_ID || '',
        phone: process.env.LOCO_VIEWER_PHONE || '',
        otp: process.env.LOCO_VIEWER_OTP || '',
        countryCode: process.env.LOCO_VIEWER_COUNTRY_CODE || '+55',
      },
      streamer: {
        appId: process.env.LOCO_STREAMER_APP_ID || '',
        phone: process.env.LOCO_STREAMER_PHONE || '',
        otp: process.env.LOCO_STREAMER_OTP || '',
        countryCode: process.env.LOCO_STREAMER_COUNTRY_CODE || '+55',
      },
    },
  };
}

/** Singleton framework configuration */
export const config: FrameworkConfig = buildConfig();
