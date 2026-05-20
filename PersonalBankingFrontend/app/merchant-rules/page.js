"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getAccounts, getCategories, getMerchantRules } from "@/lib/api";
import { ErrorBanner, LoadingBlock } from "@/components/Feedback";
import { MerchantRuleForm } from "@/components/MerchantRuleForm";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";

export default function MerchantRulesPage() {
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRules = useCallback(async () => {
    setError("");

    try {
      const [accountData, categoryData, ruleData] = await Promise.all([
        getAccounts(),
        getCategories(),
        getMerchantRules()
      ]);
      setAccounts(accountData);
      setCategories(categoryData);
      setRules(ruleData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  return (
    <>
      <PageHeader
        eyebrow="Automation"
        title="Merchant Rules"
        description="Saved merchant preferences used to categorize future transactions."
        actions={
          <button className="button secondary" type="button" onClick={loadRules}>
            <RefreshCw size={17} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        }
      />

      <ErrorBanner message={error} />

      <div className="split-layout">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Saved rules</h2>
              <p>{rules.length} rules</p>
            </div>
          </div>

          {loading ? (
            <LoadingBlock label="Loading merchant rules" />
          ) : (
            <div className="rules-grid">
              {rules.map((rule) => (
                <article className="rule-item" key={rule.id}>
                  <h3>{rule.merchantName || rule.merchantNormalizedName}</h3>
                  <p>{rule.merchantNormalizedName}</p>
                  <div className="transaction-meta">
                    <StatusPill>{rule.categoryName}</StatusPill>
                    <StatusPill>{rule.matchType}</StatusPill>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="panel">
          <div className="panel-header">
            <div>
              <h2>Add rule</h2>
              <p>Link a merchant to a category</p>
            </div>
          </div>
          <MerchantRuleForm
            accounts={accounts}
            categories={categories}
            onCreated={loadRules}
          />
        </aside>
      </div>
    </>
  );
}
