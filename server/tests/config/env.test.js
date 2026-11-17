import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { promisify } from "node:util"

const run = promisify(execFile)
const SERVER_DIR = fileURLToPath(new URL("../..", import.meta.url))
const SECRET = "x".repeat(40)

/** Loads src/config/env.js in a fresh process with exactly `env`; returns { code, config, stderr }. */
async function loadConfig(env) {
  const script = `import("#src/config/env.js").then(({ config }) => process.stdout.write(JSON.stringify(config)))`
  try {
    const { stdout } = await run(process.execPath, ["--input-type=module", "-e", script], {
      cwd: SERVER_DIR,
      env: { PATH: process.env.PATH, ...env },
    })
    return { code: 0, config: JSON.parse(stdout) }
  } catch (err) {
    return { code: err.code, stderr: err.stderr }
  }
}

test("development defaults, quote stripping and NEXT_PUBLIC_* fallbacks", async () => {
  const { code, config } = await loadConfig({
    JWT_SECRET: SECRET,
    R2_BUCKET_NAME: ' "artistos-media" ',
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: "pub",
    WHATSAPP_API_VERSION: "",
  })
  assert.equal(code, 0)
  assert.equal(config.env, "development")
  assert.equal(config.port, 4000)
  assert.deepEqual(config.frontendOrigins, ["http://localhost:3000"])
  assert.equal(config.r2.bucketName, "artistos-media")
  assert.equal(config.supabase.url, "https://example.supabase.co")
  assert.equal(config.push.vapidPublicKey, "pub")
  assert.equal(config.whatsapp.apiVersion, "v20.0")
  assert.equal(config.notifications.maxAttempts, 3)
  assert.equal(config.appTimezone, "Asia/Kolkata")
})

test("a missing JWT secret stops boot", async () => {
  const { code, stderr } = await loadConfig({})
  assert.equal(code, 1)
  assert.match(stderr, /JWT_SECRET: required/)
})

test("production lists every missing required variable and exits", async () => {
  const { code, stderr } = await loadConfig({ NODE_ENV: "production", JWT_SECRET: SECRET })
  assert.equal(code, 1)
  for (const name of [
    "FRONTEND_ORIGINS", "COOKIE_DOMAIN", "ADMIN_PASSWORD", "CRON_SECRET", "SUPABASE_SERVICE_ROLE_KEY",
    "R2_ACCOUNT_ID", "R2_BUCKET_NAME", "RAZORPAY_KEY_ID", "RAZORPAY_WEBHOOK_SECRET",
  ]) {
    assert.match(stderr, new RegExp(name), `${name} should be reported`)
  }
})

test("a short secret is rejected", async () => {
  const { code, stderr } = await loadConfig({ JWT_SECRET: "short" })
  assert.equal(code, 1)
  assert.match(stderr, /JWT_SECRET/)
})

test("DISABLE_RATE_LIMITS is refused in production", async () => {
  const { code, stderr } = await loadConfig({ NODE_ENV: "production", JWT_SECRET: SECRET, DISABLE_RATE_LIMITS: "true" })
  assert.equal(code, 1)
  assert.match(stderr, /DISABLE_RATE_LIMITS: must not be enabled in production/)
})

test("rate limits are on by default and can be disabled outside production", async () => {
  assert.equal((await loadConfig({ JWT_SECRET: SECRET })).config.rateLimitsEnabled, true)
  assert.equal((await loadConfig({ JWT_SECRET: SECRET, DISABLE_RATE_LIMITS: "true" })).config.rateLimitsEnabled, false)
})
