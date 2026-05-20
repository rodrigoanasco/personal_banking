using Microsoft.EntityFrameworkCore;
using PersonalBankingApi.Data;

var builder = WebApplication.CreateBuilder(args);
const string LocalFrontendCorsPolicy = "LocalFrontend";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddPolicy(
        LocalFrontendCorsPolicy,
        policy => policy
            .WithOrigins(
                "http://localhost:3000",
                "https://localhost:3000",
                "http://localhost:3001",
                "https://localhost:3001"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
    );
});

builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors(LocalFrontendCorsPolicy);

app.UseAuthorization();

app.MapGet("/", () => Results.Ok(new
{
    message = "Personal Banking API is running.",
    tryTheseUrls = new[]
    {
        "/api/accounts",
        "/api/categories",
        "/api/transactions",
        "/api/merchant-rules",
        "/api/dashboard/summary",
        "/openapi/v1.json"
    }
}));

app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    timestamp = DateTime.UtcNow
}));

app.MapControllers();

app.Run();
