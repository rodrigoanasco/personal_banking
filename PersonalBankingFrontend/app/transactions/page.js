"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Layers, RefreshCw } from "lucide-react";
import {
  applyMerchantRules,
  getAccounts,
  getCategories,
  getTransactions,
  updateTransactionCategory
} from "@/lib/api";
import {
  filterTransactionsClientSide,
  prepareAccountsForDisplay,
  prepareTransactionsForDisplay
} from "@/lib/calculations";
import {
  buildTransactionsCsv,
  filterTransactionsByMonth,
  getTransactionMonthOptions
} from "@/lib/csv";
import { ErrorBanner, LoadingBlock, SuccessBanner } from "@/components/Feedback";
import { FilterPanel } from "@/components/FilterPanel";
import { ManualTransactionForm } from "@/components/ManualTransactionForm";
import { PageHeader } from "@/components/PageHeader";
import { TransactionList } from "@/components/TransactionList";

const initialFilters = {
  accountId: "",
  categoryId: "",
  type: "",
  currency: "",
  search: "",
  dateFrom: "",
  dateTo: ""
};

export default function TransactionsPage() {
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [categorySelections, setCategorySelections] = useState({});
  const [rememberSelections, setRememberSelections] = useState({});
  const [exportMonth, setExportMonth] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadTransactions = useCallback(async () => {
    setError("");

    try {
      const [accountData, categoryData, transactionData] = await Promise.all([
        getAccounts(),
        getCategories(),
        getTransactions(filters)
      ]);

      setAccounts(prepareAccountsForDisplay(accountData));
      setCategories(categoryData);
      setTransactions(transactionData);
      setCategorySelections(
        Object.fromEntries(
          transactionData.map((transaction) => [
            transaction.id,
            transaction.categoryId || ""
          ])
        )
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [filters.accountId, filters.categoryId, filters.type, filters.currency]);

  useEffect(() => {
    setLoading(true);
    loadTransactions();
  }, [loadTransactions]);

  const filteredTransactions = useMemo(
    () => prepareTransactionsForDisplay(
      filterTransactionsClientSide(transactions, filters)
    ),
    [transactions, filters]
  );

  const exportMonthOptions = useMemo(
    () => getTransactionMonthOptions(filteredTransactions),
    [filteredTransactions]
  );

  useEffect(() => {
    if (exportMonthOptions.length === 0) {
      setExportMonth("");
      return;
    }

    if (!exportMonthOptions.some((option) => option.value === exportMonth)) {
      setExportMonth(exportMonthOptions[0].value);
    }
  }, [exportMonth, exportMonthOptions]);

  const monthlyExportTransactions = useMemo(
    () => filterTransactionsByMonth(filteredTransactions, exportMonth),
    [filteredTransactions, exportMonth]
  );

  async function saveCategory(transactionId, categoryId, rememberMerchant) {
    setSavingId(transactionId);
    setError("");
    setSuccess("");

    try {
      const result = await updateTransactionCategory(
        transactionId,
        categoryId,
        rememberMerchant
      );
      await loadTransactions();
      setSuccess(
        result.merchantRuleAction === "created" ||
          result.merchantRuleAction === "updated"
          ? `Category saved and merchant rule ${result.merchantRuleAction}.`
          : "Category saved."
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingId(null);
    }
  }

  async function runMerchantRules() {
    setError("");
    setSuccess("");

    try {
      const result = await applyMerchantRules();
      await loadTransactions();
      setSuccess(`${result.updatedCount || 0} transactions updated.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function exportMonthlyCsv() {
    if (!monthlyExportTransactions.length || !exportMonth) {
      return;
    }

    const csv = buildTransactionsCsv(monthlyExportTransactions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = url;
    downloadLink.download = `transactions-${exportMonth}.csv`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(url);
    setSuccess(
      `${monthlyExportTransactions.length} transactions exported for ${exportMonth}.`
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Transaction manager"
        title="Transactions"
        description="Filter activity, assign categories, and save merchant preferences as you clean up spending."
        actions={
          <>
            <button className="button secondary" type="button" onClick={loadTransactions}>
              <RefreshCw size={17} aria-hidden="true" />
              <span>Refresh</span>
            </button>
            <button className="button primary" type="button" onClick={runMerchantRules}>
              <Layers size={17} aria-hidden="true" />
              <span>Apply rules</span>
            </button>
          </>
        }
      />

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <div className="split-layout">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>All transactions</h2>
              <p>{filteredTransactions.length} visible</p>
            </div>

            <div className="export-controls">
              <select
                value={exportMonth}
                onChange={(event) => setExportMonth(event.target.value)}
                disabled={exportMonthOptions.length === 0}
                aria-label="Export month"
              >
                {exportMonthOptions.length === 0 ? (
                  <option value="">No months</option>
                ) : (
                  exportMonthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.count})
                    </option>
                  ))
                )}
              </select>
              <button
                className="button secondary"
                type="button"
                onClick={exportMonthlyCsv}
                disabled={monthlyExportTransactions.length === 0}
              >
                <Download size={17} aria-hidden="true" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          <FilterPanel
            accounts={accounts}
            categories={categories}
            filters={filters}
            onChange={setFilters}
          />

          {loading ? (
            <LoadingBlock label="Loading transactions" />
          ) : (
            <TransactionList
              transactions={filteredTransactions}
              categories={categories}
              editable
              categorySelections={categorySelections}
              rememberSelections={rememberSelections}
              savingId={savingId}
              onCategoryChange={(transactionId, value) =>
                setCategorySelections((current) => ({
                  ...current,
                  [transactionId]: value
                }))
              }
              onRememberChange={(transactionId, value) =>
                setRememberSelections((current) => ({
                  ...current,
                  [transactionId]: value
                }))
              }
              onSaveCategory={saveCategory}
            />
          )}
        </section>

        <aside className="panel">
          <div className="panel-header">
            <div>
              <h2>Add transaction</h2>
              <p>Manual entries for testing and real data prep</p>
            </div>
          </div>
          <ManualTransactionForm
            accounts={accounts}
            categories={categories}
            onCreated={loadTransactions}
          />
        </aside>
      </div>
    </>
  );
}
