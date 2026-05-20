namespace PersonalBankingApi.DTOs;

public class CreateMerchantRuleRequest
{
    public Guid UserId { get; set; }
    public string? MerchantName { get; set; }
    public string MerchantNormalizedName { get; set; } = string.Empty;
    public Guid CategoryId { get; set; }
    public string MatchType { get; set; } = "exact";
}