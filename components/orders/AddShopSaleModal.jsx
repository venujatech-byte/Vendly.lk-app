import { Image } from "expo-image";
import { Minus, Package, Plus, Search, Trash2, X } from "lucide-react-native";
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
import { getProducts } from "../../services/productService";
import { createShopSale } from "../../services/shopSaleService";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank-transfer", label: "Bank transfer" },
];

function formatLkr(amount) {
  return `LKR ${Number(amount ?? 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function toAmount(value) {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export default function AddShopSaleModal({
  visible,
  businessId,
  onClose,
  onCreated,
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets.bottom);

  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantities, setQuantities] = useState({});
  const [items, setItems] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !businessId) return;

    setSearch("");
    setSelectedProductId("");
    setQuantities({});
    setItems([]);
    setCustomerName("");
    setPhoneNumber("");
    setPaymentMethod("cash");
    setDiscount("");
    setNote("");
    setError("");

    let isCurrent = true;
    setIsLoadingProducts(true);

    getProducts(businessId)
      .then((loaded) => isCurrent && setProducts(loaded))
      .catch((requestError) => isCurrent && setError(requestError.message))
      .finally(() => isCurrent && setIsLoadingProducts(false));

    return () => {
      isCurrent = false;
    };
  }, [visible, businessId]);

  const selectedProduct = products.find((product) => product.id === selectedProductId);

  const matchingProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products.slice(0, 12);

    return products
      .filter(
        (product) =>
          product.name?.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query) ||
          product.barcode?.toLowerCase().includes(query) ||
          (product.sizes ?? []).some((variant) =>
            variant.sku?.toLowerCase().includes(query),
          ),
      )
      .slice(0, 12);
  }, [products, search]);

  const matrixUnitCount = Object.values(quantities).reduce(
    (sum, quantity) => sum + quantity,
    0,
  );
  const subtotal = items.reduce(
    (sum, item) => sum + item.sellingPrice * item.quantity,
    0,
  );
  const discountAmount = Math.min(toAmount(discount), subtotal);
  const total = Math.max(0, subtotal - discountAmount);

  function chooseProduct(product) {
    setSelectedProductId(product.id);
    setQuantities({});
  }

  function changeVariantQuantity(variant, delta) {
    setQuantities((current) => {
      const next = Math.max(0, Math.min(variant.stock, (current[variant.id] ?? 0) + delta));
      const updated = { ...current, [variant.id]: next };
      if (next === 0) delete updated[variant.id];
      return updated;
    });
  }

  function addMatrixToSale() {
    if (!selectedProduct || matrixUnitCount === 0) return;

    setItems((current) => {
      let next = current;

      for (const variant of selectedProduct.sizes) {
        const quantity = quantities[variant.id];
        if (!quantity) continue;

        const existing = next.find((item) => item.variantId === variant.id);
        const row = {
          variantId: variant.id,
          name: selectedProduct.name,
          size: variant.size,
          sku: variant.sku,
          stockAvailable: variant.stock,
          sellingPrice:
            variant.sellingPrice ?? selectedProduct.sellingPrice ?? 0,
          imageUrl: variant.imageUrl || (selectedProduct.images?.[0] ?? ""),
        };

        next = existing
          ? next.map((item) =>
              item.variantId === variant.id
                ? { ...item, quantity: item.quantity + quantity }
                : item,
            )
          : [...next, { ...row, quantity }];
      }

      return next;
    });

    setSelectedProductId("");
    setQuantities({});
    setError("");
  }

  function removeItem(variantId) {
    setItems((current) => current.filter((item) => item.variantId !== variantId));
  }

  function changeItemQuantity(variantId, delta) {
    setItems((current) =>
      current
        .map((item) =>
          item.variantId === variantId
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  async function submit() {
    if (!items.length) {
      setError("Add at least one product to this sale.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const sale = await createShopSale(businessId, {
        items: items.map(({ variantId, quantity }) => ({ variantId, quantity })),
        customerName: customerName.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        paymentMethod,
        discountAmount: discountAmount || 0,
        note: note.trim() || undefined,
      });
      onCreated?.(sale);
      onClose();
    } catch (requestError) {
      setError(requestError.message ?? "The sale could not be recorded.");
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
            <View style={styles.headerBody}>
              <Text style={styles.title}>Add shop sale</Text>
              <Text style={styles.subtitle}>Record a sale made at your physical shop.</Text>
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
            <Text style={styles.label}>Add items</Text>

            {!selectedProduct ? (
              <>
                <View style={styles.searchBox}>
                  <Search size={16} color={colors.subtle} />
                  <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search product, SKU or barcode..."
                    placeholderTextColor={colors.subtle}
                  />
                </View>

                {isLoadingProducts ? (
                  <ActivityIndicator color={colors.accent} style={styles.loader} />
                ) : (
                  <View style={styles.resultsBox}>
                    {matchingProducts.map((product) => (
                      <TouchableOpacity
                        key={product.id}
                        style={styles.resultRow}
                        onPress={() => chooseProduct(product)}
                      >
                        {product.images?.[0] ? (
                          <Image
                            source={{ uri: product.images[0] }}
                            style={styles.resultThumb}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={[styles.resultThumb, styles.thumbPlaceholder]}>
                            <Package size={16} color={colors.subtle} />
                          </View>
                        )}
                        <View style={styles.resultBody}>
                          <Text style={styles.resultName} numberOfLines={1}>
                            {product.name}
                          </Text>
                          <Text style={styles.resultMeta}>
                            {product.sizes?.length ?? 0} options · {product.stock} in stock
                          </Text>
                        </View>
                        <Plus size={16} color={colors.accent} />
                      </TouchableOpacity>
                    ))}
                    {matchingProducts.length === 0 && !error && (
                      <Text style={styles.noResults}>No products found.</Text>
                    )}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.matrix}>
                <View style={styles.matrixHeader}>
                  {selectedProduct.images?.[0] ? (
                    <Image
                      source={{ uri: selectedProduct.images[0] }}
                      style={styles.matrixThumb}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.matrixThumb, styles.thumbPlaceholder]} />
                  )}
                  <View style={styles.resultBody}>
                    <Text style={styles.resultName} numberOfLines={1}>
                      {selectedProduct.name}
                    </Text>
                    <Text style={styles.resultMeta}>
                      {selectedProduct.sizes.length} options · {selectedProduct.stock} in stock
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedProductId("");
                      setQuantities({});
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.changeText}>Change</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.matrixColumnHeads}>
                  <Text style={[styles.matrixHeadText, styles.matrixColSize]}>Size</Text>
                  <Text style={[styles.matrixHeadText, styles.matrixColStock]}>Stock</Text>
                  <Text style={[styles.matrixHeadText, styles.matrixColPrice]}>Price</Text>
                  <Text style={[styles.matrixHeadText, styles.matrixColQty]}>Qty</Text>
                </View>

                {selectedProduct.sizes.map((variant) => {
                  const quantity = quantities[variant.id] ?? 0;
                  const soldOut = variant.stock <= 0;

                  return (
                    <View
                      key={variant.id}
                      style={[styles.matrixRow, quantity > 0 && styles.matrixRowSelected]}
                    >
                      <Text
                        style={[
                          styles.matrixColSize,
                          soldOut ? styles.soldOutText : styles.matrixText,
                        ]}
                      >
                        {variant.size || "—"}
                      </Text>

                      <View style={styles.matrixColStock}>
                        {soldOut ? (
                          <Text style={styles.soldOutTag}>Sold out</Text>
                        ) : (
                          <Text style={[styles.matrixText, styles.stockValue]}>
                            {variant.stock}
                          </Text>
                        )}
                      </View>

                      <Text style={[styles.matrixColPrice, styles.matrixText]}>
                        {formatLkr(variant.sellingPrice)}
                      </Text>

                      <View style={[styles.matrixColQty, styles.stepper]}>
                        <TouchableOpacity
                          style={styles.stepperButton}
                          disabled={soldOut}
                          onPress={() => changeVariantQuantity(variant, -1)}
                        >
                          <Minus size={11} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>{quantity}</Text>
                        <TouchableOpacity
                          style={styles.stepperButton}
                          disabled={soldOut || quantity >= variant.stock}
                          onPress={() => changeVariantQuantity(variant, 1)}
                        >
                          <Plus size={11} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                <View style={styles.matrixFooter}>
                  <Text style={styles.matrixFooterText}>
                    {matrixUnitCount > 0
                      ? `${matrixUnitCount} unit(s) selected`
                      : "Choose quantities to add"}
                  </Text>
                  <TouchableOpacity
                    style={[styles.addButton, matrixUnitCount === 0 && styles.addButtonDisabled]}
                    disabled={matrixUnitCount === 0}
                    onPress={addMatrixToSale}
                  >
                    <Text style={styles.addButtonText}>Add to sale</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={styles.label}>Sale items ({items.length})</Text>
            {items.length === 0 ? (
              <Text style={styles.noResults}>No items added yet.</Text>
            ) : (
              <View style={styles.itemsList}>
                {items.map((item) => (
                  <View key={item.variantId} style={styles.itemRow}>
                    {item.imageUrl ? (
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.itemThumb}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.itemThumb, styles.thumbPlaceholder]}>
                        <Package size={14} color={colors.subtle} />
                      </View>
                    )}
                    <View style={styles.resultBody}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name} {item.size ? `· ${item.size}` : ""}
                      </Text>
                      <Text style={styles.resultMeta}>{formatLkr(item.sellingPrice)}</Text>
                    </View>
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={styles.stepperButton}
                        onPress={() => changeItemQuantity(item.variantId, -1)}
                      >
                        <Minus size={12} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={styles.stepperValue}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.stepperButton}
                        onPress={() => changeItemQuantity(item.variantId, 1)}
                      >
                        <Plus size={12} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeItem(item.variantId)}
                      hitSlop={8}
                    >
                      <Trash2 size={15} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.label}>Sale details</Text>
            <View style={styles.twoCol}>
              <TextInput
                style={[styles.input, styles.twoColInput]}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Customer name (optional)"
                placeholderTextColor={colors.subtle}
              />
              <TextInput
                style={[styles.input, styles.twoColInput]}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Phone (optional)"
                placeholderTextColor={colors.subtle}
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.subLabel}>Payment method</Text>
            <View style={styles.chipWrap}>
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.value}
                  style={[
                    styles.chip,
                    paymentMethod === method.value && styles.chipActive,
                  ]}
                  onPress={() => setPaymentMethod(method.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      paymentMethod === method.value && styles.chipTextActive,
                    ]}
                  >
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, styles.noteInput, { marginTop: 10 }]}
              value={note}
              onChangeText={setNote}
              placeholder="Private note (optional)"
              placeholderTextColor={colors.subtle}
              multiline
            />

            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Items subtotal</Text>
                <Text style={styles.totalValue}>{formatLkr(subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount (LKR)</Text>
                <TextInput
                  style={styles.discountInput}
                  value={discount}
                  onChangeText={setDiscount}
                  placeholder="0.00"
                  placeholderTextColor={colors.subtle}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.totalRow, styles.totalGrandRow]}>
                <Text style={styles.totalGrandLabel}>Total</Text>
                <Text style={styles.totalGrandValue}>{formatLkr(total)}</Text>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={submit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitText}>Complete sale</Text>
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
      color: colors.textStrong,
      fontSize: 13,
      fontWeight: "700",
      marginTop: 12,
      marginBottom: 8,
    },
    subLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
      marginTop: 10,
      marginBottom: 8,
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.background,
      height: 42,
    },
    searchInput: {
      flex: 1,
      color: colors.textStrong,
    },
    loader: {
      marginVertical: 20,
    },
    resultsBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      marginTop: 8,
      backgroundColor: colors.background,
      overflow: "hidden",
    },
    resultRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    resultThumb: {
      width: 36,
      height: 36,
      borderRadius: 8,
    },
    resultBody: {
      flex: 1,
    },
    resultName: {
      color: colors.textStrong,
      fontSize: 13,
      fontWeight: "600",
    },
    resultMeta: {
      color: colors.muted,
      fontSize: 11.5,
      marginTop: 1,
    },
    thumbPlaceholder: {
      backgroundColor: colors.surfaceSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    noResults: {
      color: colors.muted,
      fontSize: 13,
      padding: 14,
    },
    matrix: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      overflow: "hidden",
    },
    matrixHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 11,
      backgroundColor: colors.surfaceSoft,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    matrixThumb: {
      width: 34,
      height: 34,
      borderRadius: 7,
    },
    changeText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "600",
    },
    matrixColumnHeads: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 7,
      paddingHorizontal: 11,
      backgroundColor: colors.surfaceSoft,
    },
    matrixHeadText: {
      color: colors.subtle,
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    matrixRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 9,
      paddingHorizontal: 11,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    matrixRowSelected: {
      backgroundColor: colors.surfaceSoft,
    },
    matrixColSize: {
      width: 40,
    },
    matrixColStock: {
      width: 56,
    },
    matrixColPrice: {
      flex: 1,
    },
    matrixColQty: {
      width: 92,
    },
    matrixText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
    },
    stockValue: {
      marginLeft: 8,
    },
    soldOutText: {
      color: colors.subtle,
      fontSize: 13,
      fontWeight: "600",
      textDecorationLine: "line-through",
    },
    soldOutTag: {
      color: colors.danger,
      fontSize: 11,
      fontWeight: "700",
    },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      justifyContent: "flex-end",
    },
    stepperButton: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    stepperValue: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 13,
      minWidth: 16,
      textAlign: "center",
    },
    matrixFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      padding: 11,
      backgroundColor: colors.surfaceSoft,
    },
    matrixFooterText: {
      color: colors.muted,
      fontSize: 12,
    },
    addButton: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    addButtonDisabled: {
      opacity: 0.5,
    },
    addButtonText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 12.5,
    },
    itemsList: {
      gap: 8,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    itemThumb: {
      width: 32,
      height: 32,
      borderRadius: 7,
    },
    itemName: {
      color: colors.text,
      fontSize: 12.5,
      fontWeight: "600",
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
    twoCol: {
      flexDirection: "row",
      gap: 8,
    },
    twoColInput: {
      flex: 1,
    },
    noteInput: {
      minHeight: 64,
      textAlignVertical: "top",
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.surface,
    },
    chipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    chipText: {
      color: colors.text,
      fontSize: 12.5,
      fontWeight: "600",
    },
    chipTextActive: {
      color: "#ffffff",
    },
    totalsBox: {
      marginTop: 12,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 10,
      padding: 12,
      gap: 6,
    },
    totalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    totalLabel: {
      color: colors.muted,
      fontSize: 13,
    },
    totalValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
    },
    discountInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
      color: colors.textStrong,
      backgroundColor: colors.background,
      fontSize: 13,
      minWidth: 90,
      textAlign: "right",
    },
    totalGrandRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 6,
      marginTop: 2,
    },
    totalGrandLabel: {
      color: colors.textStrong,
      fontSize: 14,
      fontWeight: "700",
    },
    totalGrandValue: {
      color: colors.textStrong,
      fontSize: 14,
      fontWeight: "700",
    },
    errorText: {
      color: colors.danger,
      fontSize: 12,
      marginTop: 10,
    },
    submitButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 12,
      marginBottom: 12 + bottomInset,
    },
    submitText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 15,
    },
  });
}