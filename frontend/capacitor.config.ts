import type { CapacitorConfig } from '@capacitor/cli';

// GigHuz ships as a thin native shell around the same Next.js app used on
// the web — no separate mobile codebase to maintain. The shell just loads
// `server.url` in a native webview.
//
// server.url has to point somewhere different depending on what you're
// testing against — override it with CAPACITOR_SERVER_URL rather than
// editing this file:
//   Android emulator -> host machine's localhost is 10.0.2.2 (the default below)
//   iOS simulator     -> CAPACITOR_SERVER_URL=http://localhost:3000
//   Physical device    -> CAPACITOR_SERVER_URL=http://<your-lan-ip>:3000
//   Production build    -> CAPACITOR_SERVER_URL=https://<deployed-frontend-url>
const serverUrl = process.env.CAPACITOR_SERVER_URL || 'http://10.0.2.2:3000';

const config: CapacitorConfig = {
  appId: 'com.gighuz.app',
  appName: 'GigHuz',
  webDir: 'www',
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
  },
};

export default config;
