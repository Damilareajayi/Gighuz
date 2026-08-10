// Maps raw Firebase/network error text to short, on-brand copy. Firebase's
// own error messages ("Firebase: Error (auth/wrong-password).") are
// technical and off-brand -- this is the one place that translates them so
// every screen shows the same friendly voice instead of each catch block
// inventing its own.

const FRIENDLY_AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-credential':        "That email and password combination doesn't look right.",
  'auth/wrong-password':            "That email and password combination doesn't look right.",
  'auth/user-not-found':            "We couldn't find a GigHuz account with that email.",
  'auth/email-already-in-use':      'An account already exists with that email — try signing in instead.',
  'auth/weak-password':             "That password's a bit weak — use at least 6 characters.",
  'auth/invalid-email':             "That doesn't look like a valid email address.",
  'auth/too-many-requests':         'Too many attempts — give it a minute and try again.',
  'auth/popup-closed-by-user':      'The sign-in window closed before finishing — give it another go.',
  'auth/cancelled-popup-request':   'The sign-in window closed before finishing — give it another go.',
  'auth/network-request-failed':    "Can't reach GigHuz right now — check your connection and try again.",
  'auth/invalid-verification-code': "That code doesn't match — double-check and try again.",
  'auth/code-expired':              'That code expired — request a new one.',
  'auth/operation-not-allowed':     "This sign-in method isn't turned on yet — try another way in for now.",
  'auth/user-disabled':             'This account has been disabled. Reach out if that seems wrong.',
  'auth/missing-phone-number':      'Enter a phone number first.',
  'auth/invalid-phone-number':      "That phone number doesn't look right — check the country code and digits.",
};

const DEFAULT_FALLBACK = "Something went sideways on our end — give it another try in a moment.";

export function friendlyError(err: unknown, fallback: string = DEFAULT_FALLBACK): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');

  const codeMatch = raw.match(/auth\/[a-z-]+/);
  if (codeMatch && FRIENDLY_AUTH_ERRORS[codeMatch[0]]) {
    return FRIENDLY_AUTH_ERRORS[codeMatch[0]];
  }

  // A short message with no "Firebase:" prefix or stack-trace shape is
  // almost certainly one GigHuz's own API already wrote to be readable —
  // keep it rather than replacing it with something more generic.
  const looksLikeRawSdkError = raw.startsWith('Firebase:') || /^\w+Error(:|$)/.test(raw);
  if (raw && raw.length < 200 && !looksLikeRawSdkError) {
    return raw;
  }

  return fallback;
}
