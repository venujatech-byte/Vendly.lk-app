import {
  CircleCheck,
  Clock3,
  Package,
  Truck,
  Undo2,
  SquareCheckBig,
  Package2,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../context/authContextValue";
import { useAppTheme } from "../context/ThemeContext";
import { getAnalyticsOverview } from "../services/analyticsService";
import ScreenHeader from "./ScreenHeader";
import StatCard from "./StatCard";

function OverviewPage() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { sellerProfile, business } = useAuth();
  const businessName = sellerProfile?.businessName ?? "Your Business";
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let requestIsCurrent = true;

    if (!business?.id) {
      setIsLoading(false);
      return undefined;
    }

    getAnalyticsOverview(business.id)
      .then((data) => {
        if (requestIsCurrent) setAnalytics(data);
      })
      .catch((error) => {
        if (requestIsCurrent) setAnalyticsError(error);
      })
      .finally(() => {
        if (requestIsCurrent) setIsLoading(false);
      });

    return () => {
      requestIsCurrent = false;
    };
  }, [business?.id]);

  const orderStats = useMemo(() => {
    const counts = analytics?.orderCounts ?? {};
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
  }, [analytics]);

  const workCentreItems = analytics?.workCentre
    ? [
        `${analytics.workCentre.needsConfirmation} orders need confirmation`,
        `${analytics.workCentre.needsPacking} orders are ready to pack`,
        `${analytics.workCentre.lowStockProducts} products are low in stock`,
        `${analytics.workCentre.unreadNotifications} unread notifications`,
      ]
    : [];

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Overview" />

      <ScrollView contentContainerStyle={styles.screenContent}>
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Hi! {businessName}</Text>
          <Text style={styles.introSubtitle}>Here is your business summary.</Text>
        </View>

        {analyticsError && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              The current business summary could not be loaded.
            </Text>
          </View>
        )}

        {isLoading && !analytics && (
          <ActivityIndicator size="small" color={colors.accent} style={styles.loader} />
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Dashboard</Text>

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
        </View>

        {workCentreItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today&apos;s work centre</Text>

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

function createStyles(colors) {
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
      color: colors.text,
      fontSize: 21,
      fontWeight: "700",
      marginBottom: 14,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
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

export default OverviewPage;
