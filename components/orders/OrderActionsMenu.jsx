import {
  BadgeDollarSign,
  ChevronLeft,
  CircleAlert,
  Flag,
  Hash,
  Pencil,
  Printer,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { STATUS_LABELS, STATUS_TRANSITIONS } from "../../constants/orderStatus";
import { useAppTheme } from "../../context/ThemeContext";
import { shareWaybillPdf } from "../../services/fileService";
import PromptModal from "./PromptModal";
import RecordPaymentModal from "./RecordPaymentModal";
import WarrantyClaimModal from "./WarrantyClaimModal";

// Statuses that destroy work in progress, so they always confirm first.
const DESTRUCTIVE_STATUSES = new Set(["cancelled", "returned"]);

// Payment status hint messages per fulfilment status
const PAYMENT_HINTS = {
  "needs-confirmation":
    "This order is waiting on a bank transfer. Record the payment, or change it to cash on delivery, before confirming it.",
  confirmed: "Payment has been confirmed for this order.",
};

export default function OrderActionsMenu({
  order,
  onClose,
  businessId,
  onStatusChange,
  onGenerateWaybill,
  onFraudReport,
  onCourierIssue,
  onRemove,
  onEdit,
  onRecordPayment,
  onWaybillEdit,
}) {
  const { colors, theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets.bottom, theme);

  const [view, setView] = useState("main");
  const [prompt, setPrompt] = useState(null);
  const [isWorking, setIsWorking] = useState(false);
  const [waybillInput, setWaybillInput] = useState("");
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isWarrantyOpen, setIsWarrantyOpen] = useState(false);

  useEffect(() => {
    if (order) {
      setView("main");
      setPrompt(null);
      setWaybillInput(order.waybillNumber ?? "");
      setIsPaymentOpen(false);
      setIsWarrantyOpen(false);
    }
  }, [order]);

  if (!order) return null;

  const nextStatuses = STATUS_TRANSITIONS[order.fulfilmentStatus] ?? [];
  const paymentHint = PAYMENT_HINTS[order.fulfilmentStatus];
  const isBankTransfer =
    order.paymentMethod === "bank_transfer" || order.paymentMethod === "deposit";

  async function runAction(action, { closeAfter = true } = {}) {
    setIsWorking(true);

    try {
      await action();
      if (closeAfter) onClose();
    } catch (error) {
      Alert.alert("Action failed", error.message ?? "Please try again.");
    } finally {
      setIsWorking(false);
    }
  }

  function handleStatusPress(status) {
    if (!DESTRUCTIVE_STATUSES.has(status)) {
      runAction(() => onStatusChange(order.id, status));
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
          onPress: () => runAction(() => onStatusChange(order.id, status)),
        },
      ],
    );
  }

  function handleShareWaybill() {
    runAction(async () => {
      const printableOrder = order.waybillNumber
        ? order
        : ((await onGenerateWaybill?.(order.id)) ?? order);
      await shareWaybillPdf(printableOrder);
    });
  }

  function handleRemovePress() {
    Alert.alert(
      "Remove order",
      `Remove order #${order.orderNumber}? This cancels it and releases any reserved stock. This cannot be undone.`,
      [
        { text: "Keep order", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => runAction(() => onRemove(order.id)),
        },
      ],
    );
  }

  function handleSaveWaybill() {
    const trimmed = waybillInput.trim();
    if (!trimmed) {
      Alert.alert("Empty waybill", "Please enter a waybill number.");
      return;
    }
    runAction(() => onWaybillEdit?.(order.id, trimmed));
  }

  function renderMain() {
    return (
      <>
        {/* Order number header */}
        <View style={styles.orderHeader}>
          <Text style={styles.title} numberOfLines={1}>
            #{order.orderNumber}
          </Text>
          <Text style={styles.subtitle}>{order.customerName}</Text>
        </View>

        {/* Payment hint banner for bank transfers awaiting confirmation */}
        {paymentHint && isBankTransfer && (
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>{paymentHint}</Text>
          </View>
        )}

        {/* === PRIMARY ACTIONS === */}

        {onEdit && (
          <TouchableOpacity style={styles.action} onPress={onEdit} disabled={isWorking}>
            <Pencil size={18} color={colors.text} />
            <Text style={styles.actionText}>Edit order</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.action}
          onPress={() => setView("waybill")}
          disabled={isWorking}
        >
          <Hash size={18} color={colors.text} />
          <Text style={styles.actionText}>Edit waybill number</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.action}
          onPress={handleShareWaybill}
          disabled={isWorking}
        >
          <Printer size={18} color={colors.text} />
          <Text style={styles.actionText}>Print waybill</Text>
        </TouchableOpacity>

        {/* === STATUS TRANSITIONS - show each as a named button === */}
        {nextStatuses.length > 0 && (
          <>
            {nextStatuses.map((status) => {
              const isDestructive = DESTRUCTIVE_STATUSES.has(status);
              return (
                <TouchableOpacity
                  key={status}
                  style={styles.action}
                  onPress={() => handleStatusPress(status)}
                  disabled={isWorking}
                >
                  <RefreshCw size={18} color={isDestructive ? colors.danger : colors.text} />
                  <Text style={[styles.actionText, isDestructive && styles.dangerText]}>
                    Mark as {STATUS_LABELS[status] ?? status}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* === RECORD PAYMENT (for bank transfer/deposit orders) === */}
        {(isBankTransfer || order.paidAmountMinor < order.totalMinor) && onRecordPayment && (
          <TouchableOpacity
            style={styles.actionHighlighted}
            onPress={() => setIsPaymentOpen(true)}
            disabled={isWorking}
          >
            <BadgeDollarSign size={18} color="#059669" />
            <Text style={[styles.actionText, { color: "#059669" }]}>Record payment</Text>
          </TouchableOpacity>
        )}

        {/* === WARRANTY CLAIM === */}
        <TouchableOpacity
          style={styles.action}
          onPress={() => setIsWarrantyOpen(true)}
          disabled={isWorking}
        >
          <ShieldCheck size={18} color={colors.text} />
          <Text style={styles.actionText}>Warranty claim</Text>
        </TouchableOpacity>

        {/* === REPORT COURIER ISSUE === */}
        <TouchableOpacity
          style={styles.action}
          onPress={() => setPrompt("courier")}
          disabled={isWorking}
        >
          <CircleAlert size={18} color={colors.text} />
          <Text style={styles.actionText}>Report courier issue</Text>
        </TouchableOpacity>

        {/* === DANGER ZONE === */}
        <TouchableOpacity
          style={styles.action}
          onPress={() => setPrompt("fraud")}
          disabled={isWorking || Boolean(order.fraudReport)}
        >
          <Flag size={18} color={colors.danger} />
          <Text style={[styles.actionText, styles.dangerText]}>
            {order.fraudReport ? "Fraud reported" : "Report fake order"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.action}
          onPress={handleRemovePress}
          disabled={isWorking}
        >
          <Trash2 size={18} color={colors.danger} />
          <Text style={[styles.actionText, styles.dangerText]}>Remove order</Text>
        </TouchableOpacity>
      </>
    );
  }

  function renderWaybill() {
    return (
      <>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setView("main")} hitSlop={10}>
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Edit waybill number</Text>
        </View>

        <Text style={styles.currentStatus}>
          Current: {order.waybillNumber || "Not assigned"}
        </Text>

        <TextInput
          style={styles.waybillInput}
          value={waybillInput}
          onChangeText={setWaybillInput}
          placeholder="Enter waybill number"
          placeholderTextColor={colors.subtle}
          autoCapitalize="characters"
          autoFocus
        />

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleSaveWaybill}
          disabled={isWorking}
        >
          <Text style={styles.confirmButtonText}>Save waybill</Text>
        </TouchableOpacity>
      </>
    );
  }

  return (
    <>
      <Modal
        visible={Boolean(order) && !prompt}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {view === "main" ? renderMain() : renderWaybill()}
            </ScrollView>

            {isWorking && (
              <ActivityIndicator color={colors.accent} style={styles.loader} />
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isWorking}
            >
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <PromptModal
        visible={prompt === "fraud"}
        title="Report fake order"
        description="Add a private note explaining why this appears to be a fake order."
        defaultValue="Customer details could not be verified."
        confirmLabel="Report"
        isDanger
        onCancel={() => setPrompt(null)}
        onConfirm={(note) => {
          setPrompt(null);
          runAction(() => onFraudReport(order.id, note));
        }}
      />

      <PromptModal
        visible={prompt === "courier"}
        title="Report courier issue"
        description="Describe the courier branch problem."
        defaultValue="Delivery was affected by a courier branch problem."
        confirmLabel="Report"
        onCancel={() => setPrompt(null)}
        onConfirm={(note) => {
          setPrompt(null);
          runAction(() => onCourierIssue(order.id, note));
        }}
      />

      <RecordPaymentModal
        order={order}
        visible={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSubmit={async (payment) => {
          await onRecordPayment?.(order.id, payment);
          setIsPaymentOpen(false);
          onClose();
        }}
      />

      <WarrantyClaimModal
        source={{ ...order, sourceType: "online-order" }}
        visible={isWarrantyOpen}
        businessId={businessId}
        onClose={() => setIsWarrantyOpen(false)}
        onCreated={() => {
          setIsWarrantyOpen(false);
          onClose();
        }}
      />
    </>
  );
}

function createStyles(colors, bottomInset, theme) {
  const isDark = theme === "dark";

  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 18,
      paddingBottom: 18 + bottomInset,
      maxHeight: "90%",
    },
    orderHeader: {
      marginBottom: 8,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    subHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 8,
    },
    title: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 16,
    },
    subtitle: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },
    currentStatus: {
      color: colors.muted,
      fontSize: 12,
      marginBottom: 10,
    },
    hintBox: {
      backgroundColor: isDark ? "rgba(245, 158, 11, 0.14)" : "#fffbf0",
      borderWidth: 1,
      borderColor: isDark ? "rgba(245, 158, 11, 0.3)" : "#fce7b0",
      borderRadius: 10,
      padding: 12,
      marginVertical: 8,
    },
    hintText: {
      color: isDark ? "#fcd34d" : "#92400e",
      fontSize: 12.5,
      lineHeight: 17,
    },
    action: {
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionHighlighted: {
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: isDark ? "rgba(5, 150, 105, 0.08)" : "rgba(5, 150, 105, 0.05)",
      marginHorizontal: -18,
      paddingHorizontal: 18,
    },
    actionText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
    },
    dangerText: {
      color: colors.danger,
    },
    waybillInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      color: colors.textStrong,
      backgroundColor: colors.background,
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 12,
      letterSpacing: 0.5,
    },
    confirmButton: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: "center",
      marginBottom: 8,
    },
    confirmButtonText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 14,
    },
    loader: {
      marginTop: 12,
    },
    cancelButton: {
      marginTop: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 13,
      alignItems: "center",
    },
    cancelText: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 14,
    },
  });
}
