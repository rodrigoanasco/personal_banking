namespace PersonalBankingApi.DTOs;

public sealed class WishlistItemResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public string? Url { get; set; }
    public decimal Price { get; set; }
    public string Currency { get; set; } = string.Empty;
    public int Priority { get; set; }
    public decimal SavedAmount { get; set; }
    public decimal RemainingAmount { get; set; }
    public decimal? MonthlySavingsNeeded { get; set; }
    public DateOnly? TargetDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
