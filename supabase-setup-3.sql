-- =========================================================
--  Luque & Merino — AMPLIACIÓN 3
--  Encuadre de las fotos (centrar, ampliar y reducir)
--  Pega TODO esto en: Supabase → SQL Editor → New query → Run
--  Es seguro ejecutarlo varias veces.
-- =========================================================

alter table public.lym_products
  add column if not exists img_fit  text    default 'cover',
  add column if not exists img_zoom integer default 100,
  add column if not exists img_x    integer default 50,
  add column if not exists img_y    integer default 50;
