import { apiRequest } from "./apiClient";

export async function getCategories(businessId) {
  const response = await apiRequest(`/businesses/${businessId}/categories`);
  return response.categories || [];
}

export async function createCategory(businessId, categoryData) {
  const response = await apiRequest(`/businesses/${businessId}/categories`, {
    method: "POST",
    body: categoryData,
  });
  return response.category;
}

export async function updateCategory(businessId, categoryId, changes) {
  const response = await apiRequest(
    `/businesses/${businessId}/categories/${categoryId}`,
    {
      method: "PATCH",
      body: changes,
    },
  );
  return response.category;
}

export async function removeCategory(businessId, categoryId) {
  return apiRequest(`/businesses/${businessId}/categories/${categoryId}`, {
    method: "DELETE",
  });
}
