import { formatCurrency } from "@/lib/format";

export function CurrencyAmountList({ totals, valueKey, emptyLabel = "No data" }) {
  const entries = Array.isArray(totals)
    ? totals.map((item) => [
        item.currency,
        valueKey ? item[valueKey] : item.amount ?? item.currentBalance ?? 0
      ])
    : Object.entries(totals || {});

  if (entries.length === 0) {
    return <span className="muted">{emptyLabel}</span>;
  }

  return (
    <div className="currency-list">
      {entries.map(([currency, amount]) => (
        <span key={currency}>{formatCurrency(amount, currency, { showSign: false })}</span>
      ))}
    </div>
  );
}
