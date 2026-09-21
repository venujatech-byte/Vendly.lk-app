import { apiRequest } from "./apiClient";

/**
 * Send a natural-language request, or a previously prepared action, to the
 * permission-aware business assistant endpoint.
 */
export async function sendBusinessAssistantMessage(
  businessId,
  { message = "", confirmedAction = null } = {},
) {
  const response = await apiRequest(
    `/businesses/${businessId}/assistant/messages`,
    {
      method: "POST",
      body: confirmedAction ? { confirmedAction } : { message },
    },
  );

  return response.assistant;
}

export const QUICK_PROMPTS = [
  "How much revenue did we make today?",
  "Which products are low in stock?",
  "How many orders need confirmation?",
  "Show my courier performance this month",
  "What is our top selling product?",
];
