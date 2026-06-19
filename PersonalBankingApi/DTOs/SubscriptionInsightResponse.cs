namespace PersonalBankingApi.DTOs;

public sealed class SubscriptionInsightResponse
{
    public string Name { get; set; } = string.Empty;
    public string MerchantKey { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
    public decimal EstimatedMonthlyAmount { get; set; }
    public decimal LatestAmount { get; set; }
    public DateOnly LastPaymentDate { get; set; }
    public int PaymentCount { get; set; }
    public int MonthsSeen { get; set; }
    public bool IsKnownSubscription { get; set; }
    public bool IsLikelyRecurring { get; set; }
    public string? AccountName { get; set; }
    public string? AccountType { get; set; }
    public string? CategoryName { get; set; }
}
