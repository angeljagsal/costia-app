# Architecture — Personal Expense Tracker PWA

Source of truth for scope: `expense-app-context.md`.
Decisions locked: en + es-MX from day one (i18n), Cloudflare Pages hosting,
Supabase Auth email magic link, in-app Upcoming Bills (no push v1),
`base_amount` frozen forever.

## 1. System architecture

```mermaid
flowchart TB
    PWA["PWA Client<br/>React + Vite + Tailwind<br/>Service Worker + SQLite WASM"] -->|instant read/write| LocalDB["Local SQLite<br/>via PowerSync SDK"]
    LocalDB -->|background bidirectional sync| PS["PowerSync Cloud<br/>sync engine"]
    PS -->|logical replication| PG["Supabase Postgres<br/>source of truth + RLS"]
    PG --> AUTH["Supabase Auth<br/>email magic link"]
    PG --> CRON["pg_cron inside Postgres<br/>1. FX refresh daily<br/>2. recurring due check daily"]
    CRON --> FX["Frankfurter API<br/>ECB rates, free, no key"]
    PWA -->|static build, no SSR| CF["Cloudflare Pages<br/>preview + prod"]
```

Rules:

- Frontend talks only to PowerSync for data. Only PowerSync talks to Postgres.
- Static build, no SSR. All queries that can run locally run locally.
- `pg_cron` + Edge-adjacent SQL is the only server compute (no extra host).

## 2. Offline write and sync flow

```mermaid
flowchart TB
    A["User action<br/>Add/Edit/Delete offline"] --> B["Write local SQLite<br/>instant UI update"]
    B --> C["Outbox queue<br/>PowerSync, durable"]
    C -->|when online| D["Upload to Postgres<br/>validate, freeze base_amount"]
    D --> E["Fan-out to other devices<br/>same household_id"]
```

- UI never blocks on network. Sync is background.
- Conflict strategy v1: last-write-wins. Flagged for revisit if household >1 user writes concurrently.

## 3. Data model (v1)

```mermaid
erDiagram
    HOUSEHOLDS ||--o{ USERS : has_members
    HOUSEHOLDS ||--o{ ACCOUNTS : owns
    HOUSEHOLDS ||--o{ TAGS : has_tags
    ACCOUNTS ||--o{ TRANSACTIONS : records
    CATEGORIES ||--o{ TRANSACTIONS : classifies
    CATEGORIES ||--o{ BUDGETS : limits
    ACCOUNTS ||--o{ RECURRING_RULES : generates
    CATEGORIES ||--o{ RECURRING_RULES : classifies
    TRANSACTIONS ||--o{ TRANSACTION_SPLITS : splits_into
    TRANSACTIONS ||--o{ TRANSACTION_TAGS : has_tags
    TAGS ||--o{ TRANSACTION_TAGS : tags
    RECURRING_RULES ||--o{ TRANSACTIONS : spawns
```

Tables (Postgres = source of truth, SQLite mirrors subset):

- `households(id uuid pk, name text)` — everything hangs off this, even single-user v1.
- `users(id uuid pk -> auth.users, email, base_currency MXN|USD, household_id fk, locale en|es-MX)`.
- `accounts(id, household_id fk, name, type: bank|cash|credit|digital_wallet|investment)`.
- `categories(id, name, kind: expense|income)` — seeded bilingual (see §6).
- `transactions(id, account_id fk, category_id fk, amount numeric, currency MXN|USD, base_amount numeric FROZEN, txn_date date, kind, note nullable, recurring_rule_id nullable fk, created_at)`.
- `transaction_splits(id, transaction_id fk, category_id fk, amount)` — sum(splits) == amount.
- `tags(id, household_id fk, name)` + `transaction_tags(transaction_id, tag_id)`.
- `budgets(id, category_id fk expense-only, limit_amount, period: weekly|monthly|yearly)` — reset each period, no rollover.
- `recurring_rules(id, account_id fk, category_id fk, amount, currency, cadence: weekly|monthly|yearly, next_due date, note nullable)` — never pre-creates future rows.
- `exchange_rates(base_currency, target_currency, rate, fetched_at)` — daily Frankfurter cache.

Invariants:

1. `base_amount` computed once at creation with rate on `txn_date`, never recomputed on read or on base-currency switch.
2. Recurring job: daily check `next_due <= today` → insert `transactions` → advance `next_due` (+7d / +1mo with month-end clamp / +1y). Cancelling a rule deletes zero future rows.
3. Balances and reports always aggregate `base_amount` signed by `kind`, never live FX.

## 4. Component structure

```mermaid
flowchart TB
    App --> AuthProvider --> ThemeProvider --> I18nProvider --> SyncProvider --> Router
    Router --> Dashboard
    Router --> Transactions
    Router --> Accounts
    Router --> Categories
    Router --> Budgets
    Router --> Recurring
    Router --> Reports
    Router --> Settings
    Dashboard --> BudgetOverview
    Dashboard --> RecentTx
    Dashboard --> CategoryPie
    Dashboard --> IncomeVsExp
    Dashboard --> UpcomingBills
    Dashboard --> Balances
```

Folders:

```text
src/
  components/  # design-system primitives + layout (Sidebar/BottomNav, Header)
  pages/       # one per route
  features/    # transactions, accounts, categories, budgets, recurring, reports
  hooks/ contexts/ services/ # repositories, sync, fx, i18n, theme
  types/ utils/
  assets/ locales/ # en.json, es-MX.json
```

## 5. PWA requirements (must-pass per release)

1. `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
2. `100dvh`, never `100vh`.
3. `env(safe-area-inset-*)` padding on root + fixed bars (0 on Windows, correct on Android).
4. `manifest.json`: `display:standalone`, `theme_color/background_color` = app bg, maskable 192 + 512 with art inside 80% safe zone (verify maskable.app).
5. `vite-plugin-pwa` Workbox service worker, offline shell.
6. Lighthouse PWA audit green. Targets: Windows Chrome/Edge, Android Chrome Pixel 9 Pro XL.

## 6. i18n (en + es-MX day one)

- `src/locales/en.json`, `es-MX.json`, user `locale` in settings + stored on `users`.
- Seed categories bilingual; currency display disambiguates `MX$` vs `US$`; dates via `Intl.DateTimeFormat(locale)`.
- No hardcoded UI strings outside locales.

## 7. Cost model

| Service | Free tier | Expected | Cost |
|---|---|---|---|
| Supabase | 500 MB, 50k MAU | few MB | $0 |
| PowerSync | 2 GB synced/mo | 1–3 users | $0 |
| Cloudflare Pages | generous static | low traffic | $0 |
| Frankfurter | free unlimited | daily | $0 |

Note: Supabase free pauses after 7d inactivity — resume from dashboard; non-issue with weekly use.
