import { Calendar, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../../context/ThemeContext";
import CalendarPicker from "../CalendarPicker";

function formatDisplayDate(value) {
  if (!value) return "Any date";

  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return value;

  return new Date(year, month - 1, day).toLocaleDateString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function OrderFiltersModal({
  visible,
  onClose,
  filters,
  onApply,
  couriers,
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets.bottom);

  const [dateFrom, setDateFrom] = useState(filters.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(filters.dateTo ?? "");
  const [courierId, setCourierId] = useState(filters.courierId ?? "");
  const [openCalendar, setOpenCalendar] = useState(null);

  // Re-sync when reopened, so a cancelled edit does not linger.
  useEffect(() => {
    if (visible) {
      setDateFrom(filters.dateFrom ?? "");
      setDateTo(filters.dateTo ?? "");
      setCourierId(filters.courierId ?? "");
      setOpenCalendar(null);
    }
  }, [visible, filters]);

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

  function renderDateField(label, value, onChange, calendarKey) {
    const isOpen = openCalendar === calendarKey;

    return (
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={styles.label}>{label}</Text>
          {value ? (
            <TouchableOpacity onPress={() => onChange("")} hitSlop={8}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.dateButton, isOpen && styles.dateButtonActive]}
          onPress={() => setOpenCalendar(isOpen ? null : calendarKey)}
        >
          <Calendar size={16} color={value ? colors.accent : colors.subtle} />
          <Text style={[styles.dateText, !value && styles.dateTextEmpty]}>
            {formatDisplayDate(value)}
          </Text>
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.calendarWrapper}>
            <CalendarPicker
              value={value}
              onSelect={(nextValue) => {
                onChange(nextValue);
                setOpenCalendar(null);
              }}
              // Keep the range coherent: "from" cannot pass "to", and vice versa.
              minDate={calendarKey === "to" ? dateFrom : undefined}
              maxDate={calendarKey === "from" ? dateTo : undefined}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderDateField("Date from", dateFrom, setDateFrom, "from")}
            {renderDateField("Date to", dateTo, setDateTo, "to")}

            <Text style={styles.label}>Courier</Text>
            <View style={styles.courierList}>
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
            </View>
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

function createStyles(colors, bottomInset) {
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
      paddingBottom: 20 + bottomInset,
      maxHeight: "88%",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    title: {
      color: colors.textStrong,
      fontSize: 18,
      fontWeight: "700",
    },
    body: {
      flexGrow: 0,
    },
    field: {
      marginBottom: 6,
    },
    fieldHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 6,
      marginTop: 10,
    },
    clearText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 10,
    },
    dateButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 11,
      backgroundColor: colors.background,
    },
    dateButtonActive: {
      borderColor: colors.accent,
    },
    dateText: {
      color: colors.textStrong,
      fontSize: 14,
      fontWeight: "600",
    },
    dateTextEmpty: {
      color: colors.subtle,
      fontWeight: "400",
    },
    calendarWrapper: {
      marginTop: 8,
    },
    courierList: {
      marginTop: 2,
    },
    courierRow: {
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: "transparent",
    },
    courierRowActive: {
      backgroundColor: colors.surfaceSoft,
      borderColor: colors.accent,
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
