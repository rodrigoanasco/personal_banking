using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonalBankingApi.Data;
using PersonalBankingApi.DTOs;
using PersonalBankingApi.Models;
using PersonalBankingApi.Services;

namespace PersonalBankingApi.Controllers;

[ApiController]
[Route("api/plaid")]
public class PlaidController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly PlaidService _plaidService;

    public PlaidController(AppDbContext context, PlaidService plaidService)
    {
        _context = context;
        _plaidService = plaidService;
    }

    [HttpPost("link-token")]
    public async Task<ActionResult> CreateLinkToken()
    {
        try
        {
            var userId = GetCurrentUserId();
            var linkToken = await _plaidService.CreateLinkTokenAsync(userId);

            return Ok(new { LinkToken = linkToken });
        }
        catch (PlaidConfigurationException error)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = error.Message }
            );
        }
        catch (PlaidApiException error)
        {
            return StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = error.Message }
            );
        }
    }

    [HttpGet("items")]
    public async Task<ActionResult> GetItems()
    {
        var userId = GetCurrentUserId();
        var items = await _context.PlaidItems
            .Where(item => item.UserId == userId)
            .OrderBy(item => item.InstitutionName)
            .Select(item => new
            {
                item.Id,
                item.ItemId,
                item.InstitutionId,
                item.InstitutionName,
                item.CreatedAt,
                item.UpdatedAt
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("exchange-public-token")]
    public async Task<ActionResult> ExchangePublicToken(
        [FromBody] ExchangePlaidPublicTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PublicToken))
        {
            return BadRequest(new { message = "PublicToken is required." });
        }

        var userId = GetCurrentUserId();
        var now = DateTime.UtcNow;
        PlaidExchangeResult exchangeResult;

        try
        {
            exchangeResult = await _plaidService.ExchangePublicTokenAsync(
                request.PublicToken
            );
        }
        catch (PlaidConfigurationException error)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = error.Message }
            );
        }
        catch (PlaidApiException error)
        {
            return StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = error.Message }
            );
        }

        var plaidItem = await _context.PlaidItems
            .FirstOrDefaultAsync(item =>
                item.UserId == userId
                && item.ItemId == exchangeResult.ItemId);

        if (plaidItem == null)
        {
            plaidItem = new PlaidItem
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ItemId = exchangeResult.ItemId,
                AccessToken = exchangeResult.AccessToken,
                InstitutionId = NormalizeOptionalText(request.InstitutionId),
                InstitutionName = NormalizeOptionalText(request.InstitutionName),
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.PlaidItems.Add(plaidItem);
        }
        else
        {
            plaidItem.AccessToken = exchangeResult.AccessToken;
            plaidItem.InstitutionId = NormalizeOptionalText(request.InstitutionId);
            plaidItem.InstitutionName = NormalizeOptionalText(request.InstitutionName);
            plaidItem.UpdatedAt = now;
        }

        await _context.SaveChangesAsync();

        PlaidSyncSummary syncResult;

        try
        {
            syncResult = await SyncPlaidItemAsync(plaidItem);
        }
        catch (PlaidConfigurationException error)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = error.Message }
            );
        }
        catch (PlaidApiException error)
        {
            return StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = error.Message }
            );
        }

        return Ok(new
        {
            message = "Plaid account linked successfully.",
            plaidItem.Id,
            plaidItem.InstitutionName,
            syncResult.AccountsUpdated,
            syncResult.TransactionsAdded,
            syncResult.TransactionsUpdated,
            syncResult.TransactionsRemoved
        });
    }

    [HttpPost("sync")]
    public async Task<ActionResult> Sync()
    {
        var userId = GetCurrentUserId();
        var items = await _context.PlaidItems
            .Where(item => item.UserId == userId)
            .ToListAsync();

        var totals = new PlaidSyncSummary();

        try
        {
            foreach (var item in items)
            {
                var itemResult = await SyncPlaidItemAsync(item);
                totals.AccountsUpdated += itemResult.AccountsUpdated;
                totals.TransactionsAdded += itemResult.TransactionsAdded;
                totals.TransactionsUpdated += itemResult.TransactionsUpdated;
                totals.TransactionsRemoved += itemResult.TransactionsRemoved;
            }
        }
        catch (PlaidConfigurationException error)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = error.Message }
            );
        }
        catch (PlaidApiException error)
        {
            return StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = error.Message }
            );
        }

        return Ok(new
        {
            message = "Plaid sync completed.",
            totals.AccountsUpdated,
            totals.TransactionsAdded,
            totals.TransactionsUpdated,
            totals.TransactionsRemoved
        });
    }

    private async Task<PlaidSyncSummary> SyncPlaidItemAsync(PlaidItem plaidItem)
    {
        var accountCount = await SyncAccountsAsync(plaidItem);
        var transactionResult = await SyncTransactionsAsync(plaidItem);

        return new PlaidSyncSummary
        {
            AccountsUpdated = accountCount,
            TransactionsAdded = transactionResult.TransactionsAdded,
            TransactionsUpdated = transactionResult.TransactionsUpdated,
            TransactionsRemoved = transactionResult.TransactionsRemoved
        };
    }

    private async Task<int> SyncAccountsAsync(PlaidItem plaidItem)
    {
        var userId = GetCurrentUserId();
        var accounts = await _plaidService.GetAccountsAsync(plaidItem.AccessToken);
        var now = DateTime.UtcNow;
        var existingPlaidAccounts = await _context.Accounts
            .Where(account =>
                account.UserId == userId
                && account.Provider == "plaid")
            .ToListAsync();
        var updatedCount = 0;

        foreach (var plaidAccount in accounts.EnumerateArray())
        {
            var providerAccountId = GetString(plaidAccount, "account_id");

            if (string.IsNullOrWhiteSpace(providerAccountId))
            {
                continue;
            }

            var balances = plaidAccount.GetProperty("balances");
            var currency = GetString(balances, "iso_currency_code")
                ?? GetString(balances, "unofficial_currency_code")
                ?? "CAD";
            var incomingAccount = new Account
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Provider = "plaid",
                ProviderAccountId = providerAccountId,
                Name = GetString(plaidAccount, "name") ?? "Plaid account",
                InstitutionName = plaidItem.InstitutionName ?? "Plaid",
                AccountType = GetString(plaidAccount, "type") ?? "unknown",
                AccountSubtype = GetString(plaidAccount, "subtype"),
                Currency = currency,
                LastFour = GetLastFour(GetString(plaidAccount, "mask")),
                Country = currency == "PEN" ? "PE" : "CA",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            };
            var matchingAccounts = existingPlaidAccounts
                .Where(account =>
                    account.ProviderAccountId == providerAccountId
                    || AccountDisplayService.AreDuplicates(account, incomingAccount))
                .ToList();
            var account = matchingAccounts.Count > 0
                ? AccountDisplayService.ChoosePreferredAccount(matchingAccounts)
                : null;

            if (account == null)
            {
                account = new Account
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Provider = "plaid",
                    CreatedAt = now,
                    IsActive = true
                };

                _context.Accounts.Add(account);
                existingPlaidAccounts.Add(account);
            }

            account.ProviderAccountId = providerAccountId;
            account.Name = incomingAccount.Name;
            account.InstitutionName = incomingAccount.InstitutionName;
            account.AccountType = incomingAccount.AccountType;
            account.AccountSubtype = incomingAccount.AccountSubtype;
            account.Currency = incomingAccount.Currency;
            account.LastFour = incomingAccount.LastFour;
            account.Country = incomingAccount.Country;
            account.CurrentBalance = GetDecimal(balances, "current");
            account.AvailableBalance = GetDecimal(balances, "available");
            account.BalanceLastUpdatedAt = now;
            account.IsActive = true;
            account.UpdatedAt = now;
            updatedCount++;
        }

        await _context.SaveChangesAsync();
        return updatedCount;
    }

    private async Task<PlaidSyncSummary> SyncTransactionsAsync(PlaidItem plaidItem)
    {
        var userId = GetCurrentUserId();
        var syncResult = await _plaidService.SyncTransactionsAsync(
            plaidItem.AccessToken,
            plaidItem.TransactionsCursor
        );
        var now = DateTime.UtcNow;
        var addedCount = 0;
        var updatedCount = 0;
        var removedCount = 0;

        foreach (var plaidTransaction in syncResult.Added)
        {
            var result = await UpsertTransactionAsync(
                userId,
                plaidTransaction,
                now
            );

            if (result == TransactionUpsertResult.Added)
            {
                addedCount++;
            }
            else if (result == TransactionUpsertResult.Updated)
            {
                updatedCount++;
            }
        }

        foreach (var plaidTransaction in syncResult.Modified)
        {
            var result = await UpsertTransactionAsync(
                userId,
                plaidTransaction,
                now
            );

            if (result == TransactionUpsertResult.Added)
            {
                addedCount++;
            }
            else if (result == TransactionUpsertResult.Updated)
            {
                updatedCount++;
            }
        }

        foreach (var removedTransaction in syncResult.Removed)
        {
            var externalTransactionId = GetString(
                removedTransaction,
                "transaction_id"
            );

            if (string.IsNullOrWhiteSpace(externalTransactionId))
            {
                continue;
            }

            var transaction = await _context.Transactions
                .FirstOrDefaultAsync(transaction =>
                    transaction.UserId == userId
                    && transaction.ExternalTransactionId == externalTransactionId);

            if (transaction != null)
            {
                _context.Transactions.Remove(transaction);
                removedCount++;
            }
        }

        plaidItem.TransactionsCursor = syncResult.NextCursor;
        plaidItem.UpdatedAt = now;
        await _context.SaveChangesAsync();

        return new PlaidSyncSummary
        {
            TransactionsAdded = addedCount,
            TransactionsUpdated = updatedCount,
            TransactionsRemoved = removedCount
        };
    }

    private async Task<TransactionUpsertResult> UpsertTransactionAsync(
        Guid userId,
        JsonElement plaidTransaction,
        DateTime now)
    {
        var externalTransactionId = GetString(plaidTransaction, "transaction_id");
        var pendingTransactionId = GetString(plaidTransaction, "pending_transaction_id");
        var providerAccountId = GetString(plaidTransaction, "account_id");

        if (string.IsNullOrWhiteSpace(externalTransactionId)
            || string.IsNullOrWhiteSpace(providerAccountId))
        {
            return TransactionUpsertResult.Skipped;
        }

        var account = await FindSyncedPlaidAccountAsync(userId, providerAccountId);

        if (account == null)
        {
            return TransactionUpsertResult.Skipped;
        }

        var transaction = await _context.Transactions
            .FirstOrDefaultAsync(transaction =>
                transaction.UserId == userId
                && transaction.ExternalTransactionId == externalTransactionId);

        var result = TransactionUpsertResult.Updated;

        if (transaction == null)
        {
            transaction = await FindPendingReplacementAsync(
                userId,
                pendingTransactionId
            );
        }
        else
        {
            await RemovePendingReplacementDuplicateAsync(
                userId,
                pendingTransactionId,
                transaction.Id
            );
        }

        if (transaction == null)
        {
            transaction = new Transaction
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                AccountId = account.Id,
                CreatedAt = now
            };

            _context.Transactions.Add(transaction);
            result = TransactionUpsertResult.Added;
        }

        transaction.ExternalTransactionId = externalTransactionId;

        var amount = GetDecimal(plaidTransaction, "amount") ?? 0m;
        var merchantName = GetString(plaidTransaction, "merchant_name")
            ?? GetString(plaidTransaction, "name");

        transaction.AccountId = account.Id;
        transaction.MerchantName = merchantName;
        transaction.MerchantNormalizedName = NormalizeMerchantName(merchantName);
        transaction.Description = GetString(plaidTransaction, "name");
        transaction.Amount = Math.Abs(amount);
        transaction.Currency = GetString(plaidTransaction, "iso_currency_code")
            ?? GetString(plaidTransaction, "unofficial_currency_code")
            ?? account.Currency;
        transaction.TransactionType = amount < 0m ? "income" : "expense";
        transaction.TransactionDate = DateOnly.Parse(
            GetString(plaidTransaction, "date")!
        );
        transaction.PostedDate = GetDateOnly(plaidTransaction, "authorized_date");
        transaction.City = GetNestedString(plaidTransaction, "location", "city");
        transaction.Country = GetNestedString(plaidTransaction, "location", "country");
        transaction.IsPending = GetBoolean(plaidTransaction, "pending") ?? false;
        transaction.UpdatedAt = now;

        return result;
    }

    private async Task<Account?> FindSyncedPlaidAccountAsync(
        Guid userId,
        string providerAccountId)
    {
        var accounts = await _context.Accounts
            .Where(account =>
                account.UserId == userId
                && account.Provider == "plaid"
                && account.ProviderAccountId == providerAccountId)
            .ToListAsync();

        return accounts.Count > 0
            ? AccountDisplayService.ChoosePreferredAccount(accounts)
            : null;
    }

    private async Task<Transaction?> FindPendingReplacementAsync(
        Guid userId,
        string? pendingTransactionId)
    {
        if (string.IsNullOrWhiteSpace(pendingTransactionId))
        {
            return null;
        }

        return await _context.Transactions
            .FirstOrDefaultAsync(transaction =>
                transaction.UserId == userId
                && transaction.ExternalTransactionId == pendingTransactionId);
    }

    private async Task RemovePendingReplacementDuplicateAsync(
        Guid userId,
        string? pendingTransactionId,
        Guid keepTransactionId)
    {
        if (string.IsNullOrWhiteSpace(pendingTransactionId))
        {
            return;
        }

        var duplicate = await _context.Transactions
            .FirstOrDefaultAsync(transaction =>
                transaction.UserId == userId
                && transaction.Id != keepTransactionId
                && transaction.ExternalTransactionId == pendingTransactionId);

        if (duplicate != null)
        {
            _context.Transactions.Remove(duplicate);
        }
    }

    private Guid GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.Parse(userId!);
    }

    private static string? GetString(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var property)
            && property.ValueKind == JsonValueKind.String
            ? property.GetString()
            : null;
    }

    private static string? GetNestedString(
        JsonElement element,
        string objectName,
        string propertyName)
    {
        return element.TryGetProperty(objectName, out var nested)
            ? GetString(nested, propertyName)
            : null;
    }

    private static decimal? GetDecimal(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var property)
            && property.ValueKind == JsonValueKind.Number
            ? property.GetDecimal()
            : null;
    }

    private static bool? GetBoolean(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var property)
            && property.ValueKind is JsonValueKind.True or JsonValueKind.False
            ? property.GetBoolean()
            : null;
    }

    private static DateOnly? GetDateOnly(JsonElement element, string propertyName)
    {
        var value = GetString(element, propertyName);

        return string.IsNullOrWhiteSpace(value)
            ? null
            : DateOnly.Parse(value);
    }

    private static string? GetLastFour(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Length <= 4
            ? value
            : value[^4..];
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }

    private static string? NormalizeMerchantName(string? merchantName)
    {
        return string.IsNullOrWhiteSpace(merchantName)
            ? null
            : merchantName.Trim().ToLowerInvariant();
    }

    private enum TransactionUpsertResult
    {
        Added,
        Updated,
        Skipped
    }

    private sealed class PlaidSyncSummary
    {
        public int AccountsUpdated { get; set; }
        public int TransactionsAdded { get; set; }
        public int TransactionsUpdated { get; set; }
        public int TransactionsRemoved { get; set; }
    }
}
