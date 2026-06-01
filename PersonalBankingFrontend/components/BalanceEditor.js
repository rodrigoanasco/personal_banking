"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import {
  updateAccountBalance,
  updateAccountPlanning
} from "@/lib/api";
import {
  getAccountPlanningLabel,
  isPlaidAccount
} from "@/lib/accounts";

export function BalanceEditor({ account, onUpdated }) {
  const [currentBalance, setCurrentBalance] = useState(
    account.currentBalance ?? ""
  );
  const [planningAmount, setPlanningAmount] = useState(
    account.planningAmount ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isSynced = isPlaidAccount(account);
  const planningLabel = getAccountPlanningLabel(account);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!isSynced) {
        await updateAccountBalance(account.id, {
          currentBalance: currentBalance === "" ? null : Number(currentBalance),
          availableBalance: currentBalance === "" ? null : Number(currentBalance)
        });
      }

      await updateAccountPlanning(account.id, {
        planningAmount: planningAmount === "" ? null : Number(planningAmount)
      });

      await onUpdated?.();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className={`inline-editor${isSynced ? " single-field" : ""}`}
      onSubmit={handleSubmit}
    >
      {!isSynced ? (
        <label>
          <span>Current</span>
          <input
            type="number"
            step="0.01"
            value={currentBalance}
            onChange={(event) => setCurrentBalance(event.target.value)}
          />
        </label>
      ) : null}
      <label>
        <span>{planningLabel}</span>
        <input
          type="number"
          step="0.01"
          value={planningAmount}
          onChange={(event) => setPlanningAmount(event.target.value)}
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
