-- Remove GST columns and settings

-- Drop gst_amount from storage_purchases
ALTER TABLE public.portfolio_storage_purchases DROP COLUMN IF EXISTS gst_amount;

-- Drop gst_amount from platform_payments
ALTER TABLE public.platform_payments DROP COLUMN IF EXISTS gst_amount;

-- Drop gst_percentage from platform_subscriptions
ALTER TABLE public.platform_subscriptions DROP COLUMN IF EXISTS gst_percentage;

-- Delete global_gst_rate from settings
DELETE FROM public.platform_settings WHERE key = 'global_gst_rate';
