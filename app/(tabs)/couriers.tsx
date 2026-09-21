import * as DocumentPicker from "expo-document-picker";
import {
  ArrowUpDown,
  CircleCheckBig,
  Clock3,
  Plus,
  RotateCcw,
  Search,
  Truck,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AddCourierModal from "@/components/couriers/AddCourierModal";
import CourierCard from "@/components/couriers/CourierCard";
import CourierSortModal from "@/components/couriers/CourierSortModal";
import DistrictFeeComparison from "@/components/couriers/DistrictFeeComparison";
import StatCard2 from "@/components/orders/StatCard2";
import ScreenHeader from "@/components/ScreenHeader";
import WaybillRangeModal from "@/components/couriers/WaybillRangeModal";
import { useAuth } from "@/context/authContextValue";
import { useAppTheme } from "@/context/ThemeContext";
import {
  getCouriers,
  updateCourier,
  uploadCourierExportTemplate,
} from "@/services/courierService";

const DEFAULT_COURIER_SORT = { field: "courier", direction: "asc" };

const EXPORT_TEMPLATE_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const courierSortAccessors = {
  courier: (courier) => String(courier.name ?? "").toLowerCase(),
  firstKg: (courier) => courier.firstKgPriceMinor ?? 0,
  extraKg: (courier) => courier.extraKgPriceMinor ?? 0,
  success: (courier) => courier.successRate ?? 0,
  returns: (courier) => courier.returnRate ?? 0,
  delivery: (courier) => courier.averageDeliveryDays ?? 0,
  status: (courier) => courier.status,
};

export default function CouriersTab() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { business } = useAuth();

  const [couriers, setCouriers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState(DEFAULT_COURIER_SORT);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState(null);
  const [expandedCourierId, setExpandedCourierId] = useState(null);
  const [waybillCourier, setWaybillCourier] = useState(null);
  const [uploadingTemplateId, setUploadingTemplateId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "inactive"

  const loadCouriers = useCallback(
    async (refreshing = false) => {
      if (!business?.id) {
        setIsLoading(false);
        return;
      }

      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        setCouriers(await getCouriers(business.id));
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [business?.id],
  );

  useEffect(() => {
    loadCouriers();
  }, [loadCouriers]);

  const sortedCouriers = useMemo(() => {
    const direction = sort.direction === "desc" ? -1 : 1;
    const accessor = courierSortAccessors[sort.field] ?? courierSortAccessors.courier;

    return [...couriers].sort((a, b) => {
      const aValue = accessor(a);
      const bValue = accessor(b);
      if (aValue < bValue) return -1 * direction;
      if (aValue > bValue) return 1 * direction;
      return 0;
    });
  }, [couriers, sort]);

  const filteredCouriers = useMemo(() => {
    return sortedCouriers.filter((courier) => {
      if (statusFilter === "active" && courier.status !== "active") return false;
      if (statusFilter === "inactive" && courier.status === "active") return false;

      if (searchText.trim()) {
        const query = searchText.toLowerCase().trim();
        const matchesName = String(courier.name || "").toLowerCase().includes(query);
        const matchesCode = String(courier.code || "").toLowerCase().includes(query);
        if (!matchesName && !matchesCode) return false;
      }

      return true;
    });
  }, [sortedCouriers, statusFilter, searchText]);

  const isSortActive =
    sort.field !== DEFAULT_COURIER_SORT.field ||
    sort.direction !== DEFAULT_COURIER_SORT.direction;

  // Build the dashboard figures from the same courier records used by the
  // list. Completed orders are used for the most accurate success rate. A
  // newly configured courier falls back to its stored success-rate estimate.
  const courierStats = useMemo(() => {
    const activeCouriers = couriers.filter(
      (courier) => courier.status === "active",
    );
    const couriersForAverages = activeCouriers.length
      ? activeCouriers
      : couriers;
    const deliveredOrders = couriers.reduce(
      (total, courier) => total + (courier.deliveredOrderCount ?? 0),
      0,
    );
    const returnedOrders = couriers.reduce(
      (total, courier) => total + (courier.returnedOrderCount ?? 0),
      0,
    );
    const completedOrders = deliveredOrders + returnedOrders;

    const averageDeliveryDays = couriersForAverages.length
      ? couriersForAverages.reduce(
          (total, courier) => total + (courier.averageDeliveryDays ?? 0),
          0,
        ) / couriersForAverages.length
      : 0;

    const estimatedSuccessRate = couriersForAverages.length
      ? couriersForAverages.reduce(
          (total, courier) => total + (courier.successRate ?? 0),
          0,
        ) / couriersForAverages.length
      : 0;
    const deliverySuccessRate = completedOrders
      ? deliveredOrders / completedOrders
      : estimatedSuccessRate;

    return [
      {
        key: "active",
        label: "Active Couriers",
        value: String(activeCouriers.length),
        icon: Truck,
        tone: "blue",
      },
      {
        key: "delivery",
        label: "Average Delivery",
        value: `${Number(averageDeliveryDays.toFixed(1))} days`,
        icon: Clock3,
        tone: "orange",
      },
      {
        key: "success",
        label: "Delivery Success",
        value: `${Math.round(deliverySuccessRate * 100)}%`,
        icon: CircleCheckBig,
        tone: "green",
      },
      {
        key: "returns",
        label: "Returned Orders",
        value: String(returnedOrders),
        icon: RotateCcw,
        tone: "red",
      },
    ];
  }, [couriers]);

  function replaceCourier(updatedCourier) {
    setCouriers((current) =>
      current.map((courier) =>
        courier.id === updatedCourier.id ? updatedCourier : courier,
      ),
    );
  }

  async function changeCourierStatus(courier) {
    setError(null);
    try {
      const updatedCourier = await updateCourier(business.id, courier.id, {
        status: courier.status === "active" ? "inactive" : "active",
      });
      replaceCourier(updatedCourier);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function confirmStatusChange(courier) {
    const activating = courier.status !== "active";

    Alert.alert(
      activating ? "Activate courier?" : "Deactivate courier?",
      `${courier.name} will be ${
        activating
          ? "offered for new order quotes again."
          : "hidden from new order quotes."
      }`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: activating ? "Activate" : "Deactivate",
          style: activating ? "default" : "destructive",
          onPress: () => changeCourierStatus(courier),
        },
      ],
    );
  }

  async function pickExportTemplate(courier) {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: EXPORT_TEMPLATE_MIME,
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset || !business?.id) return;

      setUploadingTemplateId(courier.id);
      setError(null);

      try {
        const updatedCourier = await uploadCourierExportTemplate(
          business.id,
          courier.id,
          { uri: asset.uri, name: asset.name, mimeType: asset.mimeType },
        );
        replaceCourier(updatedCourier);
        setExpandedCourierId(courier.id);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setUploadingTemplateId("");
      }
    } catch {
      // The picker was dismissed.
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Couriers" />

      <View style={styles.tabHeader}>
        <View style={styles.tabHeaderBody}>
          <Text style={styles.tabTitle}>Couriers & Delivery</Text>
          <Text style={styles.tabSubtitle}>
            Manage courier services, weight pricing and delivery quality.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.tabAddButton}
          onPress={() => {
            setEditingCourier(null);
            setIsAddOpen(true);
          }}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.tabAddButtonText}>Add Courier</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRow}
        >
          {courierStats.map((stat) => (
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

      {/* Search & Filter Row */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchBox}>
          <Search size={15} color={colors.subtle} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search courier name, code..."
            placeholderTextColor={colors.subtle}
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText("")} hitSlop={8}>
              <X size={14} color={colors.subtle} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterChipsRow}>
          {["all", "active", "inactive"].map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.chip,
                statusFilter === f && styles.chipActive,
              ]}
              onPress={() => setStatusFilter(f)}
            >
              <Text
                style={[
                  styles.chipText,
                  statusFilter === f && styles.chipTextActive,
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.sectionTitle}>
          Couriers ({filteredCouriers.length})
        </Text>
        <TouchableOpacity
          style={[styles.sortButton, isSortActive && styles.sortButtonActive]}
          onPress={() => setIsSortOpen(true)}
        >
          <ArrowUpDown size={16} color={isSortActive ? colors.accent : colors.text} />
          <Text style={[styles.sortText, isSortActive && styles.sortTextActive]}>
            Sort
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{error}</Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          style={styles.list}
          data={filteredCouriers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => loadCouriers(true)} />
          }
          ListHeaderComponent={
            couriers.length > 0 ? (
              <DistrictFeeComparison couriers={couriers} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                {searchText || statusFilter !== "all"
                  ? "No matching couriers found"
                  : "No couriers configured yet"}
              </Text>
              <Text style={styles.emptyText}>
                {searchText || statusFilter !== "all"
                  ? "Try adjusting your search query or status filter."
                  : "Add a courier with per-district first-kilogram pricing to start quoting delivery to customers."}
              </Text>
              {searchText || statusFilter !== "all" ? (
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border }]}
                  onPress={() => {
                    setSearchText("");
                    setStatusFilter("all");
                  }}
                >
                  <Text style={[styles.emptyButtonText, { color: colors.accent }]}>Clear Filters</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => {
                    setEditingCourier(null);
                    setIsAddOpen(true);
                  }}
                >
                  <Plus size={14} color="#ffffff" />
                  <Text style={styles.emptyButtonText}>Add Courier</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <CourierCard
              courier={item}
              expanded={expandedCourierId === item.id}
              uploading={uploadingTemplateId === item.id}
              onToggleExpand={() =>
                setExpandedCourierId(
                  expandedCourierId === item.id ? null : item.id,
                )
              }
              onEdit={() => {
                setEditingCourier(item);
                setIsAddOpen(true);
              }}
              onManageWaybill={() => setWaybillCourier(item)}
              onUploadTemplate={() => pickExportTemplate(item)}
              onChangeStatus={() => confirmStatusChange(item)}
            />
          )}
          ListFooterComponent={
            <Text style={styles.footerText}>
              Showing {filteredCouriers.length} of {couriers.length} courier(s)
            </Text>
          }
        />
      )}

      <AddCourierModal
        visible={isAddOpen}
        courier={editingCourier}
        businessId={business?.id}
        onClose={() => {
          setIsAddOpen(false);
          setEditingCourier(null);
        }}
        onCreated={(courier) => setCouriers((current) => [...current, courier])}
        onUpdated={replaceCourier}
      />

      <WaybillRangeModal
        visible={Boolean(waybillCourier)}
        courier={waybillCourier}
        businessId={business?.id}
        onClose={() => setWaybillCourier(null)}
        onSaved={replaceCourier}
      />

      <CourierSortModal
        visible={isSortOpen}
        onClose={() => setIsSortOpen(false)}
        sort={sort}
        onApply={setSort}
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
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 8,
    },
    sectionTitle: {
      color: colors.textStrong,
      fontSize: 14,
      fontWeight: "700",
    },
    sortButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 9,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.surface,
    },
    sortButtonActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceSoft,
    },
    sortText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "600",
    },
    sortTextActive: {
      color: colors.accent,
      fontWeight: "700",
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
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
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
    emptyText: {
      color: colors.muted,
      fontSize: 13.5,
      textAlign: "center",
      lineHeight: 19,
    },
    emptyButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 8,
      marginTop: 10,
    },
    emptyButtonText: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "700",
    },
    footerText: {
      color: colors.subtle,
      fontSize: 12,
      textAlign: "center",
      paddingVertical: 14,
    },
    searchFilterContainer: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      gap: 8,
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 40,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      color: colors.textStrong,
      fontSize: 13,
      paddingVertical: 0,
    },
    filterChipsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    chipText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.text,
    },
    chipTextActive: {
      color: "#ffffff",
      fontWeight: "700",
    },
  });
}