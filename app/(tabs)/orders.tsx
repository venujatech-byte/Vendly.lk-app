import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowUpDown,
  Banknote,
  Download,
  Filter,
  Globe,
  Link2,
  Plus,
  ReceiptText,
  ScanLine,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  Trophy,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AddShopSaleModal from "@/components/orders/AddShopSaleModal";
import BarcodeScannerModal from "@/components/orders/BarcodeScannerModal";
import BulkActionsBar from "@/components/orders/BulkActionsBar";
import OrderActionsMenu from "@/components/orders/OrderActionsMenu";
import OrderFiltersModal from "@/components/orders/OrderFiltersModal";
import OrderRow from "@/components/orders/OrderRow";
import OrderSortModal from "@/components/orders/OrderSortModal";
import PromptModal from "@/components/orders/PromptModal";
import ShopSaleCard from "@/components/orders/ShopSaleCard";
import StatCard2 from "@/components/orders/StatCard2";
import WarrantyClaimModal from "@/components/orders/WarrantyClaimModal";
import WarrantyClaimsList from "@/components/orders/WarrantyClaimsList";
import ScreenHeader from "@/components/ScreenHeader";
import { DEFAULT_ORDER_SORT, sortOrders } from "@/constants/orderSort";
import { ORDER_STAT_DEFINITIONS } from "@/constants/orderStatus";
import { useAuth } from "@/context/authContextValue";
import { useAppTheme } from "@/context/ThemeContext";
import { getCouriers } from "@/services/courierService";
import { downloadOrderExport, shareCsv, shareWaybillPdf } from "@/services/fileService";
import {
  generateOrderWaybill,
  reportCourierIssue,
  reportFraudOrder,
} from "@/services/operationService";
import { getOrders, recordOrderPayment, removeOrder, updateOrderStatus } from "@/services/orderService";
import {
  getShopSales,
  getWarrantyClaims,
  removeShopSale,
} from "@/services/shopSaleService";

export default function OrdersTab() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { business } = useAuth();
  const params = useLocalSearchParams();

  const [orders, setOrders] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ordersError, setOrdersError] = useState(null);
  const [searchText, setSearchText] = useState(
    typeof params.search === "string" ? params.search : "",
  );
  const [statusFilter, setStatusFilter] = useState(
    typeof params.status === "string" ? params.status : "all",
  );
  const [dateFilters, setDateFilters] = useState({
    dateFrom: typeof params.dateFrom === "string" ? params.dateFrom : "",
    dateTo: typeof params.dateTo === "string" ? params.dateTo : "",
    courierId: typeof params.courierId === "string" ? params.courierId : "",
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sort, setSort] = useState(DEFAULT_ORDER_SORT);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isManualWaybillOpen, setIsManualWaybillOpen] = useState(false);
  const [isLookingUpWaybill, setIsLookingUpWaybill] = useState(false);

  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [actionSheetOrder, setActionSheetOrder] = useState(null);
  const [orderTab, setOrderTab] = useState("online"); // "online" | "shop" | "warranty"

  const [shopSales, setShopSales] = useState([]);
  const [isShopLoading, setIsShopLoading] = useState(true);
  const [shopError, setShopError] = useState(null);
  const [isAddShopSaleOpen, setIsAddShopSaleOpen] = useState(false);

  const [warrantyClaims, setWarrantyClaims] = useState([]);
  const [isWarrantyLoading, setIsWarrantyLoading] = useState(true);
  const [warrantyError, setWarrantyError] = useState(null);
  const [warrantySource, setWarrantySource] = useState(null);
  const [isWarrantySourceOpen, setIsWarrantySourceOpen] = useState(false);
  const [claimsVersion, setClaimsVersion] = useState(0);

  useEffect(() => {
    if (typeof params.status === "string" && params.status !== statusFilter) {
      setStatusFilter(params.status);
    }
    if (typeof params.search === "string" && params.search !== searchText) {
      setSearchText(params.search);
    }
  }, [params.status, params.search]);

  const loadOrders = useCallback(async () => {
    if (!business?.id) {
      setIsLoading(false);
      return;
    }

    setOrdersError(null);

    try {
      const results = await getOrders(business.id, {
        search: searchText,
        ...dateFilters,
      });
      setOrders(results);
    } catch (error) {
      setOrdersError(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [business?.id, searchText, dateFilters]);

  useEffect(() => {
    const timeout = setTimeout(loadOrders, searchText ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [loadOrders, searchText]);

  useEffect(() => {
    if (!business?.id) return;

    getCouriers(business.id)
      .then(setCouriers)
      .catch(() => setCouriers([]));
  }, [business?.id]);

  const loadShopSales = useCallback(async () => {
    if (!business?.id) {
      setIsShopLoading(false);
      return;
    }

    setShopError(null);

    try {
      const results = await getShopSales(business.id, dateFilters);
      setShopSales(results);
    } catch (error) {
      setShopError(error);
    } finally {
      setIsShopLoading(false);
    }
  }, [business?.id, dateFilters]);

  useEffect(() => {
    if (orderTab !== "shop") return;
    loadShopSales();
  }, [orderTab, loadShopSales]);

  const loadWarrantyClaims = useCallback(async () => {
    if (!business?.id) {
      setIsWarrantyLoading(false);
      return;
    }

    setWarrantyError(null);

    try {
      const results = await getWarrantyClaims(business.id);
      setWarrantyClaims(results);
    } catch (error) {
      setWarrantyError(error);
    } finally {
      setIsWarrantyLoading(false);
    }
  }, [business?.id]);

  useEffect(() => {
    if (orderTab !== "warranty") return;
    loadWarrantyClaims();
  }, [orderTab, loadWarrantyClaims, claimsVersion]);

  const shopStats = useMemo(() => {
    const currency = (minorUnits = 0) =>
      `LKR ${(minorUnits / 100).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
      })}`;

    const totalRevenue = shopSales.reduce(
      (sum, sale) => sum + (sale.totalAmountMinor ?? 0),
      0,
    );
    const totalItems = shopSales.reduce(
      (sum, sale) => sum + (sale.itemCount ?? sale.items?.length ?? 0),
      0,
    );
    const topItem = [...shopSales]
      .flatMap((sale) => sale.items ?? [])
      .sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0))[0];

    return [
      {
        key: "revenue",
        label: "Revenue",
        value: currency(totalRevenue),
        icon: Banknote,
        tone: "green",
      },
      {
        key: "sales",
        label: "Shop sales",
        value: String(shopSales.length),
        icon: ShoppingBasket,
        tone: "blue",
      },
      {
        key: "items",
        label: "Items sold",
        value: String(totalItems),
        icon: ReceiptText,
        tone: "purple",
      },
      {
        key: "top",
        label: "Top product",
        value: topItem?.name ?? "—",
        icon: Trophy,
        tone: "orange",
      },
    ];
  }, [shopSales]);

  function handleShopSaleCreated(sale) {
    setShopSales((current) => [sale, ...current]);
  }

  async function handleRemoveShopSale(sale) {
    try {
      await removeShopSale(business.id, sale.id);
      setShopSales((current) => current.filter((item) => item.id !== sale.id));
    } catch (error) {
      Alert.alert("Could not delete sale", error.message ?? "Please try again.");
    }
  }

  function handleClaimCreated(claim) {
    setWarrantyClaims((current) => [claim, ...current]);
    setClaimsVersion((version) => version + 1);
  }

  function handleRefresh() {
    setIsRefreshing(true);
    loadOrders();
  }

  const stats = useMemo(
    () =>
      ORDER_STAT_DEFINITIONS.map((definition) => ({
        ...definition,
        count:
          definition.key === "all"
            ? orders.length
            : orders.filter((order) => order.status === definition.key).length,
      })),
    [orders],
  );

  const visibleOrders = useMemo(() => {
    const filtered =
      statusFilter === "all"
        ? orders
        : orders.filter((order) => order.status === statusFilter);

    return sortOrders(filtered, sort);
  }, [orders, statusFilter, sort]);

  const isSortActive =
    sort.field !== DEFAULT_ORDER_SORT.field ||
    sort.direction !== DEFAULT_ORDER_SORT.direction;

  const isFiltersActive = Boolean(
    dateFilters.dateFrom || dateFilters.dateTo || dateFilters.courierId,
  );

  // --- Selection and bulk actions ---

  function toggleSelectedOrder(orderId) {
    setSelectedOrderIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    );
  }

  async function handleBulkStatusChange(status) {
    try {
      const updatedOrders = await Promise.all(
        selectedOrderIds.map((orderId) =>
          updateOrderStatus(business.id, orderId, status),
        ),
      );

      setOrders((current) =>
        current.map(
          (order) =>
            updatedOrders.find((updated) => updated.id === order.id) ?? order,
        ),
      );
      setSelectedOrderIds([]);
    } catch (error) {
      Alert.alert("Could not update orders", error.message ?? "Please try again.");
    }
  }

  function buildCsv(rows) {
    const columns = [
      "Order number",
      "Customer",
      "Phone",
      "Items",
      "Subtotal",
      "Delivery fee",
      "Total",
      "Courier",
      "Status",
      "Date",
    ];
    const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

    const dataRows = rows.map((order) => [
      order.orderNumber,
      order.customerName,
      order.phoneNumber,
      order.itemCount,
      order.subtotal,
      order.deliveryFee,
      order.total,
      order.courier,
      order.status,
      `${order.date} ${order.time}`,
    ]);

    return [columns, ...dataRows]
      .map((row) => row.map(escape).join(","))
      .join("\r\n");
  }

  async function handleExportSelected() {
    const selectedOrders = visibleOrders.filter((order) =>
      selectedOrderIds.includes(order.id),
    );

    try {
      await shareCsv(buildCsv(selectedOrders), "vendly-selected-orders");
      setSelectedOrderIds([]);
    } catch (error) {
      Alert.alert("Export failed", error.message ?? "Please try again.");
    }
  }

  // The full export is the server-generated XLSX workbook, so it matches the
  // web dashboard's download rather than being a client-built approximation.
  async function handleExportAll() {
    if (visibleOrders.length === 0) {
      Alert.alert("Nothing to export", "There are no orders in the current view.");
      return;
    }

    setIsExporting(true);

    try {
      await downloadOrderExport(business.id, {
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchText || undefined,
      });
    } catch (error) {
      Alert.alert("Export failed", error.message ?? "Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleShareChatbotLink() {
    if (!business?.shortCode) {
      Alert.alert(
        "No chatbot link yet",
        "This business does not have a chatbot short code assigned.",
      );
      return;
    }

    const webAppUrl = (
      process.env.EXPO_PUBLIC_WEB_APP_URL ?? "https://vendly.lk"
    ).replace(/\/$/, "");

    await Share.share({ message: `${webAppUrl}/s/${business.shortCode}` });
  }

  // --- Handlers for the row action menu ---

  function replaceOrder(updatedOrder) {
    setOrders((current) =>
      current.map((order) =>
        order.id === updatedOrder.id ? updatedOrder : order,
      ),
    );
    return updatedOrder;
  }

  const actionMenuHandlers = {
    onStatusChange: async (orderId, status) => {
      replaceOrder(await updateOrderStatus(business.id, orderId, status));
    },
    onGenerateWaybill: async (orderId) =>
      replaceOrder(await generateOrderWaybill(business.id, orderId)),
    onFraudReport: async (orderId, note) => {
      await reportFraudOrder(business.id, orderId, "fake-details", note);
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? { ...order, fraudReport: { status: "active", reason: "fake-details" } }
            : order,
        ),
      );
    },
    onCourierIssue: async (orderId, note) => {
      await reportCourierIssue(business.id, orderId, "branch-problem", note);
    },
    onRemove: async (orderId) => {
      const removed = await removeOrder(business.id, orderId);
      setOrders((current) => current.filter((item) => item.id !== removed.id));
    },
    onWaybillEdit: async (orderId, waybillNumber) => {
      const { updateOrder } = await import("@/services/orderService");
      replaceOrder(await updateOrder(business.id, orderId, { waybillNumber }));
    },
    onWarrantyClaim: async (orderId, note) => {
      await reportCourierIssue(business.id, orderId, "warranty", note);
    },
    onRecordPayment: async (orderId, payment) => {
      replaceOrder(await recordOrderPayment(business.id, orderId, payment));
    },
  };

  // Look a scanned/typed waybill up and jump straight to that order.
  async function openOrderByWaybill(waybillNumber) {
    const trimmedWaybill = waybillNumber.trim();
    if (!trimmedWaybill) return;

    setIsLookingUpWaybill(true);

    try {
      const matches = await getOrders(business.id, { search: trimmedWaybill });
      const exactMatch =
        matches.find(
          (order) =>
            order.waybillNumber?.toUpperCase() === trimmedWaybill.toUpperCase(),
        ) ?? matches[0];

      if (!exactMatch) {
        Alert.alert(
          "No order found",
          `Nothing matched the waybill "${trimmedWaybill}".`,
        );
        return;
      }

      router.push(`/order/${exactMatch.id}`);
    } catch (error) {
      Alert.alert("Lookup failed", error.message ?? "Please try again.");
    } finally {
      setIsLookingUpWaybill(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Orders" />

      {/* ── Order type tabs ── */}
      <View style={styles.orderTabBar}>
        <TouchableOpacity
          style={[styles.orderTab, orderTab === "online" && styles.orderTabActive]}
          onPress={() => setOrderTab("online")}
        >
          <Globe size={14} color={orderTab === "online" ? colors.accent : colors.muted} />
          <Text style={[styles.orderTabText, orderTab === "online" && styles.orderTabTextActive]}>
            Online Orders
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.orderTab, orderTab === "shop" && styles.orderTabActive]}
          onPress={() => setOrderTab("shop")}
        >
          <ShoppingBag size={14} color={orderTab === "shop" ? colors.accent : colors.muted} />
          <Text style={[styles.orderTabText, orderTab === "shop" && styles.orderTabTextActive]}>
            Shop Sales
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.orderTab, orderTab === "warranty" && styles.orderTabActive]}
          onPress={() => setOrderTab("warranty")}
        >
          <ShieldCheck size={14} color={orderTab === "warranty" ? colors.accent : colors.muted} />
          <Text style={[styles.orderTabText, orderTab === "warranty" && styles.orderTabTextActive]}>
            Warranty Claims
          </Text>
        </TouchableOpacity>
      </View>

      {orderTab === "online" && (
        <>
          <View style={styles.toolbar}>
            <View style={styles.searchBox}>
              <Search size={16} color={colors.subtle} />
              <TextInput
                style={styles.searchInput}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search order #, customer, item..."
                placeholderTextColor={colors.subtle}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText("")} hitSlop={8}>
                  <X size={15} color={colors.subtle} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.iconButton, isFiltersActive && styles.iconButtonActive]}
              onPress={() => setIsFiltersOpen(true)}
            >
              <Filter
                size={18}
                color={isFiltersActive ? colors.accent : colors.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconButton, isSortActive && styles.iconButtonActive]}
              onPress={() => setIsSortOpen(true)}
            >
              <ArrowUpDown
                size={18}
                color={isSortActive ? colors.accent : colors.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push("/add-order")}
            >
              <Plus size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.statsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}
            >
              {stats.map((stat) => (
                <StatCard2
                  key={stat.key}
                  label={stat.label}
                  value={stat.count}
                  icon={stat.icon}
                  tone={stat.tone}
                  isActive={statusFilter === stat.key}
                  onPress={() => setStatusFilter(stat.key)}
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setIsScannerOpen(true)}
            >
              <ScanLine size={15} color={colors.text} />
              <Text style={styles.actionButtonText}>Scan waybill</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleShareChatbotLink}>
              <Link2 size={15} color={colors.text} />
              <Text style={styles.actionButtonText}>Chatbot link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleExportAll}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <>
                  <Download size={15} color={colors.text} />
                  <Text style={styles.actionButtonText}>Export</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {(isFiltersActive || searchText.length > 0 || statusFilter !== "all") && (
            <View style={styles.activeFiltersRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.activeFiltersScroll}
              >
                {statusFilter !== "all" && (
                  <View style={styles.filterChip}>
                    <Text style={styles.filterChipText}>
                      Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                    </Text>
                    <TouchableOpacity onPress={() => setStatusFilter("all")} hitSlop={6}>
                      <X size={12} color={colors.accent} />
                    </TouchableOpacity>
                  </View>
                )}
                {dateFilters.dateFrom ? (
                  <View style={styles.filterChip}>
                    <Text style={styles.filterChipText}>From: {dateFilters.dateFrom}</Text>
                    <TouchableOpacity
                      onPress={() => setDateFilters((prev) => ({ ...prev, dateFrom: "" }))}
                      hitSlop={6}
                    >
                      <X size={12} color={colors.accent} />
                    </TouchableOpacity>
                  </View>
                ) : null}
                {dateFilters.dateTo ? (
                  <View style={styles.filterChip}>
                    <Text style={styles.filterChipText}>To: {dateFilters.dateTo}</Text>
                    <TouchableOpacity
                      onPress={() => setDateFilters((prev) => ({ ...prev, dateTo: "" }))}
                      hitSlop={6}
                    >
                      <X size={12} color={colors.accent} />
                    </TouchableOpacity>
                  </View>
                ) : null}
                {dateFilters.courierId ? (
                  <View style={styles.filterChip}>
                    <Text style={styles.filterChipText}>
                      Courier: {couriers.find((c) => c.id === dateFilters.courierId)?.name || "Courier"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setDateFilters((prev) => ({ ...prev, courierId: "" }))}
                      hitSlop={6}
                    >
                      <X size={12} color={colors.accent} />
                    </TouchableOpacity>
                  </View>
                ) : null}
                {searchText ? (
                  <View style={styles.filterChip}>
                    <Text style={styles.filterChipText}>
                      Search: {searchText}
                    </Text>
                    <TouchableOpacity onPress={() => setSearchText("")} hitSlop={6}>
                      <X size={12} color={colors.accent} />
                    </TouchableOpacity>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.clearAllChip}
                  onPress={() => {
                    setSearchText("");
                    setStatusFilter("all");
                    setDateFilters({ dateFrom: "", dateTo: "", courierId: "" });
                  }}
                >
                  <Text style={styles.clearAllText}>Clear all</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {selectedOrderIds.length > 0 && (
            <BulkActionsBar
              selectedCount={selectedOrderIds.length}
              onClear={() => setSelectedOrderIds([])}
              onBulkStatusChange={handleBulkStatusChange}
              onExportSelected={handleExportSelected}
            />
          )}

          {ordersError && (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>Orders could not be loaded.</Text>
            </View>
          )}

          {isLoading ? (
            <ActivityIndicator
              size="large"
              color={colors.accent}
              style={{ marginTop: 32 }}
            />
          ) : (
            <FlatList
              style={styles.ordersList}
              data={visibleOrders}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No orders found</Text>
                  <Text style={styles.emptyText}>
                    {searchText || isFiltersActive || statusFilter !== "all"
                      ? "No orders match the selected filters."
                      : "Start adding customer orders to manage fulfillment."}
                  </Text>
                  {searchText || isFiltersActive || statusFilter !== "all" ? (
                    <TouchableOpacity
                      style={styles.emptyButton}
                      onPress={() => {
                        setSearchText("");
                        setStatusFilter("all");
                        setDateFilters({ dateFrom: "", dateTo: "", courierId: "" });
                      }}
                    >
                      <Text style={styles.emptyButtonText}>Reset filters</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.emptyButton}
                      onPress={() => router.push("/add-order")}
                    >
                      <Plus size={14} color="#ffffff" />
                      <Text style={styles.emptyButtonText}>Add New Order</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
              ListFooterComponent={
                visibleOrders.length > 0 ? (
                  <Text style={styles.footerText}>
                    Showing {visibleOrders.length} of {orders.length} orders
                  </Text>
                ) : null
              }
              renderItem={({ item }) => (
                <OrderRow
                  order={item}
                  isSelected={selectedOrderIds.includes(item.id)}
                  onPress={() => router.push(`/order/${item.id}`)}
                  onToggleSelected={() => toggleSelectedOrder(item.id)}
                  onOpenActions={() => setActionSheetOrder(item)}
                  onQuickStatusChange={(nextStatus) =>
                    actionMenuHandlers.onStatusChange(item.id, nextStatus)
                  }
                  onShareWaybill={() => shareWaybillPdf(item)}
                />
              )}
            />
          )}
        </>
      )}

      {orderTab === "shop" && (
        <>
          <View style={styles.tabHeader}>
            <View style={styles.tabHeaderBody}>
              <Text style={styles.tabTitle}>Shop sales</Text>
              <Text style={styles.tabSubtitle}>
                Physical sales recorded at your counter
              </Text>
            </View>
            <TouchableOpacity
              style={styles.tabAddButton}
              onPress={() => setIsAddShopSaleOpen(true)}
            >
              <Plus size={16} color="#ffffff" />
              <Text style={styles.tabAddButtonText}>New sale</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}
            >
              {shopStats.map((stat) => (
                <StatCard2
                  key={stat.key}
                  label={stat.label}
                  value={stat.value}
                  icon={stat.icon}
                  tone={stat.tone}
                />
              ))}
            </ScrollView>
          </View>

          {shopError && (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>Shop sales could not be loaded.</Text>
            </View>
          )}

          {isShopLoading ? (
            <ActivityIndicator
              size="large"
              color={colors.accent}
              style={{ marginTop: 32 }}
            />
          ) : (
            <FlatList
              style={styles.ordersList}
              data={shopSales}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <ShopSaleCard
                  sale={item}
                  onRemove={handleRemoveShopSale}
                  onWarrantyClaim={(sale) => {
                    setWarrantySource({ ...sale, sourceType: "shop-sale" });
                    setIsWarrantySourceOpen(true);
                  }}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No shop sales yet</Text>
                  <Text style={styles.emptyText}>
                    Tap “New sale” to record a physical sale made at your shop.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => setIsAddShopSaleOpen(true)}
                  >
                    <Plus size={14} color="#ffffff" />
                    <Text style={styles.emptyButtonText}>Record a sale</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </>
      )}

      {orderTab === "warranty" && (
        <>
          <View style={styles.tabHeader}>
            <View style={styles.tabHeaderBody}>
              <Text style={styles.tabTitle}>Warranty claims</Text>
              <Text style={styles.tabSubtitle}>
                From online orders and shop sales
              </Text>
            </View>
          </View>

          {warrantyError && (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>Warranty claims could not be loaded.</Text>
            </View>
          )}

          {isWarrantyLoading ? (
            <ActivityIndicator
              size="large"
              color={colors.accent}
              style={{ marginTop: 32 }}
            />
          ) : (
            <ScrollView
              style={styles.ordersList}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={false} onRefresh={loadWarrantyClaims} />
              }
            >
              <WarrantyClaimsList claims={warrantyClaims} />
            </ScrollView>
          )}
        </>
      )}

      <OrderFiltersModal
        visible={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        filters={dateFilters}
        couriers={couriers}
        onApply={setDateFilters}
      />

      <OrderSortModal
        visible={isSortOpen}
        onClose={() => setIsSortOpen(false)}
        sort={sort}
        onApply={setSort}
      />

      <OrderActionsMenu
        order={actionSheetOrder}
        businessId={business?.id}
        onClose={() => setActionSheetOrder(null)}
        onEdit={() => {
          const order = actionSheetOrder;
          setActionSheetOrder(null);
          router.push(`/order/${order.id}`);
        }}
        {...actionMenuHandlers}
      />

      <AddShopSaleModal
        visible={isAddShopSaleOpen}
        businessId={business?.id}
        onClose={() => setIsAddShopSaleOpen(false)}
        onCreated={handleShopSaleCreated}
      />

      <WarrantyClaimModal
        source={warrantySource}
        visible={isWarrantySourceOpen}
        businessId={business?.id}
        onClose={() => setIsWarrantySourceOpen(false)}
        onCreated={handleClaimCreated}
      />

      <BarcodeScannerModal
        visible={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanned={(scannedValue) => {
          setIsScannerOpen(false);

          // A null value means the seller chose to type the number instead.
          if (scannedValue === null) {
            setIsManualWaybillOpen(true);
            return;
          }

          openOrderByWaybill(scannedValue);
        }}
      />

      <PromptModal
        visible={isManualWaybillOpen}
        title="Enter waybill number"
        description="Type or paste a waybill number to open its order."
        defaultValue=""
        placeholder="Waybill number"
        confirmLabel="Find order"
        onCancel={() => setIsManualWaybillOpen(false)}
        onConfirm={(value) => {
          setIsManualWaybillOpen(false);
          openOrderByWaybill(value);
        }}
      />

      {isLookingUpWaybill && (
        <View style={styles.lookupOverlay}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.lookupText}>Finding order…</Text>
        </View>
      )}
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    statsWrapper: {
      height: 78,
    },
    statsRow: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: "center",
    },
    toolbar: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      gap: 8,
    },
    searchBox: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 40,
    },
    searchInput: {
      flex: 1,
      color: colors.textStrong,
      fontSize: 14,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconButtonActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceSoft,
    },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },
    actionsRow: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 12,
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      height: 36,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    actionButtonText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "600",
    },
    notice: {
      marginHorizontal: 16,
      borderRadius: 10,
      backgroundColor: colors.dangerBackground,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      padding: 12,
      marginBottom: 10,
    },
    noticeText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: "500",
    },
    ordersList: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    emptyText: {
      color: colors.muted,
      fontSize: 14,
      textAlign: "center",
      marginTop: 40,
    },
    footerText: {
      color: colors.subtle,
      fontSize: 12,
      textAlign: "center",
      paddingVertical: 14,
    },
    lookupOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.45)",
      gap: 12,
    },
    lookupText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "600",
    },
    activeFiltersRow: {
      paddingBottom: 8,
    },
    activeFiltersScroll: {
      paddingHorizontal: 16,
      gap: 6,
      alignItems: "center",
    },
    filterChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.surfaceSoft,
      borderColor: colors.accent,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    filterChipText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "600",
    },
    clearAllChip: {
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    clearAllText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "700",
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
      paddingHorizontal: 20,
      gap: 6,
    },
    emptyTitle: {
      color: colors.textStrong,
      fontSize: 16,
      fontWeight: "700",
    },
    emptyButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      marginTop: 10,
    },
    emptyButtonText: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "700",
    },
    orderTabBar: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    orderTab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    orderTabActive: {
      borderBottomColor: colors.accent,
    },
    orderTabText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "600",
    },
    orderTabTextActive: {
      color: colors.accent,
    },
    tabHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 6,
    },
    tabHeaderBody: {
      flex: 1,
      gap: 2,
    },
    tabTitle: {
      color: colors.textStrong,
      fontSize: 16,
      fontWeight: "700",
    },
    tabSubtitle: {
      color: colors.muted,
      fontSize: 12,
    },
    tabAddButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
    },
    tabAddButtonText: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "700",
    },
  });
}
