import { Image } from "expo-image";
import {
  CircleAlert,
  Flag,
  MapPin,
  Package,
  Phone,
  Printer,
  User,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { STATUS_LABELS, STATUS_TRANSITIONS } from "../../constants/orderStatus";
import { useAppTheme } from "../../context/ThemeContext";
import { shareWaybillPdf } from "../../services/fileService";
import PromptModal from "./PromptModal";

// Statuses that release reserved stock, so they always confirm first.
const DESTRUCTIVE_STATUSES = new Set(["cancelled", "returned"]);

function readableStatus(status = "") {
  return (
    STATUS_LABELS[status] ??
    status
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

export default function OrderDetailsPanel({
  order,
  onStatusChange,
  onGenerateWaybill,
  onFraudReport,
  onCourierIssue,
  onWaybillSave,
}) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [actionError, setActionError] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [waybillNumber, setWaybillNumber] = useState(order.waybillNumber ?? "");
  const [activePrompt, setActivePrompt] = useState(null);

  useEffect(() => {
    setWaybillNumber(order.waybillNumber ?? "");
  }, [order.id, order.waybillNumber]);

  const items = order.items?.length
    ? order.items
    : [
        {
          id: `${order.id}-item`,
          name: "Order items",
          quantity: order.itemCount,
          price: order.total,
        },
      ];

  const nextStatuses = STATUS_TRANSITIONS[order.fulfilmentStatus] ?? [];

  async function runAction(action) {
    setActionError("");
    setIsWorking(true);

    try {
      await action();
    } catch (error) {
      setActionError(error.message ?? "Something went wrong. Please try again.");
    } finally {
      setIsWorking(false);
    }
  }

  // Cancelling or returning releases reserved stock, so confirm first.
  function handleStatusPress(status) {
    if (!DESTRUCTIVE_STATUSES.has(status)) {
      runAction(() => onStatusChange?.(order.id, status));
      return;
    }

    const isCancelling = status === "cancelled";

    Alert.alert(
      isCancelling ? "Cancel order" : "Mark as returned",
      isCancelling
        ? `Cancel order #${order.orderNumber}? Any reserved stock is released back to inventory.`
        : `Mark order #${order.orderNumber} as returned? Its stock is released back to inventory.`,
      [
        { text: "Keep as is", style: "cancel" },
        {
          text: isCancelling ? "Cancel order" : "Mark returned",
          style: "destructive",
          onPress: () => runAction(() => onStatusChange?.(order.id, status)),
        },
      ],
    );
  }

  function handleShareWaybill() {
    runAction(async () => {
      // A waybill number must exist before the PDF can be printed.
      const printableOrder = order.waybillNumber
        ? order
        : ((await onGenerateWaybill?.(order.id)) ?? order);

      await shareWaybillPdf(printableOrder);
    });
  }

  function handleWaybillSave() {
    const trimmedWaybill = waybillNumber.trim();

    if (!trimmedWaybill) {
      setActionError("Enter a waybill number before saving.");
      return;
    }

    runAction(() => onWaybillSave?.(order.id, trimmedWaybill));
  }

  return (
    <View style={styles.panel}>
      {order.fraudWarning && (
        <View style={styles.warning}>
          <CircleAlert size={19} color={colors.danger} />
          <View style={styles.warningBody}>
            <Text style={styles.warningTitle}>Fraud warning</Text>
            <Text style={styles.warningText}>{order.fraudWarning.message}</Text>
            <Text style={styles.warningMeta}>
              Risk: {order.fraudWarning.riskLevel} · Score: {order.fraudWarning.score}
              {order.fraudWarning.reportCount
                ? ` · ${order.fraudWarning.reportCount} report(s)`
                : ""}
              {order.fraudWarning.returnedOrderCount
                ? ` · ${order.fraudWarning.returnedOrderCount} return(s)`
                : ""}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Courier</Text>
          <Text style={styles.metaValue}>{order.courier || "Not assigned"}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Status</Text>
          <Text style={styles.metaValue}>
            {readableStatus(order.status || order.fulfilmentStatus)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Order date</Text>
          <Text style={styles.metaValue}>
            {order.date} {order.time}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Items in this order</Text>
      <View style={styles.itemsList}>
        {items.map((item, index) => (
          <View key={item.id ?? index} style={styles.itemRow}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.itemImage} contentFit="cover" />
            ) : (
              <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                <Package size={16} color={colors.subtle} />
              </View>
            )}

            <View style={styles.itemBody}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.itemMeta}>
                Qty: {item.quantity} × {item.unitPrice ?? item.price}
              </Text>
            </View>

            <Text style={styles.itemPrice}>{item.price}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Delivery address</Text>
      <View style={styles.infoList}>
        <View style={styles.infoRow}>
          <User size={16} color={colors.muted} />
          <Text style={styles.infoText}>{order.customerName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Phone size={16} color={colors.muted} />
          <Text style={styles.infoText}>{order.phoneNumber}</Text>
        </View>
        {order.secondaryPhoneNumber ? (
          <View style={styles.infoRow}>
            <Phone size={16} color={colors.muted} />
            <Text style={styles.infoText}>{order.secondaryPhoneNumber}</Text>
          </View>
        ) : null}
        <View style={styles.infoRow}>
          <MapPin size={16} color={colors.muted} />
          <Text style={styles.infoText}>
            {order.deliveryAddress || "Address not available"}
          </Text>
        </View>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{order.subtotal ?? order.total}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery fee</Text>
          <Text style={styles.summaryValue}>
            {order.deliveryFee ?? "Not calculated"}
          </Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotalRow]}>
          <Text style={styles.summaryTotalLabel}>Total</Text>
          <Text style={styles.summaryTotalValue}>{order.total}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Waybill number</Text>
      <View style={styles.waybillRow}>
        <TextInput
          style={styles.waybillInput}
          value={waybillNumber}
          onChangeText={setWaybillNumber}
          placeholder="Enter waybill number"
          placeholderTextColor={colors.subtle}
          autoCapitalize="characters"
          editable={!isWorking}
        />
        <TouchableOpacity
          style={styles.waybillSaveButton}
          onPress={handleWaybillSave}
          disabled={isWorking}
        >
          <Text style={styles.waybillSaveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Order actions</Text>

      {nextStatuses.length > 0 ? (
        <View style={styles.statusButtons}>
          {nextStatuses.map((status) => (
            <TouchableOpacity
              key={status}
              style={styles.statusButton}
              onPress={() => handleStatusPress(status)}
              disabled={isWorking}
            >
              <Text style={styles.statusButtonText}>{readableStatus(status)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={styles.noStatusText}>
          This order has reached its final status.
        </Text>
      )}

      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleShareWaybill}
        disabled={isWorking}
      >
        <Printer size={16} color={colors.text} />
        <Text style={styles.actionButtonText}>Waybill PDF</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => setActivePrompt("courier")}
        disabled={isWorking}
      >
        <CircleAlert size={16} color={colors.text} />
        <Text style={styles.actionButtonText}>Report courier issue</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, styles.dangerButton]}
        onPress={() => setActivePrompt("fraud")}
        disabled={isWorking || Boolean(order.fraudReport)}
      >
        <Flag size={16} color={colors.danger} />
        <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
          {order.fraudReport ? "Fraud reported" : "Report fake order"}
        </Text>
      </TouchableOpacity>

      {isWorking && <ActivityIndicator color={colors.accent} style={styles.loader} />}

      {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}

      <PromptModal
        visible={activePrompt === "fraud"}
        title="Report fake order"
        description="Add a private note explaining why this appears to be a fake order."
        defaultValue="Customer details could not be verified."
        confirmLabel="Report"
        isDanger
        onCancel={() => setActivePrompt(null)}
        onConfirm={(note) => {
          setActivePrompt(null);
          runAction(() => onFraudReport?.(order.id, note));
        }}
      />

      <PromptModal
        visible={activePrompt === "courier"}
        title="Report courier issue"
        description="Describe the courier branch problem."
        defaultValue="Delivery was affected by a courier branch problem."
        confirmLabel="Report"
        onCancel={() => setActivePrompt(null)}
        onConfirm={(note) => {
          setActivePrompt(null);
          runAction(() => onCourierIssue?.(order.id, note));
        }}
      />
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    panel: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
      marginTop: 10,
      gap: 4,
    },
    warning: {
      flexDirection: "row",
      gap: 10,
      backgroundColor: colors.dangerBackground,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    warningBody: {
      flex: 1,
      gap: 2,
    },
    warningTitle: {
      color: colors.danger,
      fontWeight: "700",
      fontSize: 13,
    },
    warningText: {
      color: colors.danger,
      fontSize: 12,
    },
    warningMeta: {
      color: colors.danger,
      fontSize: 11,
      opacity: 0.85,
    },
    metaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 6,
    },
    metaItem: {
      flexGrow: 1,
      minWidth: 90,
    },
    metaLabel: {
      color: colors.subtle,
      fontSize: 11,
      marginBottom: 2,
    },
    metaValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
    },
    sectionTitle: {
      color: colors.textStrong,
      fontSize: 13,
      fontWeight: "700",
      marginTop: 14,
      marginBottom: 8,
    },
    itemsList: {
      gap: 8,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    itemImage: {
      width: 38,
      height: 38,
      borderRadius: 8,
      backgroundColor: colors.surfaceSoft,
    },
    itemImagePlaceholder: {
      alignItems: "center",
      justifyContent: "center",
    },
    itemBody: {
      flex: 1,
    },
    itemName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
    },
    itemMeta: {
      color: colors.muted,
      fontSize: 12,
    },
    itemPrice: {
      color: colors.textStrong,
      fontSize: 13,
      fontWeight: "700",
    },
    infoList: {
      gap: 7,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    infoText: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
    },
    summary: {
      marginTop: 14,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 10,
      padding: 12,
      gap: 6,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    summaryLabel: {
      color: colors.muted,
      fontSize: 13,
    },
    summaryValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
    },
    summaryTotalRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 6,
      marginTop: 2,
    },
    summaryTotalLabel: {
      color: colors.textStrong,
      fontSize: 14,
      fontWeight: "700",
    },
    summaryTotalValue: {
      color: colors.textStrong,
      fontSize: 14,
      fontWeight: "700",
    },
    waybillRow: {
      flexDirection: "row",
      gap: 8,
    },
    waybillInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 9,
      color: colors.textStrong,
      backgroundColor: colors.background,
      fontSize: 13,
    },
    waybillSaveButton: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingHorizontal: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    waybillSaveText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 13,
    },
    statusButtons: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 4,
    },
    statusButton: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 8,
      paddingVertical: 9,
      paddingHorizontal: 16,
    },
    statusButtonText: {
      color: colors.accent,
      fontWeight: "700",
      fontSize: 13,
    },
    noStatusText: {
      color: colors.muted,
      fontSize: 12,
      marginBottom: 4,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 11,
      marginTop: 8,
    },
    actionButtonText: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 13,
    },
    dangerButton: {
      borderColor: colors.dangerBorder,
    },
    dangerButtonText: {
      color: colors.danger,
    },
    loader: {
      marginTop: 12,
    },
    errorText: {
      color: colors.danger,
      fontSize: 12,
      marginTop: 10,
    },
  });
}
