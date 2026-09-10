import { router, useLocalSearchParams } from "expo-router";
import {
  Plus,
  Search,
  Filter,
  Package,
  AlertTriangle,
  MoreVertical,
  Edit2,
  Trash2,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
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
import { Image } from "expo-image";

import { useAuth } from "@/context/authContextValue";
import { useAppTheme } from "@/context/ThemeContext";
import ScreenHeader from "@/components/ScreenHeader";
import { getProducts, getCategories, createProduct, updateProduct, deleteProduct } from "@/services/inventoryService";
import { getCouriers } from "@/services/courierService";
import BarcodeScannerModal from "@/components/orders/BarcodeScannerModal";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

const LOW_STOCK_THRESHOLD = 5;

export default function InventoryTab() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
  const { business } = useAuth();
  const params = useLocalSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState(
    typeof params.search === "string" ? params.search : "",
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    skuPrefix: "",
    costPrice: "",
    sellingPrice: "",
    compareAtPrice: "",
    weightGrams: "",
    lowStockThreshold: "5",
    variantSizes: [{ size: "", sku: "", barcode: "", stock: "0" }],
  });

  const loadProducts = useCallback(async () => {
    if (!business?.id) {
      setIsLoading(false);
      return;
    }

    setError(null);

    try {
      const results = await getProducts(business.id, {
        search: searchText,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setProducts(results);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [business?.id, searchText, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(loadProducts, searchText ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [loadProducts, searchText]);

  useEffect(() => {
    if (!business?.id) return;
    getCategories(business.id)
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [business?.id]);

  function handleRefresh() {
    setIsRefreshing(true);
    loadProducts();
  }

  const filteredProducts = products;

  const lowStockCount = products.filter(
    (p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD,
  ).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      categoryId: "",
      skuPrefix: "",
      costPrice: "",
      sellingPrice: "",
      compareAtPrice: "",
      weightGrams: "",
      lowStockThreshold: "5",
      variantSizes: [{ size: "", sku: "", barcode: "", stock: "0" }],
    });
  }

  function openCreateModal() {
    resetForm();
    setEditingProduct(null);
    setIsModalOpen(true);
  }

  function openEditModal(product) {
    setEditingProduct(product);
    setFormData({
      name: product.name ?? "",
      description: product.description ?? "",
      categoryId: product.categoryId ?? "",
      skuPrefix: product.skuPrefix ?? "",
      costPrice: product.costPrice ?? "",
      sellingPrice: product.sellingPrice ?? "",
      compareAtPrice: product.compareAtPrice ?? "",
      weightGrams: product.weightGrams * 1000 ?? "",
      lowStockThreshold: product.lowStockThreshold ?? "5",
      variantSizes: product.sizes?.map((v) => ({
        size: v.size ?? "",
        sku: v.sku ?? "",
        barcode: v.barcode ?? "",
        stock: v.stock ?? "0",
      })) ?? [{ size: "", sku: "", barcode: "", stock: "0" }],
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingProduct(null);
    resetForm();
  }

  function handleVariantChange(index, field, value) {
    const newVariants = [...formData.variantSizes];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData({ ...formData, variantSizes: newVariants });
  }

  function addVariant() {
    setFormData({
      ...formData,
      variantSizes: [...formData.variantSizes, { size: "", sku: "", barcode: "", stock: "0" }],
    });
  }

  function removeVariant(index) {
    if (formData.variantSizes.length <= 1) return;
    const newVariants = formData.variantSizes.filter((_, i) => i !== index);
    setFormData({ ...formData, variantSizes: newVariants });
  }

  async function handleSubmit() {
    if (!business?.id) return;

    if (!formData.name.trim()) {
      Alert.alert("Missing name", "Product name is required.");
      return;
    }

    if (!formData.sellingPrice || Number(formData.sellingPrice) <= 0) {
      Alert.alert("Missing price", "Selling price is required.");
      return;
    }

    if (formData.variantSizes.some((v) => !v.size.trim())) {
      Alert.alert("Missing size", "All variants must have a size.");
      return;
    }

    try {
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId || null,
        skuPrefix: formData.skuPrefix.trim() || undefined,
        costPriceMinor: Math.round(Number(formData.costPrice) * 100) || 0,
        sellingPriceMinor: Math.round(Number(formData.sellingPrice) * 100),
        compareAtPriceMinor: formData.compareAtPrice
          ? Math.round(Number(formData.compareAtPrice) * 100)
          : null,
        weightGrams: Math.round(Number(formData.weightGrams)) || 0,
        lowStockThreshold: Number(formData.lowStockThreshold) || 5,
        variants: formData.variantSizes.map((v) => ({
          size: v.size.trim(),
          sku: v.sku.trim() || undefined,
          barcode: v.barcode.trim() || undefined,
          stockAvailable: Number(v.stock) || 0,
        })),
      };

      if (editingProduct) {
        await updateProduct(business.id, editingProduct.id, productData);
      } else {
        await createProduct(business.id, productData);
      }

      closeModal();
      loadProducts();
    } catch (err) {
      Alert.alert("Could not save product", err.message ?? "Please try again.");
    }
  }

  async function handleDelete(product) {
    Alert.alert(
      "Delete product",
      `Delete "${product.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProduct(business.id, product.id);
              loadProducts();
            } catch (err) {
              Alert.alert("Could not delete", err.message ?? "Please try again.");
            }
          },
        },
      ],
    );
  }

  function renderProductRow(product) {
    const isLowStock = product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD;
    const isOutOfStock = product.stock === 0;

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => openEditModal(product)}
        key={product.id}
      >
        <View style={styles.rowLeft}>
          {product.images?.[0] ? (
            <Image
              source={{ uri: product.images[0] }}
              style={styles.thumbnail}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Package size={20} color={colors.subtle} />
            </View>
          )}
          <View style={styles.rowInfo}>
            <Text style={styles.rowName} numberOfLines={1}>
              {product.name}
            </Text>
            <Text style={styles.rowMeta} numberOfLines={1}>
              {product.sku} · {product.category} · LKR {product.sellingPrice.toFixed(2)}
            </Text>
            <View style={styles.stockRow}>
              <View
                style={[
                  styles.stockDot,
                  isOutOfStock
                    ? styles.stockDotOut
                    : isLowStock
                    ? styles.stockDotLow
                    : styles.stockDotOk,
                ]}
              />
              <Text
                style={[
                  styles.stockText,
                  isOutOfStock
                    ? styles.stockTextOut
                    : isLowStock
                    ? styles.stockTextLow
                    : styles.stockTextOk,
                ]}
              >
                {isOutOfStock
                  ? "Out of stock"
                  : isLowStock
                  ? `Low stock (${product.stock})`
                  : `In stock (${product.stock})`}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.rowRight}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              openEditModal(product);
            }}
          >
            <Edit2 size={18} color={colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDelete(product);
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
      <ScreenHeader title="Inventory" />

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={16} color={colors.subtle} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search products..."
            placeholderTextColor={colors.subtle}
          />
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setIsScannerOpen(true)}
        >
          <Search size={18} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Plus size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statChip} onPress={() => setStatusFilter("all")}>
          <Text style={[styles.statChipText, statusFilter === "all" && styles.statChipTextActive]}>
            All ({products.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statChip}
          onPress={() => setStatusFilter("active")}
        >
          <Text
            style={[
              styles.statChipText,
              statusFilter === "active" && styles.statChipTextActive,
            ]}
          >
            Active ({products.filter((p) => p.status === "active").length})
          </Text>
        </TouchableOpacity>
        {lowStockCount > 0 && (
          <TouchableOpacity style={[styles.statChip, styles.statChipWarning]}>
            <AlertTriangle size={12} color={colors.danger} />
            <Text style={styles.statChipTextWarning}>Low ({lowStockCount})</Text>
          </TouchableOpacity>
        )}
        {outOfStockCount > 0 && (
          <TouchableOpacity style={[styles.statChip, styles.statChipDanger]}>
            <Package size={12} color={colors.danger} />
            <Text style={styles.statChipTextDanger}>Out ({outOfStockCount})</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>Products could not be loaded.</Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={colors.accent}
          style={{ marginTop: 32 }}
        />
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyState}>
          <Package size={48} color={colors.subtle} />
          <Text style={styles.emptyText}>No products found</Text>
          <Text style={styles.emptySubtext}>
            {searchText
              ? "Try a different search term"
              : "Tap + to add your first product"}
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
          renderItem={({ item }) => renderProductRow(item)}
          ListFooterComponent={
            <Text style={styles.footerText}>
              Showing {filteredProducts.length} product(s)
            </Text>
          }
        />
      )}

      <BarcodeScannerModal
        visible={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanned={(scannedValue) => {
          setIsScannerOpen(false);
          if (scannedValue) {
            setSearchText(scannedValue.trim());
          }
        }}
      />

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
                {editingProduct ? "Edit product" : "Add product"}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <MoreVertical size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(value) => setFormData({ ...formData, name: value })}
                  placeholder="Product name"
                  placeholderTextColor={colors.subtle}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  value={formData.description}
                  onChangeText={(value) => setFormData({ ...formData, description: value })}
                  placeholder="Product description"
                  placeholderTextColor={colors.subtle}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <TextInput
                  style={styles.input}
                  value={categories.find((c) => c.id === formData.categoryId)?.name ?? ""}
                  editable={false}
                  placeholder="Select category"
                  placeholderTextColor={colors.subtle}
                  onFocus={() => setShowCategoryPicker(true)}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>SKU Prefix</Text>
                <TextInput
                  style={styles.input}
                  value={formData.skuPrefix}
                  onChangeText={(value) => setFormData({ ...formData, skuPrefix: value })}
                  placeholder="Auto-generated if empty"
                  placeholderTextColor={colors.subtle}
                />
              </View>

              <View style={styles.priceRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Cost Price (LKR) *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.costPrice}
                    onChangeText={(value) =>
                      setFormData({ ...formData, costPrice: value })
                    }
                    placeholder="0.00"
                    placeholderTextColor={colors.subtle}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Selling Price (LKR) *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.sellingPrice}
                    onChangeText={(value) =>
                      setFormData({ ...formData, sellingPrice: value })
                    }
                    placeholder="0.00"
                    placeholderTextColor={colors.subtle}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Compare at Price (LKR)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.compareAtPrice}
                  onChangeText={(value) =>
                    setFormData({ ...formData, compareAtPrice: value })
                  }
                  placeholder="0.00"
                  placeholderTextColor={colors.subtle}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Weight (grams)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.weightGrams}
                  onChangeText={(value) =>
                    setFormData({ ...formData, weightGrams: value })
                  }
                  placeholder="0"
                  placeholderTextColor={colors.subtle}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Low Stock Threshold</Text>
                <TextInput
                  style={styles.input}
                  value={formData.lowStockThreshold}
                  onChangeText={(value) =>
                    setFormData({ ...formData, lowStockThreshold: value })
                  }
                  placeholder="5"
                  placeholderTextColor={colors.subtle}
                  keyboardType="numeric"
                />
              </View>

              <Text style={styles.sectionTitle}>Variants (Sizes)</Text>
              {formData.variantSizes.map((variant, index) => (
                <View key={index} style={styles.variantRow}>
                  <TextInput
                    style={[styles.input, styles.variantInput]}
                    value={variant.size}
                    onChangeText={(value) =>
                      handleVariantChange(index, "size", value)
                    }
                    placeholder="Size (e.g., M, Large, 10ml)"
                    placeholderTextColor={colors.subtle}
                  />
                  <TextInput
                    style={[styles.input, styles.variantInput]}
                    value={variant.sku}
                    onChangeText={(value) =>
                      handleVariantChange(index, "sku", value)
                    }
                    placeholder="SKU"
                    placeholderTextColor={colors.subtle}
                  />
                  <TextInput
                    style={[styles.input, styles.variantInput]}
                    value={variant.barcode}
                    onChangeText={(value) =>
                      handleVariantChange(index, "barcode", value)
                    }
                    placeholder="Barcode"
                    placeholderTextColor={colors.subtle}
                  />
                  <TextInput
                    style={[styles.input, styles.variantInputSmall]}
                    value={variant.stock}
                    onChangeText={(value) =>
                      handleVariantChange(index, "stock", value)
                    }
                    placeholder="Stock"
                    placeholderTextColor={colors.subtle}
                    keyboardType="numeric"
                  />
                  {formData.variantSizes.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeVariantButton}
                      onPress={() => removeVariant(index)}
                    >
                      <Trash2 size={16} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity
                style={styles.addVariantButton}
                onPress={addVariant}
              >
                <Plus size={16} color={colors.accent} />
                <Text style={styles.addVariantText}>Add variant</Text>
              </TouchableOpacity>
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
                  {editingProduct ? "Save changes" : "Create product"}
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
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
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
    statChipTextActive: {
      color: colors.accent,
    },
    statChipWarning: {
      borderColor: colors.dangerBorder,
      backgroundColor: colors.dangerBackground,
    },
    statChipTextWarning: {
      color: colors.danger,
    },
    statChipDanger: {
      borderColor: colors.dangerBorder,
      backgroundColor: colors.dangerBackground,
    },
    statChipTextDanger: {
      color: colors.danger,
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
    thumbnail: {
      width: 48,
      height: 48,
      borderRadius: 8,
      backgroundColor: colors.surfaceSoft,
    },
    thumbnailPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
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
    rowMeta: {
      color: colors.muted,
      fontSize: 12,
    },
    stockRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    stockDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    stockDotOk: {
      backgroundColor: colors.success,
    },
    stockDotLow: {
      backgroundColor: "#f59e0b",
    },
    stockDotOut: {
      backgroundColor: colors.danger,
    },
    stockText: {
      fontSize: 11,
      fontWeight: "600",
    },
    stockTextOk: {
      color: colors.success,
    },
    stockTextLow: {
      color: "#f59e0b",
    },
    stockTextOut: {
      color: colors.danger,
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
    // Modal styles
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
    priceRow: {
      flexDirection: "row",
      gap: 10,
    },
    sectionTitle: {
      color: colors.textStrong,
      fontSize: 14,
      fontWeight: "700",
      marginTop: 8,
      marginBottom: 8,
    },
    variantRow: {
      flexDirection: "row",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "flex-end",
    },
    variantInput: {
      flex: 1,
      minWidth: 100,
    },
    variantInputSmall: {
      width: 70,
    },
    removeVariantButton: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.dangerBackground,
    },
    addVariantButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 8,
      backgroundColor: "transparent",
    },
    addVariantText: {
      color: colors.accent,
      fontWeight: "600",
      fontSize: 13,
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