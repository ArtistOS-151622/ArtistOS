import { logger } from "#src/utils/logger.js"

const pending = new Set()

/**
 * Runs work after the response is sent (replacement for next/server `after()`).
 * Errors are logged, never thrown. Tasks are awaited on graceful shutdown.
 */
export function runInBackground(label, task) {
  const promise = Promise.resolve()
    .then(task)
    .catch((err) => logger.error({ err, task: label }, "background task failed"))
    .finally(() => pending.delete(promise))
  pending.add(promise)
}

/** Waits for in-flight background tasks, up to `timeoutMs`. Resolves to true if all finished. */
export async function drainBackgroundTasks(timeoutMs) {
  if (pending.size === 0) return true
  let timer
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs)
  })
  const done = Promise.allSettled([...pending]).then(() => true)
  const finished = await Promise.race([done, timeout])
  clearTimeout(timer)
  return finished
}
