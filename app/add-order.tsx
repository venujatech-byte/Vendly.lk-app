import { router } from "expo-router";
import { Minus, Plus, Search, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
  return `LKR ${amount.toLocaleString("en-LK", { maximumFractionDigits: 2 })}`;
}

export default function AddOrderScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
  const { business } = useAuth();

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

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

  const subtotal = useMemo(
    () =>
      selectedItems.reduce(
        (sum, item) => sum + item.sellingPrice * item.quantity,
        0,
      ),
    [selectedItems],
  );

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
    if (customer.defaultAddress) {
      setAddressLine1(customer.defaultAddress.line1 ?? "");
      setAddressCity(customer.defaultAddress.city ?? "");
      setAddressDistrict(customer.defaultAddress.district ?? "");
    }
  }

  async function handleSubmit() {
    if (!business?.id) return;

    if (!selectedCustomer && !isCreatingNewCustomer) {
      Alert.alert("Pick a customer", "Search for an existing customer or add a new one.");
      return;
    }

    if (isCreatingNewCustomer && (!newCustomerName.trim() || !newCustomerPhone.trim())) {
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
          phoneNumber: newCustomerPhone.trim(),
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
        discountAmount: discountAmount ? Number(discountAmount) : undefined,
      });

      router.replace(`/order/${order.id}`);
    } catch (error) {
      Alert.alert("Could not create order", error.message ?? "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New order</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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
            <TextInput
              style={styles.input}
              value={newCustomerPhone}
              onChangeText={setNewCustomerPhone}
              placeholder="Phone number (07XXXXXXXX)"
              placeholderTextColor={colors.subtle}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => setIsCreatingNewCustomer(false)}
            >
              <Text style={styles.linkButtonText}>Search an existing customer instead</Text>
            </TouchableOpacity>
          </>
        )}

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
              <Text style={styles.cardTitle}>{formatLkr(subtotal)}</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Courier</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: "", name: "Not assigned" }, ...couriers]}
          keyExtractor={(item) => item.id || "none"}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, courierId === item.id && styles.chipActive]}
              onPress={() => setCourierId(item.id)}
            >
              <Text
                style={[styles.chipText, courierId === item.id && styles.chipTextActive]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />

        <Text style={styles.sectionTitle}>Payment method</Text>
        <View style={styles.paymentRow}>
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

        <Text style={styles.sectionTitle}>Discount (LKR, optional)</Text>
        <TextInput
          style={styles.input}
          value={discountAmount}
          onChangeText={setDiscountAmount}
          placeholder="0"
          placeholderTextColor={colors.subtle}
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Create order</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function createStyles(colors, topInset) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 14 + topInset,
      paddingBottom: 14,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 18,
    },
    closeButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      padding: 16,
      paddingBottom: 48,
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
    },
    line: {
      color: colors.text,
      fontSize: 14,
    },
    lineMuted: {
      color: colors.muted,
      fontSize: 12,
    },
    cardTitle: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 14,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginRight: 8,
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
    paymentRow: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    submitButton: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 24,
    },
    submitButtonText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 15,
    },
  });
}
