import type {
  PushSubscriptionStatus,
  WebPushConfig,
  UserDetails,
  InTrackEvent,
} from '@/lib/types';

// Extend Window with inTrack SDK globals. Declared here (in the module that
// wraps all SDK calls) so every importer gets the augmentation automatically.
declare global {
  interface Window {
    Intk: (...args: unknown[]) => void;
    InTrack: {
      init?: (config: object) => void;
      getDeviceId?: () => string;
      getUserId?: () => string | null;
      SubscriptionWebPushInfo?: (callback: (status: PushSubscriptionStatus) => void) => void;
      q?: unknown[];
      [key: string]: unknown;
    };
    inTrack_config: object;
  }
}

export function getDeviceId(): Promise<string> {
  return new Promise((resolve) => {
    const direct = window.InTrack?.getDeviceId?.();
    if (direct) { resolve(direct); return; }
    window.Intk('getDeviceId', resolve);
  });
}

export function getUserId(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window.InTrack?.getUserId === 'function') {
      resolve(window.InTrack.getUserId!());
      return;
    }
    window.Intk('getUserId', resolve);
  });
}

export function getSubscriptionStatus(): Promise<PushSubscriptionStatus> {
  return new Promise((resolve) => {
    if (typeof window.InTrack?.SubscriptionWebPushInfo === 'function') {
      window.InTrack.SubscriptionWebPushInfo!(resolve);
      return;
    }
    window.Intk('SubscriptionWebPushInfo', resolve);
  });
}

export function initWebPush(config?: WebPushConfig): void {
  window.Intk('InitWebPush', config);
}

export function sendFirebaseToken(token: string): void {
  window.Intk('sendFireBaseToken', token);
}

export function unsubscribeWebPush(): void {
  window.Intk('UnsubscribeWebPush');
}

export function loginUser(userDetails: UserDetails): void {
  window.Intk('login', userDetails);
}

export function logoutUser(): void {
  window.Intk('logout');
}

export function updateUserProfile(userDetails: UserDetails): void {
  window.Intk('updateProfile', userDetails);
}

export function sendCustomEvent(event: InTrackEvent): void {
  window.Intk('sendEvent', event);
}
