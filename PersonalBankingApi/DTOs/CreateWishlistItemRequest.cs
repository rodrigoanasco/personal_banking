namespace PersonalBankingApi.DTOs;

public sealed class CreateWishlistItemRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string? Url { get; set; }
    public decimal Price { get; set; }
    public string? Currency { get; set; }
    public int Priority { get; set; } = 3;
    public decimal SavedAmount { get; set; }
    public DateOnly? TargetDate { get; set; }
}
