import { router, useLocalSearchParams } from "expo-router";
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  Mail,
  Clock,
  Users,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/authContextValue";
import { useAppTheme } from "@/context/ThemeContext";
import ScreenHeader from "@/components/ScreenHeader";
import { getCustomers, createCustomer, updateCustomer } from "@/services/customerService";

export default function CustomersTab() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
  const { business } = useAuth();
  const params = useLocalSearchParams();

  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState(
    typeof params.search === "string" ? params.search : "",
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    secondaryPhoneNumber: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    district: "",
    postalCode: "",
  });

  const loadCustomers = useCallback(async () => {
    if (!business?.id) {
      setIsLoading(false);
      return;
    }

    setError(null);

    try {
      const results = await getCustomers(business.id, searchText);
      setCustomers(results);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [business?.id, searchText]);

  useEffect(() => {
    const timeout = setTimeout(loadCustomers, searchText ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [loadCustomers, searchText]);

  function handleRefresh() {
    setIsRefreshing(true);
    loadCustomers();
  }

  function resetForm() {
    setFormData({
      name: "",
      phoneNumber: "",
      secondaryPhoneNumber: "",
      email: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      district: "",
      postalCode: "",
    });
  }

  function openCreateModal() {
    resetForm();
    setEditingCustomer(null);
    setIsModalOpen(true);
  }

  function openEditModal(customer) {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name ?? "",
      phoneNumber: customer.normalizedPhone ?? "",
      secondaryPhoneNumber: customer.normalizedSecondaryPhone ?? "",
      email: customer.email ?? "",
      addressLine1: customer.defaultAddress?.line1 ?? "",
      addressLine2: customer.defaultAddress?.line2 ?? "",
      city: customer.defaultAddress?.city ?? "",
      district: customer.defaultAddress?.district ?? "",
      postalCode: customer.defaultAddress?.postalCode ?? "",
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingCustomer(null);
    resetForm();
  }

  async function handleSubmit() {
    if (!business?.id) return;

    if (!formData.name.trim()) {
      Alert.alert("Missing name", "Customer name is required.");
      return;
    }

    if (!formData.phoneNumber.trim()) {
      Alert.alert("Missing phone", "Phone number is required.");
      return;
    }

    try {
      const customerData = {
        name: formData.name.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        secondaryPhoneNumber: formData.secondaryPhoneNumber.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: {
          line1: formData.addressLine1.trim(),
          line2: formData.addressLine2.trim() || undefined,
          city: formData.city.trim(),
          district: formData.district.trim(),
          postalCode: formData.postalCode.trim() || undefined,
          country: "LK",
        },
      };

      if (editingCustomer) {
        await updateCustomer(business.id, editingCustomer.id, customerData);
      } else {
        await createCustomer(business.id, customerData);
      }

      closeModal();
      loadCustomers();
    } catch (err) {
      Alert.alert("Could not save customer", err.message ?? "Please try again.");
    }
  }

  async function handleDelete(customer) {
    Alert.alert(
      "Delete customer",
      `Delete "${customer.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await updateCustomer(business.id, customer.id, { isDeleted: true });
              loadCustomers();
            } catch (err) {
              Alert.alert("Could not delete", err.message ?? "Please try again.");
            }
          },
        },
      ],
    );
  }

  function renderCustomerRow(customer) {
    const orderCount = customer.orderCount ?? 0;
    const totalSpent = customer.totalSpentMinor ? `LKR ${(customer.totalSpentMinor / 100).toLocaleString("en-LK", { minimumFractionDigits: 2 })}` : "—";

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => openEditModal(customer)}
        key={customer.id}
      >
        <View style={styles.rowLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {customer.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowName} numberOfLines={1}>
              {customer.name}
            </Text>
            <Text style={styles.rowPhone} numberOfLines={1}>
              {customer.normalizedPhone}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Orders</Text>
                <Text style={styles.metaValue}>{orderCount}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Spent</Text>
                <Text style={styles.metaValue}>{totalSpent}</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.rowRight}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              openEditModal(customer);
            }}
          >
            <Edit2 size={18} color={colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDelete(customer);
            }}
          >
            <Trash2 size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Customers" />

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={16} color={colors.subtle} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search customers..."
            placeholderTextColor={colors.subtle}
          />
        </View>

        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Plus size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>Customers could not be loaded.</Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={colors.accent}
          style={{ marginTop: 32 }}
        />
      ) : customers.length === 0 ? (
        <View style={styles.emptyState}>
          <Users size={48} color={colors.subtle} />
          <Text style={styles.emptyText}>No customers found</Text>
          <Text style={styles.emptySubtext}>
            {searchText
              ? "Try a different search term"
              : "Tap + to add your first customer"}
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={customers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
          renderItem={({ item }) => renderCustomerRow(item)}
          ListFooterComponent={
            <Text style={styles.footerText}>
              Showing {customers.length} customer(s)
            </Text>
          }
        />
      )}

      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCustomer ? "Edit customer" : "Add customer"}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <MoreVertical size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.sectionTitle}>Contact Information</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(value) => setFormData({ ...formData, name: value })}
                  placeholder="Customer name"
                  placeholderTextColor={colors.subtle}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phoneNumber}
                  onChangeText={(value) => setFormData({ ...formData, phoneNumber: value })}
                  placeholder="Primary phone"
                  placeholderTextColor={colors.subtle}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Secondary Phone</Text>
                <TextInput
                  style={styles.input}
                  value={formData.secondaryPhoneNumber}
                  onChangeText={(value) =>
                    setFormData({ ...formData, secondaryPhoneNumber: value })
                  }
                  placeholder="Secondary phone"
                  placeholderTextColor={colors.subtle}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(value) => setFormData({ ...formData, email: value })}
                  placeholder="customer@example.com"
                  placeholderTextColor={colors.subtle}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.sectionTitle}>Default Delivery Address</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Address Line 1 *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.addressLine1}
                  onChangeText={(value) =>
                    setFormData({ ...formData, addressLine1: value })
                  }
                  placeholder="Street address"
                  placeholderTextColor={colors.subtle}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Address Line 2</Text>
                <TextInput
                  style={styles.input}
                  value={formData.addressLine2}
                  onChangeText={(value) =>
                    setFormData({ ...formData, addressLine2: value })
                  }
                  placeholder="Apartment, suite, etc."
                  placeholderTextColor={colors.subtle}
                />
              </View>

              <View style={styles.addressRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>City *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.city}
                    onChangeText={(value) =>
                      setFormData({ ...formData, city: value })
                    }
                    placeholder="City"
                    placeholderTextColor={colors.subtle}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>District *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.district}
                    onChangeText={(value) =>
                      setFormData({ ...formData, district: value })
                    }
                    placeholder="District"
                    placeholderTextColor={colors.subtle}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Postal Code</Text>
                <TextInput
                  style={styles.input}
                  value={formData.postalCode}
                  onChangeText={(value) =>
                    setFormData({ ...formData, postalCode: value })
                  }
                  placeholder="Postal code"
                  placeholderTextColor={colors.subtle}
                  keyboardType="numeric"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSubmit}
              >
                <Text style={styles.saveButtonText}>
                  {editingCustomer ? "Save changes" : "Create customer"}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(colors, topInset) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    toolbar: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      gap: 8,
    },
    searchBox: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 40,
    },
    searchInput: {
      flex: 1,
      color: colors.textStrong,
      fontSize: 14,
    },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },
    notice: {
      marginHorizontal: 16,
      borderRadius: 10,
      backgroundColor: colors.dangerBackground,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      padding: 12,
      marginBottom: 10,
    },
    noticeText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: "500",
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      gap: 12,
    },
    emptyText: {
      color: colors.textStrong,
      fontSize: 16,
      fontWeight: "600",
    },
    emptySubtext: {
      color: colors.muted,
      fontSize: 13,
      textAlign: "center",
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    footerText: {
      color: colors.subtle,
      fontSize: 12,
      textAlign: "center",
      paddingVertical: 14,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
      minWidth: 0,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "700",
    },
    rowInfo: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    rowName: {
      color: colors.textStrong,
      fontSize: 14,
      fontWeight: "600",
    },
    rowPhone: {
      color: colors.muted,
      fontSize: 12,
    },
    metaRow: {
      flexDirection: "row",
      gap: 16,
      marginTop: 4,
    },
    metaItem: {
      flexDirection: "row",
      gap: 4,
    },
    metaLabel: {
      color: colors.subtle,
      fontSize: 11,
    },
    metaValue: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "600",
    },
    rowRight: {
      flexDirection: "row",
      gap: 8,
    },
    actionButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSoft,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: "85%",
      width: "100%",
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      color: colors.textStrong,
      fontSize: 18,
      fontWeight: "700",
    },
    modalContent: {
      padding: 16,
      gap: 16,
    },
    sectionTitle: {
      color: colors.textStrong,
      fontSize: 14,
      fontWeight: "700",
      marginTop: 8,
      marginBottom: 8,
    },
    formGroup: {
      gap: 6,
    },
    label: {
      color: colors.textStrong,
      fontSize: 13,
      fontWeight: "600",
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.textStrong,
      backgroundColor: colors.background,
      fontSize: 14,
    },
    addressRow: {
      flexDirection: "row",
      gap: 10,
    },
    modalFooter: {
      flexDirection: "row",
      gap: 10,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: colors.surface,
    },
    cancelButtonText: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 14,
    },
    saveButton: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    saveButtonText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 14,
    },
  });
}