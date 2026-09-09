import { Check, MapPin } from "lucide-react-native";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SRI_LANKA_DISTRICTS, districtSlug } from "../../constants/districts";
import { useAppTheme } from "../../context/ThemeContext";

function formatCurrency(minorUnits = 0) {
  if (!Number.isFinite(minorUnits)) return "—";
  return `LKR ${(minorUnits / 100).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
  })}`;
}

function districtFee(courier, slug) {
  const prices = courier?.districtFirstKgPricesMinor ?? {};
  const stored = prices[slug];
  return Number.isFinite(stored) ? stored : courier?.firstKgPriceMinor;
}

export default function DistrictFeeComparison({ couriers }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [selectedDistrict, setSelectedDistrict] = useState(SRI_LANKA_DISTRICTS[0]);

  const slug = districtSlug(selectedDistrict);
  const rows = couriers
    .map((courier) => ({ courier, fee: districtFee(courier, slug) }))
    .filter((row) => Number.isFinite(row.fee) && row.fee > 0);
  const cheapest =
    rows.length > 0 ? Math.min(...rows.map((row) => row.fee)) : null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <MapPin size={15} color={colors.accent} />
          <Text style={styles.sectionTitle}>First 1 kg fee by district</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Pick a district to compare what each courier charges.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.districtChips}
      >
        {SRI_LANKA_DISTRICTS.map((district) => {
          const isActive = district === selectedDistrict;

          return (
            <TouchableOpacity
              key={district}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setSelectedDistrict(district)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {district}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.compareBox}>
        {rows.length === 0 ? (
          <Text style={styles.emptyText}>No couriers priced for this district.</Text>
        ) : (
          rows
            .sort((a, b) => a.fee - b.fee)
            .map(({ courier, fee }) => {
              const isCheapest = fee === cheapest;

              return (
                <View key={courier.id} style={styles.compareRow}>
                  <View style={styles.compareNameRow}>
                    <Text style={styles.compareName} numberOfLines={1}>
                      {courier.name}
                    </Text>
                    {isCheapest ? (
                      <View style={styles.cheapestBadge}>
                        <Check size={11} color={colors.success} />
                        <Text style={styles.cheapestText}>Cheapest</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.compareFee,
                      isCheapest && { color: colors.success, fontWeight: "700" },
                    ]}
                  >
                    {formatCurrency(fee)}
                  </Text>
                </View>
              );
            })
        )}
      </View>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    section: {
      marginBottom: 18,
    },
    sectionHeader: {
      marginBottom: 10,
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    sectionTitle: {
      color: colors.textStrong,
      fontSize: 16,
      fontWeight: "700",
    },
    sectionSubtitle: {
      color: colors.muted,
      fontSize: 12.5,
      marginTop: 3,
    },
    districtChips: {
      gap: 8,
      paddingRight: 16,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 13,
      paddingVertical: 7,
      backgroundColor: colors.surface,
    },
    chipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    chipText: {
      color: colors.text,
      fontSize: 12.5,
      fontWeight: "600",
    },
    chipTextActive: {
      color: "#ffffff",
    },
    compareBox: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    compareRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      paddingHorizontal: 13,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    compareNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexShrink: 1,
    },
    compareName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
    },
    cheapestBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    cheapestText: {
      color: colors.success,
      fontSize: 10,
      fontWeight: "700",
    },
    compareFee: {
      color: colors.textStrong,
      fontSize: 13,
    },
    emptyText: {
      color: colors.muted,
      fontSize: 13,
      padding: 14,
    },
  });
}