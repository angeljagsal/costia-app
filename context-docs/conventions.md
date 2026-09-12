# Conventions — Costia repo working agreements

## Gitignored paths must be dot-named

Any folder or file that belongs in `.gitignore` (local-only, machine-specific,
or secret-bearing) must be named with a leading `.`:

- Good: `.env`, `.obsidian/`, `.venv/`, `.vscode/`, `.idea/`
- Avoid: `local-env/`, `notes-private/`, `venv/`

Rationale: dot-paths are hidden by default in explorers and shells, which makes
"not for git" visible at a glance and keeps the working tree clean.

Exception: names dictated by tooling stay as the tool requires
(`node_modules/`, `dist/`, log files). The rule covers paths we choose ourselves.

## Other standing agreements

- All context, change, and app documentation lives in `context-docs/`.
- Small atomic commits straight to `main` (conventional prefixes), pushed as we go.
- Commits are authored as Angel Aguilar <angeljagsal@gmail.com> (repo-local git
  identity; early history is `costia-dev` — see decisions log).
- `lint` 0 warnings, `typecheck` clean, `build` green before every push.
- Prettier owns formatting; `context-docs/` is prettier-ignored (hand formatting).
- Never commit secrets (`.env`, passwords, keys). Verify with `git status` + `git diff`.

## UI rules (locked with the user)

- Text-only `<button>` elements — never icons, emojis, or glyphs inside buttons.
  Icons live only on navigation (sidebar/bottom tabs, hero quick actions,
  view-all chevrons, More tiles, search field decoration). Single exception:
  OAuth provider brand marks on the login buttons (user-requested standard).
- No gradients anywhere — flat solid colors + borders + soft shadows only.
- No emojis anywhere in UI or code comments.
- GitLab-inspired, bank-style: neutral grays, one action blue, tabular numerals.
- All-ages: 16px+ text, 44px+ targets, always-visible labels, no icon-only controls.
- Full system reference: `context-docs/07-ui-system.md`.
