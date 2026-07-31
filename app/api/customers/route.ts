import { NextResponse, type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

type CustomerInput = {
  customer_name?: string
  phone?: string
  alt_phone?: string | null
  email?: string
  address?: string
  reference_by?: string | null
}

function validateCustomer(input: CustomerInput) {
  const customer_name = input.customer_name?.trim()
  const phone = input.phone?.trim()
  const email = input.email?.trim()
  const address = input.address?.trim()

  if (!customer_name) return { error: "Customer name is required." }
  if (!phone) return { error: "Phone number is required." }
  if (!email) return { error: "Email is required." }
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

const SELECT_FIELDS =
  "id, customer_name, phone, alt_phone, email, address, reference_by, created_at"

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim() || ""
  const sort = searchParams.get("sort")?.trim() || "recent"
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const limit = 20
  const from = (page - 1) * limit
  const to = from + limit - 1

  const supabase = await createClient()
  let query = supabase
    .from("customers")
    .select(SELECT_FIELDS, { count: "exact" })
    .eq("user_id", session.id)

  if (search) {
    query = query.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
  }

  if (sort === "name") {
    query = query.order("customer_name", { ascending: true })
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

  const body = (await request.json()) as CustomerInput
  const result = validateCustomer(body)
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 })

  const supabase = await createClient()

  // Pre-check for duplicate phone number for the same artist
  const { data: existingCustomer, error: checkError } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", session.id)
    .eq("phone", result.data.phone)
    .maybeSingle()

  if (checkError) return NextResponse.json({ error: checkError.message }, { status: 400 })
  if (existingCustomer) {
    return NextResponse.json(
      { error: "phone_exists" },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({ ...result.data, user_id: session.id })
    .select(SELECT_FIELDS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ customer: data })
}
