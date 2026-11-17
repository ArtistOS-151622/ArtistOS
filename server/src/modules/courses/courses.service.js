import { createDbClient } from "#src/integrations/supabase.js"
import { toServiceIds, validateCourse, validateCourseUpdate } from "#src/modules/courses/courses.validation.js"
import { listFilesInFolder } from "#src/shared/portfolio/files.js"
import { buildShareUrl, findFolderByCourse, findOrCreateCourseFolder } from "#src/shared/portfolio/folders.js"
import { portfolioError } from "#src/shared/portfolio/response.js"
import { assertWritable, checkIsReadOnly } from "#src/shared/subscription/read-only.js"
import { badRequest, notFound } from "#src/utils/api-error.js"

const SERVICE_FIELDS = `
  service:services (
    id,
    service_name,
    duration_minutes,
    price
  )`

const servicesOf = (course) => (course.course_services || []).map((cs) => cs.service).filter(Boolean)

/** All courses with linked services and per-course + overall student fee stats. */
export async function listCourses(userId, { search }) {
  let query = createDbClient()
    .from("courses")
    .select(`
      id,
      name,
      duration,
      fee,
      description,
      batch_timing,
      start_date,
      max_students,
      is_active,
      created_at,
      course_services (${SERVICE_FIELDS}
      ),
      course_students (
        id,
        name,
        phone,
        total_fee,
        paid_fee,
        status
      )
    `)
    .eq("user_id", userId)
    .order("id", { ascending: false })

  if (search) query = query.ilike("name", `%${search}%`)

  const { data: courses, error } = await query
  if (error) throw badRequest(error.message)

  const stats = { total_courses: courses?.length || 0, total_students: 0, total_collected: 0, total_pending: 0 }

  const formatted = (courses || []).map((course) => {
    const students = course.course_students || []
    const studentsCount = students.filter((s) => s.status !== "cancelled").length
    const collected = students.reduce((sum, s) => sum + (Number(s.paid_fee) || 0), 0)
    const expected = students.reduce((sum, s) => sum + (Number(s.total_fee) || 0), 0)
    const pending = Math.max(0, expected - collected)

    stats.total_students += studentsCount
    stats.total_collected += collected
    stats.total_pending += pending

    return {
      id: course.id,
      name: course.name,
      duration: course.duration,
      fee: Number(course.fee),
      description: course.description,
      batch_timing: course.batch_timing,
      start_date: course.start_date,
      max_students: course.max_students,
      is_active: course.is_active,
      created_at: course.created_at,
      services: servicesOf(course),
      students_count: studentsCount,
      total_collected: collected,
      total_pending: pending,
    }
  })

  return { courses: formatted, stats }
}

export async function getCourse(userId, id) {
  const { data: course, error } = await createDbClient()
    .from("courses")
    .select(`
      *,
      course_services (${SERVICE_FIELDS}
      ),
      course_students (
        id,
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
        created_at
      )
    `)
    .eq("id", id)
    .eq("user_id", userId)
    .single()

  if (error || !course) throw notFound("Course not found.")
  return { course: { ...course, services: servicesOf(course), students: course.course_students || [] } }
}

async function replaceCourseServices(supabase, courseId, serviceIds) {
  await supabase.from("course_services").delete().eq("course_id", courseId)
  if (serviceIds.length > 0) {
    await supabase.from("course_services").insert(serviceIds.map((service_id) => ({ course_id: courseId, service_id })))
  }
}

export async function createCourse(userId, body) {
  const result = validateCourse(body)
  if (result.error) throw badRequest(result.error)

  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to create courses.")

  const { data: course, error } = await supabase
    .from("courses")
    .insert({ ...result.data, user_id: userId })
    .select("*")
    .single()
  if (error) throw badRequest(error.message)

  if (result.service_ids.length > 0) {
    await supabase
      .from("course_services")
      .insert(result.service_ids.map((service_id) => ({ course_id: course.id, service_id })))
  }
  return { course }
}

/** Partial update; renames the course's portfolio folder; replaces services when service_ids is sent. */
export async function updateCourse(userId, id, body) {
  const result = validateCourseUpdate(body)
  if (result.error) throw badRequest(result.error)

  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to edit courses.")

  const { data: course, error } = await supabase
    .from("courses")
    .update(result.data)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single()
  if (error) throw badRequest(error.message)

  if (result.data.name) {
    try {
      await supabase.from("portfolio_folders").update({ name: result.data.name }).eq("user_id", userId).eq("course_id", id)
    } catch {
      // course_id may not exist on older databases.
    }
  }

  if (Array.isArray(body.service_ids)) await replaceCourseServices(supabase, id, toServiceIds(body.service_ids))

  return { course }
}

export async function deleteCourse(userId, id) {
  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to delete courses.")

  const { error } = await supabase.from("courses").delete().eq("id", id).eq("user_id", userId)
  if (error) throw badRequest(error.message)
  return { success: true }
}

/**
 * The course's portfolio folder and files (envelope response). Read-only artists
 * only see an existing folder; others get one created on first open.
 */
export async function getCoursePortfolio(userId, courseId) {
  const supabase = createDbClient()
  const { data: course, error } = await supabase
    .from("courses")
    .select("id, name")
    .eq("id", courseId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !course) throw portfolioError("Course not found", 404)

  try {
    const folder = (await checkIsReadOnly(supabase, userId))
      ? await findFolderByCourse(supabase, userId, courseId)
      : await findOrCreateCourseFolder(supabase, userId, courseId, course.name)

    if (!folder) return { folder: null, files: [] }

    const files = await listFilesInFolder(supabase, userId, folder.id, null, true)
    return {
      folder: {
        ...folder,
        share_url: folder.is_shared ? buildShareUrl(folder.uuid) : null,
        file_count: files.length,
        total_size: files.reduce((sum, f) => sum + Number(f.file_size), 0),
      },
      files,
    }
  } catch (err) {
    throw portfolioError(err instanceof Error ? err.message : "Failed to load course portfolio", 500)
  }
}
