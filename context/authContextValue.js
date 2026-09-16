import { createContext, useContext } from "react";

/**
 * @typedef {Object} AuthContextValue
 * @property {import('@/context/authContextValue').Business} business
 * @property {import('@/context/authContextValue').SellerProfile} sellerProfile
 * @property {import('@/context/authContextValue').Account} account
 * @property {import('@/context/authContextValue').Membership} membership
 * @property {import('@/context/authContextValue').AccountError} accountError
 * @property {import('@/context/authContextValue').RefreshSellerProfile} refreshSellerProfile
 * @property {import('@/context/authContextValue').IsAuthLoading} isAuthLoading
 * @property {import('@/context/authContextValue').IsAuthenticated} isAuthenticated
 */

/**
 * @typedef {Object} Business
 * @property {string} id
 * @property {string} name
 * @property {string} shortCode
 */

/**
 * @typedef {Object} SellerProfile
 * @property {string} ownerName
 * @property {string} businessName
 */

/**
 * @typedef {Object} Account
 * @property {import('@/services/businessService').Business} business
 * @property {import('@/services/sellerService').Membership} membership
 */

/**
 * @typedef {Object} Membership
 * @property {string} type
 */

/**
 * @typedef {Object} AccountError
 * @property {string} code
 * @property {string} message
 */

export const AuthContext = createContext(null);

/**
 * @param {AuthContextValue} context
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
