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
    $Intk: (...args: unknown[]) => void;
    $InTrack: {
      init: (config: object) => void;
      q?: unknown[];
      [key: string]: unknown;
    };
    $inTrack_config: object;
  }
}

export function getDeviceId(): Promise<string> {
  return new Promise((resolve) => {
    window.$Intk('getDeviceId', resolve);
  });
}

export function getUserId(): Promise<string | null> {
  return new Promise((resolve) => {
    window.$Intk('getUserId', resolve);
  });
}

export function getSubscriptionStatus(): Promise<PushSubscriptionStatus> {
  return new Promise((resolve) => {
    window.$Intk('SubscriptionWebPushInfo', resolve);
  });
}

export function initWebPush(config?: WebPushConfig): void {
  window.$Intk('InitWebPush', config);
}

export function sendFirebaseToken(token: string): void {
  window.$Intk('sendFireBaseToken', token);
}

export function unsubscribeWebPush(): void {
  window.$Intk('UnsubscribeWebPush');
}

export function loginUser(userDetails: UserDetails): void {
  window.$Intk('login', userDetails);
}

export function logoutUser(): void {
  window.$Intk('logout');
}

export function updateUserProfile(userDetails: UserDetails): void {
  window.$Intk('updateProfile', userDetails);
}

export function sendCustomEvent(event: InTrackEvent): void {
  window.$Intk('sendEvent', event);
}
