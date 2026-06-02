namespace PersonalBankingApi.DTOs;

public sealed class TransactionResponse
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateOnly TransactionDate { get; set; }
    public DateOnly? PostedDate { get; set; }
    public string? MerchantName { get; set; }
    public string? MerchantNormalizedName { get; set; }
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string TransactionType { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? Country { get; set; }
    public bool IsPending { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Guid AccountId { get; set; }
    public string AccountName { get; set; } = string.Empty;
    public string AccountInstitutionName { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public string? AccountSubtype { get; set; }
    public string? AccountLastFour { get; set; }
    public string? AccountCountry { get; set; }
    public string AccountProvider { get; set; } = string.Empty;
    public Guid? CategoryId { get; set; }
    public string? CategoryName { get; set; }
}
