# Personal Banking Tracker

Personal Banking Tracker is a full-stack personal finance app for viewing account balances, syncing bank transactions, categorizing spending, and tracking simple account planning targets.

The app is built as a personal, local-first project:
- ASP.NET Core Web API for backend logic.
- PostgreSQL for relational storage.
- Entity Framework Core with Npgsql for database access.
- Next.js and React for the frontend.
- Cookie-based login for local privacy.
- Plaid Link for bank account and transaction sync.
- Manual transaction and account management for anything Plaid does not cover.

## Privacy Note

This repository should not contain real bank credentials, Plaid secrets, production access tokens, card numbers, exact personal balances, account identifiers, database dumps, or personal budget amounts.

Use placeholders in documentation and examples. Store secrets locally with `.NET user-secrets`, environment variables, or another secret manager. Do not put secrets in frontend files, source code, README examples, screenshots, commits, or chat messages.

## What The App Does

The app helps one owner answer practical money questions:
- What accounts do I have, grouped by currency?
- What is my current balance in each account?
- How much did I spend this month?
- How much income came in this month?
- Which transactions still need categories?
- Which merchants should be categorized automatically next time?
- Which accounts are synced from Plaid and which ones are manual?
- What personal planning amount should I compare against each account?

It is not designed as a public multi-user SaaS. The schema has users and user-scoped rows, but the product assumption is still personal/local usage.

## Architecture

```text
Next.js frontend
  |
  | fetch + HTTP-only auth cookie
  v
ASP.NET Core Web API
  |
  | Entity Framework Core + Npgsql
  v
PostgreSQL
  ^
  |
Plaid API for linked account and transaction sync
```

The frontend never connects directly to PostgreSQL or Plaid. It only calls the backend API. The backend owns database access, Plaid credentials, auth, account import, and transaction sync.

## Repository Structure

```text
PersonalBankingApi/
  Controllers/       API endpoints
  Data/              EF Core DbContext
  DTOs/              Request DTOs
  Models/            Table-mapped C# models
  Services/          Password hashing and Plaid API service
  Program.cs         API startup, auth, CORS, service registration

PersonalBankingFrontend/
  app/               Next.js pages and global CSS
  components/        Reusable UI components
  lib/               API client, formatting, account helpers, calculations
  test/              Frontend test setup

database/
  *.sql              Incremental database setup scripts
```

## Tech Stack

Backend:
- C#
- ASP.NET Core
- Entity Framework Core
- Npgsql PostgreSQL provider
- Cookie authentication
- PBKDF2 password hashing
- Plaid API over `HttpClient`

Frontend:
- Next.js
- React
- JavaScript
- Lucide React icons
- React Plaid Link
- Vitest

Database:
- PostgreSQL
- pgAdmin or `psql` for local database administration

## Current Features

Authentication:
- Login screen before app access.
- HTTP-only cookie session.
- Logout from the app shell.
- Development-only password hash helper.
- User-scoped account, transaction, category, merchant rule, dashboard, and Plaid queries.

Dashboard:
- Account balance summaries grouped by currency.
- Current-month income.
- Current-month expenses.
- Spending by category.
- Recent transactions.

Accounts:
- Plaid and manual accounts in one view.
- Accounts grouped by currency.
- Current balance display.
- Personal planning amount display.
- Plaid connection panel.
- Plaid sync button.
- Manual balance editing for manual accounts.

Planning Amounts:
- Savings accounts show the planning amount as `Initial`.
- Checking/chequing accounts show it as `Monthly limit`.
- Credit accounts show it as `Credit limit`.
- Other account types show it as `Reference`.
- This value is separate from Plaid balances, so Plaid sync can update `current_balance` without overwriting your personal reference number.

Transactions:
- Full transaction list.
- Filter by account, category, type, and currency.
- Client-side search.
- Date range filtering.
- Manual transaction creation.
- Category updates.
- Optional merchant rule creation while categorizing.
- Apply saved merchant rules to uncategorized transactions.

Categories:
- Category list.
- Active/inactive status.
- Transaction usage count.

Merchant Rules:
- List saved merchant-to-category rules.
- Create rules manually.
- Create/update rules from a transaction categorization workflow.
- Apply rules to uncategorized transactions.

Wishlist:
- Add and delete planned purchases.
- Track name, category, URL, description, priority, price, saved amount, and optional target date.
- Sort items by priority inside each category.
- Show total and remaining savings needed by currency.
- Surface subscription candidates such as Spotify from recent expense history.

Plaid:
- Create Link tokens.
- Open Plaid Link from the frontend.
- Exchange public tokens on the backend.
- Store Plaid Items locally.
- Import Plaid accounts into `accounts`.
- Sync transactions with `/transactions/sync`.
- Store transaction sync cursors in `plaid_items.transactions_cursor`.
- Support Sandbox, Development, and Production/Trial configuration through local secrets.

## Important Data Model Ideas

`accounts` stores both synced and manual accounts.
- `provider = 'plaid'` means the row came from Plaid.
- `provider = 'manual'` means the row was entered locally.
- `provider_account_id` stores the Plaid account id for synced rows.
- `current_balance` is the real/latest balance shown by the app.
- `available_balance` is still stored when Plaid provides it, but it is no longer the main comparison number in the account card UI.
- `planning_amount` is the user's own reference number, such as an initial savings amount or monthly checking limit.

`transactions` stores both Plaid transactions and manual transactions.
- `external_transaction_id` identifies synced Plaid transactions.
- `merchant_normalized_name` powers merchant rule matching.
- `transaction_type` is normally `income` or `expense`.
- Amounts are displayed by type and currency.

`plaid_items` stores Plaid connections.
- `access_token` is sensitive and must be treated like a secret.
- `item_id` identifies the Plaid Item.
- `transactions_cursor` allows incremental transaction sync.

`merchant_rules` maps merchant names to categories.

`categories` stores user categories.

`users` stores login identity and the password hash.

## Database Scripts

Run these scripts against the local PostgreSQL database as needed:

```text
database/2026-05-20-create-plaid-items.sql
database/2026-06-01-add-account-planning-amount.sql
database/2026-06-19-create-wishlist-items.sql
```

The scripts are idempotent where practical. The first creates Plaid Item storage. The second adds `accounts.planning_amount`. The third creates wishlist item storage.

This project does not currently use a full EF migration history. The SQL files are the source of the incremental database changes that were added after the first local schema was created.

## Local Prerequisites

Install:
- .NET SDK compatible with the project target framework.
- Node.js and npm.
- PostgreSQL.
- Optional: pgAdmin.
- Optional: Plaid developer account for Sandbox or real account linking.

Restore dependencies:

```bash
cd PersonalBankingApi
dotnet restore
```

```bash
cd PersonalBankingFrontend
npm install
```

## Configuration

### Backend Database

The API reads the PostgreSQL connection string from:

```text
ConnectionStrings:DefaultConnection
```

For private local development, prefer user-secrets or a local ignored settings file instead of committing real database credentials.

Example with user-secrets:

```powershell
cd PersonalBankingApi
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=personal_banking_app;Username=YOUR_USER;Password=YOUR_PASSWORD"
```

### Frontend API URL

The frontend reads:

```text
NEXT_PUBLIC_API_BASE_URL
```

Default:

```text
http://localhost:5288
```

You can copy the example file if needed:

```bash
cd PersonalBankingFrontend
copy .env.example .env.local
```

Do not put Plaid secrets or database credentials in frontend env files.

## Login Setup

The API uses a `users` table. Passwords should be stored only as PBKDF2 hashes.

Start the backend:

```bash
cd PersonalBankingApi
dotnet run
```

Generate a password hash in Development:

```powershell
$body = @{
  password = "Choose-A-Strong-Password"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:5288/api/auth/hash-password" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Save the returned hash in the `users.password_hash` column for your local user:

```sql
update users
set password_hash = 'PASTE_HASH_HERE',
    updated_at = now()
where email = 'your-email@example.com';
```

Do not store the plain password in SQL, source code, README files, screenshots, or notes.

## Plaid Setup

Plaid is used to link supported financial institutions and sync account/transaction data.

Use Sandbox for fake test data:

```powershell
cd PersonalBankingApi
dotnet user-secrets set "Plaid:ClientId" "YOUR_PLAID_CLIENT_ID"
dotnet user-secrets set "Plaid:Secret" "YOUR_PLAID_SANDBOX_SECRET"
dotnet user-secrets set "Plaid:Environment" "sandbox"
dotnet user-secrets set "Plaid:ClientName" "Personal Banking Tracker"
dotnet user-secrets set "Plaid:CountryCodes:0" "CA"
dotnet user-secrets set "Plaid:TransactionsDaysRequested" "90"
```

Use Production when your Plaid account is approved for real-data access:

```powershell
cd PersonalBankingApi
dotnet user-secrets set "Plaid:ClientId" "YOUR_PLAID_CLIENT_ID"
dotnet user-secrets set "Plaid:Secret" "YOUR_PLAID_PRODUCTION_SECRET"
dotnet user-secrets set "Plaid:Environment" "production"
dotnet user-secrets set "Plaid:ClientName" "Personal Banking Tracker"
dotnet user-secrets set "Plaid:CountryCodes:0" "CA"
dotnet user-secrets set "Plaid:TransactionsDaysRequested" "90"
```

The app also accepts `trial` as a local alias and sends it to Plaid's Production base URL.

Optional OAuth/webhook settings:

```powershell
dotnet user-secrets set "Plaid:RedirectUri" "https://your-domain.example/plaid-oauth"
dotnet user-secrets set "Plaid:WebhookUrl" "https://your-domain.example/api/plaid/webhook"
```

Only configure real redirect or webhook URLs that you own. For ordinary local desktop testing, the app can usually use Plaid Link without adding these.

### Plaid Safety Notes

Plaid Link may ask for online banking credentials depending on the institution. That is different from a card PIN or CVV.

Do not continue if a flow asks for:
- Card PIN.
- CVV/security code.
- A Plaid secret.
- A database password.
- Anything unrelated to online banking authentication.

Do not paste Plaid secrets or banking credentials into this repository.

## Running Locally

Start the backend:

```bash
cd PersonalBankingApi
dotnet run
```

Backend URL:

```text
http://localhost:5288
```

Start the frontend in another terminal:

```bash
cd PersonalBankingFrontend
npm run dev
```

Frontend URL:

```text
http://localhost:3000
```

### One-Click Local Launcher

A desktop launcher can start the published API, start the production Next app, and open the browser:

```text
C:\Users\Rodrigo\Desktop\Banking Tracker.exe
```

Keep the launcher window open while using the app. Press `Q`, press `Ctrl+C`, or close the launcher window to stop the frontend and backend process trees.

If the app code changes, rebuild the pieces used by the launcher:

```powershell
dotnet publish PersonalBankingApi\PersonalBankingApi.csproj -c Release -o PersonalBankingApi\bin\Release\net10.0\publish
cd PersonalBankingFrontend
npm run build
```

Health check:

```powershell
Invoke-RestMethod http://localhost:5288/health
```

## Typical Workflow

1. Start PostgreSQL.
2. Start the API.
3. Start the frontend.
4. Log in.
5. Open Accounts.
6. Link a supported institution with Plaid or use manual accounts.
7. Sync Plaid data.
8. Review imported accounts.
9. Set planning amounts such as `Initial` or `Monthly limit`.
10. Open Transactions.
11. Categorize transactions.
12. Save merchant rules for repeated merchants.
13. Apply merchant rules to uncategorized transactions.
14. Use the Dashboard for monthly summaries.

## API Endpoints

Auth:

```http
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/hash-password
```

Accounts:

```http
GET /api/accounts
PUT /api/accounts/{id}/balance
PUT /api/accounts/{id}/planning
```

`PUT /api/accounts/{id}/balance` updates manual balance values:

```json
{
  "currentBalance": 1000.00,
  "availableBalance": 1000.00
}
```

`PUT /api/accounts/{id}/planning` updates the user-owned reference amount:

```json
{
  "planningAmount": 1500.00
}
```

Categories:

```http
GET /api/categories
```

Transactions:

```http
GET  /api/transactions
GET  /api/transactions/{id}
POST /api/transactions
PUT  /api/transactions/{id}/category
POST /api/transactions/apply-merchant-rules
```

Transaction filters:

```text
accountId
categoryId
type
currency
```

Merchant Rules:

```http
GET  /api/merchant-rules
POST /api/merchant-rules
```

Dashboard:

```http
GET /api/dashboard/summary
```

Wishlist:

```http
GET    /api/wishlist/items
POST   /api/wishlist/items
DELETE /api/wishlist/items/{id}
GET    /api/wishlist/subscriptions
```

Plaid:

```http
POST /api/plaid/link-token
POST /api/plaid/exchange-public-token
POST /api/plaid/sync
GET  /api/plaid/items
```

All app endpoints are protected by auth except the root health/info endpoints and the Development-only password hash helper.

## Frontend Pages

```text
/                  Dashboard
/accounts          Accounts, Plaid Link, sync, planning amounts
/transactions      Transaction list, filters, categorization, manual entry
/categories        Category overview
/merchant-rules    Merchant rule management
/wishlist          Wishlist, savings targets, and detected subscriptions
```

## Testing And Build

Backend:

```bash
cd PersonalBankingApi
dotnet build
```

Frontend tests:

```bash
cd PersonalBankingFrontend
npm test
```

Frontend production build:

```bash
cd PersonalBankingFrontend
npm run build
```

## Troubleshooting

### Port already in use

If the backend port is already taken:

```powershell
Get-NetTCPConnection -LocalPort 5288 -ErrorAction SilentlyContinue
```

Stop the process if it is an old local API instance:

```powershell
Stop-Process -Id PROCESS_ID
```

If the frontend port is already taken:

```powershell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
```

Then stop the old Node process if needed:

```powershell
Stop-Process -Id PROCESS_ID
```

### Plaid credentials missing

If the UI says Plaid is not configured, confirm local user-secrets are present:

```powershell
cd PersonalBankingApi
dotnet user-secrets list
```

The command should show Plaid keys by name. Do not share the values.

### Duplicate accounts after linking

If manual test accounts already existed before Plaid sync, the Accounts page may show both manual rows and Plaid rows. Plaid rows have `provider = 'plaid'`. Manual rows have `provider = 'manual'`.

Only delete manual rows after checking they have no transactions:

```sql
select a.id, a.name, a.provider, count(t.id) as transaction_count
from accounts a
left join transactions t on t.account_id = a.id
group by a.id
order by a.name;
```

### Plaid sync imports accounts but no transactions

Check:
- The Plaid Item exists in `plaid_items`.
- `transactions_cursor` is not null after sync.
- The linked institution supports transactions for the selected account.
- The transaction date range requested is enough for the expected history.
- The account was selected in Plaid Link.

### Frontend still shows old UI

Hard refresh the browser:

```text
Ctrl + F5
```

If needed, restart `npm run dev`.

## Git Hygiene

The `.gitignore` excludes generated build output such as `bin/`, `obj/`, `node_modules/`, and `.next/`.

If generated .NET files were already tracked before `.gitignore` was added, remove them from Git tracking without deleting local files:

```bash
git rm -r --cached PersonalBankingApi/bin PersonalBankingApi/obj
```

Do not commit:
- Plaid secrets.
- Database passwords.
- Real account balances.
- Screenshots showing real financial data.
- Database backups or dumps.
- User-secrets files.
- `.env.local`.

## Development Notes

Plaid sync currently runs from explicit frontend actions:
- Connect with Plaid.
- Sync now.

There is no background worker yet. That is a reasonable future improvement if the app becomes long-running.

The app currently stores Plaid access tokens in the local database. That is acceptable for a local portfolio/personal project, but a production-grade version should encrypt tokens at rest and use stricter deployment secrets management.

The database change process is currently SQL-script based, not full EF migrations. Converting to EF migrations would make fresh setup easier.

## Possible Next Improvements

- Encrypt Plaid access tokens at rest.
- Add database migrations for the full schema.
- Add import/export backup tooling that redacts secrets.
- Add Plaid Item removal and relink flows.
- Add better categorization suggestions.
- Add budget/planning dashboards based on `planning_amount`.
- Add recurring bill detection.
- Add tests around Plaid transaction mapping.
- Add server-side pagination for large transaction history.

## Summary

This app is a personal banking dashboard with a protected ASP.NET Core API, a PostgreSQL database, a Next.js frontend, Plaid sync, manual financial data entry, transaction categorization, and lightweight planning values per account.

The most important safety rule is simple: code can describe the system, but real credentials and financial details stay local and private.
