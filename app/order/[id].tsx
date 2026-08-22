import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import StatusPill from "@/components/orders/StatusPill";
import { STATUS_LABELS, STATUS_TRANSITIONS } from "@/constants/orderStatus";
import { useAuth } from "@/context/authContextValue";
import { useAppTheme } from "@/context/ThemeContext";
import { getOrder, updateOrder, updateOrderStatus } from "@/services/orderService";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
  const { business } = useAuth();

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [waybillNumber, setWaybillNumber] = useState("");
  const [isSavingWaybill, setIsSavingWaybill] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!business?.id || !id) return;

    setLoadError(null);
    try {
      const result = await getOrder(business.id, String(id));
      setOrder(result);
      setWaybillNumber(result.waybillNumber ?? "");
    } catch (error) {
      setLoadError(error);
    } finally {
      setIsLoading(false);
    }
  }, [business?.id, id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  async function handleStatusChange(nextStatus) {
    if (!business?.id || !order) return;

    Alert.alert(
      "Update status",
      `Move this order to "${STATUS_LABELS[nextStatus] ?? nextStatus}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setIsUpdatingStatus(true);
            try {
              const updated = await updateOrderStatus(business.id, order.id, nextStatus);
              setOrder(updated);
            } catch (error) {
              Alert.alert("Could not update status", error.message ?? "Please try again.");
            } finally {
              setIsUpdatingStatus(false);
            }
          },
        },
      ],
    );
  }

  async function handleSaveWaybill() {
    if (!business?.id || !order) return;

    setIsSavingWaybill(true);
    try {
      const updated = await updateOrder(business.id, order.id, { waybillNumber });
      setOrder(updated);
      Alert.alert("Saved", "Waybill number updated.");
    } catch (error) {
      Alert.alert("Could not save waybill number", error.message ?? "Please try again.");
    } finally {
      setIsSavingWaybill(false);
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (loadError || !order) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.errorText}>This order could not be loaded.</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const nextStatuses = STATUS_TRANSITIONS[order.fulfilmentStatus] ?? [];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {order.orderNumber ?? order.id}
        </Text>
        <StatusPill status={order.status} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {order.fraudWarning && (
          <View style={styles.fraudBanner}>
            <Text style={styles.fraudTitle}>Fraud risk match</Text>
            <Text style={styles.fraudBody}>{order.fraudWarning.message}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer</Text>
          <Text style={styles.line}>{order.customerName}</Text>
          {order.phoneNumber ? <Text style={styles.lineMuted}>{order.phoneNumber}</Text> : null}
          {order.email ? <Text style={styles.lineMuted}>{order.email}</Text> : null}
          {order.deliveryAddress ? (
            <Text style={[styles.lineMuted, { marginTop: 6 }]}>{order.deliveryAddress}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items</Text>
          {order.items.map((item, index) => (
            <View key={item.variantId ?? index} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.line}>{item.name}</Text>
                <Text style={styles.lineMuted}>
                  {item.quantity} × {item.unitPrice}
                </Text>
              </View>
              <Text style={styles.line}>{item.price}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.lineMuted}>Subtotal</Text>
            <Text style={styles.line}>{order.subtotal}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.lineMuted}>Delivery fee</Text>
            <Text style={styles.line}>{order.deliveryFee}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.cardTitle}>Total</Text>
            <Text style={styles.cardTitle}>{order.total}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery</Text>
          <Text style={styles.line}>Courier: {order.courier}</Text>
          <Text style={styles.lineMuted}>Payment: {order.paymentMethod}</Text>

          <Text style={[styles.cardTitle, { marginTop: 14 }]}>Waybill number</Text>
          <View style={styles.waybillRow}>
            <TextInput
              style={styles.waybillInput}
              value={waybillNumber}
              onChangeText={setWaybillNumber}
              placeholder="Not set"
              placeholderTextColor={colors.subtle}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveWaybill}
              disabled={isSavingWaybill}
            >
              {isSavingWaybill ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {nextStatuses.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Change status</Text>
            <View style={styles.statusButtons}>
              {nextStatuses.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={styles.statusButton}
                  onPress={() => handleStatusChange(status)}
                  disabled={isUpdatingStatus}
                >
                  <Text style={styles.statusButtonText}>
                    {STATUS_LABELS[status] ?? status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(colors, topInset) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      alignItems: "center",
      justifyContent: "center",
    },
    errorText: {
      color: colors.muted,
      fontSize: 14,
    },
    backLink: {
      marginTop: 12,
    },
    backLinkText: {
      color: colors.accent,
      fontWeight: "600",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 14 + topInset,
      paddingBottom: 14,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 16,
    },
    content: {
      padding: 16,
      gap: 12,
      paddingBottom: 40,
    },
    fraudBanner: {
      borderRadius: 10,
      backgroundColor: colors.dangerBackground,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      padding: 12,
    },
    fraudTitle: {
      color: colors.danger,
      fontWeight: "700",
      marginBottom: 4,
    },
    fraudBody: {
      color: colors.danger,
      fontSize: 12,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 4,
    },
    cardTitle: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 14,
      marginBottom: 4,
    },
    line: {
      color: colors.text,
      fontSize: 14,
    },
    lineMuted: {
      color: colors.muted,
      fontSize: 13,
    },
    itemRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 6,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 8,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 3,
    },
    waybillRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 6,
    },
    waybillInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: colors.textStrong,
      backgroundColor: colors.background,
    },
    saveButton: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    saveButtonText: {
      color: "#ffffff",
      fontWeight: "700",
    },
    statusButtons: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    statusButton: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    statusButtonText: {
      color: colors.accent,
      fontWeight: "700",
      fontSize: 13,
    },
  });
}
