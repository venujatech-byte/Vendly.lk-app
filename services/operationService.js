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

// The web app builds a printable HTML window. On mobile there is no print
// window, so callers share a plain-text waybill summary instead.
export function buildWaybillText(order) {
  return [
    `Waybill: ${order.waybillNumber ?? "Not generated"}`,
    `Order: ${order.orderNumber}`,
    `Customer: ${order.customerName}`,
    `Phone: ${order.phoneNumber}`,
    order.secondaryPhoneNumber ? `Alt phone: ${order.secondaryPhoneNumber}` : "",
    `Address: ${order.deliveryAddress}`,
    `Courier: ${order.courier}`,
    `Items: ${order.itemCount}`,
    `Total: ${order.total}`,
  ]
    .filter(Boolean)
    .join("\n");
}
