using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonalBankingApi.Data;
using PersonalBankingApi.DTOs;
using PersonalBankingApi.Models;

namespace PersonalBankingApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccountsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AccountsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<Account>>> GetAccounts()
    {
        var accounts = await _context.Accounts
            .OrderBy(account => account.Name)
            .ToListAsync();

        return Ok(accounts);
    }

    [HttpPut("{id}/balance")]
    public async Task<ActionResult> UpdateAccountBalance(
        Guid id,
        [FromBody] UpdateAccountBalanceRequest request)
    {
        var account = await _context.Accounts.FindAsync(id);

        if (account == null)
        {
            return NotFound(new { message = "Account not found." });
        }

        var now = DateTime.UtcNow;

        account.CurrentBalance = request.CurrentBalance;
        account.AvailableBalance = request.AvailableBalance;
        account.BalanceLastUpdatedAt = now;
        account.UpdatedAt = now;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Account balance updated successfully.",
            account.Id,
            account.Name,
            account.Currency,
            account.CurrentBalance,
            account.AvailableBalance,
            account.BalanceLastUpdatedAt,
            account.UpdatedAt
        });
    }
}
