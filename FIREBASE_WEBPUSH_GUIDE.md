# Web Push Notifications with Firebase + inTrack

A step-by-step integration guide for developers who want to use their own Firebase project for web push, with inTrack handling delivery, segmentation, and analytics.

---

## What is Firebase Mode?

inTrack supports two web push modes:

| | VAPID Mode | Firebase Mode (this guide) |
|---|---|---|
| Who manages push keys? | inTrack | You (via your Firebase project) |
| Service worker | `/sw.js` (inTrack's) | `/firebase-messaging-sw.js` (yours) |
| SDK call | `Intk('InitWebPush', config)` | `Intk('sendFireBaseToken', token)` |
| Best for | Quick setup | Full control, existing Firebase users |

**Use Firebase mode when:**
- You already have a Firebase project and a service worker
- You want to own your FCM credentials and VAPID keys
- You are integrating inTrack into an existing push setup

> **Important:** In Firebase mode, do **not** call `InitWebPush()`. That is VAPID mode. Call `sendFireBaseToken(token)` instead.

---

## How It Works

```
Browser                  Your Server / Firebase        inTrack
  |                              |                        |
  |-- register SW -------------> |                        |
  |-- request FCM token -------> Firebase                 |
  |<-- FCM token -------------- Firebase                 |
  |-- sendFireBaseToken(token) ----------------------------> inTrack stores token
  |                                                        |
  |  (later, when you send a campaign)                     |
  |<-- push message ---------------------------------------- inTrack → Firebase → Browser SW
  |-- SW: onBackgroundMessage                              |
  |    └── if source === '$inTrack': handled by inTrack SW |
  |    └── else: your own handler                          |
```

---

## Prerequisites

- A website served over **HTTPS** (service workers do not work on plain HTTP, not even on localhost without extra config)
- An inTrack account — get your keys at [dash.intrack.ir](https://dash.intrack.ir) → Settings → SDK → Initialize
- A Firebase project with Cloud Messaging enabled

---

## Part 1 — inTrack SDK Setup

> **Already using inTrack?** If you have the inTrack SDK initialized on your site, skip to [Part 2](#part-2--firebase-project-setup).

### Step 1: Get your inTrack credentials

In your inTrack dashboard: **Settings → SDK → Initialize**

You need two values:
- `app_key`
- `auth_key`

> **What about `public_key`?** That key is inTrack's VAPID public key — it is only used in VAPID mode, where inTrack manages push subscriptions directly. In Firebase mode, the VAPID key belongs to your Firebase project and never touches inTrack's config. If your inTrack dashboard shows a `public_key`, you can safely leave it out of the config below.

Set `environment` to `"production"` for your live site or `"stage"` for a staging environment.

### Step 2: Add the inTrack SDK to your HTML

Add one of the following snippets to the `<head>` of every page you want to track. The **async approach is strongly recommended** — it does not block page rendering.

#### Option A — Async (recommended)

```html
<!-- inTrack Initialization -->
<script type="text/javascript">
  var inTrack_config = {
    app_key:     'YOUR_APP_KEY',
    auth_key:    'YOUR_AUTH_KEY',
    environment: 'production',
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

After the SDK loads, you can call methods like:
- `Intk('methodName', args)` — async / queued style (works before or after SDK loads)
- `InTrack.methodName(args)` — sync / direct style (only after SDK is loaded)

#### Option B — Synchronous

If you need to call SDK methods immediately on page load and cannot wait for async loading, use the synchronous method. **Do not add `async` or `defer` to the script tag** — it must block.

```html
<!-- inTrack Initialization -->
<script type="text/javascript"
  src="https://static1.intrack.ir/api/web/download/sdk/v1/inTrack.min.js?v=00">
</script>
<script type="text/javascript">
  InTrack.init({
    app_key:     'YOUR_APP_KEY',
    auth_key:    'YOUR_AUTH_KEY',
    environment: 'production',
  });
</script>
<!-- End inTrack Initialization -->
```

> **Debug tip:** Add `debug: true` to the config object to enable SDK logging in the browser console. Remove it before going to production.

---

## Part 2 — Firebase Project Setup

### Step 3: Create or open your Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (or open an existing one)
3. In the left sidebar go to **Build → Cloud Messaging**
4. Make sure Cloud Messaging is enabled for your project

### Step 4: Get your Firebase credentials

In the Firebase Console:
1. Click the gear icon → **Project Settings**
2. Scroll down to **Your apps** → click **Web** (`</>`)
3. Register your app if you haven't already
4. Copy the `firebaseConfig` object — you'll need all of these fields:

```javascript
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project-id",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId:             "1:123456789012:web:abcdef123456",
};
```

### Step 5: Get your VAPID key (Web Push certificate)

This is **not** the same as your server key. It is the public key used by the browser to verify push messages.

1. In Firebase Console → **Project Settings → Cloud Messaging**
2. Scroll to **Web configuration → Web Push certificates**
3. If you don't have one, click **Generate key pair**
4. Copy the **Key pair** value — this is your `vapidKey`

```
vapidKey: "BNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

---

## Part 3 — Service Worker

The service worker runs in the background (separate from your page) and handles incoming push messages even when the browser tab is closed. It must be a JavaScript file served at the **root of your domain**.

### Step 6: Create `firebase-messaging-sw.js`

Place this file so it is publicly accessible at `https://yourdomain.com/firebase-messaging-sw.js`.

You have two options for how the service worker receives your Firebase config.

---

#### Option A — Hardcode the config in the file

Simple and straightforward. Good for most use cases.

```javascript
// /firebase-messaging-sw.js

// 1. Import inTrack's service worker — required for inTrack to handle
//    push messages it sends to your users.
if ('function' === typeof importScripts) {
  importScripts('https://static1.intrack.ir/api/web/download/sdk/v1/inTrack-sw.min.js');
}

// 2. Import Firebase compat scripts (v8-style API, works in any SW without a bundler)
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// 3. Initialize Firebase with your project credentials
firebase.initializeApp({
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_AUTH_DOMAIN',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId:             'YOUR_APP_ID',
});

const messaging = firebase.messaging();

// 4. Handle background messages
//    Messages from inTrack have source === '$inTrack' — return early so
//    inTrack's SW (imported above) handles them. Handle your own messages below.
messaging.onBackgroundMessage((payload) => {
  if (payload?.data?.source === '$inTrack') return;

  // Handle your own background messages here (if any)
  console.log('[SW] Background message received:', payload);
});
```

> **Can I use `npm install firebase` instead of these CDN URLs in the service worker?**
>
> It depends on your setup. Service workers cannot use `import` statements natively — you need a bundler that specifically processes the SW file. The `importScripts` CDN approach above works for every project without any extra configuration.
>
> If your project uses a bundler that handles service workers (Vite with `vite-plugin-pwa`, or `serwist` in Next.js), you can replace the two `importScripts` lines and the compat API with the modular npm API:
> ```javascript
> // Only works if your bundler processes this file
> import { initializeApp } from 'firebase/app';
> import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'; // note: /sw entry point
>
> const app = initializeApp({ /* your config */ });
> const messaging = getMessaging(app);
> onBackgroundMessage(messaging, (payload) => { /* ... */ });
> ```
> For most projects — including plain Next.js where the SW lives as a static file in `/public` — the `importScripts` approach is the right choice.

> **Note on Firebase credentials being "public":** Firebase credentials in the client (and service worker) are not secret — they're already visible to anyone who uses your site. They are protected by Firebase Security Rules, not by being hidden. That said, if you prefer not to commit them into the SW file directly, use Option B.

---

#### Option B — Pass config via URL query parameters

This approach avoids hardcoding credentials in a static file. Instead, the page registers the SW with credentials in the URL, and the SW reads them from `self.location.search`. Useful when your site reads config at runtime (e.g., from an API or user input).

```javascript
// /firebase-messaging-sw.js

if ('function' === typeof importScripts) {
  importScripts('https://static1.intrack.ir/api/web/download/sdk/v1/inTrack-sw.min.js');
}

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Read config from URL query params set during registration
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

messaging.onBackgroundMessage((payload) => {
  if (payload?.data?.source === '$inTrack') return;
  console.log('[SW] Background message received:', payload);
});
```

When registering the SW from your page (see Part 4), you will append the config as query parameters:

```javascript
const swUrl = new URL('/firebase-messaging-sw.js', window.location.origin);
swUrl.searchParams.set('apiKey',            firebaseConfig.apiKey);
swUrl.searchParams.set('authDomain',        firebaseConfig.authDomain);
swUrl.searchParams.set('projectId',         firebaseConfig.projectId);
swUrl.searchParams.set('storageBucket',     firebaseConfig.storageBucket);
swUrl.searchParams.set('messagingSenderId', firebaseConfig.messagingSenderId);
swUrl.searchParams.set('appId',             firebaseConfig.appId);

const registration = await navigator.serviceWorker.register(swUrl.toString());
```

---

### Step 7: Serve the SW file with no-cache headers

**This step is critical.** By default, browsers and CDNs (like Cloudflare) may cache your service worker. If they serve a stale version, push notifications will break silently.

Set `Cache-Control: no-cache, no-store, must-revalidate` on the SW file.

**Nginx:**
```nginx
location = /firebase-messaging-sw.js {
  add_header Cache-Control "no-cache, no-store, must-revalidate";
  add_header Pragma "no-cache";
  add_header Expires "0";
}
```

**Apache:**
```apache
<Files "firebase-messaging-sw.js">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
</Files>
```

**Express.js:**
```javascript
app.get('/firebase-messaging-sw.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'firebase-messaging-sw.js'));
});
```

**Next.js (`next.config.js`):**
```javascript
async headers() {
  return [
    {
      source: '/firebase-messaging-sw.js',
      headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
    },
  ];
},
```

> **If you use Cloudflare:** Turn on a Page Rule or Cache Rule for `*/firebase-messaging-sw.js` with "Cache Level: Bypass" to prevent Cloudflare from caching the SW file.

---

## Part 4 — Client-side Integration

### Step 8: Install the Firebase JS SDK

```bash
npm install firebase
```

If you are not using a build tool, you can use the CDN version instead (see [Firebase CDN docs](https://firebase.google.com/docs/web/setup#use-cdn)).

### Step 9: Get the FCM token and send it to inTrack

This code runs in the browser (your page, not the service worker). It:
1. Initializes the Firebase app
2. Registers the service worker
3. Asks the browser for notification permission (if not already granted)
4. Gets the FCM token
5. Passes the token to inTrack

```javascript
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_AUTH_DOMAIN',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId:             'YOUR_APP_ID',
};

const VAPID_KEY = 'YOUR_FIREBASE_VAPID_KEY';

async function subscribeToWebPush() {
  // Avoid re-initializing Firebase if it was already initialized
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  // Register the service worker
  // Using Option A (hardcoded config): simple path
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

  // Using Option B (URL params): build the URL with config
  // const swUrl = new URL('/firebase-messaging-sw.js', window.location.origin);
  // Object.entries(firebaseConfig).forEach(([k, v]) => swUrl.searchParams.set(k, v));
  // const registration = await navigator.serviceWorker.register(swUrl.toString());

  // Get FCM token — this will trigger the browser's permission prompt
  // if the user hasn't been asked yet.
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (token) {
    // Send the token to inTrack — this is the only inTrack call needed.
    // Do NOT call InitWebPush() in Firebase mode.
    Intk('sendFireBaseToken', token);
    console.log('FCM token sent to inTrack:', token);
  } else {
    // This happens when the user has blocked notifications,
    // or when the browser cannot obtain a token.
    console.log('No FCM token — notification permission may be denied.');
  }
}
```

Call `subscribeToWebPush()` at the right moment — for example, when the user clicks a "Subscribe" button, rather than on page load. Browsers block automatic permission prompts.

### Step 10: Handle errors

```javascript
async function subscribeToWebPush() {
  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const messaging = getMessaging(app);
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      Intk('sendFireBaseToken', token);
    } else {
      console.warn('Push permission not granted or token unavailable.');
    }
  } catch (err) {
    if (err.code === 'messaging/permission-blocked') {
      console.warn('User has blocked notification permissions.');
    } else {
      console.error('Error subscribing to web push:', err);
    }
  }
}
```

---

## Common Errors and How to Fix Them

| Error | Cause | Fix |
|---|---|---|
| `messaging/permission-blocked` | User blocked notifications | Can't get token — show a UI guide on how to re-enable |
| SW not found (404) | `/firebase-messaging-sw.js` is not at domain root | Move the file or add a route to serve it at `/firebase-messaging-sw.js` |
| `o.init is not a function` | Wrong variable names in inTrack IIFE | Use `InTrack`/`Intk` (no dollar sign) — see Part 1 snippet |
| `getDeviceId()` returns nothing | inTrack SDK not fully initialized | Wait until `InTrack.init()` has been called before reading device ID |
| Old SW version still active | Browser or Cloudflare cached the SW file | Add `Cache-Control: no-cache` header to the SW file (Step 7) |
| Token obtained but push not delivered | VAPID key mismatch | VAPID key must be the Web Push certificate from Firebase, not the server key |
| Background messages showing twice | Your `onBackgroundMessage` and inTrack both handling the same message | Add the `payload?.data?.source === '$inTrack'` guard (Step 6) |

---

## Full Working Example (Option A — Hardcoded config)

**File 1: `/firebase-messaging-sw.js`** (at domain root)

```javascript
if ('function' === typeof importScripts) {
  importScripts('https://static1.intrack.ir/api/web/download/sdk/v1/inTrack-sw.min.js');
}
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSy...',
  authDomain:        'your-project.firebaseapp.com',
  projectId:         'your-project-id',
  storageBucket:     'your-project.appspot.com',
  messagingSenderId: '123456789012',
  appId:             '1:123456789012:web:abcdef',
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  if (payload?.data?.source === '$inTrack') return;
  // Your custom background message handling here
});
```

**File 2: `index.html`** (or any page)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Site</title>

  <!-- 1. inTrack SDK (async) -->
  <script type="text/javascript">
    var inTrack_config = {
      app_key:     'YOUR_INTRACK_APP_KEY',
      auth_key:    'YOUR_INTRACK_AUTH_KEY',
      environment: 'production',
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

  <!-- 2. Firebase SDK (module) -->
  <script type="module">
    import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
    import { getMessaging, getToken } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js';

    const firebaseConfig = {
      apiKey:            'AIzaSy...',
      authDomain:        'your-project.firebaseapp.com',
      projectId:         'your-project-id',
      storageBucket:     'your-project.appspot.com',
      messagingSenderId: '123456789012',
      appId:             '1:123456789012:web:abcdef',
    };

    const VAPID_KEY = 'BN...your-vapid-key...';

    document.getElementById('subscribe-btn').addEventListener('click', async () => {
      try {
        const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
        const messaging = getMessaging(app);
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (token) {
          // Hand the token to inTrack — this is all inTrack needs.
          Intk('sendFireBaseToken', token);
          alert('Subscribed to notifications!');
        } else {
          alert('Permission not granted.');
        }
      } catch (err) {
        console.error('Push subscription failed:', err);
      }
    });
  </script>
</body>
</html>
```

---

## Testing Checklist

- [ ] Website is served over HTTPS
- [ ] `/firebase-messaging-sw.js` is accessible at `https://yourdomain.com/firebase-messaging-sw.js`
- [ ] SW file returns `Cache-Control: no-cache` (check in browser DevTools → Network)
- [ ] In DevTools → Application → Service Workers: service worker is registered and active
- [ ] Browser console shows no errors after clicking Subscribe
- [ ] `InTrack.getDeviceId()` returns a non-empty string in the console (confirms SDK is initialized)
- [ ] Notification permission prompt appears and can be accepted
- [ ] Test push sent from inTrack dashboard is received
