'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useInTrack } from '@/components/InTrackProvider';
import type { PanelType } from '@/lib/demoConfig';

const links: { href: string; label: string; pushFor?: PanelType }[] = [
  { href: '/', label: 'Home' },
  { href: '/setup', label: 'Setup' },
  { href: '/push/vapid', label: 'Push: VAPID', pushFor: 'vapid' },
  { href: '/push/firebase', label: 'Push: Firebase', pushFor: 'firebase' },
  { href: '/users', label: 'Users' },
  { href: '/events', label: 'Events' },
];

export function Nav() {
  const pathname = usePathname();
  const { hydrated, panelType } = useInTrack();

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 h-14">
        <span className="font-semibold text-gray-900 dark:text-white mr-4 shrink-0">
          inTrack Demo
        </span>
        {links.map(({ href, label, pushFor }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);

          // Emphasis only applies once we know the configured panel type.
          const isSelectedPanel = hydrated && pushFor != null && pushFor === panelType;
          const isOtherPanel = hydrated && pushFor != null && panelType != null && pushFor !== panelType;

          return (
            <Link
              key={href}
              href={href}
              title={
                isOtherPanel
                  ? 'Not your panel type — shown for reference'
                  : isSelectedPanel
                  ? 'Your panel type'
                  : undefined
              }
              className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : isSelectedPanel
                  ? 'text-gray-900 font-semibold dark:text-white'
                  : isOtherPanel
                  ? 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {label}
              {isSelectedPanel && (
                <span
                  className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-blue-500 align-middle"
                  aria-label="active panel type"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
