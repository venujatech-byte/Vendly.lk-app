import { apiRequest } from "./apiClient";
import { mapOrderForTable } from "./orderService";

export async function generateOrderWaybill(businessId, orderId) {
  const response = await apiRequest(
    `/businesses/${businessId}/orders/${orderId}/waybill`,
    { method: "POST" },
  );
  return mapOrderForTable(response.order);
}

export async function reportFraudOrder(businessId, orderId, type, note) {
  const response = await apiRequest(
    `/businesses/${businessId}/orders/${orderId}/fraud-report`,
    { method: "POST", body: { type, note } },
  );
  return response.fraudReport;
}

export async function reportCourierIssue(businessId, orderId, type, note) {
  const response = await apiRequest(
    `/businesses/${businessId}/orders/${orderId}/courier-issues`,
    { method: "POST", body: { type, note } },
  );
  return response.courierIssue;
}
