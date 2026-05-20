using System.ComponentModel.DataAnnotations.Schema;

namespace PersonalBankingApi.Models;

[Table("merchant_rules")]
public class MerchantRule
{
    [Column("id")]
    public Guid Id { get; set; }

    [Column("user_id")]
    public Guid UserId { get; set; }

    [Column("merchant_name")]
    public string? MerchantName { get; set; }

    [Column("merchant_normalized_name")]
    public string MerchantNormalizedName { get; set; } = string.Empty;

    [Column("category_id")]
    public Guid CategoryId { get; set; }

    [Column("match_type")]
    public string MatchType { get; set; } = "exact";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}