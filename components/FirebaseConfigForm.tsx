'use client';

import { useState } from 'react';
import { type FirebaseConfig, storeFirebaseConfig } from '@/lib/firebase';

const FIELDS: { key: keyof FirebaseConfig; label: string; placeholder: string }[] = [
  { key: 'apiKey',            label: 'API Key',              placeholder: 'AIzaSy...' },
  { key: 'authDomain',        label: 'Auth Domain',          placeholder: 'your-project.firebaseapp.com' },
  { key: 'projectId',         label: 'Project ID',           placeholder: 'your-project-id' },
  { key: 'storageBucket',     label: 'Storage Bucket',       placeholder: 'your-project.appspot.com' },
  { key: 'messagingSenderId', label: 'Messaging Sender ID',  placeholder: '123456789' },
  { key: 'appId',             label: 'App ID',               placeholder: '1:123456789:web:abc...' },
  { key: 'vapidKey',          label: 'Web Push VAPID Key',   placeholder: 'BNt... (from Firebase Console → Cloud Messaging)' },
];

interface Props {
  onSaved: (config: FirebaseConfig) => void;
}

export function FirebaseConfigForm({ onSaved }: Props) {
  const [values, setValues] = useState<Partial<FirebaseConfig>>({});
  const [error, setError] = useState('');

  const set = (key: keyof FirebaseConfig, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const save = () => {
    const missing = FIELDS.filter(({ key }) => !values[key]?.trim()).map(({ label }) => label);
    if (missing.length) {
      setError(`Missing: ${missing.join(', ')}`);
      return;
    }
    const config = values as FirebaseConfig;
    storeFirebaseConfig(config);
    onSaved(config);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white">Firebase Project Config</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get these values from{' '}
          <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
            Firebase Console → Project Settings → Your Apps
          </span>
          , and your VAPID key from{' '}
          <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
            Cloud Messaging → Web Push certificates
          </span>
          . Values are saved to <code>localStorage</code> — no server involved.
        </p>
      </div>

      <div className="grid gap-3">
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {label}
            </label>
            <input
              type="text"
              placeholder={placeholder}
              value={values[key] ?? ''}
              onChange={(e) => set(key, e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        onClick={save}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
      >
        Save and Continue
      </button>
    </div>
  );
}
