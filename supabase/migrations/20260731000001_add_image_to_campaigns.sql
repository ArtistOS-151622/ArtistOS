-- Add image_url column to broadcast_campaigns
ALTER TABLE public.broadcast_campaigns
  ADD COLUMN IF NOT EXISTS image_url TEXT;
