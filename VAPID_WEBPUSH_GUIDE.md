# Web Push Notifications with VAPID + inTrack

A step-by-step integration guide for developers who want inTrack to manage web push for them — keys, the permission prompt, the subscription lifecycle, delivery, segmentation, and analytics. This is the fastest path to working push notifications.

---

## What is VAPID Mode?

inTrack supports two web push modes:

| | VAPID Mode (this guide) | Firebase Mode |
|---|---|---|
| Who manages push keys? | inTrack | You (via your Firebase project) |
| Service worker | `/sw.js` (inTrack's) | `/firebase-messaging-sw.js` (yours) |
| Main SDK call | `Intk('InitWebPush', config)` | `Intk('sendFireBaseToken', token)` |
| Firebase project needed | No | Yes |
| Permission prompt | Rendered by inTrack | Triggered by the Firebase `getToken()` call |
| Best for | Quick setup, no existing push | Full control, existing Firebase / FCM users |

**Use VAPID mode when:**
- You don't already have web push set up
- You want inTrack to own the VAPID keys and the subscription lifecycle
- You want the built-in inTrack permission prompt and bell widget with minimal code

> **Important:** In VAPID mode you call `InitWebPush(config)` once and inTrack does the rest — registering the subscription, showing the opt-in UI, and storing the `PushSubscription`. Do **not** call `sendFireBaseToken()`; that is Firebase mode.

---

## How It Works

```
Browser                         inTrack SDK / SW              inTrack servers
  |                                  |                              |
  |-- load inTrack SDK ------------> |                              |
  |-- InitWebPush(config) --------> SDK shows opt-in prompt         |
  |                                  |                              |
  |  user clicks "Allow"             |                              |
  |-- browser permission granted --> SDK subscribes via PushManager |
  |                                  |-- sends PushSubscription ---> stores subscription
  |                                  |                              |
  |  (later, when you send a campaign from the dashboard)           |
  |<-- push message ----------------------------------------------- inTrack → Push Service → Browser
  |-- /sw.js: inTrack-sw handles the push and shows the notification |
```

The key difference from Firebase mode: there is no FCM token and no Firebase project. inTrack subscribes the browser to the standard Web Push API using its own VAPID key pair (the public half is your `public_key`), and the inTrack service worker (`/sw.js`) renders incoming notifications.

---

## Prerequisites

- A website served over **HTTPS** (service workers do not work on plain HTTP — not even on localhost without extra config; see [Local HTTPS](#appendix--local-https-for-testing))
- An inTrack account — get your keys at [dash.intrack.ir](https://dash.intrack.ir) → **Settings → SDK → Initialize**
- The ability to host a JavaScript file at the **root of your domain** (`https://your-domain.com/sw.js`)

---

## Part 1 — inTrack SDK Setup

> **Already using inTrack?** If you have the inTrack SDK initialized on your site, confirm your config includes `public_key` (see Step 1), then skip to [Part 2](#part-2--service-worker).

### Step 1: Get your inTrack credentials

In your inTrack dashboard: **Settings → SDK → Initialize**. Choose your SDK type in the **Integration Guide for** dropdown, and you will see three values:

- `app_key`
- `auth_key`
- `public_key` — **this is inTrack's VAPID public key.** In VAPID mode it is required, because the browser needs it to create the push subscription. (In Firebase mode it is unused — that's the one difference in the config between the two modes.)

Set `environment` to `"production"` for your live site or `"stage"` for a staging environment. If omitted, the SDK defaults to `production`.

> **Production domain allow-list:** Give your production domain to the inTrack product / customer-success team before launch. In `production` mode the SDK only works on registered domains.

### Step 2: Add the inTrack SDK to your HTML

Add one of the following snippets to the end of the `<head>` of every page you want to track. The **async approach is strongly recommended** — it does not block page rendering.

#### Option A — Async (recommended)

```html
<!-- inTrack Initialization -->
<script type="text/javascript">
  var inTrack_config = {
    app_key:     'YOUR_APP_KEY',
    auth_key:    'YOUR_AUTH_KEY',
    public_key:  'YOUR_PUBLIC_KEY',   // required for VAPID mode
    environment: 'production',
    sw_path:     '/sw.js',            // path to the inTrack service worker (see Part 2)
  };
  (function (i, n, t, r, a, c) {
    o = i['InTrack'] = i['InTrack'] || {};
    i[a] = i[a] || function () { (o.q = o.q || []).push(arguments); };
    s = n.createElement(t); s.async = true; s.src = r;
    s.onload = function () { o.init(c); };
    e = n.getElementsByTagName(t)[0]; e.parentNode.insertBefore(s, e);
  })(window, document, 'script',
    '//static1.intrack.ir/api/web/download/sdk/v1/inTrack.min.js?v=00',
    'Intk', inTrack_config);
</script>
<!-- End inTrack Initialization -->
```

After the SDK loads, you can call methods two ways:
- `Intk('methodName', args)` — async / queued style (works before or after the SDK finishes loading; calls are buffered)
- `InTrack.methodName(args)` — sync / direct style (only after the SDK is loaded)

#### Option B — Synchronous

If you must call SDK methods immediately on page load, use the synchronous form. **Do not add `async` or `defer` to the script tag** — it must block, and it must be in the `<head>`.

```html
<!-- inTrack Initialization -->
<script type="text/javascript"
  src="https://static1.intrack.ir/api/web/download/sdk/v1/inTrack.min.js?v=00">
</script>
<script type="text/javascript">
  InTrack.init({
    app_key:     'YOUR_APP_KEY',
    auth_key:    'YOUR_AUTH_KEY',
    public_key:  'YOUR_PUBLIC_KEY',
    environment: 'production',
    sw_path:     '/sw.js',
  });
</script>
<!-- End inTrack Initialization -->
```

> **Debug tip:** Add `debug: true` to the config object to enable SDK logging in the browser console. Remove it before going to production.

> **Framework note (React / Next.js / Vue, etc.):** Inject the snippet through your framework's script mechanism rather than `index.html`. For Next.js, use `next/script` with `strategy="afterInteractive"` and dispatch a custom event from `s.onload` so your components know when the SDK is ready. See the [reference demo](demo/components/InTrackProvider.tsx) in this repo for a working pattern.

---

## Part 2 — Service Worker

The service worker runs in the background (separate from your page) and displays incoming push messages even when the browser tab is closed. It must be a JavaScript file served at the **root of your domain**.

In VAPID mode the service worker is **inTrack's** — you do not write the push-handling logic yourself.

### Step 3: Host the inTrack service worker

You have two options.

#### Option A — Use inTrack's `sw.js` directly (recommended)

Download inTrack's ready-made service worker and upload it to the root of your HTTPS domain (e.g. `public_html`, `/var/www/html`, or your framework's `public/` folder), so it is publicly accessible at:

```
https://your-domain.com/sw.js
```

Download it from:

```
https://static1.intrack.ir/api/web/download/sdk/v1/sw.js
```

The entire file is just this — it pulls inTrack's push handler from the CDN:

```javascript
// /sw.js
if ('function' === typeof importScripts) {
  importScripts('https://static1.intrack.ir/api/web/download/sdk/v1/inTrack-sw.min.js');
}
```

#### Option B — Add inTrack to your existing service worker

If you already have a service worker on your site, you do **not** need a second file. Add this snippet at the **top** of your existing SW, and inTrack will handle the push messages it sends:

```javascript
if ('function' === typeof importScripts) {
  importScripts('https://static1.intrack.ir/api/web/download/sdk/v1/inTrack-sw.min.js');
}
```

When you handle your own `push` events in the same worker, ignore the messages that belong to inTrack so they are not handled twice:

```javascript
self.addEventListener('push', function (event) {
  let data;
  try {
    if (event.data) data = JSON.parse(event.data.text());
  } catch (error) {
    console.log('error', error);
  }
  if (data?.source === '$inTrack') return; // let the imported inTrack SW handle it
  // ... your own push handling here
});
```

### Step 4: Tell the SDK where the service worker lives

To read the subscription status (via `PushManager`), the SDK needs to know where the service worker is registered. By default it assumes the root path `/sw.js`. If you placed it anywhere else, set `sw_path` in your init config:

```javascript
var inTrack_config = {
  app_key:    'YOUR_APP_KEY',
  auth_key:   'YOUR_AUTH_KEY',
  public_key: 'YOUR_PUBLIC_KEY',
  sw_path:    '/path-to-your/serviceWorker.js', // <-- only if not /sw.js
};
```

### Step 5: Serve the SW file with no-cache headers

**This step is critical.** By default, browsers and CDNs (like Cloudflare) may cache your service worker. If they serve a stale version, push notifications can break silently.

Set `Cache-Control: no-cache, no-store, must-revalidate` on the SW file.

**Nginx:**
```nginx
location = /sw.js {
  add_header Cache-Control "no-cache, no-store, must-revalidate";
  add_header Pragma "no-cache";
  add_header Expires "0";
}
```

**Apache:**
```apache
<Files "sw.js">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
</Files>
```

**Express.js:**
```javascript
app.get('/sw.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});
```

**Next.js (`next.config.js`):**
```javascript
async headers() {
  return [
    {
      source: '/sw.js',
      headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
    },
  ];
},
```

> **If you use Cloudflare:** Add a Page Rule or Cache Rule for `*/sw.js` with "Cache Level: Bypass" so Cloudflare never caches the SW file.

---

## Part 3 — Initialize Web Push

This is the heart of VAPID mode: a single call after the SDK has initialized.

### Step 6: Call `InitWebPush`

Call `InitWebPush` **after** `InTrack.init()` has run and with a valid `public_key` in your config. It registers the subscription and (depending on the theme) renders the opt-in prompt.

#### Asynchronous

```javascript
Intk('InitWebPush', webPushConfig);
```

#### Synchronous

```javascript
InTrack.InitWebPush(webPushConfig);
```

`webPushConfig` is optional — calling `InitWebPush()` with no argument uses inTrack defaults. Pass a config to customize the look and feel of the opt-in prompt and the bell widget.

### Step 7: Choose when the prompt appears

Browsers block automatic permission prompts and penalize sites that ask too aggressively. The recommended pattern is a **2-step opt-in** (inTrack's own UI asks first; only if the user agrees does the native browser prompt appear). This is the default for `subscriptionTheme` 1–4.

- For a contextual prompt, call `InitWebPush()` in response to a user action (e.g. a "Subscribe" button click) rather than on page load.
- `subscriptionBoxDelay` adds a delay (ms) before inTrack's prompt is shown on load.
- `askAgainAfterDays` controls how long to wait before re-asking a user who chose "Later".

### Step 8: Configuration reference

```javascript
var webPushConfig = {
  subscriptionStyle: {
    subscriptionTheme: 1,                 // 0 = native 1-step; 1-4 = inTrack 2-step
    subscriptionThemePos: 1,              // 1 = top, 2 = bottom, 3 = center
    subscriptionOverlayOpacity: 0,
    subscriptionBoxColor: '#fff',
    subscriptionBtnAllowTxt: 'Allow',
    subscriptionBtnAllowColor: '#0e82e5',
    subscriptionBtnAllowTxtColor: '#fff',
    subscriptionBtnDenyTxt: 'Later',
    subscriptionBtnDenyColor: '#d3d3d3',
    subscriptionBtnDenyTxtColor: '#888',
    subscriptionTitle: 'Stay up to date!',
    subscriptionTitleTxtColor: '#333',
    subscriptionMessage: 'Allow push notifications to receive the latest updates.',
    subscriptionMessageTxtColor: '#777',
    subscriptionBoxDelay: 3000,           // ms before the prompt appears
  },
  subscriptionStyleMobileSeparate: false, // true → use subscriptionStyleMobile on mobile
  subscriptionStyleMobile: { /* same shape as subscriptionStyle */ },
  isRTL: false,                           // true for right-to-left languages (e.g. Persian/Arabic)
  askAgainAfterDays: 7,                   // re-ask after N days if user chose "Later"; 0 = never
  widget: {
    enable: true,                         // show the floating bell widget
    enableUnsubs: true,                   // let users unsubscribe from the widget
    color: '#337ab7',
    icon: 'https://static1.intrack.ir/api/web/download/sdk/widget_default.png',
    style: {
      position: 'right',                  // 'left' or 'right'
      tickerRight: 10, tickerBottom: 10,
      notifRight: 50, notifBottom: 70,
    },
    messages: {
      sideTitle: 'Notifications',
      title: 'Website Notifications',
      body: 'Get the latest updates in real time.',
      subscribe: 'Subscribe',
      unsubscribe: 'Unsubscribe',
      notNow: 'Not now',
      cancel: 'Close',
    },
  },
};
```

#### Key fields

| Property | Type | Description |
|---|---|---|
| `subscriptionTheme` | number | `0` = 1-step native browser prompt. `1`–`4` = 2-step opt-in rendered by inTrack first, then the native prompt. |
| `subscriptionThemePos` | number | Position of the prompt: `1` top, `2` bottom, `3` center. (Valid positions: theme `1` → 1,2,3; theme `2` → 1,2.) |
| `subscriptionBoxDelay` | number | Delay in ms before the inTrack prompt appears. |
| `subscriptionStyleMobileSeparate` | boolean | When `true`, mobile devices use `subscriptionStyleMobile` instead of `subscriptionStyle`. |
| `isRTL` | boolean | Right-to-left layout for the prompt and widget. |
| `askAgainAfterDays` | number | Days to wait before re-showing the prompt to a user who chose "Later". `0` = never ask again. |

#### Bell widget

The subscription widget is a small floating bell in the lower-left or lower-right corner. Users click it to bring up the native permission prompt. It is unobtrusive enough to leave on the page permanently.

| Property | Type | Description |
|---|---|---|
| `enable` | boolean | Enable / disable the widget. |
| `enableUnsubs` | boolean | Allow users to unsubscribe via the widget. |
| `color` | string | Widget background color. |
| `icon` | string | Widget icon URL (e.g. a bell). |
| `style` | object | For `position: 'left'`, only `tickerLeft` / `notifLeft` apply; for `'right'`, only `tickerRight` / `notifRight`. |
| `messages` | object | Customize / localize the widget texts. |

---

## Part 4 — Subscription Status & Unsubscribe

### Step 9: Read the subscription status

Call `SubscriptionWebPushInfo(callback)` to find out where the user stands.

#### Asynchronous
```javascript
Intk('SubscriptionWebPushInfo', function (status) {
  console.log('Push status:', status);
});
```

#### Synchronous
```javascript
InTrack.SubscriptionWebPushInfo(function (status) {
  console.log('Push status:', status);
});
```

Possible values:

| Status | Meaning |
|---|---|
| `subscribed` | User granted permission and is receiving notifications. |
| `unsubscribed` | User has unsubscribed. |
| `denied` | User declined / blocked the browser permission. |
| `canceled` | User chose "Later" on the 2-step opt-in. |
| `no_init` | The push script is not initialized (e.g. `InitWebPush` not called). |

### Step 10: Unsubscribe a user

#### Asynchronous
```javascript
Intk('UnsubscribeWebPush');
```

#### Synchronous
```javascript
InTrack.UnsubscribeWebPush();
```

Example button:
```html
<button onclick="Intk('UnsubscribeWebPush')">Unsubscribe</button>
```

---

## Advanced — Manage the subscription flow yourself (`sendPushSubscription`)

Sometimes you want to control *how and when* the browser is subscribed — your own UI, your own timing, your own service-worker registration, or a library that talks directly to the browser's [`PushManager`](https://developer.mozilla.org/en-US/docs/Web/API/PushManager) — instead of letting `InitWebPush()` do it. For that, subscribe the user yourself and hand the resulting [`PushSubscription`](https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription) to inTrack with `sendPushSubscription`.

> ### You must subscribe with inTrack's `public_key` — not your own VAPID key
>
> This is the critical constraint. In the Web Push protocol, the `applicationServerKey` you pass to `pushManager.subscribe()` is the **public** half of a VAPID key pair, and the push service binds the subscription to it. To later **deliver** a notification, the sender must sign each message with the matching **private** key — the push service rejects anything not signed by it.
>
> inTrack is the sender, so inTrack must hold that private key. inTrack only ever uses **its own** key pair and gives you no way to upload a private key. Therefore the `applicationServerKey` **must be inTrack's `public_key`** (the same value from your dashboard config). If you subscribe with your own VAPID key, only *you* could send to that subscription — inTrack never could, and the push would silently fail.
>
> In short: you can bring your own subscription **flow**, but not your own **keys**.

```javascript
import { initWebPush } from '@/lib/intrack'; // or use the global Intk(...)

// inTrack's VAPID public key — the SAME value you put in `public_key` at init.
// Must be converted from base64url to a Uint8Array for the browser API.
const applicationServerKey = urlBase64ToUint8Array('YOUR_INTRACK_PUBLIC_KEY');

navigator.serviceWorker.register('/sw.js');
navigator.serviceWorker.ready.then((registration) => {
  registration.pushManager
    .subscribe({
      userVisibleOnly: true,
      applicationServerKey, // <-- inTrack's public key, NOT your own
    })
    .then(
      (pushSubscription) => {
        Intk('sendPushSubscription', pushSubscription); // hand it to inTrack
      },
      (error) => console.error(error)
    );
});

// Standard helper to convert a base64url VAPID key into the Uint8Array the API expects.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
```

As with Option B in Part 2, add inTrack's import at the top of your service worker so it handles the messages it sends, and `return` early on `data.source === '$inTrack'` in your own `push` listener.

> **Want your own VAPID keys end-to-end?** Then use **Firebase mode** instead ([FIREBASE_WEBPUSH_GUIDE.md](FIREBASE_WEBPUSH_GUIDE.md)). Firebase abstracts the VAPID layer behind an FCM token: your Firebase project owns the keys, and inTrack delivers *through Firebase's API* rather than signing raw VAPID pushes itself. That is the supported path for "I want to own the keys."

---

## Common Errors and How to Fix Them

| Error / symptom | Cause | Fix |
|---|---|---|
| Status is always `no_init` | `InitWebPush()` never ran, or ran before `InTrack.init()` | Call `InitWebPush()` after the SDK has initialized (Part 3). |
| SW not found (404) | `/sw.js` is not at the domain root | Move the file to the root, or set `sw_path` to its real path (Step 4). |
| `o.init is not a function` | Wrong variable names in the init IIFE | Use `InTrack` / `Intk` exactly as in the Part 1 snippet. |
| Prompt never appears | Theme is `0` (native only) and permission was already decided, or `subscriptionBoxDelay` too long | Try theme `1`, reduce the delay, or reset site notification permission in the browser. |
| Old SW version still active | Browser or Cloudflare cached the SW file | Add `Cache-Control: no-cache` to `/sw.js` (Step 5) and hard-reload. |
| Permission granted but no notifications | Wrong / missing `public_key`, or domain not allow-listed in production | Verify `public_key` from the dashboard; give your production domain to inTrack. |
| Notifications shown twice | Your own `push` handler and inTrack both render the same message | Add the `data?.source === '$inTrack'` guard in your service worker (Part 2, Option B). |
| Works on deployed site but not localhost | Service workers require HTTPS | Use `next dev --experimental-https` or another local-HTTPS method (see Appendix). |

---

## Full Working Example

**File 1: `/sw.js`** (at domain root, served with `Cache-Control: no-cache`)

```javascript
if ('function' === typeof importScripts) {
  importScripts('https://static1.intrack.ir/api/web/download/sdk/v1/inTrack-sw.min.js');
}
```

**File 2: `index.html`** (or any page)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>My Site</title>

  <!-- inTrack SDK (async) -->
  <script type="text/javascript">
    var inTrack_config = {
      app_key:     'YOUR_APP_KEY',
      auth_key:    'YOUR_AUTH_KEY',
      public_key:  'YOUR_PUBLIC_KEY',
      environment: 'production',
      sw_path:     '/sw.js',
    };
    (function (i, n, t, r, a, c) {
      o = i['InTrack'] = i['InTrack'] || {};
      i[a] = i[a] || function () { (o.q = o.q || []).push(arguments); };
      s = n.createElement(t); s.async = true; s.src = r;
      s.onload = function () { o.init(c); };
      e = n.getElementsByTagName(t)[0]; e.parentNode.insertBefore(s, e);
    })(window, document, 'script',
      '//static1.intrack.ir/api/web/download/sdk/v1/inTrack.min.js?v=00',
      'Intk', inTrack_config);
  </script>
</head>
<body>
  <button id="subscribe-btn">Enable Notifications</button>
  <button id="unsubscribe-btn">Unsubscribe</button>

  <script type="text/javascript">
    var webPushConfig = {
      subscriptionStyle: {
        subscriptionTheme: 1,
        subscriptionBtnAllowTxt: 'Allow',
        subscriptionBtnDenyTxt: 'Later',
        subscriptionTitle: 'Stay up to date!',
        subscriptionMessage: 'Allow push notifications to receive the latest updates.',
      },
      isRTL: false,
      askAgainAfterDays: 7,
      widget: { enable: true, enableUnsubs: true },
    };

    // Trigger the opt-in on a user gesture (recommended).
    document.getElementById('subscribe-btn').addEventListener('click', function () {
      Intk('InitWebPush', webPushConfig);
    });

    document.getElementById('unsubscribe-btn').addEventListener('click', function () {
      Intk('UnsubscribeWebPush');
    });

    // Read the current status whenever you need it.
    Intk('SubscriptionWebPushInfo', function (status) {
      console.log('Push status:', status);
    });
  </script>
</body>
</html>
```

> Want to show the bell widget on every page automatically? Call `Intk('InitWebPush', { ...config, widget: { enable: true } })` once after init instead of waiting for a button click — the widget itself becomes the opt-in entry point.

---

## Testing Checklist

- [ ] Website is served over **HTTPS**
- [ ] `/sw.js` is accessible at `https://your-domain.com/sw.js`
- [ ] `/sw.js` returns `Cache-Control: no-cache` (check in DevTools → Network)
- [ ] DevTools → Application → Service Workers shows the worker **registered and active**
- [ ] `public_key` is present in the SDK config
- [ ] `InTrack.getDeviceId()` returns a non-empty string in the console (confirms the SDK is initialized)
- [ ] Calling `InitWebPush()` shows the inTrack opt-in prompt (or the bell widget appears)
- [ ] After accepting, `SubscriptionWebPushInfo` reports `subscribed`
- [ ] A test push sent from the inTrack dashboard is received
- [ ] `UnsubscribeWebPush()` moves the status to `unsubscribed`

---

## Appendix — Local HTTPS for testing

Service workers (and therefore push) require a secure context. `http://localhost` is treated as secure for some APIs, but push subscription often needs real HTTPS. Options:

- **Next.js:** `next dev --experimental-https` generates a local cert automatically.
- **mkcert:** generate a locally-trusted certificate and serve your dev server over it.
- **Tunnels:** `ngrok`, `cloudflared`, or similar to expose `https://…` over a public URL. Remember to give that domain to inTrack if you test in `production` mode, or use `stage`.

---

## Where to go next

- **Firebase mode** (own your FCM project): see [FIREBASE_WEBPUSH_GUIDE.md](FIREBASE_WEBPUSH_GUIDE.md).
- **Reference implementation:** the [`demo/`](demo/) app in this repo has a working VAPID page at [demo/app/push/vapid/page.tsx](demo/app/push/vapid/page.tsx) and the Next.js SDK wrapper at [demo/components/InTrackProvider.tsx](demo/components/InTrackProvider.tsx).
- **Web push system events** (track delivery / clicks): see the inTrack events documentation.
</content>
</invoke>
