import { createContext, useContext } from "react";

/** @typedef {Object} Business */
/** @property {string} id */
/** @property {string} name */
/** @property {string} shortCode */

/** @typedef {Object} SellerProfile */
/** @property {string} ownerName */
/** @property {string} businessName */

/** @typedef {Object} AuthContextValue */
/** @property {Business} business */
/** @property {SellerProfile} sellerProfile */

/** @typedef {Object} RefreshSellerProfile */
/** @param {()} arg0 */

/** Create context with proper typing */
export const AuthContext = createContext(null);

/** @param {()} arg0 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}