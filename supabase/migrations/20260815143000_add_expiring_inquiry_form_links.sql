create or replace function public.generate_inquiry_form_code()
returns text as $$
declare
  candidate text;
begin
  loop
    candidate := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
    exit when not exists (
      select 1 from public.users where inquiry_form_code = candidate
    );
  end loop;

  return candidate;
end;
$$ language plpgsql volatile;

alter table public.users
add column if not exists inquiry_form_code varchar(12);

alter table public.users
add column if not exists inquiry_form_active_until timestamp with time zone;

update public.users
set inquiry_form_code = upper(substr(md5(id::text || phone || created_at::text), 1, 10))
where inquiry_form_code is null;

alter table public.users
alter column inquiry_form_code set default public.generate_inquiry_form_code();

alter table public.users
alter column inquiry_form_code set not null;

create unique index if not exists users_inquiry_form_code_key
on public.users(inquiry_form_code);

create index if not exists users_inquiry_form_active_until_idx
on public.users(inquiry_form_active_until);
