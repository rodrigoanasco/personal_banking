export function formatCurrency(amount, currency, options = {}) {
  const normalizedCurrency = currency || "CAD";
  const value = Number(amount || 0);
  const number = new Intl.NumberFormat("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(value));
  const symbols = {
    CAD: "$",
    USD: "$",
    PEN: "S/ "
  };
  const symbol = symbols[normalizedCurrency] || "";
  const formatted = `${symbol}${number}`;

  if (options.showSign === false) {
    return `${formatted} ${normalizedCurrency}`;
  }

  const sign = value < 0 || options.negative ? "-" : options.positive ? "+" : "";
  return `${sign}${formatted} ${normalizedCurrency}`;
}

export function formatDate(dateValue) {
  if (!dateValue) {
    return "No date";
  }

  const [year, month, day] = String(dateValue).split("-").map(Number);

  if (!year || !month || !day) {
    return String(dateValue);
  }

  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(year, month - 1, day));
}

export function formatDateInput(dateValue) {
  if (!dateValue) {
    return "";
  }

  return String(dateValue).slice(0, 10);
}

export function getTransactionAmount(transaction) {
  const amount = Number(transaction?.amount || 0);
  return Math.abs(amount);
}

export function getSignedTransactionAmount(transaction) {
  const amount = getTransactionAmount(transaction);
  const type = String(transaction?.transactionType || "").toLowerCase();

  if (type === "income") {
    return amount;
  }

  if (type === "expense") {
    return -amount;
  }

  return Number(transaction?.amount || 0);
}

export function transactionTypeLabel(type) {
  const normalized = String(type || "unknown").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function normalizeMerchantName(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}
