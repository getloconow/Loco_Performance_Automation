/**
 * ============================================================
 * Loco Authentication Utility — OTPless Cookie Injection
 * ============================================================
 *
 * Provides a complete, headless authentication flow for the
 * Loco platform using the OTPless SDK. The full flow:
 *
 *   1. Launch a temporary, isolated Chromium browser
 *   2. Navigate to preprod.loco.com
 *   3. Inject and run the OTPless headless SDK to:
 *        a. Initiate a phone OTP
 *        b. Verify the OTP
 *        c. Capture the wa_id from the ONETAP callback
 *   4. Exchange wa_id for Loco access_token + refresh_token
 *      via POST /auth/v3/user/otpless/signin/
 *   5. Expose injectAuthCookies() to set the three session
 *      cookies (access_token, refresh_token, mode=logged-in)
 *      into any Playwright BrowserContext before the audit runs
 *
 * Usage:
 *   const tokens = await getLocoTokens();
 *   await injectAuthCookies(context, tokens);
 *
 * @module utils/loco-auth
 */

import { chromium, Browser, BrowserContext } from 'playwright';
import { config } from '../config/env.config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Parameters required to run the OTPless + Loco sign-in flow */
export interface LocoAuthParams {
  /** OTPless App ID for the target project (viewer or streamer) */
  appId: string;
  /** Test phone number (digits only, without country code) */
  phone: string;
  /** Static OTP configured for the test account */
  otp: string;
  /** International dialling code, e.g. "+55" */
  countryCode: string;
  /** Loco sign-in client ID (x-client-id header) */
  clientId: string;
  /** Loco sign-in client secret (x-client-secret header) */
  clientSecret: string;
}

/** Loco session tokens returned after a successful authentication */
export interface LocoAuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ---------------------------------------------------------------------------
// OTPless Browser Flow
// ---------------------------------------------------------------------------

/**
 * Runs the OTPless headless SDK flow inside a temporary, isolated
 * Playwright browser context and returns the `wa_id` ONETAP token.
 *
 * A brand-new Chromium instance is launched for this step — the main
 * audit browser is never touched.
 *
 * @param params — Auth parameters
 * @returns The wa_id token from the OTPless ONETAP response
 */
async function obtainOtplessToken(params: LocoAuthParams): Promise<string> {
  const { phone, otp, countryCode, appId } = params;

  console.log('[LocoAuth] 🚀 Launching temp browser for OTPless flow...');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();

  try {
    // Navigate to preprod.loco.com — the OTPless SDK origin must match
    await page.goto('https://preprod.loco.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    console.log('[LocoAuth] 📍 Loaded preprod.loco.com — initiating OTPless flow...');
    console.log(`[LocoAuth]    Phone: ${countryCode} ${phone}`);
    console.log(`[LocoAuth]    AppId: ${appId}`);

    // Execute the full initiate → verify → ONETAP flow in the browser.
    // Returns the wa_id token string.
    const waId = await page.evaluate(
      async ({
        phone,
        otp,
        countryCode,
        appId,
      }: {
        phone: string;
        otp: string;
        countryCode: string;
        appId: string;
      }): Promise<string> => {
        return new Promise<string>((resolve, reject) => {
          // Remove any stale SDK script to guarantee a fresh load
          const existing = document.getElementById('otpless-sdk');
          if (existing) existing.remove();

          // Dynamically inject the OTPless headless SDK
          const script = document.createElement('script');
          script.src = 'https://otpless.com/v4/headless.js';
          script.id = 'otpless-sdk';
          script.setAttribute('data-appid', appId);

          script.onload = () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const OTPless = (window as any).OTPless;
            if (!OTPless) {
              reject(new Error('OTPless SDK loaded but window.OTPless is undefined'));
              return;
            }

            // Create a headless instance — the callback fires on ONETAP
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const signin = new OTPless((ev: any) => {
              if (ev?.responseType === 'ONETAP') {
                const token: string = ev?.response?.token;
                if (token) {
                  resolve(token);
                } else {
                  reject(new Error('ONETAP event received but wa_id token is empty'));
                }
              }
            });

            // Step 1: Send OTP → Step 2: Verify OTP
            signin
              .initiate({ channel: 'PHONE', phone, countryCode })
              .then(() =>
                signin.verify({ channel: 'PHONE', phone, otp, countryCode })
              )
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .catch((err: any) => {
                reject(
                  new Error(`OTP verification failed: ${err?.message ?? String(err)}`)
                );
              });
          };

          script.onerror = () => {
            reject(
              new Error('Failed to load OTPless SDK from https://otpless.com/v4/headless.js')
            );
          };

          document.head.appendChild(script);

          // Hard timeout — do not hang the suite indefinitely
          setTimeout(
            () => reject(new Error('OTPless flow timed out after 30 seconds')),
            30_000
          );
        });
      },
      { phone, otp, countryCode, appId }
    );

    console.log('[LocoAuth] ✅ wa_id token received from OTPless ONETAP');
    return waId;
  } finally {
    await browser.close();
    console.log('[LocoAuth] 🔌 Temp auth browser closed');
  }
}

// ---------------------------------------------------------------------------
// Token Exchange via Loco Sign-In API
// ---------------------------------------------------------------------------

/**
 * Exchanges an OTPless wa_id token for Loco `access_token` and
 * `refresh_token` by calling the Loco sign-in REST API.
 *
 * @param waId — The wa_id token returned by the OTPless ONETAP callback
 * @param params — Auth parameters (appId, clientId, clientSecret)
 * @returns Loco session tokens { accessToken, refreshToken }
 */
async function exchangeForLocoTokens(
  waId: string,
  params: LocoAuthParams
): Promise<LocoAuthTokens> {
  const { appId, clientId, clientSecret } = params;
  const url = 'https://api.locolive.com/auth/v3/user/otpless/signin/';

  console.log('[LocoAuth] 🔄 Exchanging wa_id for Loco access + refresh tokens...');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-platform': '7',
      'content-type': 'application/json;charset=utf-8',
      'device-id': 'eb53cd2706dd3c99125d5a20d6fc4050live',
      'Referer': 'https://preprod.loco.com/',
      'x-client-id': clientId,
      'x-client-secret': clientSecret,
    },
    body: JSON.stringify({ wa_id: waId, app_id: appId }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '<unreadable>');
    throw new Error(
      `[LocoAuth] Loco sign-in API returned HTTP ${response.status}: ${body}`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await response.json();
  const accessToken: string | undefined = data?.access_token;
  const refreshToken: string | undefined = data?.refresh_token;

  if (!accessToken || !refreshToken) {
    throw new Error(
      `[LocoAuth] Sign-in response is missing tokens. ` +
      `Got keys: ${Object.keys(data ?? {}).join(', ')}`
    );
  }

  console.log('[LocoAuth] ✅ Loco access_token and refresh_token obtained');
  return { accessToken, refreshToken };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * End-to-end Loco authentication flow.
 *
 * Runs the OTPless headless SDK in a temporary browser, then exchanges
 * the wa_id for Loco session tokens. Returns tokens ready for
 * injection into a Playwright BrowserContext via `injectAuthCookies`.
 *
 * Defaults to `config.locoAuth.viewer` credentials from env.config.ts,
 * but any/all params can be overridden for flexibility.
 *
 * @param params — Optional partial overrides for auth parameters
 * @returns LocoAuthTokens containing the access and refresh tokens
 */
export async function getLocoTokens(
  params?: Partial<LocoAuthParams>
): Promise<LocoAuthTokens> {
  const resolved: LocoAuthParams = {
    appId:        params?.appId        ?? config.locoAuth.viewer.appId,
    phone:        params?.phone        ?? config.locoAuth.viewer.phone,
    otp:          params?.otp          ?? config.locoAuth.viewer.otp,
    countryCode:  params?.countryCode  ?? config.locoAuth.viewer.countryCode,
    clientId:     params?.clientId     ?? config.locoAuth.clientId,
    clientSecret: params?.clientSecret ?? config.locoAuth.clientSecret,
  };

  // Validate required config before any network calls
  const missing = (['appId', 'phone', 'otp', 'countryCode', 'clientId', 'clientSecret'] as const)
    .filter((k) => !resolved[k]);
  if (missing.length > 0) {
    throw new Error(
      `[LocoAuth] Missing required auth config: ${missing.join(', ')}. ` +
      'Check your .env file.'
    );
  }

  const waId = await obtainOtplessToken(resolved);
  return exchangeForLocoTokens(waId, resolved);
}

/**
 * Injects the three Loco session cookies into a Playwright BrowserContext.
 *
 * This must be called BEFORE any `page.goto()` call so the cookies are
 * already present when the first navigation request is made.
 *
 * Cookies injected:
 *   - `access_token`  — JWT access token for API authentication
 *   - `refresh_token` — JWT refresh token for session renewal
 *   - `mode`          — Set to `"logged-in"` to signal auth state to the app
 *
 * @param context — The Playwright BrowserContext to inject cookies into
 * @param tokens  — Loco session tokens from `getLocoTokens()`
 */
export async function injectAuthCookies(
  context: BrowserContext,
  tokens: LocoAuthTokens
): Promise<void> {
  await context.addCookies([
    {
      name: 'access_token',
      value: tokens.accessToken,
      domain: '.loco.com',
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'Lax',
    },
    {
      name: 'refresh_token',
      value: tokens.refreshToken,
      domain: '.loco.com',
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'Lax',
    },
    {
      name: 'mode',
      value: 'logged-in',
      domain: '.loco.com',
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'Lax',
    },
  ]);

  console.log(
    '[LocoAuth] 🍪 Auth cookies injected → access_token, refresh_token, mode=logged-in'
  );
}

/**
 * Injects auth cookies into Chrome's DEFAULT browser context via CDP.
 *
 * ─── Why this is needed ──────────────────────────────────────────────────────
 *
 *   Problem:
 *     `browser.newContext().addCookies()` sets cookies in a Playwright
 *     ISOLATED context (analogous to incognito). Lighthouse connects to
 *     Chrome via a raw CDP port and opens its audit tab in Chrome's DEFAULT
 *     context — a completely separate cookie store. Cookies in the Playwright
 *     isolated context are invisible to Lighthouse's tab.
 *
 *   Solution:
 *     `chromium.connectOverCDP()` attaches to the already-running Chrome
 *     instance and exposes its REAL browser contexts via `browser.contexts()`.
 *     The default context (index 0) is exactly where Lighthouse opens tabs.
 *     Injecting cookies there makes them visible to the Lighthouse audit page.
 *
 * ─── Key behaviours ──────────────────────────────────────────────────────────
 *
 *   - Only applicable for LOCAL execution (port-based CDP).
 *     For LambdaTest, Lighthouse uses their native audit integration and the
 *     `extraHeaders: { Cookie: ... }` approach handles server-side auth.
 *
 *   - Calling `cdpBrowser.close()` on a `connectOverCDP` browser ONLY
 *     disconnects the Playwright session — it does NOT kill the Chrome process.
 *
 *   - Pair with `disableStorageReset: true` in Lighthouse options so Lighthouse
 *     does not wipe these cookies as part of its audit setup phase.
 *
 * @param port   - The Chrome remote debugging port (connection.port)
 * @param tokens - Loco auth tokens from getLocoTokens()
 */
export async function injectAuthCookiesIntoBrowserDefault(
  port: number,
  tokens: LocoAuthTokens
): Promise<void> {
  console.log(`[LocoAuth] 🔗 Attaching to Chrome default context via CDP (port ${port})...`);

  // Connect to the already-running Chrome instance. Unlike chromium.launch(),
  // connectOverCDP()'s browser.contexts() exposes ALL actual Chrome contexts,
  // including the default one that Lighthouse uses.
  const cdpBrowser = await chromium.connectOverCDP(`http://localhost:${port}`);

  try {
    const contexts = cdpBrowser.contexts();

    if (contexts.length === 0) {
      console.warn(
        '[LocoAuth] ⚠️  No default context found via CDP. ' +
        'Lighthouse tab may not be authenticated. ' +
        'The extraHeaders fallback will still authenticate server-side requests.'
      );
      return;
    }

    // contexts()[0] is Chrome's actual default browser context.
    // Lighthouse opens its audit tabs here, so cookies set on this context
    // will be available to all Lighthouse navigations.
    const defaultContext = contexts[0];

    await defaultContext.addCookies([
      {
        name: 'access_token',
        value: tokens.accessToken,
        domain: '.loco.com',
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
      },
      {
        name: 'refresh_token',
        value: tokens.refreshToken,
        domain: '.loco.com',
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
      },
      {
        name: 'mode',
        value: 'logged-in',
        domain: '.loco.com',
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
      },
    ]);

    console.log(
      '[LocoAuth] 🍪 Auth cookies injected into Chrome default context → ' +
      'Lighthouse audit tab will see access_token, refresh_token, mode=logged-in'
    );
  } finally {
    // Disconnects the Playwright CDP session only — Chrome keeps running.
    await cdpBrowser.close();
    console.log('[LocoAuth] 🔗 CDP session closed (Chrome process is unaffected)');
  }
}

/**
 * ─── LambdaTest Layer 1 ──────────────────────────────────────────────────────
 *
 * Injects auth cookies into Chrome's DEFAULT browser context via the
 * browser-level CDP `Storage.setCookies` command.
 *
 * Why a separate function for LambdaTest:
 *   On LambdaTest, there is no local CDP port (`connection.port = -1`), so
 *   `chromium.connectOverCDP('http://localhost:-1')` is impossible.
 *   Instead, `browser.newBrowserCDPSession()` opens a CDP session at the
 *   BROWSER PROCESS level (not tied to any page or Playwright context).
 *   `Storage.setCookies` without a `browserContextId` targets Chrome's
 *   DEFAULT browser context — exactly where LambdaTest's Lighthouse runner
 *   opens its audit tabs.
 *
 * Pair with `disableStorageReset: true` in Lighthouse flags so that Lighthouse
 * does not wipe these cookies before it navigates.
 *
 * @param browser - The Playwright Browser object from the LambdaTest connection
 * @param tokens  - Loco auth tokens from getLocoTokens()
 */
export async function injectAuthCookiesViaStorageCDP(
  browser: Browser,
  tokens: LocoAuthTokens
): Promise<void> {
  console.log(
    '[LocoAuth] 🔗 Setting auth cookies in Chrome default context via Storage.setCookies CDP...'
  );

  // browser.newBrowserCDPSession() creates a CDP session at the browser process
  // level. The Storage domain's setCookies command without a browserContextId
  // applies to Chrome's default context — where LambdaTest's Lighthouse opens tabs.
  const browserCDP = await browser.newBrowserCDPSession();

  try {
    await browserCDP.send('Storage.setCookies', {
      cookies: [
        {
          name: 'access_token',
          value: tokens.accessToken,
          domain: '.loco.com',
          path: '/',
          secure: true,
          httpOnly: false,
          sameSite: 'Lax',
        },
        {
          name: 'refresh_token',
          value: tokens.refreshToken,
          domain: '.loco.com',
          path: '/',
          secure: true,
          httpOnly: false,
          sameSite: 'Lax',
        },
        {
          name: 'mode',
          value: 'logged-in',
          domain: '.loco.com',
          path: '/',
          secure: true,
          httpOnly: false,
          sameSite: 'Lax',
        },
      ],
      // No browserContextId → targets Chrome's DEFAULT browser context
    });

    console.log(
      '[LocoAuth] 🍪 Auth cookies set in LambdaTest Chrome default context → ' +
      'access_token, refresh_token, mode=logged-in'
    );
  } finally {
    await browserCDP.detach();
    console.log('[LocoAuth] 🔗 Browser CDP session detached');
  }
}

/**
 * ─── LambdaTest Layer 2 ──────────────────────────────────────────────────────
 *
 * Registers a `context.route()` handler that injects auth cookies into every
 * loco.com document navigation — both in the outgoing request and the response.
 *
 * Why this is needed (safety net over Layer 1):
 *   Even after Layer 1 sets cookies in Chrome's default context, LambdaTest's
 *   Lighthouse may call `clearDataForOrigin` as its first step — wiping all
 *   stored cookies before navigating to the audit URL. Playwright route
 *   handlers are runtime state, NOT browser storage. They survive any
 *   `clearDataForOrigin` or `clearBrowserCookies` CDP call Lighthouse makes.
 *
 * How it works (per document request):
 *   1. Forwards the request with auth cookies in the `cookie` header →
 *      server immediately serves authenticated, personalised content
 *   2. Injects `Set-Cookie` in the response → browser stores auth cookies
 *      in its cookie jar
 *   3. All subsequent sub-resource requests and API calls carry those cookies
 *      automatically; `document.cookie` in the page's JavaScript also sees them
 *
 * Only `document` (top-level HTML navigation) requests are intercepted so that
 * sub-resource (JS, CSS, images, XHR/fetch) timings are not affected.
 *
 * @param context - The Playwright BrowserContext for this scenario's audit
 * @param tokens  - Loco auth tokens from getLocoTokens()
 */
export async function injectAuthCookiesViaRoutes(
  context: BrowserContext,
  tokens: LocoAuthTokens
): Promise<void> {
  const { accessToken, refreshToken } = tokens;

  const authCookieString = [
    `access_token=${accessToken}`,
    `refresh_token=${refreshToken}`,
    `mode=logged-in`,
  ].join('; ');

  // Playwright splits on \n into separate Set-Cookie response headers
  const authSetCookieHeader = [
    `access_token=${accessToken}; Path=/; Domain=.loco.com; Secure; SameSite=Lax`,
    `refresh_token=${refreshToken}; Path=/; Domain=.loco.com; Secure; SameSite=Lax`,
    `mode=logged-in; Path=/; Domain=.loco.com; Secure; SameSite=Lax`,
  ].join('\n');

  await context.route(/loco\.com/, async (route) => {
    const request = route.request();

    // Non-document resources pass through unchanged to avoid adding latency
    // that would skew JS/CSS/image timing in the performance metrics.
    if (request.resourceType() !== 'document') {
      await route.continue();
      return;
    }

    // Merge auth cookies with any cookies already on the request
    const existing = request.headers()['cookie'] || '';
    const mergedCookies = existing ? `${existing}; ${authCookieString}` : authCookieString;

    // Fetch with auth injected into the outgoing request header
    const response = await route.fetch({
      headers: { ...request.headers(), cookie: mergedCookies },
    });

    // Append Set-Cookie to the response so the browser stores auth cookies
    // in its cookie jar — making them accessible to document.cookie in the SPA
    const responseHeaders = response.headers();
    const existingSetCookie = responseHeaders['set-cookie'];
    responseHeaders['set-cookie'] = existingSetCookie
      ? `${existingSetCookie}\n${authSetCookieHeader}`
      : authSetCookieHeader;

    await route.fulfill({ response, headers: responseHeaders });
  });

  console.log(
    '[LocoAuth] 🛣️  Route auth handler active — Set-Cookie injected on every ' +
    'loco.com document request (survives Lighthouse storage resets)'
  );
}
