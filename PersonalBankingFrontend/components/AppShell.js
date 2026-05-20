"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BadgeDollarSign,
  BarChart3,
  CircleDollarSign,
  ListChecks,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
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

export function AppShell({ children, user, onLogout }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const savedValue = window.localStorage.getItem("banking-sidebar-collapsed");
    setCollapsed(savedValue === "true");
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const nextValue = !current;
      window.localStorage.setItem(
        "banking-sidebar-collapsed",
        String(nextValue)
      );
      return nextValue;
    });
  }

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <Link href="/" className="brand" aria-label="Personal Banking Tracker">
            <span className="brand-mark">
              <BadgeDollarSign size={22} aria-hidden="true" />
            </span>
            <span className="brand-copy">
              <strong>Banking Tracker</strong>
              <small>Personal finance</small>
            </span>
          </Link>

          <button
            className="sidebar-toggle"
            type="button"
            onClick={toggleSidebar}
            title={collapsed ? "Open sidebar" : "Close sidebar"}
            aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={18} aria-hidden="true" />
            )}
          </button>
        </div>

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
                title={item.label}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="signed-in-user">
            <span>{user?.fullName || "Signed in"}</span>
            <small>{user?.email}</small>
          </div>
          <button
            className="nav-link logout-link"
            type="button"
            onClick={onLogout}
            title="Log out"
          >
            <LogOut size={18} aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
