"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { createTransaction } from "@/lib/api";
import { normalizeMerchantName } from "@/lib/format";

const initialState = {
  accountId: "",
  categoryId: "",
  merchantName: "",
  merchantNormalizedName: "",
  description: "",
  amount: "",
  currency: "CAD",
  transactionType: "expense",
  transactionDate: new Date().toISOString().slice(0, 10),
  postedDate: "",
  city: "",
  country: "",
  isPending: false,
  notes: ""
};

export function ManualTransactionForm({ accounts, categories, onCreated }) {
  const [form, setForm] = useState(initialState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === form.accountId),
    [accounts, form.accountId]
  );

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "merchantName" && !current.merchantNormalizedName
        ? { merchantNormalizedName: normalizeMerchantName(value) }
        : {})
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await createTransaction({
        ...form,
        categoryId: form.categoryId || null,
        amount: Number(form.amount),
        currency: selectedAccount?.currency || form.currency,
        postedDate: form.postedDate || null
      });
      setForm({
        ...initialState,
        currency: selectedAccount?.currency || "CAD",
        transactionDate: new Date().toISOString().slice(0, 10)
      });
      await onCreated?.();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          <span>Account</span>
          <select
            value={form.accountId}
            onChange={(event) => updateField("accountId", event.target.value)}
            required
          >
            <option value="">Choose account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} · {account.currency}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Category</span>
          <select
            value={form.categoryId}
            onChange={(event) => updateField("categoryId", event.target.value)}
          >
            <option value="">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Merchant</span>
          <input
            value={form.merchantName}
            onChange={(event) => updateField("merchantName", event.target.value)}
          />
        </label>

        <label>
          <span>Normalized merchant</span>
          <input
            value={form.merchantNormalizedName}
            onChange={(event) =>
              updateField("merchantNormalizedName", event.target.value)
            }
          />
        </label>

        <label>
          <span>Amount</span>
          <input
            type="number"
            step="0.01"
            value={form.amount}
            onChange={(event) => updateField("amount", event.target.value)}
            required
          />
        </label>

        <label>
          <span>Currency</span>
          <input
            value={selectedAccount?.currency || form.currency}
            onChange={(event) => updateField("currency", event.target.value)}
            disabled={Boolean(selectedAccount)}
            required
          />
        </label>

        <label>
          <span>Type</span>
          <select
            value={form.transactionType}
            onChange={(event) =>
              updateField("transactionType", event.target.value)
            }
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </select>
        </label>

        <label>
          <span>Date</span>
          <input
            type="date"
            value={form.transactionDate}
            onChange={(event) =>
              updateField("transactionDate", event.target.value)
            }
            required
          />
        </label>

        <label>
          <span>Posted</span>
          <input
            type="date"
            value={form.postedDate}
            onChange={(event) => updateField("postedDate", event.target.value)}
          />
        </label>

        <label>
          <span>Description</span>
          <input
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
        </label>

        <label>
          <span>City</span>
          <input
            value={form.city}
            onChange={(event) => updateField("city", event.target.value)}
          />
        </label>

        <label>
          <span>Country</span>
          <input
            value={form.country}
            onChange={(event) => updateField("country", event.target.value)}
          />
        </label>
      </div>

      <label className="notes-field">
        <span>Notes</span>
        <textarea
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          rows={3}
        />
      </label>

      <div className="form-footer">
        <label className="checkbox-control">
          <input
            type="checkbox"
            checked={form.isPending}
            onChange={(event) => updateField("isPending", event.target.checked)}
          />
          <span>Pending</span>
        </label>

        <button className="button primary" type="submit" disabled={saving}>
          <Plus size={17} aria-hidden="true" />
          <span>{saving ? "Adding" : "Add transaction"}</span>
        </button>
      </div>

      {error ? <p className="inline-error">{error}</p> : null}
    </form>
  );
}
