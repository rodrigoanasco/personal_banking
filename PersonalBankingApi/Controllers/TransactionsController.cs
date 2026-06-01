using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonalBankingApi.Data;
using PersonalBankingApi.DTOs;
using PersonalBankingApi.Models;
using PersonalBankingApi.Services;

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
        var userId = GetCurrentUserId();
        var query = _context.Transactions
            .Where(transaction => transaction.UserId == userId);

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

        var transactions = await TransactionResponseService.ToPreparedListAsync(
            TransactionResponseService.BuildQuery(_context, query)
        );

        return Ok(transactions);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> GetTransaction(Guid id)
    {
        var userId = GetCurrentUserId();
        var transaction = await TransactionResponseService.BuildQuery(
                _context,
                _context.Transactions.Where(transaction =>
                    transaction.Id == id
                    && transaction.UserId == userId)
            )
            .FirstOrDefaultAsync();

        if (transaction == null)
        {
            return NotFound(new { message = "Transaction not found." });
        }

        return Ok(transaction);
    }

    [HttpPost]
    public async Task<ActionResult> CreateTransaction(
        [FromBody] CreateTransactionRequest request)
    {
        var validationError = ValidateCreateTransactionRequest(request);

        if (validationError != null)
        {
            return BadRequest(new { message = validationError });
        }

        var userId = GetCurrentUserId();
        var account = await _context.Accounts
            .FirstOrDefaultAsync(account =>
                account.Id == request.AccountId
                && account.UserId == userId);

        if (account == null)
        {
            return BadRequest(new { message = "Account does not exist." });
        }

        if (request.CategoryId.HasValue)
        {
            var categoryExists = await _context.Categories
                .AnyAsync(category =>
                    category.Id == request.CategoryId.Value
                    && category.UserId == userId);

            if (!categoryExists)
            {
                return BadRequest(new { message = "Category does not exist." });
            }
        }

        var now = DateTime.UtcNow;
        var merchantNormalizedName = request.MerchantNormalizedName;

        if (string.IsNullOrWhiteSpace(merchantNormalizedName)
            && !string.IsNullOrWhiteSpace(request.MerchantName))
        {
            merchantNormalizedName = NormalizeMerchantName(request.MerchantName);
        }

        var transaction = new Transaction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            AccountId = account.Id,
            CategoryId = request.CategoryId,
            MerchantName = NormalizeOptionalText(request.MerchantName),
            MerchantNormalizedName = NormalizeOptionalText(merchantNormalizedName),
            Description = NormalizeOptionalText(request.Description),
            Amount = request.Amount,
            Currency = request.Currency.Trim().ToUpperInvariant(),
            TransactionType = request.TransactionType.Trim().ToLowerInvariant(),
            TransactionDate = request.TransactionDate,
            PostedDate = request.PostedDate,
            City = NormalizeOptionalText(request.City),
            Country = NormalizeOptionalText(request.Country),
            IsPending = request.IsPending,
            Notes = NormalizeOptionalText(request.Notes),
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        var createdTransaction = await TransactionResponseService.BuildQuery(
                _context,
                _context.Transactions.Where(savedTransaction => savedTransaction.Id == transaction.Id)
            )
            .FirstAsync();

        return CreatedAtAction(
            nameof(GetTransaction),
            new { id = transaction.Id },
            createdTransaction
        );
    }

    [HttpPut("{id}/category")]
    public async Task<ActionResult> UpdateTransactionCategory(
        Guid id,
        [FromBody] UpdateTransactionCategoryRequest request)
    {
        var userId = GetCurrentUserId();
        var transaction = await _context.Transactions
            .FirstOrDefaultAsync(transaction =>
                transaction.Id == id
                && transaction.UserId == userId);

        if (transaction == null)
        {
            return NotFound(new { message = "Transaction not found." });
        }

        if (request.CategoryId.HasValue)
        {
            var categoryExists = await _context.Categories
                .AnyAsync(category =>
                    category.Id == request.CategoryId.Value
                    && category.UserId == userId);

            if (!categoryExists)
            {
                return BadRequest(new { message = "Category does not exist." });
            }
        }

        var now = DateTime.UtcNow;
        var merchantRuleAction = "skipped";
        Guid? merchantRuleId = null;

        transaction.CategoryId = request.CategoryId;
        transaction.UpdatedAt = now;

        if (request.CreateMerchantRule
            && request.CategoryId.HasValue
            && !string.IsNullOrWhiteSpace(transaction.MerchantNormalizedName))
        {
            var merchantNormalizedName = transaction.MerchantNormalizedName.Trim();
            var merchantRule = await _context.MerchantRules
                .OrderByDescending(rule => rule.UpdatedAt)
                .FirstOrDefaultAsync(rule =>
                    rule.UserId == userId
                    && rule.MerchantNormalizedName == merchantNormalizedName);

            if (merchantRule == null)
            {
                merchantRule = new MerchantRule
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    MerchantName = transaction.MerchantName,
                    MerchantNormalizedName = merchantNormalizedName,
                    CategoryId = request.CategoryId.Value,
                    MatchType = "exact",
                    CreatedAt = now,
                    UpdatedAt = now
                };

                _context.MerchantRules.Add(merchantRule);
                merchantRuleAction = "created";
            }
            else
            {
                merchantRule.CategoryId = request.CategoryId.Value;
                merchantRule.UpdatedAt = now;
                merchantRuleAction = "updated";
            }

            merchantRuleId = merchantRule.Id;
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Transaction category updated successfully.",
            transaction.Id,
            transaction.CategoryId,
            MerchantRuleAction = merchantRuleAction,
            MerchantRuleId = merchantRuleId
        });
    }

    [HttpPost("apply-merchant-rules")]
    public async Task<ActionResult> ApplyMerchantRules()
    {
        var userId = GetCurrentUserId();
        var uncategorizedTransactions = await _context.Transactions
            .Where(transaction =>
                transaction.UserId == userId
                && transaction.CategoryId == null
                && transaction.MerchantNormalizedName != null
                && transaction.MerchantNormalizedName != string.Empty)
            .ToListAsync();

        var merchantRules = await _context.MerchantRules
            .Where(rule =>
                rule.UserId == userId
                && rule.MerchantNormalizedName != string.Empty)
            .OrderByDescending(rule => rule.UpdatedAt)
            .ToListAsync();

        var rulesByUserAndMerchant = merchantRules
            .GroupBy(rule => new { rule.UserId, rule.MerchantNormalizedName })
            .ToDictionary(
                group => (group.Key.UserId, group.Key.MerchantNormalizedName),
                group => group.First()
            );

        var now = DateTime.UtcNow;
        var updatedCount = 0;

        foreach (var transaction in uncategorizedTransactions)
        {
            var merchantNormalizedName = transaction.MerchantNormalizedName?.Trim();

            if (string.IsNullOrWhiteSpace(merchantNormalizedName))
            {
                continue;
            }

            var ruleKey = (transaction.UserId, merchantNormalizedName);

            if (!rulesByUserAndMerchant.TryGetValue(ruleKey, out var merchantRule))
            {
                continue;
            }

            transaction.CategoryId = merchantRule.CategoryId;
            transaction.UpdatedAt = now;
            updatedCount++;
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Merchant rules applied successfully.",
            UpdatedCount = updatedCount
        });
    }

    private static string? ValidateCreateTransactionRequest(
        CreateTransactionRequest request)
    {
        if (request.AccountId == Guid.Empty)
        {
            return "AccountId is required.";
        }

        if (request.TransactionDate == default)
        {
            return "TransactionDate is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Currency))
        {
            return "Currency is required.";
        }

        if (string.IsNullOrWhiteSpace(request.TransactionType))
        {
            return "TransactionType is required.";
        }

        return null;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }

    private static string NormalizeMerchantName(string merchantName)
    {
        return merchantName.Trim().ToLowerInvariant();
    }

    private Guid GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.Parse(userId!);
    }
}
