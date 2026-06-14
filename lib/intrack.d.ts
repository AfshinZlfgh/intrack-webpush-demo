// Global Window extension for the inTrack SDK loaded via CDN script.
// This is a pure global script file (no import/export) so the Window
// interface augmentation applies everywhere without explicit imports.

interface Window {
  // The async queue function — call before SDK finishes loading.
  $Intk: (...args: unknown[]) => void;
  // The SDK object — available after the CDN script loads and calls init().
  $InTrack: {
    init: (config: object) => void;
    q?: unknown[];
    [key: string]: unknown;
  };
  $inTrack_config: object;
}
