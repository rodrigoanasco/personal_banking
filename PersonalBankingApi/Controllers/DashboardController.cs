using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonalBankingApi.Data;
using PersonalBankingApi.Services;

namespace PersonalBankingApi.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;

    public DashboardController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("summary")]
    public async Task<ActionResult> GetSummary()
    {
        var userId = GetCurrentUserId();
        var today = DateTime.UtcNow;
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var nextMonthStart = monthStart.AddMonths(1);

        var accountBalances = await _context.Accounts
            .Where(account => account.UserId == userId)
            .OrderBy(account => account.Name)
            .Select(account => new
            {
                account.Id,
                account.Name,
                account.InstitutionName,
                account.AccountType,
                account.AccountSubtype,
                account.Currency,
                account.CurrentBalance,
                account.AvailableBalance,
                account.PlanningAmount,
                account.BalanceLastUpdatedAt,
                account.IsActive
            })
            .ToListAsync();

        var balancesByCurrency = await _context.Accounts
            .Where(account => account.UserId == userId)
            .GroupBy(account => account.Currency)
            .Select(group => new
            {
                Currency = group.Key,
                CurrentBalance = group.Sum(account => account.CurrentBalance ?? 0m),
                AvailableBalance = group.Sum(account => account.AvailableBalance ?? 0m),
                AccountCount = group.Count()
            })
            .OrderBy(balance => balance.Currency)
            .ToListAsync();

        var preparedTransactions = await TransactionResponseService.ToPreparedListAsync(
            TransactionResponseService.BuildQuery(
                _context,
                _context.Transactions.Where(transaction => transaction.UserId == userId)
            )
        );

        var currentMonthTransactions = preparedTransactions
            .Where(transaction =>
                transaction.TransactionDate >= monthStart
                && transaction.TransactionDate < nextMonthStart)
            .ToList();

        var totalExpenses = currentMonthTransactions
            .Where(transaction => transaction.TransactionType.ToLowerInvariant() == "expense")
            .Sum(transaction => Math.Abs(transaction.Amount));

        var totalIncome = currentMonthTransactions
            .Where(transaction => transaction.TransactionType.ToLowerInvariant() == "income")
            .Sum(transaction => Math.Abs(transaction.Amount));

        var expensesByCategory = currentMonthTransactions
            .Where(transaction => transaction.TransactionType.ToLowerInvariant() == "expense")
            .GroupBy(transaction => new
            {
                transaction.CategoryId,
                CategoryName = transaction.CategoryName ?? "Uncategorized"
            })
            .Select(group => new
            {
                group.Key.CategoryId,
                group.Key.CategoryName,
                TotalAmount = group.Sum(transaction => Math.Abs(transaction.Amount)),
                TransactionCount = group.Count()
            })
            .OrderByDescending(category => category.TotalAmount)
            .ToList();

        var recentTransactions = preparedTransactions
            .Take(10)
            .ToList();

        return Ok(new
        {
            Month = new
            {
                Year = monthStart.Year,
                Month = monthStart.Month,
                StartDate = monthStart,
                EndDateExclusive = nextMonthStart
            },
            BalancesByCurrency = balancesByCurrency,
            AccountBalances = accountBalances,
            TotalExpenses = totalExpenses,
            TotalIncome = totalIncome,
            ExpensesByCategory = expensesByCategory,
            RecentTransactions = recentTransactions
        });
    }

    private Guid GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.Parse(userId!);
    }
}
