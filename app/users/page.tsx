'use client';

import { useEffect, useState } from 'react';
import { useInTrack } from '@/components/InTrackProvider';
import { CodeBlock } from '@/components/CodeBlock';
import { getDeviceId, getUserId, loginUser, logoutUser, updateUserProfile } from '@/lib/intrack';

const CODE_USERS = `// User Identification

// Get anonymous device ID (always available after SDK init)
Intk('getDeviceId', (deviceId) => {
  console.log('Device ID:', deviceId);
});

// Login — assigns a known userId to the current device.
// All previous anonymous data is merged into this user profile.
Intk('login', {
  userId: 'user_abc123',       // required, alphanumeric + hyphens
  firstName: 'Ali',
  lastName: 'Mohammadi',
  email: 'ali@example.com',
  phone: '+989121234567',      // E.164 format
  gender: 'male',
  webPushOptIn: true,
});

// Get current userId (null if not logged in)
Intk('getUserId', (userId) => {
  console.log('User ID:', userId);
});

// Update profile (userId is still required)
Intk('updateProfile', {
  userId: 'user_abc123',
  city: 'Tehran',
  attributes: { plan: 'premium', signupSource: 'web' },
});

// Logout — detaches this device from the known user
Intk('logout');`;

export default function UsersPage() {
  const { sdkReady, sdkError, configMissing } = useInTrack();
  const [deviceId, setDeviceId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ userId: '', firstName: '', email: '', phone: '' });
  const [profileForm, setProfileForm] = useState({ city: '', company: '' });
  const [feedback, setFeedback] = useState('');

  const flash = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3000);
  };

  useEffect(() => {
    if (!sdkReady) return;
    getDeviceId().then(setDeviceId);
    getUserId().then(setCurrentUserId);
  }, [sdkReady]);

  const refreshUserId = () => getUserId().then(setCurrentUserId);

  const handleLogin = () => {
    if (!loginForm.userId.trim()) return flash('userId is required');
    loginUser({
      userId: loginForm.userId.trim(),
      firstName: loginForm.firstName || undefined,
      email: loginForm.email || undefined,
      phone: loginForm.phone || undefined,
    });
    flash(`Logged in as ${loginForm.userId}`);
    setTimeout(refreshUserId, 500);
  };

  const handleLogout = () => {
    logoutUser();
    flash('Logged out');
    setTimeout(refreshUserId, 500);
  };

  const handleUpdateProfile = () => {
    if (!currentUserId) return flash('Not logged in — login first');
    updateUserProfile({
      userId: currentUserId,
      city: profileForm.city || undefined,
      company: profileForm.company || undefined,
    });
    flash('Profile updated');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Identification</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          inTrack creates an anonymous <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">deviceId</code> for every visitor.
          Call <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">login()</code> to assign a known{' '}
          <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">userId</code> and merge all anonymous history into one profile.
        </p>
      </div>

      {configMissing && (
        <div className="rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-4 text-sm text-yellow-800 dark:text-yellow-300">
          inTrack SDK keys are not configured. Set <code className="font-mono text-xs">NEXT_PUBLIC_INTRACK_*</code> in <code className="font-mono text-xs">.env.local</code>.
        </div>
      )}

      {feedback && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 px-4 py-2 text-sm text-green-800 dark:text-green-300">
          {feedback}
        </div>
      )}

      {/* Current identity */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Current Identity</h2>
        {!sdkReady && !configMissing && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading SDK…</p>
        )}
        {sdkReady && (
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="text-gray-500 dark:text-gray-400 w-24 shrink-0">Device ID:</dt>
              <dd className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">
                {deviceId || '—'}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-500 dark:text-gray-400 w-24 shrink-0">User ID:</dt>
              <dd className="font-mono text-xs text-gray-700 dark:text-gray-300">
                {currentUserId ?? <span className="italic text-gray-400">anonymous</span>}
              </dd>
            </div>
          </dl>
        )}
        <div className="flex gap-2 pt-1">
          <button
            onClick={refreshUserId}
            disabled={!sdkReady}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40"
          >
            Refresh
          </button>
          <button
            onClick={handleLogout}
            disabled={!sdkReady || !currentUserId}
            className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-40"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Login form */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Login</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              { key: 'userId', label: 'User ID *', placeholder: 'user_abc123' },
              { key: 'firstName', label: 'First Name', placeholder: 'Ali' },
              { key: 'email', label: 'Email', placeholder: 'ali@example.com' },
              { key: 'phone', label: 'Phone (E.164)', placeholder: '+989121234567' },
            ] as { key: keyof typeof loginForm; label: string; placeholder: string }[]
          ).map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label}
              </label>
              <input
                type="text"
                placeholder={placeholder}
                value={loginForm[key]}
                onChange={(e) => setLoginForm((p) => ({ ...p, [key]: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleLogin}
          disabled={!sdkReady}
          className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
        >
          Login
        </button>
      </div>

      {/* Update profile form */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Update Profile</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Requires an active login session.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              { key: 'city', label: 'City', placeholder: 'Tehran' },
              { key: 'company', label: 'Company', placeholder: 'Acme Corp' },
            ] as { key: keyof typeof profileForm; label: string; placeholder: string }[]
          ).map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label}
              </label>
              <input
                type="text"
                placeholder={placeholder}
                value={profileForm[key]}
                onChange={(e) => setProfileForm((p) => ({ ...p, [key]: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleUpdateProfile}
          disabled={!sdkReady || !currentUserId}
          className="px-4 py-2 text-sm font-medium rounded-md bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
        >
          Update Profile
        </button>
      </div>

      {sdkError && !configMissing && (
        <p className="text-sm text-red-600 dark:text-red-400">
          inTrack SDK failed to load. Check your network and SDK keys.
        </p>
      )}

      <CodeBlock code={CODE_USERS} title="Implementation — User Identification" />
    </div>
  );
}
