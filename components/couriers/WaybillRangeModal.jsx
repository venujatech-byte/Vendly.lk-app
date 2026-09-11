import { FileDigit, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../../context/ThemeContext";
import { updateCourier } from "../../services/courierService";

export default function WaybillRangeModal({
  visible,
  courier,
  businessId,
  onClose,
  onSaved,
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets.bottom);

  const [prefix, setPrefix] = useState("VWB");
  const [start, setStart] = useState("1");
  const [end, setEnd] = useState("999999");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPrefix(courier?.waybillPrefix ?? "VWB");
    setStart(String(courier?.waybillStart ?? 1));
    setEnd(String(courier?.waybillEnd ?? 999999));
    setErrorMessage("");
  }, [courier, visible]);

  async function handleSave() {
    const startNumber = Number(start);
    const endNumber = Number(end);

    if (
      !prefix.trim() ||
      !Number.isInteger(startNumber) ||
      !Number.isInteger(endNumber) ||
      startNumber < 1 ||
      endNumber < startNumber
    ) {
      setErrorMessage("Enter a prefix and a valid waybill range.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const updatedCourier = await updateCourier(businessId, courier.id, {
        waybillPrefix: prefix.trim(),
        waybillStart: startNumber,
        waybillEnd: endNumber,
      });
      onSaved?.(updatedCourier);
      onClose();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.headerBody}>
              <Text style={styles.title}>Manage waybill range</Text>
              <Text style={styles.subtitle}>
                {courier?.name ?? ""} waybills are built from the prefix plus a
                sequential number inside this range.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Waybill prefix</Text>
          <TextInput
            style={styles.input}
            value={prefix}
            onChangeText={setPrefix}
            placeholder="VWB"
            placeholderTextColor={colors.subtle}
            autoCapitalize="characters"
          />

          <View style={styles.twoCol}>
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Range start</Text>
              <TextInput
                style={styles.input}
                value={start}
                onChangeText={setStart}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Range end</Text>
              <TextInput
                style={styles.input}
                value={end}
                onChangeText={setEnd}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.preview}>
            <FileDigit size={15} color={colors.muted} />
            <Text style={styles.previewText}>
              Next waybills look like {prefix.trim() || "VWB"}
              {startNumberOrOne()} – {prefix.trim() || "VWB"}
              {endNumberOrTenThousand()}
            </Text>
          </View>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveText}>Save range</Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );

  function startNumberOrOne() {
    const parsed = Number(start);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  }

  function endNumberOrTenThousand() {
    const parsed = Number(end);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 10000;
  }
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
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 12 + bottomInset,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 14,
    },
    headerBody: {
      flex: 1,
    },
    title: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 17,
    },
    subtitle: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },
    label: {
      color: colors.textStrong,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 6,
      marginTop: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.textStrong,
      backgroundColor: colors.background,
      fontSize: 14,
    },
    twoCol: {
      flexDirection: "row",
      gap: 10,
    },
    fieldBlock: {
      flex: 1,
    },
    preview: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 14,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 10,
      padding: 11,
    },
    previewText: {
      color: colors.muted,
      fontSize: 12,
      flex: 1,
    },
    errorText: {
      color: colors.danger,
      fontSize: 12,
      marginTop: 10,
    },
    saveButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 16,
    },
    saveText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 15,
    },
  });
}