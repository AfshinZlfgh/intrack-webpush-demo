import Link from 'next/link';

export default function PushOverview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Web Push Modes</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          inTrack supports two ways to integrate web push. Choose the one that matches your setup.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Feature</th>
              <th className="px-4 py-3 text-left font-medium text-blue-700 dark:text-blue-300">Mode A — VAPID</th>
              <th className="px-4 py-3 text-left font-medium text-purple-700 dark:text-purple-300">Mode B — Firebase</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
            {[
              ['Who manages VAPID keys', 'inTrack (automatic)', 'Firebase (you own the project)'],
              ['Main SDK call', 'InitWebPush(config)', 'sendFireBaseToken(token)'],
              ['Service worker', 'sw.js (inTrack CDN)', 'firebase-messaging-sw.js + inTrack import'],
              ['Firebase project needed', 'No', 'Yes'],
              ['Best for', 'Quickest integration', 'Already using Firebase / FCM'],
            ].map(([feature, modeA, modeB]) => (
              <tr key={feature}>
                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">{feature}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{modeA}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{modeB}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/push/vapid"
          className="block rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Mode A — VAPID</h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              Try it →
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Uses <code className="font-mono text-xs">InitWebPush()</code>. inTrack SDK handles all
            subscription logic. Fastest path to get push working.
          </p>
        </Link>

        <Link
          href="/push/firebase"
          className="block rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Mode B — Firebase</h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              Try it →
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Uses Firebase JS SDK to get an FCM token, then calls{' '}
            <code className="font-mono text-xs">sendFireBaseToken(token)</code>. Enter your Firebase
            config in the browser — no env vars needed.
          </p>
        </Link>
      </div>
    </div>
  );
}
