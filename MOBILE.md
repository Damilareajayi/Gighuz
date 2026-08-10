# Mobile (Capacitor)

GigHuz ships as a native shell around the same Next.js app used on the
web — there's no separate mobile codebase. [Capacitor](https://capacitorjs.com)
wraps `frontend/` in a real iOS/Android app that loads the live site in a
native webview, so every feature built for web (auth, dashboards, profile,
etc.) works on mobile with zero duplicated UI code.

Config lives in `frontend/capacitor.config.ts`. Native projects are at
`frontend/android` and `frontend/ios` — both are committed (they're real
Xcode/Gradle projects with app-specific config), while their build output
is gitignored.

## How it loads content

The native shell doesn't bundle a static copy of the app — `capacitor.config.ts`'s
`server.url` points it at a live URL, same as pointing a browser at a
website. That means:

- Whatever backend/frontend that URL resolves to is what the app actually runs against.
- `frontend/www/index.html` is just a placeholder Capacitor requires to exist; it's not what users see.

`server.url` defaults to `http://10.0.2.2:3000` (the Android emulator's
alias for your host machine's `localhost`). Override it with the
`CAPACITOR_SERVER_URL` env var before running `cap sync`:

| Target | `CAPACITOR_SERVER_URL` |
|---|---|
| Android emulator | `http://10.0.2.2:3000` (default) |
| iOS simulator | `http://localhost:3000` |
| Physical device (same Wi-Fi) | `http://<your-machine's-LAN-IP>:3000` |
| Production | `https://<deployed-frontend-url>` |

## Running on Android

Requires [Android Studio](https://developer.android.com/studio) (installs
the SDK, emulator, and Gradle tooling together) — not set up on this
machine yet.

```bash
cd frontend
npm run dev                 # keep the Next.js dev server running
CAPACITOR_SERVER_URL=http://10.0.2.2:3000 npx cap sync
npm run cap:android         # opens the project in Android Studio
```

From Android Studio, run on an emulator or a plugged-in device.

## Running on iOS

Requires a **Mac with Xcode** — genuinely can't be done from this Windows
machine. The `ios/` project is fully scaffolded and ready to open the
moment you're on a Mac:

```bash
cd frontend
CAPACITOR_SERVER_URL=http://localhost:3000 npx cap sync
npm run cap:ios              # opens the project in Xcode
```

Then run on the simulator or a device from Xcode.

## Google Sign-In on native

`signInWithGoogle()` in `src/lib/auth.tsx` now branches on
`Capacitor.isNativePlatform()`: web keeps the original `signInWithPopup`,
native platforms use `@capacitor-firebase/authentication`'s native Google
Sign-In flow (avoids the `disallowed_useragent` error Google throws for
OAuth popups inside embedded webviews), then feeds the resulting ID token
into `signInWithCredential` so `auth.currentUser` / `onAuthStateChanged`
work identically either way — nothing else in the app had to change.

This needed a real (non-emulator) Firebase project, which now exists:
- `android/app/google-services.json` and `ios/App/App/GoogleService-Info.plist`
  are both real, downloaded from Firebase's Android/iOS app registrations
  on the `gighuz-app` project (both apps registered under `com.gighuz.app`).
- `ios/App/App/Info.plist` has the `REVERSED_CLIENT_ID` URL scheme Google
  Sign-In needs to call back into the app.
- The **debug** signing keystore's SHA-1/SHA-256 fingerprints are
  registered with the Firebase Android app — Google Sign-In checks the
  signing cert against what's registered, so this only covers debug
  builds signed with `~/.android/debug.keystore`.

**Before a release build**: generate (or locate) your actual release
signing keystore, get its SHA-1/SHA-256 (`keytool -list -v -keystore
your-release.keystore -alias your-alias`), and add it as another SHA
fingerprint on the Android app in the [Firebase console](https://console.firebase.google.com/project/gighuz-app/settings/general/) —
Google Sign-In will fail on a release build signed with an unregistered
key even though debug builds work fine.

## Before shipping to an app store

- [x] App icon/splash screen — generated from `public/brand/gighuz-icon-512.png`
  via `@capacitor/assets` (source images kept at `frontend/resources/` for
  regenerating later with a higher-res source if you get one).
- [x] Google Sign-In — see above. Debug builds only until a release
  keystore's fingerprint is registered too.
- [ ] Point `CAPACITOR_SERVER_URL` at the real deployed HTTPS URL
  (`https://gighuz.vercel.app`) before syncing a release build — an app
  pointed at `10.0.2.2` or your laptop's LAN IP only works on your network:
  `CAPACITOR_SERVER_URL=https://gighuz.vercel.app npx cap sync`
- [ ] Register a release signing keystore's SHA fingerprints (see above).
- [ ] Review Apple/Google developer account requirements — separate from
  anything in this repo.
