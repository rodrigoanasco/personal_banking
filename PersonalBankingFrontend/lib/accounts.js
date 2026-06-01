function getAccountKind(account) {
  return [
    account.accountSubtype,
    account.accountType,
    account.name
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function getAccountPlanningLabel(account) {
  const kind = getAccountKind(account);

  if (kind.includes("saving")) {
    return "Initial";
  }

  if (kind.includes("checking") || kind.includes("chequing")) {
    return "Monthly limit";
  }

  if (kind.includes("credit")) {
    return "Credit limit";
  }

  return "Reference";
}

export function isPlaidAccount(account) {
  return String(account.provider || "").toLowerCase() === "plaid";
}
