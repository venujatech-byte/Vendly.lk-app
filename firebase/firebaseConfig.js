import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  databaseURL:
    process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ||
    "https://vendly-lk-default-rtdb.asia-southeast1.firebasedatabase.app",
};

const firebaseApp = initializeApp(firebaseConfig);

// The React Native persistence build is only available on the native
// (ios/android) bundle of firebase/auth, not the web bundle.
const auth =
  Platform.OS === "web"
    ? getAuth(firebaseApp)
    : initializeAuth(firebaseApp, {
        persistence: getReactNativePersistence(AsyncStorage),
      });

const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
const rtdb = getDatabase(
  firebaseApp,
  firebaseConfig.databaseURL,
);

export { auth, db, firebaseApp, rtdb, storage };
