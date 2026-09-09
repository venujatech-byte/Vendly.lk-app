import { apiRequest } from "./apiClient";

function formatCurrency(minorUnits = 0) {
  return `LKR ${(minorUnits / 100).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function mapShopSale(sale) {
  const createdAt = sale.createdAt ? new Date(sale.createdAt) : new Date();
  return {
    ...sale,
    orderNumber: sale.saleNumber,
    items: (sale.items ?? []).map((item, index) => ({
      ...item,
      id: item.variantId ?? `${sale.id}-${index}`,
      imageUrl: item.mediaUrl ?? item.imageUrl ?? "",
      unitPrice: formatCurrency(item.unitPriceMinor),
      price: formatCurrency(item.lineTotalMinor),
      warrantyPeriodMonths: item.warrantyPeriodMonths ?? item.warrantyMonths ?? 0,
      warrantyExpiresAt: item.warrantyExpiresAt ?? null,
    })),
    totalMinor: sale.totalAmountMinor ?? 0,
    subtotalMinor: sale.subtotalMinor ?? 0,
    discountMinor: sale.discountTotalMinor ?? 0,
    total: formatCurrency(sale.totalAmountMinor),
    subtotal: formatCurrency(sale.subtotalMinor),
    discount: formatCurrency(sale.discountTotalMinor),
    date: createdAt.toLocaleDateString("en-LK", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: createdAt.toLocaleTimeString("en-LK", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export async function getShopSales(businessId, filters = {}) {
  const parameters = new URLSearchParams();

  if (filters.search) parameters.set("search", filters.search);
  if (filters.dateFrom) parameters.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) parameters.set("dateTo", filters.dateTo);

  const query = parameters.toString();
  const response = await apiRequest(
    `/businesses/${businessId}/shop-sales${query ? `?${query}` : ""}`,
  );
  return response.shopSales.map(mapShopSale);
}

export async function createShopSale(businessId, data) {
  const response = await apiRequest(`/businesses/${businessId}/shop-sales`, {
    method: "POST",
    body: data,
  });
  return mapShopSale(response.shopSale);
}

export async function removeShopSale(businessId, saleId) {
  const response = await apiRequest(
    `/businesses/${businessId}/shop-sales/${saleId}`,
    { method: "DELETE" },
  );
  return mapShopSale(response.shopSale);
}

export function mapWarrantyClaim(claim) {
  const createdAt = claim.createdAt ? new Date(claim.createdAt) : new Date();
  const rawItem = (claim.items && claim.items[0]) || claim.item || null;

  return {
    ...claim,
    id: claim.id ?? `${claim.sourceType}-${claim.sourceId}-${claim.claimNumber ?? 0}`,
    claimNumber: claim.claimNumber ?? claim.id,
    sourceNumber:
      claim.sourceType === "shop-sale"
        ? claim.saleNumber ?? claim.sourceNumber ?? ""
        : claim.orderNumber ?? claim.sourceNumber ?? "",
    item: rawItem
      ? {
          ...rawItem,
          id: rawItem.variantId ?? `${claim.id}-item`,
          name: rawItem.name ?? "Product",
          mediaUrl: rawItem.mediaUrl ?? rawItem.imageUrl ?? "",
        }
      : null,
    claimQuantity: claim.claimQuantity ?? claim.quantity ?? 1,
    revenueImpactMinor: claim.revenueImpactMinor ?? claim.revenueImpact ?? 0,
    customerName: claim.customerName ?? null,
    createdAt: createdAt.toISOString(),
    status: claim.status ?? "pending",
    claimType: claim.claimType ?? "supplier-warranty",
  };
}

export async function getWarrantyClaims(businessId) {
  const response = await apiRequest(`/businesses/${businessId}/warranty-claims`);
  return (response.warrantyClaims ?? []).map(mapWarrantyClaim);
}

export async function createWarrantyClaim(businessId, data) {
  const response = await apiRequest(`/businesses/${businessId}/warranty-claims`, {
    method: "POST",
    body: data,
  });
  return mapWarrantyClaim(response.warrantyClaim);
}