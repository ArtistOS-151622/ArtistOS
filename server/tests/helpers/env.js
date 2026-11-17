// Import this FIRST in every test file: src/config/env.js reads process.env once, at import time.
export const TEST_JWT_SECRET = "test-jwt-secret-0123456789abcdef0123456789"
export const TEST_CRON_SECRET = "test-cron-secret-0123456789abcdef012345678"
export const TEST_ORIGIN = "http://localhost:3000"

process.env.NODE_ENV = "test"
process.env.JWT_SECRET = TEST_JWT_SECRET
process.env.CRON_SECRET = TEST_CRON_SECRET
process.env.FRONTEND_ORIGINS = TEST_ORIGIN
process.env.ADMIN_PASSWORD = "test-admin-password"
delete process.env.COOKIE_DOMAIN

// Never reach real services from tests: integrations report "not configured" instead.
for (const name of [
  "WHATSAPP_ACCESS_TOKEN",
  "VAPID_PUBLIC_KEY",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
]) {
  delete process.env[name]
}
