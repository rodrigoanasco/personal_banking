using Microsoft.EntityFrameworkCore;
using PersonalBankingApi.Models;

namespace PersonalBankingApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Account> Accounts => Set<Account>();
}