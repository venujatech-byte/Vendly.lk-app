import AsyncStorage from "@react-native-async-storage/async-storage";

function pendingProfileKey(email) {
  return `vendly-pending-profile:${String(email ?? "").trim().toLowerCase()}`;
}

export async function getSellerProfile(user) {
  if (!user?.email) return null;

  const storedValue = await AsyncStorage.getItem(pendingProfileKey(user.email));

  if (!storedValue) return null;

  try {
    return JSON.parse(storedValue);
  } catch {
    await AsyncStorage.removeItem(pendingProfileKey(user.email));
    return null;
  }
}

export async function saveSellerProfile(user, profileData) {
  await AsyncStorage.setItem(
    pendingProfileKey(user.email),
    JSON.stringify({
      ownerName: profileData.ownerName.trim(),
      businessName: profileData.businessName.trim(),
      email: user.email ?? "",
    }),
  );
}

export async function clearPendingSellerProfile(user) {
  if (user?.email) await AsyncStorage.removeItem(pendingProfileKey(user.email));
}
