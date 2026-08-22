import { Platform } from "react-native";

const configuredApiBaseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultDevelopmentBaseUrl()
).replace(/\/$/, "");

let authTokenProvider = async () => null;

function defaultDevelopmentBaseUrl() {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000/api/v1";
  }

  return "http://localhost:5000/api/v1";
}

export function setAuthTokenProvider(provider) {
  authTokenProvider = provider ?? (async () => null);
}

export async function apiRequest(
  path,
  {
    method = "GET",
    body,
    headers = {},
    requiresAuthentication = true,
    signal,
  } = {},
) {
  const requestHeaders = new Headers(headers);

  if (requiresAuthentication) {
    const idToken = await authTokenProvider();

    if (!idToken && requiresAuthentication !== "optional") {
      throw new Error("You must be logged in to complete this request.");
    }

    if (idToken) requestHeaders.set("Authorization", `Bearer ${idToken}`);
  }

  let requestBody = body;

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
    requestBody = JSON.stringify(body);
  }

  const requestUrl = `${configuredApiBaseUrl}/${path.replace(/^\//, "")}`;

  const response = await fetch(requestUrl, {
    method,
    headers: requestHeaders,
    body: requestBody,
    signal,
  });
  const responseType = response.headers.get("content-type") ?? "";
  const responseData = responseType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const error = new Error(
      responseData?.error?.message ??
        `The API request failed with status ${response.status}.`,
    );

    error.status = response.status;
    error.code = responseData?.error?.code ?? "api_request_failed";
    error.details = responseData?.error?.details;

    throw error;
  }

  return responseData;
}

// Native file downloads stream straight to disk instead of going through a
// blob, so they need the resolved URL and auth header rather than a fetch.
export function resolveApiUrl(path) {
  return `${configuredApiBaseUrl}/${path.replace(/^\//, "")}`;
}

export async function getAuthorizationHeader() {
  const idToken = await authTokenProvider();

  if (!idToken) {
    throw new Error("You must be logged in to complete this request.");
  }

  return { Authorization: `Bearer ${idToken}` };
}

export async function apiFileRequest(path) {
  const idToken = await authTokenProvider();

  if (!idToken) {
    throw new Error("You must be logged in to complete this request.");
  }

  const response = await fetch(
    `${configuredApiBaseUrl}/${path.replace(/^\//, "")}`,
    {
      headers: { Authorization: `Bearer ${idToken}` },
    },
  );

  if (!response.ok) {
    const responseType = response.headers.get("content-type") ?? "";
    const responseData = responseType.includes("application/json")
      ? await response.json()
      : null;
    throw new Error(
      responseData?.error?.message ??
        `The file download failed with status ${response.status}.`,
    );
  }

  return response.blob();
}
