import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, MoreVertical } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import OrderActionsMenu from "@/components/orders/OrderActionsMenu";
import OrderDetailsPanel from "@/components/orders/OrderDetailsPanel";
import StatusPill from "@/components/orders/StatusPill";
import { useAuth } from "@/context/authContextValue";
import { useAppTheme } from "@/context/ThemeContext";
import {
  generateOrderWaybill,
  reportCourierIssue,
  reportFraudOrder,
} from "@/services/operationService";
import {
  getOrder,
  recordOrderPayment,
  removeOrder,
  updateOrder,
  updateOrderStatus,
} from "@/services/orderService";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
  const { business } = useAuth();

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!business?.id || !id) return;

    setLoadError(null);

    try {
      setOrder(await getOrder(business.id, String(id)));
    } catch (error) {
      setLoadError(error);
    } finally {
      setIsLoading(false);
    }
  }, [business?.id, id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const detailHandlers = {
    onStatusChange: async (orderId, status) => {
      setOrder(await updateOrderStatus(business.id, orderId, status));
    },
    onGenerateWaybill: async (orderId) => {
      const updated = await generateOrderWaybill(business.id, orderId);
      setOrder(updated);
      return updated;
    },
    onWaybillSave: async (orderId, waybillNumber) => {
      setOrder(await updateOrder(business.id, orderId, { waybillNumber }));
    },
    onFraudReport: async (orderId, note) => {
      await reportFraudOrder(business.id, orderId, "fake-details", note);
      setOrder((current) =>
        current
          ? { ...current, fraudReport: { status: "active", reason: "fake-details" } }
          : current,
      );
    },
    onCourierIssue: async (orderId, note) => {
      await reportCourierIssue(business.id, orderId, "branch-problem", note);
    },
    onRecordPayment: async (orderId, payment) => {
      setOrder(await recordOrderPayment(business.id, orderId, payment));
    },
  };

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

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            #{order.orderNumber}
          </Text>
          <Text style={styles.headerWaybill} numberOfLines={1}>
            {order.waybillNumber
              ? `Waybill: ${order.waybillNumber}`
              : "Waybill: not assigned"}
          </Text>
        </View>

        <StatusPill status={order.status} />

        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => setIsActionsOpen(true)}
          hitSlop={8}
        >
          <MoreVertical size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <OrderDetailsPanel order={order} {...detailHandlers} />
      </ScrollView>

      <OrderActionsMenu
        order={isActionsOpen ? order : null}
        businessId={business?.id}
        onClose={() => setIsActionsOpen(false)}
        {...detailHandlers}
        onRemove={async (orderId) => {
          await removeOrder(business.id, orderId);
          router.back();
        }}
      />
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
    moreButton: {
      width: 28,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    headerText: {
      flex: 1,
    },
    headerTitle: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 16,
    },
    headerWaybill: {
      color: colors.subtle,
      fontSize: 11,
      fontWeight: "600",
      marginTop: 2,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },
  });
}
