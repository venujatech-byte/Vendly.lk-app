import { router, useLocalSearchParams } from "expo-router";
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Truck,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
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
import { getCouriers } from "@/services/courierService";

export default function CouriersTab() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
  const { business } = useAuth();
  const params = useLocalSearchParams();

  const [couriers, setCouriers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState(
    typeof params.search === "string" ? params.search : "",
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    contactName: "",
    phone: "",
    email: "",
    website: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    district: "",
    postalCode: "",
    isActive: true,
    averageDeliveryDays: 2,
    baseFeeMinor: 0,
    perKgFeeMinor: 0,
    codFeePercent: 0,
    maxWeightKg: 30,
  });

  const loadCouriers = useCallback(async () => {
    if (!business?.id) {
      setIsLoading(false);
      return;
    }

    setError(null);

    try {
      const results = await getCouriers(business.id);
      setCouriers(results);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [business?.id]);

  useEffect(() => {
    loadCouriers();
  }, [loadCouriers]);

  function handleRefresh() {
    setIsRefreshing(true);
    loadCouriers();
  }

  const filteredCouriers = couriers.filter((c) =>
    c.name.toLowerCase().includes(searchText.toLowerCase()) ||
    c.contactName?.toLowerCase().includes(searchText.toLowerCase()) ||
    c.phone?.includes(searchText),
  );

  const activeCount = couriers.filter((c) => c.isActive).length;

  function resetForm() {
    setFormData({
      name: "",
      contactName: "",
      phone: "",
      email: "",
      website: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      district: "",
      postalCode: "",
      isActive: true,
      averageDeliveryDays: 2,
      baseFeeMinor: 0,
      perKgFeeMinor: 0,
      codFeePercent: 0,
      maxWeightKg: 30,
    });
  }

  function openCreateModal() {
    resetForm();
    setEditingCourier(null);
    setIsModalOpen(true);
  }

  function openEditModal(courier) {
    setEditingCourier(courier);
    setFormData({
      name: courier.name ?? "",
      contactName: courier.contactName ?? "",
      phone: courier.phone ?? "",
      email: courier.email ?? "",
      website: courier.website ?? "",
      addressLine1: courier.address?.line1 ?? "",
      addressLine2: courier.address?.line2 ?? "",
      city: courier.address?.city ?? "",
      district: courier.address?.district ?? "",
      postalCode: courier.address?.postalCode ?? "",
      isActive: courier.isActive ?? true,
      averageDeliveryDays: courier.averageDeliveryDays ?? 2,
      baseFeeMinor: courier.baseFeeMinor ?? 0,
      perKgFeeMinor: courier.perKgFeeMinor ?? 0,
      codFeePercent: courier.codFeePercent ?? 0,
      maxWeightKg: courier.maxWeightKg ?? 30,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingCourier(null);
    resetForm();
  }

  async function handleSubmit() {
    if (!business?.id) return;

    if (!formData.name.trim()) {
      Alert.alert("Missing name", "Courier name is required.");
      return;
    }

    if (!formData.phone.trim()) {
      Alert.alert("Missing phone", "Phone number is required.");
      return;
    }

    try {
      const courierData = {
        name: formData.name.trim(),
        contactName: formData.contactName.trim() || undefined,
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        website: formData.website.trim() || undefined,
        address: {
          line1: formData.addressLine1.trim() || undefined,
          line2: formData.addressLine2.trim() || undefined,
          city: formData.city.trim() || undefined,
          district: formData.district.trim() || undefined,
          postalCode: formData.postalCode.trim() || undefined,
          country: "LK",
        },
        isActive: formData.isActive,
        averageDeliveryDays: Number(formData.averageDeliveryDays) || 2,
        baseFeeMinor: Math.round(Number(formData.baseFeeMinor) * 100) || 0,
        perKgFeeMinor: Math.round(Number(formData.perKgFeeMinor) * 100) || 0,
        codFeePercent: Number(formData.codFeePercent) || 0,
        maxWeightKg: Number(formData.maxWeightKg) || 30,
      };

      const endpoint = editingCourier
        ? `/businesses/${business.id}/couriers/${editingCourier.id}`
        : `/businesses/${business.id}/couriers`;
      const method = editingCourier ? "PATCH" : "POST";

      await require("@/services/apiClient").apiRequest(endpoint, {
        method,
        body: courierData,
      });

      closeModal();
      loadCouriers();
    } catch (err) {
      Alert.alert("Could not save courier", err.message ?? "Please try again.");
    }
  }

  async function handleDelete(courier) {
    Alert.alert(
      "Delete courier",
      `Delete "${courier.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await require("@/services/apiClient").apiRequest(
                `/businesses/${business.id}/couriers/${courier.id}`,
                { method: "DELETE" },
              );
              loadCouriers();
            } catch (err) {
              Alert.alert("Could not delete", err.message ?? "Please try again.");
            }
          },
        },
      ],
    );
  }

  function renderCourierRow(courier) {
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => openEditModal(courier)}
        key={courier.id}
      >
        <View style={styles.rowLeft}>
          <View style={styles.avatar}>
            <Truck size={22} color="#ffffff" />
          </View>
          <View style={styles.rowInfo}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowName} numberOfLines={1}>
                {courier.name}
              </Text>
              {courier.isActive ? (
                <View style={styles.activeBadge}>
                  <CheckCircle2 size={10} color={colors.success} />
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              ) : (
                <View style={styles.inactiveBadge}>
                  <XCircle size={10} color={colors.danger} />
                  <Text style={styles.inactiveBadgeText}>Inactive</Text>
                </View>
              )}
            </View>
            <Text style={styles.rowContact} numberOfLines={1}>
              {courier.contactName ? `${courier.contactName} · ` : ""}{courier.phone}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <MapPin size={11} color={colors.subtle} />
                <Text style={styles.metaText}>
                  {courier.address?.city}, {courier.address?.district}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Clock size={11} color={colors.subtle} />
                <Text style={styles.metaText}>
                  {courier.averageDeliveryDays} day(s) avg
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaText}>
                  Base: LKR {(courier.baseFeeMinor / 100).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.rowRight}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              openEditModal(courier);
            }}
          >
            <Edit2 size={18} color={colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDelete(courier);
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
      <ScreenHeader title="Couriers" />

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={16} color={colors.subtle} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search couriers..."
            placeholderTextColor={colors.subtle}
          />
        </View>

        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Plus size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statChip}>
          <Text style={styles.statChipText}>
            Total ({couriers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statChip}>
          <Text style={styles.statChipText}>
            Active ({activeCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statChip}>
          <Text style={styles.statChipText}>
            Inactive ({couriers.length - activeCount})
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>Couriers could not be loaded.</Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={colors.accent}
          style={{ marginTop: 32 }}
        />
      ) : filteredCouriers.length === 0 ? (
        <View style={styles.emptyState}>
          <Truck size={48} color={colors.subtle} />
          <Text style={styles.emptyText}>No couriers found</Text>
          <Text style={styles.emptySubtext}>
            {searchText
              ? "Try a different search term"
              : "Tap + to add your first courier"}
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={filteredCouriers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
          renderItem={({ item }) => renderCourierRow(item)}
          ListFooterComponent={
            <Text style={styles.footerText}>
              Showing {filteredCouriers.length} of {couriers.length} courier(s)
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
                {editingCourier ? "Edit courier" : "Add courier"}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <MoreVertical size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.sectionTitle}>Basic Information</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(value) => setFormData({ ...formData, name: value })}
                  placeholder="Courier name"
                  placeholderTextColor={colors.subtle}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Contact Person</Text>
                <TextInput
                  style={styles.input}
                  value={formData.contactName}
                  onChangeText={(value) =>
                    setFormData({ ...formData, contactName: value })
                  }
                  placeholder="Contact person name"
                  placeholderTextColor={colors.subtle}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(value) => setFormData({ ...formData, phone: value })}
                  placeholder="Phone number"
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
                  placeholder="courier@example.com"
                  placeholderTextColor={colors.subtle}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Website</Text>
                <TextInput
                  style={styles.input}
                  value={formData.website}
                  onChangeText={(value) => setFormData({ ...formData, website: value })}
                  placeholder="https://courier.com"
                  placeholderTextColor={colors.subtle}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Status</Text>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    formData.isActive && styles.toggleButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, isActive: !formData.isActive })}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      formData.isActive && styles.toggleButtonTextActive,
                    ]}
                  >
                    {formData.isActive ? "Active" : "Inactive"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionTitle}>Address</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Address Line 1</Text>
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
                  <Text style={styles.label}>City</Text>
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
                  <Text style={styles.label}>District</Text>
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

              <Text style={styles.sectionTitle}>Pricing & Delivery</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Avg Delivery Days *</Text>
                <TextInput
                  style={styles.input}
                  value={String(formData.averageDeliveryDays)}
                  onChangeText={(value) =>
                    setFormData({ ...formData, averageDeliveryDays: Number(value) || 2 })
                  }
                  placeholder="2"
                  placeholderTextColor={colors.subtle}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.priceRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Base Fee (LKR) *</Text>
                  <TextInput
                    style={styles.input}
                    value={String((formData.baseFeeMinor / 100).toFixed(2))}
                    onChangeText={(value) =>
                      setFormData({ ...formData, baseFeeMinor: Math.round(Number(value) * 100) || 0 })
                    }
                    placeholder="0.00"
                    placeholderTextColor={colors.subtle}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Per Kg Fee (LKR)</Text>
                  <TextInput
                    style={styles.input}
                    value={String((formData.perKgFeeMinor / 100).toFixed(2))}
                    onChangeText={(value) =>
                      setFormData({ ...formData, perKgFeeMinor: Math.round(Number(value) * 100) || 0 })
                    }
                    placeholder="0.00"
                    placeholderTextColor={colors.subtle}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.priceRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>COD Fee (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={String(formData.codFeePercent)}
                    onChangeText={(value) =>
                      setFormData({ ...formData, codFeePercent: Number(value) || 0 })
                    }
                    placeholder="0"
                    placeholderTextColor={colors.subtle}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Max Weight (kg)</Text>
                  <TextInput
                    style={styles.input}
                    value={String(formData.maxWeightKg)}
                    onChangeText={(value) =>
                      setFormData({ ...formData, maxWeightKg: Number(value) || 30 })
                    }
                    placeholder="30"
                    placeholderTextColor={colors.subtle}
                    keyboardType="numeric"
                  />
                </View>
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
                  {editingCourier ? "Save changes" : "Create courier"}
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
    statsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 12,
    },
    statChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statChipText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "600",
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
    rowInfo: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    rowHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    rowName: {
      color: colors.textStrong,
      fontSize: 14,
      fontWeight: "600",
      flexShrink: 1,
    },
    activeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.successBackground,
    },
    activeBadgeText: {
      color: colors.success,
      fontSize: 9,
      fontWeight: "700",
    },
    inactiveBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.dangerBackground,
    },
    inactiveBadgeText: {
      color: colors.danger,
      fontSize: 9,
      fontWeight: "700",
    },
    rowContact: {
      color: colors.muted,
      fontSize: 12,
    },
    metaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginTop: 4,
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    metaText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "500",
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
    priceRow: {
      flexDirection: "row",
      gap: 10,
    },
    toggleButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.surface,
    },
    toggleButtonActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    toggleButtonText: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 13,
    },
    toggleButtonTextActive: {
      color: "#ffffff",
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