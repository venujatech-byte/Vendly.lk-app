import { LinearGradient } from "expo-linear-gradient";
import { Sparkles, Target, TrendingUp } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/context/ThemeContext";

function formatLkr(amount = 0) {
  return `LKR ${Number(amount).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function SalesForecastCard({
  currentRevenue = 0,
  monthlyTarget = 500000,
}) {
  const { colors, theme } = useAppTheme();
  const isDark = theme === "dark";

  const today = new Date();
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate();
  const currentDay = today.getDate();

  const dailyAverage = currentDay > 0 ? currentRevenue / currentDay : 0;
  const projectedMonthEnd = dailyAverage * daysInMonth;
  const progressRatio = Math.min(
    Math.max(currentRevenue / (monthlyTarget || 1), 0),
    1,
  );

  return (
    <View style={styles(colors, isDark).card}>
      <View style={styles(colors, isDark).header}>
        <View style={styles(colors, isDark).titleWrap}>
          <Target size={18} color={colors.accent} />
          <Text style={styles(colors, isDark).title}>
            Sales Forecast & Target
          </Text>
        </View>
        <View style={styles(colors, isDark).badge}>
          <Sparkles size={11} color="#059669" />
          <Text style={styles(colors, isDark).badgeText}>
            Day {currentDay} of {daysInMonth}
          </Text>
        </View>
      </View>

      <View style={styles(colors, isDark).grid}>
        <View style={styles(colors, isDark).col}>
          <Text style={styles(colors, isDark).label}>CURRENT MONTH SALES</Text>
          <Text style={styles(colors, isDark).value}>
            {formatLkr(currentRevenue)}
          </Text>
        </View>

        <View style={styles(colors, isDark).col}>
          <Text style={styles(colors, isDark).label}>PROJECTED MONTH-END</Text>
          <Text style={[styles(colors, isDark).value, { color: colors.accent }]}>
            {formatLkr(projectedMonthEnd)}
          </Text>
        </View>
      </View>

      {/* Target Progress Bar */}
      <View style={styles(colors, isDark).progressSection}>
        <View style={styles(colors, isDark).progressLabels}>
          <Text style={styles(colors, isDark).progressText}>
            Target: {formatLkr(monthlyTarget)}
          </Text>
          <Text style={styles(colors, isDark).progressPercent}>
            {Math.round(progressRatio * 100)}%
          </Text>
        </View>

        <View style={styles(colors, isDark).progressBarBg}>
          <LinearGradient
            colors={["#168cf5", "#60a5fa"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles(colors, isDark).progressBarFill,
              { width: `${Math.round(progressRatio * 100)}%` },
            ]}
          />
        </View>
      </View>

      <Text style={styles(colors, isDark).footerHint}>
        📈 Daily run rate: {formatLkr(dailyAverage)}/day. Pacing on track for this month.
      </Text>
    </View>
  );
}

const styles = (colors, isDark) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 14,
      marginVertical: 4,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    titleWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    title: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textStrong,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "#ecfdf5",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#059669",
    },
    grid: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
    },
    col: {
      flex: 1,
      gap: 3,
    },
    label: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.subtle,
      letterSpacing: 0.5,
    },
    value: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textStrong,
    },
    progressSection: {
      gap: 6,
    },
    progressLabels: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    progressText: {
      fontSize: 11,
      color: colors.muted,
      fontWeight: "500",
    },
    progressPercent: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.accent,
    },
    progressBarBg: {
      height: 8,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 4,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 4,
    },
    footerHint: {
      fontSize: 11,
      color: colors.muted,
      lineHeight: 16,
    },
  });
