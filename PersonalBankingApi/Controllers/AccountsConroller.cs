using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonalBankingApi.Data;
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
}