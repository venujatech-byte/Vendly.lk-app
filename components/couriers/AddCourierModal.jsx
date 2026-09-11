import { X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SRI_LANKA_DISTRICTS, districtSlug } from "../../constants/districts";
import { useAppTheme } from "../../context/ThemeContext";
import { createCourier, updateCourier } from "../../services/courierService";

const DEFAULT_FIRST_KG_PRICE = "450";

const emptyForm = {
  name: "",
  code: "",
  extraKgPrice: "100",
  averageDeliveryDays: "3",
  trackingUrlTemplate: "",
  waybillPrefix: "VWB",
  waybillStart: "1",
  waybillEnd: "999999",
};

function formFromCourier(courier) {
  if (!courier) return emptyForm;

  return {
    name: courier.name ?? "",
    code: courier.code ?? "",
    extraKgPrice: String((courier.extraKgPriceMinor ?? 0) / 100),
    averageDeliveryDays: String(courier.averageDeliveryDays ?? 3),
    trackingUrlTemplate: courier.trackingUrlTemplate ?? "",
    waybillPrefix: courier.waybillPrefix ?? "VWB",
    waybillStart: String(courier.waybillStart ?? 1),
    waybillEnd: String(courier.waybillEnd ?? 999999),
  };
}

// Every district gets a price. A courier saved before per-district pricing has
// its single first-kilogram price copied across, so one save migrates it.
function districtPricesFromCourier(courier) {
  const stored = courier?.districtFirstKgPricesMinor ?? {};
  const fallback = courier?.firstKgPriceMinor
    ? String(courier.firstKgPriceMinor / 100)
    : DEFAULT_FIRST_KG_PRICE;

  return Object.fromEntries(
    SRI_LANKA_DISTRICTS.map((district) => {
      const priceMinor = stored[districtSlug(district)];
      return [
        district,
        priceMinor === undefined ? fallback : String(priceMinor / 100),
      ];
    }),
  );
}

// The courier list shows one first-kilogram price: the one most districts
// share. The backend derives the stored value the same way.
function commonPrice(districtPrices) {
  const counts = new Map();

  Object.values(districtPrices).forEach((price) => {
    counts.set(price, (counts.get(price) ?? 0) + 1);
  });

  let common = "";
  let highest = 0;

  counts.forEach((count, price) => {
    if (count > highest) {
      highest = count;
      common = price;
    }
  });

  return { price: common, districtCount: highest };
}

export default function AddCourierModal({
  visible,
  courier = null,
  businessId,
  onClose,
  onCreated,
  onUpdated,
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets.bottom);

  const [formData, setFormData] = useState({ ...emptyForm });
  const [districtPrices, setDistrictPrices] = useState(() =>
    districtPricesFromCourier(null),
  );
  const [basePrice, setBasePrice] = useState(DEFAULT_FIRST_KG_PRICE);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setFormData(formFromCourier(courier));
    setDistrictPrices(districtPricesFromCourier(courier));
    setBasePrice(
      courier?.firstKgPriceMinor
        ? String(courier.firstKgPriceMinor / 100)
        : DEFAULT_FIRST_KG_PRICE,
    );
    setErrorMessage("");
  }, [courier, visible]);

  const summary = useMemo(() => commonPrice(districtPrices), [districtPrices]);

  function updateField(name, value) {
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function updateDistrictPrice(district, value) {
    setDistrictPrices((current) => ({ ...current, [district]: value }));
  }

  function applyBasePriceToAll() {
    setDistrictPrices(
      Object.fromEntries(
        SRI_LANKA_DISTRICTS.map((district) => [district, basePrice]),
      ),
    );
  }

  async function handleSubmit() {
    const missing = SRI_LANKA_DISTRICTS.filter(
      (district) => !(Number(districtPrices[district]) > 0),
    );

    if (missing.length) {
      setErrorMessage(
        `Enter a first-kilogram price greater than zero for: ${missing.join(", ")}.`,
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const payload = {
        name: formData.name,
        code: formData.code,
        extraKgPrice: formData.extraKgPrice,
        averageDeliveryDays: formData.averageDeliveryDays,
        trackingUrlTemplate: formData.trackingUrlTemplate,
        districtFirstKgPrices: districtPrices,
        waybillPrefix: formData.waybillPrefix,
        waybillStart: formData.waybillStart,
        waybillEnd: formData.waybillEnd,
      };
      const savedCourier = courier
        ? await updateCourier(businessId, courier.id, payload)
        : await createCourier(businessId, payload);
      if (courier) onUpdated?.(savedCourier);
      else onCreated?.(savedCourier);
      onClose();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.headerBody}>
              <Text style={styles.title}>
                {courier ? "Edit Courier" : "Add Courier"}
              </Text>
              <Text style={styles.subtitle}>
                Set the first-kilogram price for every district and one shared
                extra-kilogram price.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.twoCol}>
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Courier name</Text>
                <TextInput
                  style={[styles.input, styles.twoColInput]}
                  value={formData.name}
                  onChangeText={(value) => updateField("name", value)}
                  placeholder="e.g. KMB Fast"
                  placeholderTextColor={colors.subtle}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Courier code</Text>
                <TextInput
                  style={[styles.input, styles.twoColInput]}
                  value={formData.code}
                  onChangeText={(value) => updateField("code", value)}
                  placeholder="KMB"
                  placeholderTextColor={colors.subtle}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View style={styles.twoCol}>
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Each extra 1 kg (LKR)</Text>
                <TextInput
                  style={[styles.input, styles.twoColInput]}
                  value={formData.extraKgPrice}
                  onChangeText={(value) => updateField("extraKgPrice", value)}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Average delivery days</Text>
                <TextInput
                  style={[styles.input, styles.twoColInput]}
                  value={formData.averageDeliveryDays}
                  onChangeText={(value) =>
                    updateField("averageDeliveryDays", value)
                  }
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <Text style={styles.label}>First 1 kg price by district (LKR)</Text>
            <View style={styles.baseRow}>
              <TextInput
                style={[styles.input, styles.baseInput]}
                value={basePrice}
                onChangeText={setBasePrice}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity
                style={styles.applyButton}
                onPress={applyBasePriceToAll}
              >
                <Text style={styles.applyButtonText}>Apply to all 25</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              Apply the common price first, then change only the districts that
              cost more. The courier list shows LKR {summary.price || "0.00"} —
              the price shared by {summary.districtCount} district(s).
            </Text>

            <View style={styles.districtGrid}>
              {SRI_LANKA_DISTRICTS.map((district) => (
                <View key={district} style={styles.districtItem}>
                  <Text style={styles.districtName} numberOfLines={1}>
                    {district}
                  </Text>
                  <TextInput
                    style={styles.districtInput}
                    value={districtPrices[district] ?? ""}
                    onChangeText={(value) =>
                      updateDistrictPrice(district, value)
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              ))}
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Tracking URL template (optional)</Text>
              <TextInput
                style={styles.input}
                value={formData.trackingUrlTemplate}
                onChangeText={(value) => updateField("trackingUrlTemplate", value)}
                placeholder="https://courier.lk/track/{waybill}"
                placeholderTextColor={colors.subtle}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.twoCol}>
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Waybill prefix</Text>
                <TextInput
                  style={[styles.input, styles.twoColInput]}
                  value={formData.waybillPrefix}
                  onChangeText={(value) => updateField("waybillPrefix", value)}
                  placeholder="VWB"
                  placeholderTextColor={colors.subtle}
                  autoCapitalize="characters"
                />
              </View>
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Waybill range (start)</Text>
                <TextInput
                  style={[styles.input, styles.twoColInput]}
                  value={formData.waybillStart}
                  onChangeText={(value) => updateField("waybillStart", value)}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Waybill range end</Text>
              <TextInput
                style={styles.input}
                value={formData.waybillEnd}
                onChangeText={(value) => updateField("waybillEnd", value)}
                keyboardType="number-pad"
              />
            </View>

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}
          </ScrollView>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitText}>
                {courier ? "Save Courier" : "Add Courier"}
              </Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </KeyboardAvoidingView>
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
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 12,
      maxHeight: "92%",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
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
    body: {
      flexGrow: 0,
    },
    twoCol: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    fieldBlock: {
      marginTop: 12,
      flex: 1,
    },
    label: {
      color: colors.textStrong,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 6,
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
    twoColInput: {
      width: "100%",
    },
    baseRow: {
      flexDirection: "row",
      gap: 8,
    },
    baseInput: {
      flex: 1,
    },
    applyButton: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 16,
      justifyContent: "center",
    },
    applyButtonText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 12.5,
    },
    hint: {
      color: colors.muted,
      fontSize: 11.5,
      marginTop: 6,
      lineHeight: 16,
    },
    districtGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
    },
    districtItem: {
      width: "48%",
      flexGrow: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 9,
      backgroundColor: colors.background,
    },
    districtName: {
      color: colors.text,
      fontSize: 11.5,
      fontWeight: "600",
      marginBottom: 5,
    },
    districtInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 9,
      paddingVertical: 7,
      color: colors.textStrong,
      backgroundColor: colors.surface,
      fontSize: 13.5,
    },
    errorText: {
      color: colors.danger,
      fontSize: 12,
      marginTop: 10,
    },
    submitButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 14,
      marginBottom: 12 + bottomInset,
    },
    submitText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 15,
    },
  });
}