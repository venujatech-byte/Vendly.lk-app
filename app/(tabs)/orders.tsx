import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowUpDown,
  Download,
  Filter,
  Link2,
  Plus,
  ScanLine,
  Search,
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

import BarcodeScannerModal from "@/components/orders/BarcodeScannerModal";
import BulkActionsBar from "@/components/orders/BulkActionsBar";
import OrderActionSheet from "@/components/orders/OrderActionSheet";
import OrderFiltersModal from "@/components/orders/OrderFiltersModal";
import OrderRow from "@/components/orders/OrderRow";
import OrderSortModal from "@/components/orders/OrderSortModal";
import PromptModal from "@/components/orders/PromptModal";
import StatCard2 from "@/components/orders/StatCard2";
import ScreenHeader from "@/components/ScreenHeader";
import { DEFAULT_ORDER_SORT, sortOrders } from "@/constants/orderSort";
import { ORDER_STAT_DEFINITIONS } from "@/constants/orderStatus";
import { useAuth } from "@/context/authContextValue";
import { useAppTheme } from "@/context/ThemeContext";
import { getCouriers } from "@/services/courierService";
import { getOrders, removeOrder, updateOrderStatus } from "@/services/orderService";

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilters, setDateFilters] = useState({
    dateFrom: "",
    dateTo: "",
    courierId: "",
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sort, setSort] = useState(DEFAULT_ORDER_SORT);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isManualWaybillOpen, setIsManualWaybillOpen] = useState(false);
  const [isLookingUpWaybill, setIsLookingUpWaybill] = useState(false);

  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [actionSheetOrder, setActionSheetOrder] = useState(null);

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

    await Share.share({ message: buildCsv(selectedOrders) });
    setSelectedOrderIds([]);
  }

  async function handleExportAll() {
    if (visibleOrders.length === 0) {
      Alert.alert("Nothing to export", "There are no orders in the current view.");
      return;
    }

    await Share.share({ message: buildCsv(visibleOrders) });
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

  function handleRemoveOrder(order) {
    setActionSheetOrder(null);

    Alert.alert(
      "Remove order",
      `Cancel order #${order.orderNumber}? This releases any reserved stock.`,
      [
        { text: "Keep order", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const removed = await removeOrder(business.id, order.id);
              setOrders((current) =>
                current.filter((item) => item.id !== removed.id),
              );
            } catch (error) {
              Alert.alert(
                "Could not remove order",
                error.message ?? "Please try again.",
              );
            }
          },
        },
      ],
    );
  }

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
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setIsFiltersOpen(true)}
        >
          <Filter size={18} color={colors.text} />
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

        <TouchableOpacity style={styles.actionButton} onPress={handleExportAll}>
          <Download size={15} color={colors.text} />
          <Text style={styles.actionButtonText}>Export</Text>
        </TouchableOpacity>
      </View>

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
            <Text style={styles.emptyText}>No orders match these filters.</Text>
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
            />
          )}
        />
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

      <OrderActionSheet
        order={actionSheetOrder}
        onClose={() => setActionSheetOrder(null)}
        onEdit={() => {
          const order = actionSheetOrder;
          setActionSheetOrder(null);
          router.push(`/order/${order.id}`);
        }}
        onRemove={() => handleRemoveOrder(actionSheetOrder)}
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
  });
}
