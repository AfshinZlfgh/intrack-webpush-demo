// inTrack service worker for VAPID push mode.
// This file must be served from the domain root (https://your-domain.com/sw.js).
// It imports the inTrack push handler from the inTrack CDN.
if ('function' === typeof importScripts) {
  importScripts('https://static1.intrack.ir/api/web/download/sdk/v1/inTrack-sw.min.js');
}
