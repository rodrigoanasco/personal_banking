"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getCategories, getTransactions } from "@/lib/api";
import { ErrorBanner, LoadingBlock } from "@/components/Feedback";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCategories = useCallback(async () => {
    setError("");

    try {
      const [categoryData, transactionData] = await Promise.all([
        getCategories(),
        getTransactions()
      ]);
      setCategories(categoryData);
      setTransactions(transactionData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const usageByCategory = useMemo(
    () =>
      transactions.reduce((counts, transaction) => {
        if (transaction.categoryId) {
          counts[transaction.categoryId] = (counts[transaction.categoryId] || 0) + 1;
        }

        return counts;
      }, {}),
    [transactions]
  );

  return (
    <>
      <PageHeader
        eyebrow="Labels"
        title="Categories"
        description="Readable spending labels used across transactions and merchant rules."
        actions={
          <button className="button secondary" type="button" onClick={loadCategories}>
            <RefreshCw size={17} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        }
      />

      <ErrorBanner message={error} />

      {loading ? (
        <LoadingBlock label="Loading categories" />
      ) : (
        <section className="category-grid">
          {categories.map((category) => (
            <article className="category-item" key={category.id}>
              <div className="category-title">
                <span
                  className="category-swatch"
                  style={{ backgroundColor: category.color || "#dfe8e2" }}
                  aria-hidden="true"
                />
                <h3>{category.name}</h3>
              </div>
              <p>{category.type || "Type not set"}</p>
              <div className="transaction-meta">
                <StatusPill tone={category.isActive ? "success" : "neutral"}>
                  {category.isActive ? "Active" : "Inactive"}
                </StatusPill>
                <StatusPill>
                  {usageByCategory[category.id] || 0} transactions
                </StatusPill>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
