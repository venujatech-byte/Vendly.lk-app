import { Image } from "expo-image";
import { router } from "expo-router";
import {
  ArrowLeft,
  ChevronDown,
  Info,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
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

import { useAuth } from "@/context/authContextValue";
import { useAppTheme } from "@/context/ThemeContext";
import { createCustomer, getCustomers } from "@/services/customerService";
import { getCouriers, recommendCouriers } from "@/services/courierService";
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

  // "cart" collects who, what and the courier; "summary" reviews money and confirms.
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
  const [selectedProductId, setSelectedProductId] = useState("");
  const [variantQuantities, setVariantQuantities] = useState({});
  const [selectedItems, setSelectedItems] = useState([]);

  const [couriers, setCouriers] = useState([]);
  const [courierId, setCourierId] = useState("");
  const [courierQuotes, setCourierQuotes] = useState([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const [isCourierPickerOpen, setIsCourierPickerOpen] = useState(false);

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

  const selectedProduct = allProducts.find((product) => product.id === selectedProductId);

  const matchingProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();
    if (!search) return allProducts.slice(0, 12);

    return allProducts
      .filter(
        (product) =>
          product.name?.toLowerCase().includes(search) ||
          product.sku?.toLowerCase().includes(search) ||
          (product.sizes ?? []).some((variant) =>
            variant.sku?.toLowerCase().includes(search),
          ),
      )
      .slice(0, 12);
  }, [allProducts, productSearch]);

  const matrixUnitCount = Object.values(variantQuantities).reduce(
    (sum, quantity) => sum + quantity,
    0,
  );
  const matrixTotal = Object.entries(variantQuantities).reduce(
    (sum, [variantId, quantity]) => {
      const variant = selectedProduct?.sizes.find((row) => row.id === variantId);
      return sum + (variant ? variant.sellingPrice * quantity : 0);
    },
    0,
  );

  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.sellingPrice * item.quantity,
    0,
  );
  const discount = Math.min(toAmount(discountAmount), subtotal);
  const totalWeightGrams = selectedItems.reduce(
    (sum, item) => sum + (item.weightKg ?? 0) * 1000 * item.quantity,
    0,
  );
  const selectedQuote = courierQuotes.find((row) => row.courier.id === courierId);
  const deliveryFee = (selectedQuote?.deliveryFeeMinor ?? 0) / 100;
  const total = Math.max(0, subtotal - discount + deliveryFee);
  const deposit =
    paymentMethod === "deposit"
      ? Math.min(toAmount(depositAmount), total)
      : paymentMethod === "paid"
        ? total
        : 0;
  const balance = Math.max(0, total - deposit);

  // Re-quote couriers whenever the weight or district that drives the fee
  // changes, so the chip always shows a live, backend-calculated price.
  useEffect(() => {
    const district = addressDistrict.trim();

    if (!business?.id || !district || totalWeightGrams <= 0) {
      setCourierQuotes([]);
      return undefined;
    }

    let isCurrent = true;
    setIsLoadingQuotes(true);

    const timeout = setTimeout(() => {
      recommendCouriers(business.id, totalWeightGrams, district)
        .then((recommendations) => {
          if (!isCurrent) return;
          setCourierQuotes(recommendations ?? []);
          setCourierId((current) => {
            if (recommendations?.some((row) => row.courier.id === current)) return current;
            return recommendations?.[0]?.courier.id ?? "";
          });
        })
        .catch(() => isCurrent && setCourierQuotes([]))
        .finally(() => isCurrent && setIsLoadingQuotes(false));
    }, 300);

    return () => {
      isCurrent = false;
      clearTimeout(timeout);
    };
  }, [business?.id, totalWeightGrams, addressDistrict]);

  function chooseProduct(product) {
    setSelectedProductId(product.id);
    setVariantQuantities({});
  }

  function changeVariantQuantity(variant, delta) {
    setVariantQuantities((current) => {
      const next = Math.max(0, Math.min(variant.stock, (current[variant.id] ?? 0) + delta));
      const updated = { ...current, [variant.id]: next };
      if (next === 0) delete updated[variant.id];
      return updated;
    });
  }

  function addMatrixToOrder() {
    if (!selectedProduct || matrixUnitCount === 0) return;

    setSelectedItems((current) => {
      let next = current;

      for (const variant of selectedProduct.sizes) {
        const quantity = variantQuantities[variant.id];
        if (!quantity) continue;

        const existing = next.find((item) => item.variantId === variant.id);
        const row = {
          variantId: variant.id,
          productName: selectedProduct.name,
          size: variant.size,
          sku: variant.sku,
          barcode: variant.barcode,
          stock: variant.stock,
          sellingPrice: variant.sellingPrice ?? selectedProduct.sellingPrice ?? 0,
          weightKg: selectedProduct.weightKg,
          image: selectedProduct.images?.[0] ?? "",
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
    setVariantQuantities({});
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

    if (!courierId) {
      Alert.alert("Choose a courier", "Pick a courier to get a delivery quote.");
      return;
    }

    setStep("summary");
  }

  async function handleCreateOrder() {
    if (!business?.id) return;

    if (paymentMethod === "deposit" && deposit <= 0) {
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
        courierId,
        deliveryAddress,
        paymentMethod,
        secondaryPhoneNumber: secondaryPhoneNumber.trim() || undefined,
        discountAmount: discount || undefined,
        depositAmount: paymentMethod === "deposit" ? deposit : undefined,
      });

      router.replace(`/order/${order.id}`);
    } catch (error) {
      Alert.alert("Could not create order", error.message ?? "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderCourierChip() {
    const label = selectedQuote
      ? selectedQuote.courier.name
      : couriers.length === 0
        ? "No couriers configured"
        : isLoadingQuotes
          ? "Fetching rates…"
          : "Add items & district for rates";

    return (
      <>
        <Text style={styles.sectionTitle}>Courier</Text>
        <TouchableOpacity
          style={styles.courierChip}
          disabled={courierQuotes.length === 0}
          onPress={() => setIsCourierPickerOpen(true)}
        >
          <View
            style={[
              styles.courierDot,
              { backgroundColor: selectedQuote ? colors.success : colors.border },
            ]}
          />
          <Text style={styles.courierChipText} numberOfLines={1}>
            {label}
          </Text>
          {selectedQuote && <Text style={styles.courierChipFee}>{formatLkr(deliveryFee)}</Text>}
          <ChevronDown size={15} color={colors.subtle} />
        </TouchableOpacity>

        <View style={styles.hintBox}>
          <Info size={13} color={colors.subtle} />
          <Text style={styles.hintText}>
            District sets the courier surcharge, so it must be entered before a delivery
            quote.
          </Text>
        </View>
      </>
    );
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

        {renderCourierChip()}

        <Text style={styles.sectionTitle}>Items</Text>

        {!selectedProduct ? (
          <>
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
                    <View style={[styles.resultThumb, styles.thumbPlaceholder]} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.line}>{product.name}</Text>
                    <Text style={styles.lineMuted}>
                      {product.sizes?.length ?? 0} sizes · {product.stock} in stock
                    </Text>
                  </View>
                  <ChevronDown
                    size={15}
                    color={colors.subtle}
                    style={{ transform: [{ rotate: "-90deg" }] }}
                  />
                </TouchableOpacity>
              ))}
            </View>
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
              <View style={{ flex: 1 }}>
                <Text style={styles.matrixTitle}>{selectedProduct.name}</Text>
                <Text style={styles.lineMuted}>
                  {selectedProduct.sizes.length} sizes · {selectedProduct.stock} in stock
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSelectedProductId("");
                  setVariantQuantities({});
                }}
              >
                <Text style={styles.linkButtonText}>Change</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.matrixColumnHeads}>
              <Text style={[styles.matrixHeadText, styles.matrixColSize]}>Size</Text>
              <Text style={[styles.matrixHeadText, styles.matrixColStock]}>Stock</Text>
              <Text style={[styles.matrixHeadText, styles.matrixColPrice]}>Price</Text>
              <Text style={[styles.matrixHeadText, styles.matrixColQty]}>Qty</Text>
            </View>

            {selectedProduct.sizes.map((variant) => {
              const quantity = variantQuantities[variant.id] ?? 0;
              const soldOut = variant.stock <= 0;
              const lowStock = !soldOut && variant.stock <= 5;

              return (
                <View
                  key={variant.id}
                  style={[
                    styles.matrixRow,
                    quantity > 0 && styles.matrixRowSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.matrixColSize,
                      soldOut ? styles.matrixTextSoldOut : styles.matrixText,
                    ]}
                  >
                    {variant.size || "—"}
                  </Text>

                  <View style={styles.matrixColStock}>
                    {soldOut ? (
                      <Text style={styles.soldOutTag}>Sold out</Text>
                    ) : lowStock ? (
                      <Text style={styles.lowStockTag}>{variant.stock}</Text>
                    ) : (
                      <Text style={styles.matrixText}>{variant.stock}</Text>
                    )}
                  </View>

                  <Text style={[styles.matrixColPrice, styles.matrixText]}>
                    {formatLkr(variant.sellingPrice)}
                  </Text>

                  <View style={[styles.matrixColQty, styles.matrixStepper]}>
                    <TouchableOpacity
                      style={styles.matrixStepButton}
                      disabled={soldOut}
                      onPress={() => changeVariantQuantity(variant, -1)}
                    >
                      <Minus size={11} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.matrixQtyValue}>{quantity}</Text>
                    <TouchableOpacity
                      style={styles.matrixStepButton}
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
              <Text style={styles.lineMuted}>
                {matrixUnitCount > 0
                  ? `${matrixUnitCount} unit(s) · ${formatLkr(matrixTotal)}`
                  : "Choose a size to add it"}
              </Text>
              <TouchableOpacity
                style={[
                  styles.matrixAddButton,
                  matrixUnitCount === 0 && styles.matrixAddButtonDisabled,
                ]}
                disabled={matrixUnitCount === 0}
                onPress={addMatrixToOrder}
              >
                <Text style={styles.matrixAddButtonText}>Add to order</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {selectedItems.length > 0 && (
          <View style={styles.card}>
            {selectedItems.map((item) => (
              <View key={item.variantId} style={styles.itemRow}>
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    style={styles.itemThumb}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.itemThumb, styles.thumbPlaceholder]} />
                )}
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
      </>
    );
  }

  function renderSummaryStep() {
    return (
      <>
        <Text style={styles.sectionTitle}>Order summary</Text>

        <View style={styles.recapRow}>
          <View style={[styles.card, styles.recapCard]}>
            <Text style={styles.summaryName}>
              {isCreatingNewCustomer ? newCustomerName : selectedCustomer?.name}
            </Text>
            <Text style={styles.lineMuted}>{phoneNumber}</Text>
            <Text style={styles.lineMuted} numberOfLines={2}>
              {[addressLine1, addressCity, addressDistrict].filter(Boolean).join(", ")}
            </Text>
          </View>

          <View style={[styles.card, styles.recapCard]}>
            <Text style={styles.summaryName}>{selectedQuote?.courier.name ?? "—"}</Text>
            <Text style={styles.lineMuted}>{(totalWeightGrams / 1000).toFixed(2)} kg</Text>
            <Text style={styles.lineMuted}>
              {selectedQuote?.courier.averageDeliveryDays
                ? `${selectedQuote.courier.averageDeliveryDays} day(s)`
                : ""}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          {selectedItems.map((item) => (
            <View key={item.variantId} style={styles.itemRow}>
              {item.image ? (
                <Image
                  source={{ uri: item.image }}
                  style={styles.itemThumb}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.itemThumb, styles.thumbPlaceholder]} />
              )}
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
            <Text style={styles.line}>{formatLkr(subtotal)}</Text>
          </View>

          {discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.lineMuted}>Discount</Text>
              <Text style={styles.deduction}>-{formatLkr(discount)}</Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Text style={styles.lineMuted}>Delivery fee</Text>
              <Text style={styles.confirmedTag}>✓ confirmed</Text>
            </View>
            <Text style={styles.line}>{formatLkr(deliveryFee)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.cardTitle}>Order total</Text>
            <Text style={styles.cardTitle}>{formatLkr(total)}</Text>
          </View>

          {deposit > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.lineMuted}>
                {paymentMethod === "paid" ? "Paid" : "Deposit paid"}
              </Text>
              <Text style={styles.deduction}>-{formatLkr(deposit)}</Text>
            </View>
          )}
        </View>

        {deposit > 0 && (
          <View style={styles.balanceCallout}>
            <Text style={styles.balanceCalloutLabel}>Balance to collect</Text>
            <Text style={styles.balanceCalloutValue}>{formatLkr(balance)}</Text>
            <Text style={styles.balanceCalloutNote}>
              {formatLkr(total)} total less {formatLkr(deposit)} already paid
            </Text>
          </View>
        )}
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
        <Text style={styles.footerAmount}>
          {isSummary
            ? deposit > 0
              ? `Collect ${formatLkr(balance)}`
              : formatLkr(total)
            : selectedQuote
              ? formatLkr(subtotal)
              : "Delivery calculated next"}
        </Text>

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

      <Modal
        visible={isCourierPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsCourierPickerOpen(false)}
      >
        <Pressable
          style={styles.pickerBackdrop}
          onPress={() => setIsCourierPickerOpen(false)}
        >
          <Pressable style={styles.pickerSheet} onPress={() => {}}>
            <Text style={styles.pickerTitle}>Choose a courier</Text>

            {courierQuotes.map((quote, index) => (
              <TouchableOpacity
                key={quote.courier.id}
                style={[
                  styles.pickerRow,
                  quote.courier.id === courierId && styles.pickerRowActive,
                ]}
                onPress={() => {
                  setCourierId(quote.courier.id);
                  setIsCourierPickerOpen(false);
                }}
              >
                <View
                  style={[
                    styles.pickerRadio,
                    quote.courier.id === courierId && styles.pickerRadioActive,
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.line}>{quote.courier.name}</Text>
                  <Text style={styles.lineMuted}>
                    {quote.courier.averageDeliveryDays
                      ? `${quote.courier.averageDeliveryDays} day(s)`
                      : ""}
                    {index === 0 ? " · Recommended" : ""}
                  </Text>
                </View>
                <Text style={styles.cardTitle}>{formatLkr(quote.deliveryFeeMinor / 100)}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
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
    matrixThumb: {
      width: 34,
      height: 34,
      borderRadius: 7,
    },
    itemThumb: {
      width: 34,
      height: 34,
      borderRadius: 7,
    },
    thumbPlaceholder: {
      backgroundColor: colors.surfaceSoft,
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
    recapRow: {
      flexDirection: "row",
      gap: 10,
    },
    recapCard: {
      flex: 1,
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
      gap: 10,
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
      alignItems: "center",
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
    confirmedTag: {
      color: colors.success,
      fontSize: 11,
      fontWeight: "700",
    },
    cardTitle: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 14,
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
    // Courier: a compact confirmation chip, opened into a bottom-sheet picker.
    courierChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      height: 42,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.surface,
    },
    courierDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    courierChipText: {
      flex: 1,
      color: colors.textStrong,
      fontWeight: "600",
      fontSize: 13,
    },
    courierChipFee: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 13,
    },
    hintBox: {
      flexDirection: "row",
      gap: 7,
      marginTop: 8,
      padding: 9,
      borderRadius: 8,
      backgroundColor: colors.surfaceSoft,
    },
    hintText: {
      flex: 1,
      color: colors.muted,
      fontSize: 11,
      lineHeight: 16,
    },
    // Variant matrix.
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
    matrixTitle: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 13,
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
      backgroundColor: colors.surface,
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
      width: 84,
    },
    matrixText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
    },
    matrixTextSoldOut: {
      color: colors.subtle,
      fontSize: 13,
      fontWeight: "600",
      textDecorationLine: "line-through",
    },
    lowStockTag: {
      color: "#b45309",
      backgroundColor: "#fff4df",
      fontSize: 11,
      fontWeight: "700",
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 999,
      alignSelf: "flex-start",
    },
    soldOutTag: {
      color: colors.danger,
      fontSize: 11,
      fontWeight: "700",
    },
    matrixStepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      justifyContent: "flex-end",
    },
    matrixStepButton: {
      width: 22,
      height: 22,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    matrixQtyValue: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 13,
      minWidth: 14,
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
    matrixAddButton: {
      backgroundColor: colors.accent,
      borderRadius: 7,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    matrixAddButtonDisabled: {
      opacity: 0.5,
    },
    matrixAddButtonText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 12,
    },
    balanceCallout: {
      marginTop: 12,
      padding: 14,
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
    balanceCalloutLabel: {
      color: "#b9d4ef",
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    balanceCalloutValue: {
      color: "#ffffff",
      fontSize: 22,
      fontWeight: "700",
      marginTop: 4,
    },
    balanceCalloutNote: {
      color: "#9dc3e8",
      fontSize: 11,
      marginTop: 2,
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
      fontSize: 15,
      flexShrink: 1,
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
    pickerBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    pickerSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 18,
      paddingBottom: 18 + bottomInset,
    },
    pickerTitle: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 16,
      marginBottom: 12,
    },
    pickerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    pickerRowActive: {
      backgroundColor: colors.surfaceSoft,
    },
    pickerRadio: {
      width: 15,
      height: 15,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickerRadioActive: {
      borderWidth: 4,
      borderColor: colors.accent,
    },
  });
}
