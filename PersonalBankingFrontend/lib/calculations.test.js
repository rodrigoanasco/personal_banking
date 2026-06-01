import { describe, expect, it } from "vitest";
import {
  calculateExpensesByCategory,
  calculateMonthlyTotalsByCurrency,
  filterTransactionsClientSide,
  groupAccountsByCurrency,
  prepareTransactionsForDisplay
} from "./calculations";
import { formatCurrency } from "./format";

describe("frontend finance calculations", () => {
  it("keeps monthly totals separated by currency", () => {
    const transactions = [
      {
        amount: 100,
        currency: "CAD",
        transactionType: "income",
        transactionDate: "2026-05-04"
      },
      {
        amount: 25,
        currency: "CAD",
        transactionType: "expense",
        transactionDate: "2026-05-05"
      },
      {
        amount: 40,
        currency: "PEN",
        transactionType: "expense",
        transactionDate: "2026-05-06"
      },
      {
        amount: 999,
        currency: "CAD",
        transactionType: "expense",
        transactionDate: "2026-04-06"
      }
    ];

    expect(
      calculateMonthlyTotalsByCurrency(transactions, new Date(2026, 4, 20))
    ).toEqual({
      CAD: { income: 100, expense: 25 },
      PEN: { income: 0, expense: 40 }
    });
  });

  it("groups accounts by currency", () => {
    const grouped = groupAccountsByCurrency([
      { name: "Checking", currency: "CAD" },
      { name: "Savings", currency: "CAD" },
      { name: "Credit Card", currency: "PEN" }
    ]);

    expect(grouped.CAD).toHaveLength(2);
    expect(grouped.PEN).toHaveLength(1);
  });

  it("filters transactions by search text and date range", () => {
    const transactions = [
      {
        merchantName: "Tim Hortons",
        description: "Coffee",
        transactionDate: "2026-05-10"
      },
      {
        merchantName: "BCP",
        description: "Payment",
        transactionDate: "2026-05-14"
      }
    ];

    expect(
      filterTransactionsClientSide(transactions, {
        search: "coffee",
        dateFrom: "2026-05-01",
        dateTo: "2026-05-12"
      })
    ).toEqual([transactions[0]]);
  });

  it("groups current-month expenses by category and currency", () => {
    const result = calculateExpensesByCategory(
      [
        {
          amount: 12,
          currency: "CAD",
          categoryName: "Food",
          transactionType: "expense",
          transactionDate: "2026-05-01"
        },
        {
          amount: 8,
          currency: "CAD",
          categoryName: "Food",
          transactionType: "expense",
          transactionDate: "2026-05-02"
        },
        {
          amount: 30,
          currency: "PEN",
          categoryName: "Food",
          transactionType: "expense",
          transactionDate: "2026-05-03"
        }
      ],
      new Date(2026, 4, 20)
    );

    expect(result["Food::CAD"].totalAmount).toBe(20);
    expect(result["Food::PEN"].totalAmount).toBe(30);
  });

  it("sorts transactions newest first and hides exact duplicate activity", () => {
    const transactions = [
      {
        id: "older",
        accountId: "checking",
        merchantName: "Coffee",
        description: "Coffee",
        amount: 4.5,
        currency: "CAD",
        transactionType: "expense",
        transactionDate: "2026-05-30",
        createdAt: "2026-05-30T18:00:00Z",
        updatedAt: "2026-05-30T18:00:00Z"
      },
      {
        id: "posted-subway",
        accountId: "checking",
        merchantName: "Subway",
        merchantNormalizedName: "subway",
        description: "Subway",
        amount: 18.63,
        currency: "CAD",
        transactionType: "expense",
        transactionDate: "2026-06-01",
        isPending: false,
        createdAt: "2026-06-01T12:00:00Z",
        updatedAt: "2026-06-01T12:10:00Z"
      },
      {
        id: "duplicate-subway",
        accountId: "checking",
        merchantName: "Subway",
        merchantNormalizedName: "subway",
        description: "Subway",
        amount: 18.63,
        currency: "CAD",
        transactionType: "expense",
        transactionDate: "2026-06-01",
        isPending: true,
        createdAt: "2026-06-01T12:00:00Z",
        updatedAt: "2026-06-01T12:00:00Z"
      }
    ];

    expect(prepareTransactionsForDisplay(transactions).map((item) => item.id)).toEqual([
      "posted-subway",
      "older"
    ]);
  });

  it("formats PEN without putting PEN at the front", () => {
    expect(formatCurrency(120.5, "PEN", { showSign: false })).toBe(
      "S/ 120.50 PEN"
    );
  });
});
