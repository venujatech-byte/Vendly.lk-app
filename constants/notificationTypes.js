import {
  Flag,
  MessageSquare,
  Package,
  ShieldAlert,
  Bell,
} from "lucide-react-native";

// Every notification type the Flask backend writes, with how it should look
// and where tapping it should go.
export const NOTIFICATION_TYPES = {
  "new-order": {
    label: "New order",
    icon: Package,
    tone: "blue",
  },
  "fraud-warning": {
    label: "Fraud warning",
    icon: ShieldAlert,
    tone: "red",
  },
  "fraud-report": {
    label: "Fraud report",
    icon: Flag,
    tone: "red",
  },
  "chat-needs-attention": {
    label: "Customer message",
    icon: MessageSquare,
    tone: "orange",
  },
};

export const DEFAULT_NOTIFICATION_TYPE = {
  label: "Notification",
  icon: Bell,
  tone: "blue",
};

export function getNotificationType(type) {
  return NOTIFICATION_TYPES[type] ?? DEFAULT_NOTIFICATION_TYPE;
}

// Where a notification leads when tapped. Chat lives on the web dashboard
// only, so those stay on the customers tab.
export function getNotificationTarget(notification) {
  switch (notification.type) {
    case "new-order":
    case "fraud-report":
    case "fraud-warning":
      return notification.orderId ? `/order/${notification.orderId}` : "/(tabs)/orders";
    case "chat-needs-attention":
      return "/(tabs)/customers";
    default:
      return null;
  }
}

export function formatRelativeTime(value) {
  if (!value) return "";

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "";

  const secondsAgo = Math.round((Date.now() - timestamp) / 1000);

  if (secondsAgo < 60) return "Just now";
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
  if (secondsAgo < 604800) return `${Math.floor(secondsAgo / 86400)}d ago`;

  return new Date(timestamp).toLocaleDateString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
