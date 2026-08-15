alter table public.platform_subscriptions
add column if not exists compare_at_amount_inr numeric,
add column if not exists discount_percentage numeric,
add column if not exists gst_percentage numeric default 18;

update public.platform_subscriptions
set
  amount_inr = 249,
  compare_at_amount_inr = 500,
  discount_percentage = 50,
  gst_percentage = 18
where lower(name) = 'monthly';

update public.platform_subscriptions
set
  amount_inr = 2799,
  compare_at_amount_inr = 5000,
  discount_percentage = 44,
  gst_percentage = 18
where lower(name) = 'yearly';
