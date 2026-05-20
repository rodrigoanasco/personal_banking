namespace PersonalBankingApi.DTOs;

public class UpdateAccountBalanceRequest
{
    public decimal? CurrentBalance { get; set; }
    public decimal? AvailableBalance { get; set; }
}
