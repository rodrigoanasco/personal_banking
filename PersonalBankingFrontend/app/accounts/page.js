"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getAccounts } from "@/lib/api";
import { groupAccountsByCurrency, groupByCurrency } from "@/lib/calculations";
import { AccountCard } from "@/components/AccountCard";
import { BalanceEditor } from "@/components/BalanceEditor";
import { CurrencyAmountList } from "@/components/CurrencyAmountList";
import { ErrorBanner, LoadingBlock } from "@/components/Feedback";
import { PageHeader } from "@/components/PageHeader";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAccounts = useCallback(async () => {
    setError("");

    try {
      setAccounts(await getAccounts());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const accountsByCurrency = useMemo(
    () => groupAccountsByCurrency(accounts),
    [accounts]
  );
  const currentTotals = useMemo(
    () => groupByCurrency(accounts, "currentBalance"),
    [accounts]
  );
  const availableTotals = useMemo(
    () => groupByCurrency(accounts, "availableBalance"),
    [accounts]
  );

  return (
    <>
      <PageHeader
        eyebrow="Money sources"
        title="Accounts"
        description="Balances stay grouped by currency so CAD and PEN are never mixed."
        actions={
          <button className="button secondary" type="button" onClick={loadAccounts}>
            <RefreshCw size={17} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        }
      />

      <ErrorBanner message={error} />

      {loading ? (
        <LoadingBlock label="Loading accounts" />
      ) : (
        <div className="panel-stack">
          <section className="summary-grid" aria-label="Account totals">
            <div className="summary-card success">
              <div className="summary-label">Current balances</div>
              <div className="summary-value">
                <CurrencyAmountList totals={currentTotals} />
              </div>
            </div>
            <div className="summary-card info">
              <div className="summary-label">Available balances</div>
              <div className="summary-value">
                <CurrencyAmountList totals={availableTotals} />
              </div>
            </div>
          </section>

          {Object.entries(accountsByCurrency).map(([currency, group]) => (
            <section className="panel" key={currency}>
              <div className="panel-header">
                <div>
                  <h2>{currency}</h2>
                  <p>{group.length} accounts</p>
                </div>
              </div>
              <div className="account-grid">
                {group.map((account) => (
                  <AccountCard key={account.id} account={account}>
                    <BalanceEditor account={account} onUpdated={loadAccounts} />
                  </AccountCard>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
