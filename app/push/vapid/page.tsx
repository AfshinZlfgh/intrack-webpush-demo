'use client';

import { useEffect, useState } from 'react';
import { useInTrack } from '@/components/InTrackProvider';
import { PushStatus } from '@/components/PushStatus';
import { CodeBlock } from '@/components/CodeBlock';
import { getSubscriptionStatus, initWebPush, unsubscribeWebPush } from '@/lib/intrack';
import type { WebPushConfig, PushSubscriptionStatus } from '@/lib/types';

const webPushConfig: WebPushConfig = {
  subscriptionStyle: {
    subscriptionTheme: 1,
    subscriptionThemePos: 1,
    subscriptionBtnAllowTxt: 'Allow',
    subscriptionBtnAllowColor: '#2563eb',
    subscriptionBtnAllowTxtColor: '#ffffff',
    subscriptionBtnDenyTxt: 'Later',
    subscriptionBtnDenyColor: '#e5e7eb',
    subscriptionBtnDenyTxtColor: '#6b7280',
    subscriptionTitle: 'Stay up to date!',
    subscriptionMessage: 'Allow push notifications to receive the latest updates.',
    subscriptionBoxDelay: 2000,
  },
  isRTL: false,
  askAgainAfterDays: 7,
  widget: {
    enable: true,
    enableUnsubs: true,
    color: '#2563eb',
    style: { position: 'right', tickerRight: 20, tickerBottom: 20 },
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

const CODE_INIT = `// 1. Host inTrack SW at your domain root:
//    https://static1.intrack.ir/api/web/download/sdk/v1/sw.js
//    → serve at https://your-domain.com/sw.js

// 2. Init SDK (async snippet in layout.tsx / <head>)
var $inTrack_config = {
  app_key: 'YOUR_APP_KEY',
  auth_key: 'YOUR_AUTH_KEY',
  public_key: 'YOUR_PUBLIC_KEY',
  environment: 'production',
  sw_path: '/sw.js',
};

// 3. Call InitWebPush after SDK is loaded
$Intk('InitWebPush', {
  subscriptionStyle: {
    subscriptionTheme: 1,
    subscriptionBtnAllowTxt: 'Allow',
    subscriptionBtnDenyTxt: 'Later',
    subscriptionTitle: 'Stay up to date!',
    subscriptionMessage: 'Allow push notifications.',
  },
  isRTL: false,
  askAgainAfterDays: 7,
  widget: { enable: true, enableUnsubs: true },
});

// 4. Check status
$Intk('SubscriptionWebPushInfo', (status) => {
  console.log('Push status:', status);
  // 'subscribed' | 'unsubscribed' | 'denied' | 'canceled' | 'no_init'
});

// 5. Unsubscribe
$Intk('UnsubscribeWebPush');`;

export default function VapidPage() {
  const { sdkReady, sdkError, configMissing } = useInTrack();
  const [status, setStatus] = useState<PushSubscriptionStatus | 'loading' | 'unavailable'>('loading');
  const [initialized, setInitialized] = useState(false);
  const [widgetEnabled, setWidgetEnabled] = useState(true);

  useEffect(() => {
    if (!sdkReady || initialized) return;
    initWebPush(webPushConfig);
    setInitialized(true);
    getSubscriptionStatus().then(setStatus);
  }, [sdkReady, initialized]);

  const refreshStatus = () => {
    if (!sdkReady) return;
    setStatus('loading');
    getSubscriptionStatus().then(setStatus);
  };

  const handleUnsubscribe = () => {
    unsubscribeWebPush();
    setTimeout(refreshStatus, 1000);
  };

  const toggleWidget = () => {
    const next = !widgetEnabled;
    setWidgetEnabled(next);
    initWebPush({ ...webPushConfig, widget: { ...webPushConfig.widget, enable: next } });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Push: VAPID Mode</h1>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            Mode A
          </span>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          inTrack manages VAPID keys and subscription lifecycle. You call{' '}
          <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
            InitWebPush()
          </code>{' '}
          once — inTrack handles the rest.
        </p>
      </div>

      {configMissing && (
        <div className="rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-4 text-sm text-yellow-800 dark:text-yellow-300">
          inTrack SDK keys are not configured. Set{' '}
          <code className="font-mono text-xs">NEXT_PUBLIC_INTRACK_*</code> in{' '}
          <code className="font-mono text-xs">.env.local</code> and restart the server.
        </div>
      )}

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Subscription Status</h2>

        <div className="flex items-center gap-3 flex-wrap">
          <PushStatus status={status} />
          {sdkReady && !configMissing && (
            <button
              onClick={refreshStatus}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Refresh
            </button>
          )}
        </div>

        {!sdkReady && !configMissing && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading inTrack SDK…</p>
        )}

        {sdkError && !configMissing && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load inTrack SDK. Check your network connection and SDK keys.
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            onClick={refreshStatus}
            disabled={!sdkReady}
            className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            Subscribe (trigger prompt)
          </button>
          <button
            onClick={handleUnsubscribe}
            disabled={!sdkReady || status !== 'subscribed'}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 transition-colors"
          >
            Unsubscribe
          </button>
          <button
            onClick={toggleWidget}
            disabled={!sdkReady}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 transition-colors"
          >
            {widgetEnabled ? 'Hide' : 'Show'} Bell Widget
          </button>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 pt-1 space-y-1">
          <p>
            <strong>Subscribe:</strong> Calls <code className="font-mono">InitWebPush()</code> which
            triggers the inTrack permission prompt (2-step opt-in by default).
          </p>
          <p>
            <strong>Bell widget:</strong> The floating bell icon in the bottom-right corner (enabled
            by default on this page via <code className="font-mono">widget.enable: true</code>).
          </p>
          <p>
            <strong>Note:</strong> Push requires HTTPS. If running on localhost, use{' '}
            <code className="font-mono">next dev --experimental-https</code>.
          </p>
        </div>
      </div>

      <CodeBlock code={CODE_INIT} title="Implementation — VAPID Mode" />
    </div>
  );
}
