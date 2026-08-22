import { useEffect, useState } from "react";

import { setAuthTokenProvider } from "../services/apiClient";
import { AuthContext } from "./authContextValue";

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [account, setAccount] = useState(null);
  const [accountError, setAccountError] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    setAuthTokenProvider(async () => null);

    setIsAuthLoading(false);
  }, []);

  async function refreshSellerProfile() {
    if (!user) {
      setSellerProfile(null);
      setAccount(null);
    }
  }

  const authValue = {
    user,
    setUser,
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
