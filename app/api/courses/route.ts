import { NextResponse, type NextRequest } from "next/server"
import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

type CourseInput = {
  name?: string
  duration?: string
  fee?: number
  description?: string
  batch_timing?: string
  start_date?: string | null
  max_students?: number | null
  is_active?: boolean
  service_ids?: number[]
}

function validateCourse(input: CourseInput) {
  const name = input.name?.trim()
  const duration = input.duration?.trim()
  const fee = Number(input.fee)
  const description = input.description?.trim() || null
  const batch_timing = input.batch_timing?.trim() || null
  const start_date = input.start_date || null
  const max_students = input.max_students ? Number(input.max_students) : null
  const is_active = input.is_active !== undefined ? Boolean(input.is_active) : true
  const service_ids = Array.isArray(input.service_ids) ? input.service_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0) : []

  if (!name) return { error: "Course name is required." }
  if (!duration) return { error: "Course duration is required." }
  if (!Number.isFinite(fee) || fee < 0) {
    return { error: "Fee must be a valid non-negative number." }
  }
  if (max_students !== null && (!Number.isInteger(max_students) || max_students <= 0)) {
    return { error: "Max students must be a positive number if provided." }
  }

  return {
    data: {
      name,
      duration,
      fee,
      description,
      batch_timing,
      start_date,
      max_students,
      is_active,
    },
    service_ids,
  }
}

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim() || ""

  const supabase = await createClient()

  // 1. Fetch courses with course_services
  let query = supabase
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
      course_services (
        service:services (
          id,
          service_name,
          duration_minutes,
          price
        )
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
    .eq("user_id", session.id)
    .order("id", { ascending: false })

  if (search) {
    query = query.ilike("name", `%${search}%`)
  }

  const { data: courses, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // 2. Compute stats across all courses & students
  let totalCourses = courses?.length || 0
  let totalStudents = 0
  let totalCollected = 0
  let totalPending = 0

  const formattedCourses = (courses || []).map((c: any) => {
    const students = c.course_students || []
    const studentCount = students.filter((s: any) => s.status !== "cancelled").length
    const courseCollected = students.reduce((sum: number, s: any) => sum + (Number(s.paid_fee) || 0), 0)
    const courseTotalExpected = students.reduce((sum: number, s: any) => sum + (Number(s.total_fee) || 0), 0)
    const coursePending = Math.max(0, courseTotalExpected - courseCollected)

    totalStudents += studentCount
    totalCollected += courseCollected
    totalPending += coursePending

    const services = (c.course_services || [])
      .map((cs: any) => cs.service)
      .filter(Boolean)

    return {
      id: c.id,
      name: c.name,
      duration: c.duration,
      fee: Number(c.fee),
      description: c.description,
      batch_timing: c.batch_timing,
      start_date: c.start_date,
      max_students: c.max_students,
      is_active: c.is_active,
      created_at: c.created_at,
      services,
      students_count: studentCount,
      total_collected: courseCollected,
      total_pending: coursePending,
    }
  })

  return NextResponse.json({
    courses: formattedCourses,
    stats: {
      total_courses: totalCourses,
      total_students: totalStudents,
      total_collected: totalCollected,
      total_pending: totalPending,
    },
  })
}

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json()) as CourseInput
  const validation = validateCourse(body)
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json(
      { error: "Your subscription has expired. Please upgrade to create courses." },
      { status: 403 }
    )
  }

  // Insert course
  const { data: course, error: insertError } = await supabase
    .from("courses")
    .insert({
      ...validation.data,
      user_id: session.id,
    })
    .select("*")
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 })
  }

  // Link selected services
  if (validation.service_ids.length > 0) {
    const serviceRows = validation.service_ids.map((service_id) => ({
      course_id: course.id,
      service_id,
    }))
    await supabase.from("course_services").insert(serviceRows)
  }

  return NextResponse.json({ course }, { status: 201 })
}
