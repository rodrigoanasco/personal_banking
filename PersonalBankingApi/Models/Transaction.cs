using System.ComponentModel.DataAnnotations.Schema;

namespace PersonalBankingApi.Models;

[Table("transactions")]
public class Transaction
{
    [Column("id")]
    public Guid Id { get; set; }

    [Column("user_id")]
    public Guid UserId { get; set; }

    [Column("account_id")]
    public Guid AccountId { get; set; }

    [Column("category_id")]
    public Guid? CategoryId { get; set; }

    [Column("external_transaction_id")]
    public string? ExternalTransactionId { get; set; }

    [Column("merchant_name")]
    public string? MerchantName { get; set; }

    [Column("merchant_normalized_name")]
    public string? MerchantNormalizedName { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("amount")]
    public decimal Amount { get; set; }

    [Column("currency")]
    public string Currency { get; set; } = string.Empty;

    [Column("transaction_type")]
    public string TransactionType { get; set; } = string.Empty;

    [Column("transaction_date")]
    public DateOnly TransactionDate { get; set; }

    [Column("posted_date")]
    public DateOnly? PostedDate { get; set; }

    [Column("city")]
    public string? City { get; set; }

    [Column("country")]
    public string? Country { get; set; }

    [Column("is_pending")]
    public bool IsPending { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}