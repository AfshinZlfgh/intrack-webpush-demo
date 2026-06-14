import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

const STORAGE_KEY = 'intrack_demo_firebase_config';

export function getStoredFirebaseConfig(): FirebaseConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FirebaseConfig) : null;
  } catch {
    return null;
  }
}

export function storeFirebaseConfig(config: FirebaseConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearFirebaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function maskValue(value: string): string {
  if (value.length <= 8) return '••••••••';
  return value.slice(0, 4) + '••••••••' + value.slice(-4);
}

// Registers the Firebase messaging service worker with config embedded in the
// URL query string (service workers cannot access env vars or localStorage).
async function registerFirebaseSW(config: FirebaseConfig): Promise<ServiceWorkerRegistration> {
  const swUrl = new URL('/firebase-messaging-sw.js', window.location.origin);
  swUrl.searchParams.set('apiKey', config.apiKey);
  swUrl.searchParams.set('authDomain', config.authDomain);
  swUrl.searchParams.set('projectId', config.projectId);
  swUrl.searchParams.set('storageBucket', config.storageBucket);
  swUrl.searchParams.set('messagingSenderId', config.messagingSenderId);
  swUrl.searchParams.set('appId', config.appId);
  return navigator.serviceWorker.register(swUrl.toString());
}

export async function getFCMToken(config: FirebaseConfig): Promise<string> {
  const supported = await isSupported();
  if (!supported) {
    throw new Error('Firebase Messaging is not supported in this browser.');
  }

  const app = getApps().length ? getApp() : initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  });

  const messaging = getMessaging(app);
  const registration = await registerFirebaseSW(config);

  const token = await getToken(messaging, {
    vapidKey: config.vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error('Failed to get FCM token. Verify your Firebase config and VAPID key.');
  }

  return token;
}
