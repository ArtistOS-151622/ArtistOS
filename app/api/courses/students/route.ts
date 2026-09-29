import { NextResponse, type NextRequest } from "next/server"
import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

type StudentInput = {
  course_id?: number
  name?: string
  phone?: string
  address?: string
  email?: string
  total_fee?: number
  paid_fee?: number
  enrollment_date?: string
  status?: "enrolled" | "ongoing" | "completed" | "cancelled"
  certificate_issued?: boolean
  notes?: string
}

function validateStudent(input: StudentInput) {
  const course_id = Number(input.course_id)
  const name = input.name?.trim()
  const phone = input.phone?.trim()
  const address = input.address?.trim()
  const email = input.email?.trim() || null
  const total_fee = Number(input.total_fee)
  const paid_fee = input.paid_fee !== undefined ? Number(input.paid_fee) : 0
  const enrollment_date = input.enrollment_date || new Date().toISOString().split("T")[0]
  const status = input.status || "enrolled"
  const certificate_issued = Boolean(input.certificate_issued)
  const notes = input.notes?.trim() || null

  if (!Number.isInteger(course_id) || course_id <= 0) {
    return { error: "Please select a valid course." }
  }
  if (!name) return { error: "Student name is required." }
  if (!phone) return { error: "Student phone number is required." }
  if (!address) return { error: "Student address is required." }
  if (!Number.isFinite(total_fee) || total_fee < 0) {
    return { error: "Total fee must be a valid amount." }
  }
  if (!Number.isFinite(paid_fee) || paid_fee < 0) {
    return { error: "Paid fee must be a valid non-negative amount." }
  }
  if (paid_fee > total_fee) {
    return { error: "Paid fee cannot exceed total course fee." }
  }

  return {
    data: {
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
    },
  }
}

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const courseIdParam = searchParams.get("course_id")
  const statusParam = searchParams.get("status")
  const paymentStatusParam = searchParams.get("payment_status")
  const search = searchParams.get("search")?.trim() || ""

  const supabase = await createClient()

  let query = supabase
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
      created_at,
      course:courses (
        id,
        name,
        duration,
        fee,
        batch_timing
      )
    `)
    .eq("user_id", session.id)
    .order("id", { ascending: false })

  if (courseIdParam) {
    const courseId = Number(courseIdParam)
    if (Number.isInteger(courseId) && courseId > 0) {
      query = query.eq("course_id", courseId)
    }
  }

  if (statusParam && ["enrolled", "ongoing", "completed", "cancelled"].includes(statusParam)) {
    query = query.eq("status", statusParam)
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data: students, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const formatted = (students || []).map((s: any) => {
    const total = Number(s.total_fee) || 0
    const paid = Number(s.paid_fee) || 0
    const pending = Math.max(0, total - paid)
    let payment_status = "full_paid"
    if (paid <= 0) payment_status = "unpaid"
    else if (paid < total) payment_status = "partial"

    return {
      ...s,
      total_fee: total,
      paid_fee: paid,
      pending_fee: pending,
      payment_status,
    }
  })

  // Filter in-memory for payment_status if requested
  const filtered = paymentStatusParam
    ? formatted.filter((s) => s.payment_status === paymentStatusParam)
    : formatted

  return NextResponse.json({ students: filtered })
}

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json()) as StudentInput
  const validation = validateStudent(body)
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json(
      { error: "Your subscription has expired. Please upgrade to enroll students." },
      { status: 403 }
    )
  }

  // Ensure course belongs to this user
  const { data: course, error: courseCheckError } = await supabase
    .from("courses")
    .select("id, name, fee")
    .eq("id", validation.data.course_id)
    .eq("user_id", session.id)
    .single()

  if (courseCheckError || !course) {
    return NextResponse.json({ error: "Selected course not found." }, { status: 404 })
  }

  const { data: student, error: insertError } = await supabase
    .from("course_students")
    .insert({
      ...validation.data,
      user_id: session.id,
    })
    .select(`
      *,
      course:courses (
        id,
        name,
        duration,
        fee,
        batch_timing
      )
    `)
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 })
  }

  return NextResponse.json({ student }, { status: 201 })
}
