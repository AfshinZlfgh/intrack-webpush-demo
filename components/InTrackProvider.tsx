'use client';

import Script from 'next/script';
import { createContext, useContext, useEffect, useState } from 'react';
import type { InTrackConfig } from '@/lib/types';

type SDKState = 'loading' | 'ready' | 'error';

const InTrackContext = createContext<{ sdkReady: boolean; sdkError: boolean; configMissing: boolean }>({
  sdkReady: false,
  sdkError: false,
  configMissing: false,
});

export function useInTrack() {
  return useContext(InTrackContext);
}

export function InTrackProvider({ children }: { children: React.ReactNode }) {
  const configMissing =
    !process.env.NEXT_PUBLIC_INTRACK_APP_KEY ||
    !process.env.NEXT_PUBLIC_INTRACK_AUTH_KEY ||
    !process.env.NEXT_PUBLIC_INTRACK_PUBLIC_KEY;

  const [state, setState] = useState<SDKState>(configMissing ? 'error' : 'loading');

  // Listen for custom events dispatched from the IIFE's s.onload / s.onerror,
  // which fire after the inTrack CDN script has actually loaded.
  useEffect(() => {
    if (configMissing) return;

    const onReady = () => setState('ready');
    const onError = () => setState('error');

    window.addEventListener('intrack:ready', onReady);
    window.addEventListener('intrack:error', onError);

    return () => {
      window.removeEventListener('intrack:ready', onReady);
      window.removeEventListener('intrack:error', onError);
    };
  }, [configMissing]);

  const config: InTrackConfig = {
    app_key: process.env.NEXT_PUBLIC_INTRACK_APP_KEY ?? '',
    auth_key: process.env.NEXT_PUBLIC_INTRACK_AUTH_KEY ?? '',
    public_key: process.env.NEXT_PUBLIC_INTRACK_PUBLIC_KEY ?? '',
    environment: (process.env.NEXT_PUBLIC_INTRACK_ENV as 'production' | 'stage') ?? 'production',
    debug: process.env.NEXT_PUBLIC_INTRACK_DEBUG === 'true',
    sw_path: '/sw.js',
  };

  return (
    <InTrackContext.Provider value={{ sdkReady: state === 'ready', sdkError: state === 'error', configMissing }}>
      {!configMissing && (
        <Script
          id="intrack-sdk"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              var inTrack_config = ${JSON.stringify(config)};
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
