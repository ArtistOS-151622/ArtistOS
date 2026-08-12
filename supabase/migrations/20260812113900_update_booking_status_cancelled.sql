ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
UPDATE public.bookings SET status = 'cancelled' WHERE status = 'canceled';
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check CHECK (status in ('pending', 'confirmed', 'completed', 'cancelled'));
