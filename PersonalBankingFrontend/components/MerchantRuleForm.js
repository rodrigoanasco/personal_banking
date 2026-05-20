"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { createMerchantRule } from "@/lib/api";
import { normalizeMerchantName } from "@/lib/format";

const emptyForm = {
  merchantName: "",
  merchantNormalizedName: "",
  categoryId: "",
  matchType: "exact"
};

export function MerchantRuleForm({ accounts, categories, onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const userId = useMemo(() => accounts.find((account) => account.userId)?.userId, [
    accounts
  ]);

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
      if (!userId) {
        throw new Error("Create an account first so the rule can be linked.");
      }

      await createMerchantRule({
        userId,
        merchantName: form.merchantName || null,
        merchantNormalizedName: normalizeMerchantName(form.merchantNormalizedName),
        categoryId: form.categoryId,
        matchType: form.matchType
      });
      setForm(emptyForm);
      await onCreated?.();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form-card compact-form" onSubmit={handleSubmit}>
      <label>
        <span>Merchant</span>
        <input
          value={form.merchantName}
          onChange={(event) => updateField("merchantName", event.target.value)}
          required
        />
      </label>

      <label>
        <span>Normalized merchant</span>
        <input
          value={form.merchantNormalizedName}
          onChange={(event) =>
            updateField("merchantNormalizedName", event.target.value)
          }
          required
        />
      </label>

      <label>
        <span>Category</span>
        <select
          value={form.categoryId}
          onChange={(event) => updateField("categoryId", event.target.value)}
          required
        >
          <option value="">Choose category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Match</span>
        <select
          value={form.matchType}
          onChange={(event) => updateField("matchType", event.target.value)}
        >
          <option value="exact">Exact</option>
        </select>
      </label>

      <button className="button primary" type="submit" disabled={saving}>
        <Plus size={17} aria-hidden="true" />
        <span>{saving ? "Saving" : "Add rule"}</span>
      </button>

      {error ? <p className="inline-error">{error}</p> : null}
    </form>
  );
}
