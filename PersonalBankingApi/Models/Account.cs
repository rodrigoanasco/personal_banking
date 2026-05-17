using System.ComponentModel.DataAnnotations.Schema;

namespace PersonalBankingApi.Models;

[Table("accounts")]
public class Account
{
    [Column("id")]
    public Guid Id { get; set; }

    [Column("user_id")]
    public Guid UserId { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("institution_name")]
    public string InstitutionName { get; set; } = string.Empty;

    [Column("account_type")]
    public string AccountType { get; set; } = string.Empty;

    [Column("account_subtype")]
    public string? AccountSubtype { get; set; }

    [Column("currency")]
    public string Currency { get; set; } = string.Empty;

    [Column("last_four")]
    public string? LastFour { get; set; }

    [Column("country")]
    public string? Country { get; set; }

    [Column("provider")]
    public string Provider { get; set; } = string.Empty;

    [Column("provider_account_id")]
    public string? ProviderAccountId { get; set; }

    [Column("current_balance")]
    public decimal? CurrentBalance { get; set; }

    [Column("available_balance")]
    public decimal? AvailableBalance { get; set; }

    [Column("balance_last_updated_at")]
    public DateTime? BalanceLastUpdatedAt { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}