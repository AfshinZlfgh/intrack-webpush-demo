# inTrack WebPush — Next.js Integration Plan

## Overview

This document is the design and implementation plan for a Next.js (App Router) reference project that demonstrates inTrack Web SDK integration with full webpush support. The project will serve as a guide for other inTrack users.

**Stack:** Next.js 14+ (App Router) · TypeScript · Tailwind CSS · Firebase JS SDK (for Firebase push mode)

---

## Goals

1. Demonstrate two distinct webpush modes:
   - **VAPID mode** — inTrack manages everything natively via `InitWebPush()`
   - **Firebase mode** — Firebase FCM handles token management; you pass the token to inTrack via `sendFireBaseToken()`
2. Demonstrate user identification (login / logout / profile update)
3. Demonstrate custom event tracking
4. Show the inTrack subscription widget
5. Be deployable to any self-hosted HTTPS server (with clear setup instructions)
6. Be fully env-var driven so any inTrack user can clone and run it with their own credentials

---

## The Two Push Modes — Explained

### Mode A: VAPID Mode (inTrack native)

inTrack owns and manages the VAPID key pair. You delegate everything to the inTrack SDK:

1. Download inTrack's `sw.js` → host it at `https://your-domain.com/sw.js`
2. Init the SDK → call `$InTrack.InitWebPush(config)`
3. inTrack handles permission prompt, subscription, and token delivery to its servers

**When to use:** Fastest integration; no Firebase project needed.

### Mode B: Firebase Mode (no custom VAPID)

You own a Firebase project. Firebase internally uses its own VAPID keys for FCM. You get an FCM registration token and hand it off to inTrack:

1. Set up `firebase-messaging-sw.js` — inject inTrack's service worker script inside it
2. Init Firebase app + messaging
3. Call `getToken(messaging, { vapidKey: YOUR_FIREBASE_VAPID_KEY })` to get the FCM token
4. Pass the token to inTrack: `$InTrack.sendFireBaseToken(token)`
5. Do NOT call `InitWebPush()` in this mode

**When to use:** You already have a Firebase project, or you want to use Firebase Analytics / FCM directly alongside inTrack.

---

## Project Structure

```
intrack-webpush-demo/
├── .env.example                        # All env vars with documentation
├── .env.local                          # Git-ignored; your actual secrets
│
├── public/
│   ├── sw.js                           # inTrack service worker (Mode A)
│   └── firebase-messaging-sw.js        # Firebase SW with inTrack injection (Mode B)
│
├── app/
│   ├── layout.tsx                      # Root layout: loads inTrack SDK script
│   ├── page.tsx                        # Home: overview + quick links
│   │
│   ├── push/
│   │   ├── page.tsx                    # Push overview: choose a mode
│   │   ├── vapid/
│   │   │   └── page.tsx                # Mode A: full VAPID demo
│   │   └── firebase/
│   │       └── page.tsx                # Mode B: Firebase FCM demo
│   │
│   ├── users/
│   │   └── page.tsx                    # User identification demo
│   │
│   └── events/
│       └── page.tsx                    # Custom event tracking demo
│
├── components/
│   ├── InTrackProvider.tsx             # Client component; SDK init + context
│   ├── PushStatus.tsx                  # Subscription status badge
│   ├── PushControls.tsx                # Subscribe / Unsubscribe buttons
│   └── CodeBlock.tsx                   # Syntax-highlighted code snippet display
│
└── lib/
    ├── intrack.d.ts                    # TypeScript declarations for window.$InTrack
    ├── intrack.ts                      # Typed wrappers around async SDK calls
    └── firebase.ts                     # Firebase app init (used by Mode B only)
```

---

## Environment Variables

```bash
# .env.example

# ── inTrack Core Keys ───────────────────────────────────────────────────────
# Find these at: dash.intrack.ir → Settings → SDK → Initialize
NEXT_PUBLIC_INTRACK_APP_KEY=your_app_key_here
NEXT_PUBLIC_INTRACK_AUTH_KEY=your_auth_key_here
NEXT_PUBLIC_INTRACK_PUBLIC_KEY=your_public_key_here

# "production" or "stage"
NEXT_PUBLIC_INTRACK_ENV=production

# Enable inTrack SDK debug logging (true/false)
NEXT_PUBLIC_INTRACK_DEBUG=false

# ── VAPID Mode (Mode A) ──────────────────────────────────────────────────────
# Path to inTrack service worker. Default is /sw.js at domain root.
NEXT_PUBLIC_SW_PATH=/sw.js

# ── Firebase Mode (Mode B) ───────────────────────────────────────────────────
# Firebase project config — Firebase Console → Project Settings → Your Apps
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase VAPID key — Firebase Console → Cloud Messaging → Web Push certificates
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

---

## Service Worker Files

### `public/sw.js` (Mode A — VAPID)

Download the inTrack service worker from:
```
https://static1.intrack.ir/api/web/download/sdk/v1/sw.js
```

Host it verbatim at `public/sw.js`. No modification needed.

> **Why this file must be in `/public` root:** The Push API requires service workers to be scoped at the origin root. Next.js serves `/public` files at `https://your-domain.com/filename`.

### `public/firebase-messaging-sw.js` (Mode B — Firebase)

Firebase requires this exact filename at domain root. The file initializes Firebase and injects the inTrack service worker.

**Runtime config via URL query params:** `NEXT_PUBLIC_*` env vars are not available in service worker files. But Firebase config values (apiKey, projectId, etc.) are **not secrets** — Google explicitly says they're safe to expose publicly; security is enforced by Firebase Security Rules. So the SW reads its config from `self.location.search`, which the app sets when registering the SW. This means users can enter their Firebase config in a browser form at runtime — no env vars, no build step, no hardcoding.

```javascript
// public/firebase-messaging-sw.js

// Step 1: Import inTrack's service worker handler
if ('function' === typeof importScripts) {
  importScripts('https://static1.intrack.ir/api/web/download/sdk/v1/inTrack-sw.min.js');
}

// Step 2: Import Firebase scripts (compat version works in SW context)
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Step 3: Read Firebase config from URL query params (set during SW registration)
const params = new URLSearchParams(self.location.search);
firebase.initializeApp({
  apiKey:            params.get('apiKey'),
  authDomain:        params.get('authDomain'),
  projectId:         params.get('projectId'),
  storageBucket:     params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId:             params.get('appId'),
});

const messaging = firebase.messaging();

// Step 4: Handle background messages — skip inTrack messages (inTrack SW handles them)
messaging.onBackgroundMessage((payload) => {
  if (payload?.data?.source === '$inTrack') return;
  console.log('[firebase-messaging-sw.js] Background message', payload);
});
```

The app registers the SW by embedding config in the URL — sourced from user input saved in `localStorage`:

```typescript
// lib/firebase.ts — register SW with config from user-provided values
const cfg = getFirebaseConfigFromLocalStorage(); // user filled a form
const swUrl = new URL('/firebase-messaging-sw.js', window.location.origin);
Object.entries(cfg).forEach(([k, v]) => swUrl.searchParams.set(k, v));
const registration = await navigator.serviceWorker.register(swUrl.toString());
```

---

## Key Implementation Files

### `lib/intrack.d.ts` — TypeScript Declarations

```typescript
// Extends the Window interface to type the inTrack async queue API
interface Window {
  $InTrack: InTrackSDK;
  $Intk: (...args: unknown[]) => void;
  $inTrack_config: InTrackConfig;
}

interface InTrackConfig {
  app_key: string;
  auth_key: string;
  public_key: string;
  environment: 'production' | 'stage';
  debug?: boolean;
  sw_path?: string;
}

interface UserDetails {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  state?: string;
  city?: string;
  gender?: 'male' | 'female' | 'other';
  birthday?: string; // ISO-8601
  company?: string;
  hashedPhone?: string;
  hashedEmail?: string;
  smsOptIn?: boolean;
  emailOptIn?: boolean;
  pushOptIn?: boolean;
  webPushOptIn?: boolean;
  attributes?: Record<string, unknown>;
}

interface EventData {
  eventName: string;
  userId?: string;
  eventData?: Record<string, unknown>;
}

type PushSubscriptionStatus =
  | 'subscribed'
  | 'unsubscribed'
  | 'denied'
  | 'canceled'
  | 'no_init';

interface InTrackSDK {
  init: (config: InTrackConfig) => void;
  InitWebPush: (config?: WebPushConfig) => void;
  sendFireBaseToken: (token: string) => void;
  sendPushSubscription: (subscription: PushSubscription) => void;
  SubscriptionWebPushInfo: (callback: (status: PushSubscriptionStatus) => void) => void;
  UnsubscribeWebPush: () => void;
  login: (userDetails: UserDetails) => void;
  logout: () => void;
  updateProfile: (userDetails: UserDetails) => void;
  getDeviceId: () => string;
  getUserId: () => string;
  sendEvent: (eventData: EventData) => void;
}

interface WebPushConfig {
  subscriptionStyle?: SubscriptionStyle;
  subscriptionStyleMobileSeparate?: boolean;
  subscriptionStyleMobile?: SubscriptionStyle;
  isRTL?: boolean;
  askAgainAfterDays?: number;
  widget?: WidgetConfig;
}

interface SubscriptionStyle {
  subscriptionTheme?: 0 | 1 | 2 | 3 | 4;
  subscriptionThemePos?: 1 | 2 | 3;
  subscriptionOverlayOpacity?: number;
  subscriptionBoxColor?: string;
  subscriptionBtnAllowTxt?: string;
  subscriptionBtnAllowColor?: string;
  subscriptionBtnAllowTxtColor?: string;
  subscriptionBtnDenyTxt?: string;
  subscriptionBtnDenyColor?: string;
  subscriptionBtnDenyTxtColor?: string;
  subscriptionTitle?: string;
  subscriptionTitleTxtColor?: string;
  subscriptionMessage?: string;
  subscriptionMessageTxtColor?: string;
  subscriptionBoxDelay?: number;
}

interface WidgetConfig {
  enable?: boolean;
  enableUnsubs?: boolean;
  color?: string;
  icon?: string;
  style?: {
    position?: 'left' | 'right';
    tickerRight?: number;
    tickerLeft?: number;
    tickerBottom?: number;
    notifLeft?: number;
    notifRight?: number;
    notifBottom?: number;
  };
  messages?: Record<string, string>;
}
```

### `lib/intrack.ts` — Typed Async Wrappers

```typescript
// Promise wrappers over the async $Intk queue for use in React components

export function getDeviceId(): Promise<string> {
  return new Promise((resolve) => {
    window.$Intk('getDeviceId', resolve);
  });
}

export function getUserId(): Promise<string | null> {
  return new Promise((resolve) => {
    window.$Intk('getUserId', resolve);
  });
}

export function getSubscriptionStatus(): Promise<PushSubscriptionStatus> {
  return new Promise((resolve) => {
    window.$Intk('SubscriptionWebPushInfo', resolve);
  });
}

export function loginUser(userDetails: UserDetails): void {
  window.$Intk('login', userDetails);
}

export function logoutUser(): void {
  window.$Intk('logout');
}

export function updateUserProfile(userDetails: UserDetails): void {
  window.$Intk('updateProfile', userDetails);
}

export function sendCustomEvent(eventData: EventData): void {
  window.$Intk('sendEvent', eventData);
}

export function initWebPush(config?: WebPushConfig): void {
  window.$Intk('InitWebPush', config);
}

export function sendFirebaseToken(token: string): void {
  window.$Intk('sendFireBaseToken', token);
}

export function unsubscribeWebPush(): void {
  window.$Intk('UnsubscribeWebPush');
}
```

### `components/InTrackProvider.tsx` — SDK Initialization

```tsx
'use client';

import Script from 'next/script';
import { createContext, useContext, useState } from 'react';

type SDKState = 'idle' | 'loading' | 'ready' | 'error';

const InTrackContext = createContext<{ sdkState: SDKState }>({ sdkState: 'idle' });

export function useInTrack() {
  return useContext(InTrackContext);
}

export function InTrackProvider({ children }: { children: React.ReactNode }) {
  const [sdkState, setSdkState] = useState<SDKState>('loading');

  const config = {
    app_key: process.env.NEXT_PUBLIC_INTRACK_APP_KEY!,
    auth_key: process.env.NEXT_PUBLIC_INTRACK_AUTH_KEY!,
    public_key: process.env.NEXT_PUBLIC_INTRACK_PUBLIC_KEY!,
    environment: process.env.NEXT_PUBLIC_INTRACK_ENV as 'production' | 'stage',
    debug: process.env.NEXT_PUBLIC_INTRACK_DEBUG === 'true',
    sw_path: process.env.NEXT_PUBLIC_SW_PATH ?? '/sw.js',
  };

  return (
    <InTrackContext.Provider value={{ sdkState }}>
      <Script
        id="intrack-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            var $inTrack_config = ${JSON.stringify(config)};
            (function (i, n, t, r, a, c, k) {
              o = i['$InTrack'] = i['$InTrack'] || {};
              i[a] = i[a] || function () { (o.q = o.q || []).push(arguments); };
              s = n.createElement(t); s.async = true; s.src = r;
              s.onload = function () { o.init(c); };
              e = n.getElementsByTagName(t)[0]; e.parentNode.insertBefore(s, e);
            })(window, document, 'script',
              '//static1.intrack.ir/api/web/download/sdk/v1/inTrack.min.js?v=00',
              '$Intk', $inTrack_config);
          `,
        }}
        onLoad={() => setSdkState('ready')}
        onError={() => setSdkState('error')}
      />
      {children}
    </InTrackContext.Provider>
  );
}
```

---

## Pages

### `/` — Home
- Project title and what it demonstrates
- Setup checklist (env vars, service worker, HTTPS requirement for push)
- Navigation cards to each feature section

### `/push` — Push Overview
- Comparison table: VAPID Mode vs Firebase Mode
- Links to both demo pages

### `/push/vapid` — Mode A Demo
- Current subscription status (live, polled via `SubscriptionWebPushInfo`)
- Subscribe button (triggers permission prompt via inTrack widget)
- Unsubscribe button
- Toggle for subscription widget (bell icon)
- `webPushConfig` options panel showing theme/position configurator
- Code view: the exact code needed for this mode

### `/push/firebase` — Mode B Demo
- **Config form** (shown when no config saved): fields for apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, vapidKey — saved to `localStorage` on submit
- **Config status panel** (shown when config saved): masked values + "Clear / Edit" button
- Current FCM token (masked) + subscription status
- Subscribe / Unsubscribe buttons
- Code view: the exact code for this mode

### `/users` — User Identification
- Current user status: anonymous deviceId vs known userId
- Login form: userId + optional name/email fields
- Profile update form
- Logout button
- Code view for each operation

### `/events` — Custom Events
- Event name input + dynamic JSON key/value builder
- Send Event button
- Pre-built example events (e.g., `page_view`, `add_to_cart`, `purchase`)
- Event log: list of events sent this session (client-side only, for demo)
- Code view

---

## Implementation Phases

| Phase | What | Deliverable |
|-------|------|-------------|
| 1 | Project scaffolding | `create-next-app` + Tailwind + ESLint + TypeScript |
| 2 | Type declarations + env config | `lib/intrack.d.ts`, `.env.example` |
| 3 | SDK loader + provider | `InTrackProvider`, root `layout.tsx` |
| 4 | Service workers | `public/sw.js` (downloaded), `public/firebase-messaging-sw.js` |
| 5 | Push Mode A (VAPID) | `/push/vapid` page fully functional |
| 6 | Push Mode B (Firebase) | `lib/firebase.ts`, `/push/firebase` page fully functional |
| 7 | User identification | `/users` page |
| 8 | Event tracking | `/events` page |
| 9 | Home + navigation | `/` and `/push` overview pages |
| 10 | Deployment guide | `README.md` with HTTPS, Docker, nginx notes |

---

## HTTPS Requirement

Web Push requires HTTPS. Localhost is an exception for development only.

### Production: Cloudflare Proxy (recommended)

If your domain is on Cloudflare with the orange-cloud proxy enabled and SSL turned on, **that is sufficient**. Cloudflare terminates TLS at the edge; the browser sees `https://your-domain.com` and the Push API is satisfied.

SSL mode in Cloudflare dashboard → SSL/TLS:
- **Flexible** — Cloudflare↔origin can be plain HTTP. Works fine for push.
- **Full** or **Full (Strict)** — Cloudflare↔origin also uses HTTPS. More secure, recommended if possible.

**Critical: disable Cloudflare caching for service worker files.** Cloudflare caches static `.js` files by default. A cached service worker means browsers never see updates. Fix this in `next.config.ts` by setting `Cache-Control: no-cache` on the SW files — Cloudflare respects this header and will not cache them.

```typescript
// next.config.ts
headers: [
  { source: '/sw.js',                   headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
  { source: '/firebase-messaging-sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
]
```

### Production: nginx reverse proxy

Run `next start` on port 3000 behind nginx + Certbot (Let's Encrypt):

```nginx
server {
  listen 443 ssl;
  server_name your-domain.com;
  ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
  location / { proxy_pass http://localhost:3000; }
}
```

### Development

```bash
next dev --experimental-https   # built-in self-signed cert
# or
ngrok http 3000                 # public HTTPS URL for testing push
```

---

## Key Gotchas Documented in the Guide

| Issue | Explanation |
|-------|-------------|
| SW scope | `sw.js` must be at domain root (`/sw.js`), not `/public/sw.js` — Next.js handles this automatically via the `public/` folder |
| Firebase SW config | `NEXT_PUBLIC_*` vars are NOT available in SW files — pass config via URL query params on registration; user enters config in a browser form saved to `localStorage` |
| Cloudflare SW caching | Cloudflare caches `.js` files by default — set `Cache-Control: no-cache` on SW files in `next.config.ts` or browsers won't detect SW updates |
| `InitWebPush` vs `sendFireBaseToken` | Never call both — pick one mode. Calling `InitWebPush` in Firebase mode will conflict |
| Async queue vs sync | All examples use the async `$Intk(method, ...)` queue — do not use `$InTrack.method()` until `onload` fires |
| `userId` is mandatory on login | Even if you only want to set name/email, `userId` field is required |
| Push permission is per-origin | Changing domains requires users to re-subscribe |
| inTrack service worker in Firebase SW | Must be imported at the top of `firebase-messaging-sw.js` via `importScripts` |

---

## Questions Before Implementation Starts

To begin coding, you will need to provide (or confirm we use placeholders for):

1. **inTrack credentials** — from `dash.intrack.ir → Settings → SDK → Initialize`
   - `NEXT_PUBLIC_INTRACK_APP_KEY`
   - `NEXT_PUBLIC_INTRACK_AUTH_KEY`
   - `NEXT_PUBLIC_INTRACK_PUBLIC_KEY`

2. **Firebase project config** — from Firebase Console (for Mode B)
   - All `NEXT_PUBLIC_FIREBASE_*` variables listed in `.env.example`
   - The Web Push certificate VAPID key from Firebase Console → Cloud Messaging

3. **Domain/hostname** — to configure inTrack's production domain whitelist with the inTrack team (required for production mode)

If you want to start with placeholder values and test with real credentials later, that works fine — the project is fully env-var driven.

---

## Ready to Start?

If this plan looks good, the next step is Phase 1:
```bash
npx create-next-app@latest intrack-webpush-demo \
  --typescript --tailwind --eslint --app --src-dir=false \
  --import-alias "@/*"
```

Let me know if you want to adjust any part of the plan (page structure, naming, anything) before we begin.
