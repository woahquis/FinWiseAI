-- supabase_schema.sql
create table if not exists public.orders (
  id bigserial primary key,
  paypal_order_id text unique,
  event_type text,
  item_name text,
  amount_cents integer,
  currency text default 'USD',
  payer_email text,
  raw_json jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_orders_created_at on public.orders (created_at desc);
alter table public.orders enable row level security;
