CREATE OR REPLACE VIEW public.customer_stats AS
SELECT 
  c.id,
  c.user_id,
  c.customer_name,
  c.phone,
  c.alt_phone,
  c.email,
  c.address,
  c.reference_by,
  c.created_at,
  COUNT(b.id)::int as booking_count
FROM customers c
LEFT JOIN bookings b ON c.id = b.customer_id
GROUP BY c.id;
