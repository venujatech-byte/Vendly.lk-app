import { apiRequest } from "./apiClient";

export async function getAnalyticsOverview(businessId) {
  const response = await apiRequest(
    `/businesses/${businessId}/analytics/overview`,
  );
  return response.analytics;
}

export async function getSalesAnalytics(businessId, period = "30d") {
  const response = await apiRequest(
    `/businesses/${businessId}/analytics/sales?period=${period}`,
  );
  return response.analytics;
}

export async function getOrderStatusAnalytics(businessId, period = "30d") {
  const response = await apiRequest(
    `/businesses/${businessId}/analytics/order-status?period=${period}`,
  );
  return response.analytics;
}

export async function getTopProductsAnalytics(businessId, period = "30d", limit = 10) {
  const response = await apiRequest(
    `/businesses/${businessId}/analytics/top-products?period=${period}&limit=${limit}`,
  );
  return response.analytics;
}

export async function getCourierPerformanceAnalytics(businessId, period = "30d") {
  const response = await apiRequest(
    `/businesses/${businessId}/analytics/courier-performance?period=${period}`,
  );
  return response.analytics;
}

export function formatAnalyticsMoney(minorUnits = 0) {
  return `LKR ${(minorUnits / 100).toLocaleString("en-LK", {
    maximumFractionDigits: 0,
  })}`;
}

export function formatCurrency(minorUnits = 0) {
  return `LKR ${(minorUnits / 100).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
