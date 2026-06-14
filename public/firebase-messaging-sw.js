// Firebase messaging service worker for Firebase push mode (Mode B).
// This file must be at the domain root as "firebase-messaging-sw.js".
//
// HOW CONFIG IS PASSED:
// Firebase config cannot come from env vars (service workers have no access to them).
// Instead, the app registers this SW with config values in the URL query string:
//   /firebase-messaging-sw.js?apiKey=xxx&projectId=yyy&...
// The user enters their Firebase config in the browser UI — no hardcoding needed.

// Step 1: Import inTrack push handler (must be first)
if ('function' === typeof importScripts) {
  importScripts('https://static1.intrack.ir/api/web/download/sdk/v1/inTrack-sw.min.js');
}

// Step 2: Import Firebase compat scripts (compat version works in SW context)
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Step 3: Read Firebase config from URL query params
const params = new URLSearchParams(self.location.search);
const firebaseConfig = {
  apiKey:            params.get('apiKey'),
  authDomain:        params.get('authDomain'),
  projectId:         params.get('projectId'),
  storageBucket:     params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId:             params.get('appId'),
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Step 4: Handle background messages.
// Skip messages from inTrack — the inTrack SW handler above already handles them.
messaging.onBackgroundMessage((payload) => {
  if (payload?.data?.source === '$inTrack') return;
  console.log('[firebase-messaging-sw.js] Background message:', payload);
  // Add your own background message handling here if needed.
});
