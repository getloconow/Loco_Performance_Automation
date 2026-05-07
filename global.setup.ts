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
      const authTokens = await getLocoTokens();
      
      // Inject tokens into process.env so all worker processes can inherit them
      process.env.LOCO_ACCESS_TOKEN = authTokens.accessToken;
      process.env.LOCO_REFRESH_TOKEN = authTokens.refreshToken;
      
      console.log('  ✅ [Global Setup] Auth tokens obtained and saved to process.env.\n');
    } catch (error) {
      console.error('  ❌ [Global Setup] Failed to get Loco Auth tokens.', error);
      throw error; // Fail the entire suite if we can't login
    }
  } else {
    console.log('\n  ⚠️  [Global Setup] LOCO_AUTH_ENABLED=false — running tests as guest (no login).\n');
  }
}

export default globalSetup;
