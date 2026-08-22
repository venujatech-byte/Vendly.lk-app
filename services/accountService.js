import { apiRequest } from "./apiClient";

export function getCurrentAccount() {
  return apiRequest("/me");
}
