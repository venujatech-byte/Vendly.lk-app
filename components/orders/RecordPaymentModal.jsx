import { CircleAlert, Receipt, Trash2, Upload } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../../context/ThemeContext";

const MISSING_PICKER_MESSAGE =
  "Attaching a receipt needs a newer app build. You can still record the amount.";

let ImagePicker = null;
let FileSystem = null;

try {
  ImagePicker = require("expo-image-picker");
} catch {
  ImagePicker = null;
}

try {
  FileSystem = require("expo-file-system/legacy");
} catch {
  FileSystem = null;
}

function formatCurrency(minorUnits = 0) {
  return `LKR ${(minorUnits / 100).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Records money the seller has actually received against an order.
 *
 * The amount is entered rather than assumed: a customer who said "half" may
 * transfer any figure, and whatever is left becomes the cash-on-delivery
 * amount the courier collects.
 */
export default function RecordPaymentModal({ order, visible, onClose, onSubmit }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets.bottom);

  const totalMinor = order?.totalAmountMinor ?? 0;
  const [amount, setAmount] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");
  const [isReadingReceipt, setIsReadingReceipt] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmount("");
      setReceipt(null);
      setError("");
    }
  }, [visible, order?.id]);

  const paidMinor = Math.round(Number(amount || 0) * 100);
  const balanceMinor = Math.max(0, totalMinor - paidMinor);
  const isOverpaid = paidMinor > totalMinor;

  async function pickReceipt() {
    if (!ImagePicker || !FileSystem) {
      Alert_Error(MISSING_PICKER_MESSAGE);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert_Error("Photo library permission is needed to attach a receipt.");
      return;
    }

    setIsReadingReceipt(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        base64: false,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const dataUrl = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const mimeType = asset.mimeType ?? "image/jpeg";
      setReceipt({ uri: asset.uri, dataUrl: `data:${mimeType};base64,${dataUrl}` });
    } catch (catchError) {
      Alert_Error(catchError.message ?? "That image could not be read.");
    } finally {
      setIsReadingReceipt(false);
    }
  }

  function Alert_Error(message) {
    Alert.alert("Receipt error", message);
  }

  async function submit() {
    if (paidMinor <= 0) {
      setError("Enter the amount you received.");
      return;
    }

    if (isOverpaid) {
      setError("The amount received cannot be more than the order total.");
      return;
    }

    setIsWorking(true);
    setError("");

    try {
      // Sent together with the amount so a failure leaves neither recorded -
      // never a payment with no proof of it.
      await onSubmit({ paidAmountMinor: paidMinor, receiptImage: receipt?.dataUrl ?? "" });
      onClose();
    } catch (submitError) {
      setError(submitError.message ?? "The payment could not be recorded.");
    } finally {
      setIsWorking(false);
    }
  }

  async function convertToCashOnDelivery() {
    setIsWorking(true);
    setError("");

    try {
      await onSubmit({ convertToCashOnDelivery: true });
      onClose();
    } catch (submitError) {
      setError(submitError.message ?? "The order could not be changed.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.receiptIcon}>
              <Receipt size={18} color={colors.accent} />
            </View>
            <View style={styles.headerBody}>
              <Text style={styles.title}>Record payment</Text>
              <Text style={styles.subtitle}>
                {order?.orderNumber} · Total {formatCurrency(totalMinor)}
              </Text>
            </View>
          </View>

          <Text style={styles.label}>Amount received (LKR)</Text>
          <View style={styles.amountRow}>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder={(totalMinor / 100).toFixed(2)}
              placeholderTextColor={colors.subtle}
              keyboardType="decimal-pad"
              autoFocus
            />
            <TouchableOpacity
              style={styles.fullButton}
              onPress={() => setAmount((totalMinor / 100).toFixed(2))}
            >
              <Text style={styles.fullButtonText}>Paid in full</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.receiptButton}
            onPress={pickReceipt}
            disabled={isReadingReceipt}
          >
            {isReadingReceipt ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Upload size={16} color={colors.accent} />
            )}
            <Text style={styles.receiptText}>
              {receipt ? "Change receipt photo" : "Attach the slip or screenshot"}
            </Text>
          </TouchableOpacity>

          {receipt && (
            <View style={styles.receiptPreviewRow}>
              <Image source={{ uri: receipt.uri }} style={styles.receiptPreview} />
              <Text style={styles.receiptPicked} numberOfLines={1}>
                Receipt attached
              </Text>
              <TouchableOpacity
                onPress={() => setReceipt(null)}
                style={styles.removeReceipt}
                hitSlop={8}
              >
                <Trash2 size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}

          {paidMinor > 0 && !isOverpaid && (
            <View style={styles.balanceBox}>
              <Text style={styles.balanceText}>
                {balanceMinor > 0
                  ? `Cash on delivery: ${formatCurrency(balanceMinor)}`
                  : "Paid in full - nothing to collect on delivery."}
              </Text>
            </View>
          )}

          {(error || isOverpaid) && (
            <View style={styles.errorBox}>
              <CircleAlert size={15} color={colors.danger} />
              <Text style={styles.errorText}>
                {error || "The amount received cannot be more than the order total."}
              </Text>
            </View>
          )}

          {/* The way out when the transfer never arrives. Without it the order
              is stuck: it cannot be confirmed while payment is pending. */}
          {order?.paymentPending && (
            <TouchableOpacity
              style={styles.codButton}
              onPress={convertToCashOnDelivery}
              disabled={isWorking}
            >
              <Text style={styles.codButtonText}>
                Change to cash on delivery ({formatCurrency(totalMinor)} collected by the courier)
              </Text>
            </TouchableOpacity>
          )}

          {isWorking && <ActivityIndicator color={colors.accent} style={styles.loader} />}

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={isWorking}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmButton, (paidMinor <= 0 || isOverpaid) && styles.confirmDisabled]}
              onPress={submit}
              disabled={isWorking || paidMinor <= 0 || isOverpaid}
            >
              <Text style={styles.confirmText}>
                {isWorking ? "Saving…" : "Confirm payment"}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
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
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 20 + bottomInset,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 18,
    },
    receiptIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.surfaceSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    headerBody: {
      flex: 1,
    },
    title: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 17,
    },
    subtitle: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 8,
    },
    amountRow: {
      flexDirection: "row",
      gap: 8,
    },
    amountInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.textStrong,
      backgroundColor: colors.background,
      fontSize: 17,
      fontWeight: "700",
    },
    fullButton: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSoft,
    },
    fullButtonText: {
      color: colors.accent,
      fontWeight: "700",
      fontSize: 12,
    },
    receiptButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 13,
      paddingHorizontal: 14,
      justifyContent: "center",
      backgroundColor: colors.surfaceSoft,
    },
    receiptText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: "600",
    },
    receiptPreviewRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.surfaceSoft,
    },
    receiptPreview: {
      width: 44,
      height: 44,
      borderRadius: 8,
    },
    receiptPicked: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
    },
    removeReceipt: {
      padding: 4,
    },
    balanceBox: {
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    balanceText: {
      color: colors.textStrong,
      fontSize: 13,
      fontWeight: "700",
    },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginTop: 12,
    },
    errorText: {
      flex: 1,
      color: colors.danger,
      fontSize: 12,
      fontWeight: "500",
    },
    codButton: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: "center",
    },
    codButtonText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: "600",
    },
    loader: {
      marginTop: 12,
    },
    actionsRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 18,
    },
    cancelButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: "center",
    },
    cancelText: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 14,
    },
    confirmButton: {
      flex: 1.4,
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: "center",
    },
    confirmDisabled: {
      opacity: 0.5,
    },
    confirmText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 14,
    },
  });
}