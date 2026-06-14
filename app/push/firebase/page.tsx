'use client';

import { useEffect, useState } from 'react';
import { useInTrack } from '@/components/InTrackProvider';
import { FirebaseConfigForm } from '@/components/FirebaseConfigForm';
import { PushStatus } from '@/components/PushStatus';
import { CodeBlock } from '@/components/CodeBlock';
import {
  type FirebaseConfig,
  getStoredFirebaseConfig,
  clearFirebaseConfig,
  getFCMToken,
  maskValue,
} from '@/lib/firebase';
import { sendFirebaseToken } from '@/lib/intrack';

const CODE_FIREBASE = `// Mode B: Firebase FCM integration with inTrack

// 1. firebase-messaging-sw.js (served at domain root)
//    Reads Firebase config from URL query params — no hardcoding needed.
if ('function' === typeof importScripts) {
  importScripts('https://static1.intrack.ir/api/web/download/sdk/v1/inTrack-sw.min.js');
}
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);
firebase.initializeApp({
  apiKey:            params.get('apiKey'),
  projectId:         params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId:             params.get('appId'),
  // ... other fields
});
const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  if (payload?.data?.source === '$inTrack') return; // let inTrack handle it
});

// 2. In your React component (client-side)
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Register SW with config in URL so the SW can read it
const swUrl = new URL('/firebase-messaging-sw.js', window.location.origin);
Object.entries(firebaseConfig).forEach(([k, v]) => swUrl.searchParams.set(k, v));
const registration = await navigator.serviceWorker.register(swUrl.toString());

const token = await getToken(messaging, {
  vapidKey: 'YOUR_FIREBASE_VAPID_KEY',
  serviceWorkerRegistration: registration,
});

// 3. Hand the FCM token to inTrack (do NOT call InitWebPush in this mode)
Intk('sendFireBaseToken', token);`;

export default function FirebasePushPage() {
  const { sdkReady, sdkError, configMissing } = useInTrack();
  const [config, setConfig] = useState<FirebaseConfig | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pushError, setPushError] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setConfig(getStoredFirebaseConfig());
    setHydrated(true);
  }, []);

  const handleConfigSaved = (cfg: FirebaseConfig) => setConfig(cfg);

  const handleClearConfig = () => {
    clearFirebaseConfig();
    setConfig(null);
    setToken(null);
    setPushStatus('idle');
  };

  const handleSubscribe = async () => {
    if (!config || !sdkReady) return;
    setPushStatus('loading');
    setPushError('');
    try {
      const fcmToken = await getFCMToken(config);
      setToken(fcmToken);
      sendFirebaseToken(fcmToken);
      setPushStatus('success');
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Unknown error');
      setPushStatus('error');
    }
  };

  if (!hydrated) return null;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Push: Firebase Mode</h1>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
            Mode B
          </span>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          You own the Firebase project. Get an FCM token via Firebase SDK and pass it to inTrack via{' '}
          <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
            sendFireBaseToken()
          </code>
          . Do <strong>not</strong> call <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">InitWebPush()</code> in this mode.
        </p>
      </div>

      {configMissing && (
        <div className="rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-4 text-sm text-yellow-800 dark:text-yellow-300">
          inTrack SDK keys are not configured. Set{' '}
          <code className="font-mono text-xs">NEXT_PUBLIC_INTRACK_*</code> in{' '}
          <code className="font-mono text-xs">.env.local</code> and restart the server.
        </div>
      )}

      {/* Firebase config section */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
        {!config ? (
          <FirebaseConfigForm onSaved={handleConfigSaved} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">Firebase Config</h2>
              <button
                onClick={handleClearConfig}
                className="text-xs text-red-600 dark:text-red-400 hover:underline"
              >
                Clear / Edit
              </button>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {(
                [
                  ['Project ID', config.projectId],
                  ['App ID', maskValue(config.appId)],
                  ['Sender ID', maskValue(config.messagingSenderId)],
                  ['VAPID Key', maskValue(config.vapidKey)],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <dt className="text-gray-500 dark:text-gray-400 shrink-0">{label}:</dt>
                  <dd className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      {/* Subscribe section */}
      {config && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Push Subscription</h2>

          <div className="flex items-center gap-3 flex-wrap">
            <PushStatus
              status={
                pushStatus === 'success'
                  ? 'subscribed'
                  : pushStatus === 'loading'
                  ? 'loading'
                  : pushStatus === 'error'
                  ? 'denied'
                  : 'unsubscribed'
              }
            />
          </div>

          {token && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">FCM Token (sent to inTrack):</p>
              <p className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all bg-gray-50 dark:bg-gray-800 p-2 rounded">
                {maskValue(token)}
              </p>
            </div>
          )}

          {pushError && (
            <p className="text-sm text-red-600 dark:text-red-400">{pushError}</p>
          )}

          {sdkError && !configMissing && (
            <p className="text-sm text-red-600 dark:text-red-400">
              inTrack SDK failed to load. Check your network and SDK keys.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSubscribe}
              disabled={!sdkReady || pushStatus === 'loading'}
              className="px-4 py-2 text-sm font-medium rounded-md bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            >
              {pushStatus === 'loading' ? 'Getting token…' : 'Get FCM Token & Subscribe'}
            </button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>
              This calls <code className="font-mono">getToken(messaging)</code> from Firebase SDK,
              registers <code className="font-mono">firebase-messaging-sw.js</code> with your config
              in the URL, then passes the FCM token to inTrack.
            </p>
            <p>
              The browser will ask for notification permission if not already granted.
            </p>
          </div>
        </div>
      )}

      <CodeBlock code={CODE_FIREBASE} title="Implementation — Firebase Mode (Mode B)" />
    </div>
  );
}
