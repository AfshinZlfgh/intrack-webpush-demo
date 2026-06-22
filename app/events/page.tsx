'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useInTrack } from '@/components/InTrackProvider';
import { CodeBlock } from '@/components/CodeBlock';
import { sendCustomEvent } from '@/lib/intrack';
import type { InTrackEvent } from '@/lib/types';

interface SentEvent {
  name: string;
  data: Record<string, unknown>;
  ts: string;
}

const PREBUILT: { label: string; event: InTrackEvent }[] = [
  {
    label: 'Page View',
    event: { eventName: 'page_view', eventData: { page: '/home', source: 'organic' } },
  },
  {
    label: 'Add to Cart',
    event: {
      eventName: 'add_to_cart',
      eventData: { productId: 'sku_001', name: 'Demo Product', price: 29.99, quantity: 1 },
    },
  },
  {
    label: 'Purchase',
    event: {
      eventName: 'purchase',
      eventData: { orderId: 'ord_12345', total: 59.98, currency: 'USD', itemCount: 2 },
    },
  },
  {
    label: 'Sign Up',
    event: { eventName: 'sign_up', eventData: { method: 'email', plan: 'free' } },
  },
];

const CODE_EVENTS = `// Custom Event Tracking

// Basic event
Intk('sendEvent', {
  eventName: 'page_view',
  eventData: {
    page: '/home',
    source: 'organic',
  },
});

// Event with userId (logs in the user if not already)
Intk('sendEvent', {
  userId: 'user_abc123',
  eventName: 'add_to_cart',
  eventData: {
    productId: 'sku_001',
    name: 'Demo Product',
    price: 29.99,
    quantity: 1,
  },
});

// Guidelines:
// - eventName: alphanumeric + hyphens/underscores only
// - eventData keys: max 50 characters
// - eventData values: String, Number, Boolean, or ISO-8601 Date string
// - The first value sent defines the type for that attribute going forward`;

export default function EventsPage() {
  const { sdkReady, sdkError, configMissing } = useInTrack();
  const [eventName, setEventName] = useState('');
  const [pairs, setPairs] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);
  const [sentEvents, setSentEvents] = useState<SentEvent[]>([]);
  const [feedback, setFeedback] = useState('');

  const flash = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 2500);
  };

  const updatePair = (i: number, field: 'key' | 'value', val: string) => {
    setPairs((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));
  };

  const addPair = () => setPairs((p) => [...p, { key: '', value: '' }]);
  const removePair = (i: number) => setPairs((p) => p.filter((_, idx) => idx !== i));

  const send = (eventData?: InTrackEvent) => {
    if (!sdkReady) return;

    if (eventData) {
      sendCustomEvent(eventData);
      setSentEvents((prev) => [
        { name: eventData.eventName, data: eventData.eventData ?? {}, ts: new Date().toLocaleTimeString() },
        ...prev,
      ]);
      flash(`Sent: ${eventData.eventName}`);
      return;
    }

    const name = eventName.trim();
    if (!name) return flash('Event name is required');

    const data: Record<string, unknown> = {};
    for (const { key, value } of pairs) {
      if (key.trim()) {
        const num = Number(value);
        if (value === 'true') data[key.trim()] = true;
        else if (value === 'false') data[key.trim()] = false;
        else if (!isNaN(num) && value !== '') data[key.trim()] = num;
        else data[key.trim()] = value;
      }
    }

    sendCustomEvent({ eventName: name, eventData: data });
    setSentEvents((prev) => [
      { name, data, ts: new Date().toLocaleTimeString() },
      ...prev,
    ]);
    flash(`Sent: ${name}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Custom Events</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Track user actions by calling{' '}
          <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">sendEvent()</code>{' '}
          with an event name and an optional JSON payload. Events appear in your inTrack dashboard in real time.
        </p>
      </div>

      {configMissing && (
        <div className="rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-4 text-sm text-yellow-800 dark:text-yellow-300">
          inTrack SDK keys are not configured. Go to{' '}
          <Link href="/setup" className="underline font-medium">Setup</Link> to enter your credentials.
        </div>
      )}

      {feedback && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 px-4 py-2 text-sm text-green-800 dark:text-green-300">
          {feedback}
        </div>
      )}

      {/* Pre-built examples */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Quick Examples</h2>
        <div className="flex flex-wrap gap-2">
          {PREBUILT.map(({ label, event }) => (
            <button
              key={label}
              onClick={() => send(event)}
              disabled={!sdkReady}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom event form */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Custom Event</h2>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Event Name *
          </label>
          <input
            type="text"
            placeholder="e.g. video_play"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Alphanumeric + hyphens/underscores only</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Event Data (key / value)
            </label>
            <button onClick={addPair} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              + Add field
            </button>
          </div>
          {pairs.map(({ key, value }, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                placeholder="key"
                value={key}
                onChange={(e) => updatePair(i, 'key', e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="value"
                value={value}
                onChange={(e) => updatePair(i, 'value', e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {pairs.length > 1 && (
                <button
                  onClick={() => removePair(i)}
                  className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-1"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Numbers, <code className="font-mono">true</code>/<code className="font-mono">false</code>, and strings are auto-detected.
          </p>
        </div>

        <button
          onClick={() => send()}
          disabled={!sdkReady}
          className="px-4 py-2 text-sm font-medium rounded-md bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
        >
          Send Event
        </button>
      </div>

      {sdkError && !configMissing && (
        <p className="text-sm text-red-600 dark:text-red-400">
          inTrack SDK failed to load. Check your network and SDK keys.
        </p>
      )}

      {/* Event log */}
      {sentEvents.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Sent This Session</h2>
            <button
              onClick={() => setSentEvents([])}
              className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
            >
              Clear
            </button>
          </div>
          <ul className="space-y-2">
            {sentEvents.map((e, i) => (
              <li
                key={i}
                className="text-sm bg-gray-50 dark:bg-gray-800 rounded-md px-3 py-2 font-mono"
              >
                <span className="text-gray-400 text-xs mr-2">{e.ts}</span>
                <span className="text-orange-600 dark:text-orange-400">{e.name}</span>
                {Object.keys(e.data).length > 0 && (
                  <span className="text-gray-500 dark:text-gray-400">
                    {' '}
                    {JSON.stringify(e.data)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <CodeBlock code={CODE_EVENTS} title="Implementation — Custom Events" />
    </div>
  );
}
