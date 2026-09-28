import { NextResponse, type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import { activateInquiryFormLink, ensureInquiryFormLink } from "@/lib/inquiries/form-link"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = await createClient()
  const result = await ensureInquiryFormLink(supabase, session.id)

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({
    code: result.code,
    is_active: true,
  })
}

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json({ error: "Your subscription has expired. Please upgrade to access inquiry links." }, { status: 403 })
  }

  const result = await activateInquiryFormLink(supabase, session.id)

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({
    code: result.code,
    is_active: true,
  })
}
