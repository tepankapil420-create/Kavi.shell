-- Kavi.shell schema upgrade. Run in Supabase Dashboard > SQL Editor.
-- Admin login email retained from the original project: tepankapil420@gmail.com

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(), name text not null,
  parent_id uuid references public.categories(id) on delete cascade,
  sort_order integer not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(), category_id uuid not null references public.categories(id) on delete cascade,
  code text not null unique, name text, price numeric(10,2) not null default 599,
  image_url text not null, is_active boolean not null default true,
  sort_order integer not null default 0, created_at timestamptz not null default now()
);
alter table public.products add column if not exists name text;
alter table public.products add column if not exists price numeric(10,2) not null default 599;
create table if not exists public.site_settings (
  id integer primary key default 1 check (id=1), brand_name text not null default 'Kavi.shell',
  tagline text not null default 'SPEAK WITHOUT WORDS', logo_url text,
  updated_at timestamptz not null default now()
);
alter table public.site_settings add column if not exists tagline text not null default 'SPEAK WITHOUT WORDS';
insert into public.site_settings(id,brand_name,tagline) values(1,'Kavi.shell','SPEAK WITHOUT WORDS') on conflict(id) do update set brand_name=coalesce(nullif(public.site_settings.brand_name,'YOUR BRAND'),'Kavi.shell');

create table if not exists public.phone_models (
  id uuid primary key default gen_random_uuid(), brand text not null,
  model_name text not null, display_name text not null,
  created_at timestamptz not null default now(), unique(brand,model_name)
);
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(), customer_name text not null,
  customer_phone text not null, customer_address text,
  items jsonb not null, total numeric(10,2) not null default 0,
  status text not null default 'New', created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.site_settings enable row level security;
alter table public.phone_models enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories" on public.categories for select using(true);
drop policy if exists "Admin can manage categories" on public.categories;
create policy "Admin can manage categories" on public.categories for all using((auth.jwt()->>'email')='tepankapil420@gmail.com') with check((auth.jwt()->>'email')='tepankapil420@gmail.com');
drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products" on public.products for select using(is_active=true or (auth.jwt()->>'email')='tepankapil420@gmail.com');
drop policy if exists "Admin can manage products" on public.products;
create policy "Admin can manage products" on public.products for all using((auth.jwt()->>'email')='tepankapil420@gmail.com') with check((auth.jwt()->>'email')='tepankapil420@gmail.com');
drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings" on public.site_settings for select using(true);
drop policy if exists "Admin can update site settings" on public.site_settings;
create policy "Admin can update site settings" on public.site_settings for all using((auth.jwt()->>'email')='tepankapil420@gmail.com') with check((auth.jwt()->>'email')='tepankapil420@gmail.com');
drop policy if exists "Public can read phone models" on public.phone_models;
create policy "Public can read phone models" on public.phone_models for select using(true);
drop policy if exists "Admin can manage phone models" on public.phone_models;
create policy "Admin can manage phone models" on public.phone_models for all using((auth.jwt()->>'email')='tepankapil420@gmail.com') with check((auth.jwt()->>'email')='tepankapil420@gmail.com');
drop policy if exists "Anyone can create an order" on public.orders;
create policy "Anyone can create an order" on public.orders for insert with check(true);
drop policy if exists "Admin can view orders" on public.orders;
create policy "Admin can view orders" on public.orders for select using((auth.jwt()->>'email')='tepankapil420@gmail.com');
drop policy if exists "Admin can update orders" on public.orders;
create policy "Admin can update orders" on public.orders for update using((auth.jwt()->>'email')='tepankapil420@gmail.com') with check((auth.jwt()->>'email')='tepankapil420@gmail.com');

insert into storage.buckets(id,name,public) values('catalogue-images','catalogue-images',true) on conflict(id) do update set public=true;
drop policy if exists "Public can view catalogue images" on storage.objects;
create policy "Public can view catalogue images" on storage.objects for select using(bucket_id='catalogue-images');
drop policy if exists "Admin can upload catalogue images" on storage.objects;
create policy "Admin can upload catalogue images" on storage.objects for insert with check(bucket_id='catalogue-images' and (auth.jwt()->>'email')='tepankapil420@gmail.com');
drop policy if exists "Admin can update catalogue images" on storage.objects;
create policy "Admin can update catalogue images" on storage.objects for update using(bucket_id='catalogue-images' and (auth.jwt()->>'email')='tepankapil420@gmail.com') with check(bucket_id='catalogue-images' and (auth.jwt()->>'email')='tepankapil420@gmail.com');
drop policy if exists "Admin can delete catalogue images" on storage.objects;
create policy "Admin can delete catalogue images" on storage.objects for delete using(bucket_id='catalogue-images' and (auth.jwt()->>'email')='tepankapil420@gmail.com');

insert into public.categories(name,parent_id,sort_order) select 'Men',null,1 where not exists(select 1 from public.categories where parent_id is null and lower(name)='men');
insert into public.categories(name,parent_id,sort_order) select 'Women',null,2 where not exists(select 1 from public.categories where parent_id is null and lower(name)='women');
