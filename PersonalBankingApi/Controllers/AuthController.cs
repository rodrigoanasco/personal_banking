using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonalBankingApi.Data;
using PersonalBankingApi.DTOs;
using PersonalBankingApi.Services;

namespace PersonalBankingApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly PasswordHashService _passwordHashService;

    public AuthController(
        AppDbContext context,
        IWebHostEnvironment environment,
        PasswordHashService passwordHashService)
    {
        _context = context;
        _environment = environment;
        _passwordHashService = passwordHashService;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email)
            || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Email and password are required." });
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _context.Users
            .FirstOrDefaultAsync(user => user.Email.ToLower() == normalizedEmail);

        if (user == null
            || !_passwordHashService.VerifyPassword(
                request.Password,
                user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.FullName)
        };

        var claimsIdentity = new ClaimsIdentity(
            claims,
            CookieAuthenticationDefaults.AuthenticationScheme
        );

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(claimsIdentity),
            new AuthenticationProperties
            {
                IsPersistent = true,
                ExpiresUtc = DateTimeOffset.UtcNow.AddHours(12)
            }
        );

        return Ok(CreateUserResponse(user.Id, user.Email, user.FullName));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<ActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok(new { message = "Logged out successfully." });
    }

    [Authorize]
    [HttpGet("me")]
    public ActionResult Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = User.FindFirstValue(ClaimTypes.Email);
        var fullName = User.FindFirstValue(ClaimTypes.Name);

        return Ok(new
        {
            Id = userId,
            Email = email,
            FullName = fullName
        });
    }

    [AllowAnonymous]
    [HttpPost("hash-password")]
    public ActionResult GeneratePasswordHash(
        [FromBody] GeneratePasswordHashRequest request)
    {
        if (!_environment.IsDevelopment())
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(request.Password)
            || request.Password.Length < 8)
        {
            return BadRequest(new
            {
                message = "Password must be at least 8 characters."
            });
        }

        return Ok(new
        {
            PasswordHash = _passwordHashService.HashPassword(request.Password)
        });
    }

    private static object CreateUserResponse(
        Guid id,
        string email,
        string fullName)
    {
        return new
        {
            Id = id,
            Email = email,
            FullName = fullName
        };
    }
}
