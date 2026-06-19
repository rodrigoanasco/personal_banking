"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ExternalLink,
  Heart,
  Plus,
  RefreshCw,
  Repeat,
  Target,
  Trash2
} from "lucide-react";
import {
  createWishlistItem,
  deleteWishlistItem,
  getWishlistItems,
  getWishlistSubscriptions
} from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { CurrencyAmountList } from "@/components/CurrencyAmountList";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner, LoadingBlock, SuccessBanner } from "@/components/Feedback";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { SummaryCard } from "@/components/SummaryCard";

const initialForm = {
  name: "",
  price: "",
  currency: "CAD",
  category: "Extra",
  priority: "3",
  url: "",
  savedAmount: "",
  targetDate: "",
  description: ""
};

const priorityLabels = {
  1: "1 - Buy first",
  2: "2 - High",
  3: "3 - Medium",
  4: "4 - Low",
  5: "5 - Later"
};

export default function WishlistPage() {
  const [items, setItems] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadWishlist = useCallback(async () => {
    setError("");

    try {
      const [itemData, subscriptionData] = await Promise.all([
        getWishlistItems(),
        getWishlistSubscriptions()
      ]);
      setItems(itemData);
      setSubscriptions(subscriptionData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const totalsByCurrency = useMemo(
    () => sumByCurrency(items, "price"),
    [items]
  );
  const remainingByCurrency = useMemo(
    () => sumByCurrency(items, "remainingAmount"),
    [items]
  );
  const subscriptionTotalsByCurrency = useMemo(
    () => sumByCurrency(subscriptions, "estimatedMonthlyAmount"),
    [subscriptions]
  );
  const groupedItems = useMemo(() => groupWishlistItems(items), [items]);
  const topPriorityItem = useMemo(
    () =>
      [...items].sort(
        (first, second) =>
          first.priority - second.priority ||
          first.name.localeCompare(second.name)
      )[0],
    [items]
  );

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await createWishlistItem({
        name: form.name,
        description: form.description || null,
        category: form.category || "Extra",
        url: form.url || null,
        price: Number(form.price),
        currency: form.currency,
        priority: Number(form.priority),
        savedAmount: Number(form.savedAmount || 0),
        targetDate: form.targetDate || null
      });
      setForm(initialForm);
      await loadWishlist();
      setSuccess("Wishlist item added.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(item) {
    setDeletingId(item.id);
    setError("");
    setSuccess("");

    try {
      await deleteWishlistItem(item.id);
      await loadWishlist();
      setSuccess(`${item.name} deleted.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Planning"
        title="Wishlist"
        description="Prioritized purchases, extra savings targets, and subscription signals from transaction history."
        actions={
          <button className="button secondary" type="button" onClick={loadWishlist}>
            <RefreshCw size={17} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        }
      />

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      {loading ? (
        <LoadingBlock label="Loading wishlist" />
      ) : (
        <div className="panel-stack">
          <section className="summary-grid" aria-label="Wishlist summary">
            <SummaryCard icon={Heart} label="Wishlist total" tone="info">
              <CurrencyAmountList
                totals={totalsByCurrency}
                emptyLabel="No wishlist items"
              />
            </SummaryCard>
            <SummaryCard icon={Target} label="Still to save" tone="warning">
              <CurrencyAmountList
                totals={remainingByCurrency}
                emptyLabel="Nothing to save yet"
              />
            </SummaryCard>
            <SummaryCard icon={Repeat} label="Subscriptions">
              <CurrencyAmountList
                totals={subscriptionTotalsByCurrency}
                emptyLabel="No subscriptions found"
              />
            </SummaryCard>
            <SummaryCard icon={Calendar} label="Buy first">
              {topPriorityItem ? (
                <div className="wishlist-top-item">
                  <strong>{topPriorityItem.name}</strong>
                  <span>
                    {formatCurrency(topPriorityItem.price, topPriorityItem.currency, {
                      showSign: false
                    })}
                  </span>
                </div>
              ) : (
                <span className="muted">No items</span>
              )}
            </SummaryCard>
          </section>

          <div className="wishlist-layout">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Wishlist by category</h2>
                  <p>{items.length} items</p>
                </div>
              </div>

              {items.length === 0 ? (
                <EmptyState
                  title="No wishlist items"
                  message="Add the first item to start planning."
                />
              ) : (
                <div className="wishlist-category-stack">
                  {Object.entries(groupedItems).map(([category, categoryItems]) => (
                    <section className="wishlist-category" key={category}>
                      <div className="wishlist-category-header">
                        <div>
                          <h3>{category}</h3>
                          <p>{categoryItems.length} items</p>
                        </div>
                        <CurrencyAmountList
                          totals={sumByCurrency(categoryItems, "remainingAmount")}
                          emptyLabel="Paid"
                        />
                      </div>

                      <div className="wishlist-grid">
                        {categoryItems.map((item) => (
                          <article className="wishlist-item" key={item.id}>
                            <div className="wishlist-item-header">
                              <div>
                                <h4>{item.name}</h4>
                                {item.description ? <p>{item.description}</p> : null}
                              </div>
                              <StatusPill tone={item.priority <= 2 ? "warning" : "neutral"}>
                                {priorityLabels[item.priority] || `Priority ${item.priority}`}
                              </StatusPill>
                            </div>

                            <dl className="wishlist-metrics">
                              <div>
                                <dt>Price</dt>
                                <dd>
                                  {formatCurrency(item.price, item.currency, {
                                    showSign: false
                                  })}
                                </dd>
                              </div>
                              <div>
                                <dt>Saved</dt>
                                <dd>
                                  {formatCurrency(item.savedAmount, item.currency, {
                                    showSign: false
                                  })}
                                </dd>
                              </div>
                              <div>
                                <dt>Remaining</dt>
                                <dd>
                                  {formatCurrency(item.remainingAmount, item.currency, {
                                    showSign: false
                                  })}
                                </dd>
                              </div>
                              <div>
                                <dt>Monthly</dt>
                                <dd>
                                  {item.monthlySavingsNeeded
                                    ? formatCurrency(
                                        item.monthlySavingsNeeded,
                                        item.currency,
                                        { showSign: false }
                                      )
                                    : "No target"}
                                </dd>
                              </div>
                            </dl>

                            <div className="wishlist-item-footer">
                              <span className="muted">
                                {item.targetDate
                                  ? `Target ${formatDate(item.targetDate)}`
                                  : "No target date"}
                              </span>
                              <div className="wishlist-actions">
                                {item.url ? (
                                  <a
                                    className="icon-button"
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Open link"
                                    aria-label={`Open ${item.name} link`}
                                  >
                                    <ExternalLink size={17} aria-hidden="true" />
                                  </a>
                                ) : null}
                                <button
                                  className="icon-button"
                                  type="button"
                                  onClick={() => removeItem(item)}
                                  disabled={deletingId === item.id}
                                  title="Delete item"
                                  aria-label={`Delete ${item.name}`}
                                >
                                  <Trash2 size={17} aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </section>

            <div className="panel-stack">
              <aside className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Add item</h2>
                    <p>Default category is Extra</p>
                  </div>
                </div>

                <form className="form-card" onSubmit={handleSubmit}>
                  <div className="form-grid">
                    <label>
                      <span>Name</span>
                      <input
                        value={form.name}
                        onChange={(event) => updateField("name", event.target.value)}
                        required
                      />
                    </label>

                    <label>
                      <span>Price</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(event) => updateField("price", event.target.value)}
                        required
                      />
                    </label>

                    <label>
                      <span>Currency</span>
                      <input
                        value={form.currency}
                        onChange={(event) => updateField("currency", event.target.value)}
                        required
                      />
                    </label>

                    <label>
                      <span>Category</span>
                      <input
                        value={form.category}
                        onChange={(event) => updateField("category", event.target.value)}
                      />
                    </label>

                    <label>
                      <span>Priority</span>
                      <select
                        value={form.priority}
                        onChange={(event) => updateField("priority", event.target.value)}
                      >
                        {Object.entries(priorityLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>Saved</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.savedAmount}
                        onChange={(event) =>
                          updateField("savedAmount", event.target.value)
                        }
                      />
                    </label>

                    <label>
                      <span>Target date</span>
                      <input
                        type="date"
                        value={form.targetDate}
                        onChange={(event) =>
                          updateField("targetDate", event.target.value)
                        }
                      />
                    </label>

                    <label>
                      <span>URL</span>
                      <input
                        type="url"
                        value={form.url}
                        onChange={(event) => updateField("url", event.target.value)}
                      />
                    </label>
                  </div>

                  <label className="notes-field">
                    <span>Description</span>
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        updateField("description", event.target.value)
                      }
                      rows={3}
                    />
                  </label>

                  <div className="form-footer">
                    <span className="muted">Priority 1 appears first.</span>
                    <button className="button primary" type="submit" disabled={saving}>
                      <Plus size={17} aria-hidden="true" />
                      <span>{saving ? "Adding" : "Add item"}</span>
                    </button>
                  </div>
                </form>
              </aside>

              <aside className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Subscriptions</h2>
                    <p>{subscriptions.length} detected</p>
                  </div>
                </div>

                {subscriptions.length === 0 ? (
                  <EmptyState
                    title="No subscriptions found"
                    message="Recurring expenses will appear here after transactions sync."
                  />
                ) : (
                  <div className="subscription-list">
                    {subscriptions.map((subscription) => (
                      <article
                        className="subscription-item"
                        key={`${subscription.merchantKey}-${subscription.currency}`}
                      >
                        <div>
                          <h3>{subscription.name}</h3>
                          <p>
                            {subscription.accountName || "Account"} /{" "}
                            {subscription.categoryName || "Uncategorized"}
                          </p>
                        </div>
                        <strong>
                          {formatCurrency(
                            subscription.estimatedMonthlyAmount,
                            subscription.currency,
                            { showSign: false }
                          )}
                        </strong>
                        <div className="subscription-meta">
                          <span>{subscription.paymentCount} payments</span>
                          <span>Last {formatDate(subscription.lastPaymentDate)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function sumByCurrency(items, valueKey) {
  return items.reduce((totals, item) => {
    const currency = item.currency || "Unknown";
    totals[currency] = (totals[currency] || 0) + Number(item[valueKey] || 0);
    return totals;
  }, {});
}

function groupWishlistItems(items) {
  return [...items]
    .sort(
      (first, second) =>
        first.priority - second.priority ||
        first.name.localeCompare(second.name)
    )
    .reduce((groups, item) => {
      const category = item.category || "Extra";
      groups[category] = groups[category] || [];
      groups[category].push(item);
      return groups;
    }, {});
}
