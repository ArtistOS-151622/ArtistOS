-- Add studio_logo_file_id to users
alter table users add column if not exists studio_logo_file_id bigint;

alter table users drop constraint if exists users_studio_logo_file_id_fkey;
alter table users add constraint users_studio_logo_file_id_fkey
  foreign key (studio_logo_file_id) references portfolio_files(id) on delete set null;
