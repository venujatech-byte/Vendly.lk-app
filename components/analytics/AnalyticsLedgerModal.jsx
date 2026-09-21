import {
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  Plus,
  Receipt,
  RotateCcw,
  Wallet,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/context/ThemeContext";

function formatLkr(amount = 0) {
  return `LKR ${Number(amount).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const EXPENSE_CATEGORIES = [
  "Packaging & Boxes",
  "Facebook / Instagram Ads",
  "Courier Surcharge",
  "Supplier Stock Purchase",
  "Rent & Utilities",
  "Other Expense",
];

export default function AnalyticsLedgerModal({
  visible,
  onClose,
  businessId,
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [entries, setEntries] = useState([
    {
      id: "1",
      title: "Polymailer Packaging Bags",
      category: "Packaging & Boxes",
      type: "expense",
      amount: 4500,
      date: "Today",
    },
    {
      id: "2",
      title: "Instagram Boost Campaign",
      category: "Facebook / Instagram Ads",
      type: "expense",
      amount: 8000,
      date: "Yesterday",
    },
  ]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [entryTitle, setEntryTitle] = useState("");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryCategory, setEntryCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [entryType, setEntryType] = useState("expense"); // "expense" | "income"

  if (!visible) return null;

  const totalExpense = entries
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = entries
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0);

  function handleAddEntry() {
    const num = parseFloat(entryAmount);
    if (!entryTitle.trim() || !num || num <= 0) {
      Alert.alert("Invalid Entry", "Please enter a valid description and amount.");
      return;
    }

    const newEntry = {
      id: String(Date.now()),
      title: entryTitle.trim(),
      category: entryCategory,
      type: entryType,
      amount: num,
      date: "Just now",
    };

    setEntries((prev) => [newEntry, ...prev]);
    setEntryTitle("");
    setEntryAmount("");
    setIsAddOpen(false);
  }

  const styles = createStyles(colors, insets.bottom);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Wallet size={20} color={colors.accent} />
              <Text style={styles.headerTitle}>Financial Activity Ledger</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.topRow}>
              <Text style={styles.description}>
                Record business operational expenses, packaging, ads, and manual adjustments.
              </Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setIsAddOpen(true)}
              >
                <Plus size={15} color="#ffffff" />
                <Text style={styles.addBtnText}>Add Entry</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Summary Cards */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>TOTAL EXPENSES</Text>
                <Text style={[styles.summaryVal, { color: colors.danger }]}>
                  {formatLkr(totalExpense)}
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>TOTAL INCOME</Text>
                <Text style={[styles.summaryVal, { color: "#10b981" }]}>
                  {formatLkr(totalIncome)}
                </Text>
              </View>
            </View>

            {/* Add Form */}
            {isAddOpen && (
              <View style={styles.addBox}>
                <Text style={styles.boxTitle}>Record Expense / Income</Text>

                <View style={styles.typeToggle}>
                  <TouchableOpacity
                    style={[
                      styles.typeBtn,
                      entryType === "expense" && styles.typeBtnExpenseActive,
                    ]}
                    onPress={() => setEntryType("expense")}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        entryType === "expense" && styles.typeTextActive,
                      ]}
                    >
                      Expense (Money Out)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeBtn,
                      entryType === "income" && styles.typeBtnIncomeActive,
                    ]}
                    onPress={() => setEntryType("income")}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        entryType === "income" && styles.typeTextActive,
                      ]}
                    >
                      Income (Money In)
                    </Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Description (e.g., Bubble wrap 50m)"
                  placeholderTextColor={colors.subtle}
                  value={entryTitle}
                  onChangeText={setEntryTitle}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Amount in LKR (e.g., 2500)"
                  placeholderTextColor={colors.subtle}
                  value={entryAmount}
                  onChangeText={setEntryAmount}
                  keyboardType="numeric"
                />

                <View style={styles.categoriesRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.catChip,
                          entryCategory === cat && styles.catChipActive,
                        ]}
                        onPress={() => setEntryCategory(cat)}
                      >
                        <Text
                          style={[
                            styles.catChipText,
                            entryCategory === cat && styles.catChipTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={styles.cancelFormBtn}
                    onPress={() => setIsAddOpen(false)}
                  >
                    <Text style={styles.cancelFormText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveFormBtn}
                    onPress={handleAddEntry}
                  >
                    <Text style={styles.saveFormText}>Save Entry</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={styles.listHeader}>
              Ledger Transactions ({entries.length})
            </Text>

            {entries.map((entry) => {
              const isExpense = entry.type === "expense";
              return (
                <View key={entry.id} style={styles.entryRow}>
                  <View
                    style={[
                      styles.entryIcon,
                      {
                        backgroundColor: isExpense
                          ? colors.dangerBackground
                          : "#ecfdf5",
                      },
                    ]}
                  >
                    {isExpense ? (
                      <ArrowDownRight size={18} color={colors.danger} />
                    ) : (
                      <ArrowUpRight size={18} color="#10b981" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entryTitle}>{entry.title}</Text>
                    <Text style={styles.entryCategory}>
                      {entry.category} • {entry.date}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.entryAmount,
                      { color: isExpense ? colors.danger : "#10b981" },
                    ]}
                  >
                    {isExpense ? "-" : "+"}
                    {formatLkr(entry.amount)}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Done</Text>
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
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "88%",
      paddingBottom: Math.max(bottomInset, 16),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitleWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textStrong,
    },
    content: {
      padding: 18,
      gap: 14,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    description: {
      flex: 1,
      fontSize: 12,
      color: colors.muted,
      lineHeight: 16,
    },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    addBtnText: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "700",
    },
    summaryRow: {
      flexDirection: "row",
      gap: 10,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      gap: 3,
    },
    summaryLabel: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.subtle,
      letterSpacing: 0.5,
    },
    summaryVal: {
      fontSize: 16,
      fontWeight: "700",
    },
    addBox: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      gap: 10,
    },
    boxTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textStrong,
    },
    typeToggle: {
      flexDirection: "row",
      gap: 8,
    },
    typeBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    typeBtnExpenseActive: {
      backgroundColor: colors.dangerBackground,
      borderColor: colors.dangerBorder,
    },
    typeBtnIncomeActive: {
      backgroundColor: "#ecfdf5",
      borderColor: "#10b981",
    },
    typeText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.muted,
    },
    typeTextActive: {
      color: colors.textStrong,
      fontWeight: "700",
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 13,
      color: colors.textStrong,
    },
    categoriesRow: {
      flexDirection: "row",
    },
    catChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 6,
    },
    catChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceSoft,
    },
    catChipText: {
      fontSize: 11,
      color: colors.muted,
    },
    catChipTextActive: {
      color: colors.accent,
      fontWeight: "700",
    },
    formActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 4,
    },
    cancelFormBtn: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 8,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelFormText: {
      fontSize: 12,
      color: colors.text,
      fontWeight: "600",
    },
    saveFormBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      paddingVertical: 9,
      borderRadius: 8,
      alignItems: "center",
    },
    saveFormText: {
      fontSize: 12,
      color: "#ffffff",
      fontWeight: "700",
    },
    listHeader: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textStrong,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 4,
    },
    entryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    entryIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    entryTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textStrong,
    },
    entryCategory: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
    entryAmount: {
      fontSize: 14,
      fontWeight: "700",
    },
    footer: {
      paddingHorizontal: 18,
      paddingTop: 10,
    },
    closeBtn: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    closeBtnText: {
      color: colors.textStrong,
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
