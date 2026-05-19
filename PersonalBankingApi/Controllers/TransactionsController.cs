using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonalBankingApi.Data;

namespace PersonalBankingApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TransactionsController : ControllerBase
{
    private readonly AppDbContext _context;

    public TransactionsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult> GetTransactions(
        [FromQuery] Guid? accountId,
        [FromQuery] Guid? categoryId,
        [FromQuery] string? type,
        [FromQuery] string? currency)
    {
        var query = _context.Transactions.AsQueryable();

        if (accountId.HasValue)
        {
            query = query.Where(transaction => transaction.AccountId == accountId.Value);
        }

        if (categoryId.HasValue)
        {
            query = query.Where(transaction => transaction.CategoryId == categoryId.Value);
        }

        if (!string.IsNullOrWhiteSpace(type))
        {
            query = query.Where(transaction => transaction.TransactionType == type);
        }

        if (!string.IsNullOrWhiteSpace(currency))
        {
            query = query.Where(transaction => transaction.Currency == currency);
        }

        var transactions = await query
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
                (combined, categories) => new { combined.transaction, combined.account, categories }
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
                    result.transaction.City,
                    result.transaction.Country,
                    result.transaction.IsPending,
                    result.transaction.Notes,
                    AccountId = result.account.Id,
                    AccountName = result.account.Name,
                    CategoryId = category != null ? category.Id : (Guid?)null,
                    CategoryName = category != null ? category.Name : null
                }
            )
            .OrderByDescending(transaction => transaction.TransactionDate)
            .ToListAsync();

        return Ok(transactions);
    }
}