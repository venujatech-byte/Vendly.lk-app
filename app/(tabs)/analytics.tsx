import {
  ArchiveX,
  Banknote,
  BarChart2,
  CircleCheck,
  Clock3,
  DollarSign,
  LayoutDashboard,
  Package,
  Package2,
  Receipt,
  ShoppingCart,
  SquareCheckBig,
  Target,
  TrendingDown,
  TrendingUp,
  Truck,
  Undo2,
  Users,
  Wallet,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AnalyticsLedgerModal from "@/components/analytics/AnalyticsLedgerModal";
import CodReconciliationModal from "@/components/analytics/CodReconciliationModal";
import SalesForecastCard from "@/components/analytics/SalesForecastCard";
import DeadStockModal from "@/components/inventory/DeadStockModal";
import ScreenHeader from "@/components/ScreenHeader";
import {
  BarChart,
  DonutChart,
  LineChart,
  StatRow,
} from "@/components/SimpleChart";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/context/authContextValue";
import { useAppTheme } from "@/context/ThemeContext";
import {
  formatAnalyticsMoney,
  formatCurrency,
  getAnalyticsOverview,
  getCourierPerformanceAnalytics,
  getOrderStatusAnalytics,
  getSalesAnalytics,
  getTopProductsAnalytics,
} from "@/services/analyticsService";
import { getCouriers } from "@/services/courierService";
import { getOrders } from "@/services/orderService";

export default function AnalyticsTab() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(colors, insets.top),
    [colors, insets.top],
  );
  const { sellerProfile, business } = useAuth();
  const businessName = sellerProfile?.businessName ?? "Your Business";

  const [overview, setOverview] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [topProducts, setTopProducts] = useState(null);
  const [courierPerformance, setCourierPerformance] = useState(null);
  const [orders, setOrders] = useState([]);
  const [couriers, setCouriers] = useState([]);

  const [analyticsError, setAnalyticsError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [activeView, setActiveView] = useState("overview");

  const [isCodOpen, setIsCodOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [isDeadStockOpen, setIsDeadStockOpen] = useState(false);

  const periods = [
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "90d", label: "90 days" },
    { value: "1y", label: "1 year" },
  ];

  useEffect(() => {
    let requestIsCurrent = true;

    if (!business?.id) {
      setIsLoading(false);
      return undefined;
    }

    const loadAnalytics = async () => {
      try {
        const [
          overviewData,
          sales,
          statuses,
          products,
          courierStats,
          ordersList,
          courierList,
        ] = await Promise.all([
          getAnalyticsOverview(business.id),
          getSalesAnalytics(business.id, selectedPeriod),
          getOrderStatusAnalytics(business.id, selectedPeriod),
          getTopProductsAnalytics(business.id, selectedPeriod),
          getCourierPerformanceAnalytics(business.id, selectedPeriod),
          getOrders(business.id).catch(() => []),
          getCouriers(business.id).catch(() => []),
        ]);

        if (requestIsCurrent) {
          setOverview(overviewData);
          setSalesData(sales);
          setStatusData(statuses);
          setTopProducts(products);
          setCourierPerformance(courierStats);
          setOrders(ordersList || []);
          setCouriers(courierList || []);
        }
      } catch (error) {
        if (requestIsCurrent) setAnalyticsError(error);
      } finally {
        if (requestIsCurrent) setIsLoading(false);
      }
    };

    loadAnalytics();

    return () => {
      requestIsCurrent = false;
    };
  }, [business?.id, selectedPeriod]);

  const orderStats = useMemo(() => {
    const counts = overview?.orderCounts ?? {};
    return [
      { label: "All", value: counts.all ?? 0, icon: Package, tone: "blue" },
      {
        label: "Pending",
        value: counts["needs-confirmation"] ?? 0,
        icon: Clock3,
        tone: "orange",
      },
      {
        label: "Confirmed",
        value: counts.confirmed ?? 0,
        icon: SquareCheckBig,
        tone: "green",
      },
      {
        label: "Packed",
        value: counts.packed ?? 0,
        icon: Package2,
        tone: "blue",
      },
      {
        label: "Shipped",
        value: counts.shipped ?? 0,
        icon: Truck,
        tone: "purple",
      },
      {
        label: "Delivered",
        value: counts.delivered ?? 0,
        icon: CircleCheck,
        tone: "green",
      },
      {
        label: "Returned",
        value: counts.returned ?? 0,
        icon: Undo2,
        tone: "red",
      },
    ];
  }, [overview]);

  const revenueMinor = overview?.revenueMinor ?? 0;
  const ordersCount = overview?.orderCounts?.all ?? 0;
  const avgOrderValue = ordersCount > 0 ? revenueMinor / 100 / ordersCount : 0;

  const salesChartData =
    salesData?.dailyRevenue?.map((d) => ({
      label: new Date(d.date).toLocaleDateString("en-LK", {
        month: "short",
        day: "numeric",
      }),
      value: d.revenueMinor / 100,
    })) ?? [];

  const statusChartData =
    statusData?.statusBreakdown?.map((s) => ({
      label: s.status,
      value: s.count,
    })) ?? [];

  const topProductsData =
    topProducts?.products?.map((p) => ({
      label: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name,
      value: p.quantitySold,
    })) ?? [];

  const courierData =
    courierPerformance?.couriers?.map((c) => ({
      label: c.name,
      value: c.deliveredCount,
    })) ?? [];

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Analytics" />

      {/* Analytics Sub-Views Tabs */}
      <View style={styles.viewTabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.viewTabsList}
        >
          <TouchableOpacity
            style={[
              styles.viewTabBtn,
              activeView === "overview" && styles.viewTabBtnActive,
            ]}
            onPress={() => setActiveView("overview")}
          >
            <LayoutDashboard
              size={14}
              color={activeView === "overview" ? "#ffffff" : colors.text}
            />
            <Text
              style={[
                styles.viewTabText,
                activeView === "overview" && styles.viewTabTextActive,
              ]}
            >
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewTabBtn,
              activeView === "forecast" && styles.viewTabBtnActive,
            ]}
            onPress={() => setActiveView("forecast")}
          >
            <TrendingUp
              size={14}
              color={activeView === "forecast" ? "#ffffff" : colors.text}
            />
            <Text
              style={[
                styles.viewTabText,
                activeView === "forecast" && styles.viewTabTextActive,
              ]}
            >
              Sales Forecast
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewTabBtn}
            onPress={() => setIsCodOpen(true)}
          >
            <Banknote size={14} color={colors.accent} />
            <Text style={styles.viewTabText}>COD Remittance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewTabBtn}
            onPress={() => setIsLedgerOpen(true)}
          >
            <Wallet size={14} color="#8b5cf6" />
            <Text style={styles.viewTabText}>Expense Ledger</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewTabBtn}
            onPress={() => setIsDeadStockOpen(true)}
          >
            <ArchiveX size={14} color={colors.danger} />
            <Text style={styles.viewTabText}>Dead Stock</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.screenContent}>
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Hi, {businessName}!</Text>
          <Text style={styles.introSubtitle}>
            Your business performance and live metrics
          </Text>
        </View>

        {/* Quick Tools Row */}
        <View style={styles.toolsRow}>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => setIsCodOpen(true)}
          >
            <Banknote size={16} color={colors.accent} />
            <Text style={styles.toolBtnText}>COD Courier Remittance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => setIsLedgerOpen(true)}
          >
            <Wallet size={16} color="#8b5cf6" />
            <Text style={styles.toolBtnText}>Expense Ledger</Text>
          </TouchableOpacity>
        </View>

        {analyticsError && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Analytics could not be loaded. Please refresh.
            </Text>
          </View>
        )}

        {isLoading && !overview && (
          <ActivityIndicator
            size="small"
            color={colors.accent}
            style={styles.loader}
          />
        )}

        {/* Sales Forecast & Pacing Card */}
        <SalesForecastCard
          currentRevenue={revenueMinor / 100}
          monthlyTarget={overview?.monthlyTargetMinor ? overview.monthlyTargetMinor / 100 : 500000}
        />

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.value}
              style={[
                styles.periodButton,
                selectedPeriod === period.value && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period.value)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period.value &&
                    styles.periodButtonTextActive,
                ]}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>

          <View style={styles.statsGrid}>
            <StatCard
              label="Revenue"
              value={formatAnalyticsMoney(revenueMinor)}
              icon={DollarSign}
              tone="green"
            />
            <StatCard
              label="Orders"
              value={ordersCount.toLocaleString()}
              icon={ShoppingCart}
              tone="blue"
            />
            <StatCard
              label="Avg Order Value"
              value={formatCurrency(avgOrderValue)}
              icon={TrendingUp}
              tone="purple"
            />
            <StatCard
              label="Customers"
              value={overview?.customerCount?.toLocaleString() ?? "0"}
              icon={Users}
              tone="orange"
            />
          </View>

          {/* Revenue Trend stats */}
          <View style={styles.metricRow}>
            <StatRow
              label="Revenue vs Last Period"
              value={
                salesData?.growthPercent
                  ? `${salesData.growthPercent >= 0 ? "+" : ""}${
                      salesData.growthPercent
                    }%`
                  : "—"
              }
              trend={salesData?.growthPercent}
              trendColor={
                salesData?.growthPercent >= 0 ? "#0f766e" : "#ef4444"
              }
              color="#168cf5"
            />
          </View>
        </View>

        {/* Revenue Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue Trend</Text>
          <View style={styles.chartContainer}>
            {salesChartData.length > 0 ? (
              <LineChart
                data={salesChartData}
                width={320}
                height={220}
                color={colors.accent}
                maxValue={Math.max(...salesChartData.map((d) => d.value), 1)}
              />
            ) : (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyChartText}>
                  No revenue data for this period
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Order Status Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Status Breakdown</Text>

          <View style={styles.statsGrid}>
            {orderStats.map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                tone={stat.tone}
              />
            ))}
          </View>

          <View style={styles.chartContainer}>
            {statusChartData.length > 0 ? (
              <DonutChart
                data={statusChartData}
                width={320}
                height={220}
              />
            ) : (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyChartText}>No order status data</Text>
              </View>
            )}
          </View>
        </View>

        {/* Top Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Selling Products</Text>
          <View style={styles.chartContainer}>
            {topProductsData.length > 0 ? (
              <BarChart
                data={topProductsData}
                width={320}
                height={220}
                color={colors.primary}
                maxValue={Math.max(...topProductsData.map((d) => d.value), 1)}
              />
            ) : (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyChartText}>No product sales data</Text>
              </View>
            )}
          </View>
        </View>

        {/* Courier Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Courier Performance</Text>
          <View style={styles.chartContainer}>
            {courierData.length > 0 ? (
              <BarChart
                data={courierData}
                width={320}
                height={220}
                color="#8b5cf6"
                maxValue={Math.max(...courierData.map((d) => d.value), 1)}
              />
            ) : (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyChartText}>No courier data</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <CodReconciliationModal
        visible={isCodOpen}
        onClose={() => setIsCodOpen(false)}
        orders={orders}
        couriers={couriers}
      />

      <AnalyticsLedgerModal
        visible={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
        businessId={business?.id}
      />

      <DeadStockModal
        visible={isDeadStockOpen}
        onClose={() => setIsDeadStockOpen(false)}
      />
    </View>
  );
}

function createStyles(colors, topInset) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    viewTabsWrapper: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 8,
    },
    viewTabsList: {
      paddingHorizontal: 12,
      gap: 8,
    },
    viewTabBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    viewTabBtnActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    viewTabText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
    },
    viewTabTextActive: {
      color: "#ffffff",
      fontWeight: "700",
    },
    screenContent: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 40,
    },
    intro: {
      marginBottom: 12,
    },
    introTitle: {
      color: colors.textStrong,
      fontSize: 21,
      fontWeight: "700",
      marginBottom: 4,
    },
    introSubtitle: {
      color: colors.muted,
      fontSize: 13,
    },
    toolsRow: {
      flexDirection: "row",
      gap: 10,
      marginVertical: 10,
    },
    toolBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    toolBtnText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textStrong,
    },
    notice: {
      borderRadius: 10,
      backgroundColor: colors.dangerBackground,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      padding: 12,
      marginBottom: 14,
    },
    noticeText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: "500",
    },
    loader: {
      marginVertical: 16,
    },
    section: {
      marginTop: 18,
    },
    sectionTitle: {
      color: colors.textStrong,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 12,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 14,
    },
    metricRow: {
      marginTop: 4,
    },
    periodSelector: {
      flexDirection: "row",
      gap: 8,
      marginVertical: 14,
    },
    periodButton: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: "center",
    },
    periodButtonActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    periodButtonText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "600",
    },
    periodButtonTextActive: {
      color: "#ffffff",
      fontWeight: "700",
    },
    chartContainer: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    emptyChart: {
      width: 320,
      height: 200,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyChartText: {
      color: colors.muted,
      fontSize: 13,
    },
  });
}