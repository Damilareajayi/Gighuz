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

## Known gap: Google Sign-In won't work as-is

The current "Continue with Google" button uses Firebase's
`signInWithPopup`, which opens an OAuth popup. **Google blocks that flow
inside embedded/native webviews** (including Capacitor's) as a security
policy — it'll fail with a `disallowed_useragent` error on mobile, even
though it works fine in a real mobile browser. Email/password and
phone/SMS sign-in aren't affected by this.

Fixing it properly means swapping to a native OAuth flow on mobile (e.g.
`@capacitor-firebase/authentication`, or Capacitor's Browser plugin with a
custom URL scheme redirect back into the app) — real, scoped follow-up
work, not a config tweak.

## Before shipping to an app store

- Point `CAPACITOR_SERVER_URL` at a real deployed HTTPS URL — an app
  pointed at `10.0.2.2` or your laptop's LAN IP only works on your network.
- Replace the default Capacitor app icon/splash screen (currently unset —
  `npx cap sync` uses Capacitor's placeholder assets, not GigHuz branding).
- Fix Google Sign-In per above.
- Review Apple/Google developer account requirements — separate from
  anything in this repo.
