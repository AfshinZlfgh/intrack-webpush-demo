'use client';

import Link from 'next/link';
import { useInTrack } from '@/components/InTrackProvider';
import type { PanelType } from '@/lib/demoConfig';

const sections: {
  href: string;
  title: string;
  description: string;
  badge: string;
  borderColor: string;
  badgeColor: string;
  pushFor?: PanelType;
}[] = [
  {
    href: '/push/vapid',
    title: 'Push: VAPID Mode',
    description:
      'inTrack manages the VAPID key pair. Call InitWebPush() and inTrack handles permission, subscription, and token delivery.',
    badge: 'Mode A',
    borderColor: 'border-blue-200 dark:border-blue-800',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    pushFor: 'vapid',
  },
  {
    href: '/push/firebase',
    title: 'Push: Firebase Mode',
    description:
      'You own a Firebase project. Get an FCM token via Firebase SDK and pass it to inTrack via sendFireBaseToken(). No InitWebPush() call needed.',
    badge: 'Mode B',
    borderColor: 'border-purple-200 dark:border-purple-800',
    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    pushFor: 'firebase',
  },
  {
    href: '/users',
    title: 'User Identification',
    description:
      'Assign a userId to anonymous visitors via login(). Update profiles, logout, and inspect deviceId / userId.',
    badge: 'SDK',
    borderColor: 'border-green-200 dark:border-green-800',
    badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  },
  {
    href: '/events',
    title: 'Custom Events',
    description:
      'Track user actions with sendEvent(). Pass an event name and an arbitrary JSON payload.',
    badge: 'SDK',
    borderColor: 'border-orange-200 dark:border-orange-800',
    badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  },
];

export default function Home() {
  const { hydrated, configured, panelType } = useInTrack();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">inTrack WebPush Demo</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
          A Next.js reference project demonstrating inTrack Web SDK integration — two web push
          modes, user identification, and custom event tracking.
        </p>
      </div>

      {/* Setup status — credentials live in the browser, not .env */}
      {hydrated && !configured && (
        <div className="rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-4">
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
            Demo not configured yet
          </p>
          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
            Head to{' '}
            <Link href="/setup" className="underline font-medium">
              Setup
            </Link>{' '}
            to choose your panel type (VAPID or Firebase) and enter your inTrack credentials. Nothing
            is read from <code className="font-mono text-xs">.env</code>.
          </p>
        </div>
      )}

      {hydrated && configured && panelType && (
        <div className="rounded-lg border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 p-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-green-800 dark:text-green-300">
            Configured as{' '}
            <strong>{panelType === 'vapid' ? 'VAPID (Mode A)' : 'Firebase (Mode B)'}</strong>. Your
            panel type is highlighted below.
          </p>
          <Link
            href="/setup"
            className="text-sm font-medium text-green-700 dark:text-green-400 underline shrink-0"
          >
            Edit / reset
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map(({ href, title, description, badge, borderColor, badgeColor, pushFor }) => {
          const isSelectedPanel = hydrated && pushFor != null && pushFor === panelType;
          const isOtherPanel = hydrated && pushFor != null && panelType != null && pushFor !== panelType;

          return (
            <Link
              key={href}
              href={href}
              className={`block rounded-lg border-2 ${borderColor} bg-white dark:bg-gray-900 p-5 transition-all ${
                isSelectedPanel
                  ? 'ring-2 ring-blue-500/50 shadow-md'
                  : isOtherPanel
                  ? 'opacity-60 hover:opacity-100 hover:shadow-md'
                  : 'hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  {title}
                  {isSelectedPanel && (
                    <span className="ml-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                      ● Your panel
                    </span>
                  )}
                </h2>
                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>
                  {badge}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>
              {isOtherPanel && (
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  Not your panel type — shown for reference.
                </p>
              )}
            </Link>
          );
        })}
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Setup Checklist</h2>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex gap-2">
            <span className={configured ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
              {configured ? '✓' : '○'}
            </span>
            <span>
              Complete{' '}
              <Link href="/setup" className="text-blue-600 dark:text-blue-400 underline">
                Setup
              </Link>{' '}
              — choose panel type and enter inTrack credentials (stored in this browser)
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-gray-400">○</span>
            <span>Register your production domain with the inTrack team (required for production mode)</span>
          </li>
          <li className="flex gap-2">
            <span className="text-gray-400">○</span>
            <span>
              Serve the app over HTTPS — Cloudflare proxy, nginx + Let&apos;s Encrypt, or{' '}
              <code className="font-mono text-xs">next dev --experimental-https</code> for local testing
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-gray-400">○</span>
            <span>
              For Firebase mode: enter your Firebase project config on the{' '}
              <Link href="/push/firebase" className="text-blue-600 dark:text-blue-400 underline">
                Push: Firebase
              </Link>{' '}
              page
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
