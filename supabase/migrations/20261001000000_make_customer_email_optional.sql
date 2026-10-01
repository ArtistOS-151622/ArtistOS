-- Make email optional for customers
alter table public.customers alter column email drop not null;
