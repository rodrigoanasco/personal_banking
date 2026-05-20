using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonalBankingApi.Data;
using PersonalBankingApi.DTOs;
using PersonalBankingApi.Models;

namespace PersonalBankingApi.Controllers;

[ApiController]
[Route("api/merchant-rules")]
public class MerchantRulesController : ControllerBase
{
    private readonly AppDbContext _context;

    public MerchantRulesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult> GetMerchantRules()
    {
        var rules = await _context.MerchantRules
            .Join(
                _context.Categories,
                rule => rule.CategoryId,
                category => category.Id,
                (rule, category) => new
                {
                    rule.Id,
                    rule.UserId,
                    rule.MerchantName,
                    rule.MerchantNormalizedName,
                    rule.MatchType,
                    CategoryId = category.Id,
                    CategoryName = category.Name,
                    rule.CreatedAt,
                    rule.UpdatedAt
                }
            )
            .OrderBy(rule => rule.MerchantNormalizedName)
            .ToListAsync();

        return Ok(rules);
    }

    [HttpPost]
    public async Task<ActionResult> CreateMerchantRule(
        [FromBody] CreateMerchantRuleRequest request)
    {
        if (request.UserId == Guid.Empty)
        {
            return BadRequest(new { message = "UserId is required." });
        }

        if (request.CategoryId == Guid.Empty)
        {
            return BadRequest(new { message = "CategoryId is required." });
        }

        if (string.IsNullOrWhiteSpace(request.MerchantNormalizedName))
        {
            return BadRequest(new { message = "MerchantNormalizedName is required." });
        }

        var categoryExists = await _context.Categories
            .AnyAsync(category => category.Id == request.CategoryId);

        if (!categoryExists)
        {
            return BadRequest(new { message = "Category does not exist." });
        }

        var now = DateTime.UtcNow;

        var merchantRule = new MerchantRule
        {
            Id = Guid.NewGuid(),
            UserId = request.UserId,
            MerchantName = string.IsNullOrWhiteSpace(request.MerchantName)
                ? null
                : request.MerchantName.Trim(),
            MerchantNormalizedName = request.MerchantNormalizedName.Trim(),
            CategoryId = request.CategoryId,
            MatchType = string.IsNullOrWhiteSpace(request.MatchType)
                ? "exact"
                : request.MatchType.Trim().ToLowerInvariant(),
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.MerchantRules.Add(merchantRule);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetMerchantRules),
            new { id = merchantRule.Id },
            new
            {
                message = "Merchant rule created successfully.",
                merchantRule.Id,
                merchantRule.MerchantNormalizedName,
                merchantRule.CategoryId,
                merchantRule.MatchType
            }
        );
    }
}
