'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInTrack } from '@/components/InTrackProvider';
import {
  type PanelType,
  type DemoConfig,
  type IntrackCredentials,
  getDemoConfigSnapshot,
  storeDemoConfig,
  resetDemo,
} from '@/lib/demoConfig';

type FormState = {
  app_key: string;
  auth_key: string;
  public_key: string;
  environment: 'production' | 'stage';
  debug: boolean;
};

const EMPTY: FormState = {
  app_key: '',
  auth_key: '',
  public_key: '',
  environment: 'production',
  debug: false,
};

const MODE_META: Record<PanelType, { title: string; blurb: string; accent: string; ring: string }> = {
  vapid: {
    title: 'VAPID',
    blurb: 'inTrack manages the VAPID key pair. No Firebase account needed.',
    accent: 'text-blue-700 dark:text-blue-300',
    ring: 'border-blue-500 ring-2 ring-blue-500/40 bg-blue-50 dark:bg-blue-900/20',
  },
  firebase: {
    title: 'Firebase',
    blurb: 'You own a Firebase project and pass its FCM token to inTrack.',
    accent: 'text-purple-700 dark:text-purple-300',
    ring: 'border-purple-500 ring-2 ring-purple-500/40 bg-purple-50 dark:bg-purple-900/20',
  },
};

export default function SetupPage() {
  const { hydrated } = useInTrack();

  if (!hydrated) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Loading…</div>;
  }

  // Read once on the client, after hydration. Keyed so a reset/save remounts the
  // form with fresh seed values instead of needing a setState-in-effect.
  const existing = getDemoConfigSnapshot();
  return <SetupForm key={existing?.panelType ?? 'new'} existing={existing} />;
}

function SetupForm({ existing }: { existing: DemoConfig | null }) {
  const router = useRouter();

  const [panelType, setPanelType] = useState<PanelType | null>(existing?.panelType ?? null);
  const [form, setForm] = useState<FormState>(
    existing
      ? {
          app_key: existing.credentials.app_key,
          auth_key: existing.credentials.auth_key,
          public_key: existing.credentials.public_key,
          environment: existing.credentials.environment,
          debug: existing.credentials.debug,
        }
      : EMPTY,
  );
  const [error, setError] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (!panelType) {
      setError('Choose a panel type first.');
      return;
    }
    const missing: string[] = [];
    if (!form.app_key.trim()) missing.push('App Key');
    if (!form.auth_key.trim()) missing.push('Auth Key');
    if (panelType === 'vapid' && !form.public_key.trim()) missing.push('Public Key');
    if (missing.length) {
      setError(`Missing: ${missing.join(', ')}`);
      return;
    }

    const credentials: IntrackCredentials = {
      app_key: form.app_key.trim(),
      auth_key: form.auth_key.trim(),
      // Public key is only meaningful for VAPID panels.
      public_key: panelType === 'vapid' ? form.public_key.trim() : '',
      environment: form.environment,
      debug: form.debug,
    };

    storeDemoConfig({ panelType, credentials });
    setError('');
    setSavedFlash(true);
    router.push(panelType === 'vapid' ? '/push/vapid' : '/push/firebase');
  };

  const handleReset = () => {
    if (
      !confirm(
        'Reset demo? This wipes the stored panel type and inTrack credentials (and any saved Firebase config) from this browser. Third-party SDK data is left untouched.',
      )
    ) {
      return;
    }
    resetDemo();
    setPanelType(null);
    setForm(EMPTY);
    setError('');
    setSavedFlash(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Demo Setup</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          This harness reads no credentials from <code className="font-mono text-xs">.env</code>.
          Pick the web-push type your inTrack panel uses, enter its keys, and they&apos;re stored in
          this browser&apos;s <code className="font-mono text-xs">localStorage</code>. An inTrack panel
          is locked to one type, so this choice mirrors your real panel.
        </p>
        {existing && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Currently configured as{' '}
            <strong className={MODE_META[existing.panelType].accent}>
              {MODE_META[existing.panelType].title}
            </strong>
            .
          </p>
        )}
      </div>

      {/* Panel type selection */}
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">1. Panel type</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(MODE_META) as PanelType[]).map((type) => {
            const meta = MODE_META[type];
            const selected = panelType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setPanelType(type)}
                className={`text-left rounded-lg border-2 p-4 transition-all ${
                  selected
                    ? meta.ring
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${selected ? meta.accent : 'text-gray-900 dark:text-white'}`}>
                    {meta.title}
                  </span>
                  <span
                    className={`h-4 w-4 rounded-full border-2 ${
                      selected ? 'border-current bg-current ' + meta.accent : 'border-gray-300 dark:border-gray-600'
                    }`}
                    aria-hidden
                  />
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{meta.blurb}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Credentials */}
      {panelType && (
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">2. inTrack credentials</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Find these at <strong>dash.intrack.ir → Settings → SDK → Initialize</strong>.
          </p>
          <div className="grid gap-3">
            <Field label="App Key" value={form.app_key} onChange={(v) => set('app_key', v)} placeholder="app_key" />
            <Field label="Auth Key" value={form.auth_key} onChange={(v) => set('auth_key', v)} placeholder="auth_key" />

            {panelType === 'vapid' ? (
              <Field
                label="Public Key (VAPID)"
                value={form.public_key}
                onChange={(v) => set('public_key', v)}
                placeholder="public_key — VAPID panels only"
              />
            ) : (
              <div className="rounded-md border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-3 text-sm text-purple-800 dark:text-purple-300">
                Firebase panels don&apos;t use a public key. Enter your Firebase project config on the{' '}
                <strong>Push: Firebase</strong> page after saving.
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Environment</label>
              <select
                value={form.environment}
                onChange={(e) => set('environment', e.target.value as 'production' | 'stage')}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="production">production</option>
                <option value="stage">stage</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={form.debug}
                onChange={(e) => set('debug', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
              />
              Enable SDK debug logging in the browser console
            </label>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {savedFlash && !error && (
        <p className="text-sm text-green-600 dark:text-green-400">Saved. Redirecting…</p>
      )}

      <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={handleSave}
          disabled={!panelType}
          className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
        >
          Save &amp; continue
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium rounded-md border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Reset demo (wipe stored data)
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
