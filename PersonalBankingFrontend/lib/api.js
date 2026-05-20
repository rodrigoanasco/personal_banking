const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5288";

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    cache: "no-store"
  });

  const contentType = response.headers.get("content-type") || "";
  const hasJson = contentType.includes("application/json");
  const data = hasJson ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(
      data?.message || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }

  return data;
}

export function login(payload) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function logout() {
  return apiRequest("/api/auth/logout", {
    method: "POST"
  });
}

export function getCurrentUser() {
  return apiRequest("/api/auth/me");
}

function appendFilter(searchParams, key, value) {
  if (value !== undefined && value !== null && value !== "") {
    searchParams.set(key, value);
  }
}

export function getAccounts() {
  return apiRequest("/api/accounts");
}

export function updateAccountBalance(accountId, payload) {
  return apiRequest(`/api/accounts/${accountId}/balance`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function getCategories() {
  return apiRequest("/api/categories");
}

export function getTransactions(filters = {}) {
  const searchParams = new URLSearchParams();
  appendFilter(searchParams, "accountId", filters.accountId);
  appendFilter(searchParams, "categoryId", filters.categoryId);
  appendFilter(searchParams, "type", filters.type);
  appendFilter(searchParams, "currency", filters.currency);

  const query = searchParams.toString();
  return apiRequest(`/api/transactions${query ? `?${query}` : ""}`);
}

export function createTransaction(payload) {
  return apiRequest("/api/transactions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateTransactionCategory(
  transactionId,
  categoryId,
  createMerchantRule
) {
  return apiRequest(`/api/transactions/${transactionId}/category`, {
    method: "PUT",
    body: JSON.stringify({
      categoryId: categoryId || null,
      createMerchantRule
    })
  });
}

export function applyMerchantRules() {
  return apiRequest("/api/transactions/apply-merchant-rules", {
    method: "POST"
  });
}

export function getMerchantRules() {
  return apiRequest("/api/merchant-rules");
}

export function createMerchantRule(payload) {
  return apiRequest("/api/merchant-rules", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getDashboardSummary() {
  return apiRequest("/api/dashboard/summary");
}

export function createPlaidLinkToken() {
  return apiRequest("/api/plaid/link-token", {
    method: "POST"
  });
}

export function exchangePlaidPublicToken(payload) {
  return apiRequest("/api/plaid/exchange-public-token", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function syncPlaidData() {
  return apiRequest("/api/plaid/sync", {
    method: "POST"
  });
}

export function getPlaidItems() {
  return apiRequest("/api/plaid/items");
}
