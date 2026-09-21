import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleCheck,
  Clock3,
  Link2,
  Package,
  Package2,
  Plus,
  ShieldCheck,
  SquareCheckBig,
  TrendingUp,
  Truck,
  Undo2,
  Users,
  MessageSquare,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../context/authContextValue";
import { useAppTheme } from "../context/ThemeContext";
import { formatAnalyticsMoney, getAnalyticsOverview } from "../services/analyticsService";
import { getCustomers } from "../services/customerService";
import { getOrders } from "../services/orderService";
import { getProducts } from "../services/productService";
import ScreenHeader from "./ScreenHeader";
import StatCard from "./StatCard";
import PaymentBadge from "./orders/PaymentBadge";

export default function OverviewPage() {
  const { colors, theme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const { sellerProfile, business } = useAuth();

  const businessName = sellerProfile?.businessName ?? business?.name ?? "Your Store";

  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboardData = useCallback(async () => {
    if (!business?.id) {
      setIsLoading(false);
      return;
    }

    setAnalyticsError(null);

    try {
      const [analyticsData, ordersData, productsData, customersData] =
        await Promise.allSettled([
          getAnalyticsOverview(business.id),
          getOrders(business.id),
          getProducts(business.id),
          getCustomers(business.id),
        ]);

      if (analyticsData.status === "fulfilled") {
        setAnalytics(analyticsData.value);
      }
      if (ordersData.status === "fulfilled") {
        setOrders(ordersData.value ?? []);
      }
      if (productsData.status === "fulfilled") {
        setProducts(productsData.value ?? []);
      }
      if (customersData.status === "fulfilled") {
        setCustomerCount(customersData.value?.length ?? 0);
      }

      if (
        analyticsData.status === "rejected" &&
        ordersData.status === "rejected" &&
        productsData.status === "rejected"
      ) {
        setAnalyticsError("Could not load business summary. Please pull down to retry.");
      }
    } catch (error) {
      setAnalyticsError(error.message ?? "Failed to load summary.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [business?.id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  // --- Derived Calculations ---
  const orderCounts = useMemo(() => {
    const counts = analytics?.orderCounts ?? {};
    const hasAnalyticsCounts = Object.keys(counts).length > 0;

    if (hasAnalyticsCounts) {
      return {
        all: counts.all ?? orders.length,
        pending: counts["needs-confirmation"] ?? counts.pending ?? 0,
        confirmed: counts.confirmed ?? 0,
        packed: counts.packed ?? 0,
        shipped: counts.shipped ?? 0,
        delivered: counts.delivered ?? 0,
        returned: counts.returned ?? 0,
      };
    }

    // Compute from local orders list fallback
    return {
      all: orders.length,
      pending: orders.filter((o) => o.status === "pending" || o.fulfilmentStatus === "needs-confirmation").length,
      confirmed: orders.filter((o) => o.status === "confirmed" || o.fulfilmentStatus === "confirmed").length,
      packed: orders.filter((o) => o.status === "packed" || o.fulfilmentStatus === "packed").length,
      shipped: orders.filter((o) => o.status === "shipped" || o.fulfilmentStatus === "shipped").length,
      delivered: orders.filter((o) => o.status === "delivered" || o.fulfilmentStatus === "delivered").length,
      returned: orders.filter((o) => o.status === "returned" || o.fulfilmentStatus === "returned").length,
    };
  }, [analytics, orders]);

  const orderStats = useMemo(
    () => [
      { label: "All", value: orderCounts.all, icon: Package, tone: "blue", key: "all" },
      {
        label: "Pending",
        value: orderCounts.pending,
        icon: Clock3,
        tone: "orange",
        key: "pending",
      },
      {
        label: "Confirmed",
        value: orderCounts.confirmed,
        icon: SquareCheckBig,
        tone: "green",
        key: "confirmed",
      },
      { label: "Packed", value: orderCounts.packed, icon: Package2, tone: "blue", key: "packed" },
      { label: "Shipped", value: orderCounts.shipped, icon: Truck, tone: "purple", key: "shipped" },
      {
        label: "Delivered",
        value: orderCounts.delivered,
        icon: CircleCheck,
        tone: "green",
        key: "delivered",
      },
      { label: "Returned", value: orderCounts.returned, icon: Undo2, tone: "red", key: "returned" },
    ],
    [orderCounts],
  );

  const workCentreData = useMemo(() => {
    const wc = analytics?.workCentre;
    const lowStockFromProducts = products.filter(
      (p) => (p.stock ?? 0) <= (p.lowStockThreshold ?? 5),
    ).length;

    return {
      needsConfirmation: wc?.needsConfirmation ?? orderCounts.pending,
      needsPacking: wc?.needsPacking ?? orderCounts.confirmed,
      lowStockProducts: wc?.lowStockProducts ?? lowStockFromProducts,
      unreadNotifications: wc?.unreadNotifications ?? 0,
    };
  }, [analytics, orderCounts, products]);

  const performanceData = useMemo(() => {
    const totalRevenueMinor =
      analytics?.performance?.revenueMinor ??
      analytics?.revenueMinor ??
      orders.reduce((sum, o) => sum + (o.totalMinor || o.totalAmountMinor || 0), 0);

    const totalOrders = orderCounts.all;
    const deliveredCount = orderCounts.delivered;
    const successRate =
      totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 100;

    return {
      revenue: formatAnalyticsMoney(totalRevenueMinor),
      totalOrders,
      successRate: `${successRate}%`,
      customers: customerCount || orders.length || 0,
    };
  }, [analytics, orders, orderCounts, customerCount]);

  const recentOrdersList = useMemo(() => {
    if (analytics?.recentOrders && Array.isArray(analytics.recentOrders)) {
      return analytics.recentOrders.slice(0, 5);
    }
    return orders.slice(0, 5);
  }, [analytics, orders]);

  const topProductsList = useMemo(() => {
    if (analytics?.topProducts && Array.isArray(analytics.topProducts)) {
      return analytics.topProducts.slice(0, 4);
    }
    return products.slice(0, 4);
  }, [analytics, products]);

  const maxProductStock = useMemo(() => {
    if (!topProductsList.length) return 100;
    return Math.max(...topProductsList.map((p) => p.stock || 1), 10);
  }, [topProductsList]);

  async function handleShareChatbotLink() {
    if (!business?.shortCode) {
      Alert.alert(
        "No Chatbot Link",
        "This business does not have a chatbot short code configured yet.",
      );
      return;
    }

    const webAppUrl = (
      process.env.EXPO_PUBLIC_WEB_APP_URL ?? "https://vendly.lk"
    ).replace(/\/$/, "");

    await Share.share({
      message: `Shop our catalog directly: ${webAppUrl}/s/${business.shortCode}`,
    });
  }

  function getStatusStyle(status) {
    const s = String(status).toLowerCase();
    if (s === "pending" || s === "needs-confirmation") {
      return styles.statusPending;
    }
    if (s === "delivered") {
      return styles.statusDelivered;
    }
    if (s === "returned" || s === "cancelled") {
      return styles.statusReturned;
    }
    return styles.statusDefault;
  }

  function getStatusTextStyle(status) {
    const s = String(status).toLowerCase();
    if (s === "pending" || s === "needs-confirmation") {
      return styles.statusTextPending;
    }
    if (s === "delivered") {
      return styles.statusTextDelivered;
    }
    if (s === "returned" || s === "cancelled") {
      return styles.statusTextReturned;
    }
    return styles.statusTextDefault;
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Overview" />

      <ScrollView
        contentContainerStyle={styles.screenContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
      >
        {/* ================= HERO SECTION ================= */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={
              theme === "dark"
                ? ["#111f2f", "#0c1927"]
                : ["#ffffff", "#ebf4ff"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Ambient decorative watermark ring */}
            <View style={styles.heroWatermark} />

            <View style={styles.heroContent}>
              <View style={styles.heroHeader}>
                <Text style={styles.heroEyebrow}>BUSINESS OVERVIEW</Text>
                <Text style={styles.heroTitle} numberOfLines={1}>
                  Hi, {businessName}!
                </Text>
                <Text style={styles.heroSubtitle}>
                  Here is what is happening across your store today.
                </Text>
              </View>

              {/* Action Chips */}
              <View style={styles.heroHighlights}>
                <View style={styles.heroChip}>
                  <Package size={14} color={colors.accent} />
                  <Text style={styles.heroChipText}>
                    {orderCounts.all} Total Orders
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.heroGradientChip}
                  activeOpacity={0.8}
                  onPress={handleShareChatbotLink}
                >
                  <LinearGradient
                    colors={["#168cf5", "#0874df"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.heroGradientChipInner}
                  >
                    <Link2 size={13} color="#ffffff" />
                    <Text style={styles.heroGradientChipText}>Chatbot Link</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.heroActionChip}
                  activeOpacity={0.8}
                  onPress={() => router.push("/messages")}
                >
                  <MessageSquare size={14} color={colors.accent} />
                  <Text style={styles.heroChipText}>Messages</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.heroActionChip}
                  activeOpacity={0.8}
                  onPress={() => router.push("/add-order")}
                >
                  <Plus size={14} color={colors.accent} />
                  <Text style={styles.heroChipText}>Add Order</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        {analyticsError && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{analyticsError}</Text>
          </View>
        )}

        {isLoading && !analytics && orders.length === 0 && (
          <ActivityIndicator size="small" color={colors.accent} style={styles.loader} />
        )}

        {/* ================= ORDER DASHBOARD ================= */}
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionEyebrow}>STATUS BREAKDOWN</Text>
              <Text style={styles.sectionTitle}>Order Dashboard</Text>
            </View>
            <TouchableOpacity
              style={styles.headingLink}
              activeOpacity={0.7}
              onPress={() => router.push("/orders")}
            >
              <Text style={styles.headingLinkText}>View all</Text>
              <ArrowRight size={13} color={colors.accent} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScroll}
          >
            {orderStats.map((stat) => (
              <StatCard
                key={stat.key}
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                tone={stat.tone}
              />
            ))}
          </ScrollView>
        </View>

        {/* ================= WORK CENTRE PANEL ================= */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelEyebrow}>ACTION REQUIRED</Text>
              <Text style={styles.panelTitle}>Work Centre</Text>
            </View>
            <View style={styles.panelBadge}>
              <Text style={styles.panelBadgeText}>ACTIVE</Text>
            </View>
          </View>

          <View style={styles.workGrid}>
            {/* Needs Confirmation */}
            <TouchableOpacity
              style={[styles.workItem, styles.workItemOrange]}
              activeOpacity={0.75}
              onPress={() => router.push("/orders")}
            >
              <View style={[styles.workIcon, styles.workIconOrange]}>
                <Clock3 size={18} color="#f59e0b" />
              </View>
              <View style={styles.workCopy}>
                <Text style={styles.workCopyTitle} numberOfLines={1}>
                  Needs Confirmation
                </Text>
                <Text style={styles.workCopySubtitle} numberOfLines={1}>
                  {workCentreData.needsConfirmation} orders waiting
                </Text>
              </View>
              <Text style={styles.workCount}>{workCentreData.needsConfirmation}</Text>
              <ChevronRight size={16} color={colors.subtle} />
            </TouchableOpacity>

            {/* Ready to Pack */}
            <TouchableOpacity
              style={[styles.workItem, styles.workItemBlue]}
              activeOpacity={0.75}
              onPress={() => router.push("/orders")}
            >
              <View style={[styles.workIcon, styles.workIconBlue]}>
                <Package2 size={18} color="#168cf5" />
              </View>
              <View style={styles.workCopy}>
                <Text style={styles.workCopyTitle} numberOfLines={1}>
                  Ready to Pack
                </Text>
                <Text style={styles.workCopySubtitle} numberOfLines={1}>
                  {workCentreData.needsPacking} orders confirmed
                </Text>
              </View>
              <Text style={styles.workCount}>{workCentreData.needsPacking}</Text>
              <ChevronRight size={16} color={colors.subtle} />
            </TouchableOpacity>

            {/* Low Stock Alert */}
            <TouchableOpacity
              style={[styles.workItem, styles.workItemPurple]}
              activeOpacity={0.75}
              onPress={() => router.push("/inventory")}
            >
              <View style={[styles.workIcon, styles.workIconPurple]}>
                <AlertTriangle size={18} color="#8247e5" />
              </View>
              <View style={styles.workCopy}>
                <Text style={styles.workCopyTitle} numberOfLines={1}>
                  Low Stock Alert
                </Text>
                <Text style={styles.workCopySubtitle} numberOfLines={1}>
                  {workCentreData.lowStockProducts} items low in stock
                </Text>
              </View>
              <Text style={styles.workCount}>{workCentreData.lowStockProducts}</Text>
              <ChevronRight size={16} color={colors.subtle} />
            </TouchableOpacity>

            {/* Unread Alerts */}
            <TouchableOpacity
              style={[styles.workItem, styles.workItemRed]}
              activeOpacity={0.75}
              onPress={() => router.push("/messages")}
            >
              <View style={[styles.workIcon, styles.workIconRed]}>
                <Bell size={18} color="#ef4444" />
              </View>
              <View style={styles.workCopy}>
                <Text style={styles.workCopyTitle} numberOfLines={1}>
                  Unread Alerts
                </Text>
                <Text style={styles.workCopySubtitle} numberOfLines={1}>
                  {workCentreData.unreadNotifications} notifications
                </Text>
              </View>
              <Text style={styles.workCount}>{workCentreData.unreadNotifications}</Text>
              <ChevronRight size={16} color={colors.subtle} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= PERFORMANCE METRICS PANEL ================= */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelEyebrow}>BUSINESS HEALTH</Text>
              <Text style={styles.panelTitle}>Performance</Text>
            </View>
            <TouchableOpacity
              style={styles.panelLink}
              activeOpacity={0.7}
              onPress={() => router.push("/analytics")}
            >
              <Text style={styles.panelLinkText}>View analytics</Text>
              <ChevronRight size={14} color={colors.accent} />
            </TouchableOpacity>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={styles.metricIconWrap}>
                <TrendingUp size={18} color={colors.accent} />
              </View>
              <View style={styles.metricTextWrap}>
                <Text style={styles.metricLabel}>Total Revenue</Text>
                <Text style={styles.metricValue} numberOfLines={1}>
                  {performanceData.revenue}
                </Text>
                <Text style={styles.metricSub}>Gross sales volume</Text>
              </View>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricIconWrap}>
                <Package size={18} color={colors.accent} />
              </View>
              <View style={styles.metricTextWrap}>
                <Text style={styles.metricLabel}>Total Orders</Text>
                <Text style={styles.metricValue} numberOfLines={1}>
                  {performanceData.totalOrders}
                </Text>
                <Text style={styles.metricSub}>Processed orders</Text>
              </View>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricIconWrap}>
                <CheckCircle2 size={18} color={colors.accent} />
              </View>
              <View style={styles.metricTextWrap}>
                <Text style={styles.metricLabel}>Delivery Success</Text>
                <Text style={styles.metricValue} numberOfLines={1}>
                  {performanceData.successRate}
                </Text>
                <Text style={styles.metricSub}>Fulfilment rate</Text>
              </View>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricIconWrap}>
                <Users size={18} color={colors.accent} />
              </View>
              <View style={styles.metricTextWrap}>
                <Text style={styles.metricLabel}>Customers</Text>
                <Text style={styles.metricValue} numberOfLines={1}>
                  {performanceData.customers}
                </Text>
                <Text style={styles.metricSub}>Active customer base</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ================= RECENT ORDERS PANEL ================= */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelEyebrow}>LIVE ACTIVITY</Text>
              <Text style={styles.panelTitle}>Recent Orders</Text>
            </View>
            <TouchableOpacity
              style={styles.panelLink}
              activeOpacity={0.7}
              onPress={() => router.push("/orders")}
            >
              <Text style={styles.panelLinkText}>See all</Text>
              <ChevronRight size={14} color={colors.accent} />
            </TouchableOpacity>
          </View>

          <View style={styles.recentOrdersList}>
            {recentOrdersList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Package size={32} color={colors.subtle} />
                <Text style={styles.emptyText}>No orders placed yet.</Text>
              </View>
            ) : (
              recentOrdersList.map((order, index) => {
                const orderNumber =
                  order.orderNumber || `#ORD-${String(order.id || "").slice(-5).toUpperCase()}`;
                const customerName =
                  order.customerName || order.customerSnapshot?.name || "Customer";
                const totalText =
                  order.total ||
                  formatAnalyticsMoney(order.totalAmountMinor || order.totalMinor || 0);
                const statusLabel =
                  order.status || order.fulfilmentStatus || "pending";

                return (
                  <TouchableOpacity
                    key={order.id || index}
                    style={[
                      styles.orderRow,
                      index === recentOrdersList.length - 1 && styles.orderRowLast,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/order/${order.id}`)}
                  >
                    <View style={styles.orderIconWrap}>
                      <Package size={17} color={colors.accent} />
                    </View>

                    <View style={styles.orderInfo}>
                      <Text style={styles.orderCustomer} numberOfLines={1}>
                        {customerName}
                      </Text>
                      <Text style={styles.orderNumber} numberOfLines={1}>
                        {orderNumber} • {order.date || "Today"}
                      </Text>
                      {(order.privateNote || order.note) ? (
                        <Text style={{ color: "#d97706", fontSize: 10.5, marginTop: 2 }} numberOfLines={1}>
                          📝 {order.privateNote || order.note}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.orderMeta}>
                      <Text style={styles.orderAmount}>{totalText}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <PaymentBadge
                          paymentMethod={order.paymentMethod}
                          paymentStatus={order.paymentStatus}
                          depositAmount={order.deposit}
                          paidAmountMinor={order.paidAmountMinor}
                        />
                        <View style={[styles.statusBadge, getStatusStyle(statusLabel)]}>
                          <Text style={[styles.statusBadgeText, getStatusTextStyle(statusLabel)]}>
                            {statusLabel.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>

        {/* ================= TOP PRODUCTS & INVENTORY HEALTH ================= */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelEyebrow}>INVENTORY</Text>
              <Text style={styles.panelTitle}>Top Products</Text>
            </View>
            <TouchableOpacity
              style={styles.panelLink}
              activeOpacity={0.7}
              onPress={() => router.push("/inventory")}
            >
              <Text style={styles.panelLinkText}>Manage</Text>
              <ChevronRight size={14} color={colors.accent} />
            </TouchableOpacity>
          </View>

          <View style={styles.productsList}>
            {topProductsList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Package2 size={32} color={colors.subtle} />
                <Text style={styles.emptyText}>No products added yet.</Text>
              </View>
            ) : (
              topProductsList.map((product, index) => {
                const stock = product.stock ?? 0;
                const ratio = Math.min(Math.max(stock / maxProductStock, 0.1), 1);

                return (
                  <View key={product.id || index} style={styles.productRow}>
                    <View style={styles.productRank}>
                      <Text style={styles.productRankText}>{index + 1}</Text>
                    </View>

                    <View style={styles.productDetails}>
                      <View style={styles.productTitleRow}>
                        <Text style={styles.productName} numberOfLines={1}>
                          {product.name || product.title || `Product #${index + 1}`}
                        </Text>
                        <Text style={styles.productStockText}>
                          {stock} in stock
                        </Text>
                      </View>

                      <Text style={styles.productCategory} numberOfLines={1}>
                        {product.category || product.sku || "General"}
                      </Text>

                      {/* Stock indicator progress bar */}
                      <View style={styles.progressBarBg}>
                        <LinearGradient
                          colors={["#168cf5", "#66b6ff"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.progressBarFill, { width: `${Math.round(ratio * 100)}%` }]}
                        />
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            {/* Inventory Health Banner */}
            <TouchableOpacity
              style={styles.inventoryHealth}
              activeOpacity={0.8}
              onPress={() => router.push("/inventory")}
            >
              <ShieldCheck size={20} color="#15906a" />
              <View style={styles.inventoryHealthCopy}>
                <Text style={styles.inventoryHealthTitle}>
                  Inventory Health:{" "}
                  {workCentreData.lowStockProducts === 0 ? "Optimal" : "Attention Needed"}
                </Text>
                <Text style={styles.inventoryHealthSub}>
                  {workCentreData.lowStockProducts > 0
                    ? `${workCentreData.lowStockProducts} products need restocking soon`
                    : "All product variants are well above stock limits"}
                </Text>
              </View>
              <ChevronRight size={16} color="#15906a" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors, theme) {
  const isDark = theme === "dark";

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    screenContent: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 40,
      gap: 16,
    },

    /* Hero Card */
    heroCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDark ? "rgba(41, 151, 255, 0.2)" : "rgba(22, 140, 245, 0.18)",
      overflow: "hidden",
      shadowColor: "#0a3d6c",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    heroGradient: {
      padding: 18,
      position: "relative",
    },
    heroWatermark: {
      position: "absolute",
      right: -30,
      bottom: -40,
      width: 140,
      height: 140,
      borderRadius: 70,
      borderWidth: 20,
      borderColor: isDark ? "rgba(41, 151, 255, 0.04)" : "rgba(22, 140, 245, 0.05)",
    },
    heroContent: {
      gap: 14,
    },
    heroHeader: {
      gap: 3,
    },
    heroEyebrow: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.1,
      textTransform: "uppercase",
    },
    heroTitle: {
      color: colors.textStrong,
      fontSize: 23,
      fontWeight: "750",
      letterSpacing: -0.3,
    },
    heroSubtitle: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    heroHighlights: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 8,
      paddingTop: 4,
    },
    heroChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 36,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: isDark ? "rgba(16, 27, 40, 0.85)" : "rgba(255, 255, 255, 0.88)",
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroChipText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "600",
    },
    heroActionChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 36,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: isDark ? "rgba(16, 27, 40, 0.85)" : "rgba(255, 255, 255, 0.88)",
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroGradientChip: {
      borderRadius: 10,
      overflow: "hidden",
    },
    heroGradientChipInner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 36,
      paddingHorizontal: 13,
      paddingVertical: 7,
    },
    heroGradientChipText: {
      color: "#ffffff",
      fontSize: 11,
      fontWeight: "750",
    },

    /* Notice / Error */
    notice: {
      borderRadius: 10,
      backgroundColor: colors.dangerBackground,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      padding: 12,
    },
    noticeText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: "500",
    },
    loader: {
      marginVertical: 12,
    },

    /* Sections */
    section: {
      gap: 10,
    },
    sectionHeading: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      paddingHorizontal: 2,
    },
    sectionEyebrow: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    sectionTitle: {
      color: colors.textStrong,
      fontSize: 20,
      fontWeight: "750",
      marginTop: 2,
    },
    headingLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingBottom: 2,
    },
    headingLinkText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "700",
    },
    statsScroll: {
      gap: 8,
      paddingVertical: 4,
      paddingRight: 10,
    },

    /* Panels */
    panel: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 15,
      gap: 12,
      shadowColor: "#082f52",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    panelHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    panelEyebrow: {
      color: colors.accent,
      fontSize: 9.5,
      fontWeight: "800",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    panelTitle: {
      color: colors.textStrong,
      fontSize: 16,
      fontWeight: "750",
      marginTop: 1,
    },
    panelBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: isDark ? "rgba(34, 164, 116, 0.2)" : "#e4f8f0",
    },
    panelBadgeText: {
      color: isDark ? "#68ddb2" : "#087a57",
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    panelLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: isDark ? "rgba(41, 151, 255, 0.1)" : "rgba(22, 140, 245, 0.08)",
    },
    panelLinkText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "700",
    },

    /* Work Centre */
    workGrid: {
      gap: 9,
    },
    workItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 11,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSoft,
    },
    workItemOrange: {
      borderColor: isDark ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.25)",
    },
    workItemBlue: {
      borderColor: isDark ? "rgba(22, 140, 245, 0.3)" : "rgba(22, 140, 245, 0.25)",
    },
    workItemPurple: {
      borderColor: isDark ? "rgba(130, 71, 229, 0.3)" : "rgba(130, 71, 229, 0.25)",
    },
    workItemRed: {
      borderColor: isDark ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.25)",
    },
    workIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    workIconOrange: {
      backgroundColor: isDark ? "rgba(245, 158, 11, 0.16)" : "#fff4df",
    },
    workIconBlue: {
      backgroundColor: isDark ? "rgba(22, 140, 245, 0.16)" : "#e8f1ff",
    },
    workIconPurple: {
      backgroundColor: isDark ? "rgba(130, 71, 229, 0.16)" : "#f0eaff",
    },
    workIconRed: {
      backgroundColor: isDark ? "rgba(239, 68, 68, 0.16)" : "#feecec",
    },
    workCopy: {
      flex: 1,
      gap: 2,
    },
    workCopyTitle: {
      color: colors.textStrong,
      fontSize: 13,
      fontWeight: "700",
    },
    workCopySubtitle: {
      color: colors.muted,
      fontSize: 10.5,
    },
    workCount: {
      color: colors.textStrong,
      fontSize: 16,
      fontWeight: "800",
      marginRight: 2,
    },

    /* Performance Metrics Grid */
    metricsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 9,
    },
    metricCard: {
      flexGrow: 1,
      flexBasis: "47%",
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 11,
      borderRadius: 11,
      backgroundColor: colors.surfaceSoft,
    },
    metricIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "rgba(41, 151, 255, 0.14)" : "rgba(22, 140, 245, 0.12)",
    },
    metricTextWrap: {
      flex: 1,
      gap: 1,
    },
    metricLabel: {
      color: colors.muted,
      fontSize: 9.5,
      fontWeight: "600",
    },
    metricValue: {
      color: colors.textStrong,
      fontSize: 14.5,
      fontWeight: "800",
    },
    metricSub: {
      color: colors.subtle,
      fontSize: 8.5,
    },

    /* Recent Orders List */
    recentOrdersList: {
      gap: 0,
    },
    orderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    orderRowLast: {
      borderBottomWidth: 0,
      paddingBottom: 4,
    },
    orderIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "rgba(41, 151, 255, 0.12)" : "rgba(22, 140, 245, 0.1)",
    },
    orderInfo: {
      flex: 1,
      gap: 2,
    },
    orderCustomer: {
      color: colors.textStrong,
      fontSize: 12.5,
      fontWeight: "700",
    },
    orderNumber: {
      color: colors.muted,
      fontSize: 10,
    },
    orderMeta: {
      alignItems: "flex-end",
      gap: 4,
    },
    orderAmount: {
      color: colors.textStrong,
      fontSize: 12,
      fontWeight: "750",
    },
    statusBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      borderRadius: 999,
      borderWidth: 1,
    },
    statusBadgeText: {
      fontSize: 8.5,
      fontWeight: "800",
      letterSpacing: 0.3,
    },
    statusDefault: {
      backgroundColor: isDark ? "rgba(22, 140, 245, 0.15)" : "#edf6ff",
      borderColor: isDark ? "#315d89" : "#a9c9ee",
    },
    statusTextDefault: {
      color: isDark ? "#74b8ff" : "#1265b8",
    },
    statusPending: {
      backgroundColor: isDark ? "rgba(245, 158, 11, 0.14)" : "#fff7e7",
      borderColor: isDark ? "#745421" : "#f6c56c",
    },
    statusTextPending: {
      color: isDark ? "#ffc35c" : "#a86200",
    },
    statusDelivered: {
      backgroundColor: isDark ? "rgba(34, 164, 116, 0.14)" : "#eaf8f2",
      borderColor: isDark ? "#27634f" : "#9bd5bd",
    },
    statusTextDelivered: {
      color: isDark ? "#70ddb5" : "#087a57",
    },
    statusReturned: {
      backgroundColor: isDark ? "rgba(239, 68, 68, 0.14)" : "#feecec",
      borderColor: isDark ? "#7f1d1d" : "#fca5a5",
    },
    statusTextReturned: {
      color: isDark ? "#f87171" : "#ef4444",
    },

    /* Products List */
    productsList: {
      gap: 10,
    },
    productRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 5,
    },
    productRank: {
      width: 26,
      height: 26,
      borderRadius: 7,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "rgba(41, 151, 255, 0.14)" : "rgba(22, 140, 245, 0.11)",
    },
    productRankText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "800",
    },
    productDetails: {
      flex: 1,
      gap: 2,
    },
    productTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    productName: {
      color: colors.textStrong,
      fontSize: 12,
      fontWeight: "700",
      flex: 1,
      marginRight: 8,
    },
    productStockText: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "600",
    },
    productCategory: {
      color: colors.muted,
      fontSize: 9.5,
    },
    progressBarBg: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 999,
      marginTop: 4,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 999,
    },

    /* Inventory Health Footer */
    inventoryHealth: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      padding: 10,
      borderRadius: 11,
      backgroundColor: isDark ? "rgba(34, 164, 116, 0.14)" : "#eaf8f2",
      marginTop: 4,
    },
    inventoryHealthCopy: {
      flex: 1,
      gap: 1,
    },
    inventoryHealthTitle: {
      color: isDark ? "#68ddb2" : "#087a57",
      fontSize: 11,
      fontWeight: "750",
    },
    inventoryHealthSub: {
      color: colors.muted,
      fontSize: 9.5,
    },

    /* Empty state */
    emptyContainer: {
      paddingVertical: 24,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    emptyText: {
      color: colors.muted,
      fontSize: 12,
    },
  });
}
