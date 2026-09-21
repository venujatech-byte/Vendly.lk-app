import {
  AlertTriangle,
  MinusCircle,
  PlusCircle,
  Sliders,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
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

import { useAppTheme } from "@/context/ThemeContext";
import { adjustStock } from "@/services/inventoryService";

const REMOVAL_REASONS = [
  { id: "damaged", label: "Damaged / Expired Goods" },
  { id: "supplier-return", label: "Returned to Supplier" },
  { id: "correction", label: "Stock Count Correction" },
];

export default function AdjustStockModal({
  visible,
  onClose,
  product,
  businessId,
  onStockAdjusted,
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const variants = product?.sizes || [];
  const [selectedVariantId, setSelectedVariantId] = useState(
    variants[0]?.id || "",
  );
  const [operation, setOperation] = useState("add"); // "add" | "remove"
  const [removalType, setRemovalType] = useState("damaged");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedVariant =
    variants.find((v) => v.id === selectedVariantId) || variants[0];
  const currentStock = selectedVariant?.stock || 0;
  const numQty = parseInt(quantity, 10) || 0;
  const projectedStock =
    operation === "add" ? currentStock + numQty : currentStock - numQty;

  if (!visible || !product) return null;

  async function handleSave() {
    if (numQty <= 0) {
      Alert.alert("Invalid Quantity", "Please enter a quantity greater than 0.");
      return;
    }

    if (operation === "remove" && projectedStock < 0) {
      Alert.alert(
        "Insufficient Stock",
        `Cannot remove ${numQty} units. Current stock is only ${currentStock}.`,
      );
      return;
    }

    const auditReason =
      reason.trim() ||
      (operation === "add"
        ? "Goods received"
        : REMOVAL_REASONS.find((r) => r.id === removalType)?.label || "Stock write-off");

    const adjustment = operation === "add" ? numQty : -numQty;

    setIsSaving(true);
    try {
      const updatedProduct = await adjustStock(
        businessId,
        product.id,
        selectedVariant?.id,
        adjustment,
        auditReason,
      );

      onStockAdjusted?.(updatedProduct);
      onClose();
      Alert.alert("Success", "Inventory stock has been updated.");
    } catch (err) {
      Alert.alert("Failed", err.message || "Could not adjust stock.");
    } finally {
      setIsSaving(false);
    }
  }

  const styles = createStyles(colors, insets.bottom);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Sliders size={20} color={colors.accent} />
              <Text style={styles.headerTitle}>Adjust Stock Level</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productMeta}>
                SKU: {product.sku || "N/A"} • Available: {product.stock} units
              </Text>
            </View>

            {/* Variant Selector if multiple sizes */}
            {variants.length > 1 && (
              <View style={styles.field}>
                <Text style={styles.label}>Select Size / Variant:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.variantRow}>
                    {variants.map((v) => (
                      <TouchableOpacity
                        key={v.id}
                        style={[
                          styles.variantChip,
                          selectedVariantId === v.id && styles.variantChipActive,
                        ]}
                        onPress={() => setSelectedVariantId(v.id)}
                      >
                        <Text
                          style={[
                            styles.variantChipText,
                            selectedVariantId === v.id &&
                              styles.variantChipTextActive,
                          ]}
                        >
                          {v.size || "Default"} ({v.stock} in stock)
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Adjustment Type Toggle */}
            <View style={styles.operationToggle}>
              <TouchableOpacity
                style={[
                  styles.opButton,
                  operation === "add" && styles.opButtonAddActive,
                ]}
                onPress={() => setOperation("add")}
              >
                <PlusCircle
                  size={16}
                  color={operation === "add" ? "#ffffff" : colors.muted}
                />
                <Text
                  style={[
                    styles.opButtonText,
                    operation === "add" && styles.opButtonTextActive,
                  ]}
                >
                  Add Stock (Restock)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.opButton,
                  operation === "remove" && styles.opButtonRemoveActive,
                ]}
                onPress={() => setOperation("remove")}
              >
                <MinusCircle
                  size={16}
                  color={operation === "remove" ? "#ffffff" : colors.muted}
                />
                <Text
                  style={[
                    styles.opButtonText,
                    operation === "remove" && styles.opButtonTextActive,
                  ]}
                >
                  Remove Stock
                </Text>
              </TouchableOpacity>
            </View>

            {operation === "remove" && (
              <View style={styles.field}>
                <Text style={styles.label}>Reason for Removal:</Text>
                <View style={styles.reasonsList}>
                  {REMOVAL_REASONS.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[
                        styles.reasonOption,
                        removalType === r.id && styles.reasonOptionActive,
                      ]}
                      onPress={() => setRemovalType(r.id)}
                    >
                      <Text
                        style={[
                          styles.reasonText,
                          removalType === r.id && styles.reasonTextActive,
                        ]}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Quantity to Adjust *</Text>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor={colors.subtle}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Audit Note (Optional)</Text>
              <TextInput
                style={styles.input}
                value={reason}
                onChangeText={setReason}
                placeholder="e.g., GRN #1084 or recount note"
                placeholderTextColor={colors.subtle}
              />
            </View>

            {/* Summary Preview */}
            <View
              style={[
                styles.previewCard,
                projectedStock < 0 && styles.previewCardError,
              ]}
            >
              <View>
                <Text style={styles.previewTitle}>Stock On Hand Change</Text>
                <Text style={styles.previewValue}>
                  {currentStock} →{" "}
                  <Text
                    style={{
                      color:
                        projectedStock < 0
                          ? colors.danger
                          : operation === "add"
                          ? colors.accent
                          : colors.textStrong,
                    }}
                  >
                    {projectedStock} units
                  </Text>
                </Text>
              </View>
              {projectedStock < 0 && (
                <AlertTriangle size={20} color={colors.danger} />
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                (projectedStock < 0 || numQty <= 0) &&
                  styles.confirmBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={isSaving || projectedStock < 0 || numQty <= 0}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.confirmBtnText}>
                  {operation === "add" ? "Add Stock" : "Deduct Stock"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors, bottomInset) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "88%",
      paddingBottom: Math.max(bottomInset, 16),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitleWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textStrong,
    },
    content: {
      padding: 18,
      gap: 16,
    },
    productInfo: {
      backgroundColor: colors.surfaceSoft,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 3,
    },
    productName: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textStrong,
    },
    productMeta: {
      fontSize: 12,
      color: colors.muted,
    },
    field: {
      gap: 6,
    },
    label: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textStrong,
    },
    variantRow: {
      flexDirection: "row",
      gap: 8,
    },
    variantChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    variantChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceSoft,
    },
    variantChipText: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: "600",
    },
    variantChipTextActive: {
      color: colors.accent,
      fontWeight: "700",
    },
    operationToggle: {
      flexDirection: "row",
      gap: 10,
    },
    opButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 11,
      borderRadius: 10,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    opButtonAddActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    opButtonRemoveActive: {
      backgroundColor: colors.danger,
      borderColor: colors.danger,
    },
    opButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.muted,
    },
    opButtonTextActive: {
      color: "#ffffff",
      fontWeight: "700",
    },
    reasonsList: {
      gap: 6,
    },
    reasonOption: {
      padding: 10,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reasonOptionActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceSoft,
    },
    reasonText: {
      fontSize: 12,
      color: colors.textStrong,
      fontWeight: "500",
    },
    reasonTextActive: {
      color: colors.accent,
      fontWeight: "700",
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.textStrong,
    },
    previewCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 14,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    previewCardError: {
      borderColor: colors.dangerBorder,
      backgroundColor: colors.dangerBackground,
    },
    previewTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.muted,
      textTransform: "uppercase",
    },
    previewValue: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textStrong,
      marginTop: 2,
    },
    footer: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 18,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    cancelBtnText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    confirmBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: "center",
    },
    confirmBtnDisabled: {
      opacity: 0.5,
    },
    confirmBtnText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
