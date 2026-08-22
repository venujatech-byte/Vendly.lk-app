import { apiRequest } from "./apiClient";

export function createBusiness({ ownerName, businessName }) {
  return apiRequest("/businesses", {
    method: "POST",
    body: { ownerName, businessName },
  });
}
