/**
 * validate({ body, query, params }) – parses each part with its zod schema.
 * On success the parsed (coerced, stripped) values are on `req.validated`
 * and `req.body` is replaced. On failure a ZodError reaches the error handler (400).
 *
 * Express 5 makes `req.query` a read-only getter, so controllers read
 * `req.validated.query` / `req.validated.params` rather than the raw ones.
 */
export function validate(schemas) {
  return function validateRequest(req, _res, next) {
    const validated = {}
    for (const part of ["params", "query", "body"]) {
      if (schemas[part]) validated[part] = schemas[part].parse(req[part] ?? {})
    }
    if ("body" in validated) req.body = validated.body
    req.validated = validated
    next()
  }
}
