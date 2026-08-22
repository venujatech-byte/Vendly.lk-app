import { router, useLocalSearchParams } from "expo-router";
import { Filter, Plus, Search } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import OrderCard from "@/components/orders/OrderCard";
import OrderFiltersModal from "@/components/orders/OrderFiltersModal";
import StatCard2 from "@/components/orders/StatCard2";
import ScreenHeader from "@/components/ScreenHeader";
import { ORDER_STAT_DEFINITIONS } from "@/constants/orderStatus";
import { useAuth } from "@/context/authContextValue";
import { useAppTheme } from "@/context/ThemeContext";
import { getCouriers } from "@/services/courierService";
import { getOrders } from "@/services/orderService";

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
  const [dateFilters, setDateFilters] = useState({ dateFrom: "", dateTo: "", courierId: "" });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

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

  const stats = useMemo(() => {
    return ORDER_STAT_DEFINITIONS.map((definition) => ({
      ...definition,
      count:
        definition.key === "all"
          ? orders.length
          : orders.filter((order) => order.status === definition.key).length,
    }));
  }, [orders]);

  const visibleOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

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

        <TouchableOpacity style={styles.iconButton} onPress={() => setIsFiltersOpen(true)}>
          <Filter size={18} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/add-order")}
        >
          <Plus size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={stats}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.statsRow}
        renderItem={({ item }) => (
          <StatCard2
            label={item.label}
            value={item.count}
            icon={item.icon}
            tone={item.tone}
            isActive={statusFilter === item.key}
            onPress={() => setStatusFilter(item.key)}
          />
        )}
      />

      {ordersError && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>Orders could not be loaded.</Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={visibleOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No orders match these filters.</Text>
          }
          renderItem={({ item }) => (
            <OrderCard order={item} onPress={() => router.push(`/order/${item.id}`)} />
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
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 14,
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
    statsRow: {
      paddingHorizontal: 16,
      paddingVertical: 14,
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
  });
}
