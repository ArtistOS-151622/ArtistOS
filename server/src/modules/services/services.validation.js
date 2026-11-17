/** → { data } or { error } (same order and messages as before). */
export function validateService(input) {
  const service_name = typeof input.service_name === "string" ? input.service_name.trim() : undefined
  const duration_minutes = Number(input.duration_minutes)
  const price = Number(input.price)

  if (!service_name) return { error: "Service name is required." }
  if (!Number.isInteger(duration_minutes) || duration_minutes <= 0) {
    return { error: "Duration must be a valid number of minutes." }
  }
  if (!Number.isFinite(price) || price < 0) return { error: "Price must be a valid amount." }

  return { data: { service_name, duration_minutes, price } }
}
