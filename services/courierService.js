import { apiRequest } from "./apiClient";

export async function getCouriers(businessId) {
  const response = await apiRequest(`/businesses/${businessId}/couriers`);
  return response.couriers;
}

export async function recommendCouriers(businessId, totalWeightGrams, district) {
  const response = await apiRequest(
    `/businesses/${businessId}/couriers/recommend`,
    { method: "POST", body: { totalWeightGrams, district } },
  );
  return response.recommendations;
}
