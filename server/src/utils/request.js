/** Positive integer id from a route param, or null (same rule as the Next.js routes' validateId). */
export function parsePositiveId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

/** First value of a query parameter as a string, or null (like URLSearchParams.get). */
export function queryParam(req, name) {
  const value = req.query[name]
  if (Array.isArray(value)) return value.length ? String(value[0]) : null
  return value === undefined ? null : String(value)
}

/** Request body as an object (missing or non-JSON bodies become {}). */
export function bodyOf(req) {
  return req.body && typeof req.body === "object" ? req.body : {}
}
