import {
  createUserWithEmailAndPassword,
  getIdToken,
  reload,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";

import { auth } from "../firebase/firebaseConfig";

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

export async function logoutUser() {
  await signOut(auth);
}

export async function getCurrentUserToken(forceRefresh = false) {
  const currentUser = auth.currentUser;

  if (!currentUser) return null;

  return getIdToken(currentUser, forceRefresh);
}
