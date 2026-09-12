# UI system — Costia visual and interaction reference

Date: 2026-09-11 (evolves; this file is the source of truth for look and feel).
Locked rules also live in `conventions.md`. No gradients, no emojis, ever.

## Design language

GitLab Pajamas-inspired, bank-style: neutral gray surfaces, one action blue
(`#1f75cb` light / `#499ed7` dark), semantic green/red/amber, tabular numerals
for money. Light sidebar (white, blue-pill active item); dark-gray sidebar in
dark mode. Flat navy hero (`#292961`, solid). Full tokens in `src/index.css`.

## Navigation (4 items + More)

Home (`/`, bank hero + everything) · Activity (`/transactions`) ·
Budgets (`/budgets`) · More (`/more`: Accounts, Categories, Recurring,
Settings). `/reports` redirects to `/`. Sidebar sticky on desktop
(`.sidebar-fixed`); 4 equal icon-over-label tabs on mobile. Brand mark:
flat blue rounded square with white "C" (`.logo-mark`, pure CSS).

## Shared controls (`src/index.css`)

`.btn` + `.btn-primary/.btn-secondary/.btn-danger/.btn-quiet` (44px, 6px
radius, text-only) · `.input` (44px, gray border, blue focus ring) ·
`.label` · `.card` (12px radius, soft shadow) · `.hint` / `.error-text` ·
`.page-title` / `.page-sub` · `.amount` (tabular, bold).

## Form system (bank-style, see TransactionForm)

`.segmented` (+ `.segmented-3`) toggles · `.amount-hero` (big numerals +
currency chips) · `.option-grid` + `.option-card` (letter avatars, check on
select; collapses past 6 with show-all) · `.radio-row` + `.radio-dot[_-fill]`
(accounts with live balances; collapses past 4) · `details.advanced` for
splits/tags · `.form-cta` sticky row: total + equal-sized blue Save +
outlined Cancel. Errors thrown as i18n keys, translated at the form.

## Icons (`src/components/icons.tsx`)

Hand-drawn 24px stroke set, `currentColor`, `aria-hidden`: home, activity,
budget, more, plus, minus, pencil, trash, bank, tag, repeat, gear, logout,
chevron-right, check, X, clock, calendar, search. Navigation/links only —
never inside `<button>`, except OAuth provider brand marks (Google G,
Microsoft squares) on the login buttons per user request.

## Charts

Recharts; ticks use `currentColor`, tooltips use surface/border/text vars so
both schemes work without JS theme reads. Pie + HTML legend, bars, cumulative
balance line. Bundle note: recharts added ~450 KB (gzip +130 KB);
code-split by route in Phase 7.

## i18n pattern

`src/i18n/locales/{en,es-MX}.json`; `t('a.b.c')` returns the key path on
miss. Catalog categories resolve via `categories.<key>`; `common.*` holds
shared actions (save/cancel/delete/add/remove/show-all). `categoryName(t, row)`
accepts catalog rows and joined views.
