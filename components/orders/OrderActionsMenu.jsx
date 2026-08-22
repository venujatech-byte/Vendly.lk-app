import {
  ChevronLeft,
  CircleAlert,
  Flag,
  Pencil,
  Printer,
  RefreshCw,
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
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { STATUS_LABELS, STATUS_TRANSITIONS } from "../../constants/orderStatus";
import { useAppTheme } from "../../context/ThemeContext";
import { shareWaybillPdf } from "../../services/fileService";
import PromptModal from "./PromptModal";

// Statuses that destroy work in progress, so they always confirm first.
const DESTRUCTIVE_STATUSES = new Set(["cancelled", "returned"]);

export default function OrderActionsMenu({
  order,
  onClose,
  onStatusChange,
  onGenerateWaybill,
  onFraudReport,
  onCourierIssue,
  onRemove,
  onEdit,
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets.bottom);

  const [view, setView] = useState("main");
  const [prompt, setPrompt] = useState(null);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (order) {
      setView("main");
      setPrompt(null);
    }
  }, [order]);

  if (!order) return null;

  const nextStatuses = STATUS_TRANSITIONS[order.fulfilmentStatus] ?? [];

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
      // A waybill number must exist before the PDF can be printed.
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

  function renderMain() {
    return (
      <>
        <Text style={styles.title} numberOfLines={1}>
          #{order.orderNumber}
        </Text>

        {nextStatuses.length > 0 && (
          <TouchableOpacity
            style={styles.action}
            onPress={() => setView("status")}
            disabled={isWorking}
          >
            <RefreshCw size={18} color={colors.text} />
            <Text style={styles.actionText}>Change status</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.action}
          onPress={handleShareWaybill}
          disabled={isWorking}
        >
          <Printer size={18} color={colors.text} />
          <Text style={styles.actionText}>Waybill PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.action}
          onPress={() => setPrompt("courier")}
          disabled={isWorking}
        >
          <CircleAlert size={18} color={colors.text} />
          <Text style={styles.actionText}>Report courier issue</Text>
        </TouchableOpacity>

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

        {onEdit && (
          <TouchableOpacity style={styles.action} onPress={onEdit} disabled={isWorking}>
            <Pencil size={18} color={colors.text} />
            <Text style={styles.actionText}>Edit order</Text>
          </TouchableOpacity>
        )}

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

  function renderStatus() {
    return (
      <>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setView("main")} hitSlop={10}>
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Change status</Text>
        </View>

        <Text style={styles.currentStatus}>
          Currently {STATUS_LABELS[order.fulfilmentStatus] ?? order.fulfilmentStatus}
        </Text>

        {nextStatuses.map((status) => {
          const isDestructive = DESTRUCTIVE_STATUSES.has(status);

          return (
            <TouchableOpacity
              key={status}
              style={styles.action}
              onPress={() => handleStatusPress(status)}
              disabled={isWorking}
            >
              <RefreshCw
                size={18}
                color={isDestructive ? colors.danger : colors.text}
              />
              <Text
                style={[styles.actionText, isDestructive && styles.dangerText]}
              >
                {STATUS_LABELS[status] ?? status}
              </Text>
            </TouchableOpacity>
          );
        })}
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
            <ScrollView>
              {view === "main" ? renderMain() : renderStatus()}
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
    </>
  );
}

function createStyles(colors, bottomInset) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 18,
      paddingBottom: 18 + bottomInset,
      maxHeight: "85%",
    },
    subHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    title: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 15,
      marginBottom: 12,
    },
    currentStatus: {
      color: colors.muted,
      fontSize: 12,
      marginBottom: 6,
    },
    action: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
    },
    dangerText: {
      color: colors.danger,
    },
    loader: {
      marginTop: 12,
    },
    cancelButton: {
      marginTop: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 13,
      alignItems: "center",
    },
    cancelText: {
      color: colors.text,
      fontWeight: "600",
    },
  });
}
