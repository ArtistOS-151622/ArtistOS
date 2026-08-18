create table if not exists platform_subscriptions (
  id bigint primary key generated always as identity,
  name text not null,
  description text,
  amount_inr numeric not null default 0,
  original_price_inr numeric(10,2),
  billing_period text,
  features jsonb default '[]'::jsonb,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  badge_text text,
  display_order integer not null default 0,
  razorpay_plan_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table platform_subscriptions enable row level security;

-- Create policies
create policy "Platform subscriptions are viewable by everyone."
  on platform_subscriptions for select
  using (true);

-- No public insert/update/delete policies because it's admin only, 
-- and the backend uses the service role key for admin routes.

-- Trigger for updated_at
create or replace function set_platform_subscriptions_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger platform_subscriptions_set_updated_at
before update on platform_subscriptions
for each row
execute function set_platform_subscriptions_updated_at();

-- Insert default seed data
insert into platform_subscriptions (name, description, amount_inr, billing_period, features, is_active, is_featured)
values
(
  'Monthly',
  'Best for solo artists who want to organize bookings and payments.',
  200,
  '/month',
  '["Booking calendar", "Client CRM", "Payment tracking", "Portfolio gallery"]'::jsonb,
  true,
  false
),
(
  'Yearly',
  'Save more with a full year of business management tools.',
  2000,
  '/year',
  '["Everything in Monthly", "Festival campaign planning", "Business reports", "Priority support"]'::jsonb,
  true,
  true
),
(
  'Custom',
  'For salons, academies, and brands that need their own branded platform.',
  0,
  '',
  '["Custom branding", "Team access", "Custom domain", "Dedicated setup"]'::jsonb,
  true,
  false
);
