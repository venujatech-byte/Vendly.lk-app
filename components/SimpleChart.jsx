import { StyleSheet, View } from "react-native";
import Svg, { Path, Rect, Text, Line, Circle } from "react-native-svg";

export function BarChart({ data, width = 320, height = 200, color = "#168cf5", maxValue }) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  const barWidth = width / data.length * 0.6;
  const spacing = width / data.length;
  const bottomPadding = 24;
  const leftPadding = 40;
  const topPadding = 8;
  const chartHeight = height - bottomPadding - topPadding;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* Y axis */}
        <Line
          x1={leftPadding}
          y1={topPadding}
          x2={leftPadding}
          y2={height - bottomPadding}
          stroke="#cbd5e1"
          strokeWidth={1}
        />
        {/* X axis */}
        <Line
          x1={leftPadding}
          y1={height - bottomPadding}
          x2={width - 8}
          y2={height - bottomPadding}
          stroke="#cbd5e1"
          strokeWidth={1}
        />

        {/* Y axis labels (3 lines) */}
        {[0, 0.5, 1].map((ratio) => (
          <Text
            key={ratio}
            x={leftPadding - 8}
            y={topPadding + chartHeight * (1 - ratio)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={10}
            fill="#64748b"
          >
            {Math.round(max * ratio).toLocaleString()}
          </Text>
        ))}

        {/* Bars */}
        {data.map((item, index) => {
          const barHeight = (item.value / max) * chartHeight;
          const x = leftPadding + index * spacing + (spacing - barWidth) / 2;
          const y = height - bottomPadding - barHeight;

          return (
            <View key={item.label}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx={2}
              />
              <Text
                x={x + barWidth / 2}
                y={height - bottomPadding + 16}
                textAnchor="middle"
                fontSize={9}
                fill="#64748b"
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </Svg>
    </View>
  );
}

export function LineChart({ data, width = 320, height = 200, color = "#168cf5", maxValue }) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const leftPadding = 40;
  const bottomPadding = 24;
  const topPadding = 8;
  const rightPadding = 8;
  const chartWidth = width - leftPadding - rightPadding;
  const chartHeight = height - bottomPadding - topPadding;

  const points = data.map((item, index) => {
    const x = leftPadding + (index / (data.length - 1 || 1)) * chartWidth;
    const y = topPadding + chartHeight - ((item.value - min) / range) * chartHeight;
    return { x, y };
  });

  const pathData = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* Y axis */}
        <Line
          x1={leftPadding}
          y1={topPadding}
          x2={leftPadding}
          y2={height - bottomPadding}
          stroke="#cbd5e1"
          strokeWidth={1}
        />
        {/* X axis */}
        <Line
          x1={leftPadding}
          y1={height - bottomPadding}
          x2={width - rightPadding}
          y2={height - bottomPadding}
          stroke="#cbd5e1"
          strokeWidth={1}
        />

        {/* Y axis labels */}
        {[0, 0.5, 1].map((ratio) => (
          <Text
            key={ratio}
            x={leftPadding - 8}
            y={topPadding + chartHeight * (1 - ratio)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={10}
            fill="#64748b"
          >
            {Math.round(min + range * ratio).toLocaleString()}
          </Text>
        ))}

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <Line
            key={ratio}
            x1={leftPadding}
            y1={topPadding + chartHeight * (1 - ratio)}
            x2={width - rightPadding}
            y2={topPadding + chartHeight * (1 - ratio)}
            stroke="#e2e8f0"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        ))}

        {/* Line path */}
        <Path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={color}
          />
        ))}

        {/* X axis labels */}
        {data.map((item, index) => {
          if (index % Math.ceil(data.length / 6) !== 0 && index !== data.length - 1) return null;
          return (
            <Text
              key={index}
              x={points[index].x}
              y={height - bottomPadding + 16}
              textAnchor="middle"
              fontSize={9}
              fill="#64748b"
            >
              {item.label}
            </Text>
          );
        })}
      </Svg>
    </View>
  );
}

export function DonutChart({ data, width = 200, height = 200, colors = ["#168cf5", "#0f766e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = Math.min(width, height) / 2 - 16;
  const centerX = width / 2;
  const centerY = height / 2;
  const strokeWidth = 24;

  const segments = data.map((item, index) => {
    const percentage = total > 0 ? item.value / total : 0;
    const angle = percentage * 360;
    const startAngle = data.slice(0, index).reduce((sum, d) => sum + (total > 0 ? d.value / total : 0), 0) * 360;
    const endAngle = startAngle + angle;

    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    return (
      <Path
        key={index}
        d={`M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
        fill={colors[index % colors.length]}
      />
    );
  });

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {segments}
        <Circle
          cx={centerX}
          cy={centerY}
          r={radius - strokeWidth}
          fill="#fff"
        />
        <Text
          x={centerX}
          y={centerY - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={24}
          fontWeight="bold"
          fill="#0f172a"
        >
          {total.toLocaleString()}
        </Text>
        <Text
          x={centerX}
          y={centerY + 20}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={11}
          fill="#64748b"
        >
          Total
        </Text>
      </Svg>
    </View>
  );
}

export function StatRow({ label, value, trend, trendColor, color }) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statIcon} >
        <View style={[styles.statDot, { backgroundColor: color }]} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <View style={styles.statValueRow}>
          <Text style={styles.statValue}>{value}</Text>
          {trend !== undefined && (
            <View style={styles.trend}>
              <Text style={[styles.trendText, { color: trendColor }]}>
                {trend >= 0 ? "+" : ""}{trend}%
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
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