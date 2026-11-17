import { createApp } from "#src/app.js"
import { SHUTDOWN_TIMEOUT_MS } from "#src/config/constants.js"
import { config } from "#src/config/env.js"
import { drainBackgroundTasks } from "#src/utils/background.js"
import { logger } from "#src/utils/logger.js"

const app = createApp()

const server = app.listen(config.port, (err) => {
  if (err) {
    logger.fatal({ err }, "failed to start server")
    process.exit(1)
  }
  logger.info({ port: config.port, env: config.env }, "ArtistOS API listening")
})

let shuttingDown = false

async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  logger.info({ signal }, "shutting down")

  const forceExit = setTimeout(() => {
    logger.error("graceful shutdown timed out; forcing exit")
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)
  forceExit.unref()

  // Stop accepting connections, close idle keep-alive ones, wait for in-flight requests.
  server.close()
  server.closeIdleConnections()
  await new Promise((resolve) => server.once("close", resolve))

  const drained = await drainBackgroundTasks(SHUTDOWN_TIMEOUT_MS)
  if (!drained) logger.warn("some background tasks did not finish before shutdown")

  clearTimeout(forceExit)
  process.exit(0)
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "unhandled promise rejection")
  process.exit(1)
})
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaught exception")
  process.exit(1)
})
