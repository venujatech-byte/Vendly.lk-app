import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function BarChart({
  data = [],
  height = 180,
  color = "#168cf5",
  maxValue,
}) {
  if (!data || data.length === 0) return null;

  const max = maxValue ?? Math.max(...data.map((d) => d.value || 0), 1);

  return (
    <View style={[styles.barChartContainer, { height }]}>
      {/* Background grid lines */}
      <View style={styles.gridLinesContainer}>
        {[1, 0.5, 0].map((ratio) => (
          <View key={ratio} style={styles.gridLineRow}>
            <Text style={styles.gridLabel}>
              {Math.round(max * ratio).toLocaleString()}
            </Text>
            <View style={styles.gridLine} />
          </View>
        ))}
      </View>

      {/* Bars row */}
      <View style={styles.barsRow}>
        {data.map((item, index) => {
          const percentage = Math.min(
            Math.max(((item.value || 0) / max) * 100, 4),
            100,
          );

          return (
            <View key={`${item.label}-${index}`} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${percentage}%`,
                      backgroundColor: item.color || color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function LineChart({
  data = [],
  height = 200,
  color = "#168cf5",
  maxValue,
}) {
  if (!data || data.length === 0) return null;

  const max = maxValue ?? Math.max(...data.map((d) => d.value || 0), 1);
  const min = Math.min(...data.map((d) => d.value || 0), 0);

  return (
    <View style={[styles.lineChartContainer, { height }]}>
      {/* Grid lines */}
      <View style={styles.gridLinesContainer}>
        {[1, 0.5, 0].map((ratio) => (
          <View key={ratio} style={styles.gridLineRow}>
            <Text style={styles.gridLabel}>
              {Math.round(min + (max - min) * ratio).toLocaleString()}
            </Text>
            <View style={styles.gridLine} />
          </View>
        ))}
      </View>

      {/* Modern responsive trend columns with gradient fill */}
      <View style={styles.trendColumnsRow}>
        {data.map((item, index) => {
          const val = item.value || 0;
          const percentage = Math.min(
            Math.max(((val - min) / (max - min || 1)) * 100, 6),
            100,
          );
          const isPeak = val === max && max > 0;

          return (
            <View key={`${item.label}-${index}`} style={styles.trendColumn}>
              {isPeak && (
                <View style={styles.peakIndicator}>
                  <Text style={styles.peakText}>Peak</Text>
                </View>
              )}
              <View style={styles.trendBarTrack}>
                <LinearGradient
                  colors={
                    isPeak
                      ? ["#10b981", "rgba(16, 185, 129, 0.2)"]
                      : [color, "rgba(22, 140, 245, 0.15)"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={[
                    styles.trendBarFill,
                    {
                      height: `${percentage}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.trendLabel} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function DonutChart({
  data = [],
  colors = [
    "#168cf5",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
  ],
}) {
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <View style={styles.donutContainer}>
      {/* Total Counter Summary */}
      <View style={styles.donutCenterCard}>
        <Text style={styles.donutTotal}>{total.toLocaleString()}</Text>
        <Text style={styles.donutSubtitle}>Total Items</Text>
      </View>

      {/* Segmented multi-color progress bar */}
      <View style={styles.segmentedBar}>
        {data.map((item, index) => {
          const pct = total > 0 ? ((item.value || 0) / total) * 100 : 0;
          if (pct <= 0) return null;
          const segColor = colors[index % colors.length];

          return (
            <View
              key={`${item.label}-${index}`}
              style={{
                width: `${pct}%`,
                height: "100%",
                backgroundColor: segColor,
              }}
            />
          );
        })}
      </View>

      {/* Legend list */}
      <View style={styles.donutLegend}>
        {data.map((item, index) => {
          const pct = total > 0 ? Math.round(((item.value || 0) / total) * 100) : 0;
          const segColor = colors[index % colors.length];

          return (
            <View key={`${item.label}-${index}`} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: segColor }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.legendValue}>
                {item.value.toLocaleString()} ({pct}%)
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function StatRow({ label, value, trend, trendColor, color }) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statIcon}>
        <View style={[styles.statDot, { backgroundColor: color }]} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <View style={styles.statValueRow}>
          <Text style={styles.statValue}>{value}</Text>
          {trend !== undefined && (
            <View style={styles.trend}>
              <Text style={[styles.trendText, { color: trendColor }]}>
                {trend >= 0 ? "+" : ""}
                {trend}%
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barChartContainer: {
    width: "100%",
    position: "relative",
    paddingTop: 8,
    paddingBottom: 24,
  },
  lineChartContainer: {
    width: "100%",
    position: "relative",
    paddingTop: 16,
    paddingBottom: 24,
  },
  gridLinesContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingBottom: 24,
  },
  gridLineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gridLabel: {
    fontSize: 10,
    color: "#64748b",
    width: 34,
    textAlign: "right",
  },
  gridLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
  },
  barsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    marginLeft: 42,
    gap: 8,
  },
  barColumn: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barTrack: {
    flex: 1,
    width: "100%",
    maxWidth: 28,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  barLabel: {
    marginTop: 6,
    fontSize: 9,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
  },
  trendColumnsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    marginLeft: 42,
    gap: 6,
  },
  trendColumn: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    position: "relative",
  },
  peakIndicator: {
    position: "absolute",
    top: -14,
    backgroundColor: "#10b981",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  peakText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "800",
  },
  trendBarTrack: {
    flex: 1,
    width: "100%",
    maxWidth: 24,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  trendBarFill: {
    width: "100%",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  trendLabel: {
    marginTop: 6,
    fontSize: 9,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
  },
  donutContainer: {
    width: "100%",
    alignItems: "center",
    gap: 16,
    paddingVertical: 8,
  },
  donutCenterCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  donutTotal: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },
  donutSubtitle: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  segmentedBar: {
    width: "100%",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: "rgba(148, 163, 184, 0.2)",
  },
  donutLegend: {
    width: "100%",
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  legendValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148, 163, 184, 0.15)",
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    color: "#526b87",
    fontSize: 12,
    fontWeight: "500",
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  statValue: {
    color: "#08213f",
    fontSize: 18,
    fontWeight: "700",
  },
  trend: {
    flexDirection: "row",
    alignItems: "center",
  },
  trendText: {
    fontSize: 11,
    fontWeight: "700",
  },
});