# Database Architecture & PostgreSQL Setup

This document describes the PostgreSQL and Prisma ORM configuration for the **Job Board Platform Backend**.

---

## 1. Environment Configuration

Database credentials are strictly managed through environment variables and never hardcoded.

```env
# PostgreSQL Connection URL
DATABASE_URL="postgresql://username:password@localhost:5432/job_board"
```

### URL Format
* **Standard PostgreSQL**: `postgresql://<user>:<password>@<host>:<port>/<dbname>?schema=public`
* **SSL enabled**: `postgresql://<user>:<password>@<host>:<port>/<dbname>?sslmode=require`
* **Prisma Postgres**: `prisma+postgres://...`

---

## 2. Prisma ORM 7 Setup

The project uses **Prisma ORM 7** with driver adapters for direct PostgreSQL connection pooling via `@prisma/adapter-pg` and `pg`.

### Key Files
* **`prisma/schema.prisma`**: Defines database datasource, models, and generator output.
* **`prisma.config.ts`**: Configures database URL resolution, migration paths, and database seed scripts.
* **`src/lib/prisma.ts`**: Creates and exports the shared `PrismaClient` singleton with `Pool` and `PrismaPg` adapter.
* **`prisma/seed.ts`**: Database seed foundation script.

---

## 3. Database Migration Workflow

| Action | Command | Purpose |
|---|---|---|
| **Apply / Create Dev Migration** | `npm run prisma:migrate` | Generates a new migration from schema changes and applies it to the development DB. |
| **Apply Production Migration** | `npm run prisma:deploy` | Applies pending migrations in staging/production CI/CD. |
| **Check Migration Status** | `npm run prisma:status` | Checks migration sync status against the database. |
| **Generate Prisma Client** | `npm run prisma:generate` | Generates the type-safe Prisma client in `src/generated/prisma`. |
| **Seed Database** | `npm run prisma:seed` | Runs seed script (`prisma/seed.ts`). |
| **Validate Schema** | `npm run prisma:validate` | Validates `schema.prisma` syntax. |
| **Open Prisma Studio** | `npm run prisma:studio` | Launches web UI for viewing database tables. |

---

## 4. Database Seeding

The seed script is located at `prisma/seed.ts` and can be executed with:

```bash
npm run prisma:seed
```

It ensures default system roles and administrator accounts exist idempotently without creating duplicate records.

---

## 5. Health Checking & Fault Tolerance

* **`src/lib/prisma.ts`**: Implements `checkDatabaseConnection()`, measuring database latency and returning connection status.
* **`GET /health`**: Returns HTTP `200 OK` when PostgreSQL is connected or HTTP `503 Service Unavailable` with diagnostic info if disconnected.
* **Server Boot Guard**: `validateEnv()` ensures invalid database URLs immediately halt startup with actionable error logs.
