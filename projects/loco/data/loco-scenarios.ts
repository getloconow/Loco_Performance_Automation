/**
 * ============================================================
 * Loco Project — Test Scenarios & URL Registry
 * ============================================================
 *
 * Defines all P0 (Priority 0) performance test scenarios for
 * the Loco streaming platform. Each scenario maps to a specific
 * URL and a human-readable description.
 *
 * To add new scenarios, simply add an entry to the `LOCO_SCENARIOS`
 * object. The test spec will automatically pick them up.
 *
 * @module projects/loco/data/loco-scenarios
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Represents a single test scenario definition */
export interface LocoScenario {
  /** Unique identifier for the scenario */
  id: string;

  /** Human-readable scenario name (used in reports) */
  name: string;

  /** Full URL to test */
  url: string;

  /** Section grouping from the master sheet */
  section: string;

  /** Short description of what this scenario measures */
  description: string;

  /** Priority level: P0 = Critical, P1 = High, P2 = Medium */
  priority: 'P0' | 'P1' | 'P2';

  /** Whether this scenario is currently enabled for testing */
  enabled: boolean;

  /** Optional tags for filtering/grouping */
  tags: string[];
}

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------

/** Loco's production base URL */
export const LOCO_BASE_URL = 'https://preprod.loco.com';

// ---------------------------------------------------------------------------
// P0 Scenario Registry
// ---------------------------------------------------------------------------

/**
 * Master registry of all Loco P0 performance test scenarios.
 *
 * Each scenario targets a specific user flow or page that is
 * critical to the Loco user experience. These are the flows
 * that must be monitored continuously for performance regressions.
 */
export const LOCO_SCENARIOS: Record<string, LocoScenario> = {

  // ── Section: Home ────────────────────────────────────────────
  HOME: {
    id: 'home',
    name: 'Home Page',
    url: `${LOCO_BASE_URL}`,
    section: 'Home',
    description: 'Main landing page — first impression, hero content, featured streams',
    priority: 'P0',
    enabled: true,
    tags: ['home', 'core', 'landing'],
  },

  LIVE_NOW: {
    id: 'live-now',
    name: 'Live Now',
    url: `${LOCO_BASE_URL}/live-streams`,
    section: 'Home',
    description: 'Live streams listing page — all currently active streams',
    priority: 'P0',
    enabled: true,
    tags: ['home', 'live', 'browse'],
  },

  VIDEOS: {
    id: 'videos',
    name: 'Videos',
    url: `${LOCO_BASE_URL}/videos`,
    section: 'Home',
    description: 'Videos listing page — past broadcasts and recorded content',
    priority: 'P0',
    enabled: true,
    tags: ['home', 'vod', 'browse'],
  },

  REWARDS: {
    id: 'rewards',
    name: 'Rewards',
    url: `${LOCO_BASE_URL}/rewards`,
    section: 'Home',
    description: 'Rewards page with user incentives, loyalty points, and progress',
    priority: 'P0',
    enabled: true,
    tags: ['home', 'account', 'rewards'],
  },

  QUESTS: {
    id: 'quests',
    name: 'Quests',
    url: `${LOCO_BASE_URL}/quests`,
    section: 'Home',
    description: 'Quests page with challenges and achievement tracking',
    priority: 'P0',
    enabled: true,
    tags: ['home', 'account', 'quests'],
  },

  EMERGING_STREAMERS: {
    id: 'emerging-streamers',
    name: 'Emerging Streamers',
    url: `${LOCO_BASE_URL}/streamers`,
    section: 'Home',
    description: 'Emerging streamers page',
    priority: 'P0',
    enabled: true,
    tags: ['home', 'streamers'],
  },

  // ── Section: Streamer ────────────────────────────────────────
  STREAMER_PROFILE: {
    id: 'streamer-profile',
    name: 'Streamer Profile',
    url: `${LOCO_BASE_URL}/streamers/raging.tigress121`,
    section: 'Streamer',
    description: 'Streamer profile page with bio, past broadcasts, clips',
    priority: 'P0',
    enabled: true,
    tags: ['streamer', 'profile'],
  },

  CHANNEL_PREVIEW: {
    id: 'channel-preview',
    name: 'Channel Preview',
    url: `${LOCO_BASE_URL}/streamers/Ferocious.Demon318`,
    section: 'Streamer',
    description: 'Channel preview page — streamer card with stream info',
    priority: 'P0',
    enabled: true,
    tags: ['streamer', 'preview'],
  },

  LEADERBOARD: {
    id: 'leaderboard',
    name: 'Leaderboard',
    url: `${LOCO_BASE_URL}/streamers/raging.tigress121/leaderboard`,
    section: 'Streamer',
    description: 'Leaderboard page',
    priority: 'P0',
    enabled: true,
    tags: ['streamer', 'leaderboard'],
  },

  BATTLES: {
    id: 'battles',
    name: 'Battles',
    url: `${LOCO_BASE_URL}/streamers/Khiladi_Vishal/loco-battles`,
    section: 'Streamer',
    description: 'Battles page',
    priority: 'P0',
    enabled: true,
    tags: ['streamer', 'battles'],
  },

  // ── Section: Player ──────────────────────────────────────────
  LIVESTREAM_PLAYER: {
    id: 'livestream-player',
    name: 'Livestream Player',
    url: `${LOCO_BASE_URL}/streamers/raging.tigress121`,
    section: 'Player',
    description: 'Live stream player page with video, chat, and stream info',
    priority: 'P0',
    enabled: true,
    tags: ['player', 'live'],
  },

  VOD_PLAYER: {
    id: 'vod-player',
    name: 'VOD Player',
    url: `${LOCO_BASE_URL}/stream/0e46ea82-6159-4798-9a01-763548bc1ee1`,
    section: 'Player',
    description: 'Video-on-demand player with recorded stream playback',
    priority: 'P0',
    enabled: true,
    tags: ['player', 'vod'],
  },

  LIVESTREAM_LEADERBOARD: {
    id: 'livestream-leaderboard',
    name: 'Livestream Leaderboard',
    url: `${LOCO_BASE_URL}/streamers/raging.tigress121?tab=leaderboard`,
    section: 'Player',
    description: 'Live stream player page with leaderboard tab',
    priority: 'P0',
    enabled: true,
    tags: ['player', 'live', 'leaderboard'],
  },

  LIVESTREAM_QUESTS: {
    id: 'livestream-quests',
    name: 'Livestream Quests',
    url: `${LOCO_BASE_URL}/streamers/raging.tigress121?tab=quests`,
    section: 'Player',
    description: 'Live stream player page with quests tab',
    priority: 'P0',
    enabled: true,
    tags: ['player', 'live', 'quests'],
  },

  LIVESTREAM_BATTLES: {
    id: 'livestream-battles',
    name: 'Livestream Battles',
    url: `${LOCO_BASE_URL}/streamers/Khiladi_Vishal?tab=loco-battles`,
    section: 'Player',
    description: 'Live stream player page with battles tab',
    priority: 'P0',
    enabled: true,
    tags: ['player', 'live', 'battles'],
  },

  LIVESTREAM_DROPS: {
    id: 'livestream-drops',
    name: 'Livestream Drops',
    url: `${LOCO_BASE_URL}/streamers/raging.tigress121?tab=loco_drops`,
    section: 'Player',
    description: 'Live stream player page with loco drops tab',
    priority: 'P0',
    enabled: true,
    tags: ['player', 'live', 'drops'],
  },

  // ── Section: Categories ──────────────────────────────────────
  CATEGORIES: {
    id: 'categories',
    name: 'Categories Section',
    url: `${LOCO_BASE_URL}/categories`,
    section: 'Categories',
    description: 'Browse page listing all game/content categories from home feed',
    priority: 'P0',
    enabled: true,
    tags: ['categories', 'browse'],
  },

  PH_SLOTS_CASINO: {
    id: 'ph-slots-casino',
    name: 'Philippines - Slots & Casino',
    url: `${LOCO_BASE_URL}/categories/slots-and-casino`,
    section: 'Categories',
    description: 'Philippines regional page for Slots & Casino category',
    priority: 'P0',
    enabled: true,
    tags: ['categories', 'regional', 'philippines'],
  },

  BR_FREE_FIRE: {
    id: 'br-free-fire',
    name: 'Brazil - Free Fire, GTA & Just Chattin',
    url: `${LOCO_BASE_URL}/categories/free-fire`,
    section: 'Categories',
    description: 'Brazil regional page for Free Fire, GTA, and Just Chattin categories',
    priority: 'P0',
    enabled: true,
    tags: ['categories', 'regional', 'brazil'],
  },

  SEARCH_FETCH: {
    id: 'search-fetch',
    name: 'First Search Fetch Time',
    url: `${LOCO_BASE_URL}/search?query=free%20fire`,
    section: 'Categories',
    description: 'Time to fetch and render initial search results for "free fire"',
    priority: 'P0',
    enabled: true,
    tags: ['categories', 'search', 'interactive'],
  },

  // ── Section: User Profile ──────────────────────────────────────────

  MY_PROFILE: {
    id: 'my-profile',
    name: 'My Profile',
    url: `${LOCO_BASE_URL}/user/profile`,
    section: 'User Profile',
    description: 'User profile edit page with form fields and avatar upload',
    priority: 'P0',
    enabled: true,
    tags: ['user-profile', 'profile'],
  },

  FOLLOWING: {
    id: 'following',
    name: 'Following',
    url: `${LOCO_BASE_URL}/user/following`,
    section: 'User Profile',
    description: 'Following page',
    priority: 'P0',
    enabled: true,
    tags: ['user-profile', 'following'],
  },

  SUBSCRIPTIONS: {
    id: 'subscriptions',
    name: 'Subscriptions',
    url: `${LOCO_BASE_URL}/user/subscriptions`,
    section: 'User Profile',
    description: 'Subscriptions page',
    priority: 'P0',
    enabled: true,
    tags: ['user-profile', 'subscriptions'],
  },

};

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Returns all enabled scenarios, optionally filtered by tag.
 *
 * @param tag — Optional tag to filter by (e.g., 'core', 'player')
 * @returns Array of enabled LocoScenario objects
 */
export function getEnabledScenarios(tag?: string): LocoScenario[] {
  const scenarios = Object.values(LOCO_SCENARIOS).filter((s) => s.enabled);
  if (tag) {
    return scenarios.filter((s) => s.tags.includes(tag));
  }
  return scenarios;
}

/**
 * Returns a specific scenario by its ID.
 *
 * @param id — Scenario ID (e.g., 'home', 'livestream-player')
 * @returns The matching LocoScenario or undefined
 */
export function getScenarioById(id: string): LocoScenario | undefined {
  return Object.values(LOCO_SCENARIOS).find((s) => s.id === id);
}

/**
 * Prints a summary table of all registered scenarios to the console.
 */
export function printScenarioRegistry(): void {
  console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│                    LOCO — P0 Performance Test Scenarios                     │');
  console.log('├──────────────────────────────────────┬──────────────┬──────────┬────────────┤');
  console.log('│ Name                                 │ Section      │ Priority │ Status     │');
  console.log('├──────────────────────────────────────┼──────────────┼──────────┼────────────┤');

  for (const s of Object.values(LOCO_SCENARIOS)) {
    const status = s.enabled ? '✅ On' : '⏸️  Off';
    console.log(
      `│ ${s.name.padEnd(36)} │ ${s.section.padEnd(12)} │ ${s.priority.padEnd(8)} │ ${status.padEnd(10)} │`
    );
  }

  console.log('└──────────────────────────────────────┴──────────────┴──────────┴────────────┘\n');
}
