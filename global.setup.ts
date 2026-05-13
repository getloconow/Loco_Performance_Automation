import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Ensure .env is loaded before importing config/auth utils
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { config } from './config/env.config';
import { getLocoTokens } from './utils/loco-auth';

const CACHE_FILE = path.resolve(__dirname, '.loco-auth-cache.json');
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface AuthCache {
  viewer?: {
    tokens: { accessToken: string; refreshToken: string };
    expiresAt: number;
  };
  streamer?: {
    tokens: { accessToken: string; refreshToken: string };
    expiresAt: number;
  };
}

function readCache(): AuthCache {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function writeCache(cache: AuthCache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

/**
 * Playwright Global Setup
 * Runs once before all workers are spawned.
 * 
 * We perform the Loco OTPless login here to get an access token
 * once per suite. This avoids hitting the OTPless 5-requests-per-5-minutes
 * rate limit when running multiple parallel workers.
 */
async function globalSetup() {
  if (!config.locoAuth.enabled) {
    console.log('\n  ⚠️  [Global Setup] LOCO_AUTH_ENABLED=false — running tests as guest (no login).\n');
    return;
  }

  // Parse argv to see which project or test files are running
  const argvString = process.argv.join(' ');
  const hasProjectFlag = process.argv.includes('--project');
  
  let runViewer = false;
  let runStreamer = false;

  if (hasProjectFlag) {
    if (argvString.includes('loco-performance')) runViewer = true;
    if (argvString.includes('streamer-dashboard-performance')) runStreamer = true;
  } else {
    const hasViewerFile = argvString.includes('loco/tests') || argvString.includes('loco-vitals');
    const hasStreamerFile = argvString.includes('streamer-dashboard/tests') || argvString.includes('streamer-dashboard-vitals');
    
    if (hasViewerFile) runViewer = true;
    if (hasStreamerFile) runStreamer = true;
    
    // If no specific project or file is passed, assume both might run
    if (!hasViewerFile && !hasStreamerFile) {
      runViewer = true;
      runStreamer = true;
    }
  }

  console.log('\n  🔐 [Global Setup] Checking test user authentication...');
  const cache = readCache();
  const now = Date.now();

  try {
    if (runViewer) {
      if (cache.viewer && cache.viewer.expiresAt > now) {
        console.log('  ✅ [Global Setup] Reusing valid cached Viewer tokens.');
        process.env.LOCO_VIEWER_ACCESS_TOKEN = cache.viewer.tokens.accessToken;
        process.env.LOCO_VIEWER_REFRESH_TOKEN = cache.viewer.tokens.refreshToken;
      } else {
        console.log('  -> Fetching Viewer tokens via OTPless SDK...');
        const viewerTokens = await getLocoTokens(config.locoAuth.viewer);
        process.env.LOCO_VIEWER_ACCESS_TOKEN = viewerTokens.accessToken;
        process.env.LOCO_VIEWER_REFRESH_TOKEN = viewerTokens.refreshToken;
        
        cache.viewer = {
          tokens: viewerTokens,
          expiresAt: now + CACHE_TTL_MS
        };
        writeCache(cache);
        console.log('  ✅ [Global Setup] Viewer auth tokens obtained & cached.\n');
      }
    }

    if (runStreamer) {
      if (cache.streamer && cache.streamer.expiresAt > now) {
        console.log('  ✅ [Global Setup] Reusing valid cached Streamer Dashboard tokens.');
        process.env.LOCO_STREAMER_ACCESS_TOKEN = cache.streamer.tokens.accessToken;
        process.env.LOCO_STREAMER_REFRESH_TOKEN = cache.streamer.tokens.refreshToken;
      } else {
        console.log('  -> Fetching Streamer Dashboard tokens via OTPless SDK...');
        const streamerTokens = await getLocoTokens(config.locoAuth.streamer);
        process.env.LOCO_STREAMER_ACCESS_TOKEN = streamerTokens.accessToken;
        process.env.LOCO_STREAMER_REFRESH_TOKEN = streamerTokens.refreshToken;
        
        cache.streamer = {
          tokens: streamerTokens,
          expiresAt: now + CACHE_TTL_MS
        };
        writeCache(cache);
        console.log('  ✅ [Global Setup] Streamer auth tokens obtained & cached.\n');
      }
    }
  } catch (error) {
    console.error('  ❌ [Global Setup] Failed to get Loco Auth tokens.', error);
    throw error; // Fail the entire suite if we can't login
  }
}

export default globalSetup;
