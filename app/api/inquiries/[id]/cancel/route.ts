import { NextResponse, type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import { INQUIRY_SELECT_FIELDS, formatInquiry } from "@/lib/inquiries/queries"
import { createClient } from "@/lib/supabase/server"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  const inquiryId = Number(id)
  if (!Number.isFinite(inquiryId)) {
    return NextResponse.json({ error: "Invalid inquiry id." }, { status: 400 })
  }

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json({ error: "Your subscription has expired. Please upgrade to update inquiries." }, { status: 403 })
  }

  const { data: existing, error: existingError } = await supabase
    .from("inquiries")
    .select("id, status")
    .eq("id", inquiryId)
    .eq("user_id", session.id)
    .maybeSingle()

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 })
  if (!existing) return NextResponse.json({ error: "Inquiry not found." }, { status: 404 })
  if (existing.status === "booked") {
    return NextResponse.json({ error: "Booked inquiries cannot be cancelled." }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("inquiries")
    .update({ status: "cancelled" })
    .eq("id", inquiryId)
    .eq("user_id", session.id)
    .select(INQUIRY_SELECT_FIELDS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ inquiry: formatInquiry(data) })
}
