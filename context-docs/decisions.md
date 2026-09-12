# Decisions (ADR stubs — full text lands per phase)

- ADR-001: React + Vite + Tailwind (standard, fast loop) — see `expense-app-context.md` §5.
- ADR-002: Supabase Postgres + Auth + RLS (relational required for budgets/recurring; free tier covers scale).
- ADR-003: PowerSync SQLite WASM + sync engine (offline-first, real SQL locally).
- ADR-004: `pg_cron` for FX refresh + recurring generation (no extra host).
- ADR-005: Frankfurter API for FX (free, no key, ECB data).
- ADR-006: Cloudflare Pages for static PWA hosting (decided 2026-09-10).
- ADR-007: Supabase Auth email magic link only for v1 (decided 2026-09-10,
  revised 2026-09-11: magic links proved flaky — OTP rate limits + inbox delays.
  Email + password is now the primary sign-in, magic link stays as fallback.
  No dashboard change needed; both use the built-in Email provider.)
  Revised again 2026-09-11: Google + Microsoft OAuth added via
  `signInWithOAuth` (no new deps/env/schema; Supabase dashboard provider
  setup by owner); magic-link tab removed, password stays as fallback.
  Same day: Microsoft dropped before setup (owner only needs Google);
  login keeps Google + password. OAuth brand marks use exact artwork
  (Google G paths from Wikimedia Commons).
- ADR-008: Notifications = in-app Upcoming Bills only, no push v1 (decided 2026-09-10).
- ADR-009: UI locales en + es-MX from day one, user-choosable (decided 2026-09-10).
- ADR-010: `base_amount` frozen forever, even on base-currency switch (decided 2026-09-10).
- ADR-011: single home screen + 4-item nav (Home, Activity, Budgets, More).  Separate Reports removed (`/reports` redirects to `/`); its content
  (totals, trend, balance history) lives on Home. Second-level sections
  (Accounts, Categories, Recurring, Settings) live under More. Bank-style
  hero with total balance + New expense/income quick actions (decided 2026-09-11).
- ADR-012: email strategy — Confirm email OFF (password signup needs zero
  emails; sign-in is unlimited and email-free). Built-in Supabase SMTP caps at
  ~2 signup emails/hour, which blocked testing. Custom SMTP (e.g. Gmail app
  password) deferred until magic links or reset emails must be reliable.
  UI names rate-limit states explicitly (decided 2026-09-11).
