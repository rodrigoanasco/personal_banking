namespace PersonalBankingApi.DTOs;

public class ExchangePlaidPublicTokenRequest
{
    public string PublicToken { get; set; } = string.Empty;
    public string? InstitutionId { get; set; }
    public string? InstitutionName { get; set; }
}
