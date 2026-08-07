-- =========================================================
--  Luque & Merino — AMPLIACIÓN 2
--  Fotos propias + imágenes de la web
--  Pega TODO esto en: Supabase → SQL Editor → New query → Run
--  Es seguro ejecutarlo varias veces.
-- =========================================================

-- ---------- Tabla de AJUSTES (imágenes de la web) ----------
create table if not exists public.lym_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

alter table public.lym_settings enable row level security;

drop policy if exists lym_set_public_read on public.lym_settings;
create policy lym_set_public_read on public.lym_settings for select using (true);

drop policy if exists lym_set_admin_all on public.lym_settings;
create policy lym_set_admin_all on public.lym_settings for all to authenticated using (true) with check (true);

-- ---------- Almacén de imágenes (Storage) ----------
insert into storage.buckets (id, name, public)
values ('lym-images', 'lym-images', true)
on conflict (id) do update set public = true;

-- Cualquiera puede VER las fotos (son de la web pública)
drop policy if exists lym_img_public_read on storage.objects;
create policy lym_img_public_read on storage.objects
  for select using (bucket_id = 'lym-images');

-- Solo los administradores pueden subir, cambiar o borrar
drop policy if exists lym_img_admin_insert on storage.objects;
create policy lym_img_admin_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'lym-images');

drop policy if exists lym_img_admin_update on storage.objects;
create policy lym_img_admin_update on storage.objects
  for update to authenticated using (bucket_id = 'lym-images') with check (bucket_id = 'lym-images');

drop policy if exists lym_img_admin_delete on storage.objects;
create policy lym_img_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'lym-images');
