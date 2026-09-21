import { router, useLocalSearchParams } from "expo-router";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit2,
  Filter,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Repeat2,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
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

import CustomerAccountModal from "@/components/customers/CustomerAccountModal";
import StatCard2 from "@/components/orders/StatCard2";
import ScreenHeader from "@/components/ScreenHeader";
import { useAuth } from "@/context/authContextValue";
import { useAppTheme } from "@/context/ThemeContext";
import {
  changeFraudRiskLevel,
  createCustomer,
  getCustomers,
  getFraudCustomers,
  removeFromFraudList,
  updateCustomer,
} from "@/services/customerService";
import { getReviews, moderateReview } from "@/services/reviewService";

export default function CustomersTab() {
  const { colors, theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(colors, insets.top),
    [colors, insets.top],
  );
  const { business } = useAuth();
  const params = useLocalSearchParams();

  // Active top tab: "all" | "reviews" | "fraud"
  const [activeTab, setActiveTab] = useState("all");

  const [customers, setCustomers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [fraudCustomers, setFraudCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [searchText, setSearchText] = useState(
    typeof params.search === "string" ? params.search : "",
  );
  const [segmentFilter, setSegmentFilter] = useState("all"); // "all" | "repeat" | "high-value" | "high-risk"

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [fraudRiskModalCustomer, setFraudRiskModalCustomer] = useState(null);

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

  const loadData = useCallback(async () => {
    if (!business?.id) {
      setIsLoading(false);
      return;
    }

    setError(null);

    try {
      const [custList, revList, fraudList] = await Promise.allSettled([
        getCustomers(business.id, searchText),
        getReviews(business.id),
        getFraudCustomers(business.id),
      ]);

      if (custList.status === "fulfilled") setCustomers(custList.value || []);
      if (revList.status === "fulfilled") setReviews(revList.value || []);
      if (fraudList.status === "fulfilled") setFraudCustomers(fraudList.value || []);
    } catch (err) {
      setError(err.message ?? "Could not load customers.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [business?.id, searchText]);

  useEffect(() => {
    const timeout = setTimeout(loadData, searchText ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [loadData, searchText]);

  function handleRefresh() {
    setIsRefreshing(true);
    loadData();
  }

  // --- STATS COMPUTATION ---
  const customerStats = useMemo(() => {
    const total = customers.length;
    const repeatBuyers = customers.filter(
      (c) => (c.orderCount ?? c.completedOrderCount ?? 0) > 1,
    ).length;
    const fraudAlerts = fraudCustomers.length;
    const avgRating =
      reviews.length > 0
        ? (
            reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) /
            reviews.length
          ).toFixed(1)
        : "5.0";

    return [
      {
        key: "total",
        label: "Total Customers",
        value: total,
        icon: Users,
        tone: "blue",
      },
      {
        key: "repeat",
        label: "Repeat Buyers",
        value: repeatBuyers,
        icon: Repeat2,
        tone: "green",
      },
      {
        key: "rating",
        label: "Rating Avg",
        value: `${avgRating} ★`,
        icon: Star,
        tone: "orange",
      },
      {
        key: "fraud",
        label: "Fraud Alerts",
        value: fraudAlerts,
        icon: ShieldAlert,
        tone: "red",
      },
    ];
  }, [customers, reviews, fraudCustomers]);

  // --- FILTERED CUSTOMERS ---
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const orderCount = c.orderCount ?? c.completedOrderCount ?? 0;
      const spent = c.totalSpentMinor ?? 0;
      const risk = (c.riskLevel || "low").toLowerCase();

      if (segmentFilter === "repeat") return orderCount > 1;
      if (segmentFilter === "high-value") return spent > 1500000; // > LKR 15,000
      if (segmentFilter === "high-risk") return risk === "high" || risk === "blacklisted";
      return true;
    });
  }, [customers, segmentFilter]);

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
    const addr = customer.defaultAddress || customer.address || {};
    setFormData({
      name: customer.name ?? "",
      phoneNumber: customer.phoneNumber ?? customer.normalizedPhone ?? "",
      secondaryPhoneNumber: customer.secondaryPhoneNumber ?? "",
      email: customer.email ?? "",
      addressLine1: addr.line1 ?? "",
      addressLine2: addr.line2 ?? "",
      city: addr.city ?? "",
      district: addr.district ?? "",
      postalCode: addr.postalCode ?? "",
    });
    setIsModalOpen(true);
  }

  async function handleSubmit() {
    if (!business?.id) return;
    if (!formData.name.trim()) {
      Alert.alert("Required", "Customer name is required.");
      return;
    }
    if (!formData.phoneNumber.trim()) {
      Alert.alert("Required", "Phone number is required.");
      return;
    }

    try {
      const payload = {
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
        },
      };

      if (editingCustomer) {
        await updateCustomer(business.id, editingCustomer.id, payload);
      } else {
        await createCustomer(business.id, payload);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      Alert.alert("Save Failed", err.message ?? "Could not save customer.");
    }
  }

  async function handleDelete(customer) {
    Alert.alert(
      "Delete Customer?",
      `Delete "${customer.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await updateCustomer(business.id, customer.id, { isDeleted: true });
              loadData();
            } catch (err) {
              Alert.alert("Delete Failed", err.message);
            }
          },
        },
      ],
    );
  }

  function handleQuickWhatsApp(customer, e) {
    e?.stopPropagation?.();
    const phone = customer.normalizedPhone || customer.phoneNumber;
    if (!phone) return;
    const cleanPhone = phone.replace(/[^\d]/g, "");
    const formatted = cleanPhone.startsWith("0")
      ? `94${cleanPhone.slice(1)}`
      : cleanPhone;
    Linking.openURL(
      `https://wa.me/${formatted}?text=Hi%20${encodeURIComponent(
        customer.name || "",
      )},%20thank%20you%20for%20contacting%20us!`,
    );
  }

  function handleQuickCall(customer, e) {
    e?.stopPropagation?.();
    const phone = customer.normalizedPhone || customer.phoneNumber;
    if (phone) Linking.openURL(`tel:${phone}`);
  }

  async function handleModerateReview(reviewId, newStatus) {
    try {
      await moderateReview(business.id, reviewId, newStatus);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, status: newStatus } : r)),
      );
    } catch (err) {
      Alert.alert("Moderation failed", err.message);
    }
  }

  async function handleChangeFraudRisk(newRiskLevel) {
    if (!fraudRiskModalCustomer || !business?.id) return;
    try {
      await changeFraudRiskLevel(business.id, fraudRiskModalCustomer.id, newRiskLevel);
      setFraudRiskModalCustomer(null);
      loadData();
    } catch (err) {
      Alert.alert("Update failed", err.message);
    }
  }

  // ================= RENDER =================
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Customers" />

      {/* Top Segment Switcher: Customers vs Reviews vs Fraud Guard */}
      <View style={styles.segmentWrapper}>
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === "all" && styles.segmentBtnActive]}
            onPress={() => setActiveTab("all")}
          >
            <Users
              size={14}
              color={activeTab === "all" ? "#ffffff" : colors.text}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === "all" && styles.segmentTextActive,
              ]}
            >
              Customers ({customers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === "reviews" && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveTab("reviews")}
          >
            <Star
              size={14}
              color={activeTab === "reviews" ? "#ffffff" : colors.text}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === "reviews" && styles.segmentTextActive,
              ]}
            >
              Reviews ({reviews.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === "fraud" && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveTab("fraud")}
          >
            <ShieldAlert
              size={14}
              color={activeTab === "fraud" ? "#ffffff" : colors.text}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === "fraud" && styles.segmentTextActive,
              ]}
            >
              Fraud Guard ({fraudCustomers.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= ALL CUSTOMERS TAB ================= */}
      {activeTab === "all" && (
        <>
          {/* Stats Bar */}
          <View style={styles.statsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}
            >
              {customerStats.map((stat) => (
                <StatCard2
                  key={stat.key}
                  label={stat.label}
                  value={stat.value}
                  icon={stat.icon}
                  tone={stat.tone}
                />
              ))}
            </ScrollView>
          </View>

          {/* Search and Add Bar */}
          <View style={styles.toolbar}>
            <View style={styles.searchBox}>
              <Search size={16} color={colors.subtle} />
              <TextInput
                style={styles.searchInput}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search customers, phone, city..."
                placeholderTextColor={colors.subtle}
              />
              {searchText ? (
                <TouchableOpacity onPress={() => setSearchText("")}>
                  <X size={15} color={colors.subtle} />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
              <Plus size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Segment Filter Chips */}
          <View style={styles.filterChipsRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { id: "all", label: "All Customers" },
                { id: "repeat", label: "Repeat Buyers" },
                { id: "high-value", label: "High Value" },
                { id: "high-risk", label: "High Risk" },
              ].map((chip) => (
                <TouchableOpacity
                  key={chip.id}
                  style={[
                    styles.chip,
                    segmentFilter === chip.id && styles.chipActive,
                  ]}
                  onPress={() => setSegmentFilter(chip.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      segmentFilter === chip.id && styles.chipTextActive,
                    ]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Customer Cards List */}
          {isLoading ? (
            <ActivityIndicator
              size="large"
              color={colors.accent}
              style={{ marginTop: 32 }}
            />
          ) : (
            <FlatList
              data={filteredCustomers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Users size={44} color={colors.subtle} />
                  <Text style={styles.emptyTitle}>No customers found</Text>
                  <Text style={styles.emptySubtitle}>
                    {searchText
                      ? "Try a different search query."
                      : "Customer profiles are created automatically when orders are placed."}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const orderCount = item.orderCount ?? item.completedOrderCount ?? 0;
                const totalSpent = item.totalSpentMinor
                  ? `LKR ${(item.totalSpentMinor / 100).toLocaleString("en-LK", {
                      minimumFractionDigits: 2,
                    })}`
                  : "—";
                const risk = (item.riskLevel || "low").toLowerCase();
                const address = item.defaultAddress || item.address || {};
                const location = [address.city, address.district]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <TouchableOpacity
                    style={styles.customerCard}
                    activeOpacity={0.7}
                    onPress={() => setSelectedCustomer(item)}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {item.name ? item.name.charAt(0).toUpperCase() : "C"}
                        </Text>
                      </View>

                      <View style={styles.cardInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.customerName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          {risk === "high" || risk === "blacklisted" ? (
                            <View style={styles.riskBadgeRed}>
                              <Text style={styles.riskBadgeRedText}>
                                {risk.toUpperCase()}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.customerPhone} numberOfLines={1}>
                          {item.normalizedPhone || item.phoneNumber || "No phone"}
                        </Text>
                        {location ? (
                          <View style={styles.locationRow}>
                            <MapPin size={11} color={colors.subtle} />
                            <Text style={styles.locationText} numberOfLines={1}>
                              {location}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={[styles.actionIconBtn, { backgroundColor: "#ecfdf5" }]}
                          onPress={(e) => handleQuickWhatsApp(item, e)}
                        >
                          <MessageCircle size={16} color="#10b981" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={(e) => handleQuickCall(item, e)}
                        >
                          <Phone size={15} color={colors.text} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            openEditModal(item);
                          }}
                        >
                          <Edit2 size={15} color={colors.muted} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Bottom Summary Row */}
                    <View style={styles.customerBottomRow}>
                      <View style={styles.summaryTag}>
                        <Text style={styles.summaryTagLabel}>Orders:</Text>
                        <Text style={styles.summaryTagValue}>{orderCount}</Text>
                      </View>
                      <View style={styles.summaryTag}>
                        <Text style={styles.summaryTagLabel}>Spent:</Text>
                        <Text style={styles.summaryTagValue}>{totalSpent}</Text>
                      </View>
                      <View style={{ flex: 1 }} />
                      <Text style={styles.viewProfileText}>
                        View 360° Profile →
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </>
      )}

      {/* ================= REVIEWS TAB ================= */}
      {activeTab === "reviews" && (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Star size={44} color={colors.subtle} />
              <Text style={styles.emptyTitle}>No customer reviews yet</Text>
              <Text style={styles.emptySubtitle}>
                Reviews submitted by verified buyers on your online storefront will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const rating = Number(item.rating) || 5;
            const status = item.status || "approved";

            return (
              <View style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View>
                    <Text style={styles.reviewAuthor}>
                      {item.customerName || "Customer"}
                    </Text>
                    <Text style={styles.reviewProduct} numberOfLines={1}>
                      {item.productName || "Product Review"}
                    </Text>
                  </View>

                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        fill={s <= rating ? "#f59e0b" : "transparent"}
                        color={s <= rating ? "#f59e0b" : colors.subtle}
                      />
                    ))}
                  </View>
                </View>

                <Text style={styles.reviewComment}>
                  "{item.reviewText || item.comment || "Great product and prompt delivery!"}"
                </Text>

                <View style={styles.reviewFooter}>
                  <View
                    style={[
                      styles.statusPill,
                      status === "approved"
                        ? styles.statusPillGreen
                        : status === "rejected"
                        ? styles.statusPillRed
                        : styles.statusPillAmber,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        status === "approved"
                          ? { color: colors.success }
                          : status === "rejected"
                          ? { color: colors.danger }
                          : { color: "#d97706" },
                      ]}
                    >
                      {status.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.moderateActions}>
                    {status !== "approved" && (
                      <TouchableOpacity
                        style={[styles.modBtn, styles.modBtnGreen]}
                        onPress={() => handleModerateReview(item.id, "approved")}
                      >
                        <Check size={13} color="#ffffff" />
                        <Text style={styles.modBtnText}>Approve</Text>
                      </TouchableOpacity>
                    )}
                    {status !== "rejected" && (
                      <TouchableOpacity
                        style={[styles.modBtn, styles.modBtnRed]}
                        onPress={() => handleModerateReview(item.id, "rejected")}
                      >
                        <X size={13} color="#ffffff" />
                        <Text style={styles.modBtnText}>Reject</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ================= FRAUD GUARD TAB ================= */}
      {activeTab === "fraud" && (
        <FlatList
          data={fraudCustomers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ShieldCheck size={44} color={colors.success} />
              <Text style={styles.emptyTitle}>Zero High-Risk Customers</Text>
              <Text style={styles.emptySubtitle}>
                Vendly's fraud detection engine automatically screens returns, COD failures, and delivery refusals.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const risk = (item.riskLevel || "high").toLowerCase();
            const score = item.fraudScore ?? 80;
            const returnRate = Math.round(
              (item.returnRate ?? (item.returnedOrderCount ? item.returnedOrderCount / Math.max(item.totalOrderCount || 1, 1) : 0.5)) * 100,
            );

            return (
              <View style={styles.fraudCard}>
                <View style={styles.fraudCardTop}>
                  <View style={styles.fraudIconBox}>
                    <ShieldAlert size={20} color={colors.danger} />
                  </View>
                  <View style={styles.fraudInfo}>
                    <Text style={styles.fraudName}>{item.name}</Text>
                    <Text style={styles.fraudPhone}>
                      {item.normalizedPhone || item.phoneNumber}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.riskLevelBtn}
                    onPress={() => setFraudRiskModalCustomer(item)}
                  >
                    <Text style={styles.riskLevelBtnText}>{risk.toUpperCase()}</Text>
                  </TouchableOpacity>
                </View>

                {/* Score & Metrics Bar */}
                <View style={styles.fraudMetricsGrid}>
                  <View style={styles.fraudMetric}>
                    <Text style={styles.fraudMetricLabel}>Risk Score</Text>
                    <Text style={[styles.fraudMetricVal, { color: colors.danger }]}>
                      {score}/100
                    </Text>
                  </View>
                  <View style={styles.fraudMetric}>
                    <Text style={styles.fraudMetricLabel}>Return Rate</Text>
                    <Text style={styles.fraudMetricVal}>{returnRate}%</Text>
                  </View>
                  <View style={styles.fraudMetric}>
                    <Text style={styles.fraudMetricLabel}>Orders</Text>
                    <Text style={styles.fraudMetricVal}>
                      {item.returnedOrderCount || 0} returned /{" "}
                      {item.totalOrderCount || 0} total
                    </Text>
                  </View>
                </View>

                <View style={styles.fraudReasonBox}>
                  <Text style={styles.fraudReasonLabel}>Trigger Reason:</Text>
                  <Text style={styles.fraudReasonText}>
                    {item.returnReason ||
                      item.fraudReason ||
                      "High rate of courier package returns or delivery refusals."}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Customer 360 Profile Modal */}
      {selectedCustomer && (
        <CustomerAccountModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onEdit={() => {
            const c = selectedCustomer;
            setSelectedCustomer(null);
            openEditModal(c);
          }}
          onDelete={() => {
            const c = selectedCustomer;
            setSelectedCustomer(null);
            handleDelete(c);
          }}
        />
      )}

      {/* Fraud Risk Level Changer Modal */}
      {fraudRiskModalCustomer && (
        <Modal transparent animationType="fade" visible={Boolean(fraudRiskModalCustomer)}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setFraudRiskModalCustomer(null)}
          >
            <View style={styles.riskModalBox}>
              <Text style={styles.modalTitle}>Set Fraud Risk Level</Text>
              <Text style={styles.modalSubtitle}>
                Customer: {fraudRiskModalCustomer.name}
              </Text>

              {["low", "medium", "high", "blacklisted"].map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  style={styles.riskOption}
                  onPress={() => handleChangeFraudRisk(lvl)}
                >
                  <Text
                    style={[
                      styles.riskOptionText,
                      lvl === "blacklisted" || lvl === "high"
                        ? { color: colors.danger, fontWeight: "700" }
                        : { color: colors.text },
                    ]}
                  >
                    {lvl.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setFraudRiskModalCustomer(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Add / Edit Customer Form Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsModalOpen(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCustomer ? "Edit Customer" : "New Customer"}
              </Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <X size={20} color={colors.subtle} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formContent}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(v) => setFormData({ ...formData, name: v })}
                  placeholder="e.g. Kasun Perera"
                  placeholderTextColor={colors.subtle}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Primary Phone *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phoneNumber}
                  onChangeText={(v) => setFormData({ ...formData, phoneNumber: v })}
                  placeholder="077 123 4567"
                  placeholderTextColor={colors.subtle}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Secondary Phone</Text>
                <TextInput
                  style={styles.input}
                  value={formData.secondaryPhoneNumber}
                  onChangeText={(v) =>
                    setFormData({ ...formData, secondaryPhoneNumber: v })
                  }
                  placeholder="Optional backup phone"
                  placeholderTextColor={colors.subtle}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(v) => setFormData({ ...formData, email: v })}
                  placeholder="customer@gmail.com"
                  placeholderTextColor={colors.subtle}
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Address Line 1</Text>
                <TextInput
                  style={styles.input}
                  value={formData.addressLine1}
                  onChangeText={(v) =>
                    setFormData({ ...formData, addressLine1: v })
                  }
                  placeholder="Street address or house number"
                  placeholderTextColor={colors.subtle}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.city}
                    onChangeText={(v) => setFormData({ ...formData, city: v })}
                    placeholder="Colombo"
                    placeholderTextColor={colors.subtle}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>District</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.district}
                    onChangeText={(v) => setFormData({ ...formData, district: v })}
                    placeholder="Colombo"
                    placeholderTextColor={colors.subtle}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setIsModalOpen(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSubmit}
              >
                <Text style={styles.modalSaveButtonText}>
                  {editingCustomer ? "Save Changes" : "Create Customer"}
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
    segmentWrapper: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    segmentContainer: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    segmentBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingVertical: 8,
      borderRadius: 9,
    },
    segmentBtnActive: {
      backgroundColor: colors.accent,
    },
    segmentText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
    },
    segmentTextActive: {
      color: "#ffffff",
      fontWeight: "700",
    },
    statsWrapper: {
      marginVertical: 4,
    },
    statsRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 6,
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      gap: 8,
      marginTop: 4,
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
      fontSize: 13.5,
    },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },
    filterChipsRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    chipActive: {
      backgroundColor: colors.surfaceSoft,
      borderColor: colors.accent,
    },
    chipText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
    },
    chipTextActive: {
      color: colors.accent,
      fontWeight: "700",
    },
    listContent: {
      padding: 16,
      paddingBottom: 40,
    },
    customerCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "rgba(22, 140, 245, 0.12)",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 16,
      fontWeight: "750",
      color: colors.accent,
    },
    cardInfo: {
      flex: 1,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    customerName: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      flexShrink: 1,
    },
    customerPhone: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 3,
    },
    locationText: {
      fontSize: 11,
      color: colors.subtle,
    },
    riskBadgeRed: {
      backgroundColor: colors.dangerBackground,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 0.5,
      borderColor: colors.dangerBorder,
    },
    riskBadgeRedText: {
      fontSize: 9,
      fontWeight: "750",
      color: colors.danger,
    },
    cardActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    actionIconBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    customerBottomRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 12,
    },
    summaryTag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    summaryTagLabel: {
      fontSize: 11,
      color: colors.subtle,
    },
    summaryTagValue: {
      fontSize: 11.5,
      fontWeight: "700",
      color: colors.text,
    },
    viewProfileText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.accent,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
      marginTop: 40,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginTop: 12,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.muted,
      textAlign: "center",
      marginTop: 6,
      lineHeight: 18,
    },

    // Review Card
    reviewCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
    },
    reviewHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    reviewAuthor: {
      fontSize: 14.5,
      fontWeight: "700",
      color: colors.text,
    },
    reviewProduct: {
      fontSize: 11.5,
      color: colors.muted,
      marginTop: 2,
    },
    starsRow: {
      flexDirection: "row",
      gap: 2,
    },
    reviewComment: {
      fontSize: 13,
      color: colors.text,
      fontStyle: "italic",
      marginTop: 8,
      lineHeight: 18,
    },
    reviewFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    statusPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    statusPillGreen: {
      backgroundColor: "rgba(16, 185, 129, 0.1)",
    },
    statusPillRed: {
      backgroundColor: colors.dangerBackground,
    },
    statusPillAmber: {
      backgroundColor: "#fef3c7",
    },
    statusPillText: {
      fontSize: 10,
      fontWeight: "750",
    },
    moderateActions: {
      flexDirection: "row",
      gap: 6,
    },
    modBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 6,
    },
    modBtnGreen: {
      backgroundColor: colors.success,
    },
    modBtnRed: {
      backgroundColor: colors.danger,
    },
    modBtnText: {
      color: "#ffffff",
      fontSize: 11,
      fontWeight: "700",
    },

    // Fraud Card
    fraudCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      padding: 14,
      marginBottom: 10,
    },
    fraudCardTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    fraudIconBox: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.dangerBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    fraudInfo: {
      flex: 1,
    },
    fraudName: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    fraudPhone: {
      fontSize: 12,
      color: colors.muted,
    },
    riskLevelBtn: {
      backgroundColor: colors.dangerBackground,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    riskLevelBtnText: {
      color: colors.danger,
      fontSize: 11,
      fontWeight: "750",
    },
    fraudMetricsGrid: {
      flexDirection: "row",
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 10,
      marginTop: 10,
      justifyContent: "space-around",
    },
    fraudMetric: {
      alignItems: "center",
    },
    fraudMetricLabel: {
      fontSize: 10,
      color: colors.subtle,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    fraudMetricVal: {
      fontSize: 13,
      fontWeight: "750",
      color: colors.text,
      marginTop: 2,
    },
    fraudReasonBox: {
      marginTop: 8,
      padding: 8,
      borderRadius: 8,
      backgroundColor: "rgba(239, 68, 68, 0.05)",
    },
    fraudReasonLabel: {
      fontSize: 10.5,
      fontWeight: "700",
      color: colors.danger,
    },
    fraudReasonText: {
      fontSize: 11.5,
      color: colors.text,
      marginTop: 2,
    },

    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    modalCard: {
      width: "100%",
      maxHeight: "85%",
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    modalSubtitle: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
      marginBottom: 12,
    },
    formContent: {
      padding: 16,
      gap: 12,
    },
    formGroup: {
      gap: 4,
    },
    formRow: {
      flexDirection: "row",
      gap: 10,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 13.5,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalFooter: {
      flexDirection: "row",
      padding: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 10,
    },
    modalCancelButton: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalCancelButtonText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    modalSaveButton: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.accent,
    },
    modalSaveButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#ffffff",
    },

    // Risk Modal Box
    riskModalBox: {
      width: "85%",
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    riskOption: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    riskOptionText: {
      fontSize: 14,
    },
    modalCancelBtn: {
      alignItems: "center",
      paddingTop: 14,
    },
    modalCancelText: {
      fontSize: 13,
      color: colors.muted,
      fontWeight: "600",
    },
  });
}