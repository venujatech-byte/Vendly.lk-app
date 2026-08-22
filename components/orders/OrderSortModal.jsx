import { ArrowDown, ArrowUp, Check } from "lucide-react-native";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ORDER_SORT_OPTIONS } from "../../constants/orderSort";
import { useAppTheme } from "../../context/ThemeContext";

export default function OrderSortModal({ visible, onClose, sort, onApply }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets.bottom);

  function selectField(field) {
    onApply({ ...sort, field });
  }

  function selectDirection(direction) {
    onApply({ ...sort, direction });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>Sort orders</Text>

          <Text style={styles.groupLabel}>Sort by</Text>
          {ORDER_SORT_OPTIONS.map((option) => {
            const isActive = sort.field === option.key;

            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.row, isActive && styles.rowActive]}
                onPress={() => selectField(option.key)}
              >
                <Text style={[styles.rowText, isActive && styles.rowTextActive]}>
                  {option.label}
                </Text>
                {isActive ? <Check size={17} color={colors.accent} /> : null}
              </TouchableOpacity>
            );
          })}

          <Text style={styles.groupLabel}>Direction</Text>
          <View style={styles.directionRow}>
            <TouchableOpacity
              style={[
                styles.directionButton,
                sort.direction === "asc" && styles.directionButtonActive,
              ]}
              onPress={() => selectDirection("asc")}
            >
              <ArrowUp
                size={16}
                color={sort.direction === "asc" ? "#ffffff" : colors.text}
              />
              <Text
                style={[
                  styles.directionText,
                  sort.direction === "asc" && styles.directionTextActive,
                ]}
              >
                Ascending
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.directionButton,
                sort.direction === "desc" && styles.directionButtonActive,
              ]}
              onPress={() => selectDirection("desc")}
            >
              <ArrowDown
                size={16}
                color={sort.direction === "desc" ? "#ffffff" : colors.text}
              />
              <Text
                style={[
                  styles.directionText,
                  sort.direction === "desc" && styles.directionTextActive,
                ]}
              >
                Descending
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
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
    },
    title: {
      color: colors.textStrong,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 14,
    },
    groupLabel: {
      color: colors.subtle,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginTop: 12,
      marginBottom: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 13,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    rowActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceSoft,
    },
    rowText: {
      color: colors.text,
      fontSize: 14,
    },
    rowTextActive: {
      color: colors.textStrong,
      fontWeight: "700",
    },
    directionRow: {
      flexDirection: "row",
      gap: 10,
    },
    directionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    directionButtonActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    directionText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
    },
    directionTextActive: {
      color: "#ffffff",
    },
    doneButton: {
      marginTop: 18,
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: "center",
    },
    doneText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 15,
    },
  });
}
