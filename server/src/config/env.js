import { z } from "zod"

/**
 * Reads and validates process.env once at boot. A missing or invalid variable
 * stops the process with a clear message instead of failing later at runtime.
 */

const MIN_SECRET_LENGTH = 32

const isProduction = process.env.NODE_ENV === "production"

/** Trims and strips one pair of wrapping quotes (dashboards often keep them); empty → undefined. */
const cleanString = z.preprocess((value) => {
  if (typeof value !== "string") return value
  const cleaned = value.trim().replace(/^["']|["']$/g, "")
  return cleaned === "" ? undefined : cleaned
}, z.string().optional())

/** Required in production, optional elsewhere (features fail with a clear error when used). */
const requiredInProduction = (schema) =>
  isProduction ? cleanString.pipe(schema) : cleanString.pipe(schema.optional())

const withDefault = (fallback) => cleanString.transform((value) => value ?? fallback)

const positiveInt = (fallback) => cleanString.pipe(z.coerce.number().int().positive().default(fallback))

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
  APP_TIMEZONE: withDefault("Asia/Kolkata"),

  // --- Auth -------------------------------------------------------------------
  // Must be identical to the value used by the Next.js app (Vercel): both sides
  // sign/verify the same session tokens. Same fallback order as lib/auth/session.ts.
  JWT_SECRET: cleanString.pipe(z.string().min(MIN_SECRET_LENGTH).optional()),
  AUTH_SECRET: cleanString.pipe(z.string().min(MIN_SECRET_LENGTH).optional()),
  NEXTAUTH_SECRET: cleanString.pipe(z.string().min(MIN_SECRET_LENGTH).optional()),
  ADMIN_PASSWORD: requiredInProduction(z.string().min(1)),
  CRON_SECRET: requiredInProduction(z.string().min(MIN_SECRET_LENGTH)),

  // --- HTTP / cookies ---------------------------------------------------------------
  // Browser origins allowed to call the API with credentials, comma-separated.
  FRONTEND_ORIGINS: isProduction ? csvList : csvList.default(["http://localhost:3000"]),
  // e.g. ".artistos.in" in production; unset locally (host-only cookies).
  COOKIE_DOMAIN: requiredInProduction(z.string().startsWith(".")),

  // --- Supabase (the NEXT_PUBLIC_* names are accepted so one .env works for both apps) ---
  SUPABASE_URL: cleanString,
  NEXT_PUBLIC_SUPABASE_URL: cleanString,
  SUPABASE_ANON_KEY: cleanString,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: cleanString,
  SUPABASE_SERVICE_ROLE_KEY: requiredInProduction(z.string().min(1)),

  // --- Cloudflare R2 ------------------------------------------------------------------
  R2_ACCOUNT_ID: requiredInProduction(z.string().min(1)),
  R2_ACCESS_KEY_ID: requiredInProduction(z.string().min(1)),
  R2_SECRET_ACCESS_KEY: requiredInProduction(z.string().min(1)),
  R2_BUCKET_NAME: requiredInProduction(z.string().min(1)),
  R2_PUBLIC_URL: cleanString,

  // --- Razorpay -------------------------------------------------------------------------
  RAZORPAY_KEY_ID: requiredInProduction(z.string().min(1)),
  RAZORPAY_KEY_SECRET: requiredInProduction(z.string().min(1)),
  RAZORPAY_WEBHOOK_SECRET: requiredInProduction(z.string().min(1)),

  // --- WhatsApp (Meta Cloud API). Optional: sends are skipped when the token is unset. ---
  WHATSAPP_ACCESS_TOKEN: cleanString,
  // Default is the production sender id the Next.js app has always fallen back to.
  WHATSAPP_PHONE_NUMBER_ID: withDefault("1301710916364476"),
  WHATSAPP_API_VERSION: withDefault("v20.0"),
  WHATSAPP_TEMPLATE_LANG: withDefault("en"),
  WHATSAPP_DAILY_AGENDA_TEMPLATE_NAME: withDefault("today_bookings_to_artist"),
  WHATSAPP_NO_BOOKINGS_TEMPLATE_NAME: withDefault("no_bookings_today_to_artist"),

  // --- Web push (VAPID). Optional: push is skipped when the keys are unset. ---
  VAPID_PUBLIC_KEY: cleanString,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: cleanString,
  VAPID_PRIVATE_KEY: cleanString,
  VAPID_SUBJECT: withDefault("mailto:support@artistos.app"),

  // --- Notification timing ---------------------------------------------------------------
  BOOKING_REMINDER_2H_MINUTES: positiveInt(120),
  BOOKING_REMINDER_10M_MINUTES: positiveInt(10),
  NOTIFICATION_MAX_ATTEMPTS: positiveInt(3),
})

function fail(problems) {
  // The logger depends on this config, so report directly to stderr.
  process.stderr.write(`Invalid environment configuration:\n${problems.join("\n")}\n`)
  process.exit(1)
}

function loadConfig() {
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    fail(parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`))
  }

  const env = parsed.data
  const problems = []

  const jwtSecret = env.JWT_SECRET ?? env.AUTH_SECRET ?? env.NEXTAUTH_SECRET
  if (!jwtSecret) {
    problems.push(`  - JWT_SECRET: required (min ${MIN_SECRET_LENGTH} chars, must match the Next.js app)`)
  }

  const supabaseUrl = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (isProduction && !supabaseUrl) problems.push("  - SUPABASE_URL: required in production")
  if (isProduction && !supabaseAnonKey) problems.push("  - SUPABASE_ANON_KEY: required in production")

  if (problems.length) fail(problems)

  return Object.freeze({
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === "production",
    isTest: env.NODE_ENV === "test",
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    appTimezone: env.APP_TIMEZONE,

    jwtSecret,
    adminPassword: env.ADMIN_PASSWORD,
    cronSecret: env.CRON_SECRET,
    frontendOrigins: Object.freeze(env.FRONTEND_ORIGINS),
    cookieDomain: env.COOKIE_DOMAIN,

    supabase: Object.freeze({
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    }),
    r2: Object.freeze({
      accountId: env.R2_ACCOUNT_ID,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      bucketName: env.R2_BUCKET_NAME,
      publicUrl: env.R2_PUBLIC_URL,
    }),
    razorpay: Object.freeze({
      keyId: env.RAZORPAY_KEY_ID,
      keySecret: env.RAZORPAY_KEY_SECRET,
      webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
    }),
    whatsapp: Object.freeze({
      accessToken: env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
      apiVersion: env.WHATSAPP_API_VERSION,
      templateLang: env.WHATSAPP_TEMPLATE_LANG,
      dailyAgendaTemplate: env.WHATSAPP_DAILY_AGENDA_TEMPLATE_NAME,
      noBookingsTemplate: env.WHATSAPP_NO_BOOKINGS_TEMPLATE_NAME,
    }),
    push: Object.freeze({
      vapidPublicKey: env.VAPID_PUBLIC_KEY ?? env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      vapidPrivateKey: env.VAPID_PRIVATE_KEY,
      vapidSubject: env.VAPID_SUBJECT,
    }),
    notifications: Object.freeze({
      bookingReminder2hMinutes: env.BOOKING_REMINDER_2H_MINUTES,
      bookingReminder10mMinutes: env.BOOKING_REMINDER_10M_MINUTES,
      maxAttempts: env.NOTIFICATION_MAX_ATTEMPTS,
    }),
  })
}

export const config = loadConfig()
