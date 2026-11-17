import { z } from "zod"

/**
 * Reads and validates process.env once at boot. A missing or invalid variable
 * stops the process with a clear message instead of failing later at runtime.
 *
 * Integration variables (Supabase, R2, Razorpay, WhatsApp, push…) are added
 * here as each integration is ported.
 */

const MIN_SECRET_LENGTH = 32

const isProduction = process.env.NODE_ENV === "production"

/** Required in production, optional elsewhere. */
const requiredInProduction = (schema) => (isProduction ? schema : schema.optional())

const csvList = z
  .string()
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  )
  .pipe(z.array(z.url()).min(1))

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  // Must be identical to the value used by the Next.js app (Vercel): both sides
  // sign/verify the same session tokens. Same fallback order as lib/auth/session.ts.
  JWT_SECRET: z.string().min(MIN_SECRET_LENGTH).optional(),
  AUTH_SECRET: z.string().min(MIN_SECRET_LENGTH).optional(),
  NEXTAUTH_SECRET: z.string().min(MIN_SECRET_LENGTH).optional(),

  // Browser origins allowed to call the API with credentials, comma-separated.
  FRONTEND_ORIGINS: isProduction ? csvList : csvList.default(["http://localhost:3000"]),
  // e.g. ".artistos.in" in production; unset locally (host-only cookies).
  COOKIE_DOMAIN: requiredInProduction(z.string().startsWith(".")),

  ADMIN_PASSWORD: requiredInProduction(z.string().min(1)),
  CRON_SECRET: requiredInProduction(z.string().min(MIN_SECRET_LENGTH)),
})

function loadConfig() {
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    // The logger depends on this config, so report directly to stderr.
    process.stderr.write(`Invalid environment configuration:\n${problems.join("\n")}\n`)
    process.exit(1)
  }

  const env = parsed.data
  const jwtSecret = env.JWT_SECRET ?? env.AUTH_SECRET ?? env.NEXTAUTH_SECRET
  if (!jwtSecret) {
    process.stderr.write(
      `Invalid environment configuration:\n  - JWT_SECRET: required (min ${MIN_SECRET_LENGTH} chars, must match the Next.js app)\n`
    )
    process.exit(1)
  }

  return Object.freeze({
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === "production",
    isTest: env.NODE_ENV === "test",
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    jwtSecret,
    frontendOrigins: Object.freeze(env.FRONTEND_ORIGINS),
    cookieDomain: env.COOKIE_DOMAIN,
    adminPassword: env.ADMIN_PASSWORD,
    cronSecret: env.CRON_SECRET,
  })
}

export const config = loadConfig()
