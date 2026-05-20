using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace PersonalBankingApi.Services;

public class PlaidOptions
{
    public string ClientId { get; set; } = string.Empty;
    public string Secret { get; set; } = string.Empty;
    public string Environment { get; set; } = "sandbox";
    public string ClientName { get; set; } = "Personal Banking Tracker";
}

public class PlaidService
{
    private readonly HttpClient _httpClient;
    private readonly PlaidOptions _options;

    public PlaidService(HttpClient httpClient, IOptions<PlaidOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<string> CreateLinkTokenAsync(Guid userId)
    {
        EnsureConfigured();

        var response = await PostPlaidAsync("/link/token/create", new
        {
            user = new
            {
                client_user_id = userId.ToString()
            },
            client_name = _options.ClientName,
            products = new[] { "transactions" },
            country_codes = new[] { "CA", "US" },
            language = "en"
        });

        return response.RootElement.GetProperty("link_token").GetString()
            ?? throw new InvalidOperationException("Plaid did not return a link token.");
    }

    public async Task<PlaidExchangeResult> ExchangePublicTokenAsync(
        string publicToken)
    {
        EnsureConfigured();

        var response = await PostPlaidAsync("/item/public_token/exchange", new
        {
            public_token = publicToken
        });

        return new PlaidExchangeResult(
            response.RootElement.GetProperty("access_token").GetString()
                ?? throw new InvalidOperationException("Plaid did not return an access token."),
            response.RootElement.GetProperty("item_id").GetString()
                ?? throw new InvalidOperationException("Plaid did not return an item id.")
        );
    }

    public async Task<JsonElement> GetAccountsAsync(string accessToken)
    {
        EnsureConfigured();

        var response = await PostPlaidAsync("/accounts/balance/get", new
        {
            access_token = accessToken
        });

        return response.RootElement.GetProperty("accounts").Clone();
    }

    public async Task<PlaidTransactionsSyncResult> SyncTransactionsAsync(
        string accessToken,
        string? cursor)
    {
        EnsureConfigured();

        var added = new List<JsonElement>();
        var modified = new List<JsonElement>();
        var removed = new List<JsonElement>();
        string? nextCursor = cursor;
        var hasMore = true;

        while (hasMore)
        {
            var response = await PostPlaidAsync("/transactions/sync", new
            {
                access_token = accessToken,
                cursor = nextCursor,
                count = 100
            });

            foreach (var transaction in response.RootElement.GetProperty("added").EnumerateArray())
            {
                added.Add(transaction.Clone());
            }

            foreach (var transaction in response.RootElement.GetProperty("modified").EnumerateArray())
            {
                modified.Add(transaction.Clone());
            }

            foreach (var transaction in response.RootElement.GetProperty("removed").EnumerateArray())
            {
                removed.Add(transaction.Clone());
            }

            nextCursor = response.RootElement.GetProperty("next_cursor").GetString();
            hasMore = response.RootElement.GetProperty("has_more").GetBoolean();
        }

        return new PlaidTransactionsSyncResult(
            added,
            modified,
            removed,
            nextCursor
        );
    }

    private async Task<JsonDocument> PostPlaidAsync(string path, object payload)
    {
        var request = MergeAuthentication(payload);
        var response = await _httpClient.PostAsJsonAsync(BuildUrl(path), request);
        var responseContent = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"Plaid request failed: {response.StatusCode} {responseContent}"
            );
        }

        return JsonDocument.Parse(responseContent);
    }

    private Dictionary<string, object?> MergeAuthentication(object payload)
    {
        var json = JsonSerializer.Serialize(payload);
        var values = JsonSerializer.Deserialize<Dictionary<string, object?>>(json)
            ?? new Dictionary<string, object?>();

        values["client_id"] = _options.ClientId;
        values["secret"] = _options.Secret;

        return values;
    }

    private string BuildUrl(string path)
    {
        return $"{GetBaseUrl()}{path}";
    }

    private string GetBaseUrl()
    {
        return _options.Environment.Trim().ToLowerInvariant() switch
        {
            "sandbox" => "https://sandbox.plaid.com",
            "development" => "https://development.plaid.com",
            "production" => "https://production.plaid.com",
            _ => "https://sandbox.plaid.com"
        };
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_options.ClientId)
            || string.IsNullOrWhiteSpace(_options.Secret))
        {
            throw new InvalidOperationException(
                "Plaid is not configured. Set Plaid:ClientId and Plaid:Secret using user-secrets or environment variables."
            );
        }
    }
}

public record PlaidExchangeResult(string AccessToken, string ItemId);

public record PlaidTransactionsSyncResult(
    IReadOnlyList<JsonElement> Added,
    IReadOnlyList<JsonElement> Modified,
    IReadOnlyList<JsonElement> Removed,
    string? NextCursor);
