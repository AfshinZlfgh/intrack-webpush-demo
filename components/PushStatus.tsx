import type { PushSubscriptionStatus } from '@/lib/types';

type Status = PushSubscriptionStatus | 'loading' | 'unavailable';

const config: Record<Status, { label: string; classes: string }> = {
  subscribed:   { label: 'Subscribed',       classes: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  unsubscribed: { label: 'Unsubscribed',     classes: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  denied:       { label: 'Denied by user',   classes: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  canceled:     { label: 'Dismissed (Later)',classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  no_init:      { label: 'Not initialized',  classes: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  loading:      { label: 'Checking…',        classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  unavailable:  { label: 'Unavailable',      classes: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500' },
};

export function PushStatus({ status }: { status: Status }) {
  const { label, classes } = config[status] ?? config.unavailable;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}
