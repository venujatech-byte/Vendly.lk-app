import { apiRequest } from "./apiClient";

function minorUnitsToAmount(value = 0) {
  return value / 100;
}

export function mapProductForInventory(product) {
  const variants = product.variantSummaries ?? [];
  const firstVariant = variants[0] ?? {};

  return {
    ...product,
    colour: product.colourName,
    category: product.categoryName || "Uncategorized",
    sku: firstVariant.sku ?? product.skuPrefix,
    barcode: firstVariant.barcode ?? "",
    costPrice: minorUnitsToAmount(product.costPriceMinor),
    sellingPrice: minorUnitsToAmount(product.sellingPriceMinor),
    compareAtPrice: minorUnitsToAmount(product.compareAtPriceMinor),
    weightKg: (product.weightGrams ?? 0) / 1000,
    lowStockThreshold: product.lowStockThreshold ?? 5,
    stock: product.availableStock ?? 0,
    images: (product.media ?? []).map((mediaItem) => mediaItem.url).filter(Boolean),
    sizes: variants.map((variant) => ({
      id: variant.id,
      size: variant.size,
      sku: variant.sku,
      barcode: variant.barcode,
      stock: variant.stockAvailable,
      costPrice: minorUnitsToAmount(variant.costPriceMinor ?? product.costPriceMinor),
      sellingPrice: minorUnitsToAmount(variant.sellingPriceMinor ?? product.sellingPriceMinor),
      imageUrl: variant.imageUrl ?? "",
    })),
  };
}

export async function getProducts(businessId, filters = {}) {
  const searchParameters = new URLSearchParams();

  if (filters.categoryId) searchParameters.set("categoryId", filters.categoryId);
  if (filters.status) searchParameters.set("status", filters.status);
  if (filters.search) searchParameters.set("search", filters.search);

  const query = searchParameters.toString();
  const response = await apiRequest(
    `/businesses/${businessId}/products${query ? `?${query}` : ""}`,
  );

  return response.products.map(mapProductForInventory);
}

export async function createProduct(businessId, productData) {
  const response = await apiRequest(`/businesses/${businessId}/products`, {
    method: "POST",
    body: productData,
  });
  return mapProductForInventory(response.product);
}

export async function updateProduct(businessId, productId, changes) {
  const response = await apiRequest(`/businesses/${businessId}/products/${productId}`, {
    method: "PATCH",
    body: changes,
  });
  return mapProductForInventory(response.product);
}

export async function deleteProduct(businessId, productId) {
  const response = await apiRequest(`/businesses/${businessId}/products/${productId}`, {
    method: "DELETE",
  });
  return response.product;
}

export async function getCategories(businessId) {
  const response = await apiRequest(`/businesses/${businessId}/categories`);
  return response.categories;
}

export async function createCategory(businessId, categoryData) {
  const response = await apiRequest(`/businesses/${businessId}/categories`, {
    method: "POST",
    body: categoryData,
  });
  return response.category;
}

export async function adjustStock(businessId, productId, variantId, adjustment, reason) {
  const response = await apiRequest(
    `/businesses/${businessId}/products/${productId}/stock`,
    {
      method: "POST",
      body: { variantId, adjustment, reason },
    },
  );
  return mapProductForInventory(response.product);
}