-- Add read_at column to track if an in-app notification has been seen
alter table public.notification_events
  add column if not exists read_at timestamp with time zone;

-- Index for fetching unread notifications efficiently
create index if not exists notification_events_user_read_at_idx
  on public.notification_events(user_id, read_at)
  where read_at is null;
