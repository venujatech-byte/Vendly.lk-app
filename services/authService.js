import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getIdToken,
  reload,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";

import { auth } from "../firebase/firebaseConfig";

let isGoogleSignInConfigured = false;

// @react-native-google-signin/google-signin registers a Turbo Module at
// import time and throws immediately if that native module isn't linked —
// which is always true in Expo Go and in the web bundle. Requiring it lazily,
// only when a Google button is actually pressed, keeps email/password auth
// working everywhere while a development build with the native module isn't
// available yet.
function loadGoogleSignInModule() {
  try {
    return require("@react-native-google-signin/google-signin");
  } catch {
    const unavailableError = new Error(
      "Google sign-in isn't available in this build yet. It needs a development build with the native Google Sign-In module — Expo Go and the web preview can't run it.",
    );
    unavailableError.code = "auth/google-signin-unavailable";
    throw unavailableError;
  }
}

function configureGoogleSignIn() {
  const { GoogleSignin } = loadGoogleSignInModule();

  if (isGoogleSignInConfigured) return GoogleSignin;

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  if (!webClientId) {
    throw new Error(
      "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set in .env.local.",
    );
  }

  GoogleSignin.configure({ webClientId });
  isGoogleSignInConfigured = true;

  return GoogleSignin;
}

export async function registerWithEmail(name, email, password) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );

  await updateProfile(userCredential.user, { displayName: name });
  await sendEmailVerification(userCredential.user);

  return userCredential.user;
}

export async function loginWithEmail(email, password) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password,
  );

  const loggedInUser = userCredential.user;

  await reload(loggedInUser);

  if (!loggedInUser.emailVerified) {
    await signOut(auth);

    const verificationError = new Error(
      "Email address has not been verified.",
    );
    verificationError.code = "auth/email-not-verified";
    throw verificationError;
  }

  return loggedInUser;
}

export async function loginWithGoogle() {
  const GoogleSignin = configureGoogleSignIn();
  const { isSuccessResponse } = loadGoogleSignInModule();

  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) {
    const cancelledError = new Error("Google login was cancelled.");
    cancelledError.code = "auth/popup-closed-by-user";
    throw cancelledError;
  }

  const idToken = response.data.idToken;

  if (!idToken) {
    throw new Error("Google sign-in did not return an ID token.");
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(auth, credential);

  return userCredential.user;
}

export async function logoutUser() {
  if (isGoogleSignInConfigured) {
    try {
      const { GoogleSignin } = loadGoogleSignInModule();
      await GoogleSignin.signOut();
    } catch {
      // Not signed in with Google, or the native module isn't linked.
    }
  }

  await signOut(auth);
}

export async function getCurrentUserToken(forceRefresh = false) {
  const currentUser = auth.currentUser;

  if (!currentUser) return null;

  return getIdToken(currentUser, forceRefresh);
}
