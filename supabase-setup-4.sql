-- =========================================================
--  Luque & Merino — AMPLIACIÓN 4
--  Fotos de las categorías · Galería por producto · Colores y medidas
--  Pega TODO esto en: Supabase → SQL Editor → New query → Run
--  Es seguro ejecutarlo varias veces.
-- =========================================================

-- ---------- Categorías: foto propia y descripción ----------
alter table public.lym_categories
  add column if not exists description text default '',
  add column if not exists image    text,
  add column if not exists img_zoom integer default 100,
  add column if not exists img_x    integer default 50,
  add column if not exists img_y    integer default 50;

-- Descripciones de las categorías iniciales (solo si están vacías)
update public.lym_categories set description = 'Sábanas, toallas, mantelerías, mantas y edredones.'
  where slug = 'textil' and coalesce(description, '') = '';
update public.lym_categories set description = 'Confección e instalación a medida y paneles japoneses.'
  where slug = 'cortinas' and coalesce(description, '') = '';
update public.lym_categories set description = 'Fundas nórdicas, sábanas y edredones de cuna.'
  where slug = 'cama-infantil' and coalesce(description, '') = '';
update public.lym_categories set description = 'Protectores impermeables, cubrecolchones y fundas.'
  where slug = 'colchon' and coalesce(description, '') = '';
update public.lym_categories set description = 'Arrullos, toallas y ajuar — el regalo perfecto.'
  where slug = 'bebe' and coalesce(description, '') = '';

-- ---------- Productos: galería de fotos ----------
alter table public.lym_products
  add column if not exists gallery jsonb default '[]'::jsonb;

-- ---------- Variantes: color, medida y precio ----------
create table if not exists public.lym_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.lym_products(id) on delete cascade,
  color       text default '',
  size        text default '',
  price       text default '',
  sort_order  integer not null default 100,
  created_at  timestamptz not null default now()
);

create index if not exists lym_variants_product_idx on public.lym_variants (product_id);

alter table public.lym_variants enable row level security;

drop policy if exists lym_var_public_read on public.lym_variants;
create policy lym_var_public_read on public.lym_variants for select using (true);

drop policy if exists lym_var_admin_all on public.lym_variants;
create policy lym_var_admin_all on public.lym_variants for all to authenticated using (true) with check (true);
