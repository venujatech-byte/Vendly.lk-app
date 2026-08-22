import { Pencil, Trash2 } from "lucide-react-native";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../../context/ThemeContext";

// Mobile equivalent of the web's ActionMenu popover.
export default function OrderActionSheet({ order, onClose, onEdit, onRemove }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets.bottom);

  return (
    <Modal
      visible={Boolean(order)}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title} numberOfLines={1}>
            #{order?.orderNumber}
          </Text>

          <TouchableOpacity style={styles.action} onPress={onEdit}>
            <Pencil size={17} color={colors.text} />
            <Text style={styles.actionText}>Edit order</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.action} onPress={onRemove}>
            <Trash2 size={17} color={colors.danger} />
            <Text style={[styles.actionText, styles.dangerText]}>Remove order</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
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
      padding: 18,
      paddingBottom: 18 + bottomInset,
    },
    title: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 15,
      marginBottom: 12,
    },
    action: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
    },
    dangerText: {
      color: colors.danger,
    },
    cancelButton: {
      marginTop: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 13,
      alignItems: "center",
    },
    cancelText: {
      color: colors.text,
      fontWeight: "600",
    },
  });
}
