import { apiRequest } from "./apiClient";

export async function getBusinessBilling(businessId) {
  const response = await apiRequest(`/businesses/${businessId}/billing`);
  return response.billing;
}

export async function createPayHereCheckout(businessId, checkoutData) {
  const response = await apiRequest(`/businesses/${businessId}/billing/checkout`, {
    method: "POST",
    body: checkoutData,
  });
  return response.checkout;
}
