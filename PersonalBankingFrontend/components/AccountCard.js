import { Banknote, CreditCard } from "lucide-react";
import { getAccountPlanningLabel } from "@/lib/accounts";
import { formatCurrency } from "@/lib/format";
import { StatusPill } from "./StatusPill";

export function AccountCard({ account, children }) {
  const isCredit = String(account.accountType || account.name || "")
    .toLowerCase()
    .includes("credit");
  const Icon = isCredit ? CreditCard : Banknote;
  const planningLabel = getAccountPlanningLabel(account);

  return (
    <article className="account-card">
      <div className="account-card-header">
        <div className="account-title">
          <span className="account-icon">
            <Icon size={20} aria-hidden="true" />
          </span>
          <div>
            <h3>{account.name}</h3>
            <p>{account.institutionName || "Institution not set"}</p>
          </div>
        </div>
        <StatusPill tone={account.isActive ? "success" : "neutral"}>
          {account.isActive ? "Active" : "Inactive"}
        </StatusPill>
      </div>

      <dl className="account-metrics">
        <div>
          <dt>Current</dt>
          <dd>
            {formatCurrency(account.currentBalance, account.currency, {
              showSign: false
            })}
          </dd>
        </div>
        <div>
          <dt>{planningLabel}</dt>
          <dd>
            {formatCurrency(account.planningAmount, account.currency, {
              showSign: false
            })}
          </dd>
        </div>
      </dl>

      <div className="account-meta">
        <span>{account.accountType || "Account"}</span>
        {account.accountSubtype ? <span>{account.accountSubtype}</span> : null}
        {account.country ? <span>{account.country}</span> : null}
        <span>{account.currency}</span>
      </div>

      {children}
    </article>
  );
}
