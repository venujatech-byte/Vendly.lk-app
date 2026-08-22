import { apiRequest } from "./apiClient";

export async function getNotifications(businessId, unreadOnly = false) {
  const query = unreadOnly ? "?unread=true" : "";
  const response = await apiRequest(
    `/businesses/${businessId}/notifications${query}`,
  );
  return response.notifications;
}

export async function markNotificationRead(businessId, notificationId) {
  const response = await apiRequest(
    `/businesses/${businessId}/notifications/${notificationId}/read`,
    { method: "PATCH" },
  );
  return response.notification;
}
