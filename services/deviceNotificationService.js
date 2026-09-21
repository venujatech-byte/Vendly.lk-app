import { Platform } from "react-native";

// expo-notifications is a native module, so it only exists once a development
// build has been rebuilt with it. Load it defensively so the app keeps working
// on an older binary — notifications simply stay silent until then.
let Notifications = null;
try {
  Notifications = require("expo-notifications");
} catch {
  Notifications = null;
}

export const isDeviceNotificationsAvailable = Boolean(Notifications);

let isConfigured = false;

// Notifications the app has already raised, so a poll that returns the same
// unread rows again does not re-notify for them.
const alreadyNotifiedIds = new Set();

export async function configureDeviceNotifications() {
  if (Platform.OS === "web") return;
  if (!Notifications || isConfigured) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Vendly alerts",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const settings = await Notifications.getPermissionsAsync();

  if (!settings.granted) {
    await Notifications.requestPermissionsAsync();
  }

  isConfigured = true;
}

// Raise a device notification for each unread item the app has not shown yet.
// Mirrors the web Header's `new Notification(...)` behaviour.
export async function notifyNewNotifications(notifications = []) {
  if (!Notifications) return;

  const unseen = notifications.filter(
    (notification) => notification.id && !alreadyNotifiedIds.has(notification.id),
  );

  for (const notification of unseen) {
    alreadyNotifiedIds.add(notification.id);

    await Notifications.scheduleNotificationAsync({
      content: {
        // The backend writes the detail under `message`, not `body`.
        title: notification.title ?? "Vendly",
        body: notification.message ?? "",
        data: {
          notificationId: notification.id,
          type: notification.type,
          orderId: notification.orderId ?? null,
        },
      },
      trigger: null,
    });
  }
}

// Called on first load so an existing backlog of unread items does not fire a
// burst of notifications for things the seller has already seen elsewhere.
export function markNotificationsAsSeen(notifications = []) {
  for (const notification of notifications) {
    if (notification.id) alreadyNotifiedIds.add(notification.id);
  }
}
