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
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../context/authContextValue";
import { getAnalyticsOverview } from "../services/analyticsService";

const TONES = {
  blue: { icon: "#1d75e8e0", background: "#e8f1ff" },
  orange: { icon: "#f59e0b", background: "#fff4df" },
  green: { icon: "#22a474", background: "#e6f8f1" },
  purple: { icon: "#8247e5", background: "#f0eaff" },
  red: { icon: "#ef4444", background: "#feecec" },
};

function StatCard({ label, value, icon: Icon, tone = "blue" }) {
  const colors = TONES[tone] ?? TONES.blue;

  return (
    <View style={styles.statCard}>
      <View style={[styles.statCardIcon, { backgroundColor: colors.background }]}>
        <Icon size={26} color={colors.icon} />
      </View>

      <View style={styles.statCardContent}>
        <Text style={styles.statCardLabel}>{label}</Text>
        <Text style={styles.statCardValue}>{value}</Text>
      </View>
    </View>
  );
}

function OverviewPage() {
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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
    >
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
        <ActivityIndicator
          size="small"
          color="#168cf5"
          style={styles.loader}
        />
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
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  screenContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  intro: {
    marginBottom: 10,
  },
  introTitle: {
    color: "#08213f",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
  },
  introSubtitle: {
    color: "#526b87",
    fontSize: 14,
  },
  notice: {
    borderRadius: 10,
    backgroundColor: "#feecec",
    borderWidth: 1,
    borderColor: "#ef4444",
    padding: 12,
    marginBottom: 14,
  },
  noticeText: {
    color: "#b91c1c",
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
    color: "#102f50",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flexGrow: 1,
    width: "47%",
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4ee",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statCardContent: {
    flexShrink: 1,
    gap: 3,
  },
  statCardLabel: {
    color: "#102f50",
    fontSize: 14,
    fontWeight: "600",
  },
  statCardValue: {
    color: "#08213f",
    fontSize: 22,
    fontWeight: "700",
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
    borderColor: "#dbe4ee",
    backgroundColor: "#ffffff",
  },
  workItemText: {
    color: "#102f50",
    fontSize: 12,
    lineHeight: 18,
  },
});

export default OverviewPage;
