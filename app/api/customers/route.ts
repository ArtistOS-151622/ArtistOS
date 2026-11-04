import { NextResponse, type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"

import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

type CustomerInput = {
  customer_name?: string
  phone?: string
  alt_phone?: string | null
  email?: string | null
  address?: string
  reference_by?: string | null
}

function validateCustomer(input: CustomerInput) {
  const customer_name = input.customer_name?.trim()
  const phone = input.phone?.trim()
  const email = input.email?.trim() || null
  const address = input.address?.trim()

  if (!customer_name) return { error: "Customer name is required." }
  if (!phone) return { error: "Phone number is required." }
  if (!address) return { error: "Customer address is required." }

  return {
    data: {
      customer_name,
      phone,
      email,
      address,
      alt_phone: input.alt_phone?.trim() || null,
      reference_by: input.reference_by?.trim() || null,
    },
  }
}

// Fields to SELECT from the customer_stats view (includes computed booking_count)
const READ_FIELDS =
  "id, customer_name, phone, alt_phone, email, address, reference_by, created_at, booking_count"
// Fields to SELECT after writing to the base customers table (no booking_count column)
const WRITE_FIELDS =
  "id, customer_name, phone, alt_phone, email, address, reference_by, created_at"

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim() || ""
  const sort = searchParams.get("sort")?.trim() || "recent"
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const limit = Math.min(1000, Number(searchParams.get("limit")) || 20)
  const from = (page - 1) * limit
  const to = from + limit - 1

  const supabase = await createClient()
  let query = supabase
    .from("customer_stats")
    .select(READ_FIELDS, { count: "exact" })
    .eq("user_id", session.id)

  if (search) {
    query = query.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
  }

  if (sort === "name") {
    query = query.order("customer_name", { ascending: true })
  } else if (sort === "most_bookings") {
    query = query.order("booking_count", { ascending: false })
  } else {
    query = query.order("id", { ascending: false })
  }

  const { data, count, error } = await query.range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const hasMore = (count ?? 0) > page * limit

  return NextResponse.json({
    customers: data ?? [],
    hasMore,
  })
}

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Validate before touching the database
  const body = (await request.json()) as CustomerInput
  const result = validateCustomer(body)
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 })

  const supabase = await createClient()

  // Subscription check and duplicate-phone check are independent: run them together
  const [isReadOnly, duplicateRes] = await Promise.all([
    checkIsReadOnly(supabase, session.id),
    supabase
      .from("customers")
      .select("id")
      .eq("user_id", session.id)
      .eq("phone", result.data.phone)
      .limit(1),
  ])

  if (isReadOnly) {
    return NextResponse.json({ error: "Your subscription has expired. Please upgrade to create customers." }, { status: 403 })
  }
  if (duplicateRes.error) return NextResponse.json({ error: duplicateRes.error.message }, { status: 400 })
  if ((duplicateRes.data ?? []).length > 0) {
    return NextResponse.json({ error: "phone_exists" }, { status: 400 })
  }

  const { data: inserted, error } = await supabase
    .from("customers")
    .insert({ ...result.data, user_id: session.id })
    .select(WRITE_FIELDS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // A brand-new customer has no bookings, so no need to re-fetch from the customer_stats view
  return NextResponse.json({ customer: { ...inserted, booking_count: 0 } })
}
