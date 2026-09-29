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
  if (!id) return NextResponse.json({ error: "Invalid student id." }, { status: 400 })

  const supabase = await createClient()

  const { data: student, error } = await supabase
    .from("course_students")
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
    .eq("id", id)
    .eq("user_id", session.id)
    .single()

  if (error || !student) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 })
  }

  const total = Number(student.total_fee) || 0
  const paid = Number(student.paid_fee) || 0
  const pending = Math.max(0, total - paid)
  let payment_status = "full_paid"
  if (paid <= 0) payment_status = "unpaid"
  else if (paid < total) payment_status = "partial"

  return NextResponse.json({
    student: {
      ...student,
      total_fee: total,
      paid_fee: paid,
      pending_fee: pending,
      payment_status,
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
  if (!id) return NextResponse.json({ error: "Invalid student id." }, { status: 400 })

  const body = await request.json()
  const name = body.name?.trim()
  const phone = body.phone?.trim()
  const address = body.address?.trim()
  const email = body.email !== undefined ? (body.email?.trim() || null) : undefined
  const course_id = body.course_id !== undefined ? Number(body.course_id) : undefined
  const total_fee = body.total_fee !== undefined ? Number(body.total_fee) : undefined
  const paid_fee = body.paid_fee !== undefined ? Number(body.paid_fee) : undefined
  const add_payment = body.add_payment !== undefined ? Number(body.add_payment) : undefined
  const enrollment_date = body.enrollment_date !== undefined ? body.enrollment_date : undefined
  const status = body.status !== undefined ? body.status : undefined
  const certificate_issued = body.certificate_issued !== undefined ? Boolean(body.certificate_issued) : undefined
  const notes = body.notes !== undefined ? (body.notes?.trim() || null) : undefined

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Student name cannot be empty." }, { status: 400 })
  }
  if (phone !== undefined && !phone) {
    return NextResponse.json({ error: "Student phone cannot be empty." }, { status: 400 })
  }
  if (address !== undefined && !address) {
    return NextResponse.json({ error: "Student address cannot be empty." }, { status: 400 })
  }
  if (total_fee !== undefined && (!Number.isFinite(total_fee) || total_fee < 0)) {
    return NextResponse.json({ error: "Total fee must be a valid amount." }, { status: 400 })
  }
  if (paid_fee !== undefined && (!Number.isFinite(paid_fee) || paid_fee < 0)) {
    return NextResponse.json({ error: "Paid fee must be a valid amount." }, { status: 400 })
  }
  if (add_payment !== undefined && (!Number.isFinite(add_payment) || add_payment <= 0)) {
    return NextResponse.json({ error: "Additional payment must be greater than zero." }, { status: 400 })
  }

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json(
      { error: "Your subscription has expired. Please upgrade to update student records." },
      { status: 403 }
    )
  }

  // Fetch current student record
  const { data: currentStudent, error: fetchError } = await supabase
    .from("course_students")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.id)
    .single()

  if (fetchError || !currentStudent) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 })
  }

  const updatePayload: Record<string, any> = {}
  if (name !== undefined) updatePayload.name = name
  if (phone !== undefined) updatePayload.phone = phone
  if (address !== undefined) updatePayload.address = address
  if (email !== undefined) updatePayload.email = email
  if (course_id !== undefined) updatePayload.course_id = course_id
  if (total_fee !== undefined) updatePayload.total_fee = total_fee

  // If adding payment installment
  if (add_payment !== undefined) {
    const newPaid = Number(currentStudent.paid_fee || 0) + add_payment
    const effectiveTotal = total_fee !== undefined ? total_fee : Number(currentStudent.total_fee)
    if (newPaid > effectiveTotal) {
      return NextResponse.json({ error: `Total paid (${newPaid}) cannot exceed total fee (${effectiveTotal}).` }, { status: 400 })
    }
    updatePayload.paid_fee = newPaid
  } else if (paid_fee !== undefined) {
    const effectiveTotal = total_fee !== undefined ? total_fee : Number(currentStudent.total_fee)
    if (paid_fee > effectiveTotal) {
      return NextResponse.json({ error: `Total paid (${paid_fee}) cannot exceed total fee (${effectiveTotal}).` }, { status: 400 })
    }
    updatePayload.paid_fee = paid_fee
  }

  if (enrollment_date !== undefined) updatePayload.enrollment_date = enrollment_date
  if (status !== undefined) updatePayload.status = status
  if (certificate_issued !== undefined) updatePayload.certificate_issued = certificate_issued
  if (notes !== undefined) updatePayload.notes = notes

  const { data: updatedStudent, error: updateError } = await supabase
    .from("course_students")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", session.id)
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

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  const finalTotal = Number(updatedStudent.total_fee) || 0
  const finalPaid = Number(updatedStudent.paid_fee) || 0
  const finalPending = Math.max(0, finalTotal - finalPaid)
  let payment_status = "full_paid"
  if (finalPaid <= 0) payment_status = "unpaid"
  else if (finalPaid < finalTotal) payment_status = "partial"

  return NextResponse.json({
    student: {
      ...updatedStudent,
      total_fee: finalTotal,
      paid_fee: finalPaid,
      pending_fee: finalPending,
      payment_status,
    },
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = validateId((await params).id)
  if (!id) return NextResponse.json({ error: "Invalid student id." }, { status: 400 })

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json(
      { error: "Your subscription has expired. Please upgrade to delete student records." },
      { status: 403 }
    )
  }

  const { error } = await supabase
    .from("course_students")
    .delete()
    .eq("id", id)
    .eq("user_id", session.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
