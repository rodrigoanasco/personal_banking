import { getSignedTransactionAmount } from "./format";

const transactionColumns = [
  ["Transaction Date", (transaction) => transaction.transactionDate],
  ["Posted Date", (transaction) => transaction.postedDate],
  ["Merchant", (transaction) => transaction.merchantName],
  ["Merchant Normalized", (transaction) => transaction.merchantNormalizedName],
  ["Description", (transaction) => transaction.description],
  ["Amount", (transaction) => formatNumber(transaction.amount)],
  ["Signed Amount", (transaction) => formatNumber(getSignedTransactionAmount(transaction))],
  ["Currency", (transaction) => transaction.currency],
  ["Type", (transaction) => transaction.transactionType],
  ["Category", (transaction) => transaction.categoryName],
  ["Account", (transaction) => transaction.accountName],
  ["Institution", (transaction) => transaction.accountInstitutionName],
  ["Account Type", (transaction) => transaction.accountType],
  ["Account Subtype", (transaction) => transaction.accountSubtype],
  ["Account Last Four", (transaction) => transaction.accountLastFour],
  ["Account Country", (transaction) => transaction.accountCountry],
  ["Account Provider", (transaction) => transaction.accountProvider],
  ["Pending", (transaction) => (transaction.isPending ? "Yes" : "No")],
  ["City", (transaction) => transaction.city],
  ["Country", (transaction) => transaction.country],
  ["Notes", (transaction) => transaction.notes],
  ["Transaction ID", (transaction) => transaction.id],
  ["User ID", (transaction) => transaction.userId],
  ["Account ID", (transaction) => transaction.accountId],
  ["Category ID", (transaction) => transaction.categoryId],
  ["Created At", (transaction) => transaction.createdAt],
  ["Updated At", (transaction) => transaction.updatedAt]
];

export function buildTransactionsCsv(transactions) {
  const rows = [
    transactionColumns.map(([header]) => header),
    ...(transactions || []).map((transaction) =>
      transactionColumns.map(([, getValue]) => getValue(transaction))
    )
  ];

  return `${rows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n")}\r\n`;
}

export function filterTransactionsByMonth(transactions, monthValue) {
  if (!monthValue) {
    return transactions || [];
  }

  return (transactions || []).filter(
    (transaction) => getTransactionMonth(transaction) === monthValue
  );
}

export function getTransactionMonthOptions(transactions) {
  const monthCounts = new Map();

  for (const transaction of transactions || []) {
    const month = getTransactionMonth(transaction);

    if (month) {
      monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
    }
  }

  return Array.from(monthCounts.entries())
    .sort(([first], [second]) => second.localeCompare(first))
    .map(([value, count]) => ({
      value,
      label: formatMonthLabel(value),
      count
    }));
}

function getTransactionMonth(transaction) {
  const dateValue = String(transaction?.transactionDate || "");
  const match = dateValue.match(/^(\d{4})-(\d{2})-\d{2}$/);

  return match ? `${match[1]}-${match[2]}` : "";
}

function formatMonthLabel(monthValue) {
  const [year, month] = String(monthValue).split("-").map(Number);

  if (!year || !month) {
    return monthValue;
  }

  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    year: "numeric"
  }).format(new Date(year, month - 1, 1));
}

function formatNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number.toFixed(2) : "";
}

function escapeCsvValue(value) {
  if (value === undefined || value === null) {
    return "";
  }

  const stringValue = String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}
