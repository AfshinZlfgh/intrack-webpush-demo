import Link from 'next/link';

const sections = [
  {
    href: '/push/vapid',
    title: 'Push: VAPID Mode',
    description:
      'inTrack manages the VAPID key pair. Call InitWebPush() and inTrack handles permission, subscription, and token delivery.',
    badge: 'Mode A',
    borderColor: 'border-blue-200 dark:border-blue-800',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  {
    href: '/push/firebase',
    title: 'Push: Firebase Mode',
    description:
      'You own a Firebase project. Get an FCM token via Firebase SDK and pass it to inTrack via sendFireBaseToken(). No InitWebPush() call needed.',
    badge: 'Mode B',
    borderColor: 'border-purple-200 dark:border-purple-800',
    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
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
  const hasKeys = !!(
    process.env.NEXT_PUBLIC_INTRACK_APP_KEY &&
    process.env.NEXT_PUBLIC_INTRACK_AUTH_KEY &&
    process.env.NEXT_PUBLIC_INTRACK_PUBLIC_KEY
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">inTrack WebPush Demo</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
          A Next.js reference project demonstrating inTrack Web SDK integration — two web push
          modes, user identification, and custom event tracking.
        </p>
      </div>

      {!hasKeys && (
        <div className="rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-4">
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
            inTrack SDK keys not configured
          </p>
          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
            Copy <code className="font-mono text-xs">.env.example</code> to{' '}
            <code className="font-mono text-xs">.env.local</code> and fill in your{' '}
            <code className="font-mono text-xs">NEXT_PUBLIC_INTRACK_*</code> keys from{' '}
            <strong>dash.intrack.ir → Settings → SDK → Initialize</strong>.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map(({ href, title, description, badge, borderColor, badgeColor }) => (
          <Link
            key={href}
            href={href}
            className={`block rounded-lg border-2 ${borderColor} bg-white dark:bg-gray-900 p-5 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
              <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>
                {badge}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Setup Checklist</h2>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex gap-2">
            <span className={hasKeys ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
              {hasKeys ? '✓' : '○'}
            </span>
            <span>
              Set <code className="font-mono text-xs">NEXT_PUBLIC_INTRACK_*</code> keys in{' '}
              <code className="font-mono text-xs">.env.local</code>
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
              page (no env vars needed)
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
