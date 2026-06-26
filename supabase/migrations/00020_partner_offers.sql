-- M4 Recomendações: config-driven affiliate offers + click log.
--
-- Offers are DATA, not hardcoded. Readable by any authenticated user (active
-- only); written only by admin (the owner emails) or service_role. Clicks are
-- logged per user for analytics + a compliance trail. Compliance is enforced in
-- the app, supported by these columns: the UI always shows a "paid partnership"
-- disclosure; `category` lets the app hide credit offers from indebted couples;
-- `requires_opt_in` flags offers that must not be personalized without consent.
--
-- Reversible: drop table partner_offer_clicks; drop table partner_offers.

create table partner_offers (
  id uuid primary key default uuid_generate_v4(),
  title_translations jsonb not null default '{}'::jsonb,        -- { en, pt, ru, uk }
  description_translations jsonb not null default '{}'::jsonb,  -- { en, pt, ru, uk }
  affiliate_url text not null,                                  -- external link (NOT IAP)
  category text,                -- 'cashback' | 'discount' | 'credit' | 'investment' | 'insurance' | 'bank' | ...
  icon text default 'pricetag-outline',                         -- Ionicons name
  icon_color text default '#FF8FB1',
  requires_opt_in boolean not null default false,
  active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partner_offers_active_order_idx on partner_offers (active, display_order);

alter table partner_offers enable row level security;

create policy "Anyone authenticated can view active offers"
  on partner_offers for select
  using (active = true);

-- Admin (owner emails) manages offers from a dashboard / SQL. service_role bypasses RLS.
create policy "Admin can manage offers"
  on partner_offers for all
  using (auth.jwt() ->> 'email' in ('madualvesfr@icloud.com', 'madualvesfr@gmail.com'))
  with check (auth.jwt() ->> 'email' in ('madualvesfr@icloud.com', 'madualvesfr@gmail.com'));

create trigger partner_offers_updated_at before update on partner_offers
  for each row execute function update_updated_at();

-- Click log.
create table partner_offer_clicks (
  id uuid primary key default uuid_generate_v4(),
  partner_offer_id uuid not null references partner_offers(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  couple_id uuid references couples(id) on delete set null,
  clicked_at timestamptz not null default now()
);

create index partner_offer_clicks_offer_idx on partner_offer_clicks (partner_offer_id, clicked_at desc);
create index partner_offer_clicks_profile_idx on partner_offer_clicks (profile_id, clicked_at desc);

alter table partner_offer_clicks enable row level security;

create policy "Users can log their own clicks"
  on partner_offer_clicks for insert
  with check (profile_id in (select id from profiles where user_id = auth.uid()));

create policy "Users can read their own clicks"
  on partner_offer_clicks for select
  using (profile_id in (select id from profiles where user_id = auth.uid()));

create policy "Admin can read all clicks"
  on partner_offer_clicks for select
  using (auth.jwt() ->> 'email' in ('madualvesfr@icloud.com', 'madualvesfr@gmail.com'));

-- Example offer (commented — populate real partners + affiliate URLs in the dashboard):
-- insert into partner_offers (title_translations, description_translations, affiliate_url, category, icon)
-- values (
--   '{"pt":"Cartão sem anuidade","en":"No-fee credit card"}',
--   '{"pt":"Cashback em todas as compras.","en":"Cashback on every purchase."}',
--   'https://parceiro.exemplo/afiliado?ref=paca', 'cashback', 'card-outline'
-- );
