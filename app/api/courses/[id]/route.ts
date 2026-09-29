import { NextResponse, type NextRequest } from "next/server"
import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

function validateId(value: string) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = validateId((await params).id)
  if (!id) return NextResponse.json({ error: "Invalid course id." }, { status: 400 })

  const supabase = await createClient()

  const { data: course, error } = await supabase
    .from("courses")
    .select(`
      *,
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
    .eq("user_id", session.id)
    .single()

  if (error || !course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 })
  }

  const services = (course.course_services || [])
    .map((cs: any) => cs.service)
    .filter(Boolean)

  return NextResponse.json({
    course: {
      ...course,
      services,
      students: course.course_students || [],
    },
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = validateId((await params).id)
  if (!id) return NextResponse.json({ error: "Invalid course id." }, { status: 400 })

  const body = await request.json()
  const name = body.name?.trim()
  const duration = body.duration?.trim()
  const fee = body.fee !== undefined ? Number(body.fee) : undefined
  const description = body.description !== undefined ? body.description?.trim() || null : undefined
  const batch_timing = body.batch_timing !== undefined ? body.batch_timing?.trim() || null : undefined
  const start_date = body.start_date !== undefined ? body.start_date || null : undefined
  const max_students = body.max_students !== undefined ? (body.max_students ? Number(body.max_students) : null) : undefined
  const is_active = body.is_active !== undefined ? Boolean(body.is_active) : undefined

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Course name cannot be empty." }, { status: 400 })
  }
  if (duration !== undefined && !duration) {
    return NextResponse.json({ error: "Duration cannot be empty." }, { status: 400 })
  }
  if (fee !== undefined && (!Number.isFinite(fee) || fee < 0)) {
    return NextResponse.json({ error: "Fee must be a valid amount." }, { status: 400 })
  }

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json(
      { error: "Your subscription has expired. Please upgrade to edit courses." },
      { status: 403 }
    )
  }

  const updatePayload: Record<string, any> = {}
  if (name !== undefined) updatePayload.name = name
  if (duration !== undefined) updatePayload.duration = duration
  if (fee !== undefined) updatePayload.fee = fee
  if (description !== undefined) updatePayload.description = description
  if (batch_timing !== undefined) updatePayload.batch_timing = batch_timing
  if (start_date !== undefined) updatePayload.start_date = start_date
  if (max_students !== undefined) updatePayload.max_students = max_students
  if (is_active !== undefined) updatePayload.is_active = is_active

  const { data: updatedCourse, error: updateError } = await supabase
    .from("courses")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", session.id)
    .select("*")
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  // If service_ids were passed, update junction
  if (Array.isArray(body.service_ids)) {
    const validServiceIds = body.service_ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0)
    
    // Remove existing relations
    await supabase.from("course_services").delete().eq("course_id", id)

    // Re-insert
    if (validServiceIds.length > 0) {
      const rows = validServiceIds.map((service_id: number) => ({
        course_id: id,
        service_id,
      }))
      await supabase.from("course_services").insert(rows)
    }
  }

  return NextResponse.json({ course: updatedCourse })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = validateId((await params).id)
  if (!id) return NextResponse.json({ error: "Invalid course id." }, { status: 400 })

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json(
      { error: "Your subscription has expired. Please upgrade to delete courses." },
      { status: 403 }
    )
  }

  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", id)
    .eq("user_id", session.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
