import pino from "pino"

import { config } from "#src/config/env.js"

const usePrettyLogs = !config.isProduction && !config.isTest

export const logger = pino({
  level: config.isTest ? "silent" : config.logLevel,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
      "*.password",
      "*.otp",
      "*.token",
    ],
    censor: "[redacted]",
  },
  ...(usePrettyLogs ? { transport: { target: "pino-pretty", options: { colorize: true } } } : {}),
})
