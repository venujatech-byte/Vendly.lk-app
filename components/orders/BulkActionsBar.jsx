import { Download, X } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { STATUS_LABELS } from "../../constants/orderStatus";
import { useAppTheme } from "../../context/ThemeContext";

const BULK_STATUSES = [
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "returned",
];

export default function BulkActionsBar({
  selectedCount,
  onClear,
  onBulkStatusChange,
  onExportSelected,
}) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.bar}>
      <View style={styles.topRow}>
        <Text style={styles.countText}>
          {selectedCount} order{selectedCount === 1 ? "" : "s"} selected
        </Text>

        <TouchableOpacity style={styles.exportButton} onPress={onExportSelected}>
          <Download size={14} color={colors.accent} />
          <Text style={styles.exportText}>Export</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClear} hitSlop={8}>
          <X size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusRow}
      >
        {BULK_STATUSES.map((status) => (
          <TouchableOpacity
            key={status}
            style={styles.statusChip}
            onPress={() => onBulkStatusChange(status)}
          >
            <Text style={styles.statusChipText}>{STATUS_LABELS[status]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    bar: {
      marginHorizontal: 16,
      marginBottom: 10,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    countText: {
      flex: 1,
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 13,
    },
    exportButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    exportText: {
      color: colors.accent,
      fontWeight: "600",
      fontSize: 13,
    },
    statusRow: {
      gap: 8,
      paddingTop: 10,
    },
    statusChip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    statusChipText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "600",
    },
  });
}
