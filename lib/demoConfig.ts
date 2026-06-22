// Single source of truth for the demo's runtime configuration.
//
// This project is a *testing harness* for inTrack dashboards, so credentials are
// NOT baked into .env — the tester enters them in the UI (the /setup page) and we
// persist them in localStorage. An inTrack panel is locked to a single web-push
// type (VAPID or Firebase), so we record that choice up front and surface the
// matching credentials only.
//
// IMPORTANT: every key this demo writes is namespaced with DEMO_PREFIX. resetDemo()
// removes *only* those keys, so wiping the demo never touches third-party storage
// written by the inTrack SDK or Firebase SDK.

export type PanelType = 'vapid' | 'firebase';

export interface IntrackCredentials {
  app_key: string;
  auth_key: string;
  // Required for VAPID panels (inTrack manages subscription with it).
  // Not used by Firebase panels — stored as '' there.
  public_key: string;
  environment: 'production' | 'stage';
  debug: boolean;
}

export interface DemoConfig {
  panelType: PanelType;
  credentials: IntrackCredentials;
}

// All demo-owned localStorage keys share this prefix. Keep new keys under it so
// resetDemo() continues to clean them up without an explicit allowlist.
export const DEMO_PREFIX = 'intrack_demo_';

const CONFIG_KEY = `${DEMO_PREFIX}config`;

// Dispatched on window whenever the stored config is saved or wiped, so the
// provider / nav can re-read without a full page reload (and across tabs via the
// native 'storage' event).
export const CONFIG_CHANGED_EVENT = 'intrack-demo:config-changed';

function notifyChanged(): void {
  window.dispatchEvent(new Event(CONFIG_CHANGED_EVENT));
}

function isValid(config: DemoConfig): boolean {
  const { panelType, credentials } = config;
  if (panelType !== 'vapid' && panelType !== 'firebase') return false;
  if (!credentials?.app_key?.trim() || !credentials?.auth_key?.trim()) return false;
  // VAPID panels can't subscribe without the public key.
  if (panelType === 'vapid' && !credentials.public_key?.trim()) return false;
  return true;
}

export function getDemoConfig(): DemoConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoConfig;
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function getPanelType(): PanelType | null {
  return getDemoConfig()?.panelType ?? null;
}

// --- useSyncExternalStore plumbing -----------------------------------------
// localStorage is an external store; these let React subscribe to it without
// setState-in-effect. getDemoConfigSnapshot must return a *stable* reference
// while the underlying data is unchanged, or useSyncExternalStore loops forever.

let snapshotRaw: string | null = null;
let snapshotValue: DemoConfig | null = null;
let snapshotInit = false;

export function getDemoConfigSnapshot(): DemoConfig | null {
  if (typeof window === 'undefined') return null;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CONFIG_KEY);
  } catch {
    raw = null;
  }
  if (snapshotInit && raw === snapshotRaw) return snapshotValue;
  snapshotInit = true;
  snapshotRaw = raw;
  snapshotValue = getDemoConfig();
  return snapshotValue;
}

export function subscribeDemoConfig(callback: () => void): () => void {
  window.addEventListener(CONFIG_CHANGED_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CONFIG_CHANGED_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function isConfigured(): boolean {
  return getDemoConfig() !== null;
}

export function storeDemoConfig(config: DemoConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  notifyChanged();
}

// Wipes every demo-owned key (config + Firebase project config + anything else we
// add under DEMO_PREFIX) while leaving third-party SDK storage intact.
export function resetDemo(): void {
  if (typeof window === 'undefined') return;
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(DEMO_PREFIX)) toRemove.push(key);
  }
  toRemove.forEach((key) => localStorage.removeItem(key));
  notifyChanged();
}
