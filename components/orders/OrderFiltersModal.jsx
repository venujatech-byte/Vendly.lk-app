import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAppTheme } from "../../context/ThemeContext";

export default function OrderFiltersModal({
  visible,
  onClose,
  filters,
  onApply,
  couriers,
}) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [dateFrom, setDateFrom] = useState(filters.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(filters.dateTo ?? "");
  const [courierId, setCourierId] = useState(filters.courierId ?? "");

  function handleApply() {
    onApply({ dateFrom, dateTo, courierId });
    onClose();
  }

  function handleReset() {
    setDateFrom("");
    setDateTo("");
    setCourierId("");
    onApply({ dateFrom: "", dateTo: "", courierId: "" });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>Filters</Text>

          <Text style={styles.label}>Date from (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={dateFrom}
            onChangeText={setDateFrom}
            placeholder="2026-01-01"
            placeholderTextColor={colors.subtle}
          />

          <Text style={styles.label}>Date to (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={dateTo}
            onChangeText={setDateTo}
            placeholder="2026-12-31"
            placeholderTextColor={colors.subtle}
          />

          <Text style={styles.label}>Courier</Text>
          <ScrollView style={styles.courierList}>
            <TouchableOpacity
              style={[styles.courierRow, courierId === "" && styles.courierRowActive]}
              onPress={() => setCourierId("")}
            >
              <Text style={styles.courierText}>Any courier</Text>
            </TouchableOpacity>

            {couriers.map((courier) => (
              <TouchableOpacity
                key={courier.id}
                style={[
                  styles.courierRow,
                  courierId === courier.id && styles.courierRowActive,
                ]}
                onPress={() => setCourierId(courier.id)}
              >
                <Text style={styles.courierText}>{courier.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 20,
      maxHeight: "80%",
    },
    title: {
      color: colors.textStrong,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 14,
    },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 6,
      marginTop: 10,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      color: colors.textStrong,
      backgroundColor: colors.background,
    },
    courierList: {
      maxHeight: 160,
      marginTop: 4,
    },
    courierRow: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginBottom: 4,
    },
    courierRowActive: {
      backgroundColor: colors.surfaceSoft,
    },
    courierText: {
      color: colors.text,
      fontSize: 14,
    },
    actionsRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 18,
    },
    resetButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    resetText: {
      color: colors.text,
      fontWeight: "600",
    },
    applyButton: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    applyText: {
      color: "#ffffff",
      fontWeight: "700",
    },
  });
}
