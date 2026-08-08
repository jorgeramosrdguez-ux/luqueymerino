-- =========================================================
--  Luque & Merino — AMPLIACIÓN 5
--  Una foto para cada color y medida
--  Pega TODO esto en: Supabase → SQL Editor → New query → Run
--  Es seguro ejecutarlo varias veces.
-- =========================================================

alter table public.lym_variants
  add column if not exists image text;
