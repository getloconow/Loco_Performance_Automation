import * as dotenv from 'dotenv';
import * as path from 'path';

// Ensure .env is loaded before importing config/auth utils
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { config } from './config/env.config';
import { getLocoTokens } from './utils/loco-auth';

/**
 * Playwright Global Setup
 * Runs once before all workers are spawned.
 * 
 * We perform the Loco OTPless login here to get an access token
 * once per suite. This avoids hitting the OTPless 5-requests-per-5-minutes
 * rate limit when running multiple parallel workers.
 */
async function globalSetup() {
  if (config.locoAuth.enabled) {
    console.log('\n  🔐 [Global Setup] Authenticating test user via OTPless SDK...');
    try {
      console.log('  -> Fetching Viewer tokens...');
      const viewerTokens = await getLocoTokens(config.locoAuth.viewer);
      process.env.LOCO_VIEWER_ACCESS_TOKEN = viewerTokens.accessToken;
      process.env.LOCO_VIEWER_REFRESH_TOKEN = viewerTokens.refreshToken;
      console.log('  ✅ [Global Setup] Viewer auth tokens obtained.\n');

      console.log('  -> Fetching Streamer Dashboard tokens...');
      const streamerTokens = await getLocoTokens(config.locoAuth.streamer);
      process.env.LOCO_STREAMER_ACCESS_TOKEN = streamerTokens.accessToken;
      process.env.LOCO_STREAMER_REFRESH_TOKEN = streamerTokens.refreshToken;
      console.log('  ✅ [Global Setup] Streamer auth tokens obtained.\n');
    } catch (error) {
      console.error('  ❌ [Global Setup] Failed to get Loco Auth tokens.', error);
      throw error; // Fail the entire suite if we can't login
    }
  } else {
    console.log('\n  ⚠️  [Global Setup] LOCO_AUTH_ENABLED=false — running tests as guest (no login).\n');
  }
}

export default globalSetup;
