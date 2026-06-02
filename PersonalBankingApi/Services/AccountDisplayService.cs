using PersonalBankingApi.DTOs;
using PersonalBankingApi.Models;

namespace PersonalBankingApi.Services;

public static class AccountDisplayService
{
    public static List<Account> PrepareForDisplay(IEnumerable<Account> accounts)
    {
        return accounts
            .GroupBy(GetDuplicateKey)
            .Select(ChoosePreferredAccount)
            .OrderBy(account => account.Currency)
            .ThenBy(account => account.Name)
            .ThenBy(account => account.Id)
            .ToList();
    }

    public static Account ChoosePreferredAccount(IEnumerable<Account> accounts)
    {
        return accounts
            .OrderByDescending(account => HasUsefulPlanningAmount(account))
            .ThenByDescending(account => account.IsActive)
            .ThenByDescending(account => account.BalanceLastUpdatedAt)
            .ThenByDescending(account => account.UpdatedAt)
            .ThenByDescending(account => account.CreatedAt)
            .ThenBy(account => account.Id)
            .First();
    }

    public static string GetDuplicateKey(Account account)
    {
        if (!IsPlaidAccount(account.Provider))
        {
            return account.Id.ToString();
        }

        return BuildPlaidDuplicateKey(
            account.InstitutionName,
            account.Name,
            account.AccountType,
            account.AccountSubtype,
            account.Currency,
            account.Country,
            account.LastFour
        );
    }

    public static string GetDuplicateKey(TransactionResponse transaction)
    {
        if (!IsPlaidAccount(transaction.AccountProvider))
        {
            return transaction.AccountId.ToString();
        }

        return BuildPlaidDuplicateKey(
            transaction.AccountInstitutionName,
            transaction.AccountName,
            transaction.AccountType,
            transaction.AccountSubtype,
            transaction.Currency,
            transaction.AccountCountry,
            transaction.AccountLastFour
        );
    }

    public static bool AreDuplicates(Account first, Account second)
    {
        return GetDuplicateKey(first) == GetDuplicateKey(second);
    }

    private static bool HasUsefulPlanningAmount(Account account)
    {
        return account.PlanningAmount.HasValue && account.PlanningAmount.Value != 0m;
    }

    private static bool IsPlaidAccount(string? provider)
    {
        return string.Equals(provider, "plaid", StringComparison.OrdinalIgnoreCase);
    }

    private static string BuildPlaidDuplicateKey(
        string? institutionName,
        string? name,
        string? accountType,
        string? accountSubtype,
        string? currency,
        string? country,
        string? lastFour)
    {
        return string.Join(
            "|",
            "plaid",
            NormalizeKey(institutionName),
            NormalizeKey(name),
            NormalizeKey(accountType),
            NormalizeKey(accountSubtype),
            NormalizeKey(currency),
            NormalizeKey(country),
            NormalizeKey(lastFour)
        );
    }

    private static string NormalizeKey(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : value.Trim().ToLowerInvariant();
    }
}
