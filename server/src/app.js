import compression from "compression"
import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"
import helmet from "helmet"
import { pinoHttp } from "pino-http"

import { JSON_BODY_LIMIT } from "#src/config/constants.js"
import { corsOptions } from "#src/config/cors.js"
import { errorHandler } from "#src/middlewares/error-handler.js"
import { notFound } from "#src/middlewares/not-found.js"
import { apiLimiter } from "#src/middlewares/rate-limit.js"
import { requestId } from "#src/middlewares/request-id.js"
import { apiRouter, webhooksRouter } from "#src/routes/index.js"
import { logger } from "#src/utils/logger.js"

export function createApp() {
  const app = express()

  // Render terminates TLS in front of us: needed for secure cookies and real client IPs.
  app.set("trust proxy", 1)

  app.use(requestId)
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      autoLogging: { ignore: (req) => req.url === "/health" },
    })
  )
  app.use(
    helmet({
      // www.artistos.in and api.artistos.in are same-site; allow it to load API responses.
      crossOriginResourcePolicy: { policy: "same-site" },
    })
  )
  app.use(cors(corsOptions))
  app.use(compression())

  // Health check for Render: no auth, no rate limit.
  app.get("/health", (_req, res) => res.json({ status: "ok" }))

  // Before the JSON parser: webhook signatures are computed over the raw body.
  app.use("/api/webhooks", webhooksRouter)

  app.use(express.json({ limit: JSON_BODY_LIMIT }))
  app.use(cookieParser())

  app.use("/api", apiLimiter, apiRouter)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
