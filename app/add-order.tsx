import { router } from "expo-router";
import { ArrowLeft, Minus, Plus, Search, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
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

import { useAuth } from "@/context/authContextValue";
import { useAppTheme } from "@/context/ThemeContext";
import { createCustomer, getCustomers } from "@/services/customerService";
import { getCouriers } from "@/services/courierService";
import { createOrder } from "@/services/orderService";
import { getProducts } from "@/services/productService";

const PAYMENT_METHODS = [
  { value: "cod", label: "Cash on delivery" },
  { value: "deposit", label: "Deposit paid" },
  { value: "paid", label: "Fully paid" },
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

export default function AddOrderScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(colors, insets.top, insets.bottom),
    [colors, insets.top, insets.bottom],
  );
  const { business } = useAuth();

  // "cart" collects who and what; "summary" reviews money and confirms.
  const [step, setStep] = useState("cart");

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [secondaryPhoneNumber, setSecondaryPhoneNumber] = useState("");

  const [addressLine1, setAddressLine1] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressDistrict, setAddressDistrict] = useState("");

  const [productSearch, setProductSearch] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  const [couriers, setCouriers] = useState([]);
  const [courierId, setCourierId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [discountAmount, setDiscountAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!business?.id) return;
    getProducts(business.id).then(setAllProducts).catch(() => setAllProducts([]));
    getCouriers(business.id).then(setCouriers).catch(() => setCouriers([]));
  }, [business?.id]);

  useEffect(() => {
    if (!business?.id || isCreatingNewCustomer || customerSearch.trim().length < 2) {
      setCustomerResults([]);
      return undefined;
    }

    const timeout = setTimeout(() => {
      getCustomers(business.id, customerSearch)
        .then(setCustomerResults)
        .catch(() => setCustomerResults([]));
    }, 300);

    return () => clearTimeout(timeout);
  }, [business?.id, customerSearch, isCreatingNewCustomer]);

  const variantOptions = useMemo(() => {
    const search = productSearch.trim().toLowerCase();
    const flattened = allProducts.flatMap((product) =>
      (product.sizes ?? []).map((variant) => ({
        variantId: variant.id,
        productName: product.name,
        size: variant.size,
        sku: variant.sku,
        stock: variant.stock,
        sellingPrice: variant.sellingPrice ?? product.sellingPrice ?? 0,
      })),
    );

    if (!search) return flattened.slice(0, 20);

    return flattened
      .filter(
        (variant) =>
          variant.productName?.toLowerCase().includes(search) ||
          variant.sku?.toLowerCase().includes(search),
      )
      .slice(0, 20);
  }, [allProducts, productSearch]);

  const selectedCourier = couriers.find((courier) => courier.id === courierId);

  // The backend recalculates all of this on submit; this mirrors its maths so
  // the seller sees the same numbers before committing.
  const totals = useMemo(() => {
    const subtotal = selectedItems.reduce(
      (sum, item) => sum + item.sellingPrice * item.quantity,
      0,
    );
    const discount = Math.min(toAmount(discountAmount), subtotal);
    const deliveryFee = selectedCourier
      ? (selectedCourier.firstKgPriceMinor ?? 0) / 100
      : 0;
    const total = Math.max(0, subtotal - discount + deliveryFee);
    const deposit =
      paymentMethod === "deposit"
        ? Math.min(toAmount(depositAmount), total)
        : paymentMethod === "paid"
          ? total
          : 0;

    return { subtotal, discount, deliveryFee, total, deposit, balance: total - deposit };
  }, [selectedItems, discountAmount, selectedCourier, paymentMethod, depositAmount]);

  function addItem(variant) {
    setSelectedItems((current) => {
      const existing = current.find((item) => item.variantId === variant.variantId);
      if (existing) {
        return current.map((item) =>
          item.variantId === variant.variantId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...current, { ...variant, quantity: 1 }];
    });
  }

  function changeItemQuantity(variantId, delta) {
    setSelectedItems((current) =>
      current
        .map((item) =>
          item.variantId === variantId
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function selectCustomer(customer) {
    setSelectedCustomer(customer);
    setCustomerResults([]);
    setCustomerSearch(customer.name);
    setPhoneNumber(customer.normalizedPhone ?? "");
    setSecondaryPhoneNumber(customer.normalizedSecondaryPhone ?? "");

    if (customer.defaultAddress) {
      setAddressLine1(customer.defaultAddress.line1 ?? "");
      setAddressCity(customer.defaultAddress.city ?? "");
      setAddressDistrict(customer.defaultAddress.district ?? "");
    }
  }

  // Validate everything the cart step owns before showing the summary.
  function handleCheckout() {
    if (!selectedCustomer && !isCreatingNewCustomer) {
      Alert.alert("Pick a customer", "Search for an existing customer or add a new one.");
      return;
    }

    if (isCreatingNewCustomer && (!newCustomerName.trim() || !phoneNumber.trim())) {
      Alert.alert("Missing details", "Enter the new customer's name and phone number.");
      return;
    }

    if (!addressLine1.trim() || !addressCity.trim() || !addressDistrict.trim()) {
      Alert.alert("Missing address", "Address line, city and district are required.");
      return;
    }

    if (selectedItems.length === 0) {
      Alert.alert("No items", "Add at least one item to the order.");
      return;
    }

    setStep("summary");
  }

  async function handleCreateOrder() {
    if (!business?.id) return;

    if (paymentMethod === "deposit" && totals.deposit <= 0) {
      Alert.alert(
        "Enter the deposit",
        "Add how much the customer has already paid, or change the payment method.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      let customerId = selectedCustomer?.id;

      const deliveryAddress = {
        line1: addressLine1.trim(),
        city: addressCity.trim(),
        district: addressDistrict.trim(),
      };

      if (isCreatingNewCustomer) {
        const customer = await createCustomer(business.id, {
          name: newCustomerName.trim(),
          phoneNumber: phoneNumber.trim(),
          secondaryPhoneNumber: secondaryPhoneNumber.trim() || undefined,
          address: deliveryAddress,
        });
        customerId = customer.id;
      }

      const order = await createOrder(business.id, {
        customerId,
        items: selectedItems.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        courierId: courierId || undefined,
        deliveryAddress,
        paymentMethod,
        secondaryPhoneNumber: secondaryPhoneNumber.trim() || undefined,
        discountAmount: totals.discount || undefined,
        depositAmount: paymentMethod === "deposit" ? totals.deposit : undefined,
      });

      router.replace(`/order/${order.id}`);
    } catch (error) {
      Alert.alert("Could not create order", error.message ?? "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderCartStep() {
    return (
      <>
        <Text style={styles.sectionTitle}>Customer</Text>

        {!isCreatingNewCustomer ? (
          <>
            <View style={styles.searchBox}>
              <Search size={16} color={colors.subtle} />
              <TextInput
                style={styles.searchInput}
                value={customerSearch}
                onChangeText={(value) => {
                  setCustomerSearch(value);
                  setSelectedCustomer(null);
                }}
                placeholder="Search by name or phone"
                placeholderTextColor={colors.subtle}
              />
            </View>

            {customerResults.length > 0 && (
              <View style={styles.resultsBox}>
                {customerResults.map((customer) => (
                  <TouchableOpacity
                    key={customer.id}
                    style={styles.resultRow}
                    onPress={() => selectCustomer(customer)}
                  >
                    <Text style={styles.line}>{customer.name}</Text>
                    <Text style={styles.lineMuted}>{customer.normalizedPhone}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {selectedCustomer && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>
                  Selected: {selectedCustomer.name}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => {
                setIsCreatingNewCustomer(true);
                setSelectedCustomer(null);
                setCustomerSearch("");
              }}
            >
              <Text style={styles.linkButtonText}>+ Add a new customer instead</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              value={newCustomerName}
              onChangeText={setNewCustomerName}
              placeholder="Customer name"
              placeholderTextColor={colors.subtle}
            />

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => setIsCreatingNewCustomer(false)}
            >
              <Text style={styles.linkButtonText}>
                Search an existing customer instead
              </Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.sectionTitle}>Phone numbers</Text>
        <View style={styles.phoneRow}>
          <TextInput
            style={[styles.input, styles.phoneInput]}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Primary phone"
            placeholderTextColor={colors.subtle}
            keyboardType="phone-pad"
          />
          <TextInput
            style={[styles.input, styles.phoneInput]}
            value={secondaryPhoneNumber}
            onChangeText={setSecondaryPhoneNumber}
            placeholder="Second phone"
            placeholderTextColor={colors.subtle}
            keyboardType="phone-pad"
          />
        </View>

        <Text style={styles.sectionTitle}>Delivery address</Text>
        <TextInput
          style={styles.input}
          value={addressLine1}
          onChangeText={setAddressLine1}
          placeholder="Address line"
          placeholderTextColor={colors.subtle}
        />
        <TextInput
          style={styles.input}
          value={addressCity}
          onChangeText={setAddressCity}
          placeholder="City"
          placeholderTextColor={colors.subtle}
        />
        <TextInput
          style={styles.input}
          value={addressDistrict}
          onChangeText={setAddressDistrict}
          placeholder="District"
          placeholderTextColor={colors.subtle}
        />

        <Text style={styles.sectionTitle}>Items</Text>
        <View style={styles.searchBox}>
          <Search size={16} color={colors.subtle} />
          <TextInput
            style={styles.searchInput}
            value={productSearch}
            onChangeText={setProductSearch}
            placeholder="Search products"
            placeholderTextColor={colors.subtle}
          />
        </View>

        <View style={styles.resultsBox}>
          {variantOptions.map((variant) => (
            <TouchableOpacity
              key={variant.variantId}
              style={styles.resultRow}
              onPress={() => addItem(variant)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.line}>
                  {variant.productName} {variant.size ? `· ${variant.size}` : ""}
                </Text>
                <Text style={styles.lineMuted}>
                  {formatLkr(variant.sellingPrice)} · {variant.stock} in stock
                </Text>
              </View>
              <Plus size={16} color={colors.accent} />
            </TouchableOpacity>
          ))}
        </View>

        {selectedItems.length > 0 && (
          <View style={styles.card}>
            {selectedItems.map((item) => (
              <View key={item.variantId} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.line}>
                    {item.productName} {item.size ? `· ${item.size}` : ""}
                  </Text>
                  <Text style={styles.lineMuted}>{formatLkr(item.sellingPrice)}</Text>
                </View>

                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepperButton}
                    onPress={() => changeItemQuantity(item.variantId, -1)}
                  >
                    <Minus size={14} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.stepperButton}
                    onPress={() => changeItemQuantity(item.variantId, 1)}
                  >
                    <Plus size={14} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.cardTitle}>Subtotal</Text>
              <Text style={styles.cardTitle}>{formatLkr(totals.subtotal)}</Text>
            </View>
          </View>
        )}
      </>
    );
  }

  function renderSummaryStep() {
    return (
      <>
        <Text style={styles.sectionTitle}>Order summary</Text>

        <View style={styles.card}>
          <Text style={styles.summaryName}>
            {isCreatingNewCustomer ? newCustomerName : selectedCustomer?.name}
          </Text>
          <Text style={styles.lineMuted}>
            {phoneNumber}
            {secondaryPhoneNumber ? ` · ${secondaryPhoneNumber}` : ""}
          </Text>
          <Text style={styles.lineMuted}>
            {[addressLine1, addressCity, addressDistrict].filter(Boolean).join(", ")}
          </Text>
        </View>

        <View style={styles.card}>
          {selectedItems.map((item) => (
            <View key={item.variantId} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.line}>
                  {item.productName} {item.size ? `· ${item.size}` : ""}
                </Text>
                <Text style={styles.lineMuted}>
                  {item.quantity} × {formatLkr(item.sellingPrice)}
                </Text>
              </View>
              <Text style={styles.line}>
                {formatLkr(item.sellingPrice * item.quantity)}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Courier</Text>
        <View style={styles.chipWrap}>
          {[{ id: "", name: "Not assigned" }, ...couriers].map((courier) => (
            <TouchableOpacity
              key={courier.id || "none"}
              style={[styles.chip, courierId === courier.id && styles.chipActive]}
              onPress={() => setCourierId(courier.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  courierId === courier.id && styles.chipTextActive,
                ]}
              >
                {courier.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Payment method</Text>
        <View style={styles.chipWrap}>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.value}
              style={[styles.chip, paymentMethod === method.value && styles.chipActive]}
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

        <Text style={styles.sectionTitle}>Discount (LKR, optional)</Text>
        <TextInput
          style={styles.input}
          value={discountAmount}
          onChangeText={setDiscountAmount}
          placeholder="0.00"
          placeholderTextColor={colors.subtle}
          keyboardType="numeric"
        />

        {paymentMethod === "deposit" && (
          <>
            <Text style={styles.sectionTitle}>Deposit already paid (LKR)</Text>
            <TextInput
              style={styles.input}
              value={depositAmount}
              onChangeText={setDepositAmount}
              placeholder="0.00"
              placeholderTextColor={colors.subtle}
              keyboardType="numeric"
            />
          </>
        )}

        <View style={[styles.card, styles.totalsCard]}>
          <View style={styles.totalRow}>
            <Text style={styles.lineMuted}>Subtotal</Text>
            <Text style={styles.line}>{formatLkr(totals.subtotal)}</Text>
          </View>

          {totals.discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.lineMuted}>Discount</Text>
              <Text style={styles.deduction}>-{formatLkr(totals.discount)}</Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.lineMuted}>Delivery fee</Text>
            <Text style={styles.line}>{formatLkr(totals.deliveryFee)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.cardTitle}>Total</Text>
            <Text style={styles.cardTitle}>{formatLkr(totals.total)}</Text>
          </View>

          {totals.deposit > 0 && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.lineMuted}>
                  {paymentMethod === "paid" ? "Paid" : "Deposit paid"}
                </Text>
                <Text style={styles.deduction}>-{formatLkr(totals.deposit)}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.totalRow}>
                <Text style={styles.balanceLabel}>Balance to collect</Text>
                <Text style={styles.balanceValue}>{formatLkr(totals.balance)}</Text>
              </View>
            </>
          )}
        </View>
      </>
    );
  }

  const isSummary = step === "summary";

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        {isSummary ? (
          <TouchableOpacity onPress={() => setStep("cart")} style={styles.headerButton}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
        ) : null}

        <Text style={styles.headerTitle}>
          {isSummary ? "Review order" : "New order"}
        </Text>

        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <X size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {isSummary ? renderSummaryStep() : renderCartStep()}
      </ScrollView>

      <View style={styles.footer}>
        {isSummary && (
          <Text style={styles.footerAmount}>
            {totals.deposit > 0
              ? `Collect ${formatLkr(totals.balance)}`
              : formatLkr(totals.total)}
          </Text>
        )}

        <TouchableOpacity
          style={styles.submitButton}
          onPress={isSummary ? handleCreateOrder : handleCheckout}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isSummary ? "Create order" : "Checkout"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors, topInset, bottomInset) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 14 + topInset,
      paddingBottom: 14,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      flex: 1,
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 18,
    },
    headerButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      padding: 16,
      paddingBottom: 24,
    },
    sectionTitle: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 15,
      marginTop: 18,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.textStrong,
      backgroundColor: colors.surface,
      marginBottom: 8,
    },
    phoneRow: {
      flexDirection: "row",
      gap: 8,
    },
    phoneInput: {
      flex: 1,
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.surface,
      height: 42,
    },
    searchInput: {
      flex: 1,
      color: colors.textStrong,
    },
    resultsBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      marginTop: 6,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    resultRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    selectedBadge: {
      marginTop: 8,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 8,
      padding: 10,
    },
    selectedBadgeText: {
      color: colors.text,
      fontWeight: "600",
    },
    linkButton: {
      marginTop: 10,
    },
    linkButtonText: {
      color: colors.accent,
      fontWeight: "600",
      fontSize: 13,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginTop: 10,
    },
    totalsCard: {
      marginTop: 18,
    },
    summaryName: {
      color: colors.textStrong,
      fontSize: 15,
      fontWeight: "700",
      marginBottom: 2,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 6,
    },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    stepperButton: {
      width: 28,
      height: 28,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    stepperValue: {
      color: colors.textStrong,
      fontWeight: "700",
      minWidth: 18,
      textAlign: "center",
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 8,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 2,
    },
    line: {
      color: colors.text,
      fontSize: 14,
    },
    lineMuted: {
      color: colors.muted,
      fontSize: 12,
    },
    deduction: {
      color: colors.success,
      fontSize: 14,
      fontWeight: "600",
    },
    cardTitle: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 14,
    },
    balanceLabel: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 15,
    },
    balanceValue: {
      color: colors.accent,
      fontWeight: "700",
      fontSize: 16,
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
      fontSize: 13,
      fontWeight: "600",
    },
    chipTextActive: {
      color: "#ffffff",
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12 + bottomInset,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    footerAmount: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 16,
    },
    submitButton: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
    },
    submitButtonText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 15,
    },
  });
}
