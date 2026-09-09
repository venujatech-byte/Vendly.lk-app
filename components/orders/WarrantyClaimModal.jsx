import { ShieldCheck, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../../context/ThemeContext";
import { createWarrantyClaim } from "../../services/shopSaleService";

const CLAIM_TYPES = [
  {
    value: "supplier-warranty",
    label: "Supplier warranty",
    hint: "No seller revenue reduction.",
  },
  {
    value: "shop-warranty",
    label: "Shop warranty",
    hint: "The claimed item value is deducted from revenue.",
  },
  {
    value: "shop-repair",
    label: "Shop repair",
    hint: "Only the repair cost is deducted from revenue.",
  },
];

function hasActiveWarranty(item) {
  return item.warrantyExpiresAt && new Date(item.warrantyExpiresAt) >= new Date();
}

export default function WarrantyClaimModal({
  source,
  visible,
  businessId,
  onClose,
  onCreated,
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets.bottom);

  const [itemIndex, setItemIndex] = useState("0");
  const [claimQuantity, setClaimQuantity] = useState(1);
  const [claimType, setClaimType] = useState("supplier-warranty");
  const [repairCost, setRepairCost] = useState("");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      const firstActiveIndex =
        (source?.items ?? []).findIndex((item) => hasActiveWarranty(item)) ?? -1;
      setItemIndex(String(firstActiveIndex >= 0 ? firstActiveIndex : 0));
      setClaimQuantity(1);
      setClaimType("supplier-warranty");
      setRepairCost("");
      setReason("");
      setDetails("");
      setError("");
    }
  }, [visible, source]);

  const claimableItems = useMemo(() => {
    // Keep the original index because the backend uses it to find the exact
    // line item in the saved order/sale.
    return (source?.items ?? [])
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => hasActiveWarranty(item));
  }, [source]);

  const selectedItem = source?.items?.[Number(itemIndex)] ?? source?.items?.[0];
  const maximumQuantity = selectedItem?.quantity ?? 1;

  async function submit() {
    if (!reason.trim()) {
      setError("Explain the reason for this claim.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const claim = await createWarrantyClaim(businessId, {
        sourceType: source.sourceType,
        sourceId: source.id,
        itemIndex: Number(itemIndex),
        claimQuantity: Number(claimQuantity),
        claimType,
        repairCost: claimType === "shop-repair" ? Number(repairCost || 0) : 0,
        reason: reason.trim(),
        details: details.trim() || undefined,
      });
      onCreated?.(claim);
      onClose();
    } catch (requestError) {
      setError(requestError.message ?? "The claim could not be created.");
    } finally {
      setSaving(false);
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
            <View style={styles.headerIcon}>
              <ShieldCheck size={18} color={colors.accent} />
            </View>
            <View style={styles.headerBody}>
              <Text style={styles.title}>New warranty claim</Text>
              <Text style={styles.subtitle}>
                {source?.orderNumber || source?.saleNumber || "Sale"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!claimableItems.length ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  No item in this order has an active warranty.
                </Text>
              </View>
            ) : null}

            <Text style={styles.label}>Item</Text>
            <View style={styles.itemList}>
              {claimableItems.map(({ item, index }) => (
                <TouchableOpacity
                  key={`${item.variantId}-${index}`}
                  style={[styles.itemRow, itemIndex === String(index) && styles.itemRowActive]}
                  onPress={() => {
                    setItemIndex(String(index));
                    setClaimQuantity(1);
                  }}
                >
                  <Text style={styles.itemText} numberOfLines={2}>
                    {item.name}
                    {item.size ? ` · ${item.size}` : ""}
                  </Text>
                  <Text style={styles.itemQty}>{item.quantity} purchased</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Quantity to claim</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => setClaimQuantity((current) => Math.max(1, current - 1))}
              >
                <Text style={styles.qtyButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{claimQuantity}</Text>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() =>
                  setClaimQuantity((current) => Math.min(maximumQuantity, current + 1))
                }
              >
                <Text style={styles.qtyButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>How will this claim be handled?</Text>
            <View style={styles.typeList}>
              {CLAIM_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.typeRow, claimType === type.value && styles.typeRowActive]}
                  onPress={() => setClaimType(type.value)}
                >
                  <View
                    style={[styles.radio, claimType === type.value && styles.radioActive]}
                  />
                  <View style={styles.typeBody}>
                    <Text style={styles.typeLabel}>{type.label}</Text>
                    <Text style={styles.typeHint}>{type.hint}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {claimType === "shop-repair" && (
              <>
                <Text style={styles.label}>Repair cost (LKR)</Text>
                <TextInput
                  style={styles.input}
                  value={repairCost}
                  onChangeText={setRepairCost}
                  placeholder="0.00"
                  placeholderTextColor={colors.subtle}
                  keyboardType="decimal-pad"
                />
              </>
            )}

            <Text style={styles.label}>Reason</Text>
            <TextInput
              style={styles.input}
              value={reason}
              onChangeText={setReason}
              placeholder="Example: Product stopped working"
              placeholderTextColor={colors.subtle}
            />

            <Text style={styles.label}>Details</Text>
            <TextInput
              style={[styles.input, styles.detailsInput]}
              value={details}
              onChangeText={setDetails}
              placeholder="Condition, receipt information and action requested..."
              placeholderTextColor={colors.subtle}
              multiline
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (saving || !claimableItems.length) && styles.submitButtonDisabled,
            ]}
            onPress={submit}
            disabled={saving || !claimableItems.length}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitText}>Create claim</Text>
            )}
          </TouchableOpacity>
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
      paddingBottom: 12,
      maxHeight: "92%",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    headerIcon: {
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
    body: {
      flexGrow: 0,
    },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
      marginTop: 14,
      marginBottom: 8,
    },
    itemList: {
      gap: 6,
    },
    itemRow: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 2,
      backgroundColor: colors.background,
    },
    itemRowActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceSoft,
    },
    itemText: {
      color: colors.textStrong,
      fontSize: 13,
      fontWeight: "600",
    },
    itemQty: {
      color: colors.muted,
      fontSize: 11.5,
    },
    quantityRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    qtyButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    qtyButtonText: {
      color: colors.textStrong,
      fontSize: 20,
      fontWeight: "700",
    },
    qtyValue: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 18,
      minWidth: 28,
      textAlign: "center",
    },
    typeList: {
      gap: 6,
    },
    typeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.background,
    },
    typeRowActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceSoft,
    },
    radio: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    radioActive: {
      borderWidth: 5,
      borderColor: colors.accent,
    },
    typeBody: {
      flex: 1,
    },
    typeLabel: {
      color: colors.textStrong,
      fontSize: 13,
      fontWeight: "600",
    },
    typeHint: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 1,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.textStrong,
      backgroundColor: colors.background,
      fontSize: 14,
    },
    detailsInput: {
      minHeight: 70,
      textAlignVertical: "top",
    },
    errorBox: {
      backgroundColor: colors.dangerBackground,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      borderRadius: 10,
      padding: 12,
      marginTop: 10,
    },
    errorText: {
      color: colors.danger,
      fontSize: 12.5,
    },
    submitButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 14,
      marginBottom: 12 + bottomInset,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 15,
    },
  });
}