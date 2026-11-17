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
