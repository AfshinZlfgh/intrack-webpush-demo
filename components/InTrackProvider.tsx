'use client';

import Script from 'next/script';
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { InTrackConfig } from '@/lib/types';
import {
  type PanelType,
  getDemoConfigSnapshot,
  subscribeDemoConfig,
} from '@/lib/demoConfig';

type SDKState = 'loading' | 'ready' | 'error';

interface InTrackContextValue {
  /** localStorage has been read on the client (avoids SSR/hydration guessing). */
  hydrated: boolean;
  /** A panel type is chosen and the required inTrack credentials are present. */
  configured: boolean;
  /** The chosen panel type, or null until the demo is set up. */
  panelType: PanelType | null;
  sdkReady: boolean;
  sdkError: boolean;
  /** Backwards-compatible alias: true once hydrated and not yet configured. */
  configMissing: boolean;
}

const InTrackContext = createContext<InTrackContextValue>({
  hydrated: false,
  configured: false,
  panelType: null,
  sdkReady: false,
  sdkError: false,
  configMissing: false,
});

export function useInTrack() {
  return useContext(InTrackContext);
}

// Stable references for useSyncExternalStore.
const noopSubscribe = () => () => {};
const getServerConfig = () => null;

export function InTrackProvider({ children }: { children: React.ReactNode }) {
  // Subscribe to the localStorage-backed demo config. Server snapshot is null, so
  // SSR and the first client render agree; React re-renders post-hydration.
  const demoConfig = useSyncExternalStore(subscribeDemoConfig, getDemoConfigSnapshot, getServerConfig);
  // True only after hydration — lets consumers avoid flashing "not configured".
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const [state, setState] = useState<SDKState>('loading');

  // The inTrack CDN script dispatches these once it has actually loaded/failed.
  // setState only happens inside the event callbacks, never synchronously here.
  useEffect(() => {
    if (!demoConfig) return;
    const onReady = () => setState('ready');
    const onError = () => setState('error');
    window.addEventListener('intrack:ready', onReady);
    window.addEventListener('intrack:error', onError);
    return () => {
      window.removeEventListener('intrack:ready', onReady);
      window.removeEventListener('intrack:error', onError);
    };
  }, [demoConfig]);

  const configured = demoConfig !== null;

  const sdkConfig: InTrackConfig | null = useMemo(() => {
    if (!demoConfig) return null;
    const { credentials } = demoConfig;
    return {
      app_key: credentials.app_key,
      auth_key: credentials.auth_key,
      public_key: credentials.public_key, // '' for Firebase panels — unused there
      environment: credentials.environment,
      debug: credentials.debug,
      sw_path: '/sw.js',
    };
  }, [demoConfig]);

  const value: InTrackContextValue = {
    hydrated,
    configured,
    panelType: demoConfig?.panelType ?? null,
    sdkReady: state === 'ready',
    sdkError: state === 'error',
    configMissing: hydrated && !configured,
  };

  return (
    <InTrackContext.Provider value={value}>
      {sdkConfig && (
        <Script
          // Keyed by credentials so switching panels/keys re-injects a fresh init.
          id="intrack-sdk"
          key={`${sdkConfig.app_key}:${sdkConfig.environment}`}
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              var inTrack_config = ${JSON.stringify(sdkConfig)};
              (function(i,n,t,r,a,c){
                o=i['InTrack']=i['InTrack']||{};
                i[a]=i[a]||function(){(o.q=o.q||[]).push(arguments);};
                s=n.createElement(t);s.async=true;s.src=r;
                s.onload=function(){
                  o.init(c);
                  window.dispatchEvent(new Event('intrack:ready'));
                };
                s.onerror=function(){
                  window.dispatchEvent(new Event('intrack:error'));
                };
                e=n.getElementsByTagName(t)[0];e.parentNode.insertBefore(s,e);
              })(window,document,'script',
                '//static1.intrack.ir/api/web/download/sdk/v1/inTrack.min.js?v=00',
                'Intk',inTrack_config);
            `,
          }}
        />
      )}
      {children}
    </InTrackContext.Provider>
  );
}
