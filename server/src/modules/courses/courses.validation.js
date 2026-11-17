const trimmed = (value) => (typeof value === "string" ? value.trim() : undefined)

/** Service ids → positive integers only. */
export const toServiceIds = (value) =>
  Array.isArray(value) ? value.map(Number).filter((n) => Number.isInteger(n) && n > 0) : []

/** Create: → { data, service_ids } or { error } (same order and messages as before). */
export function validateCourse(input) {
  const name = trimmed(input.name)
  const duration = trimmed(input.duration)
  const fee = Number(input.fee)
  const max_students = input.max_students ? Number(input.max_students) : null

  if (!name) return { error: "Course name is required." }
  if (!duration) return { error: "Course duration is required." }
  if (!Number.isFinite(fee) || fee < 0) return { error: "Fee must be a valid non-negative number." }
  if (max_students !== null && (!Number.isInteger(max_students) || max_students <= 0)) {
    return { error: "Max students must be a positive number if provided." }
  }

  return {
    data: {
      name,
      duration,
      fee,
      description: trimmed(input.description) || null,
      batch_timing: trimmed(input.batch_timing) || null,
      start_date: input.start_date || null,
      max_students,
      is_active: input.is_active !== undefined ? Boolean(input.is_active) : true,
    },
    service_ids: toServiceIds(input.service_ids),
  }
}

/** Update: only fields present in the body. → { data } or { error }. */
export function validateCourseUpdate(body) {
  const has = (key) => body[key] !== undefined
  const data = {}

  // Like the original `body.name?.trim()`: null means "not sent", "" means "empty".
  if (trimmed(body.name) !== undefined) data.name = trimmed(body.name)
  if (trimmed(body.duration) !== undefined) data.duration = trimmed(body.duration)
  if (has("fee")) data.fee = Number(body.fee)
  if (has("description")) data.description = trimmed(body.description) || null
  if (has("batch_timing")) data.batch_timing = trimmed(body.batch_timing) || null
  if (has("start_date")) data.start_date = body.start_date || null
  if (has("max_students")) data.max_students = body.max_students ? Number(body.max_students) : null
  if (has("is_active")) data.is_active = Boolean(body.is_active)

  if ("name" in data && !data.name) return { error: "Course name cannot be empty." }
  if ("duration" in data && !data.duration) return { error: "Duration cannot be empty." }
  if ("fee" in data && (!Number.isFinite(data.fee) || data.fee < 0)) return { error: "Fee must be a valid amount." }

  return { data }
}
