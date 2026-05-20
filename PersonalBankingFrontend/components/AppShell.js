"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeDollarSign,
  BarChart3,
  CircleDollarSign,
  ListChecks,
  ReceiptText,
  Tags
} from "lucide-react";

const navigation = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/accounts", label: "Accounts", icon: CircleDollarSign },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/merchant-rules", label: "Merchant Rules", icon: ListChecks }
];

export function AppShell({ children }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Personal Banking Tracker">
          <span className="brand-mark">
            <BadgeDollarSign size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>Banking Tracker</strong>
            <small>Personal finance</small>
          </span>
        </Link>

        <nav className="nav" aria-label="Primary navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active ? "active" : ""}`}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
