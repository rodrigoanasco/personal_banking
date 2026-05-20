import { Search } from "lucide-react";

export function FilterPanel({ accounts, categories, filters, onChange }) {
  function updateFilter(key, value) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <section className="filter-panel">
      <label className="search-field">
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          placeholder="Search merchant, description, account"
          value={filters.search}
          onChange={(event) => updateFilter("search", event.target.value)}
        />
      </label>

      <label>
        <span>Account</span>
        <select
          value={filters.accountId}
          onChange={(event) => updateFilter("accountId", event.target.value)}
        >
          <option value="">All accounts</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Category</span>
        <select
          value={filters.categoryId}
          onChange={(event) => updateFilter("categoryId", event.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Type</span>
        <select
          value={filters.type}
          onChange={(event) => updateFilter("type", event.target.value)}
        >
          <option value="">All types</option>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
        </select>
      </label>

      <label>
        <span>Currency</span>
        <select
          value={filters.currency}
          onChange={(event) => updateFilter("currency", event.target.value)}
        >
          <option value="">All currencies</option>
          <option value="CAD">CAD</option>
          <option value="PEN">PEN</option>
          <option value="USD">USD</option>
        </select>
      </label>

      <label>
        <span>From</span>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(event) => updateFilter("dateFrom", event.target.value)}
        />
      </label>

      <label>
        <span>To</span>
        <input
          type="date"
          value={filters.dateTo}
          onChange={(event) => updateFilter("dateTo", event.target.value)}
        />
      </label>
    </section>
  );
}
