using Microsoft.EntityFrameworkCore;
using System.Globalization;
using PersonalBankingApi.Data;
using PersonalBankingApi.DTOs;
using PersonalBankingApi.Models;

namespace PersonalBankingApi.Services;

public static class TransactionResponseService
{
    public static IQueryable<TransactionResponse> BuildQuery(
        AppDbContext context,
        IQueryable<Transaction> transactions)
    {
        return transactions
            .Join(
                context.Accounts,
                transaction => transaction.AccountId,
                account => account.Id,
                (transaction, account) => new { transaction, account }
            )
            .GroupJoin(
                context.Categories,
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
                (result, category) => new TransactionResponse
                {
                    Id = result.transaction.Id,
                    UserId = result.transaction.UserId,
                    TransactionDate = result.transaction.TransactionDate,
                    PostedDate = result.transaction.PostedDate,
                    MerchantName = result.transaction.MerchantName,
                    MerchantNormalizedName = result.transaction.MerchantNormalizedName,
                    Description = result.transaction.Description,
                    Amount = result.transaction.Amount,
                    Currency = result.transaction.Currency,
                    TransactionType = result.transaction.TransactionType,
                    City = result.transaction.City,
                    Country = result.transaction.Country,
                    IsPending = result.transaction.IsPending,
                    Notes = result.transaction.Notes,
                    CreatedAt = result.transaction.CreatedAt,
                    UpdatedAt = result.transaction.UpdatedAt,
                    AccountId = result.account.Id,
                    AccountName = result.account.Name,
                    CategoryId = category != null ? category.Id : null,
                    CategoryName = category != null ? category.Name : null
                }
            );
    }

    public static IOrderedQueryable<TransactionResponse> ApplyNewestFirstOrder(
        IQueryable<TransactionResponse> transactions)
    {
        return transactions
            .OrderByDescending(transaction => transaction.TransactionDate)
            .ThenBy(transaction => transaction.IsPending)
            .ThenByDescending(transaction => transaction.PostedDate)
            .ThenByDescending(transaction => transaction.UpdatedAt)
            .ThenByDescending(transaction => transaction.CreatedAt)
            .ThenBy(transaction => transaction.MerchantName ?? transaction.Description ?? string.Empty);
    }

    public static List<TransactionResponse> PrepareForDisplay(
        IEnumerable<TransactionResponse> transactions)
    {
        return transactions
            .GroupBy(GetDuplicateKey)
            .Select(group => group
                .OrderBy(transaction => transaction.IsPending)
                .ThenByDescending(transaction => transaction.CategoryId.HasValue)
                .ThenByDescending(transaction => transaction.UpdatedAt)
                .ThenByDescending(transaction => transaction.CreatedAt)
                .ThenBy(transaction => transaction.Id)
                .First())
            .OrderByDescending(transaction => transaction.TransactionDate)
            .ThenBy(transaction => transaction.IsPending)
            .ThenByDescending(transaction => transaction.PostedDate)
            .ThenByDescending(transaction => transaction.UpdatedAt)
            .ThenByDescending(transaction => transaction.CreatedAt)
            .ThenBy(transaction => transaction.MerchantName ?? transaction.Description ?? string.Empty)
            .ToList();
    }

    public static async Task<List<TransactionResponse>> ToPreparedListAsync(
        IQueryable<TransactionResponse> transactions)
    {
        var orderedTransactions = await ApplyNewestFirstOrder(transactions).ToListAsync();
        return PrepareForDisplay(orderedTransactions);
    }

    private static string GetDuplicateKey(TransactionResponse transaction)
    {
        var merchantKey = NormalizeKey(
            transaction.MerchantNormalizedName
            ?? transaction.MerchantName
            ?? transaction.Description
            ?? "unknown"
        );
        var descriptionKey = NormalizeKey(transaction.Description);
        var amountKey = Math.Abs(transaction.Amount).ToString(
            "0.00",
            CultureInfo.InvariantCulture
        );
        var currencyKey = NormalizeKey(transaction.Currency);
        var typeKey = NormalizeKey(transaction.TransactionType);
        var activityDate = transaction.PostedDate ?? transaction.TransactionDate;

        return string.Join(
            "|",
            transaction.AccountId,
            activityDate,
            merchantKey,
            descriptionKey,
            amountKey,
            currencyKey,
            typeKey
        );
    }

    private static string NormalizeKey(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : value.Trim().ToLowerInvariant();
    }
}
