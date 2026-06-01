"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  WalletCards
} from "lucide-react";
import { getDashboardSummary, getTransactions } from "@/lib/api";
import {
  calculateExpensesByCategory,
  calculateMonthlyTotalsByCurrency,
  prepareTransactionsForDisplay,
  toSortedCategoryTotals
} from "@/lib/calculations";
import { formatCurrency } from "@/lib/format";
import { AccountCard } from "@/components/AccountCard";
import { CurrencyAmountList } from "@/components/CurrencyAmountList";
import { ErrorBanner } from "@/components/Feedback";
import { LoadingBlock } from "@/components/Feedback";
import { PageHeader } from "@/components/PageHeader";
import { SpendingBars } from "@/components/SpendingBars";
import { SummaryCard } from "@/components/SummaryCard";
import { TransactionList } from "@/components/TransactionList";

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [summaryData, transactionData] = await Promise.all([
        getDashboardSummary(),
        getTransactions()
      ]);
      setSummary(summaryData);
      setTransactions(transactionData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const monthlyTotals = useMemo(
    () => calculateMonthlyTotalsByCurrency(transactions),
    [transactions]
  );

  const monthlyIncome = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(monthlyTotals).map(([currency, total]) => [
          currency,
          total.income
        ])
      ),
    [monthlyTotals]
  );

  const monthlyExpenses = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(monthlyTotals).map(([currency, total]) => [
          currency,
          total.expense
        ])
      ),
    [monthlyTotals]
  );

  const expenseCategories = useMemo(
    () => toSortedCategoryTotals(calculateExpensesByCategory(transactions)),
    [transactions]
  );

  const recentTransactions = useMemo(
    () =>
      prepareTransactionsForDisplay(
        summary?.recentTransactions || transactions
      ).slice(0, 10),
    [summary?.recentTransactions, transactions]
  );

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Balances, current-month movement, and the newest transactions from the API."
        actions={
          <button className="button secondary" type="button" onClick={loadDashboard}>
            <RefreshCw size={17} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        }
      />

      <ErrorBanner message={error} />

      {loading ? (
        <LoadingBlock label="Loading dashboard" />
      ) : (
        <>
          <section className="summary-grid" aria-label="Financial summary">
            <SummaryCard icon={WalletCards} label="Available money" tone="success">
              <CurrencyAmountList
                totals={summary?.balancesByCurrency || []}
                valueKey="availableBalance"
              />
            </SummaryCard>
            <SummaryCard icon={TrendingDown} label="Monthly spending" tone="warning">
              <CurrencyAmountList
                totals={monthlyExpenses}
                emptyLabel="No expenses this month"
              />
            </SummaryCard>
            <SummaryCard icon={TrendingUp} label="Monthly income" tone="info">
              <CurrencyAmountList totals={monthlyIncome} emptyLabel="No income this month" />
            </SummaryCard>
            <SummaryCard icon={CreditCard} label="Credit cards">
              <div className="credit-limit-summary">
                <strong>
                  {formatCurrency(10000, "USD", {
                    showSign: false
                  })}
                </strong>
                <span>Card limit</span>
              </div>
            </SummaryCard>
          </section>

          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Recent transactions</h2>
                  <p>Newest activity first</p>
                </div>
              </div>
              <TransactionList
                transactions={recentTransactions}
              />
            </section>

            <div className="panel-stack">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Spending by category</h2>
                    <p>Current month, grouped by currency</p>
                  </div>
                </div>
                <SpendingBars categories={expenseCategories} />
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Accounts</h2>
                    <p>Balances stay separated by currency</p>
                  </div>
                </div>
                <div className="account-grid">
                  {(summary?.accountBalances || []).slice(0, 3).map((account) => (
                    <AccountCard key={account.id} account={account} />
                  ))}
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </>
  );
}
