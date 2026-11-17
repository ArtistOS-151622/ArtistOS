export const STUDENT_STATUSES = ["enrolled", "ongoing", "completed", "cancelled"]

const trimmed = (value) => (typeof value === "string" ? value.trim() : undefined)

/** Enroll: → { data } or { error } (same order and messages as before). */
export function validateStudent(input) {
  const course_id = Number(input.course_id)
  const name = trimmed(input.name)
  const phone = trimmed(input.phone)
  const address = trimmed(input.address)
  const total_fee = Number(input.total_fee)
  const paid_fee = input.paid_fee !== undefined ? Number(input.paid_fee) : 0

  if (!Number.isInteger(course_id) || course_id <= 0) return { error: "Please select a valid course." }
  if (!name) return { error: "Student name is required." }
  if (!phone) return { error: "Student phone number is required." }
  if (!address) return { error: "Student address is required." }
  if (!Number.isFinite(total_fee) || total_fee < 0) return { error: "Total fee must be a valid amount." }
  if (!Number.isFinite(paid_fee) || paid_fee < 0) return { error: "Paid fee must be a valid non-negative amount." }
  if (paid_fee > total_fee) return { error: "Paid fee cannot exceed total course fee." }

  return {
    data: {
      course_id,
      name,
      phone,
      address,
      email: trimmed(input.email) || null,
      total_fee,
      paid_fee,
      enrollment_date: input.enrollment_date || new Date().toISOString().split("T")[0],
      status: input.status || "enrolled",
      certificate_issued: Boolean(input.certificate_issued),
      notes: trimmed(input.notes) || null,
    },
  }
}

/**
 * Update: only fields present in the body. `add_payment` adds an installment.
 * → { data, addPayment } or { error }. The paid ≤ total check needs the current
 * row, so it happens in the service.
 */
export function validateStudentUpdate(body) {
  const has = (key) => body[key] !== undefined
  const data = {}

  // Like the original `body.name?.trim()`: null means "not sent".
  for (const key of ["name", "phone", "address"]) {
    if (trimmed(body[key]) !== undefined) data[key] = trimmed(body[key])
  }
  if (has("email")) data.email = trimmed(body.email) || null
  if (has("course_id")) data.course_id = Number(body.course_id)
  if (has("total_fee")) data.total_fee = Number(body.total_fee)
  if (has("paid_fee")) data.paid_fee = Number(body.paid_fee)
  if (has("enrollment_date")) data.enrollment_date = body.enrollment_date
  if (has("status")) data.status = body.status
  if (has("certificate_issued")) data.certificate_issued = Boolean(body.certificate_issued)
  if (has("notes")) data.notes = trimmed(body.notes) || null
  const addPayment = has("add_payment") ? Number(body.add_payment) : undefined

  if ("name" in data && !data.name) return { error: "Student name cannot be empty." }
  if ("phone" in data && !data.phone) return { error: "Student phone cannot be empty." }
  if ("address" in data && !data.address) return { error: "Student address cannot be empty." }
  if ("total_fee" in data && (!Number.isFinite(data.total_fee) || data.total_fee < 0)) {
    return { error: "Total fee must be a valid amount." }
  }
  if ("paid_fee" in data && (!Number.isFinite(data.paid_fee) || data.paid_fee < 0)) {
    return { error: "Paid fee must be a valid amount." }
  }
  if (addPayment !== undefined && (!Number.isFinite(addPayment) || addPayment <= 0)) {
    return { error: "Additional payment must be greater than zero." }
  }

  return { data, addPayment }
}
