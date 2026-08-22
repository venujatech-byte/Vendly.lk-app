import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";

import { auth } from "../firebase/firebaseConfig";
import { getCurrentUserToken } from "../services/authService";
import { setAuthTokenProvider } from "../services/apiClient";
import { getCurrentAccount } from "../services/accountService";
import { createBusiness } from "../services/businessService";
import {
  clearPendingSellerProfile,
  getSellerProfile,
} from "../services/sellerService";
import { AuthContext } from "./authContextValue";

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [account, setAccount] = useState(null);
  const [accountError, setAccountError] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  async function loadAccount(currentUser) {
    let legacyProfile = await getSellerProfile(currentUser);

    try {
      let currentAccount = await getCurrentAccount();

      if (
        !legacyProfile &&
        currentAccount.profile?.businessName &&
        !currentAccount.business
      ) {
        legacyProfile = {
          ownerName: currentAccount.profile.ownerName,
          businessName: currentAccount.profile.businessName,
        };
      }

      if (!currentAccount.business && legacyProfile) {
        await createBusiness({
          ownerName:
            legacyProfile.ownerName ??
            currentUser.displayName ??
            "Business owner",
          businessName: legacyProfile.businessName,
        });

        currentAccount = await getCurrentAccount();
      }

      setAccount(currentAccount);
      setAccountError(null);

      if (currentAccount.business) {
        await clearPendingSellerProfile(currentUser);
        setSellerProfile({
          ...legacyProfile,
          ownerName:
            currentAccount.profile?.displayName ??
            legacyProfile?.ownerName ??
            currentUser.displayName ??
            "",
          businessName: currentAccount.business.name,
        });
        return;
      }
    } catch (error) {
      if (error.code === "email_not_verified") {
        // A stale, unverified session is stuck signed in on-device — clear it
        // so Stack.Protected sends the seller back to /login instead of
        // leaving them on a broken, business-less screen forever.
        await signOut(auth);
        return;
      }

      console.error("Vendly account could not be loaded:", error);
      setAccount(null);
      setAccountError(error);
    }

    setSellerProfile(legacyProfile);
  }

  useEffect(() => {
    setAuthTokenProvider(() => getCurrentUserToken());

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsAuthLoading(true);

      // Password accounts must verify their email before the backend will
      // accept their token. Sign them out here, before ever calling /me,
      // instead of racing loginWithEmail's own (later) verification check.
      const isUnverifiedPasswordAccount =
        currentUser &&
        !currentUser.emailVerified &&
        currentUser.providerData.some((provider) => provider.providerId === "password");

      if (isUnverifiedPasswordAccount) {
        await signOut(auth);
        return;
      }

      setUser(currentUser);

      try {
        if (currentUser) {
          await loadAccount(currentUser);
        } else {
          setSellerProfile(null);
          setAccount(null);
          setAccountError(null);
        }
      } catch (error) {
        console.error("Seller profile could not be loaded:", error);
        setSellerProfile(null);
      } finally {
        setIsAuthLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  async function refreshSellerProfile() {
    if (!auth.currentUser) {
      setSellerProfile(null);
      setAccount(null);
      return;
    }

    await loadAccount(auth.currentUser);
  }

  const authValue = {
    user,
    sellerProfile,
    account,
    business: account?.business ?? null,
    membership: account?.membership ?? null,
    accountError,
    refreshSellerProfile,
    isAuthLoading,
    isAuthenticated: Boolean(user),
  };

  return (
    <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
  );
}

export { AuthProvider };
