import { router, useLocalSearchParams } from "expo-router";
import { Download, Filter, Link2, Plus, ScanLine, Search } from "lucide-react-native";
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

import BulkActionsBar from "@/components/orders/BulkActionsBar";
import OrderActionSheet from "@/components/orders/OrderActionSheet";
import OrderFiltersModal from "@/components/orders/OrderFiltersModal";
import OrderRow from "@/components/orders/OrderRow";
import PromptModal from "@/components/orders/PromptModal";
import StatCard2 from "@/components/orders/StatCard2";
import ScreenHeader from "@/components/ScreenHeader";
import { ORDER_STAT_DEFINITIONS } from "@/constants/orderStatus";
import { useAuth } from "@/context/authContextValue";
import { useAppTheme } from "@/context/ThemeContext";
import { getCouriers } from "@/services/courierService";
import {
  generateOrderWaybill,
  reportCourierIssue,
  reportFraudOrder,
} from "@/services/operationService";
import {
  getOrders,
  removeOrder,
  updateOrder,
  updateOrderStatus,
} from "@/services/orderService";

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
  const [isScanOpen, setIsScanOpen] = useState(false);

  const [expandedOrderId, setExpandedOrderId] = useState(null);
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

  function replaceOrder(updatedOrder) {
    setOrders((current) =>
      current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)),
    );
    return updatedOrder;
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
    if (statusFilter === "all") return orders;
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  // --- Row-level handlers passed down into the expanded details panel ---

  async function handleStatusChange(orderId, status) {
    replaceOrder(await updateOrderStatus(business.id, orderId, status));
  }

  async function handleGenerateWaybill(orderId) {
    return replaceOrder(await generateOrderWaybill(business.id, orderId));
  }

  async function handleWaybillSave(orderId, waybillNumber) {
    return replaceOrder(await updateOrder(business.id, orderId, { waybillNumber }));
  }

  async function handleFraudReport(orderId, note) {
    await reportFraudOrder(business.id, orderId, "fake-details", note);
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? { ...order, fraudReport: { status: "active", reason: "fake-details" } }
          : order,
      ),
    );
  }

  async function handleCourierIssue(orderId, note) {
    await reportCourierIssue(business.id, orderId, "branch-problem", note);
  }

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

  const detailHandlers = {
    onStatusChange: handleStatusChange,
    onGenerateWaybill: handleGenerateWaybill,
    onWaybillSave: handleWaybillSave,
    onFraudReport: handleFraudReport,
    onCourierIssue: handleCourierIssue,
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Orders" />

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
          style={styles.addButton}
          onPress={() => router.push("/add-order")}
        >
          <Plus size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setIsScanOpen(true)}
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
              isExpanded={expandedOrderId === item.id}
              isSelected={selectedOrderIds.includes(item.id)}
              onToggleExpanded={() =>
                setExpandedOrderId((current) =>
                  current === item.id ? null : item.id,
                )
              }
              onToggleSelected={() => toggleSelectedOrder(item.id)}
              onOpenActions={() => setActionSheetOrder(item)}
              detailHandlers={detailHandlers}
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

      <PromptModal
        visible={isScanOpen}
        title="Scan waybill"
        description="Enter or paste a waybill number to find its order."
        defaultValue=""
        placeholder="Waybill number"
        confirmLabel="Search"
        onCancel={() => setIsScanOpen(false)}
        onConfirm={(value) => {
          setIsScanOpen(false);
          setSearchText(value.trim());
          setStatusFilter("all");
        }}
      />
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
  });
}
