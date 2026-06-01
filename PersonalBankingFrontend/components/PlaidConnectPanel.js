"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, RefreshCw } from "lucide-react";
import { usePlaidLink } from "react-plaid-link";
import {
  createPlaidLinkToken,
  exchangePlaidPublicToken,
  getPlaidItems,
  syncPlaidData
} from "@/lib/api";
import { ErrorBanner, SuccessBanner } from "./Feedback";
import { StatusPill } from "./StatusPill";

export function PlaidConnectPanel({ onSynced }) {
  const [linkToken, setLinkToken] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loadingToken, setLoadingToken] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      setItems(await getPlaidItems());
    } catch {
      setItems([]);
    }
  }, []);

  const loadLinkToken = useCallback(async () => {
    setLoadingToken(true);
    setError("");

    try {
      const result = await createPlaidLinkToken();
      setLinkToken(result.linkToken);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingToken(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
    loadLinkToken();
  }, [loadItems, loadLinkToken]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      setError("");
      setSuccess("");

      try {
        const institution = metadata?.institution;
        const result = await exchangePlaidPublicToken({
          publicToken,
          institutionId: institution?.institution_id || null,
          institutionName: institution?.name || null
        });
        setSuccess(
          `Linked ${result.institutionName || "Plaid item"} and synced ${
            result.accountsUpdated || 0
          } accounts.`
        );
        await loadItems();
        await onSynced?.();
      } catch (requestError) {
        setError(requestError.message);
      }
    },
    onExit: (errorResult) => {
      if (errorResult) {
        setError(errorResult.display_message || errorResult.error_message);
      }
    }
  });

  async function handleSync() {
    setSyncing(true);
    setError("");
    setSuccess("");

    try {
      const result = await syncPlaidData();
      setSuccess(
        `Sync complete: ${result.accountsUpdated || 0} accounts, ${
          result.transactionsAdded || 0
        } new transactions.`
      );
      await loadItems();
      await onSynced?.();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Bank connection</h2>
          <p>Plaid connection for account and transaction sync</p>
        </div>
      </div>

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <div className="plaid-actions">
        <button
          className="button primary"
          type="button"
          onClick={() => open()}
          disabled={!ready || loadingToken}
        >
          <Link2 size={17} aria-hidden="true" />
          <span>{loadingToken ? "Preparing" : "Connect with Plaid"}</span>
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={handleSync}
          disabled={syncing || items.length === 0}
        >
          <RefreshCw size={17} aria-hidden="true" />
          <span>{syncing ? "Syncing" : "Sync now"}</span>
        </button>
      </div>

      <div className="rules-grid">
        {items.length === 0 ? (
          <p className="muted">No Plaid items linked yet.</p>
        ) : (
          items.map((item) => (
            <article className="rule-item" key={item.id}>
              <h3>{item.institutionName || "Plaid item"}</h3>
              <p>{item.institutionId || item.itemId}</p>
              <div className="transaction-meta">
                <StatusPill>Linked</StatusPill>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
