import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/authContextValue";
import { useAppTheme } from "@/context/ThemeContext";
import ScreenHeader from "@/components/ScreenHeader";
import StatCard from "@/components/StatCard";
import { BarChart, LineChart, DonutChart, StatRow } from "@/components/SimpleChart";
import { getAnalyticsOverview, getSalesAnalytics, getOrderStatusAnalytics, getTopProductsAnalytics, getCourierPerformanceAnalytics, formatAnalyticsMoney, formatCurrency } from "@/services/analyticsService";

import {
  CircleCheck,
  Clock3,
  Package,
  Truck,
  Undo2,
  SquareCheckBig,
  Package2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  BarChart2,
} from "lucide-react-native";

export default function AnalyticsTab() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
  const { sellerProfile, business } = useAuth();
  const businessName = sellerProfile?.businessName ?? "Your Business";

  const [overview, setOverview] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [topProducts, setTopProducts] = useState(null);
  const [courierPerformance, setCourierPerformance] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("30d");

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
        const [overviewData, sales, statuses, products, couriers] = await Promise.all([
          getAnalyticsOverview(business.id),
          getSalesAnalytics(business.id, selectedPeriod),
          getOrderStatusAnalytics(business.id, selectedPeriod),
          getTopProductsAnalytics(business.id, selectedPeriod),
          getCourierPerformanceAnalytics(business.id, selectedPeriod),
        ]);

        if (requestIsCurrent) {
          setOverview(overviewData);
          setSalesData(sales);
          setStatusData(statuses);
          setTopProducts(products);
          setCourierPerformance(couriers);
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
      { label: "Packed", value: counts.packed ?? 0, icon: Package2, tone: "blue" },
      { label: "Shipped", value: counts.shipped ?? 0, icon: Truck, tone: "purple" },
      {
        label: "Delivered",
        value: counts.delivered ?? 0,
        icon: CircleCheck,
        tone: "green",
      },
      { label: "Returned", value: counts.returned ?? 0, icon: Undo2, tone: "red" },
    ];
  }, [overview]);

  const workCentreItems = overview?.workCentre
    ? [
        `${overview.workCentre.needsConfirmation} orders need confirmation`,
        `${overview.workCentre.needsPacking} orders are ready to pack`,
        `${overview.workCentre.lowStockProducts} products are low in stock`,
        `${overview.workCentre.unreadNotifications} unread notifications`,
      ]
    : [];

  const revenue = overview?.revenueMinor ?? 0;
  const ordersCount = overview?.orderCounts?.all ?? 0;
  const avgOrderValue = ordersCount > 0 ? revenue / ordersCount : 0;

  const salesChartData = salesData?.dailyRevenue?.map((d) => ({
    label: new Date(d.date).toLocaleDateString("en-LK", { month: "short", day: "numeric" }),
    value: d.revenueMinor / 100,
  })) ?? [];

  const statusChartData = statusData?.statusBreakdown?.map((s) => ({
    label: s.status,
    value: s.count,
  })) ?? [];

  const topProductsData = topProducts?.products?.map((p) => ({
    label: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name,
    value: p.quantitySold,
  })) ?? [];

  const courierData = courierPerformance?.couriers?.map((c) => ({
    label: c.name,
    value: c.deliveredCount,
  })) ?? [];

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Analytics" />

      <ScrollView contentContainerStyle={styles.screenContent}>
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Hi! {businessName}</Text>
          <Text style={styles.introSubtitle}>Your business performance at a glance</Text>
        </View>

        {analyticsError && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Analytics could not be loaded.
            </Text>
          </View>
        )}

        {isLoading && !overview && (
          <ActivityIndicator size="small" color={colors.accent} style={styles.loader} />
        )}

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
                  selectedPeriod === period.value && styles.periodButtonTextActive,
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
              value={formatAnalyticsMoney(revenue)}
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

          {/* Revenue Trend */}
          <View style={styles.metricRow}>
            <StatRow
              label="Revenue vs Last Period"
              value={salesData?.growthPercent ? `${salesData.growthPercent >= 0 ? "+" : ""}${salesData.growthPercent}%` : "—"}
              trend={salesData?.growthPercent}
              trendColor={salesData?.growthPercent >= 0 ? "#0f766e" : "#ef4444"}
              color="#168cf5"
            />
            <StatRow
              label="Conversion Rate"
              value={overview?.conversionRate ? `${overview.conversionRate.toFixed(1)}%` : "—"}
              trend={overview?.conversionRateChange}
              trendColor={overview?.conversionRateChange >= 0 ? "#0f766e" : "#ef4444"}
              color="#0f766e"
            />
          </View>
        </View>

        {/* Revenue Chart */}
        <View style={styles.section}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>Revenue Trend</Text>
          </View>
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
                <Text style={styles.emptyChartText}>No revenue data for this period</Text>
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

        {/* Work Centre */}
        {workCentreItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today&apos;s Work Centre</Text>

            <View style={styles.workGrid}>
              {workCentreItems.map((item) => (
                <View key={item} style={styles.workItem}>
                  <Text style={styles.workItemText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
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
    screenContent: {
      paddingHorizontal: 12,
      paddingTop: 14,
      paddingBottom: 24,
    },
    intro: {
      marginBottom: 12,
    },
    introTitle: {
      color: colors.textStrong,
      fontSize: 21,
      fontWeight: "700",
      marginBottom: 6,
    },
    introSubtitle: {
      color: colors.muted,
      fontSize: 14,
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
      fontSize: 21,
      fontWeight: "700",
      marginBottom: 14,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 16,
    },
    metricRow: {
      flexDirection: "row",
      gap: 10,
      flexWrap: "wrap",
    },
    periodSelector: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
    },
    periodButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
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
    },
    chartContainer: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    emptyChart: {
      width: 320,
      height: 220,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyChartText: {
      color: colors.muted,
      fontSize: 14,
    },
    chartHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    workGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    workItem: {
      flexGrow: 1,
      width: "47%",
      padding: 13,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    workItemText: {
      color: colors.text,
      fontSize: 12,
      lineHeight: 18,
    },
  });
}