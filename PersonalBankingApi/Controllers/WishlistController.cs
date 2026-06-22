using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonalBankingApi.Data;
using PersonalBankingApi.DTOs;
using PersonalBankingApi.Models;
using PersonalBankingApi.Services;

namespace PersonalBankingApi.Controllers;

[ApiController]
[Route("api/wishlist")]
[Route("api/whishlist")]
public class WishlistController : ControllerBase
{
    private static readonly (string Keyword, string DisplayName)[] KnownSubscriptionKeywords =
    {
        ("spotify", "Spotify"),
        ("netflix", "Netflix"),
        ("youtube", "YouTube"),
        ("google", "Google"),
        ("apple", "Apple"),
        ("icloud", "iCloud"),
        ("amazon prime", "Amazon Prime"),
        ("disney", "Disney"),
        ("hulu", "Hulu"),
        ("openai", "OpenAI"),
        ("chatgpt", "ChatGPT"),
        ("notion", "Notion"),
        ("github", "GitHub"),
        ("microsoft", "Microsoft")
    };

    private readonly AppDbContext _context;

    public WishlistController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("items")]
    public async Task<ActionResult<List<WishlistItemResponse>>> GetItems()
    {
        await EnsureWishlistStorageAsync();

        var userId = GetCurrentUserId();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var items = await _context.WishlistItems
            .Where(item => item.UserId == userId)
            .OrderBy(item => item.Category)
            .ThenBy(item => item.Priority)
            .ThenBy(item => item.Name)
            .ToListAsync();

        return Ok(items.Select(item => ToResponse(item, today)).ToList());
    }

    [HttpPost("items")]
    public async Task<ActionResult<WishlistItemResponse>> CreateItem(
        [FromBody] CreateWishlistItemRequest request)
    {
        var validationError = ValidateCreateRequest(request);

        if (validationError != null)
        {
            return BadRequest(new { message = validationError });
        }

        await EnsureWishlistStorageAsync();

        var userId = GetCurrentUserId();
        var now = DateTime.UtcNow;
        var item = new WishlistItem
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = request.Name.Trim(),
            Description = NormalizeOptionalText(request.Description),
            Category = NormalizeOptionalText(request.Category) ?? "Extra",
            Url = NormalizeOptionalText(request.Url),
            Price = request.Price,
            Currency = NormalizeCurrency(request.Currency),
            Priority = request.Priority,
            SavedAmount = request.SavedAmount,
            TargetDate = request.TargetDate,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.WishlistItems.Add(item);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetItems),
            new { id = item.Id },
            ToResponse(item, DateOnly.FromDateTime(now))
        );
    }

    [HttpDelete("items/{id}")]
    public async Task<ActionResult> DeleteItem(Guid id)
    {
        await EnsureWishlistStorageAsync();

        var userId = GetCurrentUserId();
        var item = await _context.WishlistItems
            .FirstOrDefaultAsync(item =>
                item.Id == id
                && item.UserId == userId);

        if (item == null)
        {
            return NotFound(new { message = "Wishlist item not found." });
        }

        _context.WishlistItems.Remove(item);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("subscriptions")]
    public async Task<ActionResult<List<SubscriptionInsightResponse>>> GetSubscriptions()
    {
        var userId = GetCurrentUserId();
        var cutoffDate = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(-12);
        var transactions = await TransactionResponseService.BuildQuery(
                _context,
                _context.Transactions.Where(transaction =>
                    transaction.UserId == userId
                    && transaction.TransactionDate >= cutoffDate)
            )
            .ToListAsync();

        var subscriptionCandidates = transactions
            .Where(transaction =>
                transaction.TransactionType.Equals(
                    "expense",
                    StringComparison.OrdinalIgnoreCase))
            .Select(transaction => new SubscriptionCandidate(
                transaction,
                GetSubscriptionKey(transaction),
                transaction.Currency))
            .Where(candidate => !string.IsNullOrWhiteSpace(candidate.MerchantKey))
            .GroupBy(candidate => new SubscriptionGroupKey(
                candidate.MerchantKey,
                candidate.Currency))
            .Select(group => BuildSubscriptionInsight(group))
            .Where(subscription =>
                subscription.IsKnownSubscription
                || subscription.IsLikelyRecurring)
            .OrderByDescending(subscription => subscription.IsKnownSubscription)
            .ThenByDescending(subscription => subscription.EstimatedMonthlyAmount)
            .ThenBy(subscription => subscription.Name)
            .ToList();

        return Ok(subscriptionCandidates);
    }

    private async Task EnsureWishlistStorageAsync()
    {
        await _context.Database.ExecuteSqlRawAsync("""
            create table if not exists wishlist_items (
                id uuid primary key,
                user_id uuid not null references users(id) on delete cascade,
                name text not null,
                description text null,
                category text not null default 'Extra',
                url text null,
                price numeric(14, 2) not null default 0,
                currency varchar(3) not null default 'CAD',
                priority integer not null default 3 check (priority between 1 and 5),
                saved_amount numeric(14, 2) not null default 0,
                target_date date null,
                created_at timestamp with time zone not null default now(),
                updated_at timestamp with time zone not null default now()
            );

            create index if not exists ix_wishlist_items_user_category_priority
            on wishlist_items(user_id, category, priority, name);
            """);
    }

    private static string? ValidateCreateRequest(CreateWishlistItemRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return "Name is required.";
        }

        if (request.Price < 0)
        {
            return "Price cannot be negative.";
        }

        if (request.SavedAmount < 0)
        {
            return "Saved amount cannot be negative.";
        }

        if (request.Priority is < 1 or > 5)
        {
            return "Priority must be between 1 and 5.";
        }

        return null;
    }

    private static WishlistItemResponse ToResponse(WishlistItem item, DateOnly today)
    {
        var remainingAmount = Math.Max(item.Price - item.SavedAmount, 0m);

        return new WishlistItemResponse
        {
            Id = item.Id,
            Name = item.Name,
            Description = item.Description,
            Category = item.Category,
            Url = item.Url,
            Price = item.Price,
            Currency = item.Currency,
            Priority = item.Priority,
            SavedAmount = item.SavedAmount,
            RemainingAmount = remainingAmount,
            MonthlySavingsNeeded = CalculateMonthlySavingsNeeded(
                remainingAmount,
                item.TargetDate,
                today),
            TargetDate = item.TargetDate,
            CreatedAt = item.CreatedAt,
            UpdatedAt = item.UpdatedAt
        };
    }

    private static decimal? CalculateMonthlySavingsNeeded(
        decimal remainingAmount,
        DateOnly? targetDate,
        DateOnly today)
    {
        if (remainingAmount <= 0 || !targetDate.HasValue)
        {
            return null;
        }

        if (targetDate.Value <= today)
        {
            return remainingAmount;
        }

        var monthCount =
            ((targetDate.Value.Year - today.Year) * 12)
            + targetDate.Value.Month
            - today.Month;

        if (targetDate.Value.Day > today.Day)
        {
            monthCount++;
        }

        return Math.Round(remainingAmount / Math.Max(monthCount, 1), 2);
    }

    private static SubscriptionInsightResponse BuildSubscriptionInsight(
        IGrouping<SubscriptionGroupKey, SubscriptionCandidate> group)
    {
        var orderedPayments = group
            .Select(candidate => candidate.Transaction)
            .OrderByDescending(transaction => transaction.TransactionDate)
            .ToList();
        var latestPayment = orderedPayments.First();
        var knownDisplayName = GetKnownSubscriptionName(group.Key.MerchantKey);
        var monthlyAmounts = orderedPayments
            .GroupBy(transaction =>
                $"{transaction.TransactionDate.Year}-{transaction.TransactionDate.Month:00}")
            .Select(month => month.Sum(transaction => Math.Abs(transaction.Amount)))
            .ToList();

        return new SubscriptionInsightResponse
        {
            Name = knownDisplayName
                ?? ToTitleCase(
                    latestPayment.MerchantName
                    ?? latestPayment.Description
                    ?? group.Key.MerchantKey),
            MerchantKey = group.Key.MerchantKey,
            Currency = group.Key.Currency,
            EstimatedMonthlyAmount = Math.Round(monthlyAmounts.Average(), 2),
            LatestAmount = Math.Abs(latestPayment.Amount),
            LastPaymentDate = latestPayment.TransactionDate,
            PaymentCount = orderedPayments.Count,
            MonthsSeen = monthlyAmounts.Count,
            IsKnownSubscription = knownDisplayName != null,
            IsLikelyRecurring = orderedPayments.Count >= 2 && monthlyAmounts.Count >= 2,
            AccountName = latestPayment.AccountName,
            AccountType = latestPayment.AccountType,
            CategoryName = latestPayment.CategoryName
        };
    }

    private sealed record SubscriptionCandidate(
        TransactionResponse Transaction,
        string MerchantKey,
        string Currency);

    private sealed record SubscriptionGroupKey(string MerchantKey, string Currency);

    private static string GetSubscriptionKey(TransactionResponse transaction)
    {
        var rawValue = NormalizeOptionalText(
            transaction.MerchantNormalizedName
            ?? transaction.MerchantName
            ?? transaction.Description);

        if (rawValue == null)
        {
            return string.Empty;
        }

        var normalizedValue = rawValue.ToLowerInvariant();
        var knownSubscription = KnownSubscriptionKeywords
            .FirstOrDefault(subscription =>
                normalizedValue.Contains(subscription.Keyword));

        if (knownSubscription.Keyword != null)
        {
            return knownSubscription.Keyword;
        }

        return string.Join(
            " ",
            normalizedValue
                .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Take(3)
        );
    }

    private static string? GetKnownSubscriptionName(string merchantKey)
    {
        return KnownSubscriptionKeywords
            .FirstOrDefault(subscription => subscription.Keyword == merchantKey)
            .DisplayName;
    }

    private static string ToTitleCase(string value)
    {
        return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(
            value.Trim().ToLowerInvariant()
        );
    }

    private static string NormalizeCurrency(string? currency)
    {
        return string.IsNullOrWhiteSpace(currency)
            ? "CAD"
            : currency.Trim().ToUpperInvariant();
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }

    private Guid GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.Parse(userId!);
    }
}
