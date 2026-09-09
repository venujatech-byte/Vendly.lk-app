import { Image } from "expo-image";
import {
  BadgeDollarSign,
  CircleAlert,
  Flag,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Printer,
  Share2,
  StickyNote,
  User,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { STATUS_LABELS, STATUS_TRANSITIONS } from "../../constants/orderStatus";
import { useAppTheme } from "../../context/ThemeContext";
import { shareWaybillPdf } from "../../services/fileService";
import PaymentBadge from "./PaymentBadge";
import PromptModal from "./PromptModal";
import RecordPaymentModal from "./RecordPaymentModal";

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
  onRecordPayment,
}) {
  const { colors, theme } = useAppTheme();
  const styles = createStyles(colors, theme);

  const [actionError, setActionError] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [waybillNumber, setWaybillNumber] = useState(order.waybillNumber ?? "");
  const [activePrompt, setActivePrompt] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

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
  const note = order.privateNote || order.note;

  function handleCall(number) {
    if (!number) return;
    Linking.openURL(`tel:${number}`).catch(() => {
      Alert.alert("Error", "Could not open dialer.");
    });
  }

  function handleWhatsApp(number) {
    if (!number) return;
    const clean = String(number).replace(/[^0-9]/g, "");
    const intl = clean.startsWith("0") ? `94${clean.slice(1)}` : clean;
    const msg = encodeURIComponent(
      `Hello ${order.customerName}, regarding your order #${order.orderNumber} from Vendly.`,
    );
    Linking.openURL(`https://wa.me/${intl}?text=${msg}`).catch(() => {
      Alert.alert("Error", "Could not open WhatsApp.");
    });
  }

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

      {/* Meta Information */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Payment</Text>
          <PaymentBadge
            paymentMethod={order.paymentMethod}
            paymentStatus={order.paymentStatus}
            depositAmount={order.deposit}
            paidAmountMinor={order.paidAmountMinor}
          />
        </View>
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

      {/* Private Note Container */}
      {note ? (
        <View style={styles.noteBox}>
          <StickyNote size={16} color={theme === "dark" ? "#fcd34d" : "#92400e"} />
          <View style={styles.noteContent}>
            <Text style={styles.noteLabel}>Private Note</Text>
            <Text style={styles.noteText}>{note}</Text>
          </View>
        </View>
      ) : null}

      {/* Customer Note / Public Note */}
      {order.customerNote ? (
        <View style={[styles.noteBox, styles.customerNoteBox]}>
          <User size={16} color={theme === "dark" ? "#93c5fd" : "#1d4ed8"} />
          <View style={styles.noteContent}>
            <Text style={[styles.noteLabel, styles.customerNoteLabel]}>Customer Note</Text>
            <Text style={styles.noteText}>{order.customerNote}</Text>
          </View>
        </View>
      ) : null}

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
              {item.warrantyPeriodMonths > 0 && (
                <Text style={styles.itemWarranty}>
                  Warranty: {item.warrantyPeriodMonths} month
                  {item.warrantyPeriodMonths === 1 ? "" : "s"}
                  {item.warrantyExpiresAt
                    ? ` · expires ${new Date(item.warrantyExpiresAt).toLocaleDateString("en-LK")}`
                    : ""}
                </Text>
              )}
            </View>

            <Text style={styles.itemPrice}>{item.price}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Delivery address & Contact</Text>
      <View style={styles.infoList}>
        <View style={styles.infoRow}>
          <User size={16} color={colors.muted} />
          <Text style={styles.infoText}>{order.customerName}</Text>
        </View>

        <View style={styles.infoRowWithActions}>
          <View style={styles.infoRowMain}>
            <Phone size={16} color={colors.muted} />
            <Text style={styles.infoText}>{order.phoneNumber}</Text>
          </View>
          <View style={styles.contactActions}>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => handleCall(order.phoneNumber)}
              hitSlop={6}
            >
              <Phone size={13} color={colors.accent} />
              <Text style={styles.contactButtonText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactButton, styles.whatsappButton]}
              onPress={() => handleWhatsApp(order.phoneNumber)}
              hitSlop={6}
            >
              <MessageCircle size={13} color="#25D366" />
              <Text style={[styles.contactButtonText, { color: "#25D366" }]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {order.secondaryPhoneNumber ? (
          <View style={styles.infoRowWithActions}>
            <View style={styles.infoRowMain}>
              <Phone size={16} color={colors.muted} />
              <Text style={styles.infoText}>{order.secondaryPhoneNumber}</Text>
            </View>
            <View style={styles.contactActions}>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => handleCall(order.secondaryPhoneNumber)}
                hitSlop={6}
              >
                <Phone size={13} color={colors.accent} />
                <Text style={styles.contactButtonText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactButton, styles.whatsappButton]}
                onPress={() => handleWhatsApp(order.secondaryPhoneNumber)}
                hitSlop={6}
              >
                <MessageCircle size={13} color="#25D366" />
                <Text style={[styles.contactButtonText, { color: "#25D366" }]}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
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
        {order.discountMinor > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount</Text>
            <Text style={[styles.summaryValue, styles.deductionValue]}>
              -{order.discount}
            </Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery fee</Text>
          <Text style={styles.summaryValue}>
            {order.deliveryFee ?? "Not calculated"}
          </Text>
        </View>

        {order.totalWeightGrams > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total weight</Text>
            <Text style={styles.summaryValue}>{order.totalWeight}</Text>
          </View>
        )}
        <View style={[styles.summaryRow, styles.summaryTotalRow]}>
          <Text style={styles.summaryTotalLabel}>Total</Text>
          <Text style={styles.summaryTotalValue}>{order.total}</Text>
        </View>

        {/* Paid and balance due deductions */}
        {order.paidAmountMinor > 0 && (
          <>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {order.paymentMethod === "deposit" ? "Deposit paid" : "Paid"}
              </Text>
              <Text style={[styles.summaryValue, styles.deductionValue]}>
                -{order.paidAmount}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotalRow]}>
              <Text style={styles.summaryTotalLabel}>Balance to collect</Text>
              <Text style={styles.summaryTotalValue}>{order.balanceDue}</Text>
            </View>
          </>
        )}
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

      {/* Proof of payment, kept on the order so the seller can check it long
          after the chat has scrolled away. */}
      {(order.paymentReceipts ?? []).length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Payment receipts</Text>
          <View style={styles.receiptsGrid}>
            {(order.paymentReceipts ?? []).map((receipt) => (
              <TouchableOpacity
                key={receipt.url}
                style={styles.receiptCard}
                onPress={() => {
                  if (receipt.url) Linking.openURL(receipt.url).catch(() => {});
                }}
              >
                {receipt.url ? (
                  <Image source={{ uri: receipt.url }} style={styles.receiptImage} contentFit="cover" />
                ) : (
                  <View style={[styles.receiptImage, styles.receiptImagePlaceholder]}>
                    <BadgeDollarSign size={16} color={colors.subtle} />
                  </View>
                )}
                <Text style={styles.receiptAmount}>
                  LKR {((receipt.amountMinor ?? 0) / 100).toLocaleString("en-LK")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

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
        style={[styles.actionButton, styles.paymentButton]}
        onPress={() => setIsPaymentModalOpen(true)}
        disabled={isWorking}
      >
        <BadgeDollarSign size={16} color="#059669" />
        <Text style={[styles.actionButtonText, { color: "#059669" }]}>Record payment</Text>
      </TouchableOpacity>

      {order.paymentPending && (
        <View style={styles.paymentHold}>
          <Text style={styles.paymentHoldText}>
            This order is waiting on a bank transfer. Record the payment, or change it to
            cash on delivery, before confirming it.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => {
          Share.share({
            message: `Order #${order.orderNumber}\nCustomer: ${order.customerName}\nPhone: ${order.phoneNumber}\nTotal: ${order.total}\nStatus: ${readableStatus(order.status || order.fulfilmentStatus)}\nAddress: ${order.deliveryAddress || "N/A"}`,
          });
        }}
        disabled={isWorking}
      >
        <Share2 size={16} color={colors.text} />
        <Text style={styles.actionButtonText}>Share Order Summary</Text>
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
        onConfirm={(noteText) => {
          setActivePrompt(null);
          runAction(() => onFraudReport?.(order.id, noteText));
        }}
      />

      <PromptModal
        visible={activePrompt === "courier"}
        title="Report courier issue"
        description="Describe the courier branch problem."
        defaultValue="Delivery was affected by a courier branch problem."
        confirmLabel="Report"
        onCancel={() => setActivePrompt(null)}
        onConfirm={(noteText) => {
          setActivePrompt(null);
          runAction(() => onCourierIssue?.(order.id, noteText));
        }}
      />

      <RecordPaymentModal
        order={order}
        visible={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSubmit={async (payment) => {
          await onRecordPayment?.(order.id, payment);
        }}
      />
    </View>
  );
}

function createStyles(colors, theme) {
  const isDark = theme === "dark";

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
      minWidth: 80,
      gap: 3,
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
    noteBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: isDark ? "rgba(245, 158, 11, 0.12)" : "#fffbf0",
      borderWidth: 1,
      borderColor: isDark ? "rgba(245, 158, 11, 0.25)" : "#fce7b0",
      borderRadius: 10,
      padding: 12,
      marginTop: 8,
      marginBottom: 6,
    },
    noteContent: {
      flex: 1,
      gap: 2,
    },
    noteLabel: {
      color: isDark ? "#fcd34d" : "#92400e",
      fontSize: 11,
      fontWeight: "750",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    noteText: {
      color: colors.text,
      fontSize: 12.5,
      lineHeight: 17,
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
    itemWarranty: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 1,
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
      alignItems: "center",
      gap: 8,
    },
    infoRowWithActions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    infoRowMain: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    contactActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    contactButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    whatsappButton: {
      borderColor: "rgba(37, 211, 102, 0.3)",
      backgroundColor: isDark ? "rgba(37, 211, 102, 0.12)" : "#eafaf1",
    },
    contactButtonText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "700",
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
    deductionValue: {
      color: colors.success,
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
    receiptsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    receiptCard: {
      width: 110,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    receiptImage: {
      width: "100%",
      height: 78,
      backgroundColor: colors.surfaceSoft,
    },
    receiptImagePlaceholder: {
      alignItems: "center",
      justifyContent: "center",
    },
    receiptAmount: {
      color: colors.textStrong,
      fontSize: 12,
      fontWeight: "700",
      padding: 8,
      paddingTop: 6,
    },
    paymentHold: {
      marginTop: 10,
      backgroundColor: isDark ? "rgba(245, 158, 11, 0.12)" : "#fffbf0",
      borderWidth: 1,
      borderColor: isDark ? "rgba(245, 158, 11, 0.25)" : "#fce7b0",
      borderRadius: 10,
      padding: 12,
    },
    paymentHoldText: {
      color: isDark ? "#fcd34d" : "#92400e",
      fontSize: 12.5,
      lineHeight: 17,
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
    paymentButton: {
      borderColor: isDark ? "rgba(5, 150, 105, 0.4)" : "#a7f3d0",
      backgroundColor: isDark ? "rgba(5, 150, 105, 0.1)" : "#f0fdf4",
    },
    customerNoteBox: {
      backgroundColor: isDark ? "rgba(59, 130, 246, 0.12)" : "#eff6ff",
      borderColor: isDark ? "rgba(59, 130, 246, 0.3)" : "#bfdbfe",
    },
    customerNoteLabel: {
      color: isDark ? "#93c5fd" : "#1d4ed8",
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
