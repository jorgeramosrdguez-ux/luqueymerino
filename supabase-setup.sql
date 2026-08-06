-- =========================================================
--  Luque & Merino — Configuración de la base de datos
--  Pega TODO este archivo en:  Supabase → SQL Editor → New query → Run
--  Es seguro ejecutarlo varias veces (no duplica datos).
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- Tabla de CATEGORÍAS ----------
create table if not exists public.lym_categories (
  slug        text primary key,
  label       text not null,
  sort_order  integer not null default 100,
  created_at  timestamptz not null default now()
);

-- ---------- Tabla de PRODUCTOS ----------
create table if not exists public.lym_products (
  id           uuid primary key default gen_random_uuid(),
  category     text not null default 'textil',
  name         text not null,
  description  text default '',
  price        text default '',
  image        text default 'cama.svg',
  is_offer     boolean not null default false,
  discount_pct integer,
  old_price    text,
  is_featured  boolean not null default false,
  sort_order   integer not null default 100,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- Seguridad (RLS) ----------
alter table public.lym_categories enable row level security;
alter table public.lym_products   enable row level security;

-- Lectura pública
drop policy if exists lym_cat_public_read on public.lym_categories;
create policy lym_cat_public_read on public.lym_categories for select using (true);

drop policy if exists lym_prod_public_read on public.lym_products;
create policy lym_prod_public_read on public.lym_products for select using (active = true);

-- Acceso total para usuarios con sesión (los administradores)
drop policy if exists lym_cat_admin_all on public.lym_categories;
create policy lym_cat_admin_all on public.lym_categories for all to authenticated using (true) with check (true);

drop policy if exists lym_prod_admin_all on public.lym_products;
create policy lym_prod_admin_all on public.lym_products for all to authenticated using (true) with check (true);

-- Los administradores también pueden ver los productos ocultos
drop policy if exists lym_prod_admin_read on public.lym_products;
create policy lym_prod_admin_read on public.lym_products for select to authenticated using (true);

-- ---------- Categorías iniciales ----------
insert into public.lym_categories (slug, label, sort_order) values
  ('textil',        'Textil hogar',        10),
  ('cortinas',      'Cortinas y estores',  20),
  ('cama-infantil', 'Cama infantil',       30),
  ('colchon',       'Protección colchón',  40),
  ('bebe',          'Bebé',                50)
on conflict (slug) do nothing;

-- ---------- Productos iniciales (solo si la tabla está vacía) ----------
insert into public.lym_products
  (category, name, description, price, image, is_offer, discount_pct, old_price, is_featured, sort_order)
select * from (values
  ('textil','Juego de sábanas','Algodón · encimera, bajera y fundas.','32,90 €','cama.svg',false,null,null,true,10),
  ('textil','Funda nórdica','100% algodón, suave y transpirable.','31,90 €','cama.svg',true,25,'42,90 €',false,20),
  ('textil','Juego de toallas','Algodón rizo · 3 piezas.','16,90 €','toallas.svg',true,30,'24,90 €',true,30),
  ('textil','Albornoz con capucha','Rizo suave · bordado opcional.','34,90 €','albornoz.svg',false,null,null,false,40),
  ('textil','Mantelería resinada','Antimanchas · varias medidas.','23,90 €','mantelerias.svg',true,20,'29,90 €',true,50),
  ('textil','Manta / plaid','Suave y cálida para el sofá o la cama.','27,90 €','cama.svg',false,null,null,false,60),
  ('cortinas','Estor enrollable a medida','Confección e instalación a domicilio.','Presupuesto','cortinas.svg',false,null,null,true,70),
  ('cortinas','Panel japonés','Varios paneles, a medida de tu ventana.','Presupuesto','cortinas.svg',false,null,null,false,80),
  ('cortinas','Cortina confeccionada','Con forro, tela a elegir. Medición e instalación.','Presupuesto','cortinas.svg',false,null,null,false,90),
  ('cama-infantil','Funda nórdica infantil','Algodón, estampados divertidos.','34,90 €','cuna.svg',false,null,null,false,100),
  ('cama-infantil','Juego de sábanas de cuna','100% algodón, suaves con el bebé.','24,90 €','cuna.svg',false,null,null,false,110),
  ('cama-infantil','Edredón infantil','Ligero y cálido para la cuna.','39,90 €','cuna.svg',false,null,null,false,120),
  ('colchon','Protector de colchón impermeable','Transpirable y ajustable a la medida.','19,90 €','colchon.svg',false,null,null,false,130),
  ('colchon','Cubre colchón acolchado','Más confort al dormir.','29,90 €','colchon.svg',false,null,null,false,140),
  ('colchon','Protector de almohada (x2)','Pack de dos, impermeables.','9,90 €','colchon.svg',false,null,null,false,150),
  ('bebe','Arrullo de bebé','Algodón suave · nombre bordado opcional.','27,90 €','bebe.svg',false,null,null,true,160),
  ('bebe','Toalla capa con nombre','Con capucha y nombre bordado.','22,90 €','bordado.svg',false,null,null,false,170),
  ('bebe','Saco de dormir de bebé','Abriga sin que se destape por la noche.','32,90 €','bebe.svg',false,null,null,false,180)
) as v(category,name,description,price,image,is_offer,discount_pct,old_price,is_featured,sort_order)
where not exists (select 1 from public.lym_products);
