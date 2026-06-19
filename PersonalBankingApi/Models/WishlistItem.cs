using System.ComponentModel.DataAnnotations.Schema;

namespace PersonalBankingApi.Models;

[Table("wishlist_items")]
public class WishlistItem
{
    [Column("id")]
    public Guid Id { get; set; }

    [Column("user_id")]
    public Guid UserId { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("category")]
    public string Category { get; set; } = string.Empty;

    [Column("url")]
    public string? Url { get; set; }

    [Column("price")]
    public decimal Price { get; set; }

    [Column("currency")]
    public string Currency { get; set; } = string.Empty;

    [Column("priority")]
    public int Priority { get; set; }

    [Column("saved_amount")]
    public decimal SavedAmount { get; set; }

    [Column("target_date")]
    public DateOnly? TargetDate { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
