namespace PersonalBankingApi.DTOs;

public class CreateTransactionRequest
{
    public Guid AccountId { get; set; }
    public Guid? CategoryId { get; set; }
    public string? MerchantName { get; set; }
    public string? MerchantNormalizedName { get; set; }
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string TransactionType { get; set; } = string.Empty;
    public DateOnly TransactionDate { get; set; }
    public DateOnly? PostedDate { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
    public bool IsPending { get; set; }
    public string? Notes { get; set; }
}
