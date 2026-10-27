-- Migration: Add custom_storage_bytes to users table and update default plan quotas

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS custom_storage_bytes bigint DEFAULT NULL;

-- Update Starter plans to 100 MB
UPDATE public.platform_subscriptions
SET storage_quota_mb = 100
WHERE name ILIKE '%Starter%';

-- Update Pro plans to 500 MB
UPDATE public.platform_subscriptions
SET storage_quota_mb = 500
WHERE name ILIKE '%Pro%';
