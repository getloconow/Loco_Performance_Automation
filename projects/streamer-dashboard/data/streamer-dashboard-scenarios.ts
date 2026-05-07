/**
 * ============================================================
 * Streamer Dashboard Project — Test Scenarios & URL Registry
 * ============================================================
 *
 * Defines all P0 (Priority 0) performance test scenarios for
 * the Streamer Dashboard platform.
 *
 * @module projects/streamer-dashboard/data/streamer-dashboard-scenarios
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StreamerDashboardScenario {
  id: string;
  name: string;
  url: string;
  section: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2';
  enabled: boolean;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------

export const STREAMER_DASHBOARD_BASE_URL = 'https://dashboard.loco.com';

// ---------------------------------------------------------------------------
// P0 Scenario Registry
// ---------------------------------------------------------------------------

export const STREAMER_DASHBOARD_SCENARIOS: Record<string, StreamerDashboardScenario> = {

  // ── Section: Stream ──────────────────────────────────────────
  LIVE_STREAM: {
    id: 'live-stream',
    name: 'Live Stream',
    url: `${STREAMER_DASHBOARD_BASE_URL}/dashboard/stream`,
    section: 'Stream',
    description: 'Live stream dashboard page',
    priority: 'P0',
    enabled: true,
    tags: ['stream', 'live'],
  },

  // ── Section: Ads ─────────────────────────────────────────────
  ADS_AFFILIATES: {
    id: 'ads-affiliates',
    name: 'Ads & Affiliates',
    url: `${STREAMER_DASHBOARD_BASE_URL}/dashboard/monetisation`,
    section: 'Ads',
    description: 'Ads & affiliates monetization page',
    priority: 'P0',
    enabled: true,
    tags: ['ads', 'monetization'],
  },

  ANALYTICS: {
    id: 'analytics',
    name: 'Analytics',
    url: `${STREAMER_DASHBOARD_BASE_URL}/dashboard/ads-affiliate/analytics`,
    section: 'Ads',
    description: 'Ads & affiliates analytics page',
    priority: 'P0',
    enabled: true,
    tags: ['ads', 'analytics'],
  },

  // ── Section: Moderator ───────────────────────────────────────
  MODERATOR: {
    id: 'moderator',
    name: 'Moderator',
    url: `${STREAMER_DASHBOARD_BASE_URL}/dashboard/moderators`,
    section: 'Moderator',
    description: 'Moderator management page',
    priority: 'P0',
    enabled: true,
    tags: ['moderator'],
  },

  BLOCKED_WORDS: {
    id: 'blocked-words',
    name: 'Blocked Words',
    url: `${STREAMER_DASHBOARD_BASE_URL}/dashboard/moderators/blocked-words`,
    section: 'Moderator',
    description: 'Blocked words management page',
    priority: 'P0',
    enabled: true,
    tags: ['moderator', 'settings'],
  },

  MUTED_USERS: {
    id: 'muted-users',
    name: 'Muted Users',
    url: `${STREAMER_DASHBOARD_BASE_URL}/dashboard/moderators/blocked-users`,
    section: 'Moderator',
    description: 'Muted users management page',
    priority: 'P0',
    enabled: true,
    tags: ['moderator', 'users'],
  },

  ACTIVITIES: {
    id: 'activities',
    name: 'Activities',
    url: `${STREAMER_DASHBOARD_BASE_URL}/dashboard/moderators/activities`,
    section: 'Moderator',
    description: 'Moderator activities log page',
    priority: 'P0',
    enabled: true,
    tags: ['moderator', 'logs'],
  },

  // ── Section: Subscriptions ───────────────────────────────────
  SUBSCRIPTIONS: {
    id: 'subscriptions',
    name: 'Subscription Tab',
    url: `${STREAMER_DASHBOARD_BASE_URL}/dashboard/subscriptions`,
    section: 'Subscriptions',
    description: 'Streamer subscriptions page',
    priority: 'P0',
    enabled: true,
    tags: ['subscriptions'],
  },

  // ── Section: Leaderboard ─────────────────────────────────────
  LEADERBOARD: {
    id: 'leaderboard',
    name: 'Leaderboard',
    url: `${STREAMER_DASHBOARD_BASE_URL}/dashboard/leaderboard`,
    section: 'Leaderboard',
    description: 'Streamer dashboard leaderboard page',
    priority: 'P0',
    enabled: true,
    tags: ['leaderboard'],
  },
};

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

export function getEnabledScenarios(tag?: string): StreamerDashboardScenario[] {
  const scenarios = Object.values(STREAMER_DASHBOARD_SCENARIOS).filter((s) => s.enabled);
  if (tag) {
    return scenarios.filter((s) => s.tags.includes(tag));
  }
  return scenarios;
}

export function getScenarioById(id: string): StreamerDashboardScenario | undefined {
  return Object.values(STREAMER_DASHBOARD_SCENARIOS).find((s) => s.id === id);
}

export function printScenarioRegistry(): void {
  console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│          STREAMER DASHBOARD — P0 Performance Test Scenarios                  │');
  console.log('├──────────────────────────────────────┬──────────────┬──────────┬────────────┤');
  console.log('│ Name                                 │ Section      │ Priority │ Status     │');
  console.log('├──────────────────────────────────────┼──────────────┼──────────┼────────────┤');

  for (const s of Object.values(STREAMER_DASHBOARD_SCENARIOS)) {
    const status = s.enabled ? '✅ On' : '⏸️  Off';
    console.log(
      `│ ${s.name.padEnd(36)} │ ${s.section.padEnd(12)} │ ${s.priority.padEnd(8)} │ ${status.padEnd(10)} │`
    );
  }

  console.log('└──────────────────────────────────────┴──────────────┴──────────┴────────────┘\n');
}
