import { NextResponse, type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"

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

function validateId(value: string) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = validateId((await params).id)
  if (!id) return NextResponse.json({ error: "Invalid customer id." }, { status: 400 })

  const body = (await request.json()) as CustomerInput
  const result = validateCustomer(body)
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 })

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json({ error: "Your subscription has expired. Please upgrade to edit customers." }, { status: 403 })
  }

  // Pre-check for duplicate phone number for another customer of the same artist
  const { data: existingCustomer, error: checkError } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", session.id)
    .eq("phone", result.data.phone)
    .neq("id", id)
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
    .update(result.data)
    .eq("id", id)
    .eq("user_id", session.id)
    .select(SELECT_FIELDS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ customer: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = validateId((await params).id)
  if (!id) return NextResponse.json({ error: "Invalid customer id." }, { status: 400 })

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json({ error: "Your subscription has expired. Please upgrade to delete customers." }, { status: 403 })
  }

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("user_id", session.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
