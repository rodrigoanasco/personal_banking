using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonalBankingApi.Data;

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

        var currentMonthTransactions = _context.Transactions
            .Where(transaction =>
                transaction.UserId == userId
                && transaction.TransactionDate >= monthStart
                && transaction.TransactionDate < nextMonthStart);

        var totalExpenses = await currentMonthTransactions
            .Where(transaction => transaction.TransactionType.ToLower() == "expense")
            .SumAsync(transaction =>
                transaction.Amount < 0m
                    ? -transaction.Amount
                    : transaction.Amount);

        var totalIncome = await currentMonthTransactions
            .Where(transaction => transaction.TransactionType.ToLower() == "income")
            .SumAsync(transaction =>
                transaction.Amount < 0m
                    ? -transaction.Amount
                    : transaction.Amount);

        var expensesByCategory = await currentMonthTransactions
            .Where(transaction => transaction.TransactionType.ToLower() == "expense")
            .GroupJoin(
                _context.Categories,
                transaction => transaction.CategoryId,
                category => category.Id,
                (transaction, categories) => new
                {
                    transaction,
                    categories
                }
            )
            .SelectMany(
                result => result.categories.DefaultIfEmpty(),
                (result, category) => new
                {
                    result.transaction,
                    category
                }
            )
            .GroupBy(result => new
            {
                CategoryId = result.category != null ? result.category.Id : (Guid?)null,
                CategoryName = result.category != null
                    ? result.category.Name
                    : "Uncategorized"
            })
            .Select(group => new
            {
                group.Key.CategoryId,
                group.Key.CategoryName,
                TotalAmount = group.Sum(result =>
                    result.transaction.Amount < 0m
                        ? -result.transaction.Amount
                        : result.transaction.Amount),
                TransactionCount = group.Count()
            })
            .OrderByDescending(category => category.TotalAmount)
            .ToListAsync();

        var recentTransactions = await _context.Transactions
            .Where(transaction => transaction.UserId == userId)
            .Join(
                _context.Accounts,
                transaction => transaction.AccountId,
                account => account.Id,
                (transaction, account) => new { transaction, account }
            )
            .GroupJoin(
                _context.Categories,
                combined => combined.transaction.CategoryId,
                category => category.Id,
                (combined, categories) => new
                {
                    combined.transaction,
                    combined.account,
                    categories
                }
            )
            .SelectMany(
                result => result.categories.DefaultIfEmpty(),
                (result, category) => new
                {
                    result.transaction.Id,
                    result.transaction.TransactionDate,
                    result.transaction.MerchantName,
                    result.transaction.MerchantNormalizedName,
                    result.transaction.Description,
                    result.transaction.Amount,
                    result.transaction.Currency,
                    result.transaction.TransactionType,
                    result.transaction.IsPending,
                    AccountId = result.account.Id,
                    AccountName = result.account.Name,
                    CategoryId = category != null ? category.Id : (Guid?)null,
                    CategoryName = category != null ? category.Name : null
                }
            )
            .OrderByDescending(transaction => transaction.TransactionDate)
            .Take(10)
            .ToListAsync();

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
