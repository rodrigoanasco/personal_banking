import { Check, Save } from "lucide-react";
import {
  formatCurrency,
  formatDate,
  getSignedTransactionAmount,
  transactionTypeLabel
} from "@/lib/format";
import { EmptyState } from "./EmptyState";
import { StatusPill } from "./StatusPill";

function amountTone(transaction) {
  const type = String(transaction.transactionType || "").toLowerCase();

  if (type === "income") {
    return "income";
  }

  if (type === "expense") {
    return "expense";
  }

  return "neutral";
}

export function TransactionList({
  transactions,
  categories = [],
  editable = false,
  categorySelections = {},
  rememberSelections = {},
  savingId,
  onCategoryChange,
  onRememberChange,
  onSaveCategory
}) {
  if (!transactions || transactions.length === 0) {
    return (
      <EmptyState
        title="No transactions found"
        message="Try changing filters or add a manual transaction."
      />
    );
  }

  return (
    <div className="transaction-list">
      {transactions.map((transaction) => {
        const signedAmount = getSignedTransactionAmount(transaction);
        const selectedCategory =
          categorySelections[transaction.id] ?? transaction.categoryId ?? "";
        const rememberMerchant = rememberSelections[transaction.id] ?? false;

        return (
          <article className="transaction-row" key={transaction.id}>
            <div className="transaction-main">
              <div>
                <h3>
                  {transaction.merchantName ||
                    transaction.description ||
                    "Untitled transaction"}
                </h3>
                <p>
                  {transaction.accountName}
                  {transaction.city ? ` · ${transaction.city}` : ""}
                  {transaction.country ? `, ${transaction.country}` : ""}
                </p>
              </div>

              <div className={`transaction-amount ${amountTone(transaction)}`}>
                {formatCurrency(signedAmount, transaction.currency)}
              </div>
            </div>

            <div className="transaction-meta">
              <span>{formatDate(transaction.transactionDate)}</span>
              <StatusPill tone={amountTone(transaction)}>
                {transactionTypeLabel(transaction.transactionType)}
              </StatusPill>
              <StatusPill tone={transaction.isPending ? "warning" : "success"}>
                {transaction.isPending ? "Pending" : "Posted"}
              </StatusPill>
              <StatusPill tone={transaction.categoryName ? "neutral" : "warning"}>
                {transaction.categoryName || "Uncategorized"}
              </StatusPill>
            </div>

            {transaction.notes ? <p className="transaction-note">{transaction.notes}</p> : null}

            {editable ? (
              <div className="transaction-editor">
                <label>
                  <span>Category</span>
                  <select
                    value={selectedCategory}
                    onChange={(event) =>
                      onCategoryChange?.(transaction.id, event.target.value)
                    }
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="checkbox-control">
                  <input
                    type="checkbox"
                    checked={rememberMerchant}
                    onChange={(event) =>
                      onRememberChange?.(transaction.id, event.target.checked)
                    }
                    disabled={!transaction.merchantNormalizedName || !selectedCategory}
                  />
                  <span>Remember merchant</span>
                </label>

                <button
                  className="icon-button primary"
                  type="button"
                  onClick={() =>
                    onSaveCategory?.(transaction.id, selectedCategory, rememberMerchant)
                  }
                  disabled={savingId === transaction.id}
                  title="Save category"
                  aria-label="Save category"
                >
                  {savingId === transaction.id ? (
                    <Check size={18} aria-hidden="true" />
                  ) : (
                    <Save size={18} aria-hidden="true" />
                  )}
                </button>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
