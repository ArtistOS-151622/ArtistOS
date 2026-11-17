import { createDbClient } from "#src/integrations/supabase.js"
import { STUDENT_STATUSES, validateStudent, validateStudentUpdate } from "#src/modules/courses/students/students.validation.js"
import { assertWritable } from "#src/shared/subscription/read-only.js"
import { badRequest, notFound } from "#src/utils/api-error.js"

const COURSE_FIELDS = `
  course:courses (
    id,
    name,
    duration,
    fee,
    batch_timing
  )`

/** Adds numeric fees, pending_fee and payment_status ("unpaid" | "partial" | "full_paid"). */
export function withFeeSummary(student) {
  const total = Number(student.total_fee) || 0
  const paid = Number(student.paid_fee) || 0
  const payment_status = paid <= 0 ? "unpaid" : paid < total ? "partial" : "full_paid"
  return { ...student, total_fee: total, paid_fee: paid, pending_fee: Math.max(0, total - paid), payment_status }
}

/** filters: { courseId, status, paymentStatus, search }. payment_status is filtered in memory. */
export async function listStudents(userId, { courseId, status, paymentStatus, search }) {
  let query = createDbClient()
    .from("course_students")
    .select(`
      id,
      user_id,
      course_id,
      name,
      phone,
      address,
      email,
      total_fee,
      paid_fee,
      enrollment_date,
      status,
      certificate_issued,
      notes,
      created_at,${COURSE_FIELDS}
    `)
    .eq("user_id", userId)
    .order("id", { ascending: false })

  if (courseId) {
    const id = Number(courseId)
    if (Number.isInteger(id) && id > 0) query = query.eq("course_id", id)
  }
  if (status && STUDENT_STATUSES.includes(status)) query = query.eq("status", status)
  if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)

  const { data, error } = await query
  if (error) throw badRequest(error.message)

  const students = (data || []).map(withFeeSummary)
  return { students: paymentStatus ? students.filter((s) => s.payment_status === paymentStatus) : students }
}

export async function getStudent(userId, id) {
  const { data: student, error } = await createDbClient()
    .from("course_students")
    .select(`*,${COURSE_FIELDS}`)
    .eq("id", id)
    .eq("user_id", userId)
    .single()

  if (error || !student) throw notFound("Student not found.")
  return { student: withFeeSummary(student) }
}

export async function enrollStudent(userId, body) {
  const result = validateStudent(body)
  if (result.error) throw badRequest(result.error)

  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to enroll students.")

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, name, fee")
    .eq("id", result.data.course_id)
    .eq("user_id", userId)
    .single()
  if (courseError || !course) throw notFound("Selected course not found.")

  const { data: student, error } = await supabase
    .from("course_students")
    .insert({ ...result.data, user_id: userId })
    .select(`*,${COURSE_FIELDS}`)
    .single()
  if (error) throw badRequest(error.message)
  return { student }
}

export async function updateStudent(userId, id, body) {
  const result = validateStudentUpdate(body)
  if (result.error) throw badRequest(result.error)
  const { data, addPayment } = result

  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to update student records.")

  const { data: current, error: fetchError } = await supabase
    .from("course_students")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single()
  if (fetchError || !current) throw notFound("Student not found.")

  const effectiveTotal = "total_fee" in data ? data.total_fee : Number(current.total_fee)
  if (addPayment !== undefined) {
    // An installment wins over a direct paid_fee in the same request.
    const newPaid = Number(current.paid_fee || 0) + addPayment
    if (newPaid > effectiveTotal) throw badRequest(`Total paid (${newPaid}) cannot exceed total fee (${effectiveTotal}).`)
    data.paid_fee = newPaid
  } else if ("paid_fee" in data && data.paid_fee > effectiveTotal) {
    throw badRequest(`Total paid (${data.paid_fee}) cannot exceed total fee (${effectiveTotal}).`)
  }

  const { data: updated, error } = await supabase
    .from("course_students")
    .update(data)
    .eq("id", id)
    .eq("user_id", userId)
    .select(`*,${COURSE_FIELDS}`)
    .single()
  if (error) throw badRequest(error.message)
  return { student: withFeeSummary(updated) }
}

export async function deleteStudent(userId, id) {
  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to delete student records.")

  const { error } = await supabase.from("course_students").delete().eq("id", id).eq("user_id", userId)
  if (error) throw badRequest(error.message)
  return { success: true }
}
