import {
  ChevronDown,
  ChevronRight,
  FileDigit,
  FileSpreadsheet,
  Pencil,
  Power,
  Truck,
  Upload,
} from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { getToneColors } from "../../constants/tones";
import { useAppTheme } from "../../context/ThemeContext";

function StatusBadge({ status }) {
  const { colors, theme } = useAppTheme();
  const styles = createStyles(colors);
  const isActive = status === "active";
  const toneColors = getToneColors(isActive ? "green" : "blue", theme);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isActive ? toneColors.background : colors.surfaceSoft,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: isActive
              ? colors.success
              : colors.muted,
          },
        ]}
      >
        {isActive ? "Active" : "Inactive"}
      </Text>
    </View>
  );
}

export default function CourierCard({
  courier,
  expanded,
  uploading,
  onToggleExpand,
  onEdit,
  onManageWaybill,
  onUploadTemplate,
  onChangeStatus,
}) {
  const { colors, theme } = useAppTheme();
  const toneColors = getToneColors("blue", theme);
  const styles = createStyles(colors);

  const isActive = courier.status === "active";

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={onToggleExpand}
        activeOpacity={0.7}
      >
        <View style={[styles.iconBox, { backgroundColor: toneColors.background }]}>
          <Truck size={17} color={toneColors.icon} />
        </View>

        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={1}>
            {courier.name}
          </Text>
          <Text style={styles.code}>{courier.code || "—"}</Text>
        </View>

        <StatusBadge status={courier.status} />

        {expanded ? (
          <ChevronDown size={18} color={colors.subtle} />
        ) : (
          <ChevronRight size={18} color={colors.subtle} />
        )}
      </TouchableOpacity>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>First 1 kg</Text>
          <Text style={styles.summaryValue}>{courier.firstKg}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Extra 1 kg</Text>
          <Text style={styles.summaryValue}>{courier.extraKg}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Success</Text>
          <Text style={styles.summaryValue}>
            {Math.round((courier.successRate ?? 0) * 100)}%
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Delivery</Text>
          <Text style={styles.summaryValue}>
            {courier.averageDeliveryDays || 0}d
          </Text>
        </View>
      </View>

      {expanded ? (
        <View style={styles.details}>
          <View style={styles.detailsGrid}>
            <Detail label="First 1 kg (most districts)" value={courier.firstKg} />
            <Detail label="Extra 1 kg" value={courier.extraKg} />
            <Detail label="District exceptions" value={courier.districtExceptionText} />
            <Detail
              label="Success rate"
              value={`${Math.round((courier.successRate ?? 0) * 100)}%`}
            />
            <Detail
              label="Return rate"
              value={`${Math.round((courier.returnRate ?? 0) * 100)}%`}
            />
            <Detail
              label="Delivery time"
              value={`${courier.averageDeliveryDays ?? 0} days`}
            />
            <Detail
              label="Waybill range"
              value={`${courier.waybillPrefix}${courier.waybillStart} – ${courier.waybillPrefix}${courier.waybillEnd}`}
            />
            <Detail
              label="Delivered orders"
              value={String(courier.deliveredOrderCount ?? 0)}
            />
            <Detail
              label="Returned orders"
              value={String(courier.returnedOrderCount ?? 0)}
            />
            <Detail
              label="Order export format"
              value={courier.exportTemplateFilename ?? "Not uploaded"}
              withIcon
            />
          </View>

          <View style={styles.actions}>
            <ActionButton
              icon={<Pencil size={14} color={colors.accent} />}
              label="Edit"
              onPress={onEdit}
            />
            <ActionButton
              icon={<FileDigit size={14} color={colors.accent} />}
              label="Waybill"
              onPress={onManageWaybill}
            />
            <ActionButton
              icon={
                uploading ? (
                  <FileSpreadsheet size={14} color={colors.subtle} />
                ) : courier.exportTemplateFilename ? (
                  <Upload size={14} color={colors.accent} />
                ) : (
                  <Upload size={14} color={colors.subtle} />
                )
              }
              label={
                uploading
                  ? "Uploading..."
                  : courier.exportTemplateFilename
                    ? "Replace Excel"
                    : "Upload Excel"
              }
              muted={!uploading && !courier.exportTemplateFilename}
              onPress={onUploadTemplate}
              disabled={uploading}
            />
            <ActionButton
              icon={<Power size={14} color={isActive ? colors.danger : colors.accent} />}
              label={isActive ? "Deactivate" : "Activate"}
              danger={isActive}
              onPress={onChangeStatus}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Detail({ label, value, withIcon = false }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailValueRow}>
        {withIcon ? (
          <FileSpreadsheet size={13} color={colors.muted} />
        ) : null}
        <Text style={styles.detailValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function ActionButton({ icon, label, onPress, disabled = false, danger = false, muted = false }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      style={[styles.actionButton, danger && styles.actionButtonDanger]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {icon}
      <Text
        style={[
          styles.actionLabel,
          danger && { color: colors.danger },
          muted && { color: colors.muted },
          disabled && { color: colors.subtle },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
      overflow: "hidden",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 13,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    nameBlock: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      color: colors.textStrong,
      fontSize: 14.5,
      fontWeight: "700",
    },
    code: {
      color: colors.muted,
      fontSize: 11.5,
      marginTop: 1,
    },
    badge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    badgeText: {
      fontSize: 10.5,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    summaryRow: {
      flexDirection: "row",
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceSoft,
    },
    summaryItem: {
      flex: 1,
      alignItems: "center",
      gap: 2,
      paddingHorizontal: 4,
    },
    summaryLabel: {
      color: colors.subtle,
      fontSize: 9.5,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    summaryValue: {
      color: colors.textStrong,
      fontSize: 12.5,
      fontWeight: "700",
      textAlign: "center",
    },
    details: {
      padding: 13,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    detailsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    detailItem: {
      width: "47%",
      flexGrow: 1,
      gap: 3,
    },
    detailLabel: {
      color: colors.subtle,
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    detailValueRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    detailValue: {
      color: colors.text,
      fontSize: 12.5,
      fontWeight: "600",
      flexShrink: 1,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 9,
      paddingHorizontal: 11,
      paddingVertical: 8,
      backgroundColor: colors.background,
    },
    actionButtonDanger: {
      borderColor: colors.dangerBackground,
    },
    actionLabel: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "600",
    },
  });
}