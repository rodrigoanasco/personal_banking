using System.ComponentModel.DataAnnotations.Schema;

namespace PersonalBankingApi.Models;

[Table("plaid_items")]
public class PlaidItem
{
    [Column("id")]
    public Guid Id { get; set; }

    [Column("user_id")]
    public Guid UserId { get; set; }

    [Column("item_id")]
    public string ItemId { get; set; } = string.Empty;

    [Column("access_token")]
    public string AccessToken { get; set; } = string.Empty;

    [Column("institution_id")]
    public string? InstitutionId { get; set; }

    [Column("institution_name")]
    public string? InstitutionName { get; set; }

    [Column("transactions_cursor")]
    public string? TransactionsCursor { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
