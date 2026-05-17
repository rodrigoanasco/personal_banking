# Personal Banking Tracker

App made to track transactions from personal banking applications.

Current banks planned:
- Scotiabank
- BCP

## Current Setup Steps

1. Create the PostgreSQL database and first tables using pgAdmin4.

   pgAdmin4 is the database administration tool being used to visually create and manage the PostgreSQL database. PostgreSQL is the actual relational database engine where the banking tracker data will be stored.

2. Install .NET and create/work inside the API project.

   This project uses .NET for the backend API. The API will be responsible for connecting to the database, applying business logic, and exposing endpoints that can later be used by a frontend or another client.

3. Add the Entity Framework Core packages for PostgreSQL.

   From inside the API project folder:

   ```bash
   dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
   dotnet add package Microsoft.EntityFrameworkCore.Design
   ```

## Why These Technologies Work Together

- **PostgreSQL** stores the banking data in relational tables, which is useful for structured information like accounts, banks, transactions, categories, and balances.
- **pgAdmin4** provides a visual interface to create, inspect, and manage the PostgreSQL database while the database structure is still being planned.
- **.NET** is used to build the backend API for the banking tracker.
- **Entity Framework Core** is the Object-Relational Mapper (ORM). It lets the .NET code work with database tables using C# classes instead of writing raw SQL for every operation.
- **Npgsql.EntityFrameworkCore.PostgreSQL** is the PostgreSQL provider for Entity Framework Core. It allows EF Core to communicate specifically with PostgreSQL.
- **Microsoft.EntityFrameworkCore.Design** adds design-time tools for EF Core, such as migrations and database scaffolding. This will be useful later when the database structure is managed from code or when models are generated/updated.

In short: PostgreSQL stores the data, pgAdmin4 helps manage it visually, .NET runs the API, EF Core maps C# code to database tables, and Npgsql makes that EF Core connection work with PostgreSQL.
