import { NextResponse, type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { INQUIRY_SELECT_FIELDS, formatInquiry } from "@/lib/inquiries/queries"

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim() || ""
  const status = searchParams.get("status")?.trim() || "all"
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const limit = 20
  const from = (page - 1) * limit
  const to = from + limit - 1

  const supabase = await createClient()

  let customerIds: number[] = []
  if (search) {
    const { data: matchedCustomers, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", session.id)
      .or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)

    if (customerError) return NextResponse.json({ error: customerError.message }, { status: 400 })

    customerIds = matchedCustomers?.map((customer) => customer.id) ?? []
    if (customerIds.length === 0) {
      return NextResponse.json({ inquiries: [], hasMore: false })
    }
  }

  let query = supabase
    .from("inquiries")
    .select(INQUIRY_SELECT_FIELDS, { count: "exact" })
    .eq("user_id", session.id)
    .order("created_at", { ascending: false })

  if (status !== "all") {
    query = query.eq("status", status)
  }

  if (search) {
    query = query.in("customer_id", customerIds)
  }

  const { data, count, error } = await query.range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({
    inquiries: (data ?? []).map(formatInquiry),
    hasMore: (count ?? 0) > page * limit,
  })
}
