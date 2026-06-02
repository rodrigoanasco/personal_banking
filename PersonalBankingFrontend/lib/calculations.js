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

export function prepareAccountsForDisplay(accounts) {
  return deduplicateAccounts(accounts || []).sort((first, second) => {
    const currencyComparison = compareAscending(first.currency, second.currency);

    if (currencyComparison !== 0) {
      return currencyComparison;
    }

    const nameComparison = compareAscending(first.name, second.name);

    if (nameComparison !== 0) {
      return nameComparison;
    }

    return compareAscending(first.id, second.id);
  });
}

export function deduplicateAccounts(accounts) {
  const accountsByKey = new Map();

  for (const account of accounts) {
    const key = getDuplicateAccountKey(account);
    const current = accountsByKey.get(key);

    if (!current || isPreferredAccount(account, current)) {
      accountsByKey.set(key, account);
    }
  }

  return Array.from(accountsByKey.values());
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

export function prepareTransactionsForDisplay(transactions) {
  return sortTransactionsNewestFirst(deduplicateTransactions(transactions || []));
}

export function deduplicateTransactions(transactions) {
  const transactionsByKey = new Map();

  for (const transaction of transactions) {
    const key = getDuplicateTransactionKey(transaction);
    const current = transactionsByKey.get(key);

    if (!current || isPreferredTransaction(transaction, current)) {
      transactionsByKey.set(key, transaction);
    }
  }

  return Array.from(transactionsByKey.values());
}

export function sortTransactionsNewestFirst(transactions) {
  return [...(transactions || [])].sort((first, second) => {
    const dateComparison = compareDescending(
      first.transactionDate,
      second.transactionDate
    );

    if (dateComparison !== 0) {
      return dateComparison;
    }

    const pendingComparison =
      Number(Boolean(first.isPending)) - Number(Boolean(second.isPending));

    if (pendingComparison !== 0) {
      return pendingComparison;
    }

    const postedDateComparison = compareDescending(
      first.postedDate,
      second.postedDate
    );

    if (postedDateComparison !== 0) {
      return postedDateComparison;
    }

    const updatedComparison = compareDescending(first.updatedAt, second.updatedAt);

    if (updatedComparison !== 0) {
      return updatedComparison;
    }

    const createdComparison = compareDescending(first.createdAt, second.createdAt);

    if (createdComparison !== 0) {
      return createdComparison;
    }

    return compareAscending(
      first.merchantName || first.description,
      second.merchantName || second.description
    );
  });
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

function isPreferredTransaction(candidate, current) {
  const pendingComparison =
    Number(Boolean(candidate.isPending)) - Number(Boolean(current.isPending));

  if (pendingComparison !== 0) {
    return pendingComparison < 0;
  }

  const categoryComparison =
    Number(Boolean(candidate.categoryId)) - Number(Boolean(current.categoryId));

  if (categoryComparison !== 0) {
    return categoryComparison > 0;
  }

  const updatedComparison = compareDescending(candidate.updatedAt, current.updatedAt);

  if (updatedComparison !== 0) {
    return updatedComparison < 0;
  }

  const createdComparison = compareDescending(candidate.createdAt, current.createdAt);

  if (createdComparison !== 0) {
    return createdComparison < 0;
  }

  return compareAscending(candidate.id, current.id) < 0;
}

function getDuplicateTransactionKey(transaction) {
  const accountKey = getDuplicateTransactionAccountKey(transaction);
  const merchantKey = normalizeKey(
    transaction.merchantNormalizedName ||
      transaction.merchantName ||
      transaction.description ||
      "unknown"
  );
  const descriptionKey = normalizeKey(transaction.description);
  const amountKey = Math.abs(Number(transaction.amount || 0)).toFixed(2);
  const activityDate = transaction.postedDate || transaction.transactionDate || "";

  return [
    accountKey,
    activityDate,
    merchantKey,
    descriptionKey,
    amountKey,
    normalizeKey(transaction.currency),
    normalizeKey(transaction.transactionType)
  ].join("|");
}

function isPreferredAccount(candidate, current) {
  const planningComparison =
    Number(hasUsefulPlanningAmount(candidate)) - Number(hasUsefulPlanningAmount(current));

  if (planningComparison !== 0) {
    return planningComparison > 0;
  }

  const activeComparison = Number(Boolean(candidate.isActive)) - Number(Boolean(current.isActive));

  if (activeComparison !== 0) {
    return activeComparison > 0;
  }

  const balanceComparison = compareDescending(
    candidate.balanceLastUpdatedAt,
    current.balanceLastUpdatedAt
  );

  if (balanceComparison !== 0) {
    return balanceComparison < 0;
  }

  const updatedComparison = compareDescending(candidate.updatedAt, current.updatedAt);

  if (updatedComparison !== 0) {
    return updatedComparison < 0;
  }

  const createdComparison = compareDescending(candidate.createdAt, current.createdAt);

  if (createdComparison !== 0) {
    return createdComparison < 0;
  }

  return compareAscending(candidate.id, current.id) < 0;
}

function hasUsefulPlanningAmount(account) {
  return Number(account?.planningAmount || 0) !== 0;
}

function getDuplicateTransactionAccountKey(transaction) {
  const provider = normalizeKey(transaction.accountProvider);

  if (provider && provider !== "plaid") {
    return transaction.accountId || "";
  }

  return [
    "account",
    provider || "unknown",
    normalizeKey(transaction.accountInstitutionName),
    normalizeKey(transaction.accountName),
    normalizeKey(transaction.accountType),
    normalizeKey(transaction.accountSubtype),
    normalizeKey(transaction.currency),
    normalizeKey(transaction.accountCountry),
    normalizeKey(transaction.accountLastFour)
  ].join("|");
}

function getDuplicateAccountKey(account) {
  const provider = normalizeKey(account.provider);

  if (provider && provider !== "plaid") {
    return account.id || "";
  }

  return [
    "account",
    provider || "unknown",
    normalizeKey(account.institutionName),
    normalizeKey(account.name),
    normalizeKey(account.accountType),
    normalizeKey(account.accountSubtype),
    normalizeKey(account.currency),
    normalizeKey(account.country),
    normalizeKey(account.lastFour)
  ].join("|");
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function compareDescending(first, second) {
  const firstValue = String(first || "");
  const secondValue = String(second || "");

  if (firstValue > secondValue) {
    return -1;
  }

  if (firstValue < secondValue) {
    return 1;
  }

  return 0;
}

function compareAscending(first, second) {
  const firstValue = String(first || "");
  const secondValue = String(second || "");

  if (firstValue < secondValue) {
    return -1;
  }

  if (firstValue > secondValue) {
    return 1;
  }

  return 0;
}
