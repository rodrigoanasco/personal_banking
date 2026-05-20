import { getTransactionAmount } from "./format";

export function groupByCurrency(items, valueKey = "currentBalance") {
  return items.reduce((groups, item) => {
    const currency = item.currency || "Unknown";
    const current = groups[currency] || 0;
    groups[currency] = current + Number(item[valueKey] || 0);
    return groups;
  }, {});
}

export function groupAccountsByCurrency(accounts) {
  return accounts.reduce((groups, account) => {
    const currency = account.currency || "Unknown";
    groups[currency] = groups[currency] || [];
    groups[currency].push(account);
    return groups;
  }, {});
}

export function calculateMonthlyTotalsByCurrency(transactions, date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  return transactions.reduce((totals, transaction) => {
    const transactionDate = String(transaction.transactionDate || "");
    const [transactionYear, transactionMonth] = transactionDate
      .split("-")
      .map(Number);

    if (transactionYear !== year || transactionMonth !== month) {
      return totals;
    }

    const currency = transaction.currency || "Unknown";
    totals[currency] = totals[currency] || { income: 0, expense: 0 };

    const amount = getTransactionAmount(transaction);
    const type = String(transaction.transactionType || "").toLowerCase();

    if (type === "income") {
      totals[currency].income += amount;
    }

    if (type === "expense") {
      totals[currency].expense += amount;
    }

    return totals;
  }, {});
}

export function calculateExpensesByCategory(transactions, date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  return transactions
    .filter((transaction) => {
      const [transactionYear, transactionMonth] = String(
        transaction.transactionDate || ""
      )
        .split("-")
        .map(Number);

      return (
        transactionYear === year &&
        transactionMonth === month &&
        String(transaction.transactionType || "").toLowerCase() === "expense"
      );
    })
    .reduce((groups, transaction) => {
      const key = `${transaction.categoryName || "Uncategorized"}::${
        transaction.currency || "Unknown"
      }`;

      if (!groups[key]) {
        groups[key] = {
          categoryName: transaction.categoryName || "Uncategorized",
          currency: transaction.currency || "Unknown",
          totalAmount: 0,
          transactionCount: 0
        };
      }

      groups[key].totalAmount += getTransactionAmount(transaction);
      groups[key].transactionCount += 1;
      return groups;
    }, {});
}

export function toSortedCategoryTotals(categoryGroups) {
  return Object.values(categoryGroups).sort(
    (first, second) => second.totalAmount - first.totalAmount
  );
}

export function filterTransactionsClientSide(transactions, filters) {
  const search = String(filters.search || "").toLowerCase().trim();
  const dateFrom = filters.dateFrom || "";
  const dateTo = filters.dateTo || "";

  return transactions.filter((transaction) => {
    const transactionDate = String(transaction.transactionDate || "");

    if (dateFrom && transactionDate < dateFrom) {
      return false;
    }

    if (dateTo && transactionDate > dateTo) {
      return false;
    }

    if (!search) {
      return true;
    }

    const searchableText = [
      transaction.merchantName,
      transaction.merchantNormalizedName,
      transaction.description,
      transaction.accountName,
      transaction.categoryName,
      transaction.city,
      transaction.country,
      transaction.notes
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(search);
  });
}
