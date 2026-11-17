import { config } from "#src/config/env.js"
import { forbidden } from "#src/utils/api-error.js"

const allowedOrigins = new Set(config.frontendOrigins)

/** Explicit allow-list with credentials; never "*". */
export const corsOptions = {
  origin(origin, callback) {
    // No Origin header: server-to-server calls (cron, webhooks, curl). CORS doesn't apply.
    if (!origin || allowedOrigins.has(origin)) return callback(null, true)
    return callback(forbidden("Origin not allowed"))
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "x-booking-request-id"],
  exposedHeaders: ["X-Request-Id", "Content-Disposition", "x-booking-request-id"],
  maxAge: 600,
}
