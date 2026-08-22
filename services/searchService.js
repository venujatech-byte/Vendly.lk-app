import { apiRequest } from "./apiClient";

export async function searchBusiness(businessId, query) {
  const response = await apiRequest(
    `/businesses/${businessId}/search?q=${encodeURIComponent(query)}`,
  );
  return response.results;
}
