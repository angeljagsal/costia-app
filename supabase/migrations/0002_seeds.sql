-- 0002_seeds.sql — default bilingual category catalog.
-- `key` maps to client dictionaries `categories.<key>` (en + es-MX).
-- Idempotent: safe to re-run.

insert into public.categories (key, kind, sort) values
  ('food_dining', 'expense', 1),
  ('transportation', 'expense', 2),
  ('housing', 'expense', 3),
  ('utilities', 'expense', 4),
  ('entertainment', 'expense', 5),
  ('health_fitness', 'expense', 6),
  ('education', 'expense', 7),
  ('shopping', 'expense', 8),
  ('other_expense', 'expense', 9),
  ('salary', 'income', 1),
  ('freelance', 'income', 2),
  ('other_income', 'income', 3)
on conflict (key) do nothing;
