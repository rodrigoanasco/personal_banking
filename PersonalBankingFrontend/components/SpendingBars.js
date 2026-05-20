import { formatCurrency } from "@/lib/format";
import { EmptyState } from "./EmptyState";

export function SpendingBars({ categories }) {
  if (!categories || categories.length === 0) {
    return (
      <EmptyState
        title="No spending yet"
        message="Current-month category totals will appear here."
      />
    );
  }

  const maxAmount = Math.max(
    ...categories.map((category) => Number(category.totalAmount || 0)),
    1
  );

  return (
    <div className="spending-bars">
      {categories.slice(0, 8).map((category) => {
        const width = `${Math.max(
          6,
          (Number(category.totalAmount || 0) / maxAmount) * 100
        )}%`;

        return (
          <div
            className="spending-row"
            key={`${category.categoryName}-${category.currency}`}
          >
            <div className="spending-row-top">
              <span>{category.categoryName}</span>
              <strong>
                {formatCurrency(category.totalAmount, category.currency, {
                  showSign: false
                })}
              </strong>
            </div>
            <div className="bar-track" aria-hidden="true">
              <span className="bar-fill" style={{ width }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
