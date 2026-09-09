import { apiRequest } from "./apiClient";

function formatCurrency(minorUnits = 0) {
  if (!Number.isFinite(minorUnits)) return "Not configured";
  return `LKR ${(minorUnits / 100).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
  })}`;
}

// The district fee map is keyed by slug (the same slugify() the backend uses).
// This returns "Same price everywhere" when only the common price is stored.
export function mapCourier(courier) {
  const firstKgMinor = courier.firstKgPriceMinor;
  const prices = courier.districtFirstKgPricesMinor ?? {};
  const exceptions = Number.isFinite(firstKgMinor)
    ? Object.entries(prices).filter(([, minor]) => minor !== firstKgMinor)
    : [];

  return {
    ...courier,
    id: courier.id,
    code: courier.code ?? "",
    status: courier.status ?? "inactive",
    firstKgPriceMinor: firstKgMinor,
    extraKgPriceMinor: courier.extraKgPriceMinor ?? 0,
    firstKg: formatCurrency(firstKgMinor),
    extraKg: formatCurrency(courier.extraKgPriceMinor),
    successRate: courier.successRate ?? 0,
    returnRate: courier.returnRate ?? 0,
    averageDeliveryDays: courier.averageDeliveryDays ?? 0,
    waybillPrefix: courier.waybillPrefix ?? "VWB",
    waybillStart: courier.waybillStart ?? 1,
    waybillEnd: courier.waybillEnd ?? 999999,
    deliveredOrderCount: courier.deliveredOrderCount ?? 0,
    returnedOrderCount: courier.returnedOrderCount ?? 0,
    exportTemplateFilename: courier.exportTemplateFilename ?? "",
    trackingUrlTemplate: courier.trackingUrlTemplate ?? "",
    districtFirstKgPricesMinor: prices,
    districtExceptionCount: exceptions.length,
    districtExceptionText:
      !Object.keys(prices).length
        ? "Not set by district yet"
        : exceptions.length === 0
          ? "Same price in all 25 districts"
          : exceptions
              .map(([district, minor]) => `${district}: ${formatCurrency(minor)}`)
              .join(", "),
  };
}

export async function getCouriers(businessId) {
  const response = await apiRequest(`/businesses/${businessId}/couriers`);
  return response.couriers.map(mapCourier);
}

export async function createCourier(businessId, courierData) {
  const response = await apiRequest(`/businesses/${businessId}/couriers`, {
    method: "POST",
    body: courierData,
  });
  return mapCourier(response.courier);
}

export async function updateCourier(businessId, courierId, courierData) {
  const response = await apiRequest(
    `/businesses/${businessId}/couriers/${courierId}`,
    {
      method: "PATCH",
      body: courierData,
    },
  );
  return mapCourier(response.courier);
}

export async function uploadCourierExportTemplate(businessId, courierId, file) {
  const formData = new FormData();
  // React Native FormData sends { uri, name, type } as a multipart file part
  // when given that object shape.
  formData.append("file", {
    uri: file.uri,
    name: file.name ?? "courier-template.xlsx",
    type: file.mimeType ?? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const response = await apiRequest(
    `/businesses/${businessId}/couriers/${courierId}/order-export-template`,
    { method: "POST", body: formData },
  );
  return mapCourier(response.courier);
}

export async function recommendCouriers(businessId, totalWeightGrams, district) {
  const response = await apiRequest(
    `/businesses/${businessId}/couriers/recommend`,
    { method: "POST", body: { totalWeightGrams, district } },
  );
  return response.recommendations;
}