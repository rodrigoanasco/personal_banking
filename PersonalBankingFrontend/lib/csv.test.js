import { describe, expect, it } from "vitest";
import {
  buildTransactionsCsv,
  filterTransactionsByMonth,
  getTransactionMonthOptions
} from "./csv";

describe("transaction CSV exports", () => {
  it("builds a spreadsheet-friendly CSV with escaped transaction details", () => {
    const csv = buildTransactionsCsv([
      {
        id: "transaction-1",
        accountId: "account-1",
        accountName: "Checking, CAD",
        accountInstitutionName: "Scotiabank",
        accountType: "depository",
        accountSubtype: "checking",
        accountLastFour: "1234",
        categoryId: "category-1",
        categoryName: "Food",
        merchantName: 'Cafe "North"',
        description: "Coffee\nCroissant",
        amount: 12.5,
        currency: "CAD",
        transactionType: "expense",
        transactionDate: "2026-05-14",
        postedDate: "2026-05-15",
        isPending: false,
        city: "Toronto",
        country: "CA",
        notes: "weekday breakfast",
        createdAt: "2026-05-14T12:00:00Z",
        updatedAt: "2026-05-14T12:00:00Z"
      }
    ]);

    expect(csv).toContain('"Cafe ""North"""');
    expect(csv).toContain('"Coffee\nCroissant"');
    expect(csv).toContain("-12.50");
    expect(csv).toContain('"Checking, CAD"');
  });

  it("lists available months newest first and filters transactions by month", () => {
    const transactions = [
      { id: "may-1", transactionDate: "2026-05-14" },
      { id: "june-1", transactionDate: "2026-06-01" },
      { id: "may-2", transactionDate: "2026-05-02" }
    ];

    expect(getTransactionMonthOptions(transactions)).toEqual([
      { value: "2026-06", label: "June 2026", count: 1 },
      { value: "2026-05", label: "May 2026", count: 2 }
    ]);
    expect(filterTransactionsByMonth(transactions, "2026-05").map((item) => item.id))
      .toEqual(["may-1", "may-2"]);
  });
});
