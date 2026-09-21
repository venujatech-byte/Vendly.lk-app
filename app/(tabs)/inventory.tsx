import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import {
  AlertTriangle,
  Camera,
  ChevronRight,
  CircleCheck,
  CircleX,
  Edit2,
  Filter,
  FolderPlus,
  Layers,
  MoreVertical,
  Package,
  Plus,
  ScanBarcode,
  Search,
  Sliders,
  Trash2,
  TrendingDown,
  Upload,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

import AddCategoryModal from "@/components/inventory/AddCategoryModal";
import AdjustStockModal from "@/components/inventory/AdjustStockModal";
import DeadStockModal from "@/components/inventory/DeadStockModal";
import BarcodeScannerModal from "@/components/orders/BarcodeScannerModal";
import StatCard2 from "@/components/orders/StatCard2";
import ScreenHeader from "@/components/ScreenHeader";
import { useAuth } from "@/context/authContextValue";
import { useAppTheme } from "@/context/ThemeContext";
import { getCategories, removeCategory } from "@/services/categoryService";
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "@/services/inventoryService";

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
  const styles = useMemo(
    () => createStyles(colors, insets.top),
    [colors, insets.top],
  );
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
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [activeSegment, setActiveSegment] = useState("products"); // "products" | "categories"

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDeadStockOpen, setIsDeadStockOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState(null);

  const [editingProduct, setEditingProduct] = useState(null);
  const [productImages, setProductImages] = useState([]);
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
        categoryId: selectedCategoryId || undefined,
      });
      setProducts(results);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [business?.id, searchText, statusFilter, selectedCategoryId]);

  const loadCategories = useCallback(async () => {
    if (!business?.id) return;
    try {
      const cats = await getCategories(business.id);
      setCategories(cats || []);
    } catch {
      setCategories([]);
    }
  }, [business?.id]);

  useEffect(() => {
    const timeout = setTimeout(loadProducts, searchText ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [loadProducts, searchText]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  function handleRefresh() {
    setIsRefreshing(true);
    loadProducts();
    loadCategories();
  }

  const lowStockCount = products.filter(
    (p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD,
  ).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  const inventoryStats = useMemo(() => {
    const inStock = products.length - lowStockCount - outOfStockCount;
    return [
      {
        key: "total",
        label: "Total Products",
        value: products.length,
        icon: Package,
        tone: "blue",
      },
      {
        key: "inStock",
        label: "In Stock",
        value: inStock > 0 ? inStock : 0,
        icon: CircleCheck,
        tone: "green",
      },
      {
        key: "lowStock",
        label: "Low Stock",
        value: lowStockCount,
        icon: AlertTriangle,
        tone: "orange",
      },
      {
        key: "outOfStock",
        label: "Out of Stock",
        value: outOfStockCount,
        icon: CircleX,
        tone: "red",
      },
    ];
  }, [products.length, lowStockCount, outOfStockCount]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (searchText.trim()) {
        const query = searchText.toLowerCase().trim();
        const matchesName = String(p.name || "").toLowerCase().includes(query);
        const matchesSku = String(p.sku || "").toLowerCase().includes(query);
        const matchesBarcode = String(p.barcode || "").toLowerCase().includes(query);
        const matchesDesc = String(p.description || "").toLowerCase().includes(query);
        if (!matchesName && !matchesSku && !matchesBarcode && !matchesDesc) {
          return false;
        }
      }

      if (statusFilter === "active" && p.status !== "active") return false;
      if (statusFilter === "draft" && p.status !== "draft") return false;
      if (statusFilter === "archived" && p.status !== "archived") return false;
      if (statusFilter === "low-stock") {
        const stock = p.stock ?? 0;
        const threshold = p.lowStockThreshold ?? LOW_STOCK_THRESHOLD;
        if (stock <= 0 || stock > threshold) return false;
      }
      if (statusFilter === "out-of-stock") {
        const stock = p.stock ?? 0;
        if (stock > 0) return false;
      }

      if (selectedCategoryId && p.categoryId !== selectedCategoryId) {
        return false;
      }

      return true;
    });
  }, [products, searchText, statusFilter, selectedCategoryId]);

  function handleDeleteCategory(category) {
    Alert.alert(
      "Delete category?",
      `Delete "${category.name}"? Products in this category will become unassigned.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await removeCategory(business.id, category.id);
              loadCategories();
              loadProducts();
            } catch (err) {
              Alert.alert("Failed to delete", err.message);
            }
          },
        },
      ],
    );
  }

  function resetForm() {
    setProductImages([]);
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
    setProductImages(product.images || []);
    setFormData({
      name: product.name ?? "",
      description: product.description ?? "",
      categoryId: product.categoryId ?? "",
      skuPrefix: product.skuPrefix ?? "",
      costPrice: product.costPrice ? String(product.costPrice) : "",
      sellingPrice: product.sellingPrice ? String(product.sellingPrice) : "",
      compareAtPrice: product.compareAtPrice
        ? String(product.compareAtPrice)
        : "",
      weightGrams: product.weightKg ? String(product.weightKg * 1000) : "",
      lowStockThreshold: String(product.lowStockThreshold ?? "5"),
      variantSizes:
        product.sizes?.map((v) => ({
          id: v.id,
          size: v.size ?? "",
          sku: v.sku ?? "",
          barcode: v.barcode ?? "",
          stock: String(v.stock ?? "0"),
        })) ?? [{ size: "", sku: "", barcode: "", stock: "0" }],
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingProduct(null);
    resetForm();
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow camera roll access to add product photos.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setProductImages((prev) => [...prev, result.assets[0].uri]);
    }
  }

  function handleVariantChange(index, field, value) {
    const newVariants = [...formData.variantSizes];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData({ ...formData, variantSizes: newVariants });
  }

  function addVariant() {
    setFormData({
      ...formData,
      variantSizes: [
        ...formData.variantSizes,
        { size: "", sku: "", barcode: "", stock: "0" },
      ],
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
      Alert.alert("Missing size", "All variants must have a size/name.");
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
        images: productImages,
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
    const isLowStock =
      product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD;
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
              {product.sku || "No SKU"} · {product.category || "General"} · LKR{" "}
              {Number(product.sellingPrice || 0).toFixed(2)}
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
              setAdjustingProduct(product);
            }}
            title="Adjust Stock"
          >
            <Sliders size={16} color={colors.accent} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              openEditModal(product);
            }}
          >
            <Edit2 size={16} color={colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDelete(product);
            }}
          >
            <Trash2 size={16} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Inventory" />

      {/* Segment Switcher: Products vs Categories */}
      <View style={styles.segmentWrapper}>
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeSegment === "products" && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveSegment("products")}
          >
            <Package
              size={15}
              color={activeSegment === "products" ? "#ffffff" : colors.text}
            />
            <Text
              style={[
                styles.segmentText,
                activeSegment === "products" && styles.segmentTextActive,
              ]}
            >
              Products ({products.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeSegment === "categories" && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveSegment("categories")}
          >
            <Layers
              size={15}
              color={activeSegment === "categories" ? "#ffffff" : colors.text}
            />
            <Text
              style={[
                styles.segmentText,
                activeSegment === "categories" && styles.segmentTextActive,
              ]}
            >
              Categories ({categories.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeSegment === "categories" ? (
        /* ================= CATEGORIES MANAGEMENT VIEW ================= */
        <View style={{ flex: 1 }}>
          <View style={styles.categoryAddBar}>
            <Text style={{ fontSize: 13, color: colors.muted, fontWeight: "600" }}>
              {categories.length} Categories Configured
            </Text>
            <TouchableOpacity
              style={styles.categoryAddBtn}
              onPress={() => setIsCategoryModalOpen(true)}
            >
              <Plus size={14} color="#ffffff" />
              <Text style={styles.categoryAddBtnText}>Add Category</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            style={styles.list}
            data={categories}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Layers size={48} color={colors.subtle} />
                <Text style={styles.emptyText}>No categories created yet</Text>
                <Text style={styles.emptySubtext}>
                  Create categories to organize your store inventory and storefront filters.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const productCount = products.filter(
                (p) => p.categoryId === item.id,
              ).length;

              return (
                <TouchableOpacity
                  style={styles.categoryCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedCategoryId(item.id);
                    setActiveSegment("products");
                  }}
                >
                  <View style={styles.categoryIconBox}>
                    <Layers size={20} color={colors.accent} />
                  </View>
                  <View style={styles.categoryBody}>
                    <Text style={styles.categoryName}>{item.name}</Text>
                    {item.description ? (
                      <Text style={styles.categoryDesc} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                    <Text style={styles.categoryItemCount}>
                      {productCount} {productCount === 1 ? "Product" : "Products"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteCategory(item)}
                  >
                    <Trash2 size={16} color={colors.danger} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      ) : (
        /* ================= PRODUCTS VIEW ================= */
        <>
          {/* Top Inventory Stats Cards */}
          <View style={styles.statsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}
            >
              {inventoryStats.map((stat) => (
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

          {/* Search & Actions Toolbar */}
          <View style={styles.toolbar}>
            <View style={styles.searchBox}>
              <Search size={16} color={colors.subtle} />
              <TextInput
                style={styles.searchInput}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search products, SKU..."
                placeholderTextColor={colors.subtle}
              />
              {searchText ? (
                <TouchableOpacity onPress={() => setSearchText("")}>
                  <X size={15} color={colors.subtle} />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setIsScannerOpen(true)}
              title="Scan Barcode"
            >
              <ScanBarcode size={18} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setIsDeadStockOpen(true)}
              title="Dead Stock Report"
            >
              <TrendingDown size={18} color={colors.danger} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
              <Plus size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Filter Chips */}
          <View style={styles.filterChipsRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.statChip,
                  statusFilter === "all" && styles.statChipActive,
                ]}
                onPress={() => setStatusFilter("all")}
              >
                <Text
                  style={[
                    styles.statChipText,
                    statusFilter === "all" && styles.statChipTextActive,
                  ]}
                >
                  All ({products.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statChip,
                  statusFilter === "active" && styles.statChipActive,
                ]}
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
                <TouchableOpacity
                  style={[
                    styles.statChip,
                    styles.statChipWarning,
                    statusFilter === "low-stock" && styles.statChipActive,
                  ]}
                  onPress={() =>
                    setStatusFilter(
                      statusFilter === "low-stock" ? "all" : "low-stock",
                    )
                  }
                >
                  <AlertTriangle size={12} color={colors.danger} />
                  <Text style={styles.statChipTextWarning}>
                    Low ({lowStockCount})
                  </Text>
                </TouchableOpacity>
              )}

              {outOfStockCount > 0 && (
                <TouchableOpacity
                  style={[
                    styles.statChip,
                    styles.statChipDanger,
                    statusFilter === "out-of-stock" && styles.statChipActive,
                  ]}
                  onPress={() =>
                    setStatusFilter(
                      statusFilter === "out-of-stock" ? "all" : "out-of-stock",
                    )
                  }
                >
                  <Package size={12} color={colors.danger} />
                  <Text style={styles.statChipTextDanger}>
                    Out ({outOfStockCount})
                  </Text>
                </TouchableOpacity>
              )}

              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.statChip,
                    selectedCategoryId === c.id && styles.statChipActive,
                  ]}
                  onPress={() =>
                    setSelectedCategoryId(selectedCategoryId === c.id ? "" : c.id)
                  }
                >
                  <Text
                    style={[
                      styles.statChipText,
                      selectedCategoryId === c.id && styles.statChipTextActive,
                    ]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
              <Text style={styles.emptyText}>No matching products</Text>
              <Text style={styles.emptySubtext}>
                {searchText || statusFilter !== "all" || selectedCategoryId
                  ? "Try clearing your filters or search query"
                  : "Tap + to add your first product"}
              </Text>
              {(Boolean(searchText) || statusFilter !== "all" || Boolean(selectedCategoryId)) && (
                <TouchableOpacity
                  style={{
                    marginTop: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    backgroundColor: colors.surfaceSoft,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                  onPress={() => {
                    setSearchText("");
                    setStatusFilter("all");
                    setSelectedCategoryId("");
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: colors.accent,
                    }}
                  >
                    Clear Filters
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              style={styles.list}
              data={filteredProducts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                />
              }
              renderItem={({ item }) => renderProductRow(item)}
              ListFooterComponent={
                <Text style={styles.footerText}>
                  Showing {filteredProducts.length} of {products.length} product(s)
                </Text>
              }
            />
          )}
        </>
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

      <AddCategoryModal
        visible={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        businessId={business?.id}
        onCategoryAdded={(newCat) => {
          setCategories((prev) => [...prev, newCat]);
        }}
      />

      <DeadStockModal
        visible={isDeadStockOpen}
        onClose={() => setIsDeadStockOpen(false)}
        products={products}
      />

      <AdjustStockModal
        visible={Boolean(adjustingProduct)}
        product={adjustingProduct}
        businessId={business?.id}
        onClose={() => setAdjustingProduct(null)}
        onStockAdjusted={(updated) => {
          setProducts((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p)),
          );
        }}
      />

      {/* Add / Edit Product Modal */}
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
                {editingProduct ? "Edit Product" : "Add Product"}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <X size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              {/* Image Picker */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Product Photos</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.imagesRow}>
                    <TouchableOpacity
                      style={styles.uploadBox}
                      onPress={pickImage}
                    >
                      <Camera size={20} color={colors.accent} />
                      <Text style={styles.uploadText}>Add Photo</Text>
                    </TouchableOpacity>

                    {productImages.map((uri, idx) => (
                      <View key={idx} style={styles.imagePreviewWrap}>
                        <Image
                          source={{ uri }}
                          style={styles.imagePreview}
                          contentFit="cover"
                        />
                        <TouchableOpacity
                          style={styles.removeImageBtn}
                          onPress={() =>
                            setProductImages((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                        >
                          <X size={12} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(value) =>
                    setFormData({ ...formData, name: value })
                  }
                  placeholder="Product name"
                  placeholderTextColor={colors.subtle}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, { height: 65 }]}
                  value={formData.description}
                  onChangeText={(value) =>
                    setFormData({ ...formData, description: value })
                  }
                  placeholder="Product description"
                  placeholderTextColor={colors.subtle}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categoryPickerRow}>
                    {categories.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[
                          styles.catPickerChip,
                          formData.categoryId === c.id &&
                            styles.catPickerChipActive,
                        ]}
                        onPress={() =>
                          setFormData({
                            ...formData,
                            categoryId:
                              formData.categoryId === c.id ? "" : c.id,
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.catPickerText,
                            formData.categoryId === c.id &&
                              styles.catPickerTextActive,
                          ]}
                        >
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.priceRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
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
                <View style={[styles.formGroup, { flex: 1 }]}>
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

              <View style={styles.priceRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
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
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Weight (grams)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.weightGrams}
                    onChangeText={(value) =>
                      setFormData({ ...formData, weightGrams: value })
                    }
                    placeholder="250"
                    placeholderTextColor={colors.subtle}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.sectionTitle}>Variants & Sizes</Text>
              {formData.variantSizes.map((variant, index) => (
                <View key={index} style={styles.variantRow}>
                  <TextInput
                    style={[styles.input, styles.variantInput]}
                    value={variant.size}
                    onChangeText={(value) =>
                      handleVariantChange(index, "size", value)
                    }
                    placeholder="Size (e.g. M, L)"
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
                    style={[styles.input, styles.variantInputSmall]}
                    value={variant.stock}
                    onChangeText={(value) =>
                      handleVariantChange(index, "stock", value)
                    }
                    placeholder="Qty"
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
                <Text style={styles.addVariantText}>Add Variant</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSubmit}
              >
                <Text style={styles.saveButtonText}>
                  {editingProduct ? "Save Changes" : "Create Product"}
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
      gap: 6,
      paddingVertical: 8,
      borderRadius: 9,
    },
    segmentBtnActive: {
      backgroundColor: colors.accent,
    },
    segmentText: {
      fontSize: 13,
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
    filterChipsRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
    },
    categoryCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    categoryIconBox: {
      width: 42,
      height: 42,
      borderRadius: 10,
      backgroundColor: "rgba(22, 140, 245, 0.1)",
      alignItems: "center",
      justifyContent: "center",
    },
    categoryBody: {
      flex: 1,
    },
    categoryName: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    categoryDesc: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },
    categoryItemCount: {
      fontSize: 11,
      color: colors.accent,
      fontWeight: "600",
      marginTop: 4,
    },
    categoryAddBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    categoryAddBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
    },
    categoryAddBtnText: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "700",
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
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 10,
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
      marginRight: 8,
    },
    statChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceSoft,
    },
    statChipText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "600",
    },
    statChipTextActive: {
      color: colors.accent,
      fontWeight: "700",
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
      gap: 10,
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
      gap: 2,
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
      marginTop: 2,
    },
    stockDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    stockDotOk: {
      backgroundColor: "#10b981",
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
      color: "#10b981",
    },
    stockTextLow: {
      color: "#f59e0b",
    },
    stockTextOut: {
      color: colors.danger,
    },
    rowRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
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
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      maxHeight: "88%",
      width: "100%",
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      color: colors.textStrong,
      fontSize: 17,
      fontWeight: "700",
    },
    modalContent: {
      padding: 18,
      gap: 14,
    },
    sectionTitle: {
      color: colors.textStrong,
      fontSize: 13,
      fontWeight: "700",
      marginTop: 4,
    },
    formGroup: {
      gap: 6,
    },
    label: {
      color: colors.textStrong,
      fontSize: 12,
      fontWeight: "600",
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      color: colors.textStrong,
      backgroundColor: colors.background,
      fontSize: 14,
    },
    priceRow: {
      flexDirection: "row",
      gap: 10,
    },
    imagesRow: {
      flexDirection: "row",
      gap: 10,
    },
    uploadBox: {
      width: 70,
      height: 70,
      borderRadius: 10,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSoft,
      gap: 4,
    },
    uploadText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.accent,
    },
    imagePreviewWrap: {
      width: 70,
      height: 70,
      borderRadius: 10,
      position: "relative",
    },
    imagePreview: {
      width: 70,
      height: 70,
      borderRadius: 10,
    },
    removeImageBtn: {
      position: "absolute",
      top: -4,
      right: -4,
      backgroundColor: colors.danger,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryPickerRow: {
      flexDirection: "row",
      gap: 6,
    },
    catPickerChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    catPickerChipActive: {
      backgroundColor: colors.surfaceSoft,
      borderColor: colors.accent,
    },
    catPickerText: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: "600",
    },
    catPickerTextActive: {
      color: colors.accent,
      fontWeight: "700",
    },
    variantRow: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    variantInput: {
      flex: 2,
    },
    variantInputSmall: {
      flex: 1,
    },
    removeVariantButton: {
      padding: 6,
    },
    addVariantButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
    },
    addVariantText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: "700",
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