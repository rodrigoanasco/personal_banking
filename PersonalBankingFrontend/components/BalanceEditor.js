"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { updateAccountBalance } from "@/lib/api";

export function BalanceEditor({ account, onUpdated }) {
  const [currentBalance, setCurrentBalance] = useState(
    account.currentBalance ?? ""
  );
  const [availableBalance, setAvailableBalance] = useState(
    account.availableBalance ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await updateAccountBalance(account.id, {
        currentBalance: currentBalance === "" ? null : Number(currentBalance),
        availableBalance: availableBalance === "" ? null : Number(availableBalance)
      });
      await onUpdated?.();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="inline-editor" onSubmit={handleSubmit}>
      <label>
        <span>Current</span>
        <input
          type="number"
          step="0.01"
          value={currentBalance}
          onChange={(event) => setCurrentBalance(event.target.value)}
        />
      </label>
      <label>
        <span>Available</span>
        <input
          type="number"
          step="0.01"
          value={availableBalance}
          onChange={(event) => setAvailableBalance(event.target.value)}
        />
      </label>
      <button
        className="icon-button primary"
        type="submit"
        disabled={saving}
        title="Save balance"
        aria-label="Save balance"
      >
        <Save size={18} aria-hidden="true" />
      </button>
      {error ? <p className="inline-error">{error}</p> : null}
    </form>
  );
}
